import assert from "node:assert/strict";
import test from "node:test";
import { portals } from "../data/progression.js";
import {
  getIonisWaveGroup,
  getIonisWaveHud,
  IONIS_PORTAL_ID,
  IONIS_WAVE_GROUP_TOTAL,
  IONIS_WAVE_TOTAL,
  isIonisPortal,
  normalizeIonisObjective
} from "../data/ionisPortal.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";

test("Ionis keeps its canonical level-25 id and exposes 40 waves in ten groups", ()=>{
  const ionis = portals.find(portal=>portal.id === IONIS_PORTAL_ID);
  const eclanite = portals.find(portal=>portal.id === "emerald");
  assert.equal(ionis?.requirement?.level, 25);
  assert.equal(ionis?.contentStatus, "ready");
  assert.equal(ionis?.waves, IONIS_WAVE_TOTAL);
  assert.equal(ionis?.waveBatchSize, 4);
  assert.match(ionis?.contentLabel || "", /40 vagues.*10 groupes.*3 vies/i);
  assert.equal(isIonisPortal(ionis), true);
  assert.equal(isIonisPortal(eclanite), false);
  assert.equal(eclanite?.name, "La Ruche d’Éclanite");
});

test("Ionis wave grouping covers waves 1-40 in groups 1-10", ()=>{
  assert.deepEqual(getIonisWaveGroup(1), {
    wave:1,
    group:1,
    groupTotal:10,
    groupStart:1,
    groupEnd:4,
    positionInGroup:1,
    finalEliteAssault:false
  });
  assert.equal(getIonisWaveGroup(4).group, 1);
  assert.equal(getIonisWaveGroup(5).group, 2);
  assert.equal(getIonisWaveGroup(36).group, 9);
  assert.equal(getIonisWaveGroup(37).group, IONIS_WAVE_GROUP_TOTAL);
  assert.equal(getIonisWaveGroup(40).positionInGroup, 4);
  assert.equal(getIonisWaveGroup(40).finalEliteAssault, true);
});

test("Ionis HUD distinguishes cleanup, reinforcements and the final elite assault without calling it a boss", ()=>{
  const clearing = getIonisWaveHud({
    wave:8,
    waveTotal:40,
    waveState:"clear_batch",
    waitingForClear:true,
    lives:2
  });
  assert.equal(clearing.title, "GROUPE 2/10 · VAGUE 8/40");
  assert.match(clearing.detail, /Nettoyez le groupe 2\/10/);
  assert.equal(clearing.lives, 2);

  const reinforcement = getIonisWaveHud({
    wave:17,
    waveTotal:40,
    nextWaveDelay:6.2,
    lives:3
  });
  assert.equal(reinforcement.title, "GROUPE 5/10 · VAGUE 17/40");
  assert.match(reinforcement.detail, /Prochain renfort dans 7 s.*vague 18\/40/);

  const finalElite = getIonisWaveHud({wave:40, waveTotal:40, lives:1});
  assert.equal(finalElite.title, "ASSAUT D’ÉLITE FINAL · VAGUE 40/40");
  assert.equal(finalElite.finalEliteAssault, true);
  assert.equal(finalElite.completed, false);
  assert.equal(finalElite.finalEliteAssault && !finalElite.completed, true);
  assert.doesNotMatch(`${finalElite.title} ${finalElite.detail}`, /boss/i);
  assert.equal(finalElite.lives, 1);

  const completed = getIonisWaveHud({wave:40, waveTotal:40, completed:true, lives:1});
  assert.equal(completed.completed, true);
  assert.equal(completed.finalEliteAssault && !completed.completed, false);
  assert.equal(completed.title, "TEMPÊTE D’IONIS TERMINÉE");
});

test("Ionis objective normalization keeps the authoritative wave state and elite flag", ()=>{
  const objective = normalizeIonisObjective({
    kind:"ionis",
    wave:40,
    waveTotal:40,
    waveState:"clear_batch",
    waveBatchEnd:40,
    nextWaveAt:12_000,
    nextWaveDelayMs:3_000,
    eliteWave:true
  });
  assert.equal(objective.wave, 40);
  assert.equal(objective.waveGroup, 10);
  assert.equal(objective.waveState, "clear_batch");
  assert.equal(objective.waveBatchEnd, 40);
  assert.equal(objective.nextWaveDelayMs, 3_000);
  assert.equal(objective.finalEliteAssault, true);
});

test("the socket bridge carries Ionis group, cleanup and life state without touching player combat values", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const localPlayer = {hp:80_000, shield:20_000};
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
    instanceId:"P-IONIS",
    portal:{id:"ionis", name:"La Tempête d’Ionis", waves:40},
    wave:1,
    waveTotal:40,
    waveState:"wave_countdown",
    waveBatchEnd:4,
    playerLives:{pilot:3},
    objective:{
      kind:"ionis",
      wave:1,
      waveTotal:40,
      waveState:"wave_countdown",
      waveBatchEnd:4,
      eliteWave:false
    }
  });
  handlers["coop:enemies"]({
    instanceId:"P-IONIS",
    portal:{id:"ionis", name:"La Tempête d’Ionis", waves:40},
    wave:12,
    waveTotal:40,
    waveState:"clear_batch",
    waveBatchEnd:12,
    nextWaveDelayMs:0,
    playerLives:{pilot:2},
    objective:{
      kind:"ionis",
      wave:12,
      waveTotal:40,
      waveState:"clear_batch",
      waveBatchEnd:12,
      eliteWave:false
    }
  });

  assert.equal(multiplayer.portalInstance.wave, 12);
  assert.equal(multiplayer.portalInstance.waveTotal, 40);
  assert.equal(multiplayer.portalInstance.waitingForClear, true);
  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.waveGroup, 3);
  assert.deepEqual(localPlayer, {hp:80_000, shield:20_000});
});
