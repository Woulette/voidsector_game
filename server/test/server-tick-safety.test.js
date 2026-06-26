import assert from "node:assert/strict";
import test from "node:test";
import { SERVER_TICK_INTERVAL_MS, startServerTick } from "../src/tick/serverTick.js";

function baseTickContext(overrides = {}){
  return {
    cleanupExpiredLootDrops(){},
    emitInstance(){},
    emitWorldEnemies(){},
    getWorldMapState(){
      return {enemies:[]};
    },
    groups:new Map(),
    players:new Map(),
    playersOnMap(){
      return [];
    },
    presence:{
      isActiveForWorld(){
        return true;
      },
      tick(){}
    },
    updatePlayerActivity(){},
    updatePendingEnemyAttacks(){},
    updatePlayerLifecycles(){},
    updateStatusEffects(){},
    updateQuestTimers(){},
    updateRickyCompanions(){},
    updateShipAbilityEffects(){},
    updateWorldEnemy(){},
    ...overrides
  };
}

test("server tick logs unexpected errors without throwing", ()=>{
  let frame = null;
  const errors = [];
  const runtimeErrors = [];
  const handle = startServerTick(baseTickContext({
    updatePlayerActivity(){
      throw new Error("tick boom");
    },
    logger:{
      error:(message, meta)=>errors.push({message, meta})
    },
    now:()=>1000,
    onError:error=>runtimeErrors.push(error),
    setIntervalFn:(callback, intervalMs)=>{
      frame = callback;
      return {intervalMs};
    }
  }));

  assert.equal(handle.intervalMs, SERVER_TICK_INTERVAL_MS);
  assert.doesNotThrow(()=>frame());
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "[serverTick] tick failed");
  assert.match(errors[0].meta.error, /tick boom/);
  assert.equal(errors[0].meta.at, 1000);
  assert.deepEqual(runtimeErrors, [{
    source:"serverTick",
    error:errors[0].meta.error,
    at:1000
  }]);
});
