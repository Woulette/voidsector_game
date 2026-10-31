import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { ammoTypes, equipment } from "../../src/data/catalog.js";
import { novaCurrencyPacks, premiumRewardCalendar, premiumRewardMonthKey } from "../../src/data/premium.js";
import { getSupportRewardLines, handleSupportStoreInteraction, renderStoreNavigation, renderSupportStorefront, renderSupportStoreModal } from "../../src/ui/supportStore.js";

const now = Date.UTC(2026,9,24,12);
const month = premiumRewardMonthKey(now);
const player = {premium:10_000,premiumUntil:now+30*86_400_000,premiumGoldUntil:0};
const countClaims = html=>(String(html).match(/data-claim-premium-reward/g) || []).length;
const text = html=>String(html).replace(/<[^>]*>/g," ").replace(/\s/g,"");

test("the approved six NOVA reserves keep the existing commercial euro endings", ()=>{
  assert.deepEqual(novaCurrencyPacks.map(pack=>[pack.amount,pack.price]),[
    [3500,"1,99 EUR"],[12000,"5,99 EUR"],[24000,"10,99 EUR"],
    [60000,"24,99 EUR"],[125000,"49,99 EUR"],[265000,"99,99 EUR"]
  ]);
  const html = renderSupportStorefront({player},"currencies",{now});
  for(const pack of novaCurrencyPacks) assert.ok(html.includes(`data-store-offer="${pack.id}"`));
  assert.ok(existsSync(new URL("../../assets/store/nova-packs-atlas.png",import.meta.url)));
  assert.ok(existsSync(new URL("../../assets/store/credits-packs-atlas.png",import.meta.url)));
});

test("NOVA and credits selectors only alter UI state and reject unknown currencies", ()=>{
  const store = {state:{player:{...player}},storeCurrency:"nova"};
  const original = structuredClone(store.state);
  let renders = 0;
  const event = value=>({target:{closest(selector){
    return selector === "[data-store-currency]" ? {dataset:{storeCurrency:value}} : null;
  }}});
  const context = {store,render(){renders++;}};
  assert.equal(handleSupportStoreInteraction(event("credits"),context),true);
  assert.equal(store.storeCurrency,"credits");
  assert.equal(handleSupportStoreInteraction(event("nova"),context),true);
  for(const value of ["premium","real","",null]) assert.equal(handleSupportStoreInteraction(event(value),context),false);
  assert.equal(renders,2);
  assert.deepEqual(store.state,original);
});

test("a calendar OR link opens the OR formula without changing the account", ()=>{
  const store = {state:{player:{...player}},storeTab:"rewards",premiumStoreTier:"classic",storeModal:{kind:"premium-reward",id:"7"}};
  const original = structuredClone(store.state);
  let renders = 0;
  const event = {target:{closest(selector){return selector === '[data-store-premium-tier="gold"]' ? {} : null;}}};
  assert.equal(handleSupportStoreInteraction(event,{store,render(){renders++;}}),true);
  assert.equal(store.storeTab,"premium");
  assert.equal(store.premiumStoreTier,"gold");
  assert.equal(store.storeModal,null);
  assert.equal(renders,1);
  assert.deepEqual(store.state,original);
});

test("a classic subscription may inspect all OR days while only Gold can claim the selected next day", ()=>{
  const classic = {player:{...player},premiumRewardState:{monthKey:month,claimedDays:[1,2],lastClaimDate:""}};
  const gold = structuredClone(classic);
  gold.player.premiumGoldUntil=player.premiumUntil;
  const locked = renderSupportStorefront(classic,"rewards",{now});
  assert.equal((locked.match(/data-premium-calendar-day=/g) || []).length,28);
  assert.equal(countClaims(locked),0);
  assert.match(locked,/Premium OR requis/);
  const active = renderSupportStorefront(gold,"rewards",{now});
  assert.equal(countClaims(active),1);
  const future = renderSupportStorefront(gold,"rewards",{now,calendarDay:28});
  assert.equal(countClaims(future),0);
  assert.match(future,/<h3 id="scRewardDetailTitle">JOUR 28<\/h3>/);
  for(const amount of [2500,500000,2000,75]) assert.ok(text(future).includes(String(amount)));
  assert.equal(countClaims(renderSupportStoreModal(classic,{kind:"premium-reward",id:"3"},{now})),0);
});

test("each calendar ammo and item uses its real catalogue icon in the readable reward detail", ()=>{
  for(const entry of premiumRewardCalendar){
    const lines = getSupportRewardLines(entry.reward);
    for(const [id,quantity] of Object.entries(entry.reward.ammo || {})){
      const actual = ammoTypes.find(item=>item.id === id);
      assert.ok(actual?.img,id);
      assert.ok(lines.some(line=>line.quantity === quantity && line.img === actual.img),id);
    }
    for(const [id,quantity] of Object.entries(entry.reward.itemCounts || {})){
      const actual = equipment.find(item=>item.id === id);
      assert.ok(actual?.img,id);
      assert.ok(lines.some(line=>line.quantity === quantity && line.img === actual.img),id);
    }
    for(const line of lines) assert.ok(existsSync(new URL(`../../${line.img.split("?")[0]}`,import.meta.url)),line.img);
  }
});

test("navigation reports classic, OR and preserved historical entitlement distinctly", ()=>{
  const classic = renderStoreNavigation("premium",{player},{now});
  const gold = renderStoreNavigation("premium",{player:{...player,premiumGoldUntil:player.premiumUntil}},{now});
  const legacy = {...player};delete legacy.premiumGoldUntil;
  assert.doesNotMatch(classic,/class="ss-account-status[^\"]*is-gold/);
  assert.match(gold,/class="ss-account-status[^\"]*is-gold/);
  assert.match(renderStoreNavigation("premium",{player:legacy},{now}),/class="ss-account-status[^\"]*is-gold/);
  assert.match(gold,/Calendrier OR/);
});
