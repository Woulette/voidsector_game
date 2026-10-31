import assert from "node:assert/strict";
import test from "node:test";
import { premiumFeatureList, premiumGoldFeatureList, premiumShopPacks } from "../../src/data/premium.js";
import { handlePremiumPassInteraction, renderPremiumPassModal, renderPremiumPassStore } from "../../src/ui/premiumPassStore.js";

const profile = {player:{premium:1_000_000,premiumUntil:Number.MAX_SAFE_INTEGER,reputation:-100_000},inventory:[{id:"laser_mk3",count:3}]};
const textContent = html=>String(html).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
function pureRender(renderer,...args){
  const before = structuredClone(profile), html = renderer(profile,...args);
  assert.deepEqual(profile,before,"presentation must not alter the canonical profile");
  return html;
}
function eventFor(selector,dataset){return {target:{closest:query=>query === selector ? {dataset} : null}};}

test("four euro-only offers retain stable Gold IDs and the approved duration and prices",()=>{
  assert.deepEqual(premiumShopPacks.map(({id,tier,days,realPrice,priceType})=>({id,tier,days,realPrice,priceType})).sort((a,b)=>a.id.localeCompare(b.id)),[
    {id:"premium_classic_month",tier:"classic",days:30,realPrice:"6,99 EUR",priceType:"real"},
    {id:"premium_classic_week",tier:"classic",days:7,realPrice:"1,99 EUR",priceType:"real"},
    {id:"premium_month",tier:"gold",days:30,realPrice:"10,99 EUR",priceType:"real"},
    {id:"premium_week",tier:"gold",days:7,realPrice:"2,99 EUR",priceType:"real"}
  ]);
});

test("Premium defaults to the two classic offers and Gold shows its own two offers",()=>{
  for(const tier of ["classic","gold"]){
    const html = pureRender(renderPremiumPassStore,{tier});
    assert.equal((html.match(/data-store-offer-kind="premium"/g)||[]).length,2);
    for(const pack of premiumShopPacks){
      assert.equal(html.includes(`data-store-offer="${pack.id}"`),pack.tier === tier);
      if(pack.tier === tier)assert.ok(textContent(html).includes(pack.realPrice.replace(" EUR"," €")));
    }
    assert.doesNotMatch(html,/data-premium-payment|data-buy-premium-pack|Activation avec votre NOVA/);
  }
  assert.equal(pureRender(renderPremiumPassStore),pureRender(renderPremiumPassStore,{tier:"classic"}));
});

test("classic and Gold share eight benefits and only Gold includes the monthly calendar",()=>{
  assert.equal(premiumFeatureList.length,8);assert.equal(premiumGoldFeatureList.length,9);
  for(const tier of ["classic","gold"]){
    const html = pureRender(renderPremiumPassModal,{kind:"premium-benefits",id:"all"},{tier});
    const features = tier === "gold" ? premiumGoldFeatureList : premiumFeatureList;
    assert.equal((html.match(/<li>/g)||[]).length,features.length);
    for(const feature of features)assert.ok(html.includes(feature));
    assert.equal(/Calendrier de recompenses/i.test(html),tier === "gold");
    assert.doesNotMatch(html,/data-(?:buy|checkout|claim|pay-real)-/);
  }
});

test("every pass detail derives its tier from the offer and keeps real checkout unavailable",()=>{
  for(const pack of premiumShopPacks){
    const html = pureRender(renderPremiumPassModal,{kind:"premium",id:pack.id},{tier:pack.tier === "gold" ? "classic" : "gold"});
    assert.ok(textContent(html).includes(pack.realPrice.replace(" EUR"," €")));
    assert.equal((html.match(/<li>/g)||[]).length,pack.tier === "gold" ? 9 : 8);
    assert.match(html,/<button[^>]*disabled[^>]*>Paiement à venir<\/button>/);
    assert.match(html,/s’ajoute à vos avantages Premium/);
    assert.doesNotMatch(html,/data-buy-premium-pack|data-premium-payment|data-(?:checkout|pay-real|purchase-real)/);
  }
});

test("only Gold offers calendar navigation while classic explains the upgrade",()=>{
  const classic = pureRender(renderPremiumPassStore,{tier:"classic"}), gold = pureRender(renderPremiumPassStore,{tier:"gold"});
  assert.doesNotMatch(classic,/data-store-tab="rewards"/);
  assert.match(classic,/data-premium-tier="gold"[^>]*>Découvrir/);
  assert.match(gold,/data-store-tab="rewards"/);assert.match(gold,/28 récompenses/);
});

test("changing tier updates presentation only and preserves canonical profile and open pass",()=>{
  const store = {state:structuredClone(profile),storeModal:{kind:"premium",id:"premium_month"},premiumStoreTier:"classic"};
  const before = structuredClone(store.state), modal = structuredClone(store.storeModal);
  let renders = 0;
  for(const tier of ["gold","classic"]){
    assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-tier]",{premiumTier:tier}),{store,render(){renders++;}}),true);
    assert.equal(store.premiumStoreTier,tier);assert.deepEqual(store.state,before);assert.deepEqual(store.storeModal,modal);
  }
  assert.equal(renders,2);
});

test("all-benefits navigation preserves the selected tier and never changes the profile",()=>{
  const store = {state:structuredClone(profile),storeModal:null,premiumStoreTier:"gold"};
  const before = structuredClone(store.state);
  assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-benefits]",{}),{store,render(){}}),true);
  assert.deepEqual(store.storeModal,{kind:"premium-benefits",id:"all"});assert.equal(store.premiumStoreTier,"gold");assert.deepEqual(store.state,before);
});

test("invalid offers and selectors, including obsolete NOVA selectors, are inert",()=>{
  for(const modal of [{kind:"premium",id:"unknown"},{kind:"starter",id:"premium_week"},{kind:"unknown",id:"all"}])assert.equal(pureRender(renderPremiumPassModal,modal),"");
  const store = {state:structuredClone(profile),storeModal:null,premiumStoreTier:"classic"}, before = structuredClone(store);
  let renders = 0;
  const context = {store,render(){renders++;}};
  for(const tier of ["", "premium", "real", "gold ", "<script>"])assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-tier]",{premiumTier:tier}),context),false);
  assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-payment]",{premiumPayment:"premium"}),context),false);
  assert.deepEqual(store,before);assert.equal(renders,0);
});
