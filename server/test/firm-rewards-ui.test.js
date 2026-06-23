import assert from "node:assert/strict";
import test from "node:test";

function storageMock(){
  const values = new Map();
  return {
    getItem:key=>values.get(String(key)) || null,
    setItem:(key, value)=>values.set(String(key), String(value)),
    removeItem:key=>values.delete(String(key))
  };
}

test("firm rewards view puts the threshold first and replaces pending/history blocks with tier gifts", async t=>{
  const previous = {
    localStorage:globalThis.localStorage,
    sessionStorage:globalThis.sessionStorage,
    window:globalThis.window,
    BroadcastChannel:globalThis.BroadcastChannel
  };
  globalThis.localStorage = storageMock();
  globalThis.sessionStorage = storageMock();
  globalThis.window = {addEventListener(){}, dispatchEvent(){}};
  globalThis.BroadcastChannel = undefined;
  t.after(()=>Object.assign(globalThis, previous));

  const { renderRewards, renderSeasonObjectiveCard } = await import("../../src/ui/renderFirm.js");
  const ranking = Array.from({length:12}, (_, index)=>({
    key:`player-${index + 1}`,
    name:`Pilote ${index + 1}`,
    firmId:index % 2 ? "cyan" : "astra",
    rank:index + 1,
    points:20_000 - index * 500
  }));
  const html = renderRewards({
    collectiveMinimumContribution:10_000,
    individualPlayerCount:100,
    individualRanking:ranking,
    firms:[{id:"astra", rank:1, collectiveReward:{boxes:{mythic:3}}}],
    personal:{
      firmId:"astra",
      contribution:7_500,
      rank:1,
      rewardLabel:"Top 1",
      expectedReward:{premium:200_000, ammo:{ammo_x6:30_000}, firmatons:2_000},
      collectiveEligible:false,
      pendingRewards:[],
      rewardHistory:[]
    }
  });

  assert.ok(html.indexOf("Seuil saisonnier collectif") < html.indexOf("Classement et lots"));
  assert.match(html, /Pilote 1/);
  assert.match(html, /20\D000 pts/);
  assert.match(html, /Top 10%/);
  assert.match(html, /Reste des joueurs classés/);
  assert.equal((html.match(/assets\/icons\/season-gift\.svg/g) || []).length, 16);
  assert.match(html, /assets\/icons\/premium\.svg/);
  assert.match(html, /assets\/icons\/firmaton\.svg/);
  assert.match(html, /assets\/equipment\/ammo_laser_x4_same_preview\.png/);
  assert.doesNotMatch(html, /Récompenses en attente/);
  assert.doesNotMatch(html, /Derniers gains/);

  const seasonalCard = renderSeasonObjectiveCard({
    id:"season-solo-monsters-100",
    label:"Chasseur de saison",
    description:"Éliminer 100 monstres.",
    targetLabel:"Monstres",
    goal:100,
    progress:100,
    completedAt:1,
    claimable:true,
    claimed:false,
    firmPoints:250,
    reward:{firmatons:25, ammo:{ammo_x2:1_000}}
  });
  assert.match(seasonalCard, /data-firm-season-objective-claim="season-solo-monsters-100"/);
  assert.match(seasonalCard, /assets\/icons\/firmaton\.svg/);
  assert.match(seasonalCard, /assets\/equipment\/ammo_laser_x2_same_preview\.png/);
  assert.doesNotMatch(seasonalCard, /récompenses en attente/i);
});
