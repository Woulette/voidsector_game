import assert from "node:assert/strict";
import test from "node:test";
import { createCombatQuestProgressSystem } from "../../src/game/systems/combatQuestProgress.js";

test("coordinate polling stays silent when no active quest needs coordinates", ()=>{
  let hasCoordinateObjective = false;
  const sent = [];
  const system = createCombatQuestProgressSystem({
    multiplayer:{
      connected:true,
      socket:{},
      auth:{account:{id:"account-1"}, profileReady:true}
    },
    getPlayer:()=>({x:120, y:-45}),
    getCurrentMap:()=>({name:"Helion-01"}),
    hasCoordinateObjective:()=>hasCoordinateObjective,
    progressServerQuest:payload=>sent.push(payload)
  });

  system.update(1);
  assert.deepEqual(sent, []);

  hasCoordinateObjective = true;
  system.update(.05);
  assert.deepEqual(sent, [{
    type:"visit_coordinates",
    x:120,
    y:-45,
    zoneName:"Helion-01"
  }]);
});
