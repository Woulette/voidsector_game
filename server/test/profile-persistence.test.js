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
