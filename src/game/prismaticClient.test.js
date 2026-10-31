import assert from "node:assert/strict";
import test from "node:test";
import {
  PRISMATIC_BOSS_MAX_HP,
  PRISMATIC_BOSS_MAX_SHIELD,
  PRISMATIC_GUARDIAN_ASSET,
  PRISMATIC_PLANET_MAX_HP,
  PRISMATIC_PORTAL_MAP,
  getPrismaticObjectiveHud,
  normalizePrismaticObjective
} from "../data/prismaticPortal.js";
import {
  getPrismaticEntityColor,
  getPrismaticEntityVisualKind,
  getPrismaticObjectiveMarkers
} from "./render/prismaticEncounter.js";
import { createPortalMap } from "./systems/portalState.js";
import { portalUsesWaveHud } from "./ui/combatHudController.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";

function planetSnapshot(overrides = {}){
  return PRISMATIC_PORTAL_MAP.planets.map(planet=>({
    id:planet.id,
    element:planet.element,
    label:planet.label,
    x:planet.x,
    y:planet.y,
    hp:PRISMATIC_PLANET_MAX_HP,
    maxHp:PRISMATIC_PLANET_MAX_HP,
    destroyed:false,
    guardiansRemaining:4,
    ...overrides[planet.element]
  }));
}

function bossSnapshot(){
  return ["red", "green", "blue"].map(color=>({
    id:`prismatic_boss_${color}`,
    color,
    hp:PRISMATIC_BOSS_MAX_HP,
    maxHp:PRISMATIC_BOSS_MAX_HP,
    shield:PRISMATIC_BOSS_MAX_SHIELD,
    maxShield:PRISMATIC_BOSS_MAX_SHIELD,
    alive:true
  }));
}

test("Prismatic portal uses the authoritative 6000x4200 arena and preloads encounter assets", ()=>{
  const map = createPortalMap({id:"prismatic", name:"Le Nexus Prismatique"});
  assert.equal(map.id, "portal-prismatic");
  assert.equal(map.prismaticPortal, true);
  assert.equal(map.width, 6_000);
  assert.equal(map.height, 4_200);
  assert.deepEqual({x:map.spawn.x, y:map.spawn.y}, {x:0, y:1_750});
  assert.deepEqual(PRISMATIC_PORTAL_MAP.rift, {x:0, y:0, radius:190});
  assert.deepEqual(
    PRISMATIC_PORTAL_MAP.planets.map(planet=>({element:planet.element, x:planet.x, y:planet.y})),
    [
      {element:"fire", x:-1_750, y:-850},
      {element:"water", x:1_750, y:-850},
      {element:"red", x:0, y:400}
    ]
  );
  assert.equal(PRISMATIC_PORTAL_MAP.planets[2].label, "PLANÈTE ROUGE CRISTALLINE");
  assert.equal(map.enemyAssets.includes(PRISMATIC_GUARDIAN_ASSET), true);
  assert.equal(map.enemyAssets.filter(asset=>asset.includes("planet_")).length, 3);
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:map}), false);
});

test("Prismatic objective normalization exposes the stable public contract", ()=>{
  const objective = normalizePrismaticObjective({
    kind:"prismatic",
    stage:"bosses",
    planets:planetSnapshot({
      fire:{hp:0, destroyed:true, guardiansRemaining:0},
      water:{hp:0, destroyed:true, guardiansRemaining:0},
      red:{hp:0, destroyed:true, guardiansRemaining:0}
    }),
    rift:{active:true, entered:true},
    bosses:[
      {
        id:"RED",
        color:"red",
        hp:1_500_000,
        maxHp:2_000_000,
        shield:2_500_000,
        maxShield:2_000_000,
        alive:true
      }
    ],
    effects:[{
      id:"BURN-1",
      type:"prismatic_burn_tick",
      targetId:"pilot",
      amount:3_000,
      durationMs:900,
      at:49_900
    }],
    at:50_000
  }, {receivedAt:60_000, serverAt:50_000});

  assert.deepEqual(
    Object.keys(objective),
    ["kind", "stage", "planets", "rift", "bosses", "effects", "completedAt"]
  );
  assert.equal(objective.stage, "bosses");
  assert.equal(objective.planets.length, 3);
  assert.deepEqual(
    Object.keys(objective.planets[0]),
    ["id", "element", "label", "x", "y", "hp", "maxHp", "destroyed", "guardiansRemaining"]
  );
  assert.equal(objective.planets.every(planet=>planet.destroyed), true);
  assert.deepEqual(objective.rift, {active:true, x:0, y:0, radius:190, entered:true});
  assert.deepEqual(
    Object.keys(objective.bosses[0]),
    ["id", "color", "hp", "maxHp", "shield", "maxShield", "alive"]
  );
  assert.equal(objective.bosses[0].shield, 2_000_000);
  assert.equal(objective.effects[0].type, "prismatic_burn_tick");
  assert.equal(objective.effects[0].color, "red");
  assert.equal(objective.effects[0].amount, 3_000);

  const defaults = normalizePrismaticObjective(null);
  assert.equal(defaults.stage, "planets");
  assert.equal(defaults.planets.every(planet=>planet.hp === PRISMATIC_PLANET_MAX_HP), true);
  assert.equal(defaults.rift.active, false);
  assert.deepEqual(defaults.bosses, []);
});

test("Prismatic HUD follows planets, rift, triad and completion phases", ()=>{
  const planets = getPrismaticObjectiveHud({
    kind:"prismatic",
    stage:"planets",
    planets:planetSnapshot({
      fire:{hp:0, destroyed:true, guardiansRemaining:0},
      water:{guardiansRemaining:2},
      red:{guardiansRemaining:1}
    })
  }, 2);
  assert.equal(planets.destroyedPlanets, 1);
  assert.equal(planets.guardiansRemaining, 3);
  assert.equal(planets.lives, 2);
  assert.match(planets.title, /1\/3/);

  const rift = getPrismaticObjectiveHud({
    kind:"prismatic",
    stage:"rift",
    planets:planetSnapshot({
      fire:{hp:0, destroyed:true, guardiansRemaining:0},
      water:{hp:0, destroyed:true, guardiansRemaining:0},
      red:{hp:0, destroyed:true, guardiansRemaining:0}
    }),
    rift:{active:true, entered:false}
  });
  assert.match(rift.title, /TROU NOIR/);
  assert.equal(rift.progress, .5);

  const bosses = getPrismaticObjectiveHud({
    kind:"prismatic",
    stage:"bosses",
    planets:planetSnapshot(),
    rift:{active:true, entered:true},
    bosses:bossSnapshot().map((boss, index)=>index === 0 ? {...boss, hp:0, shield:0, alive:false} : boss)
  });
  assert.equal(bosses.aliveBosses, 2);
  assert.match(bosses.title, /2\/3 BOSS/);

  const complete = getPrismaticObjectiveHud({
    kind:"prismatic",
    stage:"complete",
    completedAt:123
  });
  assert.equal(complete.completed, true);
  assert.equal(complete.progress, 1);
  assert.match(complete.title, /PURIFIÉ/);
});

test("Prismatic minimap markers and enemy render modes remain explicit", ()=>{
  const planetMarkers = getPrismaticObjectiveMarkers({
    kind:"prismatic",
    stage:"planets",
    planets:planetSnapshot()
  });
  assert.equal(planetMarkers.length, 3);
  assert.deepEqual(planetMarkers.map(marker=>marker.number), ["F", "E", "R"]);

  const riftMarkers = getPrismaticObjectiveMarkers({
    kind:"prismatic",
    stage:"rift",
    planets:planetSnapshot(),
    rift:{active:true, entered:false}
  });
  assert.equal(riftMarkers.some(marker=>marker.markerKind === "prismatic_rift"), true);

  const enemies = bossSnapshot().map((boss, index)=>({
    id:boss.id,
    x:index * 200,
    y:index * -150
  }));
  const bossMarkers = getPrismaticObjectiveMarkers({
    kind:"prismatic",
    stage:"bosses",
    planets:planetSnapshot(),
    bosses:bossSnapshot(),
    rift:{active:true, entered:true}
  }, enemies);
  assert.equal(bossMarkers.filter(marker=>marker.markerKind === "prismatic_boss").length, 3);
  assert.equal(getPrismaticEntityVisualKind({renderMode:"prismatic_planet"}), "planet");
  assert.equal(getPrismaticEntityVisualKind({renderMode:"prismatic_guardian"}), "guardian");
  assert.equal(getPrismaticEntityVisualKind({renderMode:"prismatic_boss"}), "boss");
  assert.equal(getPrismaticEntityColor({prismaticColor:"green"}), "green");
  assert.equal(getPrismaticEntityColor({kind:"prismatic_boss_blue"}), "blue");
});

test("socket snapshots merge Prismatic deltas and preserve terminal completion", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
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
  const changes = [];
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies(){},
    emitChange(reason, payload){ changes.push({reason, payload}); },
    toast(){}
  });

  const at = Date.now();
  handlers["portal:started"]({
    instanceId:"P-40",
    portal:{id:"prismatic", name:"Le Nexus Prismatique"},
    playerLives:{pilot:3},
    at,
    objective:{
      kind:"prismatic",
      stage:"planets",
      planets:planetSnapshot(),
      rift:{active:false, x:0, y:0, radius:190, entered:false},
      bosses:[],
      effects:[]
    }
  });
  assert.equal(multiplayer.portalInstance.waveTotal, 0);
  handlers["portal:prismatic-effect"]({
    id:"RIFT-OPEN",
    portal:{id:"prismatic", name:"Le Nexus Prismatique"},
    type:"prismatic_rift_open",
    x:0,
    y:0,
    durationMs:1_600,
    at:at + 500
  });
  assert.equal(multiplayer.portalObjective.effects.at(-1).id, "RIFT-OPEN");
  assert.equal(changes.at(-1).reason, "portal:prismatic-effect");
  handlers["coop:enemies"]({
    instanceId:"P-40",
    portal:{id:"prismatic", name:"Le Nexus Prismatique"},
    playerLives:{pilot:2},
    at:at + 1_000,
    objective:{
      kind:"prismatic",
      stage:"planets",
      planets:[{
        id:"prismatic_planet_fire",
        element:"fire",
        hp:0,
        destroyed:true,
        guardiansRemaining:0
      }],
      effects:[{
        id:"FIRE-DOWN",
        type:"prismatic_burn_start",
        x:-1_750,
        y:-850,
        at:at + 900
      }]
    }
  });

  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.planets.length, 3);
  assert.equal(multiplayer.portalObjective.planets[0].destroyed, true);
  assert.equal(multiplayer.portalObjective.planets[1].hp, 2_000_000);
  assert.equal(multiplayer.portalObjective.effects[0].id, "FIRE-DOWN");

  handlers["portal:complete"]({
    portal:{id:"prismatic", name:"Le Nexus Prismatique"},
    completedAt:at + 2_000,
    at:at + 2_000,
    objective:{kind:"prismatic", stage:"complete"}
  });
  assert.equal(multiplayer.portalInstance.completed, true);
  assert.equal(multiplayer.portalObjective.stage, "complete");
  assert.equal(multiplayer.portalObjective.completedAt, at + 2_000);
  assert.equal(changes.length > 0, true);
});
