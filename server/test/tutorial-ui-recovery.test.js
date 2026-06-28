import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync(new URL("../../src/ui/tutorialController.js", import.meta.url),"utf8");
const recovery = fs.readFileSync(new URL("../../src/app/gameConnectionRecovery.js", import.meta.url),"utf8");
const combat = fs.readFileSync(new URL("../../src/game/combatOrchestrator.js", import.meta.url),"utf8");
const actionBar = fs.readFileSync(new URL("../../src/game/ui/actionBar.js", import.meta.url),"utf8");
const app = fs.readFileSync(new URL("../../src/app.js", import.meta.url),"utf8");
const shop = fs.readFileSync(new URL("../../src/ui/renderShop.js", import.meta.url),"utf8");
const refinery = fs.readFileSync(new URL("../../src/ui/renderRefinery.js", import.meta.url),"utf8");
const css = fs.readFileSync(new URL("../../src/styles/tutorial.css", import.meta.url),"utf8");
const authCss = fs.readFileSync(new URL("../../src/styles/auth.css", import.meta.url),"utf8");

function zIndexFor(source, selector){
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\{[^}]*z-index:(\\d+)`));
  return match ? Number(match[1]) : 0;
}

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

test("first Orion dialogue keeps the click instruction short", ()=>{
  assert.match(controller,/Clique dessus\./);
  assert.doesNotMatch(controller,/propre vaisseau/);
});

test("starter Orion gift dialogue stays concise", ()=>{
  assert.match(controller,/Le commandement t'a attribu/);
  assert.match(controller,/cet Orion et un/);
  assert.match(controller,/quipement\./);
  assert.doesNotMatch(controller,/Ne prends pas/);
  assert.doesNotMatch(controller,/Sans lui/);
});

test("unequip all dialogue stays simple", ()=>{
  assert.match(controller,/Ce bouton permet de tout d/);
  assert.match(controller,/quiper sur ton vaisseau\./);
  assert.doesNotMatch(controller,/Maintiens CTRL/);
  assert.doesNotMatch(controller,/Même toi/);
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

test("tutorial final gift plays a centered MK-III reward animation", ()=>{
  assert.match(controller,/rewardOverlay = document\.createElement\("div"\)/);
  assert.match(controller,/rewardOverlay\.className = "tutorial-reward-overlay hidden"/);
  assert.match(controller,/function showRewardAnimation\(itemId\)/);
  assert.match(controller,/rewardItemId === "laser_mk3"/);
  assert.match(controller,/CADEAU DU COMMANDEMENT/);
  assert.match(css,/\.tutorial-reward-overlay/);
  assert.match(css,/\.tutorial-reward-card/);
  assert.match(css,/tutorial-reward-item-rise/);
});

test("world tutorial arrows support fixed stations and player-directed targets", ()=>{
  assert.match(controller,/arrowMode:"world-anchor"/);
  assert.match(controller,/arrowMode:"player-direction"/);
  assert.match(controller,/world-direction/);
  assert.match(combat,/player:\{x:player\.x,y:player\.y,screenX:playerScreenX,screenY:playerScreenY,repairBotActive:Boolean\(player\.repairBotActive\)\}/);
  assert.match(combat,/targetMapName = currentPrefix && currentPrefix !== currentMapName \? `\$\{currentPrefix\}-02` : ""/);
  assert.match(css,/\.tutorial-arrow\{[^}]*z-index:20000/);
  assert.match(css,/\.tutorial-arrow\.world-direction/);
});

test("first mission completion teaches repair drone before returning to HQ", ()=>{
  assert.match(controller,/game_repair_drone_intro:\{mode:"game",manual:true,message:"Mission accomplie\. Utilise ton drone de r/);
  assert.match(controller,/game_use_repair_drone:\{mode:"game",silent:true,selector:REPAIR_DRONE_ACTION_SELECTOR/);
  assert.match(controller,/condition:\(s,g\)=>Boolean\(g\?\.player\?\.repairBotActive\)/);
  assert.match(controller,/game_return_hq_1:\{mode:"game",handoff:true,world:\{type:"hq"\}/);
  assert.match(controller,/message:"Maintenant retourne au QG\."/);
  assert.match(actionBar,/data-action-item-id/);
  assert.match(controller,/extra_repair_starter/);
});

test("Velox departure waits for lasers repair drone and rocket launcher", ()=>{
  assert.match(controller,/launcher_equip_three_lasers:\{mode:"launcher",handoff:true,selector:"\.rpg-inventory-grid",condition:\(\)=>veloxTutorialLoadoutReady\(\)/);
  assert.match(controller,/trois lasers, le drone de r/);
  assert.match(controller,/lance-roquette/);
  assert.match(controller,/function veloxTutorialLoadoutReady\(\)/);
  assert.match(controller,/filter\(Boolean\)\.length >= 3/);
  assert.match(controller,/hasRepairDroneEquipped\(loadout\)/);
  assert.match(controller,/hasRocketLauncherEquipped\(loadout\)/);
  assert.match(controller,/item\?\.effect\?\.repairBot/);
});

test("shop selection tutorial steps lock purchases until the highlighted card is selected", ()=>{
  assert.match(controller,/launcher_select_laser:\{[^\n]*lockToSelector:true/);
  assert.match(controller,/launcher_select_velox:\{[^\n]*lockToSelector:true/);
  assert.match(controller,/function handleTutorialLockedClick\(event\)/);
  assert.match(controller,/event\.stopImmediatePropagation\(\)/);
  assert.match(shop,/function tutorialBlocksLaserPurchase\(product\)/);
  assert.match(shop,/launcher_select_laser/);
  assert.match(shop,/tutorialPurchaseBlocked \|\| !canAfford/);
  assert.match(app,/reason === "tutorial:updated" && store\.currentView === "shop"/);
  assert.match(app,/renderShop\(\)/);
});

test("refinery storage tutorial locks improve then launch as separate clicks", ()=>{
  assert.match(controller,/launcher_upgrade_storage:\{[^\n]*selector:'\[data-upgrade-refinery-module="storage"\]'[^\n]*click:true[^\n]*lockToSelector:true/);
  assert.match(controller,/launcher_launch_storage_upgrade:\{[^\n]*silent:true[^\n]*selector:'\[data-confirm-refinery-module-upgrade="storage"\]'[^\n]*lockToSelector:true/);
  assert.match(controller,/findVisibleTarget\(definition\.selector\)/);
  assert.match(refinery,/launcher_launch_storage_upgrade/);
  assert.match(refinery,/store\.selectedRefineryUpgrade = \{type:"module", id:"storage"\}/);
  assert.match(app,/tutorial-flow-21/);
  assert.match(app,/craft-ui-5/);
});

test("mission relay camera preview lasts long enough to understand the target", ()=>{
  assert.match(controller,/previewDuration:6500/);
});

test("quest relay intro keeps the instruction short", ()=>{
  assert.match(controller,/Ici se trouve le relais de quêtes\. Ouvre-le\./);
  assert.doesNotMatch(controller,/ordre simple/);
});

test("second quest relay return copy stays short", ()=>{
  assert.match(controller,/game_open_quests_2:\{[^\n]*message:"Retourne au/);
  assert.doesNotMatch(controller,/La flèche restera fixée/);
});

test("storage quest selection copy stays short", ()=>{
  assert.match(controller,/game_select_storage:\{[^\n]*Un choix rationelle/);
  assert.doesNotMatch(controller,/bonne soute/);
  assert.doesNotMatch(controller,/gros canon/);
});

test("station intro no longer ends with the old two-button taunt", ()=>{
  assert.doesNotMatch(controller,/Retenir deux boutons/);
});

test("disconnect recovery overlay stays above tutorial blockers", ()=>{
  const disconnectZ = zIndexFor(authCss, ".game-disconnect-overlay");
  assert.ok(disconnectZ > zIndexFor(css, ".tutorial-input-lock"));
  assert.ok(disconnectZ > zIndexFor(css, ".tutorial-guide"));
  assert.ok(disconnectZ > zIndexFor(css, ".tutorial-arrow"));
});

test("disconnect recovery suppresses tutorial surfaces until the session resumes", ()=>{
  assert.match(recovery,/document\.body\.classList\.add\("game-disconnect-active"\)/);
  assert.match(recovery,/document\.body\.classList\.remove\("game-disconnect-active"\)/);
  assert.match(css,/body\.game-disconnect-active \.tutorial-guide[\s\S]*\.tutorial-reward-overlay\{display:none!important\}/);
});
