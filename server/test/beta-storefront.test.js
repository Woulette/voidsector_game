import assert from "node:assert/strict";
import test from "node:test";
import { BETA_STORE_ONLY, betaPacks, betaRewardCalendar, claimBetaRewardState } from "../../src/data/premium.js";
import { getBetaDayPresentation, handleBetaStoreInteraction, renderBetaStorefront, renderBetaStoreModal } from "../../src/ui/betaStore.js";

const now = Date.UTC(2026,9,23,12);

test("the Beta storefront shows the three approved packs and all 25 real rewards", ()=>{
  const profile = {player:{credits:123, premium:456}, betaPackPurchases:[], betaRewardState:{claimedDays:[]}};
  const before = structuredClone(profile);
  const html = renderBetaStorefront(profile, {now});
  assert.equal(BETA_STORE_ONLY, false);
  assert.equal((html.match(/data-store-offer-kind="beta"/g) || []).length, 3);
  assert.equal((html.match(/data-beta-calendar-day=/g) || []).length, 25);
  for(const value of ["Valkyrie", "Razorion", "Astralis", "1,49 €", "4,99 €", "9,99 €"]) assert.ok(html.includes(value));
  for(const pack of betaPacks){
    const card = html.split("<article").find(markup=>markup.includes(`data-store-offer="${pack.id}"`));
    assert.ok(card);
    for(const item of pack.contents){
      assert.ok(card.includes(`title="${item.label} · ${item.quantity}"`), `${pack.name}: ${item.label} and its quantity remain visible`);
      assert.ok(card.includes(`src="${item.img}"`), `${pack.name}: real illustration for ${item.label}`);
    }
  }
  assert.doesNotMatch(html, /data-store-tab|Pack Beta Commandant/);
  assert.deepEqual(profile, before);
});

test("a real daily claim updates received days and labels the next reward as tomorrow", ()=>{
  const profile = {betaRewardState:{claimedDays:[1,2,3], lastClaimDate:""}};
  const initial = renderBetaStorefront(profile, {now});
  assert.equal((initial.match(/class="bs-day [^"]*is-today/g) || []).length, 1);
  assert.equal(claimBetaRewardState(profile, now).ok, true);
  const html = renderBetaStorefront(profile, {now});
  assert.match(html, /4 \/ 25 jours/);
  assert.match(html, /data-claim-beta-reward type="button" disabled/);
  assert.match(html, /aria-label="Jour 5 :[^\"]*Disponible demain/);
  assert.doesNotMatch(html, /class="bs-day [^"]*is-today/);
  assert.equal(claimBetaRewardState(profile, now).ok, false);
});

test("completed calendars cannot advertise another daily claim", ()=>{
  const profile = {betaRewardState:{claimedDays:Array.from({length:25},(_,index)=>index+1)}};
  const html = renderBetaStorefront(profile, {now});
  assert.match(html, /25 \/ 25 jours/);
  assert.match(html, /CALENDRIER TERMINÉ/);
  assert.equal((html.match(/class="bs-day is-claimed/g) || []).length, 25);
  assert.match(html, /data-claim-beta-reward type="button" disabled/);
  assert.doesNotMatch(renderBetaStoreModal(profile, {kind:"beta-reward",id:"25"}, {now}), /data-claim-beta-reward/);
});

test("pack details preserve historical ownership and the fixed Astralis content", ()=>{
  const html = renderBetaStoreModal({betaPackPurchases:["beta_commander"]}, {kind:"beta",id:"beta_commander"}, {now});
  assert.match(html, /Vaisseau Astralis/);
  assert.match(html, /x50 000/);
  assert.match(html, /data-buy-beta-pack="beta_commander" type="button" disabled/);
  assert.doesNotMatch(html, /data-beta-ship-choice|Vesperion|Nyxaris|Asterion/);
});

test("future reward details are inspectable without offering an early claim", ()=>{
  const html = renderBetaStoreModal({}, {kind:"beta-reward",id:"15"}, {now});
  for(const name of ["Vesperion", "Nyxaris", "Asterion"]) assert.ok(html.includes(name));
  assert.match(html, /aléatoirement/);
  assert.doesNotMatch(html, /data-claim-beta-reward/);
  const available = renderBetaStoreModal({}, {kind:"beta-reward",id:"1"}, {now});
  assert.match(available, /data-claim-beta-reward/);
  assert.equal(renderBetaStoreModal({}, {kind:"beta-reward",id:"999"}, {now}), "");
});

test("calendar presentation resolves existing equipment and ammunition illustrations", ()=>{
  const expected = new Map([[5,3],[10,50_000],[15,1],[20,100_000],[25,10]]);
  for(const day of betaRewardCalendar){
    const item = getBetaDayPresentation(day);
    assert.equal(item.quantity, expected.get(day.day) ?? 5_000);
    assert.ok(item.img.startsWith("assets/"));
    assert.ok(item.label);
  }
});

test("opening a day only changes presentation state and rejects invalid days", ()=>{
  const store = {state:{player:{credits:123,premium:456}},storeModal:null};
  const before = structuredClone(store.state);
  let rendered = 0;
  const context = {store,render(){rendered+=1;}};
  const event = id=>({target:{closest(){return {dataset:{betaCalendarDay:String(id)}};}}});
  assert.equal(handleBetaStoreInteraction(event(15), context), true);
  assert.deepEqual(store.storeModal, {kind:"beta-reward",id:"15"});
  assert.equal(rendered, 1);
  assert.deepEqual(store.state, before);
  assert.equal(handleBetaStoreInteraction(event(99), context), false);
  assert.equal(rendered, 1);
});
