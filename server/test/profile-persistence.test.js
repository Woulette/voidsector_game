import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, open, readFile, readdir, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createProfileManager } from "../src/players/profiles.js";
import { createProfilePersistence } from "../src/storage/profileStore.js";

function delay(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

function cleanName(value){
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24) || "NOVA-37";
}

test("JSON profile writes are serialized and atomically replace the final file", async t=>{
  const directory = await mkdtemp(path.join(os.tmpdir(), "voidsector-profiles-"));
  t.after(()=>rm(directory, {recursive:true, force:true}));
  const dataDirUrl = pathToFileURL(`${directory}${path.sep}`);
  const profileStoreUrl = pathToFileURL(path.join(directory, "profiles.json"));
  let activeRenames = 0;
  let maxActiveRenames = 0;
  const persistence = createProfilePersistence({
    database:null,
    dataDirUrl,
    profileStoreUrl,
    fileSystem:fs,
    fileSystemPromises:{
      mkdir,
      open,
      rm,
      async rename(from, to){
        activeRenames += 1;
        maxActiveRenames = Math.max(maxActiveRenames, activeRenames);
        await delay(15);
        await rename(from, to);
        activeRenames -= 1;
      }
    }
  });

  const first = persistence.persistProfileEntries([
    ["account:1", {updatedAt:100, player:{credits:10}}],
    ["account:2", {updatedAt:50, player:{credits:5}}]
  ]);
  const second = persistence.persistProfileEntries([
    ["account:1", {updatedAt:101, player:{credits:20}}]
  ]);
  const stale = persistence.persistProfileEntries([
    ["account:1", {updatedAt:99, player:{credits:999}}]
  ]);
  await Promise.all([first, second, stale]);
  await persistence.flushProfilePersistence();

  const stored = JSON.parse(await readFile(profileStoreUrl, "utf8"));
  const files = await readdir(directory);
  assert.equal(maxActiveRenames, 1);
  assert.equal(stored["account:1"].updatedAt, 101);
  assert.equal(stored["account:1"].player.credits, 20);
  assert.equal(stored["account:2"].updatedAt, 50);
  assert.equal(stored["account:2"].player.credits, 5);
  assert.deepEqual(files, ["profiles.json"]);
});

test("PostgreSQL profile batches use a transaction and reject stale updates", async ()=>{
  const queries = [];
  let released = false;
  const client = {
    async query(text, params){
      queries.push({text:String(text), params});
      return {rows:[]};
    },
    release(){
      released = true;
    }
  };
  const persistence = createProfilePersistence({
    database:{
      async query(){ return {rows:[]}; },
      async connect(){ return client; }
    }
  });

  await persistence.persistProfileEntries([
    ["account:7", {updatedAt:700, player:{credits:70}}],
    ["legacy", {updatedAt:701, player:{credits:71}}]
  ]);

  assert.equal(queries[0].text, "BEGIN");
  assert.equal(queries.at(-1).text, "COMMIT");
  assert.equal(queries.filter(entry=>entry.text.includes("INSERT INTO player_profiles")).length, 2);
  assert.equal(queries.some(entry=>entry.text.includes("player_profiles.updated_at <= EXCLUDED.updated_at")), true);
  assert.equal(queries[1].params[1], "7");
  assert.equal(queries[2].params[1], null);
  assert.equal(released, true);
});

test("profile manager persists one account at a time with monotonic versions", async ()=>{
  const writes = [];
  let activeWrites = 0;
  let maxActiveWrites = 0;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    async persistProfileEntries(entries){
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      await delay(10);
      writes.push(structuredClone(entries));
      activeWrites -= 1;
    }
  });
  const player = {
    id:"socket-9",
    accountId:"9",
    name:"Nova",
    account:{username:"Nova", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  writes.length = 0;

  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits = 10;
      return {ok:true};
    }
  });
  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits = 20;
      return {ok:true};
    }
  });
  await manager.flushPersistence();

  assert.equal(maxActiveWrites, 1);
  assert.equal(writes.length, 2);
  assert.equal(writes.every(entries=>entries.length === 1 && entries[0][0] === "account:9"), true);
  assert.equal(writes[1][0][1].updatedAt > writes[0][0][1].updatedAt, true);
  assert.equal(writes[1][0][1].player.credits, 20);
});

test("prepared portals round-trip through the real profile manager and JSON persistence", async t=>{
  const directory = await mkdtemp(path.join(os.tmpdir(), "voidsector-prepared-portal-"));
  t.after(()=>rm(directory, {recursive:true, force:true}));
  const dataDirUrl = pathToFileURL(`${directory}${path.sep}`);
  const profileStoreUrl = pathToFileURL(path.join(directory, "profiles.json"));
  const persistence = createProfilePersistence({
    database:null,
    dataDirUrl,
    profileStoreUrl,
    fileSystem:fs,
    fileSystemPromises:{mkdir, open, rename, rm}
  });
  const createManager = ()=>createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:sanitize=>persistence.loadProfileEntries(sanitize),
    persistProfileEntries:entries=>persistence.persistProfileEntries(entries)
  });
  const player = {
    id:"prepared-portal-socket",
    accountId:"prepared-portal-account",
    name:"Avosoma",
    account:{username:"Avosoma", firmId:"astra"}
  };
  const firstManager = createManager();

  await firstManager.load();
  firstManager.syncForSocket({emit(){}}, player);
  await firstManager.flushPersistence();
  const mutation = firstManager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.preparedPortal = {
        id:"prepared-blue-round-trip",
        portalId:"blue",
        portal:{id:"blue", name:"Le Seuil d'Azuron", totalWaves:20},
        mapId:"0",
        mapName:"Helion-01",
        x:-3780,
        y:2780,
        r:115,
        safeRadius:280,
        activationRadius:430,
        preparedAt:800
      };
      return {ok:true};
    }
  });
  await mutation.save;

  const secondManager = createManager();
  await secondManager.load();
  const restored = secondManager.getProfileForPlayer(player).preparedPortal;

  assert.equal(restored?.id, "prepared-blue-round-trip");
  assert.equal(restored?.portalId, "blue");
  assert.equal(restored?.mapId, "0");
  assert.equal(restored?.mapName, "Helion-01");
  assert.equal(restored?.x, -3780);
  assert.equal(restored?.y, 2780);
  assert.equal(restored?.preparedAt, 800);
  const stored = JSON.parse(await readFile(profileStoreUrl, "utf8"));
  assert.equal(stored["account:prepared-portal-account"]?.preparedPortal?.portalId, "blue");
});

test("prepared portal mutation rolls back when real profile-manager persistence fails", async ()=>{
  let rejectNextWrite = false;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{
      if(rejectNextWrite){
        rejectNextWrite = false;
        throw new Error("prepared portal store offline");
      }
    }
  });
  const player = {
    id:"prepared-portal-rollback-socket",
    accountId:"prepared-portal-rollback",
    name:"Avosoma",
    account:{username:"Avosoma", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  rejectNextWrite = true;
  const mutation = manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.preparedPortal = {
        id:"prepared-blue-rollback",
        portalId:"blue",
        portal:{id:"blue", name:"Le Seuil d'Azuron", totalWaves:20},
        mapId:"0",
        mapName:"Helion-01",
        x:-3780,
        y:2780,
        preparedAt:800
      };
      return {ok:true};
    }
  });

  assert.equal(mutation.profile.preparedPortal?.portalId, "blue");
  await assert.rejects(mutation.save, /prepared portal store offline/);
  assert.equal(manager.getProfileForPlayer(player).preparedPortal, null);
});

test("unauthenticated players cannot create or persist profile rows", async ()=>{
  const writes = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async entries=>writes.push(structuredClone(entries))
  });
  const guest = {
    id:"guest-socket",
    accountId:null,
    name:"Avosoma"
  };

  assert.equal(manager.applyReward({player:guest, reward:{credits:100}}), null);
  assert.equal(manager.applyCombatReward({player:guest, reward:{xp:10}}), null);
  assert.deepEqual(
    manager.spendForPlayer({player:guest, priceType:"credits", amount:1}),
    {ok:false, reason:"Authentification requise."}
  );
  assert.deepEqual(
    manager.updateProfileForPlayer({player:guest, update:()=>({ok:true})}),
    {ok:false, reason:"Authentification requise."}
  );
  assert.deepEqual(
    manager.updateCombatProfileForPlayer({player:guest, update:()=>({ok:true})}),
    {ok:false, reason:"Authentification requise."}
  );
  await manager.flushPersistence();

  assert.equal(manager.listProfileEntries().length, 0);
  assert.equal(writes.length, 0);
});

test("profile manager records profile load failures in the server error log", async ()=>{
  const warnings = [];
  const recorded = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn:(message, meta)=>warnings.push({message, meta})},
    loadProfileEntries:async()=>{
      throw new Error("profile store offline");
    },
    persistProfileEntries:async()=>{},
    onError:error=>recorded.push(error)
  });

  await manager.load();

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].message, "Unable to load profiles");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].source, "profile");
  assert.equal(recorded[0].eventName, "profiles:load");
  assert.equal(recorded[0].error.includes("profile store offline"), true);
});

test("profile manager records profile persistence failures with the account id", async ()=>{
  const warnings = [];
  const recorded = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn:(message, meta)=>warnings.push({message, meta})},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{
      throw new Error("profile write failed");
    },
    onError:error=>recorded.push(error)
  });
  const player = {
    id:"socket-save-failure",
    accountId:"save-failure",
    name:"Save Failure",
    account:{username:"Save Failure", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await assert.rejects(manager.flushPersistence(), /profile write failed/);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].message, "Unable to save profiles");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].source, "profile");
  assert.equal(recorded[0].eventName, "profiles:persist");
  assert.equal(recorded[0].accountId, "save-failure");
  assert.equal(recorded[0].error.includes("profile write failed"), true);
});

test("critical profile mutations expose a save promise and roll back after persistence failure", async ()=>{
  let rejectWrites = false;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{
      if(rejectWrites) throw new Error("profile store offline");
    }
  });
  const player = {
    id:"socket-critical-save",
    accountId:"critical-save",
    name:"Critical Save",
    account:{username:"Critical Save", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  const before = manager.getProfileForPlayer(player);
  const creditsBefore = before.player.credits;
  rejectWrites = true;

  const result = manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits = creditsBefore + 12345;
      return {ok:true};
    }
  });

  assert.equal(result.ok, true);
  assert.equal(Object.keys(result).includes("save"), false);
  assert.equal(result.profile.player.credits, creditsBefore + 12345);
  await assert.rejects(result.save, /profile store offline/);
  assert.equal(manager.getProfileForPlayer(player).player.credits, creditsBefore);
});

test("an older failed save cannot roll back a newer profile mutation", async ()=>{
  let rejectFirstMutation = null;
  let blockNextMutation = false;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{
      if(blockNextMutation){
        blockNextMutation = false;
        await new Promise((resolve, reject)=>{
          rejectFirstMutation = reject;
        });
      }
    }
  });
  const player = {
    id:"socket-overlap-save",
    accountId:"overlap-save",
    name:"Overlap Save",
    account:{username:"Overlap Save", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  const ammoBefore = manager.getProfileForPlayer(player).ammoInventory.ammo_x1;
  blockNextMutation = true;
  const first = manager.addAmmoPurchase({
    player,
    purchase:{
      id:"ammo_x1",
      priceType:"credits",
      totalPrice:0,
      totalAmount:1
    }
  });
  const second = manager.addAmmoPurchase({
    player,
    purchase:{
      id:"ammo_x1",
      priceType:"credits",
      totalPrice:0,
      totalAmount:1
    }
  });

  for(let attempt = 0; attempt < 10 && !rejectFirstMutation; attempt += 1) await Promise.resolve();
  assert.equal(typeof rejectFirstMutation, "function");
  rejectFirstMutation(new Error("first profile write failed"));
  await assert.rejects(first.save, /first profile write failed/);
  await second.save;

  assert.equal(manager.getProfileForPlayer(player).ammoInventory.ammo_x1, ammoBefore + 2);
});

test("failed client preference persistence rolls back only its own in-memory save", async ()=>{
  let rejectWrites = false;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{
      if(rejectWrites) throw new Error("preference store offline");
    }
  });
  const player = {
    id:"socket-preference-save",
    accountId:"preference-save",
    name:"Preference Save",
    account:{username:"Preference Save", firmId:"astra"}
  };
  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  const before = manager.getProfileForPlayer(player);
  const previousSlots = structuredClone(before.actionSlots);
  const nextPreferenceVersion = Math.max(
    Date.now(),
    Number(before.actionSlotsUpdatedAt || 0) + 1
  );
  rejectWrites = true;

  const result = manager.saveFromPayload({
    player,
    payload:{profile:{
      updatedAt:Date.now(),
      actionSlotsUpdatedAt:nextPreferenceVersion,
      actionSlots:["ammo_x3", null, null, null, null, null, null, null, "extra_repair_starter"],
      actionSlotsByShip:{orion:["ammo_x3", null, null, null, null, null, null, null, "extra_repair_starter"]},
      lastLaserAmmoId:"ammo_x3"
    }}
  });

  assert.equal(result.status, "saved");
  await assert.rejects(result.persistence, /preference store offline/);
  assert.deepEqual(manager.getProfileForPlayer(player).actionSlots, previousSlots);
});

test("trusted hot-path profile snapshots are reused until the stored profile changes", ()=>{
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async()=>{}
  });
  const player = {
    id:"socket-profile-snapshot",
    accountId:"profile-snapshot",
    name:"Snapshot",
    account:{username:"Snapshot", firmId:"astra"}
  };
  manager.syncForSocket({emit(){}}, player);

  const first = manager.getProfileSnapshotForPlayer(player);
  const second = manager.getProfileSnapshotForPlayer(player);
  assert.equal(first, second);

  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits += 10;
      return {ok:true};
    }
  });
  const third = manager.getProfileSnapshotForPlayer(player);
  assert.notEqual(third, first);
  assert.equal(third.player.credits, first.player.credits + 10);
});

test("no-op coordinate quest progress neither mutates nor persists the profile", async ()=>{
  const persisted = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async entries=>persisted.push(structuredClone(entries))
  });
  const player = {
    id:"socket-coordinate-noop",
    accountId:"coordinate-noop",
    name:"Coordinate Noop",
    account:{username:"Coordinate Noop", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  persisted.length = 0;
  const before = structuredClone(manager.getProfileForPlayer(player));

  const result = manager.applyQuestAction({
    player,
    action:{
      kind:"progress",
      type:"visit_coordinates",
      zoneName:"Helion-01",
      x:0,
      y:0,
      amount:1
    }
  });
  await manager.flushPersistence();

  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(Object.hasOwn(result, "save"), false);
  assert.deepEqual(manager.getProfileForPlayer(player), before);
  assert.equal(persisted.length, 0);
});

test("combat profile mutations coalesce persistence until the next flush", async ()=>{
  const writes = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async entries=>writes.push(structuredClone(entries))
  });
  const player = {
    id:"socket-combat",
    accountId:"combat",
    name:"Combat",
    account:{username:"Combat", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  writes.length = 0;

  manager.updateCombatProfileForPlayer({
    player,
    update:profile=>{
      profile.player.laserShotsFired = 1;
      return {ok:true};
    }
  });
  manager.updateCombatProfileForPlayer({
    player,
    update:profile=>{
      profile.player.laserShotsFired = 2;
      return {ok:true};
    }
  });

  assert.equal(writes.length, 0);
  await manager.flushPersistence();
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0][1].player.laserShotsFired, 2);
});

test("combat rewards update progression and defer persistence", async ()=>{
  const writes = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async entries=>writes.push(structuredClone(entries))
  });
  const player = {
    id:"socket-combat-reward",
    accountId:"combat-reward",
    name:"Combat Reward",
    account:{username:"Combat Reward", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  writes.length = 0;
  const before = manager.getProfileForPlayer(player);
  const creditsBefore = before.player.credits;
  const premiumBefore = before.player.premium;
  const killsBefore = before.player.totalKills;
  const profile = manager.applyCombatReward({
    player,
    reward:{credits:30000, xp:8000, premium:24, enemyKind:"deadly_eclaireur", enemyLevel:20}
  });

  assert.equal(profile.player.credits, creditsBefore + 30000);
  assert.equal(profile.player.premium, premiumBefore + 24);
  assert.equal(profile.player.totalKills, killsBefore + 1);
  assert.equal(writes.length, 0);
  await manager.flushPersistence();
  assert.equal(writes.length, 1);
});

test("failed firm setup keeps the runtime identity and safe-zone cache inputs unchanged", async ()=>{
  let rejectWrites = false;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    reservePilotIdentity:async()=>({ok:true}),
    persistProfileEntries:async()=>{
      if(rejectWrites) throw new Error("profile store offline");
    }
  });
  const player = {
    id:"socket-firm-rollback",
    accountId:"firm-rollback",
    name:"Pilote Astra",
    firmId:"astra",
    mapId:"0",
    account:{username:"Pilote Astra", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  const profileBefore = structuredClone(manager.getProfileForPlayer(player));
  rejectWrites = true;

  await assert.rejects(manager.setupProfileForPlayer({
    player,
    name:"Pilote Cyan",
    firmId:"cyan"
  }), /profile store offline/);

  assert.equal(player.name, "Pilote Astra");
  assert.equal(player.firmId, "astra");
  assert.equal(player.account.firmId, "astra");
  assert.equal(player.mapId, "0");
  assert.deepEqual(manager.getProfileForPlayer(player), profileBefore);
});
