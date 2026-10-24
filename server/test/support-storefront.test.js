import assert from "node:assert/strict";
import test from "node:test";
import {
  creditCurrencyPacks,
  novaCurrencyPacks,
  premiumRewardCalendar,
  premiumRewardDateKey,
  premiumRewardMonthKey,
  premiumShopPacks,
  starterPacks,
  storeTabs
} from "../../src/data/premium.js";
import { getShopCurrencyPrice } from "../../src/shared/shopPricing.js";
import {
  handleSupportStoreInteraction,
  renderStoreNavigation,
  renderSupportStorefront,
  renderSupportStoreModal
} from "../../src/ui/supportStore.js";

const now = Date.UTC(2026, 9, 24, 12);
const month = premiumRewardMonthKey(now);
const activePlayer = {premium:1_000_000, premiumUntil:now + 90 * 86_400_000, reputation:0};

function textContent(html){
  return String(html).replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/g, " ").replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function compactText(html){ return textContent(html).replace(/\s/g, ""); }
function buttons(html){ return String(html).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []; }
function openingTag(html){ return String(html).match(/^<[^>]*>/)?.[0] || ""; }
function hasAttribute(button, name){ return new RegExp(`\\s${name}(?:[\\s=>])`).test(openingTag(button)); }
function enabledActions(html, name){
  return buttons(html).filter(button=>hasAttribute(button, name) && !/\sdisabled(?:[\s=>])/.test(openingTag(button)));
}
function hasValue(html, name, value){ return String(html).includes(`${name}="${value}"`); }
function assertEuroPrice(html, price){
  const digits = String(price).replace(/ EUR$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(textContent(html), new RegExp(`${digits}\\s*(?:EUR|€)`));
}

function pureRender(renderer, profile, ...args){
  const before = structuredClone(profile);
  const html = renderer(profile, ...args);
  assert.deepEqual(profile, before, "rendering must not alter the canonical profile");
  assert.equal(typeof html, "string");
  return html;
}

test("support navigation exposes the five real sections and preserves a Beta-only presentation", ()=>{
  const profile = {player:{...activePlayer}};
  const before = structuredClone(profile);
  const full = renderStoreNavigation("premium", profile, {now});
  assert.equal((full.match(/data-store-tab=/g) || []).length, 5);
  for(const tab of storeTabs) assert.ok(hasValue(full, "data-store-tab", tab.id), tab.id);
  const betaOnly = renderStoreNavigation("beta", profile, {now, betaOnly:true});
  assert.equal((betaOnly.match(/data-store-tab=/g) || []).length, 1);
  assert.ok(hasValue(betaOnly, "data-store-tab", "beta"));
  assert.deepEqual(profile, before);
});

test("Premium pass details distinguish euro offers from server-priced NOVA activations", ()=>{
  const profile = {player:{...activePlayer, premiumUntil:0, reputation:0}};
  const html = pureRender(renderSupportStorefront, profile, "premium", {now});
  for(const pack of premiumShopPacks){
    assert.ok(hasValue(html, "data-store-offer", pack.id), pack.id);
    assertEuroPrice(html, pack.realPrice);
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"premium", id:pack.id}, {now});
    assertEuroPrice(detail, pack.realPrice);
    assert.ok(compactText(detail).includes(String(getShopCurrencyPrice("premium", pack.price, profile.player))));
    assert.equal(enabledActions(detail, "data-buy-premium-pack").length, 1);
    assert.ok(hasValue(detail, "data-buy-premium-pack", pack.id));
    assert.doesNotMatch(detail, /data-(?:checkout|pay-real|buy-real|purchase-real)/);
  }
});

test("the NOVA pass amount includes existing Premium reductions and reputation adjustments", ()=>{
  for(const player of [
    {...activePlayer},
    {...activePlayer, reputation:-10_000},
    {...activePlayer, premiumUntil:0, reputation:-100_000}
  ]){
    for(const pack of premiumShopPacks){
      const profile = {player};
      const html = pureRender(renderSupportStoreModal, profile, {kind:"premium", id:pack.id}, {now});
      const expected = getShopCurrencyPrice("premium", pack.price, player);
      assert.ok(compactText(html).includes(String(expected)), `${pack.id}: expected ${expected} NOVA`);
      assert.equal(enabledActions(html, "data-buy-premium-pack").length, 1);
    }
  }
});

test("NOVA activation is unavailable below the actual pass price and available at the exact balance", ()=>{
  for(const pack of premiumShopPacks){
    const player = {...activePlayer, reputation:-10_000};
    const cost = getShopCurrencyPrice("premium", pack.price, player);
    const insufficient = pureRender(renderSupportStoreModal, {player:{...player,premium:cost-1}}, {kind:"premium",id:pack.id}, {now});
    assert.equal(enabledActions(insufficient, "data-buy-premium-pack").length, 0);
    const exact = pureRender(renderSupportStoreModal, {player:{...player,premium:cost}}, {kind:"premium",id:pack.id}, {now});
    assert.equal(enabledActions(exact, "data-buy-premium-pack").length, 1);
  }
});

test("the twelve real-money currency offers preserve configured quantities and prices without purchase commands", ()=>{
  const profile = {player:{...activePlayer}};
  const html = pureRender(renderSupportStorefront, profile, "currencies", {now});
  const packs = [...novaCurrencyPacks, ...creditCurrencyPacks];
  assert.equal(packs.length, 12);
  assert.equal((html.match(/data-store-offer-kind="currency"/g) || []).length, packs.length);
  for(const pack of packs){
    assert.ok(hasValue(html, "data-store-offer", pack.id), pack.id);
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"currency",id:pack.id}, {now});
    assertEuroPrice(detail, pack.price);
    assert.ok(compactText(detail).includes(String(pack.amount)));
    assert.doesNotMatch(detail, /data-(?:buy|checkout|pay-real|purchase)-/);
  }
  assert.doesNotMatch(html, /data-(?:buy|checkout|pay-real|purchase)-/);
});

test("both Starter packs expose their actual contents while real-money activation remains unavailable", ()=>{
  const profile = {player:{...activePlayer}, starterPackPurchases:[]};
  const html = pureRender(renderSupportStorefront, profile, "starters", {now});
  assert.equal((html.match(/data-store-offer-kind="starter"/g) || []).length, 2);
  for(const pack of starterPacks){
    assert.ok(hasValue(html, "data-store-offer", pack.id), pack.id);
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"starter",id:pack.id}, {now});
    assertEuroPrice(detail, pack.price);
    for(const content of pack.contents){
      assert.ok(textContent(detail).includes(content.label), `${pack.id}: ${content.label}`);
      assert.ok(compactText(detail).includes(content.quantity.replace(/\s/g,"")));
    }
    assert.doesNotMatch(detail, /data-(?:buy|checkout|pay-real|purchase)-/);
  }
});

test("historical Starter ownership is recognized without restoring a second purchase action", ()=>{
  for(const purchasedId of ["starter_astralis", "starter_astra_3d"]){
    const profile = {player:{...activePlayer}, starterPackPurchases:[purchasedId]};
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"starter",id:"starter_astralis"}, {now});
    assert.match(textContent(detail), /d[ée]j[àa]\s+(?:achet[ée]|utilis[ée]|activ[ée]|acquis)|achat unique (?:utilis[ée]|d[ée]j[àa])/i);
    assert.doesNotMatch(detail, /data-(?:buy|checkout|pay-real|purchase)-/);
  }
});

test("the Premium calendar exposes all 28 real rewards and every component of compound reward details", ()=>{
  const profile = {player:{...activePlayer}};
  const html = pureRender(renderSupportStorefront, profile, "rewards", {now});
  assert.equal((html.match(/data-premium-calendar-day=/g) || []).length, 28);
  for(const entry of premiumRewardCalendar) assert.ok(hasValue(html,"data-premium-calendar-day",entry.day));
  for(const day of [14,28]){
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:String(day)}, {now});
    const reward = premiumRewardCalendar[day-1].reward;
    for(const amount of [reward.credits,reward.premium,...Object.values(reward.ammo || {})].filter(Boolean)){
      assert.ok(compactText(detail).includes(String(amount)), `day ${day}: missing ${amount}`);
    }
    assert.doesNotMatch(detail, /data-claim-premium-reward/);
  }
});

test("inactive Premium accounts may inspect the calendar but cannot recover a reward", ()=>{
  const profile = {player:{premiumUntil:0, premiumActive:false}};
  const html = pureRender(renderSupportStorefront, profile, "rewards", {now});
  assert.equal((html.match(/data-premium-calendar-day=/g) || []).length, 28);
  assert.equal(enabledActions(html, "data-claim-premium-reward").length, 0);
  const detail = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:"1"}, {now});
  assert.equal(enabledActions(detail, "data-claim-premium-reward").length, 0);
});

test("an active Premium account may recover only the next unclaimed reward", ()=>{
  const profile = {player:{...activePlayer},premiumRewardState:{monthKey:month,claimedDays:[1,2],lastClaimDate:""}};
  const html = pureRender(renderSupportStorefront, profile, "rewards", {now});
  assert.equal(enabledActions(html, "data-claim-premium-reward").length, 1);
  for(const day of [1,2,4,14,28]){
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:String(day)}, {now});
    assert.equal(enabledActions(detail, "data-claim-premium-reward").length, 0, `day ${day}`);
  }
  const current = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:"3"}, {now});
  assert.equal(enabledActions(current, "data-claim-premium-reward").length, 1);
});

test("a reward already recovered today blocks a second claim and leaves the next day inspectable", ()=>{
  const profile = {player:{...activePlayer},premiumRewardState:{monthKey:month,claimedDays:[1,2,3],lastClaimDate:premiumRewardDateKey(now)}};
  const html = pureRender(renderSupportStorefront, profile, "rewards", {now});
  assert.equal(enabledActions(html, "data-claim-premium-reward").length, 0);
  for(const day of [3,4]){
    const detail = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:String(day)}, {now});
    assert.equal(enabledActions(detail, "data-claim-premium-reward").length, 0);
  }
});

test("completed monthly calendars stay blocked until the real next calendar month", ()=>{
  const profile = {player:{...activePlayer},premiumRewardState:{monthKey:month,claimedDays:Array.from({length:28},(_,index)=>index+1),lastClaimDate:premiumRewardDateKey(now)}};
  const completed = pureRender(renderSupportStorefront, profile, "rewards", {now});
  assert.equal(enabledActions(completed, "data-claim-premium-reward").length, 0);
  const nextMonth = Date.UTC(2026,10,1,12);
  const reset = pureRender(renderSupportStorefront, profile, "rewards", {now:nextMonth});
  assert.equal(enabledActions(reset, "data-claim-premium-reward").length, 1);
  const first = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:"1"}, {now:nextMonth});
  assert.equal(enabledActions(first, "data-claim-premium-reward").length, 1);
  const future = pureRender(renderSupportStoreModal, profile, {kind:"premium-reward",id:"28"}, {now:nextMonth});
  assert.equal(enabledActions(future, "data-claim-premium-reward").length, 0);
});

test("opening a valid Premium day alters presentation state only and rejects malformed days", ()=>{
  const store = {state:{player:{...activePlayer},premiumRewardState:{monthKey:month,claimedDays:[1]}},storeModal:null};
  const before = structuredClone(store.state);
  let renders = 0;
  const context = {store,render(){renders+=1;}};
  const event = id=>({target:{closest(selector){
    return selector === "[data-premium-calendar-day]" ? {dataset:{premiumCalendarDay:String(id)}} : null;
  }}});
  assert.equal(handleSupportStoreInteraction(event(28), context), true);
  assert.deepEqual(store.storeModal, {kind:"premium-reward",id:"28"});
  assert.equal(renders, 1);
  assert.deepEqual(store.state, before);
  for(const id of [0,29,"no-day",1.5]) assert.equal(handleSupportStoreInteraction(event(id), context), false);
  assert.equal(renders, 1);
  assert.deepEqual(store.state, before);
  assert.equal(handleSupportStoreInteraction({target:{closest(){return null;}}}, context), false);
});

test("unknown offers and invalid Premium calendar details produce no actionable modal", ()=>{
  for(const modal of [
    {kind:"premium",id:"unknown"}, {kind:"currency",id:"unknown"}, {kind:"starter",id:"unknown"},
    {kind:"premium-reward",id:"0"}, {kind:"premium-reward",id:"29"}, {kind:"premium-reward",id:"1.5"},
    {kind:"unknown",id:"premium_week"}
  ]) assert.equal(pureRender(renderSupportStoreModal, {player:{...activePlayer}}, modal, {now}), "");
});
