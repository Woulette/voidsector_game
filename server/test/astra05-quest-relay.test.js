import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData.js";
import { createCombatWorldStateSystem } from "../../src/game/systems/combatWorldState.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { isPointInWorldSafeArea } from "../src/world/spawn.js";

function createRelayWorldState(){
  const currentMap = MAPS.find(map=>map.id === 4);
  const state = {
    gameMode:"open",
    currentMap,
    player:{x:-4300, y:3300, safeZoneLock:0},
    enemySeq:1
  };
  const system = createCombatWorldStateSystem({
    store:{state:{player:{firmId:"astra"}, completedQuestClaims:{}, questProgress:{}}},
    mapList:MAPS,
    getState:()=>state,
    setState:patch=>Object.assign(state, patch),
    cargo:{clear(){}, setGroundMaterials(){}},
    beams:{clear(){}},
    panels:{closeSpawnPanel(){}},
    showToast(){},
    updateHud(){},
    clampPlayerToMap(){}
  });
  return {state, system};
}

test("Helion-05 exposes only its mission relay and no refinery", ()=>{
  const {system} = createRelayWorldState();
  const stations = system.getSpawnStations();

  assert.equal(stations.length, 1);
  assert.equal(stations[0].id, "quests");
  assert.equal(stations[0].asset, "assets/spawn/astra05_quest_relay.png");
  assert.equal(stations.some(station=>station.id === "refinery"), false);
});

test("Helion-05 relay is a client and server non-aggression area", ()=>{
  const {system} = createRelayWorldState();
  const safeArea = system.getCurrentSafeArea();

  assert.equal(safeArea?.type, "relay");
  assert.equal(system.isSafeModeActive(), true);
  assert.equal(isPointInWorldSafeArea({x:-4300, y:3300}, WORLD_MAPS["4"]), true);
  assert.equal(isPointInWorldSafeArea({x:-3500, y:3300}, WORLD_MAPS["4"]), false);
});
