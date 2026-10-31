import assert from "node:assert/strict";
import test from "node:test";
import { portals } from "../data/progression.js";
import {
  getKharonBombVisualState,
  getKharonBossEffectVisualState,
  getKharonWaveHud,
  getKharonWavePhase,
  KHARON_BOMB_RADIUS,
  KHARON_BOSS_ASSETS,
  KHARON_PORTAL_MAP,
  normalizeKharonHazard
} from "../data/kharonPortal.js?v=20260726-kharon1";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";
import { createPortalMap } from "./systems/portalState.js";

test("red exposes Azuron's shared wave arena with difficulty times 3", ()=>{
  const portal=portals.find(entry=>entry.id === "red");
  assert.equal(portal.contentStatus,"ready");assert.equal(portal.waves,30);
  assert.match(portal.contentLabel,/6 séries de 5/);assert.match(portal.desc,/gains ×3/);
  const map=createPortalMap(portal);
  assert.equal(map.id,"portal-red");assert.equal(map.azuronPortal,true);
  assert.equal(map.width,7800);assert.equal(map.height,5400);
});

test("Kharon HUD identifies wave batches, boss waves, lives and an active bomb", ()=>{
  const assault = getKharonWaveHud({
    wave:7,
    waveTotal:30,
    waitingForClear:true,
    lives:2,
    objective:{kind:"kharon", hazards:[]}
  });
  assert.equal(assault.title, "ASSAUT II · VAGUE 7/30");
  assert.match(assault.detail, /Éliminez tous les ennemis/);
  assert.equal(assault.lives, 2);
  assert.equal(assault.progress, 7 / 30);

  const boss = getKharonWaveHud({
    wave:20,
    objective:{
      kind:"kharon",
      hazards:[{
        id:"bomb-1",
        kind:"boss_teleport_bomb",
        phase:"charging",
        x:10,
        y:20,
        maxRadius:500,
        startedAt:1_000,
        detonateAt:4_000,
        at:1_000
      }]
    }
  });
  assert.equal(boss.phase.bossName, "NYXARIS");
  assert.equal(boss.bombActive, true);
  assert.match(boss.detail, /SORTEZ DU CERCLE/);
});

test("the authoritative Kharon bomb grows to radius 500 in three seconds then renders its explosion", ()=>{
  const charging = normalizeKharonHazard({
    id:"bomb-1",
    kind:"boss_teleport_bomb",
    phase:"charging",
    x:120,
    y:-40,
    fromX:-800,
    fromY:300,
    toX:120,
    toY:-40,
    radius:0,
    maxRadius:KHARON_BOMB_RADIUS,
    durationMs:3_000,
    startedAt:1_000,
    detonateAt:4_000,
    at:1_000
  }, {receivedAt:1_000, serverAt:1_000});
  const halfway = getKharonBombVisualState(charging, 2_500);
  assert.equal(halfway.chargeProgress, .5);
  assert.equal(halfway.displayRadius, 250);
  assert.equal(halfway.countdownSeconds, 2);
  assert.equal(halfway.fromX, -800);
  assert.equal(halfway.toX, 120);

  const exploded = normalizeKharonHazard({
    ...charging,
    __kharonHazardNormalized:false,
    phase:"exploded",
    explodedAt:4_000
  }, {receivedAt:4_000, serverAt:4_000});
  const explosion = getKharonBombVisualState(exploded, 4_450);
  assert.equal(explosion.phase, "exploded");
  assert.equal(explosion.explosionProgress, .5);
  assert.equal(explosion.visible, true);
});

test("Kharon socket snapshots and effects remain visual state and never alter local HP", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const localPlayer = {hp:95_000, shield:12_000};
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

  handlers["portal:started"]({
    instanceId:"P-KHARON",
    portal:{id:"red", name:"La Forge de Kharon", waves:30},
    wave:10,
    waveTotal:30,
    playerLives:{pilot:3},
    objective:{kind:"kharon", hazards:[], bossEffects:[]}
  });
  handlers["portal:kharon-effect"]({
    id:"bomb-1",
    kind:"boss_teleport_bomb",
    bossId:"BOSS-VESPERION",
    phase:"charging",
    x:40,
    y:80,
    fromX:-400,
    fromY:-200,
    maxRadius:500,
    durationMs:3_000,
    startedAt:1_000,
    detonateAt:4_000,
    at:1_000
  });
  handlers["portal:kharon-effect"]({
    id:"absorb-1",
    kind:"boss_absorption",
    bossId:"BOSS-VESPERION",
    x:40,
    y:80,
    radius:130,
    durationMs:900,
    startedAt:1_500,
    at:1_500
  });
  assert.equal(multiplayer.portalObjective.hazards.length, 1);
  assert.equal(multiplayer.portalObjective.hazards[0].maxRadius, 500);
  assert.equal(multiplayer.portalObjective.bossEffects.length, 1);
  assert.equal(multiplayer.portalObjective.bossEffects[0].kind, "boss_absorption");
  assert.deepEqual(localPlayer, {hp:95_000, shield:12_000});
  handlers["portal:kharon-effect"]({
    kind:"boss_ability",
    bossId:"BOSS-VESPERION",
    ability:{abilityId:"absorbing_fire"},
    at:1_700
  });
  assert.equal(multiplayer.portalObjective.hazards.length, 1);
  assert.equal(multiplayer.portalObjective.bossEffects.length, 1);

  handlers["coop:enemies"]({
    instanceId:"P-KHARON",
    portal:{id:"red", name:"La Forge de Kharon", waves:30},
    wave:20,
    waveTotal:30,
    waveState:"clear_batch",
    waitingForClear:true,
    playerLives:{pilot:2},
    objective:{
      kind:"kharon",
      hazards:multiplayer.portalObjective.hazards,
      bossEffects:multiplayer.portalObjective.bossEffects
    }
  });
  assert.equal(multiplayer.portalInstance.wave, 20);
  assert.equal(multiplayer.portalInstance.waitingForClear, true);
  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.hazards.length, 1);
  assert.deepEqual(localPlayer, {hp:95_000, shield:12_000});
});

test("all four boss ability effects have bounded visual progress", ()=>{
  const kinds = [
    "boss_absorption",
    "boss_poison_wave",
    "boss_spectral_charge",
    "boss_spectral_impact"
  ];
  for(const kind of kinds){
    const visual = getKharonBossEffectVisualState({
      id:kind,
      kind,
      x:0,
      y:0,
      radius:300,
      durationMs:1_000,
      startedAt:1_000
    }, 1_500);
    assert.equal(visual.kind, kind);
    assert.equal(visual.progress, .5);
    assert.equal(visual.visible, true);
  }
});
