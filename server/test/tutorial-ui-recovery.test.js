import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync(new URL("../../src/ui/tutorialController.js", import.meta.url),"utf8");
const combat = fs.readFileSync(new URL("../../src/game/combatOrchestrator.js", import.meta.url),"utf8");
const css = fs.readFileSync(new URL("../../src/styles/tutorial.css", import.meta.url),"utf8");

test("tutorial quest handoffs hide the dialogue before quest interaction", ()=>{
  assert.match(controller,/game_select_pass:\{[^\n]*handoff:true/);
  assert.match(controller,/game_accept_pass:\{[^\n]*silent:true/);
  assert.match(controller,/data-tutorial-dismiss/);
  assert.match(controller,/reason === "quest:accepted"/);
  assert.match(controller,/closeTutorialInteractionPanel/);
});

test("tutorial launcher actions also wait for continue before showing arrows", ()=>{
  assert.match(controller,/launcher_orion:\{mode:"launcher",handoff:true/);
  assert.match(controller,/launcher_buy_velox:\{mode:"launcher",handoff:true,selector:'\[data-buy-shop-ship="velox"\]'/);
  assert.match(controller,/launcher_open_refinery:\{mode:"launcher",handoff:true/);
  assert.match(controller,/if\(!typewriter\.isComplete\(\)\)\{ typewriter\.complete\(\); return; \}/);
  assert.match(controller,/tutorial-input-lock/);
  assert.match(css,/\.tutorial-input-lock\{[^}]*z-index:18950/);
});

test("tutorial explanatory steps can point while the dialogue stays open", ()=>{
  assert.match(controller,/launcher_inventory:\{mode:"launcher",manual:true,selector:"\.rpg-inventory-grid"/);
  assert.match(controller,/launcher_unequip_all:\{mode:"launcher",manual:true,selector:"#unequipAllShipBtn"/);
  assert.match(controller,/function shouldShowInstructionArrow\(definition\)/);
  assert.match(controller,/definition\?\.manual && \(definition\.selector \|\| definition\.world\)/);
  assert.match(controller,/isTransmissionBlocking\(\) && !shouldShowInstructionArrow\(definition\)/);
});

test("tutorial target arrows scroll hidden UI elements before pointing", ()=>{
  assert.match(controller,/function ensureTargetInView\(element, selector\)/);
  assert.match(controller,/element\.scrollIntoView\?\.\(\{block:"center", inline:"center", behavior:"smooth"\}\)/);
  assert.match(controller,/if\(!rect\)\{\s*setHighlightedElement\(\);\s*arrow\.classList\.add\("hidden"\);/);
});

test("tutorial close requires explicit permanent-abandon confirmation", ()=>{
  assert.match(controller,/ABANDONNER LE TUTORIEL \?/);
  assert.match(controller,/ABANDONNER DÉFINITIVEMENT/);
  assert.match(controller,/send\("abandon"\)/);
  assert.doesNotMatch(controller,/data-tutorial-close[^\n]+send\("pause"\)/);
});

test("world tutorial arrows support fixed stations and player-directed targets", ()=>{
  assert.match(controller,/arrowMode:"world-anchor"/);
  assert.match(controller,/arrowMode:"player-direction"/);
  assert.match(controller,/world-direction/);
  assert.match(combat,/player:\{x:player\.x,y:player\.y,screenX:playerScreenX,screenY:playerScreenY\}/);
  assert.match(combat,/targetMapName = currentPrefix && currentPrefix !== currentMapName \? `\$\{currentPrefix\}-02` : ""/);
  assert.match(css,/\.tutorial-arrow\{[^}]*z-index:20000/);
  assert.match(css,/\.tutorial-arrow\.world-direction/);
});

test("mission relay camera preview lasts long enough to understand the target", ()=>{
  assert.match(controller,/previewDuration:6500/);
});
