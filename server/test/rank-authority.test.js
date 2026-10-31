import assert from "node:assert/strict";
import test from "node:test";
import { createRankAuthority } from "../src/players/rankAuthority.js";
import { buildGlobalLeaderboardSnapshot } from "../src/players/leaderboard.js";
import { buildPublicPlayerProfile } from "../src/players/publicProfile.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getCurrentRank, getNextRank, getRankProgress, store } from "../../src/core/store.js?v=20260726-kharon1";
import { clearServerRankAssignment, getServerRankAssignment, setServerRankAssignment, setServerRankSnapshot } from "../../src/core/rankAuthorityStore.js";
import { getProfilePresentationModel } from "../../src/ui/renderProfile.js";

function fixture(){
  const entries = ["alpha", "bravo", "charlie"].map(name=>{
    const profile = createDefaultProfile();
    Object.assign(profile.player, {name, monsterRankPoints:5_500_000, rankScore:5_500_000});
    return {key:`account:${name}`, profile};
  });
  let clock = 10_000;
  let reads = 0;
  const authority = createRankAuthority({profileManager:{listProfileEntries:()=>{reads++;return entries;}, profileKeyForPlayer:p=>`account:${p.accountId}`}, now:()=>clock});
  return {entries, authority, advance:()=>clock += 1001, reads:()=>reads};
}

test("identical high scores retain the three server quota assignments across profile, public state and client", ()=>{
  const {entries, authority} = fixture();
  const snapshot = buildGlobalLeaderboardSnapshot({profileEntries:entries});
  const previous = store.state;
  try{
    for(const row of snapshot.rows){
      const entry = entries.find(e=>e.key === row.key);
      const assigned = authority.forKey(entry.key, entry.profile);
      assert.equal(assigned.rankId, row.rankId);
      const state = authority.decorateState({rankName:"Maréchal", rankAssetPath:"forged.svg"}, assigned);
      const publicProfile = buildPublicPlayerProfile({...entry, rankAssignment:assigned});
      clearServerRankAssignment();
      setServerRankSnapshot(snapshot, entry.key.slice(8));
      store.state = entry.profile;
      assert.equal(getCurrentRank().id, row.rankId);
      assert.equal(getProfilePresentationModel().identity.rankName, row.grade);
      assert.equal(state.rankName, row.grade);
      assert.equal(publicProfile.rank.name, row.grade);
      assert.equal(state.rankAssetPath, publicProfile.rank.asset);
    }
    assert.equal(new Set(snapshot.rows.map(r=>r.rankId)).size, 3);
  }finally{store.state=previous;clearServerRankAssignment();}
});

test("competitive progress requires a ranking place even with every point threshold exceeded", ()=>{
  const {entries, authority} = fixture();
  const previous = store.state;
  try{
    const last = entries[2];
    store.state = last.profile;
    setServerRankAssignment(authority.forKey(last.key, last.profile), last.key);
    assert.equal(getCurrentRank().id, "general_corps_armee");
    assert.equal(getNextRank().id, "general_armee");
    assert.equal(getRankProgress().remaining, 0);
    assert.equal(getRankProgress().placementRequired, true);
    assert.match(getProfilePresentationModel().identity.rankRequirement, /place au classement/);
  }finally{store.state=previous;clearServerRankAssignment();}
});

test("client rank state follows account keys, ignores older snapshots and clears on reconnect", ()=>{
  clearServerRankAssignment();
  setServerRankAssignment({source:"server", key:"account:a", rankId:"general_armee", generatedAt:200}, "account:a");
  setServerRankAssignment({source:"server", key:"account:a", rankId:"marechal", generatedAt:100}, "account:a");
  assert.equal(getServerRankAssignment().rankId, "general_armee");
  setServerRankAssignment({source:"server", key:"account:a", rankId:"marechal", generatedAt:300}, "account:b");
  assert.equal(getServerRankAssignment(), null);
  clearServerRankAssignment();
  assert.equal(getServerRankAssignment(), null);
});

test("rank lookups cache the global assignment; changed own scores and later peer changes refresh it", ()=>{
  const {authority, entries, reads, advance} = fixture();
  for(let i=0;i<100;i++)authority.forKey(entries[2].key, entries[2].profile);
  assert.equal(reads(), 1);
  entries[2].profile.player.monsterRankPoints += 1;
  assert.equal(authority.forKey(entries[2].key, entries[2].profile).rankId, "marechal");
  assert.equal(reads(), 2);
  entries[0].profile.player.monsterRankPoints += 100;
  advance();
  assert.equal(authority.forKey(entries[2].key, entries[2].profile).rankId, "general_armee");
});

test("client combat packets cannot select a grade, title or arbitrary rank asset", ()=>{
  const {authority, entries} = fixture();
  const {key, profile} = entries[2];
  const assignment = authority.forKey(key, profile);
  const result = validatePlayerState({player:{id:"socket", accountId:"charlie", mapId:"0", account:{role:"player"}},
    profile, groups:new Map(), rankAssignment:assignment,
    payload:{x:0, y:0, shipId:"orion", hp:5000, maxHp:5000, rankName:"Maréchal", rankAssetPath:"https://invalid.test/forged.svg"}});
  assert.equal(result.state.rankName, "Général de corps d'armée");
  assert.match(result.state.rankAssetPath, /^assets\/ranks\/23_General_de_corps_d_armee\.svg\?v=[\w-]+$/);
});
