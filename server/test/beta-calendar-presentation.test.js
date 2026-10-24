import assert from "node:assert/strict";
import test from "node:test";
import { ammoTypes, equipment, ships } from "../../src/data/catalog.js";
import { betaRewardCalendar, getBetaRewardDateKey, getBetaRewardStatus } from "../../src/data/premium.js";
import { betaDayStatus, getBetaDayPresentation, renderBetaStoreCalendar } from "../../src/ui/betaStoreCalendar.js";

const now = Date.UTC(2026,9,24,12);
const claims = html=>(html.match(/data-claim-beta-reward/g) || []).length;
const dayMarkup = (html,day)=>html.split('<button class="sc-calendar-day ').find(markup=>markup.includes(`data-beta-calendar-day="${day}"`))?.split("</button>")[0];

test("Beta uses the official calendar layout with 25 real days and five Beta milestones", ()=>{
  const profile = {player:{credits:100,premium:200,premiumUntil:0},betaRewardState:{claimedDays:[]}};
  const before = structuredClone(profile);
  const html = renderBetaStoreCalendar(profile,{now});
  for(const name of ["sc-calendar", "sc-calendar-main", "sc-calendar-grid", "sc-calendar-day", "sc-day-head", "sc-day-art", "sc-day-label", "sc-reward-detail"]) assert.ok(html.includes(`class="${name}`));
  assert.equal((html.match(/data-beta-calendar-day=/g) || []).length,25);
  assert.equal((html.match(/is-milestone/g) || []).length,5);
  for(const day of betaRewardCalendar) assert.equal(dayMarkup(html,day.day).includes("is-milestone"),day.day % 5 === 0);
  assert.match(html,/0 \/ 25 jours/);
  assert.match(html,/<h3 id="betaRewardDetailTitle">JOUR 1<\/h3>/);
  assert.doesNotMatch(html,/Premium|mois civil|data-claim-premium|bs-today|class="bs-days"/);
  assert.equal(claims(html),1);
  assert.deepEqual(profile,before);
});

test("only the selected next day can offer a claim, even without a Premium subscription", ()=>{
  const profile = {player:{premiumUntil:0,premiumGoldUntil:0},betaRewardState:{claimedDays:[1,2],lastClaimDate:""}};
  const before = structuredClone(profile);
  assert.equal(claims(renderBetaStoreCalendar(profile,{now})),1);
  for(const calendarDay of [1,4,15,25]){
    const html = renderBetaStoreCalendar(profile,{now,calendarDay});
    assert.equal(claims(html),0);
    assert.match(html,new RegExp(`<h3 id="betaRewardDetailTitle">JOUR ${calendarDay}<\\/h3>`));
    assert.ok(dayMarkup(html,calendarDay).includes('aria-pressed="true"'));
  }
  assert.equal(claims(renderBetaStoreCalendar(profile,{now,calendarDay:3})),1);
  for(const calendarDay of [0,26,"bad",Infinity]){
    const html = renderBetaStoreCalendar(profile,{now,calendarDay});
    assert.equal(claims(html),1);
    assert.match(html,/<h3 id="betaRewardDetailTitle">JOUR 3<\/h3>/);
  }
  assert.deepEqual(profile,before);
});

test("claimed today and completed profiles cannot advertise another reward action", ()=>{
  const profile = {betaRewardState:{claimedDays:[1,2,3],lastClaimDate:getBetaRewardDateKey(now)}};
  const before = structuredClone(profile);
  const html = renderBetaStoreCalendar(profile,{now});
  assert.equal(claims(html),0);
  assert.equal((html.match(/class="sc-calendar-day is-claimed/g) || []).length,3);
  assert.match(html,/Jour 4 :[^\"]*Disponible demain/);
  assert.match(html,/Récompense du jour récupérée/);
  assert.doesNotMatch(html,/is-today/);
  assert.equal(betaDayStatus(betaRewardCalendar[2],getBetaRewardStatus(profile,now)),"Récompense reçue");
  assert.deepEqual(profile,before);
  const completed = {betaRewardState:{claimedDays:Array.from({length:25},(_,index)=>index+1)}};
  const completeHtml = renderBetaStoreCalendar(completed,{now});
  assert.equal(claims(completeHtml),0);
  assert.equal((completeHtml.match(/class="sc-calendar-day is-claimed/g) || []).length,25);
  assert.match(completeHtml,/25 \/ 25 jours/);
  assert.match(completeHtml,/Calendrier terminé/);
});

test("day 15 shows all three actual random rewards without offering a choice or claiming ownership", ()=>{
  const profile = {betaRewardState:{claimedDays:Array.from({length:14},(_,index)=>index+1)}};
  const before = structuredClone(profile);
  const item = getBetaDayPresentation(betaRewardCalendar[14]);
  assert.deepEqual(item.choices.map(ship=>ship.id),betaRewardCalendar[14].reward.shipRandom.shipIds);
  const html = renderBetaStoreCalendar(profile,{now,calendarDay:15});
  const detail = html.split('<aside class="sc-reward-detail"')[1];
  for(const id of betaRewardCalendar[14].reward.shipRandom.shipIds){
    const ship = ships.find(entry=>entry.id === id);
    assert.ok(detail.includes(ship.name));
    assert.ok(detail.includes(`src="${ship.img}"`));
  }
  assert.match(detail,/attribué aléatoirement/);
  assert.equal(claims(html),1);
  assert.doesNotMatch(detail,/data-beta-ship-choice|data-ship-choice|Déjà acquis|Vaisseau reçu/);
  assert.deepEqual(profile,before);
});

test("Beta reward presentation resolves actual NOVA, ammunition and equipment amounts and icons", ()=>{
  for(const day of betaRewardCalendar){
    const item = getBetaDayPresentation(day);
    if(day.reward.premium){assert.equal(item.quantity,day.reward.premium);assert.equal(item.img,"assets/icons/premium.svg");}
    for(const [id,quantity] of Object.entries(day.reward.ammo || {})){
      assert.equal(item.quantity,quantity);
      assert.equal(item.img,ammoTypes.find(entry=>entry.id === id).img);
    }
    for(const [id,quantity] of Object.entries(day.reward.itemCounts || {})){
      assert.equal(item.quantity,quantity);
      assert.equal(item.img,equipment.find(entry=>entry.id === id).img);
    }
  }
});
