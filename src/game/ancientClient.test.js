import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ANCIENT_PORTAL_MAP,
  getAncientInteractionTarget,
  getAncientObjectiveHud,
  getAncientObjectiveMarkers,
  normalizeAncientObjective,
  resolveAncientPortalPoint
} from "../data/ancientPortal.js";
import {
  getAncientEnemyOverlayKind,
  getAncientRoomVisual
} from "./render/ancientEncounter.js";
import { createPortalMap } from "./systems/portalState.js";
import { portalUsesWaveHud } from "./ui/combatHudController.js";
import { installWorldSocketListeners } from "../multiplayer/worldSocketListeners.js";
import { createSocketCommands } from "../multiplayer/socketCommands.js";

function rooms(overrides = {}){
  return ANCIENT_PORTAL_MAP.rooms.map(room=>({
    ...room,
    discovered:false,
    role:"unknown",
    cageDestroyed:false,
    angelFreed:false,
    ...(overrides[room.id] || {})
  }));
}

test("Ancient portal uses the five-room authoritative arena and no generic wave HUD", ()=>{
  const map = createPortalMap({id:"ancient", name:"Le Sanctuaire des Précurseurs"});
  assert.equal(map.id, "portal-ancient");
  assert.equal(map.ancientPortal, true);
  assert.equal(map.width, 6_800);
  assert.equal(map.height, 5_200);
  assert.deepEqual({x:map.spawn.x, y:map.spawn.y}, {x:0, y:700});
  assert.equal(ANCIENT_PORTAL_MAP.rooms.length, 5);
  assert.equal(map.enemyAssets.includes("assets/ships/Astralis.png"), true);
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:map}), false);
});

test("Ancient public objective keeps undiscovered secrets hidden and normalizes revealed rooms", ()=>{
  const state = normalizeAncientObjective({
    kind:"precursors",
    phase:"hell",
    stage:"rescue",
    deadlineAt:400_000,
    remainingMs:300_000,
    rescuedCount:0,
    rooms:rooms({
      ancient_room_1:{role:"angel"},
      ancient_room_2:{role:"talisman"},
      ancient_room_3:{discovered:true, role:"empty", cageDestroyed:true}
    }),
    at:100_000
  }, {receivedAt:200_000, serverAt:100_000});

  assert.equal(state.rooms.length, 5);
  assert.equal(state.rooms[0].role, "angel");
  assert.equal(state.rooms[0].discovered, false);
  assert.equal(getAncientRoomVisual(state.rooms[0]).role, "unknown");
  assert.equal(getAncientRoomVisual(state.rooms[1]).role, "unknown");
  assert.equal(getAncientRoomVisual(state.rooms[2]).role, "empty");
  assert.equal(state.allies.length, 0);
  assert.equal(state.bombs.length, 0);
});

test("Ancient HUD follows rescue, talisman, rift, king, God and completion", ()=>{
  const rescue = getAncientObjectiveHud({
    kind:"precursors",
    phase:"hell",
    stage:"rescue",
    remainingMs:300_000,
    rooms:rooms()
  }, 3, 10_000);
  assert.match(rescue.title, /VAISSEAUX-ANGES/);
  assert.equal(rescue.rescuedCount, 0);
  assert.equal(rescue.lives, 3);

  const talisman = getAncientObjectiveHud({
    kind:"precursors",
    phase:"hell",
    stage:"find_talisman",
    rescuedCount:2,
    rooms:rooms()
  });
  assert.match(talisman.title, /TALISMAN/);

  const rift = getAncientObjectiveHud({
    kind:"precursors",
    phase:"hell",
    stage:"enter_rift",
    rescuedCount:2,
    talisman:{acquired:true},
    rift:{open:true}
  });
  assert.match(rift.title, /PARADIS/);

  const king = getAncientObjectiveHud({
    kind:"precursors",
    phase:"paradise",
    stage:"demon_king",
    allies:Array.from({length:8}, (_, index)=>({
      id:`A-${index}`,
      hp:1_000_000,
      maxHp:1_000_000,
      shield:1_000_000,
      maxShield:1_000_000,
      alive:true
    })),
    bombs:[{id:"B", x:0, y:0, radius:100, detonateAt:20_000}]
  }, 2);
  assert.match(king.title, /ROI DES DÉMONS/);
  assert.equal(king.alliesAlive, 8);
  assert.equal(king.bombsActive, 1);

  const god = getAncientObjectiveHud({
    kind:"precursors",
    phase:"epilogue",
    stage:"god",
    god:{visible:true}
  });
  assert.match(god.title, /DIEU DES VAISSEAUX/);

  const complete = getAncientObjectiveHud({
    kind:"precursors",
    phase:"epilogue",
    stage:"complete",
    completedAt:123
  });
  assert.equal(complete.completed, true);
  assert.equal(complete.progress, 1);
});

test("Ancient collision resolver blocks room-wall shortcuts and contains paradise", ()=>{
  const roomOne = ANCIENT_PORTAL_MAP.rooms[0];
  const roomThree = ANCIENT_PORTAL_MAP.rooms[2];
  const blocked = resolveAncientPortalPoint(
    roomOne,
    roomThree,
    {phase:"hell"},
    48
  );
  assert.notDeepEqual(
    {x:Math.round(blocked.x), y:Math.round(blocked.y)},
    {x:roomThree.x, y:roomThree.y}
  );

  const paradise = resolveAncientPortalPoint(
    ANCIENT_PORTAL_MAP.paradiseSpawn,
    {x:9_999, y:9_999},
    {phase:"paradise"},
    48
  );
  assert.ok(Math.hypot(paradise.x, paradise.y) <= ANCIENT_PORTAL_MAP.paradiseArena.radius);
});

test("Ancient minimap, interactions and overlays expose only actionable public state", ()=>{
  const objective = normalizeAncientObjective({
    kind:"precursors",
    phase:"hell",
    stage:"open_rift",
    rescuedCount:2,
    rooms:rooms({
      ancient_room_1:{discovered:true, role:"angel", angelFreed:true, cageDestroyed:true},
      ancient_room_2:{discovered:true, role:"empty", cageDestroyed:true}
    }),
    talisman:{acquired:true},
    beacon:{active:true, x:0, y:0, radius:180}
  });
  const markers = getAncientObjectiveMarkers(objective);
  assert.equal(markers.filter(marker=>marker.markerKind.startsWith("ancient_room")).length, 4);
  assert.equal(markers.some(marker=>marker.markerKind === "ancient_angel"), true);
  assert.equal(markers.some(marker=>marker.markerKind === "ancient_beacon"), true);
  assert.equal(markers.some(marker=>marker.markerKind === "ancient_talisman"), false);
  assert.equal(getAncientInteractionTarget(objective, {x:0, y:0})?.action, "beacon");
  assert.equal(getAncientInteractionTarget(objective, {x:2_000, y:2_000}), null);
  assert.equal(getAncientEnemyOverlayKind({precursorTalismanIcon:true}), "talisman");
  assert.equal(getAncientEnemyOverlayKind({precursorRole:"demon_king"}), "king");
});

test("Ancient socket snapshots merge deltas, effects, completion and timeout failure", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const toasts = [];
  const changes = [];
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
    emitChange(reason, payload){ changes.push({reason, payload}); },
    toast(message){ toasts.push(message); }
  });

  const at = Date.now();
  handlers["portal:started"]({
    instanceId:"P-45",
    portal:{id:"ancient", name:"Le Sanctuaire des Précurseurs"},
    playerLives:{pilot:3},
    at,
    objective:{
      kind:"precursors",
      phase:"hell",
      stage:"rescue",
      remainingMs:300_000,
      rooms:rooms()
    }
  });
  assert.equal(multiplayer.portalInstance.waveTotal, 0);
  handlers["coop:enemies"]({
    instanceId:"P-45",
    portal:{id:"ancient", name:"Le Sanctuaire des Précurseurs"},
    playerLives:{pilot:2},
    at:at + 1_000,
    objective:{
      kind:"precursors",
      rescuedCount:1,
      rooms:[{
        id:"ancient_room_1",
        discovered:true,
        role:"angel",
        cageDestroyed:true,
        angelFreed:true
      }]
    }
  });
  assert.equal(multiplayer.portalInstance.lives, 2);
  assert.equal(multiplayer.portalObjective.rooms.length, 5);
  assert.equal(multiplayer.portalObjective.rescuedCount, 1);
  assert.equal(multiplayer.portalObjective.rooms[0].angelFreed, true);

  handlers["portal:precursor-effect"]({
    id:"ANGEL-1",
    type:"angel_freed",
    x:0,
    y:-1_900,
    at:at + 1_100
  });
  assert.equal(multiplayer.portalObjective.effects.at(-1).id, "ANGEL-1");
  assert.equal(changes.at(-1).reason, "portal:precursor-effect");

  handlers["portal:complete"]({
    portal:{id:"ancient"},
    objective:{kind:"precursors"},
    completedAt:at + 2_000,
    at:at + 2_000
  });
  assert.equal(multiplayer.portalObjective.stage, "complete");
  assert.equal(multiplayer.portalInstance.completed, true);

  handlers["portal:failed"]({
    portal:{id:"ancient"},
    objective:{kind:"precursors", failureReason:"timer"},
    message:"Temps écoulé.",
    at:at + 3_000
  });
  assert.equal(multiplayer.portalInstance, null);
  assert.equal(multiplayer.portalObjective, null);
  assert.equal(toasts.at(-1), "Temps écoulé.");
  assert.equal(changes.at(-1).payload.objective.stage, "failed");
});

test("Ancient interaction command accepts only the three server-authorized actions", ()=>{
  const emitted = [];
  const multiplayer = {
    connected:true,
    authoritativeSession:true,
    socket:{emit(event, payload){ emitted.push({event, payload}); }},
    auth:{account:{id:"A"}, profileReady:true}
  };
  const commands = createSocketCommands({multiplayer});
  assert.equal(commands.interactPrecursorPortal("beacon"), true);
  assert.equal(commands.interactPrecursorPortal("rift"), true);
  assert.equal(commands.interactPrecursorPortal("god"), true);
  assert.equal(commands.interactPrecursorPortal("free_reward"), false);
  assert.deepEqual(emitted.map(item=>item.payload.action), ["beacon", "rift", "god"]);
});

test("combat scene and minimap wire the provisional Ancient visuals into the live renderer", ()=>{
  const scene = readFileSync(new URL("./render/combatScene.js", import.meta.url), "utf8");
  const minimap = readFileSync(new URL("./render/canvasHud.js", import.meta.url), "utf8");
  const frame = readFileSync(new URL("./systems/combatFrameUpdate.js", import.meta.url), "utf8");
  assert.match(scene, /createAncientEncounterRenderer/);
  assert.match(scene, /getAncientObjectiveMarkers\(portalObjective\)/);
  assert.match(scene, /draw\.ancientArena", \(\)=>ancientEncounter\.drawArena\(state\)/);
  assert.match(minimap, /markerKind\.startsWith\("ancient_"\)/);
  assert.match(frame, /resolveAncientPortalPoint/);
});
