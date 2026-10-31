import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getNoxObjectiveHud,
  getNoxWaveGroup,
  NOX_CORE_MAX_HP,
  NOX_DEFENSE_MAX_HP,
  NOX_KAMIKAZE_BLAST_RADIUS,
  NOX_PORTAL_MAP,
  NOX_SHIELD_MAX_HP,
  normalizeNoxObjective
} from "../data/noxPortal.js";
import { getNoxObjectiveMarkers } from "./render/noxEncounter.js";
import { createPortalMap } from "./systems/portalState.js";
import { portalUsesWaveHud } from "./ui/combatHudController.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";

test("Nox uses the shared defense arena with one core, one shield and six defenses", ()=>{
  const map = createPortalMap({id:"void", name:"L'Abîme de Nox", waves:30});
  assert.equal(map.id, "portal-void");
  assert.equal(map.noxPortal, true);
  assert.equal(map.width, 5_600);
  assert.equal(map.height, 5_600);
  assert.deepEqual({x:map.spawn.x, y:map.spawn.y}, {x:0, y:900});
  assert.equal(NOX_PORTAL_MAP.shieldRadius, 1_150);
  assert.equal(NOX_PORTAL_MAP.defenses.length, 6);
  assert.deepEqual(
    NOX_PORTAL_MAP.defenses.map(defense=>defense.type).sort(),
    ["laser", "laser", "missile", "missile", "summoner", "summoner"]
  );
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:map}), true);
});

test("Nox objective normalization preserves authoritative station, boss and effect state", ()=>{
  const receivedAt = 50_000;
  const objective = normalizeNoxObjective({
    kind:"nox",
    stage:"defense",
    phase:"waves",
    wave:17,
    waveState:"wave_countdown",
    batchEnd:20,
    nextWaveDelayMs:8_000,
    shield:{hp:750_000, maxHp:NOX_SHIELD_MAX_HP},
    core:{id:"NOX-CORE", x:15, y:-20, hp:2_500_000, maxHp:NOX_CORE_MAX_HP, alive:true},
    defenses:NOX_PORTAL_MAP.defenses.map((defense, index)=>({
      ...defense,
      hp:index === 0 ? 0 : NOX_DEFENSE_MAX_HP,
      maxHp:NOX_DEFENSE_MAX_HP,
      alive:index !== 0,
      dronesAlive:defense.type === "summoner" ? 3 : 0
    })),
    drones:[
      {id:"D-1", ownerId:"nox_summoner_northwest", x:-800, y:-750, hp:20_000, maxHp:20_000, alive:true},
      {id:"D-2", ownerId:"nox_summoner_northwest", x:-900, y:-700, hp:0, maxHp:20_000, alive:false}
    ],
    boss:{id:"BOSS", hp:4_000_000, maxHp:5_000_000, shield:3_000_000, maxShield:5_000_000, alive:true},
    recentEffects:[{
      id:"K-1",
      type:"kamikaze_explosion",
      x:200,
      y:300,
      radius:NOX_KAMIKAZE_BLAST_RADIUS,
      at:49_900
    }],
    attackEvents:[{
      id:"D-A",
      type:"nox_drone_attack",
      from:{x:-800, y:-750},
      to:{x:-1_200, y:-1_100},
      at:49_950
    }],
    at:50_000
  }, {receivedAt, serverAt:50_000});

  assert.equal(objective.stage, "defense");
  assert.equal(objective.wave, 17);
  assert.equal(objective.batchEnd, 20);
  assert.equal(objective.shield.hp, 750_000);
  assert.deepEqual({x:objective.core.x, y:objective.core.y}, {x:15, y:-20});
  assert.equal(objective.defenses.filter(defense=>defense.alive).length, 5);
  assert.equal(objective.drones.length, 1);
  assert.equal(objective.boss.hp, 4_000_000);
  assert.equal(objective.boss.shield, 3_000_000);
  assert.equal(objective.boss.maxShield, 5_000_000);
  assert.deepEqual(objective.recentEffects.map(effect=>effect.id), ["K-1", "D-A"]);
  assert.equal(objective.recentEffects[0].serverAt, 50_000);

  const defaults = normalizeNoxObjective({kind:"nox"});
  assert.equal(defaults.shield.hp, NOX_SHIELD_MAX_HP);
  assert.equal(defaults.shield.alive, true);
  assert.equal(defaults.core.hp, NOX_CORE_MAX_HP);
  assert.equal(defaults.defenses.every(defense=>defense.hp === NOX_DEFENSE_MAX_HP && defense.alive), true);
});

test("Nox HUD reports assaults, station vitals, drones, kamikazes, boss and terminal states", ()=>{
  const objective = normalizeNoxObjective({
    kind:"nox",
    wave:12,
    waveState:"clear_batch",
    enemiesRemaining:4,
    kamikazesRemaining:2,
    shield:{hp:500_000, maxHp:1_000_000},
    core:{hp:2_400_000, maxHp:3_000_000},
    defenses:NOX_PORTAL_MAP.defenses.map(defense=>({...defense, hp:500_000, maxHp:500_000, alive:true})),
    drones:[
      {id:"D1", hp:20_000, maxHp:20_000, alive:true},
      {id:"D2", hp:10_000, maxHp:20_000, alive:true}
    ]
  });
  const hud = getNoxObjectiveHud(objective, 2);
  assert.equal(hud.group.group, 3);
  assert.equal(hud.shieldPct, 50);
  assert.equal(hud.corePct, 80);
  assert.equal(hud.aliveDefenses, 6);
  assert.equal(hud.dronesAlive, 2);
  assert.equal(hud.kamikazesRemaining, 2);
  assert.match(hud.title, /ASSAUT 3\/6.*VAGUE 12\/30/);
  assert.match(hud.detail, /Bouclier 50%.*Noyau 80%.*Drones 2/);

  const boss = getNoxObjectiveHud({
    ...objective,
    wave:30,
    boss:{id:"B", hp:5_000_000, maxHp:5_000_000, shield:5_000_000, maxShield:5_000_000, alive:true}
  });
  assert.equal(getNoxWaveGroup(30).bossWave, true);
  assert.match(boss.title, /BOSS/);

  const failed = getNoxObjectiveHud({...objective, failedAt:Date.now(), waveState:"failed"});
  assert.equal(failed.failed, true);
  assert.match(failed.title, /NOYAU DÉTRUIT/);

  const complete = getNoxObjectiveHud({...objective, wave:30, completedAt:Date.now(), waveState:"complete"});
  assert.equal(complete.completed, true);
  assert.equal(complete.progress, 1);
  assert.match(complete.title, /SAUVÉE/);
});

test("Nox minimap exposes the core and all six autonomous defenses", ()=>{
  const objective = normalizeNoxObjective({
    kind:"nox",
    core:{hp:3_000_000, maxHp:3_000_000, alive:true},
    defenses:NOX_PORTAL_MAP.defenses.map(defense=>({...defense, hp:500_000, maxHp:500_000, alive:true}))
  });
  const markers = getNoxObjectiveMarkers(objective);
  assert.equal(markers.length, 8);
  assert.equal(markers[0].markerKind, "nox_shield");
  assert.equal(markers[0].radius, NOX_PORTAL_MAP.shieldRadius);
  assert.equal(markers[1].markerKind, "nox_core");
  assert.equal(markers.filter(marker=>marker.markerKind === "nox_laser").length, 2);
  assert.equal(markers.filter(marker=>marker.markerKind === "nox_missile").length, 2);
  assert.equal(markers.filter(marker=>marker.markerKind === "nox_summoner").length, 2);
});

test("the combat scene actually renders the Nox base and injects its minimap markers", ()=>{
  const combatSceneSource = readFileSync(new URL("./render/combatScene.js", import.meta.url), "utf8");
  const minimapSource = readFileSync(new URL("./render/canvasHud.js", import.meta.url), "utf8");
  assert.match(combatSceneSource, /createNoxEncounterRenderer/);
  assert.match(combatSceneSource, /getNoxObjectiveMarkers\(portalObjective\)/);
  assert.match(combatSceneSource, /draw\.noxArena", \(\)=>noxEncounter\.drawArena\(state\)/);
  assert.match(minimapSource, /markerKind\.startsWith\("nox_"\)/);
  assert.match(minimapSource, /markerKind === "nox_shield"/);
});

test("socket snapshots merge Nox deltas and a failed core clears the portal immediately", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const changes = [];
  const toasts = [];
  const enemyPayloads = [];
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
    replaceServerEnemies(payload){ enemyPayloads.push(payload); },
    emitChange(reason, payload){ changes.push({reason, payload}); },
    toast(message){ toasts.push(message); }
  });

  const at = Date.now();
  handlers["portal:started"]({
    instanceId:"P-NOX",
    portal:{id:"void", name:"L'Abîme de Nox", waves:30},
    wave:1,
    waveTotal:30,
    playerLives:{pilot:3},
    at,
    objective:{
      kind:"nox",
      wave:1,
      shield:{hp:1_000_000, maxHp:1_000_000},
      core:{id:"CORE", hp:3_000_000, maxHp:3_000_000, alive:true},
      defenses:NOX_PORTAL_MAP.defenses.map(defense=>({...defense, hp:500_000, maxHp:500_000, alive:true})),
      drones:[]
    }
  });
  handlers["coop:enemies"]({
    instanceId:"P-NOX",
    portal:{id:"void", name:"L'Abîme de Nox", waves:30},
    wave:5,
    waveState:"clear_batch",
    waveBatchEnd:5,
    playerLives:{pilot:2},
    at:at + 1_000,
    objective:{
      kind:"nox",
      wave:5,
      waveState:"clear_batch",
      enemiesRemaining:3,
      shield:{hp:850_000},
      drones:[{id:"D1", hp:20_000, maxHp:20_000, alive:true}]
    }
  });

  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.wave, 5);
  assert.equal(multiplayer.portalObjective.shield.hp, 850_000);
  assert.equal(multiplayer.portalObjective.shield.maxHp, 1_000_000);
  assert.equal(multiplayer.portalObjective.core.hp, 3_000_000);
  assert.equal(multiplayer.portalObjective.defenses.length, 6);
  assert.equal(multiplayer.portalObjective.drones.length, 1);

  handlers["portal:failed"]({
    portal:{id:"void", name:"L'Abîme de Nox"},
    failedAt:at + 2_000,
    at:at + 2_000,
    objective:{kind:"nox", core:{hp:0, maxHp:3_000_000, alive:false}}
  });
  assert.equal(multiplayer.portalInstance, null);
  assert.equal(multiplayer.portalObjective, null);
  assert.equal(multiplayer.coopInstanceId, null);
  assert.deepEqual(enemyPayloads.at(-1), {instanceId:null, enemies:[]});
  assert.equal(toasts.at(-1), "Noyau détruit — portail fermé");
  assert.equal(changes.at(-1).reason, "portal:failed");
  assert.equal(changes.at(-1).payload.objective.failedAt, at + 2_000);
});
