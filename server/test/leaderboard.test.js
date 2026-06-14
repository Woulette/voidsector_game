import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGlobalLeaderboardSnapshot,
  getCompetitiveRankQuotas
} from "../src/players/leaderboard.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

function profileForScore(name, score, extra = {}){
  return sanitizeProfile({
    player:{
      name,
      firmId:extra.firmId || "astra",
      level:extra.level || 1,
      totalXp:Math.max(0, Number(score || 0)) * 100_000,
      reputation:0,
      totalKills:extra.kills || 0,
      totalPlayerKills:extra.playerKills || 0,
      totalPlaySeconds:extra.playSeconds || 0
    },
    activeShip:"orion",
    inventoryItems:[{uid:"laser_a", itemId:"laser_mk1"}],
    shipLoadouts:{orion:{lasers:["laser_a"], generators:[], extras:[]}},
    completedPortals:extra.completedPortals || {},
    ownedDroneCount:extra.drones || 0,
    droneLoadout:[]
  });
}

test("global leaderboard applies documented competitive rank quotas", ()=>{
  const snapshot = buildGlobalLeaderboardSnapshot({
    profileEntries:[
      {key:"account:a", profile:profileForScore("Alpha", 5_000_000, {level:50})},
      {key:"account:b", profile:profileForScore("Beta", 3_700_000, {level:45})},
      {key:"account:c", profile:profileForScore("Gamma", 2_600_000, {level:40})},
      {key:"account:d", profile:profileForScore("Delta", 1_850_000, {level:35})},
      {key:"account:e", profile:profileForScore("Epsilon", 1_300_000, {level:30})}
    ],
    currentKey:"account:c"
  });

  assert.equal(snapshot.playerCount, 5);
  assert.deepEqual(snapshot.rows.map(row=>row.rankId), [
    "marechal",
    "general_armee",
    "general_corps_armee",
    "general_division",
    "general_brigade"
  ]);
  assert.equal(snapshot.rows[2].isPlayer, true);
  assert.equal(snapshot.rows[0].publicProfile.ship.id, "orion");
  assert.equal(snapshot.rows[0].publicProfile.sourceLabel, "Profil MMO");
});

test("competitive quota helper follows the rank system plan", ()=>{
  assert.deepEqual(getCompetitiveRankQuotas(1000), {
    marechal:1,
    general_armee:4,
    general_corps_armee:8,
    general_division:10,
    general_brigade:15
  });
  assert.deepEqual(getCompetitiveRankQuotas(250), {
    marechal:1,
    general_armee:1,
    general_corps_armee:2,
    general_division:2,
    general_brigade:3
  });
});

test("global leaderboard includes every saved profile with public details", ()=>{
  const snapshot = buildGlobalLeaderboardSnapshot({
    profileEntries:[
      {key:"account:alpha", profile:profileForScore("Alpha", 9000, {kills:12, drones:2})},
      {key:"account:friend", profile:profileForScore("Friend", 12000, {firmId:"verte", kills:21, completedPortals:{blue:1}})}
    ]
  });

  const friend = snapshot.rows.find(row=>row.key === "account:friend");
  assert.ok(friend, "expected saved friend profile in leaderboard");
  assert.equal(friend.pilot, "Friend");
  assert.equal(friend.publicProfile.firm.id, "verte");
  assert.equal(friend.publicProfile.progression.portalClears, 1);
  assert.equal(friend.publicProfile.ship.id, "orion");
});
