import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { SHOP_CATEGORIES, buildShopCatalog, filterShopProducts, paginateShopProducts } from "../../src/ui/shopCatalog.js";
import { createShopProductModel } from "../../src/ui/shopProductModel.js";
import { renderShopCardMarkup, renderShopDetailMarkup } from "../../src/ui/shopMarkup.js";
import { getShopCurrencyPrice } from "../../src/shared/shopPricing.js";
import { S1_BOOSTER_DURATION_MS as UNIT } from "../../src/shared/firmBoosters.js";

const catalog=buildShopCatalog();
function setup(){const state=createDefaultProfile();state.player.credits=1e12;state.player.premium=1e9;return state;}
function model(id,options={}){const p=catalog.find(p=>p.id===id);assert.ok(p,id);return createShopProductModel(p,{state:setup(),...options});}

test("nine navigation entries retain all approved references, four passes and sale exclusions",()=>{
  assert.equal(SHOP_CATEGORIES.length,9);assert.equal(catalog.length,48);
  const counts=Object.fromEntries(SHOP_CATEGORIES.slice(0,-1).map(c=>[c.id,catalog.filter(p=>p.category===c.id).length]));
  assert.deepEqual(counts,{vaisseau:9,canon:5,munition:9,generateur:4,drone:5,extra:8,booster:4,premium:4});
  assert.ok(!catalog.some(p=>['imperial','ammo_x6','ammo_x5'].includes(p.id)));
});

test("search handles accents and multiple words, stays in its category, and respects ownership",()=>{
  const state=setup();state.ownedDroneCount=2;
  const products=catalog.map(p=>createShopProductModel(p,{state,inventoryCount:id=>id==='shield_gen'?2:0,ammoCount:id=>id==='rocket_r1'?100:0}));
  assert.deepEqual(filterShopProducts(products,'generateur','generateur a i').map(p=>p.id),['shield_gen','shield_omega']);
  assert.equal(filterShopProducts(products,'canon','generateur').length,0);
  const owned=filterShopProducts(products,'owned').map(p=>p.id);
  for(const id of ['orion','shield_gen','rocket_r1','combat_drone','base'])assert.ok(owned.includes(id),id);
  assert.ok(!owned.includes('premium_week'));
});

test("ammo lot choices show actual delivery and the canonical total after discount and surcharge",()=>{
  const state=setup();state.player.reputation=-200000;state.player.premiumUntil=Date.now()+86400000;
  for(const id of ['ammo_x1','ammo_x4','rocket_r1','rocket_r3','missile_m2'])for(const multiplier of [1,10,100,1000]){
    const m=model(id,{state,multiplier});assert.equal(m.quantity,multiplier);assert.equal(m.units,m.data.amount*multiplier);
    assert.equal(m.price,getShopCurrencyPrice(m.priceType,m.data.price*multiplier,state.player));
    assert.match(m.pricingNote,/Réputation : \+30 %/);
    if(m.priceType==='premium')assert.match(m.pricingNote,/Remise Premium : 5 %/);
    const html=renderShopDetailMarkup(m);
    assert.match(html,new RegExp(`data-buy-ammo="${id}" data-buy-ammo-multiplier="${multiplier}"`));
    assert.equal((html.match(/data-shop-ammo-multiplier=/g)||[]).length,4);
  }
  assert.equal(model('ammo_x4',{multiplier:7}).quantity,1);
});

test("teleportation fluid retains lots while other equipment purchases stay individual",()=>{
  const fluid=model('teleportation_fluid',{multiplier:100});assert.equal(fluid.units,100);assert.equal(fluid.price,fluid.data.price*100);
  assert.match(renderShopDetailMarkup(fluid),/data-buy-item="teleportation_fluid" data-buy-item-multiplier="100"/);
  const laser=model('laser_mk1',{multiplier:1000});assert.equal(laser.quantity,1);assert.doesNotMatch(renderShopDetailMarkup(laser),/data-shop-ammo-multiplier/);
});

test("drone quotes use ownership, stop at eight and reserve the two crafting places",()=>{
  const state=setup();state.ownedDroneCount=7;
  const m=model('combat_drone',{state});assert.equal(m.price,200000*2**7);assert.equal(m.action.disabled,false);
  state.ownedDroneCount=8;const full=model('combat_drone',{state});assert.equal(full.action.disabled,true);assert.match(full.lock,/8 drones standards/);assert.match(full.note,/fabriquer/);
  assert.ok(full.stats.some(s=>s.label==='Capacité totale'&&s.value==='10'));assert.match(renderShopDetailMarkup(full),/data-buy-combat-drone="" disabled/);
});

test("booster purchase is one unit, with a separate cap and partially used units counted",()=>{
  const state=setup();state.boosters.s1.damage.remainingMs=999*UNIT;
  const m=model('booster_s1_damage',{state,multiplier:1000});assert.equal(m.quantity,1);assert.equal(m.action.disabled,false);
  const html=renderShopDetailMarkup(m);assert.match(html,/data-buy-booster-quantity="1"/);assert.doesNotMatch(html,/data-shop-ammo-multiplier/);
  state.boosters.s1.damage.remainingMs=999.5*UNIT;
  assert.equal(model('booster_s1_damage',{state}).action.disabled,true);assert.equal(model('booster_s1_shield',{state}).action.disabled,false);
});

test("owned formations can activate with no funds and keep their malus visible",()=>{
  const state=setup();state.player.premium=0;state.ownedDroneFormations.push('tir');
  const m=model('tir',{state});assert.equal(m.activating,true);assert.equal(m.action.disabled,false);assert.equal(m.insufficient,false);
  assert.equal(m.stats.find(s=>s.label==='Malus').value,m.data.stats.malus);assert.match(renderShopDetailMarkup(m),/Activer la formation/);
  state.activeDroneFormation='tir';assert.equal(model('tir',{state}).action.disabled,true);
});

test("owned, active, locked and insufficient-funds ships expose the correct purchase state",()=>{
  const state=setup();assert.equal(model('orion',{state}).action.disabled,true);assert.equal(model('orion',{state}).status,'Actif');
  const locked=model('vesperion',{state,shipLock:()=>"Terminez Kharon."});assert.equal(locked.action.disabled,true);assert.equal(locked.lock,'Terminez Kharon.');
  state.player.credits=0;const poor=model('valkyrie',{state});assert.equal(poor.action.disabled,true);assert.match(renderShopDetailMarkup(poor),/Crédits insuffisants/);
});

test("all four Premium passes show euros independent of the wallet, reputation and current subscription",()=>{
  const state=setup();state.player.premium=0;state.player.credits=0;state.player.reputation=-400000;state.player.premiumUntil=Date.now()+86400000;
  for(const [id,price,features] of [['premium_classic_week',1.99,8],['premium_classic_month',6.99,8],['premium_week',2.99,9],['premium_month',10.99,9]]){
    const m=model(id,{state,multiplier:1000});
    assert.equal(m.features.length,features);assert.equal(m.price,price);assert.equal(m.priceType,'real');assert.equal(m.insufficient,false);assert.equal(m.pricingNote,'');assert.equal(m.owned,false);assert.equal(m.quantity,1);assert.equal(m.quantities,false);assert.equal(m.action.disabled,true);
    const html=renderShopDetailMarkup(m),card=renderShopCardMarkup(m);
    assert.ok(html.includes(String(price).replace('.',',')+' €'));
    assert.match(html,/<button[^>]*disabled>Paiement à venir<\/button>/);
    assert.match(card,new RegExp('data-shop-open-detail="premiumPack:'+id+'"[^>]*>Voir le pass'));
    assert.doesNotMatch(html+card,/data-buy-premium-pack|NOVA insuffisantes|Crédits insuffisants|Remise Premium|shop-quantity|Prix indicatif Boutique|currency-amount/);
  }
});

test("tutorial selectors remain usable and selecting the first laser still precedes purchase",()=>{
  const state=setup();state.tutorial={status:'active',step:'launcher_select_laser'};
  assert.match(renderShopCardMarkup(model('velox'),true),/selected[^>]+data-select-shop="ship:velox"/);
  assert.equal(model('laser_mk1',{state}).action.disabled,true);
  state.tutorial.step='launcher_buy_laser';assert.equal(model('laser_mk1',{state}).action.disabled,false);
});

test("keyboard-selectable cards and descriptions escape data rather than inserting markup",()=>{
  const base=model('laser_mk1'),m={...base,name:'<script>"x"</script>',description:'<img src=x onerror=alert(1)> & texte',key:'item:" unsafe'};
  const card=renderShopCardMarkup(m,true),html=renderShopDetailMarkup(m);
  assert.match(card,/<button type="button"/);assert.match(card,/aria-pressed="true"/);assert.doesNotMatch(card,/<script>/);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img src=x/);assert.match(card,/data-select-shop="item:&quot; unsafe"/);
});

test("owned catalogue pages retain every reference and keep the selected article on its page",()=>{
  const products=catalog.map(p=>model(p.id));
  const visited=[];
  for(let index=0;index<products.length;index+=9){
    const page=paginateShopProducts(products,products[index].key);
    assert.equal(page.page,Math.floor(index/9));assert.ok(page.items.some(p=>p.key===products[index].key));
    assert.equal(page.items.length,Math.min(9,products.length-index));visited.push(...page.items.map(p=>p.key));
    if(index>0)assert.equal(page.previous,products[index-9].key);
    if(index+9<products.length)assert.equal(page.next,products[index+9].key);else assert.equal(page.next,"");
  }
  assert.deepEqual(visited,products.map(p=>p.key));
  assert.equal(paginateShopProducts(products,'missing').page,0);
  assert.equal(paginateShopProducts([],'missing').items.length,0);
});

test("quantity selection stays with the price and purchase instead of the scrolling description",()=>{
  for(const id of ['ammo_x1','rocket_r1','teleportation_fluid']){
    const html=renderShopDetailMarkup(model(id,{multiplier:100}));
    const footer=html.indexOf('<footer class="shop-detail-footer">');
    assert.ok(html.indexOf('<fieldset class="shop-quantity">')>footer);
    assert.ok(html.indexOf('data-shop-ammo-multiplier="100"')<html.indexOf('shop-purchase-button'));
    assert.match(html,/100 unités au total|100 roquettes au total|100 000 munitions au total/);
  }
});

test("Premium and Premium OR retain their eight or nine benefits in an accessible detail dialog",()=>{
  for(const id of ['premium_classic_week','premium_week']){
    const m=model(id),html=renderShopDetailMarkup(m);
    assert.match(html,/data-shop-show-benefits/);assert.match(html,/aria-labelledby="shopBenefitsTitle"/);
    for(const feature of m.features)assert.ok(html.includes(feature));
    assert.equal((html.match(/<li>/g)||[]).length,id==='premium_week'?9:8);
  }
});

test("direct card purchases send the displayed lot and canonical total",()=>{
  const state=setup();state.player.reputation=-200000;state.player.premiumUntil=Date.now()+86400000;
  for(const [id,quantity] of [['ammo_x4',100],['rocket_r1',1000],['teleportation_fluid',10]]){
    const m=model(id,{state,multiplier:quantity}),html=renderShopCardMarkup(m);
    const attribute=id==='teleportation_fluid'?'item':'ammo';
    assert.match(html,new RegExp('data-buy-'+attribute+'="'+id+'" data-buy-'+attribute+'-multiplier="'+quantity+'"'));
    assert.ok(html.includes(new Intl.NumberFormat('fr-FR').format(getShopCurrencyPrice(m.priceType,m.data.price*quantity,state.player))));
    assert.match(html,new RegExp('data-shop-quantity-for="'+m.key+'"'));
  }
});

test("direct cards preserve one-unit boosters and free owned-formation activation",()=>{
  const booster=renderShopCardMarkup(model('booster_s1_damage',{multiplier:1000}));
  assert.match(booster,/data-buy-booster="booster_s1_damage" data-buy-booster-quantity="1"/);
  assert.doesNotMatch(booster,/data-shop-ammo-multiplier/);
  const state=setup();state.player.premium=0;state.ownedDroneFormations.push('tir');
  const formation=renderShopCardMarkup(model('tir',{state}));
  assert.match(formation,/data-buy-drone-formation="tir" >Activer la formation/);
  assert.doesNotMatch(formation,/NOVA insuffisantes/);
});
