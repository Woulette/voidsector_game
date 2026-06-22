import assert from "node:assert/strict";
import test from "node:test";
import { getFirmIndividualReward, getFirmIndividualRewardTiers } from "../../src/shared/firmSeasonRewards.js";

test("individual firm rewards use one best non-cumulative tier", ()=>{
  assert.equal(getFirmIndividualReward(1, 200).label, "Top 1");
  assert.equal(getFirmIndividualReward(7, 200).label, "Top 7");
  assert.equal(getFirmIndividualReward(15, 200).label, "Top 10%");
  assert.equal(getFirmIndividualReward(35, 200).label, "Top 20%");
  assert.equal(getFirmIndividualReward(120, 200).label, "Top 80%");
  assert.equal(getFirmIndividualReward(190, 200).label, "Joueur classé");
  assert.deepEqual(getFirmIndividualReward(1, 200).reward, {
    premium:200_000,
    ammo:{ammo_x6:30_000},
    firmatons:2_000
  });
});

test("reward tier ranges start after the fixed top ten without overlap", ()=>{
  const tiers = getFirmIndividualRewardTiers(200);
  const topTenPercent = tiers.find(tier=>tier.label === "Top 10%");
  const topTwentyPercent = tiers.find(tier=>tier.label === "Top 20%");
  const classified = tiers.find(tier=>tier.kind === "classified");

  assert.deepEqual([topTenPercent.rankStart, topTenPercent.rankEnd, topTenPercent.playerCount], [11, 20, 10]);
  assert.deepEqual([topTwentyPercent.rankStart, topTwentyPercent.rankEnd, topTwentyPercent.playerCount], [21, 40, 20]);
  assert.deepEqual([classified.rankStart, classified.rankEnd, classified.playerCount], [161, 200, 40]);
  assert.equal(tiers.reduce((sum, tier)=>sum + tier.playerCount, 0), 200);
});
