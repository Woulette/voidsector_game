import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { applyFirmQuestClaimReward, buyFirmShopItem, openFirmBox } from "../src/firms/firmEconomy.js";
import { FIRM_COLLECTIVE_MIN_CONTRIBUTION, FIRM_SEASON_MS, FIRM_SHOP_CATALOG, getFirmQuestFirmPoints } from "../src/firms/firmRules.js";
import { buildFirmSeasonObjectiveSnapshot, claimFirmSeasonObjectiveReward, recordFirmSeasonObjectiveProgress } from "../src/firms/firmObjectives.js";
import { buildFirmQuestSnapshot, buildFirmSeasonalQuestSnapshot, claimFirmQuestReward, ensureFirmDailyQuests, ensureFirmSeasonalQuests, recordFirmQuestProgress } from "../src/firms/firmQuests.js";
import { buildInitialFirmState } from "../src/firms/firmState.js";
import { createFirmWarManager } from "../src/firms/firmWar.js";
import { preserveProtectedOwnership, sanitizeProfile } from "../src/players/profileSanitize.js";

test("firm shop uses protected firmatons and reputation gates", ()=>{
  const profile = sanitizeProfile({player:{reputation:299_999}, firmatons:1_000});
  assert.equal(buyFirmShopItem(profile, "box_veryRare").ok, false);
  profile.player.reputation = 300_000;
  const result = buyFirmShopItem(profile, "box_veryRare");
  assert.equal(result.ok, true);
  assert.equal(result.item.price, 270);
  assert.equal(profile.firmatons, 730);
  assert.equal(profile.firmBoxes.veryRare, 1);
});

test("firm shop can sell non-box rewards through the protected economy", ()=>{
  const profile = sanitizeProfile({player:{reputation:2_000_000}, firmatons:1_000, cargoHold:{fragment_noyau_stellaire:0}});
  const result = buyFirmShopItem(profile, "mythic_fragment_noyau_stellaire");
  assert.equal(result.ok, true);
  assert.equal(result.item.price, 640);
  assert.equal(profile.firmatons, 360);
  assert.equal(profile.cargoHold.fragment_noyau_stellaire, 1);
});

test("firm shop catalog exposes nine offers per rarity across three reputation stages", ()=>{
  for(const rarity of ["common", "rare", "veryRare", "elite", "mythic"]){
    const items = FIRM_SHOP_CATALOG.filter(item=>item.rarity === rarity);
    assert.equal(items.length, 9);
    for(const stage of [1, 2, 3]){
      assert.equal(items.filter(item=>item.stage === stage).length, 3);
    }
  }
});

test("firm shop rarity zones only sell chests and crafting resources", ()=>{
  assert.equal(FIRM_SHOP_CATALOG.some(item=>item.kind === "ammo"), false);
});

test("firm shop box offers use chest SVG assets", ()=>{
  for(const item of FIRM_SHOP_CATALOG.filter(entry=>entry.kind === "box")){
    assert.match(item.asset, /^assets\/firm\/chests\/chest_(common|rare|veryRare|elite|mythic)\.svg$/);
  }
});

test("firm shop contains one chest and eight unit crafting resources per rarity", ()=>{
  for(const rarity of ["common", "rare", "veryRare", "elite", "mythic"]){
    const items = FIRM_SHOP_CATALOG.filter(item=>item.rarity === rarity);
    const materialItems = items.filter(item=>item.kind === "material");
    assert.equal(items.filter(item=>item.kind === "box").length, 1);
    assert.equal(materialItems.length, 8);
    assert.ok(materialItems.every(item=>item.asset.startsWith(`assets/resources/${rarity}/`)));
    assert.ok(materialItems.every(item=>Object.values(item.reward.materials).every(amount=>amount === 1)));
  }
});

test("common firm shop sells crafting resources one unit at a time", ()=>{
  const profile = sanitizeProfile({player:{reputation:50_000}, firmatons:100, cargoHold:{cables_cuivre:0}});
  const result = buyFirmShopItem(profile, "common_copper_cables");
  assert.equal(result.ok, true);
  assert.equal(profile.cargoHold.cables_cuivre, 1);
});

test("firm box opening consumes one box and applies a server reward", ()=>{
  const profile = sanitizeProfile({player:{premium:0}, firmBoxes:{mythic:1}});
  const result = openFirmBox(profile, "mythic", {random:()=>0});
  assert.equal(result.ok, true);
  assert.equal(result.boxRarity, "mythic");
  assert.equal(result.rewardRarity, "mythic");
  assert.equal(profile.firmBoxes.mythic, 0);
  assert.equal(profile.player.premium, 50_000);
});

test("profile save cannot forge protected firm economy fields", ()=>{
  const existing = sanitizeProfile({
    firmatons:42,
    firmBoxes:{mythic:2},
    firmRewardHistory:[{id:"old", label:"Ancien gain", reward:{firmatons:10}, createdAt:1}]
  });
  const incoming = sanitizeProfile({
    firmatons:999_999,
    firmBoxes:{mythic:99},
    firmRewardHistory:[{id:"forged", label:"Faux gain", reward:{firmatons:999}, createdAt:2}]
  });
  const preserved = preserveProtectedOwnership(incoming, existing);
  assert.equal(preserved.firmatons, 42);
  assert.equal(preserved.firmBoxes.mythic, 2);
  assert.equal(preserved.firmRewardHistory[0].id, "old");
});

test("firm daily quests progress automatically without personal quest rewards", ()=>{
  const now = new Date(2026, 5, 12, 7).getTime();
  const state = buildInitialFirmState(now);
  const contributor = {key:"account:daily", name:"Daily", firmId:"astra"};
  ensureFirmDailyQuests(state, now);
  const questId = Object.keys(state.dailyQuests).find(id=>id.includes("orbs"));
  assert.ok(questId);
  recordFirmQuestProgress(state, {contributor, type:"monster", target:"sentinel_orb", amount:10, now});
  const snapshot = buildFirmQuestSnapshot(state, contributor.key, contributor.firmId, now).find(quest=>quest.id === questId);
  assert.equal(snapshot.accepted, true);
  assert.equal(snapshot.firms.astra.progress, 10);
  assert.equal(snapshot.player.contribution, 10);
  assert.equal(snapshot.player.firmatons, 0);
  assert.equal(snapshot.player.expectedReward, null);
});

test("firm daily quest snapshot shows open quests and next locked rotations", ()=>{
  const now = new Date(2026, 5, 12, 19).getTime();
  const state = buildInitialFirmState(now);
  ensureFirmDailyQuests(state, now);
  const snapshot = buildFirmQuestSnapshot(state, "account:daily", "astra", now);
  assert.equal(snapshot.length, 6);
  assert.deepEqual(snapshot.filter(quest=>!quest.locked).map(quest=>quest.definitionId), ["orbs", "vorak", "portals"]);
  assert.equal(snapshot.filter(quest=>quest.locked).length, 3);
  assert.ok(snapshot.filter(quest=>quest.locked).every(quest=>quest.startedAt > now));
});

test("firm daily quest points keep the 50 percent tier until the 24 hour limit", ()=>{
  assert.equal(getFirmQuestFirmPoints(25_000, 5 * 60 * 60 * 1000), 25_000);
  assert.equal(getFirmQuestFirmPoints(25_000, 7 * 60 * 60 * 1000), 18_750);
  assert.equal(getFirmQuestFirmPoints(25_000, 18 * 60 * 60 * 1000), 12_500);
  assert.equal(getFirmQuestFirmPoints(25_000, 24 * 60 * 60 * 1000), 0);
});

test("completed firm quest reward can be claimed once without personal contribution", ()=>{
  const now = new Date(2026, 5, 12, 6, 10).getTime();
  const state = buildInitialFirmState(now);
  const contributor = {key:"account:finisher", name:"Finisher", firmId:"astra"};
  const claimant = {key:"account:claimant", name:"Claimant", firmId:"astra"};
  ensureFirmDailyQuests(state, now);
  const questId = Object.keys(state.dailyQuests).find(id=>id.includes("orbs"));
  assert.ok(questId);
  recordFirmQuestProgress(state, {contributor, type:"monster", target:"sentinel_orb", amount:5_000, now});
  const claimed = claimFirmQuestReward(state, {questId, contributor:claimant, now:now + 1_000});
  assert.equal(claimed.ok, true);
  assert.equal(claimed.reward.firmatons, 5);
  assert.equal(claimFirmQuestReward(state, {questId, contributor:claimant, now:now + 2_000}).ok, false);
  const snapshot = buildFirmQuestSnapshot(state, claimant.key, claimant.firmId, now + 2_000).find(quest=>quest.id === questId);
  assert.equal(snapshot.claimed, true);
  assert.equal(snapshot.claimable, false);
  const profile = sanitizeProfile({firmatons:0});
  const applied = applyFirmQuestClaimReward(profile, claimed);
  assert.equal(applied.ok, true);
  assert.equal(profile.firmatons, 5);
});

test("firm weekly quests progress automatically and only award firm points", ()=>{
  const now = new Date(2026, 5, 12, 7).getTime();
  const state = buildInitialFirmState(now);
  const contributor = {key:"account:season", name:"Season", firmId:"astra"};
  ensureFirmSeasonalQuests(state, now);
  const questId = Object.keys(state.seasonalQuests).find(id=>id.includes("season-monsters"));
  assert.ok(questId);
  recordFirmQuestProgress(state, {contributor, type:"monster", target:"sentinel_orb", amount:300_000, now});
  const snapshot = buildFirmSeasonalQuestSnapshot(state, contributor.key, contributor.firmId, now).find(quest=>quest.id === questId);
  assert.equal(snapshot.kind, "weekly");
  assert.equal(snapshot.firms.astra.progress, 300_000);
  assert.equal(snapshot.firms.astra.firmPointsAwarded, 150_000);
  assert.equal(state.pendingRewards[contributor.key], undefined);
  assert.equal(snapshot.player.expectedReward, null);
});

test("firm seasonal personal objectives award points once and expose a direct claim", ()=>{
  const now = new Date(2026, 5, 12, 7).getTime();
  const state = buildInitialFirmState(now);
  const contributor = {key:"account:solo", name:"Solo", firmId:"astra"};
  const updates = recordFirmSeasonObjectiveProgress(state, {
    contributor,
    type:"monster",
    target:"chasseur_spectral",
    amount:100,
    now
  });
  const snapshot = buildFirmSeasonObjectiveSnapshot(state, contributor.key, contributor.firmId).find(objective=>objective.id === "season-solo-monsters-100");
  assert.equal(updates.length, 1);
  assert.equal(snapshot.completedAt, now);
  assert.equal(snapshot.progress, 100);
  assert.equal(snapshot.claimable, true);
  assert.equal(snapshot.claimed, false);
  assert.equal(state.points.astra, 250);
  assert.equal(state.contributions[contributor.key].points, 250);
  assert.equal(state.pendingRewards[contributor.key], undefined);
  recordFirmSeasonObjectiveProgress(state, {
    contributor,
    type:"monster",
    target:"chasseur_spectral",
    amount:100,
    now:now + 1_000
  });
  assert.equal(state.points.astra, 250);
  const claimed = claimFirmSeasonObjectiveReward(state, {
    objectiveId:"season-solo-monsters-100",
    contributor,
    now:now + 2_000
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.reward.ammo.ammo_x2, 1_000);
  const claimedProfile = sanitizeProfile({firmatons:0, ammoInventory:{ammo_x2:0}});
  const appliedSeasonal = applyFirmQuestClaimReward(claimedProfile, claimed);
  assert.equal(appliedSeasonal.ok, true);
  assert.equal(claimedProfile.firmatons, 25);
  assert.equal(claimedProfile.ammoInventory.ammo_x2, 1_000);
  assert.equal(claimedProfile.firmRewardHistory.at(-1).id, claimed.rewardId);
  assert.equal(claimFirmSeasonObjectiveReward(state, {
    objectiveId:"season-solo-monsters-100",
    contributor,
    now:now + 3_000
  }).ok, false);
  const claimedSnapshot = buildFirmSeasonObjectiveSnapshot(state, contributor.key, contributor.firmId).find(objective=>objective.id === "season-solo-monsters-100");
  assert.equal(claimedSnapshot.claimed, true);
  assert.equal(claimedSnapshot.claimable, false);
});

test("firm pvp anti-farm reduces repeated daily target rewards", async ()=>{
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-system-"));
  try{
    const manager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>1_000});
    await manager.load();
    const points = [];
    for(let i = 0; i < 7; i++){
      points.push(manager.recordPlayerKill({
        attacker:{key:"account:a", name:"Alpha", firmId:"astra"},
        targetKey:"account:b"
      }).points);
    }
    assert.deepEqual(points, [100, 100, 100, 100, 100, 5, 5]);
    assert.equal(manager.snapshot({playerKey:"account:a"}).personal.contribution, 1_260);
    const objective = manager.snapshot({playerKey:"account:a", profile:{player:{firmId:"astra"}}}).seasonObjectives
      .find(entry=>entry.completedAt && entry.claimable);
    assert.ok(objective);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});

test("collective season reward requires ten thousand personal points", async ()=>{
  let now = 10_000;
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-threshold-"));
  try{
    const manager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>now});
    await manager.load();
    manager.addFirmPoints("astra", FIRM_COLLECTIVE_MIN_CONTRIBUTION, {key:"account:eligible", name:"Eligible", firmId:"astra"});
    manager.addFirmPoints("astra", FIRM_COLLECTIVE_MIN_CONTRIBUTION - 1, {key:"account:short", name:"Short", firmId:"astra"});
    now += FIRM_SEASON_MS + 1;
    manager.snapshot();
    const eligible = manager.getPendingRewards("account:eligible");
    const short = manager.getPendingRewards("account:short");
    assert.equal(eligible.some(entry=>entry.source === "season-collective"), true);
    assert.equal(short.some(entry=>entry.source === "season-collective"), false);
    assert.equal(short.some(entry=>entry.source === "season-individual"), true);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});
