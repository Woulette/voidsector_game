import assert from "node:assert/strict";
import test from "node:test";
import { portalUsesWaveHud } from "../../src/game/ui/combatHudController.js";

test("Ricky portal hides the generic wave HUD", ()=>{
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:{rickyPortal:true}}), false);
  assert.equal(portalUsesWaveHud({gameMode:"portal", currentMap:{rickyPortal:false}}), true);
  assert.equal(portalUsesWaveHud({gameMode:"open", currentMap:{rickyPortal:false}}), false);
});
