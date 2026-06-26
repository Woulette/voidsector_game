import assert from "node:assert/strict";
import test from "node:test";
import { createAdminManager } from "../src/admin/adminManager.js";
import { registerAdminHandlers } from "../src/socket/adminHandlers.js";
import { registerChatHandlers } from "../src/socket/chatHandlers.js";

function createFixture({auditRecord} = {}){
  const events = [];
  const audit = [];
  const revokedSessions = [];
  const fixtureNow = Date.now();
  const serverErrors = [{
    id:"err-1",
    source:"socket",
    eventName:"combat:fire",
    socketId:"socket-player",
    accountId:"player",
    playerId:"socket-player",
    mapId:"0",
    error:"Error: hidden stack",
    at:fixtureNow
  }];
  const disconnected = [];
  const accounts = new Map([
    ["admin", {id:"admin", username:"Admin", role:"admin", bannedUntil:0, banReason:"", mutedUntil:0, muteReason:""}],
    ["mod", {id:"mod", username:"Modo", role:"moderator", bannedUntil:0, banReason:"", mutedUntil:0, muteReason:""}],
    ["player", {id:"player", username:"Pilot", role:"player", bannedUntil:0, banReason:"", mutedUntil:0, muteReason:""}]
  ]);
  const profiles = new Map([
    ["account:admin", {
      updatedAt:1000,
      player:{name:"Admin", level:12, credits:1000, premium:50, xp:0, xpNext:1432000, totalXp:10000, reputation:500, firmId:"astra"}
    }],
    ["account:mod", {
      updatedAt:1000,
      player:{name:"Modo", level:10, credits:500, premium:20, xp:0, xpNext:580000, totalXp:5000, reputation:300, firmId:"astra"}
    }],
    ["account:player", {
      updatedAt:1000,
      player:{name:"Pilot", level:5, credits:200, premium:7, xp:0, xpNext:80000, totalXp:900, reputation:40, firmId:"astra"},
      activeShip:"orion",
      ownedShips:["orion"],
      inventoryItems:[
        {uid:"inv_laser_mk1_1", itemId:"laser_mk1"},
        {uid:"inv_repair_starter_2", itemId:"extra_repair_starter"}
      ],
      shipLoadouts:{orion:{lasers:["inv_laser_mk1_1"], generators:[], extras:["inv_repair_starter_2"]}},
      cargoHold:{cuivre_orbital:25}
    }],
    ["pilot", {
      updatedAt:500,
      player:{name:"Pilot", level:1, credits:0, premium:0, totalXp:0, firmId:"astra"}
    }]
  ]);
  const players = new Map([
    ["socket-admin", {id:"socket-admin", accountId:"admin", account:accounts.get("admin"), name:"Admin", clientMode:"launcher", connected:true}],
    ["socket-mod", {id:"socket-mod", accountId:"mod", account:accounts.get("mod"), name:"Modo", clientMode:"launcher", connected:true}],
    ["socket-player", {id:"socket-player", accountId:"player", account:accounts.get("player"), name:"Pilot", clientMode:"game", connected:true, mapId:"0", state:{hp:1000, maxHp:5000, mapId:"0"}}]
  ]);
  const socketObjects = new Map([...players.keys()].map(id=>[id, {
    id,
    emitted:[],
    emit(event, payload){ this.emitted.push({event, payload}); events.push({id, event, payload}); },
    disconnect(force){ disconnected.push({id, force}); }
  }]));
  const io = {
    sockets:{sockets:socketObjects},
    emit(event, payload){
      events.push({id:"broadcast", event, payload});
    },
    to(id){
      return {
        emit(event, payload){
          events.push({id, event, payload});
        }
      };
    }
  };
  const groups = new Map([["group-1", {
    id:"group-1",
    leaderId:"socket-player",
    members:["socket-player"],
    instance:{id:"I-0001", wave:3, completed:false, enemies:[{id:"E1", hp:100}]}
  }]]);
  function resetGroupInstance(groupId, reason = ""){
    const group = groups.get(String(groupId || ""));
    if(!group?.instance) return false;
    const previousInstanceId = group.instance.id;
    group.instance = null;
    events.push({id:group.id, event:"coop:enemies", payload:{instanceId:null, previousInstanceId, enemies:[]}});
    events.push({id:group.id, event:"group:instance-reset", payload:{reason}});
    return true;
  }
  const profileManager = {
    getProfileForPlayer(player){
      return profiles.get(`account:${player.accountId}`) || null;
    },
    profileKeyForPlayer(player){
      return player?.accountId ? `account:${player.accountId}` : "";
    },
    listProfileEntries(){
      return [...profiles.entries()].map(([key, profile])=>({key, profile}));
    },
    getProfileEntry(key){
      const profile = profiles.get(String(key || ""));
      return profile ? {key:String(key), profile} : null;
    },
    updateProfileByKey(key, update){
      const profile = structuredClone(profiles.get(String(key || "")));
      if(!profile) return null;
      if(update(profile) === false) return null;
      profile.updatedAt = 2000;
      profiles.set(String(key), profile);
      return profile;
    }
  };
  const adminManager = createAdminManager({
    io,
    players,
    groups,
    profileManager,
    resetGroupInstance,
    async revokeSessionsForAccount(accountId){
      revokedSessions.push(accountId);
    },
    async updateAccountModeration(accountId, patch){
      const account = accounts.get(String(accountId || ""));
      if(!account) return null;
      Object.assign(account, patch);
      return account;
    },
    auditStore:{
      async record(entry){
        if(auditRecord) return auditRecord(entry, audit);
        audit.push(entry);
        return entry;
      },
      async list(){
        return [...audit].reverse();
      }
    },
    serverErrorLog:{
      list:()=>serverErrors,
      record:error=>serverErrors.push(error)
    },
    now:()=>fixtureNow
  });
  return {accounts, adminManager, audit, disconnected, events, groups, now:fixtureNow, players, profiles, revokedSessions, serverErrors, socketObjects};
}

test("admin manager denies normal players and allows moderator snapshots", async ()=>{
  const fixture = createFixture();
  fixture.players.set("socket-player-launcher", {
    id:"socket-player-launcher",
    accountId:"player",
    account:fixture.accounts.get("player"),
    name:"Pilot",
    clientMode:"launcher",
    connected:true
  });
  const denied = await fixture.adminManager.snapshot({id:"socket-player"});
  assert.equal(denied.ok, false);
  assert.match(denied.reason, /droits/i);

  const allowed = await fixture.adminManager.snapshot({id:"socket-mod"});
  assert.equal(allowed.ok, true);
  assert.equal(allowed.snapshot.totals.sockets, 4);
  assert.equal(allowed.snapshot.totals.online, 3);
  assert.equal(allowed.snapshot.totals.game, 1);
  assert.equal(allowed.snapshot.totals.profiles, 3);
  assert.equal(allowed.snapshot.recentProfiles.some(profile=>profile.key === "pilot"), false);
  assert.deepEqual(allowed.snapshot.serverErrors, fixture.serverErrors);
  const pilot = allowed.snapshot.onlinePlayers.find(player=>player.name === "Pilot");
  assert.equal(pilot.sessionCount, 2);
  assert.deepEqual(new Set(pilot.clientModes), new Set(["game", "launcher"]));
});

test("moderator can kick a player and the action is audited", async ()=>{
  const fixture = createFixture();
  fixture.players.set("socket-player-launcher", {
    id:"socket-player-launcher",
    accountId:"player",
    account:fixture.accounts.get("player"),
    name:"Pilot",
    clientMode:"launcher",
    connected:true
  });
  fixture.socketObjects.set("socket-player-launcher", {
    id:"socket-player-launcher",
    emit(event, payload){ fixture.events.push({id:this.id, event, payload}); },
    disconnect(force){ fixture.disconnected.push({id:this.id, force}); }
  });
  const result = await fixture.adminManager.kickPlayer({id:"socket-mod"}, {
    targetId:"socket-player",
    accountId:"player",
    reason:"Test moderation"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(fixture.disconnected, [
    {id:"socket-player", force:true},
    {id:"socket-player-launcher", force:true}
  ]);
  assert.equal(result.disconnected, 2);
  assert.equal(fixture.audit[0].action, "admin:kick");
  assert.equal(fixture.audit[0].target.playerId, "socket-player");
});

test("admin inspect returns public profile details, activity logs and suspicion", async ()=>{
  const fixture = createFixture();
  const profile = fixture.profiles.get("account:player");
  profile.player.totalKills = 5;
  profile.player.credits = 6000000;
  profile.killStats = {raider_astral:18, drone_pirate:4};
  profile.completedQuestClaims = {quest_a:true, quest_b:true};
  profile.activityLog = [{
    id:"activity-test",
    type:"monster_kill",
    label:"Mob tue",
    detail:"Vorak rusher niv. 1 - +500 XP.",
    createdAt:fixture.now
  }];

  const result = await fixture.adminManager.inspectPlayer({id:"socket-mod"}, {
    targetId:"socket-player"
  });

  assert.equal(result.ok, true);
  assert.equal(result.details.name, "Pilot");
  assert.equal(result.details.level, 5);
  assert.equal(result.activity.kills[0].kind, "raider_astral");
  assert.equal(result.activity.kills[0].count, 18);
  assert.equal(result.activity.suspicion.suspicious, true);
  assert.equal(result.activity.logs[0].detail, "Vorak rusher niv. 1 - +500 XP.");
  assert.equal(result.activity.logs.some(entry=>entry.type === "kill"), true);
  assert.equal(result.activity.logs.some(entry=>entry.type === "quest"), true);
  assert.equal(result.inventory.activeShip.id, "orion");
  assert.equal(result.inventory.items.length, 2);
  assert.equal(result.inventory.items.find(item=>item.uid === "inv_laser_mk1_1").equipped.type, "laser");
  assert.equal(result.inventory.resources[0].id, "cuivre_orbital");
});

test("only admins can adjust player progression and emit a profile sync", async ()=>{
  const fixture = createFixture();
  fixture.players.set("socket-player-launcher", {
    id:"socket-player-launcher",
    accountId:"player",
    account:fixture.accounts.get("player"),
    name:"Pilot",
    clientMode:"launcher",
    connected:true
  });
  const refused = await fixture.adminManager.adjustPlayer({id:"socket-mod"}, {
    profileKey:"account:player",
    field:"credits",
    amount:1000,
    reason:"Test denied"
  });
  assert.equal(refused.ok, false);

  const result = await fixture.adminManager.adjustPlayer({id:"socket-admin"}, {
    targetId:"socket-player",
    field:"premium",
    amount:25,
    reason:"Compensation beta"
  });

  assert.equal(result.ok, true);
  assert.equal(fixture.profiles.get("account:player").player.premium, 32);
  assert.equal(fixture.events.some(entry=>entry.id === "socket-player" && entry.event === "profile:sync"), true);
  assert.equal(fixture.events.some(entry=>entry.id === "socket-player-launcher" && entry.event === "profile:sync"), true);
  assert.equal(fixture.audit[0].action, "admin:adjust-player");
  assert.equal(fixture.audit[0].payload.accountId, "player");
  assert.equal(fixture.audit[0].payload.field, "premium");
});

test("admin audit failures are visible in server error logs", async ()=>{
  const fixture = createFixture({
    auditRecord:async ()=>{
      throw new Error("audit storage offline");
    }
  });

  const result = await fixture.adminManager.adjustPlayer({id:"socket-admin"}, {
    targetId:"socket-player",
    field:"credits",
    amount:1000,
    reason:"Compensation beta"
  });

  assert.equal(result.ok, true);
  assert.equal(fixture.profiles.get("account:player").player.credits, 1200);
  const auditError = fixture.serverErrors.find(entry=>entry.source === "admin-audit");
  assert.equal(auditError.eventName, "admin:adjust-player");
  assert.equal(auditError.accountId, "admin");
  assert.equal(auditError.playerId, "socket-admin");
  assert.equal(auditError.error.includes("audit storage offline"), true);
  assert.equal(auditError.at, fixture.now);
});

test("only admins can grant player assets with audit and profile sync", async ()=>{
  const fixture = createFixture();
  const refused = await fixture.adminManager.grantPlayer({id:"socket-mod"}, {
    profileKey:"account:player",
    type:"item",
    id:"laser_mk2",
    amount:1,
    reason:"Compensation test"
  });
  assert.equal(refused.ok, false);

  const itemResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    accountId:"player",
    profileKey:"account:player",
    type:"item",
    id:"laser_mk2",
    amount:2,
    reason:"Compensation beta"
  });

  assert.equal(itemResult.ok, true);
  assert.equal(itemResult.granted.type, "item");
  assert.equal(itemResult.granted.amount, 2);
  assert.equal(fixture.profiles.get("account:player").inventoryItems.filter(item=>item.itemId === "laser_mk2").length, 2);
  assert.equal(fixture.profiles.get("account:player").activityLog.at(-1).type, "admin_grant");
  assert.equal(fixture.audit.at(-1).action, "admin:grant-player");
  assert.equal(fixture.events.some(entry=>entry.id === "socket-player" && entry.event === "profile:sync"), true);

  const resourceResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"resource",
    id:"cuivre_orbital",
    amount:50,
    destination:"cargoHold",
    reason:"Compensation beta"
  });
  assert.equal(resourceResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").cargoHold.cuivre_orbital, 75);

  const ammoResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"ammo",
    id:"ammo_x2",
    amount:500,
    reason:"Compensation beta"
  });
  assert.equal(ammoResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").ammoInventory.ammo_x2, 500);
});

test("admin can grant account unlocks and special currencies", async ()=>{
  const fixture = createFixture();

  const shipResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"ship",
    id:"velox",
    reason:"Deblocage test"
  });
  assert.equal(shipResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").ownedShips.includes("velox"), true);
  assert.equal(Boolean(fixture.profiles.get("account:player").shipLoadouts.velox), true);

  const droneResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"drone",
    id:"combat_drone",
    amount:3,
    reason:"Deblocage test"
  });
  assert.equal(droneResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").ownedDroneCount, 3);
  assert.equal(fixture.profiles.get("account:player").droneLoadout.length, 3);

  const formationResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"formation",
    id:"tir",
    reason:"Deblocage test"
  });
  assert.equal(formationResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").ownedDroneFormations.includes("tir"), true);

  const portalResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"portalPiece",
    id:"blue",
    amount:12,
    reason:"Deblocage test"
  });
  assert.equal(portalResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").portalPieces.blue, 12);

  const boxResult = await fixture.adminManager.grantPlayer({id:"socket-admin"}, {
    profileKey:"account:player",
    type:"firmBox",
    id:"elite",
    amount:2,
    reason:"Deblocage test"
  });
  assert.equal(boxResult.ok, true);
  assert.equal(fixture.profiles.get("account:player").firmBoxes.elite, 2);
});

test("only admins can remove an equipped inventory item with an audited reason", async ()=>{
  const fixture = createFixture();
  const refused = await fixture.adminManager.removeInventoryItem({id:"socket-mod"}, {
    profileKey:"account:player",
    source:"inventory",
    inventoryUid:"inv_laser_mk1_1",
    reason:"Objet duplique"
  });
  assert.equal(refused.ok, false);

  const result = await fixture.adminManager.removeInventoryItem({id:"socket-admin"}, {
    accountId:"player",
    profileKey:"account:player",
    source:"inventory",
    inventoryUid:"inv_laser_mk1_1",
    reason:"Objet duplique"
  });

  assert.equal(result.ok, true);
  assert.equal(result.removed.id, "laser_mk1");
  assert.equal(fixture.profiles.get("account:player").inventoryItems.some(item=>item.uid === "inv_laser_mk1_1"), false);
  assert.equal(fixture.profiles.get("account:player").shipLoadouts.orion.lasers[0], null);
  assert.equal(fixture.profiles.get("account:player").activityLog.at(-1).type, "admin_inventory_remove");
  assert.equal(fixture.audit[0].action, "admin:inventory-remove");
  assert.equal(fixture.events.some(entry=>entry.id === "socket-player" && entry.event === "profile:sync"), true);
});

test("admin can remove a stored resource from the player profile", async ()=>{
  const fixture = createFixture();
  const result = await fixture.adminManager.removeInventoryItem({id:"socket-admin"}, {
    profileKey:"account:player",
    source:"resource",
    resourceId:"cuivre_orbital",
    reason:"Ressource dupliquee"
  });

  assert.equal(result.ok, true);
  assert.equal(result.removed.quantity, 25);
  assert.equal(fixture.profiles.get("account:player").cargoHold.cuivre_orbital, 0);
});

test("admin can ban an account and disconnect all online sockets for it", async ()=>{
  const fixture = createFixture();
  const result = await fixture.adminManager.moderateAccount({id:"socket-admin"}, {
    accountId:"player",
    action:"ban",
    durationMinutes:60,
    reason:"Triche detectee"
  });

  assert.equal(result.ok, true);
  assert.equal(fixture.accounts.get("player").bannedUntil, fixture.now + 3600000);
  assert.deepEqual(fixture.revokedSessions, ["player"]);
  assert.deepEqual(fixture.disconnected, [{id:"socket-player", force:true}]);
  assert.equal(fixture.events.some(entry=>entry.id === "socket-player" && entry.event === "admin:banned"), true);
  assert.equal(fixture.audit[0].action, "admin:ban");
  assert.equal(fixture.audit[0].payload.sessionsRevoked, true);
});

test("moderator can mute an account and chat send is blocked server side", async ()=>{
  const fixture = createFixture();
  const result = await fixture.adminManager.moderateAccount({id:"socket-mod"}, {
    accountId:"player",
    action:"mute",
    durationMinutes:30,
    reason:"Spam global"
  });
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.revokedSessions, []);
  assert.equal(fixture.players.get("socket-player").account.mutedUntil, fixture.now + 1800000);

  const listeners = new Map();
  const socket = {
    id:"socket-player",
    on(event, handler){
      listeners.set(event, handler);
    },
    emit(event, payload){
      fixture.events.push({id:this.id, event, payload});
    }
  };
  registerChatHandlers(socket, {
    guard:()=>true,
    io:{emit(event, payload){ fixture.events.push({id:"chat", event, payload}); }},
    players:fixture.players
  });
  listeners.get("chat:send")({channel:"global", text:"Salut"});

  assert.equal(fixture.events.some(entry=>entry.event === "chat:error"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "chat:message"), false);
});

test("admin can reset a stuck group instance", async ()=>{
  const fixture = createFixture();
  const result = await fixture.adminManager.resetInstance({id:"socket-admin"}, {
    groupId:"group-1",
    reason:"Instance bloquee"
  });

  assert.equal(result.ok, true);
  assert.equal(fixture.groups.get("group-1").instance, null);
  assert.equal(fixture.events.some(entry=>entry.event === "coop:enemies" && entry.payload.instanceId === null), true);
  assert.equal(fixture.audit[0].action, "admin:reset-instance");
});

test("admin socket handlers emit snapshots and errors through the standard channel", async ()=>{
  const fixture = createFixture();
  const listeners = new Map();
  const socket = {
    id:"socket-admin",
    on(event, handler){
      listeners.set(event, handler);
    },
    emit(event, payload){
      fixture.events.push({id:this.id, event, payload});
    }
  };
  registerAdminHandlers(socket, {
    adminManager:fixture.adminManager,
    guard:()=>true
  });

  await listeners.get("admin:sync")({});
  await listeners.get("admin:adjust-player")({profileKey:"account:player", field:"unknown", amount:1, reason:"bad"});
  await listeners.get("admin:grant-player")({profileKey:"account:player", type:"resource", id:"cuivre_orbital", amount:3, reason:"test"});
  await listeners.get("admin:inventory-remove")({profileKey:"account:player", source:"resource", resourceId:"cuivre_orbital", reason:"test"});
  await listeners.get("admin:moderate-account")({accountId:"player", action:"mute", durationMinutes:5, reason:"test"});
  await listeners.get("admin:reset-instance")({groupId:"group-1", reason:"test"});

  assert.equal(fixture.events.some(entry=>entry.event === "admin:snapshot"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "admin:error"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "admin:granted"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "admin:inventory-removed"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "admin:moderated"), true);
  assert.equal(fixture.events.some(entry=>entry.event === "admin:instance-reset"), true);
});
