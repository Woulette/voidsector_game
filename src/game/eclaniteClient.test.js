import assert from "node:assert/strict";
import test from "node:test";
import {
  ECLANITE_PORTAL_MAP,
  getEclaniteObjectiveHud,
  getEclanitePortalWalls,
  normalizeEclaniteObjective,
  resolveEclanitePortalPoint
} from "../data/eclanitePortal.js";
import { getEclaniteObjectiveMarkers } from "./render/eclaniteEncounter.js";
import { createPortalMap } from "./systems/portalState.js";
import { formatPortalTimer, portalUsesWaveHud } from "./ui/combatHudController.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";

test("Eclanite uses the shared 5200x3600 three-compartment arena", ()=>{
  const map = createPortalMap({id:"emerald", name:"La Ruche d'Eclanite"});
  assert.equal(map.id, "portal-emerald");
  assert.equal(map.eclanitePortal, true);
  assert.equal(map.width, 5_200);
  assert.equal(map.height, 3_600);
  assert.deepEqual(
    {x:map.spawn.x, y:map.spawn.y},
    ECLANITE_PORTAL_MAP.spawn
  );
  assert.equal(ECLANITE_PORTAL_MAP.zones[0].x < 0, true);
  assert.equal(ECLANITE_PORTAL_MAP.zones[0].y > 0, true);
  assert.equal(ECLANITE_PORTAL_MAP.zones[1].x > 0, true);
  assert.equal(ECLANITE_PORTAL_MAP.zones[1].y > 0, true);
  assert.equal(ECLANITE_PORTAL_MAP.zones[2].y < 0, true);
  assert.equal(map.enemyAssets.length, 4);
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:map}), false);
});

test("closed Eclanite breaches stop swept movement while open breaches let the ship through", ()=>{
  const lockedOne = resolveEclanitePortalPoint(
    {x:-420, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {x:420, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {oneOpen:false, twoOpen:false},
    48
  );
  assert.equal(lockedOne.x < 0, true);

  const openOne = resolveEclanitePortalPoint(
    {x:-420, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {x:420, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {oneOpen:true, twoOpen:false},
    48
  );
  assert.equal(openOne.x > 0, true);

  const lockedTwo = resolveEclanitePortalPoint(
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:420},
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:-420},
    {oneOpen:true, twoOpen:false},
    48
  );
  assert.equal(lockedTwo.y > 0, true);

  const openTwo = resolveEclanitePortalPoint(
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:420},
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:-420},
    {oneOpen:true, twoOpen:true},
    48
  );
  assert.equal(openTwo.y < 0, true);

  assert.equal(getEclanitePortalWalls({oneOpen:false, twoOpen:false}).length, 2);
  assert.equal(getEclanitePortalWalls({oneOpen:true, twoOpen:true}).length, 4);
});

test("Eclanite objective HUD keeps a continuous three-minute timer and phase vitals", ()=>{
  const receivedAt = 10_000;
  const objective = normalizeEclaniteObjective({
    kind:"eclanite",
    zone:2,
    phase:"core",
    guardiansRemaining:0,
    deadlineAt:190_000,
    remainingMs:180_000,
    core:{id:"CORE-2", hp:3_750_000, maxHp:5_000_000, exposed:true},
    boss:null,
    breaches:{oneOpen:true, twoOpen:false},
    at:10_000
  }, {receivedAt, serverAt:10_000});
  const hud = getEclaniteObjectiveHud(objective, 2, receivedAt + 60_000);
  assert.equal(hud.zone, 2);
  assert.equal(hud.phase, "core");
  assert.equal(hud.remainingMs, 120_000);
  assert.equal(formatPortalTimer(hud.remainingMs), "2:00");
  assert.equal(hud.core.exposed, true);
  assert.equal(hud.lives, 2);
  assert.match(hud.title, /NOYAU.*5/i);
  assert.deepEqual(getEclaniteObjectiveMarkers(objective).map(marker=>marker.markerKind), ["eclanite_core"]);

  const boss = normalizeEclaniteObjective({
    ...objective,
    phase:"boss",
    boss:{id:"BOSS-2", hp:2_000_000, maxHp:3_750_000, color:"red"}
  }, {receivedAt, serverAt:10_000});
  assert.deepEqual(getEclaniteObjectiveMarkers(boss).map(marker=>marker.markerKind), ["eclanite_boss"]);
});

test("socket snapshots normalize authoritative Eclanite phase, breaches, timer and lives only", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const localPlayer = {hp:90_000, shield:25_000};
  const multiplayer = {
    playerId:"pilot",
    portalInstance:null,
    portalObjective:null,
    portalAlly:null,
    portalBeacons:[],
    preparedPortal:null,
    portalStartEvents:[],
    portalCompleteEvents:[],
    rickyCinematicEvents:[],
    rickyHealEvents:[],
    npcDamageEvents:[],
    playerHealEvents:[],
    shipAbilityEvents:[],
    shipAbilityEffectEvents:[]
  };
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies(){},
    emitChange(){},
    toast(){}
  });

  const at = Date.now();
  handlers["portal:started"]({
    instanceId:"P-ECLANITE",
    portal:{id:"emerald", name:"La Ruche d'Eclanite"},
    playerLives:{pilot:3},
    at,
    objective:{
      kind:"eclanite",
      zone:1,
      phase:"guardians",
      guardiansRemaining:5,
      deadlineAt:at + 180_000,
      remainingMs:180_000,
      breaches:{oneOpen:false, twoOpen:false},
      at
    }
  });
  handlers["coop:enemies"]({
    instanceId:"P-ECLANITE",
    portal:{id:"emerald", name:"La Ruche d'Eclanite"},
    playerLives:{pilot:2},
    at:at + 5_000,
    objective:{
      kind:"eclanite",
      zone:2,
      phase:"core",
      guardiansRemaining:0,
      deadlineAt:at + 180_000,
      remainingMs:175_000,
      core:{id:"CORE-2", hp:4_000_000, maxHp:5_000_000, exposed:true},
      breaches:{oneOpen:true, twoOpen:false},
      at:at + 5_000
    }
  });

  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.kind, "eclanite");
  assert.equal(multiplayer.portalObjective.zone, 2);
  assert.equal(multiplayer.portalObjective.phase, "core");
  assert.deepEqual(multiplayer.portalObjective.breaches, {oneOpen:true, twoOpen:false});
  assert.equal(multiplayer.portalObjective.remainingMs, 175_000);
  assert.deepEqual(localPlayer, {hp:90_000, shield:25_000});

  handlers["portal:complete"]({portal:{id:"emerald"}, at:at + 180_000});
  assert.equal(multiplayer.portalObjective.phase, "complete");
  assert.deepEqual(localPlayer, {hp:90_000, shield:25_000});
});
