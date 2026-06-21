import assert from "node:assert/strict";
import test from "node:test";
import {
  MONSTER_RANK_POINT_RULES,
  calculateMonsterKillRankPoints,
  calculateMonsterRankPointsForKills
} from "../../src/data/ranks.js";
import { recalculateMonsterRankPoints, registerServerMonsterKill } from "../src/players/rankProgression.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

const EXPECTED_RULES = {
  drone_pirate:{kills:70, points:1},
  raider_astral:{kills:70, points:1},
  chasseur_spectral:{kills:50, points:1},
  pondeuse_astrale:{kills:1, points:1},
  cuirasse_nebulaire:{kills:30, points:1},
  boss_drone_pirate:{kills:10, points:1},
  boss_raider_astral:{kills:10, points:1},
  deadly_eclaireur:{kills:3, points:1},
  deadly_intercepteur:{kills:3, points:1},
  deadly_traqueur:{kills:1, points:1},
  deadly_gardien:{kills:1, points:1},
  deadly_ravageur:{kills:1, points:2},
  eclanite:{kills:1, points:1},
  cristanite:{kills:1, points:1},
  astranite:{kills:1, points:1},
  cuirasse_ambre:{kills:1, points:2},
  deadly_amiral_k137:{kills:1, points:120}
};

test("monster rank rules match the configured fixed rates", ()=>{
  assert.deepEqual(MONSTER_RANK_POINT_RULES, EXPECTED_RULES);
  assert.equal(calculateMonsterRankPointsForKills("drone_pirate", 69), 0);
  assert.equal(calculateMonsterRankPointsForKills("drone_pirate", 70), 1);
  assert.equal(calculateMonsterRankPointsForKills("drone_pirate", 140), 2);
  assert.equal(calculateMonsterRankPointsForKills("boss_chasseur_spectral", 999), 0);
});

test("a kill awards points only when its fixed threshold is reached", ()=>{
  const profile = {player:{level:1}, killStats:{}, rankKillStats:{}, completedPortals:{}};
  for(let index = 0; index < 69; index += 1){
    assert.equal(registerServerMonsterKill(profile, {kind:"drone_pirate"}), 0);
  }
  assert.equal(calculateMonsterKillRankPoints("drone_pirate", 69), 1);
  assert.equal(registerServerMonsterKill(profile, {kind:"drone_pirate"}), 1);
  assert.equal(registerServerMonsterKill(profile, {kind:"deadly_ravageur"}), 2);
  assert.equal(registerServerMonsterKill(profile, {kind:"boss_chasseur_spectral"}), 0);
  assert.equal(profile.player.monsterRankPoints, 3);
  assert.equal(profile.player.rankScore, 3);
});

test("each Astral Brood Layer kill awards one leaderboard point", ()=>{
  const profile = {player:{level:1}, killStats:{}, rankKillStats:{}, completedPortals:{}};

  assert.equal(registerServerMonsterKill(profile, {kind:"pondeuse_astrale"}), 1);
  assert.equal(profile.rankKillStats.pondeuse_astrale.kills, 1);
  assert.equal(profile.player.monsterRankPoints, 1);
  assert.equal(profile.player.rankScore, 1);
});

test("legacy monster points are recalculated from kill totals", ()=>{
  const profile = sanitizeProfile({
    player:{level:1, monsterRankPoints:9999, rankScore:9999},
    completedPortals:{},
    killStats:{drone_pirate:140, raider_astral:69, deadly_amiral_k137:1, boss_chasseur_spectral:10},
    rankKillStats:{drone_pirate:{kills:140, points:9999}}
  });
  assert.equal(recalculateMonsterRankPoints(profile), 122);
  assert.equal(profile.player.monsterRankPoints, 122);
  assert.equal(profile.rankKillStats.drone_pirate.points, 2);
  assert.equal(profile.rankKillStats.raider_astral.points, 0);
  assert.equal(profile.rankKillStats.deadly_amiral_k137.points, 120);
  assert.equal(profile.rankKillStats.boss_chasseur_spectral.points, 0);
});
