import assert from "node:assert/strict";
import test from "node:test";
import { FIRMS } from "../../src/data/firms.js";
import { FIRM_REPRESENTATIVES } from "../../src/data/firmRepresentatives.js";
import { questCatalog } from "../../src/data/progression.js";
import { TUTORIAL_STEPS,getTutorialQuestIds } from "../../src/shared/tutorial.js";
import { createTutorialStages,getTutorialRecovery,getTutorialStorageStatus } from "../../src/ui/tutorialStages.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { getQuestObjectiveKey } from "../src/quests/questState.js";
import { tickServerRefineryProduction } from "../src/economy/refineryProduction.js";

function fixture(){
  return {
    activeShip:"orion",selectedShip:"orion",ownedShips:["orion"],activeQuestIds:[],completedQuestClaims:{},questProgress:{},
    inventoryItems:[{uid:"laser1",itemId:"laser_mk1"},{uid:"repair1",itemId:"extra_repair_starter"}],
    shipLoadouts:{orion:{lasers:["laser1"],extras:["repair1"]}}
  };
}

function withVisibleSelectors(selectors,fn){
  const original = globalThis.document;
  globalThis.document = {
    querySelectorAll(selector){
      return selectors.has(selector) ? [{closest:()=>null,getClientRects:()=>[{}]}] : [];
    }
  };
  try{ fn(); }
  finally{
    if(original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
}

test("all saved tutorial steps remain addressable with a persistent chapter and objective",()=>{
  for(const firm of FIRMS){
    const stages = createTutorialStages({playerName:"Nova",firmId:firm.id});
    assert.deepEqual(Object.keys(stages),[...TUTORIAL_STEPS]);
    assert.match(stages.launcher_orion.message,new RegExp(FIRM_REPRESENTATIVES[firm.id].name));
    assert.match(stages.game_base_intro.message,new RegExp(firm.homeMapName));
    for(const [id,stage] of Object.entries(stages)){
      assert.ok(stage.title && stage.objective && stage.message,id);
      assert.ok(stage.chapter.index>=1 && stage.chapter.index<=6,id);
      assert.equal(stage.chapter.total,6,id);
      assert.ok(!stage.silent,id);
      if(stage.guideSteps) for(const step of stage.guideSteps) assert.ok(step.selector && step.hint,id);
    }
  }
});

test("each firm selects its own quest variants and only its exact second map completes travel",()=>{
  for(const firm of FIRMS){
    const stages = createTutorialStages({firmId:firm.id});
    const [pass,storage,raider,yellow] = getTutorialQuestIds(firm.id);
    for(const [stage,id] of [["game_select_pass",pass],["game_select_storage",storage],["game_select_raiders",raider],["game_accept_yellow",yellow]]){
      assert.match(stages[stage].selector,new RegExp(id));
      assert.equal(stages[stage].condition({activeQuestIds:[id]}),true);
      assert.equal(stages[stage].condition({activeQuestIds:["unrelated"]}),false);
    }
    const ownSecond = `${firm.mapPrefix}-02`;
    assert.equal(stages.game_reach_map_2.condition({}, {mapName:ownSecond}),true);
    assert.equal(stages.game_reach_map_2.condition({}, {mapName:firm.homeMapName}),false);
    for(const other of FIRMS.filter(entry=>entry.id!==firm.id)){
      assert.equal(stages.game_reach_map_2.condition({}, {mapName:`${other.mapPrefix}-02`}),false);
    }
    assert.equal(stages.game_hunt_pass.world.firmId,firm.id);
    assert.equal(stages.game_hunt_pass.world.mapNumber,1);
    assert.deepEqual(stages.game_hunt_yellow.world({}).mapNumbers,[1,2]);
  }
});

test("quest relay exposes the current tutorial quest for all four firms",()=>{
  for(const firm of FIRMS){
    const expected = getTutorialQuestIds(firm.id)[0];
    const rendered = renderSpawnPanelContent({
      mode:"quests",activeQuests:[],quests:questCatalog,selectedQuestId:null,
      completedQuestClaims:{},getQuestProgress:()=>0,playerLevel:1,firmId:firm.id,
      tutorial:{status:"active",step:"game_select_pass"}
    });
    assert.ok(rendered.html.includes(`data-accept-quest="${expected}"`),firm.id);
    assert.doesNotMatch(rendered.html,/Aucune mission ici/);
    for(const other of FIRMS.filter(entry=>entry.id!==firm.id)){
      assert.ok(!rendered.html.includes(`data-view-quest="${getTutorialQuestIds(other.id)[0]}"`),firm.id);
    }
  }
});

test("returning through a nearby portal cannot complete arrival at the firm headquarters",()=>{
  const stages = createTutorialStages({firmId:"cyan"});
  for(const id of ["game_return_hq_1","game_return_hq_2"]){
    assert.equal(stages[id].condition({}, {atDestinationMap:false,target:{distance:10}}),false);
    assert.equal(stages[id].condition({}, {atDestinationMap:true,target:{distance:521}}),false);
    assert.equal(stages[id].condition({}, {atDestinationMap:true,target:{distance:0}}),true);
  }
});

test("navigation waits for the rendered result and can recover from the wrong ship or menu",()=>{
  const stages = createTutorialStages();
  const state = fixture();
  assert.equal(stages.launcher_open_shop.condition(state),false);
  assert.equal(stages.launcher_select_velox.condition(state),false);
  assert.equal(stages.launcher_upgrade_storage.condition(state),false);
  withVisibleSelectors(new Set(['.page-view.active[data-page="shop"]','[data-select-shop="ship:velox"].selected']),()=>{
    assert.equal(stages.launcher_open_shop.condition(state),true);
    assert.equal(stages.launcher_select_velox.condition(state),true);
    assert.equal(stages.launcher_select_laser.condition(state),false);
  });
  withVisibleSelectors(new Set(['.page-view.active[data-page="hangar"]',"#shipDetailPanel"]),()=>{
    const equipTarget = stages.launcher_equip_velox.guideSteps[0];
    assert.equal(equipTarget.when(state),false);
    state.selectedShip="velox";
    assert.equal(equipTarget.when(state),true);
  });
  assert.ok(stages.launcher_buy_laser.guideSteps.some(entry=>entry.selector==='[data-filter-shop="canon"]'));
  assert.equal(stages.launcher_buy_laser.guideSteps.at(-1).selector,'[data-view="shop"]');
  assert.equal(stages.launcher_equip_velox.guideSteps.at(-1).selector,'[data-view="hangar"]');
});

test("hangar training opens the chosen ship inventory after preview selection and preserves the saved step",()=>{
  const stages=createTutorialStages();
  const state=fixture();
  state.ownedShips.push("velox");
  state.tutorial={status:"active",step:"launcher_orion",revision:8};
  state.selectedShip="velox";
  const selectors=new Set([
    '.page-view.active[data-page="hangar"]',
    '[data-hangar-select-ship="orion"]',
    '[data-hangar-select-ship="velox"]',
    '[data-ship-id="orion"]',
    '[data-ship-id="velox"]',
    '.ship-open-button[data-ship-id="velox"]'
  ]);
  const guideTarget=stage=>stage.guideSteps.find(entry=>(!entry.when || entry.when(state)) && selectors.has(entry.selector))?.selector;
  const saved=structuredClone(state.tutorial);
  withVisibleSelectors(selectors,()=>{
    assert.equal(guideTarget(stages.launcher_orion),'[data-hangar-select-ship="orion"]');
    assert.equal(stages.launcher_orion.condition(state),false);
    state.selectedShip="orion";
    selectors.delete('.ship-open-button[data-ship-id="velox"]');
    selectors.add('.ship-open-button[data-ship-id="orion"]');
    assert.equal(guideTarget(stages.launcher_orion),'.ship-open-button[data-ship-id="orion"]');
    assert.equal(stages.launcher_orion.condition(state),false,"a selected preview is not an opened inventory");
    selectors.add("#shipDetailPanel");
    assert.equal(stages.launcher_orion.condition(state),true);
    selectors.delete("#shipDetailPanel");
    assert.equal(stages.launcher_open_velox.condition(state),false);
    assert.equal(guideTarget(stages.launcher_open_velox),'[data-hangar-select-ship="velox"]');
    state.selectedShip="velox";
    selectors.delete('.ship-open-button[data-ship-id="orion"]');
    selectors.add('.ship-open-button[data-ship-id="velox"]');
    assert.equal(guideTarget(stages.launcher_open_velox),'.ship-open-button[data-ship-id="velox"]');
    assert.equal(stages.launcher_open_velox.condition(state),false);
    selectors.add("#shipDetailPanel");
    assert.equal(stages.launcher_open_velox.condition(state),true);
    assert.deepEqual(state.tutorial,saved,"navigation must not mutate the persisted tutorial or revision");
  });
});

test("equipment recovery leaves the wrong inventory before selecting and opening the required ship",()=>{
  const stages=createTutorialStages();
  const state=fixture();
  state.selectedShip="orion";
  const selectors=new Set(['.page-view.active[data-page="hangar"]',"#shipDetailPanel","#backToShipsBtn",".rpg-inventory-grid","#selectedShipAction"]);
  const guide=stages.launcher_equip_velox.guideSteps;
  const target=()=>guide.find(entry=>(!entry.when || entry.when(state)) && selectors.has(entry.selector))?.selector;
  withVisibleSelectors(selectors,()=>{
    assert.equal(target(),"#backToShipsBtn","do not activate or equip the wrong visible ship");
    selectors.delete("#shipDetailPanel");
    selectors.delete("#backToShipsBtn");
    selectors.add('[data-hangar-select-ship="velox"]');
    assert.equal(target(),'[data-hangar-select-ship="velox"]');
    state.selectedShip="velox";
    selectors.add('.ship-open-button[data-ship-id="velox"]');
    assert.equal(target(),'.ship-open-button[data-ship-id="velox"]');
    selectors.add("#shipDetailPanel");
    assert.equal(target(),"#selectedShipAction");
  });
});

test("owned purchases and actual equipment are recognized without changing the profile",()=>{
  const stages = createTutorialStages();
  const state = fixture();
  state.ownedShips.push("velox");
  state.inventoryItems.push({uid:"laser2",itemId:"laser_mk1"},{uid:"laser3",itemId:"laser_mk3"},{uid:"rocket1",itemId:"launcher_rocket_mk1"});
  assert.equal(stages.launcher_buy_velox.condition(state),true);
  assert.equal(stages.launcher_buy_laser.condition(state),true);
  assert.equal(stages.launcher_equip_three_lasers.condition(state),false);
  state.shipLoadouts.velox={lasers:["laser1","laser2","laser3"],extras:["repair1"],rocketLauncher:"rocket1"};
  assert.equal(stages.launcher_equip_three_lasers.condition(state),false,"equipped ship must actually be active");
  state.activeShip="velox";
  const before=JSON.stringify(state);
  assert.equal(stages.launcher_equip_three_lasers.condition(state),true);
  assert.equal(stages.launcher_equip_three_lasers.progress(state),"3/3 lasers · Drone ✓ · Lance-roquette ✓");
  assert.equal(JSON.stringify(state),before);
  state.shipLoadouts.velox.lasers=["laser1","laser1","laser1"];
  assert.equal(stages.launcher_equip_three_lasers.condition(state),false,"one item cannot fill three slots");
});

test("repair accepts an undamaged ship only with a repair drone equipped",()=>{
  const stage = createTutorialStages().game_use_repair_drone;
  const state = fixture();
  assert.equal(stage.condition(state,{player:{hp:100,maxHp:100}}),true);
  assert.equal(stage.condition(state,{player:{hp:50,maxHp:100}}),false);
  assert.equal(stage.condition(state,{player:{hp:50,maxHp:100,repairBotActive:true}}),true);
  assert.equal(stage.condition(state,{player:{hp:0,maxHp:0}}),false);
  state.shipLoadouts.orion.extras=[];
  assert.equal(stage.condition(state,{player:{hp:100,maxHp:100}}),false);
  assert.equal(stage.condition(state,{player:{repairBotActive:true}}),false);
  assert.ok(stage.selector.includes('extra_repair_yellow'));
  assert.ok(!stage.selector.includes('extra_repair_auto'));
});

test("combat objectives track only remaining useful kinds and their firm quest progress",()=>{
  const stages = createTutorialStages({firmId:"verte"});
  const [pass,,raider,yellow] = getTutorialQuestIds("verte");
  const state = fixture();
  state.questProgress[pass]=2;
  state.questProgress[raider]={"kill:raider_astral:0":1};
  state.questProgress[yellow]={orbes:5,vorak:2};
  assert.equal(stages.game_hunt_pass.progress(state),"2/3 Orbes sentinelles");
  assert.equal(stages.game_hunt_raiders.progress(state),"1/3 Vorak rushers");
  assert.equal(stages.game_hunt_yellow.progress(state),"5/5 Orbes · 2/5 Vorak");
  assert.deepEqual(stages.game_hunt_yellow.world(state).kinds,["raider_astral"]);
  state.completedQuestClaims[yellow]=true;
  assert.deepEqual(stages.game_hunt_yellow.world(state).kinds,[]);
});

test("single-objective counters consume the real server quest progress keys for all firms",()=>{
  for(const firm of FIRMS){
    const stages=createTutorialStages({firmId:firm.id});
    const [pass,,raider]=getTutorialQuestIds(firm.id);
    for(const [questId,step] of [[pass,"game_hunt_pass"],[raider,"game_hunt_raiders"]]){
      const quest=questCatalog.find(entry=>entry.id===questId);
      const key=getQuestObjectiveKey(quest.objective,0);
      const state=fixture();
      state.questProgress[questId]={[key]:2};
      assert.ok(stages[step].progress(state).startsWith("2/3"),`${firm.id} ${key}`);
    }
  }
});

test("storage guidance recovers stopped extraction before asking for an unavailable upgrade",()=>{
  const stage=createTutorialStages().launcher_launch_storage_upgrade;
  const state=fixture();
  state.cargoHold={titane_fissure:0,silice_conductrice:0};
  state.refineryProductionDisabled={titane_fissure:true,silice_conductrice:true};
  state.refineryLastTick=1000;
  const popup="[data-close-refinery-upgrade]";
  const titane='[data-toggle-refinery-production="titane_fissure"]';
  const silice='[data-toggle-refinery-production="silice_conductrice"]';
  const confirm='[data-confirm-refinery-module-upgrade="storage"]';
  const available=new Set([popup,titane,silice,".sky-stock-row",confirm]);
  const next=()=>stage.guideSteps.find(entry=>(!entry.when || entry.when(state)) && available.has(entry.selector));
  assert.equal(next().selector,popup);
  available.delete(popup);
  assert.equal(next().selector,titane);
  assert.match(stage.progress(state),/Réactive l'extraction/);
  state.refineryProductionDisabled.titane_fissure=false;
  assert.equal(next().selector,silice);
  state.refineryProductionDisabled.silice_conductrice=false;
  assert.equal(next().selector,".sky-stock-row");
  assert.match(stage.progress(state),/Extraction active/);
  tickServerRefineryProduction(state,121000);
  assert.deepEqual(state.cargoHold.titane_fissure,50);
  assert.deepEqual(state.cargoHold.silice_conductrice,50);
  assert.equal(getTutorialStorageStatus(state).ready,true);
  assert.equal(next().selector,confirm);
  assert.match(stage.progress(state),/Ressources prêtes/);
  assert.ok(!stage.progress(state).includes("min"),"the guide must not promise an unverified completion time");
});

test("temporary recovery restores unequipped equipment without moving or mutating the saved step",()=>{
  for(const step of ["launcher_depart","game_hunt_pass","game_use_repair_drone","game_hunt_raiders","game_hunt_yellow"]){
    const state=fixture();
    state.tutorial={step,status:"active",revision:42};
    assert.equal(getTutorialRecovery(state,step),null,step);
    state.shipLoadouts.orion.extras=[];
    const before=JSON.stringify(state);
    const recovery=getTutorialRecovery(state,step);
    assert.equal(recovery.mode,"launcher");
    assert.ok(recovery.guideSteps.some(entry=>entry.selector===".rpg-inventory-grid"));
    assert.ok(recovery.objective.includes("drone de réparation"));
    assert.ok(!recovery.manual && !recovery.condition && !recovery.gift);
    assert.equal(JSON.stringify(state),before);
    state.shipLoadouts.orion.extras=["repair1"];
    assert.equal(getTutorialRecovery(state,step),null,step);
  }
  const state=fixture();
  state.shipLoadouts.orion.lasers=[];
  assert.equal(getTutorialRecovery(state,"launcher_orion"),null,"unrelated tutorial goals retain their own guidance");
  assert.equal(getTutorialRecovery(state,"game_use_repair_drone"),null,"repairing does not require a laser");
  assert.ok(getTutorialRecovery(state,"game_hunt_pass"));
  state.completedQuestClaims[getTutorialQuestIds()[0]]=true;
  assert.equal(getTutorialRecovery(state,"game_hunt_pass"),null,"a completed fight should advance without unnecessary re-equipping");
});

test("legacy sold equipment routes to a real purchase then equips it without granting anything",()=>{
  const state=fixture();
  state.player={credits:0};
  state.inventoryItems=state.inventoryItems.filter(item=>item.itemId!=="extra_repair_starter");
  state.shipLoadouts.orion.extras=[];
  state.tutorial={step:"game_hunt_pass",status:"active",revision:6};
  const before=JSON.stringify(state);
  let recovery=getTutorialRecovery(state,state.tutorial.step);
  assert.ok(recovery.guideSteps.some(entry=>entry.selector==='[data-buy-item="extra_repair_starter"]'));
  assert.ok(recovery.guideSteps.some(entry=>entry.selector==='[data-filter-shop="extra"]'));
  assert.match(recovery.message,/crédits/);
  assert.equal(JSON.stringify(state),before,"recovery never recreates sold items or credits");
  state.inventoryItems.push({uid:"newrepair",itemId:"extra_repair_starter"});
  recovery=getTutorialRecovery(state,state.tutorial.step);
  assert.ok(recovery.guideSteps.some(entry=>entry.selector===".rpg-inventory-grid"));
  assert.ok(!recovery.guideSteps.some(entry=>entry.selector==='[data-buy-item="extra_repair_starter"]'));
  state.shipLoadouts.orion.extras=["newrepair"];
  assert.equal(getTutorialRecovery(state,state.tutorial.step),null);
  assert.deepEqual(state.tutorial,{step:"game_hunt_pass",status:"active",revision:6});
});

test("Velox departure restores the full training kit while later hunts accept the minimal combat kit",()=>{
  const state=fixture();
  state.ownedShips.push("velox");
  state.inventoryItems.push({uid:"laser2",itemId:"laser_mk1"},{uid:"laser3",itemId:"laser_mk3"},{uid:"rocket1",itemId:"launcher_rocket_mk1"});
  state.shipLoadouts.velox={lasers:["laser1","laser2","laser3"],extras:["repair1"],rocketLauncher:"rocket1"};
  let recovery=getTutorialRecovery(state,"launcher_depart_velox");
  assert.ok(recovery.guideSteps.some(entry=>entry.selector==="#selectedShipAction"));
  state.activeShip="velox";
  assert.equal(getTutorialRecovery(state,"launcher_depart_velox"),null);
  state.shipLoadouts.velox.lasers=["laser1"];
  state.shipLoadouts.velox.rocketLauncher=null;
  assert.ok(getTutorialRecovery(state,"launcher_depart_velox"));
  assert.equal(getTutorialRecovery(state,"game_hunt_raiders"),null);
  assert.equal(getTutorialRecovery(state,"game_hunt_yellow"),null);
  assert.equal(getTutorialRecovery(state,"launcher_equip_three_lasers"),null,"normal first equipment setup keeps its authored objective");
  state.inventoryItems=state.inventoryItems.filter(entry=>entry.uid!=="rocket1");
  recovery=getTutorialRecovery(state,"launcher_equip_three_lasers");
  assert.ok(recovery.guideSteps.some(entry=>entry.selector==='[data-buy-item="launcher_rocket_mk1"]'));
  assert.equal(recovery.chapter.index,3);
});

test("firm representative introductions retain the casing of proper names",()=>{
  const stages=createTutorialStages({firmId:"cyan"});
  assert.ok(stages.launcher_orion.message.includes(FIRM_REPRESENTATIVES.cyan.title));
  assert.ok(!stages.launcher_orion.message.includes("de cygnus"));
});

test("combat ammunition training runs before the Vorak hunt and opens a real shop view",()=>{
  const stages=createTutorialStages();
  const training=["game_open_quick_shop","game_buy_rockets","game_bind_laser","game_bind_rockets"];
  const ids=Object.keys(stages),start=ids.indexOf("game_accept_raiders")+1;
  assert.deepEqual(ids.slice(start,start+training.length),training);
  assert.equal(ids[start+training.length],"game_hunt_raiders");
  const shop=stages.game_open_quick_shop;
  assert.equal(shop.condition(),false);
  withVisibleSelectors(new Set(["#combatQuickPanel",'#combatQuickPanel [data-combat-panel-tab="shop"].active']),()=>{
    assert.equal(shop.condition(),false,"opening a menu without rendered shop contents is not success");
  });
  withVisibleSelectors(new Set(["#combatQuickPanel",'#combatQuickPanel [data-combat-panel-tab="shop"].active',"#combatPanelContent .combat-shop-grid"]),()=>{
    assert.equal(shop.condition(),true);
  });
  assert.ok(shop.guideSteps.some(entry=>entry.selector==="#combatQuickMenuBtn"));
  for(const id of training){
    assert.equal(stages[id].mode,"game");
    assert.equal(stages[id].chapter.index,5);
    assert.ok(!stages[id].click && !stages[id].manual,"a click alone cannot validate a purchase or ammunition assignment");
  }
});

test("the rocket purchase stage requires the canonical training purchase rather than existing stock",()=>{
  const stage=createTutorialStages().game_buy_rockets;
  const state=fixture();
  state.ammoInventory={rocket_r1:10000};
  assert.equal(stage.condition(state),false);
  state.tutorial={rocketTrainingPurchased:99};
  assert.equal(stage.condition(state),false);
  state.tutorial.rocketTrainingPurchased=100;
  state.ammoInventory.rocket_r1=0;
  assert.equal(stage.condition(state),true,"using rockets after the confirmed purchase must not erase the lesson");
  assert.equal(stage.progress(state),"100/100 R-1 achetées");
  assert.equal(stage.selector,'[data-combat-buy-ammo="rocket_r1"][data-combat-buy-multiplier="100"]');
  assert.match(stage.message,/Prix de base/);
  assert.match(stage.message,/10\s000/);
});

test("ammunition lessons wait for Munitions and the correct Velox slots, distinguishing rockets from equipment and missiles",()=>{
  const stages=createTutorialStages();
  const state=fixture();
  state.activeShip="velox";
  state.actionSlots=["ammo_x1","rocket_r1"];
  state.ammoInventory={ammo_x1:2500,rocket_r1:100};
  assert.equal(stages.game_bind_laser.condition(state),false,"the player must discover Munitions even if a slot is already configured");
  const ammoView=new Set(["#combatQuickPanel",'#combatQuickPanel [data-combat-panel-tab="ammo"].active',"#combatPanelContent .combat-ammo-grid"]);
  withVisibleSelectors(ammoView,()=>{
    assert.equal(stages.game_bind_laser.condition(state),true);
    assert.equal(stages.game_bind_rockets.condition(state),true);
    state.actionSlotsByShip={velox:[null,"missile_m1"]};
    assert.equal(stages.game_bind_laser.condition(state),false,"the ship-specific bar is authoritative over the fallback bar");
    assert.equal(stages.game_bind_rockets.condition(state),false,"Missile R-1 is not Roquette R-1");
    state.actionSlotsByShip.velox=["ammo_x1","launcher_rocket_mk1"];
    assert.equal(stages.game_bind_laser.condition(state),true);
    assert.equal(stages.game_bind_rockets.condition(state),false,"the launcher equipment is not a rocket ammunition shortcut");
    state.actionSlotsByShip.velox[1]="rocket_r1";
    assert.equal(stages.game_bind_rockets.condition(state),true);
    state.activeShip="orion";
    assert.equal(stages.game_bind_laser.condition(state),false);
    assert.equal(stages.game_bind_rockets.condition(state),false);
  });
  assert.equal(stages.game_bind_laser.dragSourceSelector,'#combatQuickPanel [data-combat-ammo-id="ammo_x1"]');
  assert.equal(stages.game_bind_laser.dropTargetSelector,'#gameActionBar [data-action-index="0"]');
  assert.equal(stages.game_bind_rockets.dragSourceSelector,'#combatQuickPanel [data-combat-ammo-id="rocket_r1"]');
  assert.equal(stages.game_bind_rockets.dropTargetSelector,'#gameActionBar [data-action-index="1"]');
  assert.match(stages.game_hunt_raiders.message,/Facultatif/);
  assert.match(stages.game_hunt_raiders.message,/slot 9/);
});

test("the yellow mission remembers visiting its second map and hunts in both permitted home sectors",()=>{
  for(const firm of FIRMS){
    const stages=createTutorialStages({firmId:firm.id});
    const yellow=getTutorialQuestIds(firm.id)[3];
    const quest=questCatalog.find(entry=>entry.id===yellow);
    const visitIndex=quest.objectives.findIndex(objective=>objective.type==="visit_map");
    const visitKey=getQuestObjectiveKey(quest.objectives[visitIndex],visitIndex);
    const state=fixture();
    state.player={firmId:firm.id};
    state.questProgress[yellow]={orbes:3,vorak:1};
    const atHome={mapName:firm.homeMapName};
    assert.equal(stages.game_reach_map_2.condition(state,atHome),false);
    assert.equal(stages.game_reach_map_2.world(state).type,"map2");
    state.questProgress[yellow][visitKey]=1;
    assert.equal(stages.game_reach_map_2.condition(state,atHome),true,"returning home must not erase the server-recorded visit");
    assert.equal(stages.game_reach_map_2.world(state).type,"enemy","the transition must stop pointing toward the portal immediately");
    const target=stages.game_hunt_yellow.world(state);
    assert.deepEqual(target.mapNumbers,[1,2]);
    assert.equal(target.mapNumber,undefined);
    assert.equal(target.firmId,firm.id);
    assert.deepEqual(target.kinds,["drone_pirate","raider_astral"]);
    state.questProgress[yellow].orbes=5;
    assert.deepEqual(stages.game_hunt_yellow.world(state).kinds,["raider_astral"]);
    state.questProgress[yellow].vorak=5;
    assert.deepEqual(stages.game_hunt_yellow.world(state).kinds,[]);
  }
});

function rocketTrainingFixture(){
  const state=fixture();
  state.activeShip="velox";state.selectedShip="velox";state.ownedShips.push("velox");
  state.inventoryItems.push({uid:"rocket1",itemId:"launcher_rocket_mk1"});
  state.shipLoadouts.velox={lasers:["laser1"],extras:["repair1"],rocketLauncher:"rocket1"};
  state.actionSlotsByShip={velox:["ammo_x1","rocket_r1"]};
  state.ammoInventory={ammo_x1:2500,rocket_r1:100};
  state.tutorial={status:"active",step:"game_bind_rockets",revision:14,rocketTrainingPurchased:100};
  return state;
}

test("all four ammunition lessons recover the active Velox and a useful minimum kit without demanding three lasers",()=>{
  for(const step of ["game_open_quick_shop","game_buy_rockets","game_bind_laser","game_bind_rockets"]){
    const state=rocketTrainingFixture();
    assert.equal(getTutorialRecovery(state,step),null,`${step}: one equipped laser suffices`);
    state.activeShip="orion";
    let recovery=getTutorialRecovery(state,step);
    assert.equal(recovery.mode,"launcher");
    assert.ok(recovery.guideSteps.some(entry=>entry.selector==="#selectedShipAction"));
    state.activeShip="velox";
    state.shipLoadouts.velox.lasers=[];
    recovery=getTutorialRecovery(state,step);
    assert.ok(recovery.objective.includes("1 laser"));
    assert.ok(!recovery.objective.includes("3 lasers"));
    state.shipLoadouts.velox.lasers=["laser1"];
    state.shipLoadouts.velox.rocketLauncher=null;
    recovery=getTutorialRecovery(state,step);
    assert.ok(recovery.objective.includes("lance-roquette"));
    state.shipLoadouts.velox.rocketLauncher="rocket1";
    state.shipLoadouts.velox.extras=[];
    recovery=getTutorialRecovery(state,step);
    assert.ok(recovery.objective.includes("drone de réparation"));
    assert.equal(recovery.chapter.index,5);
  }
});

test("empty ammunition stocks guide normal combat-shop purchases without resetting training or granting ammo",()=>{
  for(const step of ["game_open_quick_shop","game_buy_rockets","game_bind_laser","game_bind_rockets"]){
    const state=rocketTrainingFixture();
    state.tutorial.step=step;
    state.ammoInventory.ammo_x1=0;
    let before=JSON.stringify(state);
    let recovery=getTutorialRecovery(state,step);
    assert.equal(recovery.mode,"game");
    assert.ok(recovery.guideSteps.some(entry=>entry.selector==='[data-combat-buy-ammo="ammo_x1"][data-combat-buy-multiplier="1"]'));
    assert.equal(JSON.stringify(state),before);
    state.ammoInventory.ammo_x1=1000;
    assert.equal(getTutorialRecovery(state,step),null);
    state.ammoInventory.rocket_r1=0;
    before=JSON.stringify(state);
    recovery=getTutorialRecovery(state,step);
    assert.equal(recovery.mode,"game");
    assert.ok(recovery.guideSteps.some(entry=>entry.selector==='[data-combat-buy-ammo="rocket_r1"][data-combat-buy-multiplier="100"]'));
    assert.equal(JSON.stringify(state),before);
    state.ammoInventory.rocket_r1=1;
    assert.equal(getTutorialRecovery(state,step),null,"one remaining rocket permits binding; the lesson does not require 100 remaining");
    assert.equal(state.tutorial.rocketTrainingPurchased,100);
  }
  const firstPurchase=rocketTrainingFixture();
  firstPurchase.tutorial.rocketTrainingPurchased=0;
  firstPurchase.ammoInventory.rocket_r1=0;
  assert.equal(getTutorialRecovery(firstPurchase,"game_open_quick_shop"),null,"initial R-1 purchase remains the authored lesson");
});

test("moving the laser shortcut after its lesson is recoverable before binding rockets",()=>{
  const state=rocketTrainingFixture();
  state.actionSlotsByShip.velox[0]=null;
  const recovery=getTutorialRecovery(state,"game_bind_rockets");
  assert.equal(recovery.mode,"game");
  assert.equal(recovery.dragSourceSelector,'#combatQuickPanel [data-combat-ammo-id="ammo_x1"]');
  assert.equal(recovery.dropTargetSelector,'#gameActionBar [data-action-index="0"]');
  state.actionSlotsByShip.velox[0]="ammo_x1";
  assert.equal(getTutorialRecovery(state,"game_bind_rockets"),null);
  const stages=createTutorialStages();
  withVisibleSelectors(new Set(["#combatQuickPanel",'#combatQuickPanel [data-combat-panel-tab="ammo"].active',"#combatPanelContent .combat-ammo-grid"]),()=>{
    state.ammoInventory.ammo_x1=0;
    assert.equal(stages.game_bind_laser.condition(state),false);
    assert.equal(stages.game_bind_rockets.condition(state),false);
    state.ammoInventory.ammo_x1=1;
    state.ammoInventory.rocket_r1=0;
    assert.equal(stages.game_bind_rockets.condition(state),false);
    state.ammoInventory.rocket_r1=1;
    assert.equal(stages.game_bind_rockets.condition(state),true);
  });
});
