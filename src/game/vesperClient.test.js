import assert from "node:assert/strict";
import test from "node:test";
import { portals } from "../data/progression.js";
import {
  getVesperEntityVisualKind,
  getVesperObjectiveHud,
  getVesperObjectiveMarkers,
  normalizeVesperObjective,
  resolvePortalLives,
  VESPER_PORTAL_MAP
} from "../data/vesperPortal.js";
import { normalizeState, store } from "../core/store.js?v=20260726-kharon1";
import { renderPortals } from "../ui/renderPortals.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";
import { portalUsesWaveHud } from "./ui/combatHudController.js";
import { createPortalMap } from "./systems/portalState.js";

test("violet exposes Azuron's shared wave arena with difficulty times 2", ()=>{
  const portal=portals.find(entry=>entry.id === "violet");
  assert.equal(portal.contentStatus,"ready");assert.equal(portal.waves,30);
  assert.match(portal.contentLabel,/6 séries de 5/);assert.match(portal.desc,/gains ×2/);
  const map=createPortalMap(portal);
  assert.equal(map.id,"portal-violet");assert.equal(map.azuronPortal,true);
  assert.equal(map.width,7800);assert.equal(map.height,5400);
});

test("Vesper snapshots normalize cages, allied red drones, boss orbiters and lives", ()=>{
  const objective = normalizeVesperObjective({
    kind:"vesper",
    stage:"boss",
    cagesDestroyed:4,
    cagesTotal:4,
    bossSpawned:true,
    bossId:"VESPER-BOSS",
    cages:[
      {id:"C1", number:1, x:-2450, y:-1650, destroyed:true},
      {id:"C2", number:2, x:2450, y:-1650, destroyed:true},
      {id:"C3", number:3, x:-2450, y:1650, destroyed:true},
      {id:"C4", number:4, x:2450, y:1650, destroyed:true}
    ],
    bossOrbiters:[{id:"O1", x:220, y:0, size:52}]
  }, {
    allies:[{
      id:"A1",
      name:"Drone libéré 1",
      x:100,
      y:120,
      hp:20_000,
      maxHp:20_000,
      shield:20_000,
      maxShield:20_000,
      renderMode:"vesper_ally_drone"
    }],
    receivedAt:42
  });

  assert.equal(objective.cages.length, 4);
  assert.equal(objective.allies.length, 1);
  assert.equal(objective.allies[0].renderMode, "vesper_ally_drone");
  assert.equal(objective.allies[0].color, "#ef3340");
  assert.equal(objective.bossOrbiters.length, 1);
  assert.equal(getVesperEntityVisualKind({renderMode:"vesper_cage"}), "cage");
  assert.equal(getVesperEntityVisualKind({kind:"vesper_turret"}), "turret");
  assert.equal(getVesperEntityVisualKind({renderMode:"vesper_guard"}), "guard");
  assert.equal(getVesperEntityVisualKind({kind:"vesper_giant_drone"}), "boss");
  assert.equal(resolvePortalLives({playerLives:{pilot:2}}, "pilot"), 2);

  const hud = getVesperObjectiveHud(objective, 2);
  assert.match(hud.title, /DRONE GÉANT/);
  assert.equal(hud.lives, 2);
  const markers = getVesperObjectiveMarkers(objective, [{id:"VESPER-BOSS", x:0, y:0}]);
  assert.equal(markers.filter(marker=>marker.markerKind === "vesper_cage").length, 4);
  assert.equal(markers.at(-1).markerKind, "vesper_boss");
});

test("Vesper uses its objective HUD instead of the wave countdown", ()=>{
  assert.equal(portalUsesWaveHud({
    gameMode:"portal",
    currentMap:{id:"portal-violet", vesperPortal:true}
  }), false);
  assert.equal(portalUsesWaveHud({
    gameMode:"portal",
    currentMap:{id:"portal-blue"}
  }), true);
});

test("the socket bridge keeps Vesper allies, objective progress and the authoritative life count", ()=>{
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
    shipAbilityEvents:[]
  };
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies(){},
    emitChange(){},
    toast(){}
  });
  handlers["portal:started"]({
    instanceId:"P-VESPER",
    portal:{id:"violet", name:"La Faille de Vesper"},
    playerLives:{pilot:3},
    allies:[],
    objective:{kind:"vesper", stage:"cages", cagesDestroyed:0, cagesTotal:4}
  });
  handlers["coop:enemies"]({
    instanceId:"P-VESPER",
    portal:{id:"violet", name:"La Faille de Vesper"},
    playerLives:{pilot:2},
    allies:[{id:"A1", hp:20_000, maxHp:20_000, shield:20_000, maxShield:20_000}],
    objective:{kind:"vesper", stage:"cages", cagesDestroyed:1, cagesTotal:4}
  });
  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.cagesDestroyed, 1);
  assert.equal(multiplayer.portalObjective.allies.length, 1);
  assert.equal(multiplayer.portalObjective.allies[0].renderMode, "vesper_ally_drone");
});

test("the portal card explains the level gate when Azuron fragments are already complete", ()=>{
  const previousDocument = globalThis.document;
  const grid = {innerHTML:""};
  const caster = {innerHTML:""};
  const previousState = store.state;
  try{
    normalizeState({});
    globalThis.document = {
      getElementById(id){
        if(id === "portalGrid") return grid;
        if(id === "portalCasterPanel") return caster;
        return null;
      }
    };
    store.state.player.level = 3;
    store.state.portalPieces.blue = 15;
    store.state.unlockedPortals = store.state.unlockedPortals.filter(id=>id !== "blue");
    store.state.activeShip ||= "starter";
    renderPortals();
    assert.match(grid.innerHTML, /Niveau 10 requis/);
  }finally{
    store.state = previousState;
    globalThis.document = previousDocument;
  }
});
