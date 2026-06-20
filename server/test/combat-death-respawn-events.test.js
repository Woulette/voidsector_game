import assert from "node:assert/strict";
import test from "node:test";
import { createCombatFrameUpdateSystem } from "../../src/game/systems/combatFrameUpdate.js";

test("the combat loop consumes server respawn events while the local player is dead", ()=>{
  const state = {
    player:{
      isDead:true,
      safeZoneLock:0,
      radiationTimer:30
    },
    camera:{x:0, y:0},
    portalTransition:null,
    mouseMoveHeld:false,
    mouse:{x:0, y:0},
    currentMap:{id:"portal-ricky"},
    teleportLock:0
  };
  let serverEventsApplied = 0;
  let cameraUpdates = 0;
  const system = createCombatFrameUpdateSystem({
    multiplayer:{},
    getState:()=>state,
    setState:update=>Object.assign(state, update),
    rewards:{tick(){}},
    tickCombatBoosts(){},
    updatePlayerPoison(){},
    updateLootPopup(){},
    serverEvents:{
      applyAll(){
        serverEventsApplied += 1;
        state.player.isDead = false;
      }
    },
    updateCamera(){
      cameraUpdates += 1;
    },
    updateHud(){},
    getCanvas:()=>({})
  });

  system.update(.05);

  assert.equal(serverEventsApplied, 1);
  assert.equal(state.player.isDead, false);
  assert.equal(cameraUpdates, 1);
});
