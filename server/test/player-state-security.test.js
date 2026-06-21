import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { canSharePlayerState, getPlayerMapRoom } from "../src/players/visibility.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { isPointInFriendlyWorldSafeArea } from "../src/world/spawn.js";

function makePlayer(state = null){
  return {
    id:"player-state-security",
    mapId:String(state?.mapId ?? "0"),
    groupId:null,
    state
  };
}

function baseState(overrides = {}){
  return {
    x:0,
    y:0,
    angle:0,
    hp:1000,
    maxHp:5000,
    shield:0,
    maxShield:0,
    vx:0,
    vy:0,
    enginePower:0,
    engineAngle:0,
    mapId:"0",
    shipId:"orion",
    updatedAt:1000,
    ...overrides
  };
}

test("rejects an impossible same-map teleport", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{...previous, x:4000, updatedAt:1050}
  });

  assert.equal(result.corrected, true);
  assert.match(result.reason, /vitesse/i);
  assert.ok(result.state.x < 500);
});

test("rejects an arbitrary map change away from a portal", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{...previous, mapId:"1", x:0, y:0}
  });

  assert.equal(result.state.mapId, "0");
  assert.match(result.reason, /transition/i);
});

test("rejects spawning directly on an advanced map", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({mapId:"4", x:1000, y:1000})
  });

  assert.equal(result.state.mapId, "0");
  assert.match(result.reason, /map interdite/i);
});

test("rejects spawning at an arbitrary position on the initial map", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({x:1000, y:1000})
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.x, -4300);
  assert.equal(result.state.y, 3300);
});

test("initial combat vitals come from the server profile, not the client", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({hp:999999, maxHp:999999, shield:999999, maxShield:999999})
  });

  assert.equal(result.state.hp, 5000);
  assert.equal(result.state.maxHp, 5000);
  assert.equal(result.state.shield, 0);
  assert.equal(result.state.maxShield, 0);
});

test("accepts a world map transition between portal zones", ()=>{
  const previous = baseState({x:4300, y:-3300});
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:5000,
    payload:{...previous, mapId:"1", x:-4300, y:3300}
  });

  assert.equal(result.state.mapId, "1");
});

test("locks Ricky's direct zone four portal because it is a dungeon portal", ()=>{
  const previous = baseState({mapId:"1", x:4300, y:-3300});
  const profile = createDefaultProfile();
  const locked = validatePlayerState({
    player:makePlayer(previous),
    profile,
    groups:new Map(),
    now:5000,
    payload:{...previous, mapId:"3", x:-4300, y:3300}
  });

  assert.equal(locked.state.mapId, "1");
  assert.match(locked.reason, /transition/i);

  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  profile.questProgress.quest_lv10_maintenance_impossible = {talk_start:1, stabilisateurs:5, talk_return:1, mission_control:1};
  const stillLocked = validatePlayerState({
    player:makePlayer(previous),
    profile,
    groups:new Map(),
    now:5000,
    payload:{...previous, mapId:"3", x:-4300, y:3300}
  });

  assert.equal(stillLocked.state.mapId, "1");
});

test("allows the standard zone two to zone four portal away from Ricky", ()=>{
  const cases = [
    {map2:"1", from:{x:4300, y:3300}, map4:"3", to:{x:-4300, y:3300}},
    {map2:"21", from:{x:4300, y:-3300}, map4:"23", to:{x:-4300, y:-3300}},
    {map2:"31", from:{x:-4300, y:-3300}, map4:"33", to:{x:4300, y:-3300}},
    {map2:"41", from:{x:-4300, y:3300}, map4:"43", to:{x:4300, y:3300}}
  ];
  for(const entry of cases){
    const previous = baseState({mapId:entry.map2, ...entry.from});
    const profile = createDefaultProfile();
    profile.player.firmId = WORLD_MAPS[entry.map2].firmId || "astra";
    const result = validatePlayerState({
      player:makePlayer(previous),
      profile,
      groups:new Map(),
      now:5000,
      payload:{...previous, mapId:entry.map4, ...entry.to}
    });

    assert.equal(result.state.mapId, entry.map4);
  }
});

test("limits forged healing, shield and ship identity", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{
      ...previous,
      hp:999999,
      maxHp:999999,
      shield:999999,
      maxShield:999999,
      shipId:"helion_titan"
    }
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.shipId, "orion");
  assert.ok(result.state.hp < 1100);
  assert.ok(result.state.maxHp < 999999);
  assert.equal(result.state.maxShield, 0);
  assert.equal(result.state.shield, 0);
});

test("accepts one equipped repair bot heal tick per second", ()=>{
  const profile = createDefaultProfile();
  const previous = baseState({hp:10000, maxHp:15000});
  const player = makePlayer(previous);
  const first = validatePlayerState({
    player,
    profile,
    groups:new Map(),
    now:2000,
    payload:{...previous, hp:10150, updatedAt:2000}
  });

  assert.equal(first.state.hp, 10150);

  player.state = first.state;
  const repeated = validatePlayerState({
    player,
    profile,
    groups:new Map(),
    now:2050,
    payload:{...first.state, hp:10300, updatedAt:2050}
  });

  assert.ok(repeated.state.hp < 10300);
  assert.equal(repeated.corrected, true);
});

test("initial combat vitals prefer the saved session for the active ship", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "velox";
  profile.ownedShips = ["orion", "velox", "test_runner"];
  profile.worldSession = {mapId:"0", x:0, y:0, hp:900, maxHp:20000, shield:0, maxShield:0, shipId:"test_runner", updatedAt:1000};
  profile.shipWorldSessions = {
    velox:{mapId:"0", x:0, y:0, hp:3000, maxHp:15000, shield:0, maxShield:0, shipId:"velox", updatedAt:1100},
    test_runner:{mapId:"0", x:0, y:0, hp:900, maxHp:20000, shield:0, maxShield:0, shipId:"test_runner", updatedAt:1000}
  };

  const result = validatePlayerState({
    player:{id:"p1", mapId:"0", state:null},
    profile,
    groups:new Map(),
    now:1200,
    payload:baseState({hp:900, maxHp:20000, shipId:"velox", x:0, y:0})
  });

  assert.equal(result.state.shipId, "velox");
  assert.equal(result.state.hp, 3000);
  assert.equal(result.state.maxHp, 15000);
});

test("a cyan profile starts on Nereid-01 even when the socket still points to Helion-01", ()=>{
  const profile = createDefaultProfile();
  profile.player.firmId = "cyan";
  profile.player.firmSelected = true;
  profile.worldSession = null;
  profile.shipWorldSessions = {};

  const result = validatePlayerState({
    player:{id:"cyan-player", mapId:"0", state:null},
    profile,
    groups:new Map(),
    now:1200,
    payload:baseState({mapId:"20", x:-4300, y:-3300})
  });

  assert.equal(result.state.mapId, "20");
  assert.equal(result.state.x, -4300);
  assert.equal(result.state.y, -3300);
});

test("safe zones only protect players inside their own firm territory", ()=>{
  const cyanSpawn = WORLD_MAPS["20"].spawn;
  assert.equal(isPointInFriendlyWorldSafeArea(cyanSpawn, WORLD_MAPS["20"], "cyan"), true);
  assert.equal(isPointInFriendlyWorldSafeArea(cyanSpawn, WORLD_MAPS["20"], "astra"), false);
  assert.equal(isPointInFriendlyWorldSafeArea(WORLD_MAPS["21"].portals[0], WORLD_MAPS["21"], "astra"), false);
});

test("a saved ship session may remain outside the map while radiation counts down", ()=>{
  const profile = createDefaultProfile();
  profile.worldSession = {mapId:"0", x:5200, y:0, hp:3000, maxHp:5000, shield:0, maxShield:0, shipId:"orion", updatedAt:1000};
  profile.shipWorldSessions = {
    orion:{...profile.worldSession}
  };

  const result = validatePlayerState({
    player:{id:"outside-player", mapId:"0", state:null},
    profile,
    groups:new Map(),
    now:1200,
    payload:baseState({x:5200, y:0})
  });

  assert.equal(result.state.x, 5200);
  assert.equal(result.state.y, 0);
});

test("a dead player cannot heal or move through client snapshots", ()=>{
  const previous = baseState({hp:0, x:200, y:300});
  const player = makePlayer(previous);
  player.deathState = {serverAuthoritative:true, choices:["spawn"]};
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1500,
    payload:{...previous, hp:5000, x:4000, y:3000}
  });

  assert.equal(result.corrected, true);
  assert.equal(result.reason, "vaisseau detruit");
  assert.equal(result.state.hp, 0);
  assert.equal(result.state.x, 200);
  assert.equal(result.state.y, 300);
});

test("a zero-hp player cannot self-heal before the server death state is emitted", ()=>{
  const previous = baseState({hp:0, shield:120, maxShield:500});
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1500,
    payload:{...previous, hp:5000, shield:500}
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.hp, 0);
  assert.equal(result.state.shield, 0);
});

test("an abandoned portal member cannot re-enter the instance through a snapshot", ()=>{
  const previous = baseState({mapId:"0", x:4300, y:-3300});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const groups = new Map([["group-1", {
    instance:{
      type:"portal",
      portal:{id:"blue"},
      abandonedMemberIds:[player.id]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:5000,
    payload:{...previous, mapId:"portal-blue", x:0, y:0}
  });

  assert.equal(result.state.mapId, "0");
  assert.notEqual(result.state.mapId, "portal-blue");
});

test("a Ricky group member cannot enter without joining through the portal", ()=>{
  const previous = baseState({mapId:"0", x:4300, y:-3300});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const groups = new Map([["group-1", {
    instance:{
      type:"portal",
      portal:{id:"ricky"},
      joinedMemberIds:["leader-1"],
      abandonedMemberIds:[]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:5000,
    payload:{...previous, mapId:"portal-ricky", x:0, y:0}
  });

  assert.equal(result.state.mapId, "0");
  assert.notEqual(result.state.mapId, "portal-ricky");
});

test("a Ricky member that joined through the portal may enter the instance", ()=>{
  const previous = baseState({mapId:"0", x:4300, y:-3300});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const groups = new Map([["group-1", {
    instance:{
      type:"portal",
      portal:{id:"ricky"},
      joinedMemberIds:[player.id],
      abandonedMemberIds:[]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:5000,
    payload:{...previous, mapId:"portal-ricky", x:0, y:0}
  });

  assert.equal(result.state.mapId, "portal-ricky");
  assert.equal(result.state.x, 0);
  assert.equal(result.state.y, 3400);
});

test("Ricky central chamber collision stays closed until the four-lever breach opens", ()=>{
  const previous = baseState({mapId:"portal-ricky", x:0, y:1450, updatedAt:1000});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const instance = {
    type:"portal",
    portal:{id:"ricky"},
    joinedMemberIds:[player.id],
    abandonedMemberIds:[],
    objective:{breachOpen:false}
  };
  const groups = new Map([["group-1", {instance}]]);
  const blocked = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:3000,
    payload:{...previous, y:1050, updatedAt:3000}
  });

  assert.equal(blocked.corrected, true);
  assert.ok(blocked.state.y > 1300);

  instance.objective.breachOpen=true;
  const open = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:3000,
    payload:{...previous, y:1050, updatedAt:3000}
  });
  assert.equal(open.state.y, 1050);
});

test("separate Ricky groups use isolated instance rooms and cannot share player state", ()=>{
  const playerA = {id:"player-a", groupId:"group-a"};
  const playerB = {id:"player-b", groupId:"group-b"};
  const groups = new Map([
    ["group-a", {instance:{id:"instance-a", type:"portal", portal:{id:"ricky"}, joinedMemberIds:[playerA.id], abandonedMemberIds:[]}}],
    ["group-b", {instance:{id:"instance-b", type:"portal", portal:{id:"ricky"}, joinedMemberIds:[playerB.id], abandonedMemberIds:[]}}]
  ]);
  playerA.mapRoom = getPlayerMapRoom(playerA, "portal-ricky", groups);
  playerB.mapRoom = getPlayerMapRoom(playerB, "portal-ricky", groups);

  assert.equal(playerA.mapRoom, "instance:instance-a");
  assert.equal(playerB.mapRoom, "instance:instance-b");
  assert.equal(canSharePlayerState(playerA, playerB), false);
});

test("members of the same group can share state across different maps", ()=>{
  const playerA = {id:"player-a", groupId:"group-a", mapRoom:"instance:instance-a"};
  const playerB = {id:"player-b", groupId:"group-a", mapRoom:"map:0"};

  assert.equal(canSharePlayerState(playerA, playerB), true);
});

test("an active portal member cannot leave the instance through a snapshot", ()=>{
  const previous = baseState({mapId:"portal-blue", x:0, y:0});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const groups = new Map([["group-1", {
    instance:{
      type:"portal",
      portal:{id:"blue"},
      completed:false,
      abandonedMemberIds:[]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:5000,
    payload:{...previous, mapId:"0", x:-4300, y:3300}
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.mapId, "portal-blue");
});

test("a completed portal member may return to a world safe zone", ()=>{
  const previous = baseState({mapId:"portal-blue", x:0, y:0});
  const player = makePlayer(previous);
  player.groupId = "group-1";
  const groups = new Map([["group-1", {
    instance:{
      type:"portal",
      portal:{id:"blue"},
      completed:true,
      abandonedMemberIds:[]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile:createDefaultProfile(),
    groups,
    now:5000,
    payload:{...previous, mapId:"0", x:-4300, y:3300}
  });

  assert.equal(result.state.mapId, "0");
  assert.equal(result.state.x, -4300);
  assert.equal(result.state.y, 3300);
});

test("a saved portal session without a live instance starts from the home map", ()=>{
  const profile = createDefaultProfile();
  profile.worldSession = {mapId:"portal-blue", x:0, y:0, hp:3000, maxHp:5000, shield:0, maxShield:0, shipId:"orion", updatedAt:1000};
  profile.shipWorldSessions = {
    orion:{...profile.worldSession}
  };

  const result = validatePlayerState({
    player:makePlayer(null),
    profile,
    groups:new Map(),
    now:1200,
    payload:baseState({mapId:"portal-blue", x:0, y:0})
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.mapId, "0");
  assert.equal(result.state.x, -4300);
  assert.equal(result.state.y, 3300);
});
