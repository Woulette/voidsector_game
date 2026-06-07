import assert from "node:assert/strict";
import test from "node:test";
import { createServerEventController } from "../../src/app/serverEventController.js";

function createFixture({appMode = "game", gameRunning = true} = {}){
  const multiplayer = {
    questProgressEvents:[{
      updates:[{questId:"quest_test", progress:1, objectiveProgress:1}]
    }],
    questFailureEvents:[]
  };
  const store = {
    state:{questProgress:{}, questFailProgress:{}, activeQuestIds:[]},
    currentView:"game",
    hangarTab:"vaisseau"
  };
  let renders = 0;
  const controller = createServerEventController({
    multiplayer,
    store,
    questCatalog:[{id:"quest_test", objective:{count:5}}],
    getItem(){},
    getShip(){},
    getDroneFormation(){},
    ensureShipLoadout(){},
    saveState(){},
    renderAll(){ renders += 1; },
    renderTop(){},
    renderProfile(){},
    showToast(){},
    accountProfileScope(){ return "guest"; },
    switchLocalProfileScope(){},
    appMode,
    isGameRunning:()=>gameRunning
  });
  return {controller, multiplayer, store, get renders(){return renders;}};
}

test("combat owns quest progress events without launcher-wide render", ()=>{
  const fixture = createFixture();
  fixture.controller.handleChange({detail:{reason:"quest:progress"}});
  assert.equal(fixture.renders, 0);
  assert.equal(fixture.multiplayer.questProgressEvents.length, 1);
  assert.deepEqual(fixture.store.state.questProgress, {});
});

test("launcher still consumes and renders quest progress events", ()=>{
  const fixture = createFixture({appMode:"launcher", gameRunning:false});
  fixture.controller.handleChange({detail:{reason:"quest:progress"}});
  assert.equal(fixture.renders, 1);
  assert.equal(fixture.multiplayer.questProgressEvents.length, 0);
  assert.equal(fixture.store.state.questProgress.quest_test, 1);
});
