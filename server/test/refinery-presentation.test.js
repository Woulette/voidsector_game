import test from 'node:test';
import assert from 'node:assert/strict';
import {refineryMaterialCatalog, refineryRecipes} from '../../src/data/catalog.js';
import {
 refineryAncestors, refineryTreeHtml, refineryTheoreticalFlows,
 refineryProductionStatus, refineryMaterialName
} from '../../src/ui/refineryPresentation.js';
import {renderRefineryPanel} from '../../src/game/ui/spawnRefineryPanel.js';
import {normalizeState,store,getRefineryShipmentData,getShipCargo,getShipCargoCapacity} from '../../src/core/store.js?v=20260726-kharon1';
import {createRefineryActions} from '../../src/app/refineryActions.js';
import {COMBAT_BOOST_DEFS} from '../../src/data/combatBoosts.js';
import {createDefaultProfile} from '../src/players/profileDefaults.js';
import {startServerRefineryShipment,refineServerShipCargoRecipe} from '../src/economy/refineryShipments.js';

const expectedEdges=[
 ['cuivre_orbital','alliage_cuivre_zinc',10],['zinc_spatial','alliage_cuivre_zinc',5],
 ['titane_fissure','plaque_nickel_titane',5],['silice_conductrice','plaque_nickel_titane',10],
 ['zinc_spatial','catalyseur_quantique',5],['nickel_brut','catalyseur_quantique',10],['titane_fissure','catalyseur_quantique',5],
 ['alliage_cuivre_zinc','conducteur_renforce',10],['catalyseur_quantique','conducteur_renforce',5],
 ['plaque_nickel_titane','blindage_composite',10],['catalyseur_quantique','blindage_composite',5],
 ['catalyseur_quantique','noyau_astra',10],['conducteur_renforce','noyau_astra',10],['blindage_composite','noyau_astra',10]
];

test('refinery tree shows the 11 real materials and all 14 ingredient quantities',()=>{
 const html=refineryTreeHtml(refineryMaterialCatalog,refineryRecipes,'noyau_astra',()=>({stock:17,level:2,rate:150,status:{key:'active',text:'En production'},job:null}));
 const ids=[...html.matchAll(/data-refinery-node="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,11);
 assert.deepEqual(new Set(ids),new Set(refineryMaterialCatalog.map(m=>m.id)));
 assert.equal([...html.matchAll(/data-refinery-link=/g)].length,14);
 for(const [from,to,quantity] of expectedEdges){
  const group=html.match(new RegExp(`data-refinery-link="${from}:${to}"[^]*?(?=<g class="rf-tree-link|</svg>)`))?.[0];
  assert.ok(group,`${from} -> ${to}`);
  assert.match(group,new RegExp(`>×${quantity}<`));
 }
});

test('selecting an alloy highlights only its actual ingredients; the final core reveals the whole chain',()=>{
 const alloy=refineryAncestors('alliage_cuivre_zinc',refineryRecipes);
 assert.deepEqual([...alloy.nodes].sort(),['alliage_cuivre_zinc','cuivre_orbital','zinc_spatial']);
 assert.equal(alloy.edges.size,2);
 const core=refineryAncestors('noyau_astra',refineryRecipes);
 assert.equal(core.nodes.size,11);
 assert.equal(core.edges.size,14);
});

test('production statistics expose real level-20 consumption including the catalyst deficit',()=>{
 const rates={raw:140000,refined:14000,special:14000,advanced:1400,final:140};
 const materialById=new Map(refineryMaterialCatalog.map(m=>[m.id,m]));
 const flows=refineryTheoreticalFlows(refineryMaterialCatalog,refineryRecipes,id=>rates[materialById.get(id).kind]);
 for(const id of ['cuivre_orbital','zinc_spatial','nickel_brut','titane_fissure','silice_conductrice'])assert.equal(flows.get(id).consumed,140000,id);
 assert.equal(flows.get('alliage_cuivre_zinc').consumed,14000);
 assert.equal(flows.get('plaque_nickel_titane').consumed,14000);
 assert.equal(flows.get('catalyseur_quantique').consumed,15400);
 assert.equal(flows.get('catalyseur_quantique').produced-flows.get('catalyseur_quantique').consumed,-1400);
 assert.equal(flows.get('conducteur_renforce').consumed,1400);
 assert.equal(flows.get('blindage_composite').consumed,1400);
 assert.equal(flows.get('noyau_astra').consumed,0);
});

test('statistics honour paused output rates and multiple-output recipes',()=>{
 const materials=[{id:'ore'},{id:'bar'}];
 const recipes=[{outputId:'bar',outputAmount:2,costs:{ore:5}}];
 let flows=refineryTheoreticalFlows(materials,recipes,id=>id==='ore'?100:20);
 assert.equal(flows.get('ore').consumed,50);
 flows=refineryTheoreticalFlows(materials,recipes,id=>id==='ore'?100:0);
 assert.equal(flows.get('ore').consumed,0);
});

test('production states distinguish locked, paused, full and missing ingredients',()=>{
 const params={level:1,enabled:true,stock:0,cap:100,recipe:{costs:{ore:10}},getStock:()=>9};
 assert.equal(refineryProductionStatus(params).key,'waiting');
 assert.equal(refineryProductionStatus({...params,level:0}).key,'locked');
 assert.equal(refineryProductionStatus({...params,enabled:false}).key,'paused');
 assert.equal(refineryProductionStatus({...params,stock:100}).key,'full');
 assert.equal(refineryProductionStatus({...params,getStock:()=>10}).key,'active');
});

test('ship refining renders its actual recipe and quantities without mutating cargo or UI choices',()=>{
 const cargo=Object.fromEntries(refineryMaterialCatalog.map(m=>[m.id,100]));
 const ui={recipeId:'refine_conducteur',fusionAmount:3};
 const before=JSON.stringify({cargo,ui,recipes:refineryRecipes});
 const {html}=renderRefineryPanel({materials:refineryMaterialCatalog,recipes:refineryRecipes,shipCargo:cargo,shipCargoUsed:1100,shipCargoCapacity:1500,
 selectedShipRefineRecipeId:'refine_conducteur',refineryUiState:ui,getShipRefineryRecipeData:()=>({maxAmount:10})});
 assert.match(html,/data-confirm-ship-refine="refine_conducteur"/);
 assert.match(html,/data-refinery-input-per-unit="15"/);
 assert.match(html,/data-refinery-output-per-unit="1"/);
 assert.match(html,/data-refinery-needed>30</);
 assert.match(html,/data-refinery-needed>15</);
 assert.match(html,/data-refinery-cargo-after>1[\s\u00a0\u202f]?058</);
 assert.equal([...html.matchAll(/data-open-ship-refine=/g)].length,6);
 assert.equal(JSON.stringify({cargo,ui,recipes:refineryRecipes}),before);
});

test('perfection offers exactly the compatible materials and keeps authoritative deposit metadata',()=>{
 const cargo=Object.fromEntries(refineryMaterialCatalog.map(m=>[m.id,7]));
 for(const target of ['laser','rocket','generator','drone']){
  const ui={boostTarget:target,boostAmount:2};const before=JSON.stringify({cargo,ui});
  const {html}=renderRefineryPanel({materials:refineryMaterialCatalog,shipCargo:cargo,refineryTab:'perfectionnement',refineryUiState:ui,getCombatBoostSummary:()=>({remaining:0})});
  const ids=[...html.matchAll(/data-boost-material="([^"]+)"/g)].map(m=>m[1]);
  const expected=Object.entries(COMBAT_BOOST_DEFS).filter(([,m])=>m.targets[target]).map(([id])=>id);
  assert.deepEqual(ids.sort(),expected.sort());
  assert.equal([...html.matchAll(/data-boost-drop-target=/g)].length,4);
  assert.equal([...html.matchAll(/data-boost-material-amount="7"/g)].length,3);
  assert.match(html,/data-open-boost-deposit/);
  assert.equal(JSON.stringify({cargo,ui}),before);
 }
 assert.equal(refineryMaterialName({id:'catalyseur_quantique',name:'Autre'}),'Catalyseur');
});

function shipmentProfile(){
 const profile=createDefaultProfile();profile.player.credits=1_000_000;profile.refineryModules={transport:1,storage:1};
 profile.cargoHold.cuivre_orbital=1000;profile.shipCargo={orion:{}};return profile;
}

test('shipment previews and server execution agree on stock, cargo, transport limits and Premium speed',()=>{
 const previous=store.state;
 try{
  for(const scenario of [
   {stock:1000,loaded:0,premium:false,amount:30,wanted:30,duration:60000},
   {stock:1000,loaded:0,premium:true,amount:30,wanted:30,duration:30000},
   {stock:17,loaded:0,premium:false,amount:999,wanted:17,duration:34000},
   {stock:1000,loaded:0,premium:false,amount:999,wanted:250,duration:500000},
   {stock:1000,loaded:247,premium:false,amount:999,wanted:3,duration:6000}
  ]){
   const profile=shipmentProfile();profile.cargoHold.cuivre_orbital=scenario.stock;profile.shipCargo.orion.zinc_spatial=scenario.loaded;
   profile.player.premiumUntil=scenario.premium?Date.now()+60000:0;profile.player.premiumActive=false;
   store.state=normalizeState(profile);store.state.player.credits=profile.player.credits;getShipCargo('orion');getShipCargoCapacity('orion');
   const preview=getRefineryShipmentData('cuivre_orbital',scenario.amount,'orion');
   const result=startServerRefineryShipment(profile,{materialId:'cuivre_orbital',amount:scenario.amount,shipId:'orion',now:1000});
   assert.equal(result.ok,true);assert.equal(preview.ok,true);
   assert.equal(result.amount,scenario.wanted);assert.equal(preview.amount,scenario.wanted);
   assert.equal(result.duration,scenario.duration);assert.equal(preview.duration,scenario.duration);
   assert.equal(preview.credits,result.credits);assert.equal(profile.cargoHold.cuivre_orbital,scenario.stock-scenario.wanted);
  }
 }finally{store.state=previous;}
});

test('insufficient shipment funds, nonshippable materials and an active shipment remain rejected',()=>{
 for(const materialId of ['nickel_brut','catalyseur_quantique','cables_cuivre']){
  const p=shipmentProfile();p.cargoHold[materialId]=50;const before=JSON.stringify(p);
  assert.equal(startServerRefineryShipment(p,{materialId,amount:1}).ok,false);
  assert.equal(JSON.stringify(p),before);
 }
 const poor=shipmentProfile();poor.player.credits=0;
 assert.equal(startServerRefineryShipment(poor,{materialId:'cuivre_orbital',amount:30}).ok,false);
 const busy=shipmentProfile();busy.refineryShipmentJob={materialId:'cuivre_orbital',shipId:'orion',amount:1};
 assert.equal(startServerRefineryShipment(busy,{materialId:'cuivre_orbital',amount:30}).ok,false);
});

test('UI upgrade selection and confirmation submit a command without changing the profile locally',()=>{
 const profile=shipmentProfile();const before=JSON.stringify(profile);let rendered=0;const commands=[];
 const localStore={state:profile,selectedRefineryUpgrade:null};
 const actions=createRefineryActions({store:localStore,multiplayer:{connected:true,socket:{},auth:{account:{id:'qa'},profileReady:true}},
  renderRefinery:()=>rendered++,renderAll:()=>rendered++,startServerRefineryUpgrade:data=>{commands.push(data);return true;}});
 const event=(selector,dataset)=>({target:{closest:s=>s===selector?{dataset}:null}});
 assert.equal(actions.handleClick(event('#refineryPanel [data-upgrade-refinery]',{upgradeRefinery:'cuivre_orbital'})),true);
 assert.deepEqual(localStore.selectedRefineryUpgrade,{type:'material',id:'cuivre_orbital'});
 assert.equal(commands.length,0);assert.equal(JSON.stringify(profile),before);
 actions.handleClick(event('#refineryPanel [data-confirm-refinery-upgrade]',{confirmRefineryUpgrade:'cuivre_orbital'}));
 assert.deepEqual(commands,[{type:'material',id:'cuivre_orbital'}]);assert.equal(JSON.stringify(profile),before);assert.ok(rendered>=2);
 // Infrastructure controls live in the compact header, outside #refineryPanel.
 assert.equal(actions.handleClick(event('.refinery-panel [data-upgrade-refinery-module]',{upgradeRefineryModule:'storage'})),true);
 assert.deepEqual(localStore.selectedRefineryUpgrade,{type:'module',id:'storage'});
 assert.equal(commands.length,1);assert.equal(JSON.stringify(profile),before);
 actions.handleClick(event('#refineryPanel [data-confirm-refinery-module-upgrade]',{confirmRefineryModuleUpgrade:'storage'}));
 assert.deepEqual(commands[1],{type:'module',id:'storage'});assert.equal(JSON.stringify(profile),before);
});

test('ship fusion still consumes the exact server recipe and rejects impossible amounts',()=>{
 const p=shipmentProfile();p.shipCargo.orion={alliage_cuivre_zinc:30,catalyseur_quantique:15};
 const result=refineServerShipCargoRecipe(p,{recipeId:'refine_conducteur',amount:3,shipId:'orion'});
 assert.equal(result.ok,true);assert.equal(p.shipCargo.orion.alliage_cuivre_zinc,0);assert.equal(p.shipCargo.orion.catalyseur_quantique,0);assert.equal(p.shipCargo.orion.conducteur_renforce,3);
 const after=JSON.stringify(p);assert.equal(refineServerShipCargoRecipe(p,{recipeId:'refine_conducteur',amount:1,shipId:'orion'}).ok,false);assert.equal(JSON.stringify(p),after);
});
