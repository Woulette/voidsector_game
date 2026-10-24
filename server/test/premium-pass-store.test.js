import assert from "node:assert/strict";
import test from "node:test";
import { premiumFeatureList, premiumShopPacks } from "../../src/data/premium.js";
import { getShopCurrencyPrice } from "../../src/shared/shopPricing.js";
import {
  handlePremiumPassInteraction,
  renderPremiumPassModal,
  renderPremiumPassStore
} from "../../src/ui/premiumPassStore.js";

const now = Date.UTC(2026, 9, 24, 12);
const activePlayer = {premium:1_000_000, premiumUntil:Number.MAX_SAFE_INTEGER, reputation:0};

function textContent(html){
  return String(html).replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/g, " ").replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function compactText(html){ return textContent(html).replace(/\s/g, ""); }
function normalizedText(html){
  return textContent(html).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function buttons(html){ return String(html).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []; }
function openingTag(html){ return String(html).match(/^<[^>]*>/)?.[0] || ""; }
function hasAttribute(html, name){ return new RegExp(`\\s${name}(?:[\\s=>])`).test(openingTag(html)); }
function enabledActions(html, name){
  return buttons(html).filter(button=>hasAttribute(button,name) && !/\sdisabled(?:[\s=>])/.test(openingTag(button)));
}
function hasValue(html, name, value){ return String(html).includes(`${name}="${value}"`); }
function assertEuroPrice(html, price){
  const amount = String(price).replace(/ EUR$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(textContent(html), new RegExp(`${amount}\\s*(?:EUR|€)`));
}
function pureRender(renderer, profile, ...args){
  const before = structuredClone(profile);
  const html = renderer(profile,...args);
  assert.deepEqual(profile,before,"rendering must not alter the canonical profile");
  assert.equal(typeof html,"string");
  return html;
}
function eventFor(selector, dataset){
  return {target:{closest(query){ return query === selector ? {dataset} : null; }}};
}

test("Premium rows keep the two configured durations and euro prices without direct activation commands", ()=>{
  assert.deepEqual(premiumShopPacks.map(({id,days,realPrice,price})=>({id,days,realPrice,price})),[
    {id:"premium_week",days:7,realPrice:"3,99 EUR",price:20_000},
    {id:"premium_month",days:30,realPrice:"14,99 EUR",price:75_000}
  ]);
  const profile = {player:{...activePlayer},inventory:[{id:"laser_mk3",count:3}]};
  const html = pureRender(renderPremiumPassStore,profile,{now});
  assert.equal((html.match(/data-store-offer-kind="premium"/g) || []).length,2);
  for(const pack of premiumShopPacks){
    assert.ok(hasValue(html,"data-store-offer",pack.id));
    assert.match(textContent(html),new RegExp(`\\b${pack.days} jours\\b`));
    assertEuroPrice(html,pack.realPrice);
  }
  assert.doesNotMatch(html,/data-buy-premium-pack/);
  assert.doesNotMatch(html,/data-(?:checkout|pay-real|buy-real|purchase-real)/);
});

test("euro details keep checkout unavailable and offer a presentation switch to NOVA", ()=>{
  const profile = {player:{...activePlayer}};
  for(const pack of premiumShopPacks){
    const html = pureRender(renderPremiumPassModal,profile,{kind:"premium",id:pack.id},{payment:"real",now});
    assertEuroPrice(html,pack.realPrice);
    assert.match(normalizedText(html),/paiement.*(?:venir|preparation|bientot)/);
    assert.ok(buttons(html).some(button=>/\sdisabled(?:[\s=>])/.test(openingTag(button))),"real payment must remain disabled");
    assert.ok(hasValue(html,"data-premium-payment","premium"),"NOVA remains available through its selector");
    assert.doesNotMatch(html,/data-buy-premium-pack/);
    assert.doesNotMatch(html,/data-(?:checkout|pay-real|buy-real|purchase-real)/);
  }
});

test("NOVA rows and details use the real Premium and reputation price, including combined adjustments", ()=>{
  const scenarios = [
    {player:{...activePlayer,premiumUntil:0},prices:[20_000,75_000]},
    {player:{...activePlayer},prices:[19_000,71_250]},
    {player:{...activePlayer,reputation:-10_000},prices:[20_900,78_375]},
    {player:{...activePlayer,premiumUntil:0,reputation:-100_000},prices:[24_000,90_000]},
    {player:{...activePlayer,reputation:-400_000},prices:[28_500,106_875]}
  ];
  for(const {player,prices} of scenarios){
    const profile = {player};
    const list = pureRender(renderPremiumPassStore,profile,{payment:"premium",now});
    for(const [index,pack] of premiumShopPacks.entries()){
      const expected = prices[index];
      assert.equal(getShopCurrencyPrice("premium",pack.price,player),expected);
      assert.ok(compactText(list).includes(`${expected}NOVA`),`${pack.id}: missing list amount ${expected}`);
      const detail = pureRender(renderPremiumPassModal,profile,{kind:"premium",id:pack.id},{payment:"premium",now});
      assert.ok(compactText(detail).includes(`${expected}NOVA`),`${pack.id}: missing detail amount ${expected}`);
      assert.equal(enabledActions(detail,"data-buy-premium-pack").length,1);
      assert.ok(hasValue(detail,"data-buy-premium-pack",pack.id));
    }
  }
});

test("NOVA activation becomes available at the exact adjusted balance rather than the catalogue amount", ()=>{
  for(const pack of premiumShopPacks){
    const player = {...activePlayer,reputation:-10_000};
    const cost = getShopCurrencyPrice("premium",pack.price,player);
    for(const [balance,enabled] of [[cost-1,false],[cost,true]]){
      const profile = {player:{...player,premium:balance}};
      const html = pureRender(renderPremiumPassModal,profile,{kind:"premium",id:pack.id},{payment:"premium",now});
      assert.equal(enabledActions(html,"data-buy-premium-pack").length,enabled ? 1 : 0,`${pack.id}: balance ${balance}`);
      if(!enabled) assert.match(normalizedText(html),/nova insuffisant/);
    }
  }
});

test("an existing Premium subscription remains extendable rather than treated as an owned one-time pack", ()=>{
  const profile = {
    player:{...activePlayer},
    premiumPackPurchases:premiumShopPacks.map(pack=>pack.id),
    starterPackPurchases:["starter_razorion"],
    premiumRewardState:{monthKey:"2026-10",claimedDays:[1,2],lastClaimDate:"2026-10-23"}
  };
  for(const pack of premiumShopPacks){
    const html = pureRender(renderPremiumPassModal,profile,{kind:"premium",id:pack.id},{payment:"premium",now});
    assert.equal(enabledActions(html,"data-buy-premium-pack").length,1);
    assert.match(normalizedText(html),/(?:s'ajoute|s’ajoute|prolong|cumul)/);
  }
});

test("all-benefits details expose the nine real Premium benefits without creating purchase or reward actions", ()=>{
  const profile = {player:{...activePlayer}};
  const html = pureRender(renderPremiumPassModal,profile,{kind:"premium-benefits",id:"all"},{now});
  assert.equal(premiumFeatureList.length,9);
  for(const feature of premiumFeatureList){
    assert.ok(normalizedText(html).includes(normalizedText(feature)),feature);
  }
  assert.doesNotMatch(html,/data-(?:buy|checkout|pay-real|purchase|claim)-/);
});

test("the Premium page keeps the real 28-day calendar reachable through existing shop navigation", ()=>{
  const html = pureRender(renderPremiumPassStore,{player:{...activePlayer}},{now});
  assert.ok(hasValue(html,"data-store-tab","rewards"));
  assert.match(textContent(html),/28 jours/);
  assert.match(normalizedText(html),/(?:s'ajoute|s’ajoute|prolong|cumul)/);
  assert.ok(/\sdata-premium-benefits(?:[\s=>])/.test(html));
});

test("changing the displayed payment mode changes UI state only, preserving an open pass and the profile", ()=>{
  const store = {
    state:{player:{...activePlayer},inventory:[{id:"laser_mk3",count:2}]},
    storeModal:{kind:"premium",id:"premium_month"},
    premiumStorePayment:"real"
  };
  const before = structuredClone(store.state);
  const modal = structuredClone(store.storeModal);
  let renders = 0;
  const context = {store,render(){renders+=1;}};
  for(const mode of ["premium","real"]){
    assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-payment]",{premiumPayment:mode}),context),true);
    assert.equal(store.premiumStorePayment,mode);
    assert.deepEqual(store.state,before);
    assert.deepEqual(store.storeModal,modal);
  }
  assert.equal(renders,2);
});

test("opening all Premium benefits changes only the modal presentation state", ()=>{
  const store = {state:{player:{...activePlayer}},storeModal:null,premiumStorePayment:"premium"};
  const before = structuredClone(store.state);
  let renders = 0;
  assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-benefits]",{premiumBenefits:""}),{store,render(){renders+=1;}}),true);
  assert.deepEqual(store.storeModal,{kind:"premium-benefits",id:"all"});
  assert.equal(store.premiumStorePayment,"premium");
  assert.deepEqual(store.state,before);
  assert.equal(renders,1);
});

test("unknown pass details and invalid payment interactions remain inert", ()=>{
  const profile = {player:{...activePlayer}};
  for(const modal of [{kind:"premium",id:"unknown"},{kind:"starter",id:"premium_week"},{kind:"unknown",id:"all"}]){
    assert.equal(pureRender(renderPremiumPassModal,profile,modal,{now}),"");
  }
  const store = {state:profile,storeModal:null,premiumStorePayment:"real"};
  const before = structuredClone(store);
  let renders = 0;
  const context = {store,render(){renders+=1;}};
  for(const payment of ["", "euros", "nova", "checkout", "premium ", "<script>"]){
    assert.equal(handlePremiumPassInteraction(eventFor("[data-premium-payment]",{premiumPayment:payment}),context),false);
    assert.deepEqual(store,before);
  }
  assert.equal(handlePremiumPassInteraction(eventFor("[data-unrelated]",{}),context),false);
  assert.equal(renders,0);
});
