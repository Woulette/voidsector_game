import test from 'node:test';
import assert from 'node:assert/strict';
import {refineryMaterialCatalog, refineryRecipes} from '../../src/data/catalog.js';
import {
 refineryAncestors, refineryTreeHtml, refineryTheoreticalFlows,
 refineryProductionStatus, refineryMaterialName, refineryStocksHtml
} from '../../src/ui/refineryPresentation.js';
import {renderRefineryPanel} from '../../src/game/ui/spawnRefineryPanel.js';
import {normalizeState,store,getRefineryShipmentData,getShipCargo,getShipCargoCapacity,getMaterialCount,getMaterialStorageCap} from '../../src/core/store.js?v=20260726-kharon1';
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

test('station stock overview shows all 11 current stocks and each numeric capacity inside its gauge',()=>{
 const previous=store.state;
 try{
  const profile=createDefaultProfile();
  profile.refineryModules={storage:1,transport:1};
  profile.cargoHold=Object.fromEntries(refineryMaterialCatalog.map((material,index)=>[material.id,index*17]));
  store.state=normalizeState(profile);
  const snapshot=JSON.stringify(store.state);
  const html=refineryStocksHtml(refineryMaterialCatalog,id=>({stock:getMaterialCount(id),cap:getMaterialStorageCap(id)}));
  assert.match(html,/class="rf-stock-overview sky-stock-row"/,'the tutorial stock anchor is restored');
  const cards=[...html.matchAll(/<article\b[^>]*data-refinery-stock="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length,11);
  assert.deepEqual(new Set(cards.map(([,id])=>id)),new Set(refineryMaterialCatalog.map(material=>material.id)));
  const capacities={raw:25000,refined:10000,special:10000,advanced:8000,final:2000};
  for(const [,id,body] of cards){
   const material=refineryMaterialCatalog.find(entry=>entry.id===id),cap=capacities[material.kind];
   assert.match(body,new RegExp(`data-refinery-stock-current="${getMaterialCount(id)}"`));
   assert.match(body,new RegExp(`class="rf-stock-gauge"[^]*?<span>MAX <b data-refinery-stock-cap="${cap}">`));
   assert.doesNotMatch(body,/<button\b/,'reading a stock needs no action');
  }
  assert.equal(JSON.stringify(store.state),snapshot,'stock presentation does not mutate the profile');
 }finally{store.state=previous;}
});

test('station stock gauges handle empty, zero-capacity, over-capacity and long maximum values',()=>{
 const material=refineryMaterialCatalog[0];
 for(const scenario of [{stock:0,cap:25000,fill:0},{stock:0,cap:0,fill:0},{stock:150,cap:100,fill:100},{stock:250,cap:1000,fill:25},{stock:10000000,cap:10000000,fill:100}]){
  const before=JSON.stringify(scenario);
  const html=refineryStocksHtml([material],()=>scenario);
  assert.match(html,new RegExp(`data-refinery-stock-current="${scenario.stock}"`));
  assert.match(html,new RegExp(`data-refinery-stock-cap="${scenario.cap}"`));
  assert.match(html,new RegExp(`data-refinery-stock-fill="${scenario.fill}"`));
  assert.match(html,new RegExp(`style="width:${scenario.fill}%"`));
  assert.equal(JSON.stringify(scenario),before);
  if(scenario.cap===10000000)assert.match(html.replace(/\s/g,''),/>10000000<\/b>/,'maximum remains a complete numeric value');
 }
});

test('station stock maximums follow the current storage module rather than production levels',()=>{
 const previous=store.state;
 try{
  const profile=createDefaultProfile();profile.refineryModules={storage:20,transport:1};
  profile.refineryLevels=Object.fromEntries(refineryMaterialCatalog.map(material=>[material.id,0]));
  store.state=normalizeState(profile);
  const capacities={raw:10000000,refined:1000000,special:1000000,advanced:100000,final:10000};
  const html=refineryStocksHtml(refineryMaterialCatalog,id=>({stock:getMaterialCount(id),cap:getMaterialStorageCap(id)}));
  for(const material of refineryMaterialCatalog)assert.equal(getMaterialStorageCap(material.id),capacities[material.kind]);
  assert.match(html,/data-refinery-stock-cap="10000000"/);
  assert.match(html,/data-refinery-stock-cap="10000"/);
 }finally{store.state=previous;}
});

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

function refineryCards(html){
 return [...html.matchAll(/<article\b([^>]*\bdata-refinery-node="([^"]+)"[^>]*)>([\s\S]*?)<\/article>/g)]
  .map(([,attributes,id,body])=>({attributes,id,body}));
}

function cardButton(card,attribute){
 const escaped=attribute.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const buttons=[...card.body.matchAll(new RegExp(`<button\\b([^>]*\\b${escaped}="([^"]+)"[^>]*)>([\\s\\S]*?)<\\/button>`,'g'))];
 assert.equal(buttons.length,1,`${card.id}: exactly one ${attribute} button`);
 const [,attributes,id,body]=buttons[0];
 assert.equal(id,card.id,`${card.id}: ${attribute} targets its own material`);
 return {attributes,body};
}

test('every material exposes independent selection, upgrade and production buttons directly on its card',()=>{
 const states=Object.fromEntries(refineryMaterialCatalog.map((material,index)=>[material.id,{
  stock:17,level:2,rate:150,enabled:index%2===0,status:{key:'active',text:'En production'},job:null,
  upgrade:{nextLevel:3,canAfford:true}
 }]));
 const before=JSON.stringify(states);
 const html=refineryTreeHtml(refineryMaterialCatalog,refineryRecipes,'cuivre_orbital',id=>states[id]);
 const cards=refineryCards(html);
 assert.equal(cards.length,11);
 assert.deepEqual(new Set(cards.map(card=>card.id)),new Set(refineryMaterialCatalog.map(material=>material.id)));
 for(const card of cards){
  // The article itself must not match selection: sibling action clicks must
  // reach their own delegated handlers instead of selecting the material.
  assert.doesNotMatch(card.attributes,/data-refinery-select-material/);
  cardButton(card,'data-refinery-select-material');
  const upgrade=cardButton(card,'data-upgrade-refinery');
  const toggle=cardButton(card,'data-toggle-refinery-production');
  assert.doesNotMatch(upgrade.attributes,/\bdisabled\b/);
  assert.doesNotMatch(toggle.attributes,/\bdisabled\b/);
  assert.match(toggle.attributes,new RegExp(`aria-pressed="${states[card.id].enabled}"`));
  assert.equal(toggle.body.replace(/<[^>]*>/g,'').trim(),states[card.id].enabled?'ON':'OFF');
  let buttonDepth=0;
  for(const token of card.body.matchAll(/<\/?button\b[^>]*>/g)){
   if(token[0].startsWith('</'))buttonDepth--;
   else{assert.equal(buttonDepth,0,`${card.id}: interactive buttons must not be nested`);buttonDepth++;}
  }
  assert.equal(buttonDepth,0,`${card.id}: balanced buttons`);
 }
 assert.equal(JSON.stringify(states),before,'rendering card controls must not change production, jobs or upgrade data');
});

test('card controls preserve locked recipes, maximum levels, unaffordable previews and active upgrade progress',()=>{
 const ids=['cuivre_orbital','alliage_cuivre_zinc','conducteur_renforce','blindage_composite'];
 const states={
  [ids[0]]:{level:20,enabled:true,upgrade:null,job:null},
  [ids[1]]:{level:0,enabled:true,upgrade:{nextLevel:1,canAfford:false},job:null},
  [ids[2]]:{level:1,enabled:false,upgrade:{nextLevel:2,canAfford:false},job:{remaining:91000,percent:25,toLevel:2}},
  [ids[3]]:{level:1,enabled:false,upgrade:null,job:null}
 };
 const html=refineryTreeHtml(refineryMaterialCatalog,refineryRecipes,ids[0],id=>({stock:0,rate:0,status:{key:'paused',text:'En pause'},
  level:2,enabled:true,upgrade:{nextLevel:3,canAfford:true},job:null,...states[id]}));
 const cards=new Map(refineryCards(html).map(card=>[card.id,card]));
 assert.match(cardButton(cards.get(ids[0]),'data-upgrade-refinery').attributes,/\bdisabled\b/,'maximum-level production cannot be upgraded');
 assert.doesNotMatch(cardButton(cards.get(ids[0]),'data-toggle-refinery-production').attributes,/\bdisabled\b/,'maximum-level production still has a power switch');
 assert.doesNotMatch(cardButton(cards.get(ids[1]),'data-upgrade-refinery').attributes,/\bdisabled\b/,'locked recipes still open their actual unlock costs even if unaffordable');
 const lockedPower=cardButton(cards.get(ids[1]),'data-toggle-refinery-production');
 assert.match(lockedPower.attributes,/\bdisabled\b/,'locked production cannot be activated from the card');
 assert.match(lockedPower.attributes,/aria-pressed="false"/,'a locked recipe is visibly OFF even when its saved preference is enabled');
 assert.equal(lockedPower.body.replace(/<[^>]*>/g,'').trim(),'OFF');
 assert.doesNotMatch(cardButton(cards.get(ids[2]),'data-upgrade-refinery').attributes,/\bdisabled\b/,'an active job remains accessible');
 assert.match(cards.get(ids[2]).body,/Amélioration|En cours|En amélioration/,'an active job is visibly distinguished');
 assert.doesNotMatch(cardButton(cards.get(ids[2]),'data-toggle-refinery-production').attributes,/\bdisabled\b/,'pausing production remains independent from its upgrade job');
 assert.match(cardButton(cards.get(ids[3]),'data-upgrade-refinery').attributes,/\bdisabled\b/,'missing upgrade data cannot create a new upgrade');
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

function shipMaterialGroups(html){
 return [...html.matchAll(/<section\b[^>]*data-refinery-group="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)]
  .map(([,id,body])=>({id,body,materials:[...body.matchAll(/data-refinery-material="([^"]+)"/g)].map(([,materialId])=>materialId)}));
}

test('ship refining groups the whole recipe chain as 5 raw, 3 intermediate, 2 advanced and 1 final material',()=>{
 const catalog=refineryMaterialCatalog.slice().reverse();
 const ui={recipeId:'refine_noyau_astra',fusionAmount:2};
 const cargo=Object.fromEntries(catalog.map(material=>[material.id,50]));
 const before=JSON.stringify({catalog,ui,cargo,recipes:refineryRecipes});
 const {html}=renderRefineryPanel({materials:catalog,recipes:refineryRecipes,shipCargo:cargo,
  shipCargoUsed:550,shipCargoCapacity:1000,refineryUiState:ui,getShipRefineryRecipeData:()=>({maxAmount:5})});
 const groups=shipMaterialGroups(html);
 assert.deepEqual(groups.map(group=>group.id),['raw','intermediate','advanced','final']);
 assert.deepEqual(groups.map(group=>group.materials),[
  ['cuivre_orbital','zinc_spatial','nickel_brut','titane_fissure','silice_conductrice'],
  ['alliage_cuivre_zinc','catalyseur_quantique','plaque_nickel_titane'],
  ['conducteur_renforce','blindage_composite'],['noyau_astra']
 ]);
 // The catalyst's production stage differs from its economic catalogue tier.
 const catalyst=catalog.find(material=>material.id==='catalyseur_quantique');
 assert.equal(catalyst.kind,'special');assert.equal(catalyst.tier,4);
 assert.equal([...html.matchAll(/data-open-ship-refine=/g)].length,6);
 assert.match(html,/data-refinery-recipe="refine_noyau_astra"/);
 assert.equal([...html.matchAll(/data-refinery-ingredient=/g)].length,3,'all final-core ingredients remain in the order');
 assert.match(html,/data-confirm-ship-refine="refine_noyau_astra"/);
 assert.match(html,/data-refinery-output-amount>2</);
 assert.match(html,/data-refinery-cargo-after>492</);
 assert.equal(JSON.stringify({catalog,ui,cargo,recipes:refineryRecipes}),before);
});

test('perfection offers exactly the compatible materials and keeps authoritative deposit metadata',()=>{
 const cargo=Object.fromEntries(refineryMaterialCatalog.map(m=>[m.id,7]));
 for(const target of ['laser','rocket','generator','drone']){
  const ui={boostTarget:target,boostAmount:2};const before=JSON.stringify({cargo,ui});
  const {html}=renderRefineryPanel({materials:refineryMaterialCatalog,shipCargo:cargo,refineryTab:'perfectionnement',refineryUiState:ui,getCombatBoostSummary:()=>({remaining:0})});
  const ids=[...html.matchAll(/data-boost-material="([^"]+)"/g)].map(m=>m[1]);
  const expected=Object.entries(COMBAT_BOOST_DEFS).filter(([,m])=>m.targets[target]).map(([id])=>id);
  assert.deepEqual(ids.sort(),expected.sort());
  const cards=[...html.matchAll(/<button\b([^>]*data-refinery-material="([^"]+)"[^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(cards.length,3,'the equipment workstation shows only its three compatible choices');
  assert.deepEqual(cards.map(([, ,id])=>id).sort(),expected.sort());
  for(const [,attributes,id,body] of cards){
   assert.doesNotMatch(attributes,/\bdisabled\b/);
   assert.match(attributes,/draggable="true"/);
   assert.match(attributes,new RegExp(`data-boost-material="${id}"`));
   assert.match(body,new RegExp(`\\+${Math.round(COMBAT_BOOST_DEFS[id].targets[target].percent*100)}%`));
  }
  assert.equal([...html.matchAll(/data-boost-drop-target=/g)].length,4);
  assert.equal([...html.matchAll(/data-boost-material-amount="7"/g)].length,3);
  assert.match(html,/data-open-boost-deposit/);
  assert.equal(JSON.stringify({cargo,ui}),before);
 }
 assert.equal(refineryMaterialName({id:'catalyseur_quantique',name:'Autre'}),'Catalyseur');
});

test('equipment workstation preserves selected quantities, live reserves and its original confirmation command',()=>{
 const cargo={noyau_astra:7,alliage_cuivre_zinc:8,plaque_nickel_titane:9,conducteur_renforce:10,blindage_composite:11};
 for(const scenario of [
  {target:'laser',type:'Laser',percent:50,label:'40 tirs renforcés',field:'charges',remaining:70,reserve:'70 tirs'},
  {target:'rocket',type:'Roquettes',percent:50,label:'4 tirs renforcés',field:'charges',remaining:70,reserve:'70 tirs'},
  {target:'generator',type:'Generateurs',percent:40,label:'4 min de bonus',field:'seconds',remaining:125,reserve:'2m 5s'},
  {target:'drone',type:'Drones',percent:40,label:'4 min de bonus',field:'seconds',remaining:125,reserve:'2m 5s'}
 ]){
  const ui={boostTarget:scenario.target,boostMaterial:'noyau_astra',boostAmount:4};
  const before=JSON.stringify({ui,cargo});
  const {html}=renderRefineryPanel({materials:refineryMaterialCatalog,shipCargo:cargo,refineryTab:'perfectionnement',refineryUiState:ui,
   getCombatBoostSummary:type=>type===scenario.type?{percent:.25,remaining:scenario.remaining,field:scenario.field}:{remaining:0}});
  assert.match(html,new RegExp(`data-refinery-boost-system="${scenario.target}" data-refinery-boost-selected="noyau_astra"`));
  assert.match(html,/data-refinery-boost-amount[^>]*max="7"[^>]*value="4"/);
  assert.match(html,new RegExp(`data-refinery-boost-duration>${scenario.label}<`));
  assert.match(html,/data-refinery-boost-used>4</);
  assert.match(html,new RegExp(`data-boost-deposit-target="${scenario.type}" data-boost-deposit-material="noyau_astra"`));
  assert.match(html,/data-boost-deposit-max="7"/);
  assert.equal([...html.matchAll(/class="orbital-system-status(?: active)?\s*"/g)].length,4,'each system keeps its live reserve in its selector');
  assert.match(html,new RegExp(`25% · ${scenario.reserve}`),'live bonus reserves stay visible beside the proposed deposit');
  assert.equal(JSON.stringify({ui,cargo}),before);
 }
});

test('equipment workstation shows actual empty cargo and never substitutes demonstration quantities',()=>{
 const cargo={alliage_cuivre_zinc:0,conducteur_renforce:3,noyau_astra:12};
 const ui={boostTarget:'laser',boostMaterial:'alliage_cuivre_zinc',boostAmount:999};
 const before=JSON.stringify({cargo,ui});
 const {html}=renderRefineryPanel({materials:refineryMaterialCatalog,shipCargo:cargo,refineryTab:'perfectionnement',refineryUiState:ui,
  getCombatBoostSummary:()=>({remaining:0})});
 const cards=[...html.matchAll(/<button\b([^>]*data-boost-material="([^"]+)"[^>]*)>([\s\S]*?)<\/button>/g)];
 assert.equal(cards.length,3);
 for(const [,attributes,id,body] of cards){
  assert.match(attributes,new RegExp(`data-boost-material-amount="${cargo[id]}"`));
  assert.match(body,new RegExp(`>${cargo[id]} en soute<`));
 }
 assert.match(html,/data-refinery-boost-amount[^>]*max="0"[^>]*value="0"[^>]*disabled/);
 assert.match(html,/data-open-boost-deposit[^>]*data-boost-deposit-max="0"[^>]*disabled/);
 assert.match(html,/data-refinery-boost-duration>0 tirs renforcés</);
 assert.match(html,/Ce matériau est absent de votre soute/);
 assert.match(html,/>Aucun bonus actif</);
 assert.equal(JSON.stringify({cargo,ui}),before);
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

test('each material card routes its own power and upgrade commands without locally changing station production',()=>{
 const profile=shipmentProfile();
 profile.refineryProductionDisabled={zinc_spatial:true};
 const before=JSON.stringify(profile),toggles=[],upgrades=[];
 const localStore={state:profile,selectedRefineryMaterial:'noyau_astra',selectedRefineryUpgrade:null};
 const actions=createRefineryActions({store:localStore,multiplayer:{connected:true,socket:{},auth:{account:{id:'qa'},profileReady:true}},
  renderRefinery:()=>{},renderAll:()=>{},
  toggleServerRefineryProduction:id=>{toggles.push(id);return true;},
  startServerRefineryUpgrade:data=>{upgrades.push(data);return true;}});
 const event=(selector,dataset)=>({target:{closest:s=>s===selector?{dataset}:null}});
 for(const {id} of refineryMaterialCatalog){
  assert.equal(actions.handleClick(event('#refineryPanel [data-toggle-refinery-production]',{toggleRefineryProduction:id})),true);
  assert.equal(toggles.at(-1),id);
  assert.equal(localStore.selectedRefineryMaterial,'noyau_astra','power action is independent from material selection');
  assert.equal(JSON.stringify(profile),before);
  const sent=upgrades.length;
  assert.equal(actions.handleClick(event('#refineryPanel [data-upgrade-refinery]',{upgradeRefinery:id})),true);
  assert.deepEqual(localStore.selectedRefineryUpgrade,{type:'material',id});
  assert.equal(upgrades.length,sent,'opening the upgrade does not send or pay for an upgrade');
  assert.equal(actions.handleClick(event('#refineryPanel [data-confirm-refinery-upgrade]',{confirmRefineryUpgrade:id})),true);
  assert.deepEqual(upgrades.at(-1),{type:'material',id});
  assert.equal(JSON.stringify(profile),before,'the canonical server profile is not mutated before synchronization');
 }
 assert.deepEqual(toggles,refineryMaterialCatalog.map(material=>material.id));
 assert.deepEqual(upgrades,refineryMaterialCatalog.map(material=>({type:'material',id:material.id})));
 const offline=createRefineryActions({store:localStore,multiplayer:{connected:false},
  toggleServerRefineryProduction:id=>{toggles.push(id);return true;},
  startServerRefineryUpgrade:data=>{upgrades.push(data);return true;},renderRefinery:()=>{},renderAll:()=>{}});
 offline.handleClick(event('#refineryPanel [data-toggle-refinery-production]',{toggleRefineryProduction:'cuivre_orbital'}));
 offline.handleClick(event('#refineryPanel [data-confirm-refinery-upgrade]',{confirmRefineryUpgrade:'cuivre_orbital'}));
 assert.equal(toggles.length,11,'offline UI cannot issue a production command');
 assert.equal(upgrades.length,11,'offline UI cannot issue an upgrade command');
 assert.equal(JSON.stringify(profile),before);
});

test('ship fusion still consumes the exact server recipe and rejects impossible amounts',()=>{
 const p=shipmentProfile();p.shipCargo.orion={alliage_cuivre_zinc:30,catalyseur_quantique:15};
 const result=refineServerShipCargoRecipe(p,{recipeId:'refine_conducteur',amount:3,shipId:'orion'});
 assert.equal(result.ok,true);assert.equal(p.shipCargo.orion.alliage_cuivre_zinc,0);assert.equal(p.shipCargo.orion.catalyseur_quantique,0);assert.equal(p.shipCargo.orion.conducteur_renforce,3);
 const after=JSON.stringify(p);assert.equal(refineServerShipCargoRecipe(p,{recipeId:'refine_conducteur',amount:1,shipId:'orion'}).ok,false);assert.equal(JSON.stringify(p),after);
});
