import assert from "node:assert/strict";
import test from "node:test";
import { enrichFirmSnapshot } from "../src/firms/firmSnapshots.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

function makeProfile(name = "Alpha"){
  return sanitizeProfile({
    player:{
      name,
      firmId:"astra",
      level:12,
      totalXp:850_000,
      reputation:15_000,
      totalKills:42,
      totalPlaySeconds:7200
    },
    activeShip:"orion",
    inventoryItems:[{uid:"laser_a", itemId:"laser_mk1"}],
    shipLoadouts:{orion:{lasers:["laser_a"], generators:[], extras:[]}},
    ownedDroneCount:1,
    droneLoadout:[]
  });
}

function createProfileManager(){
  const entries = new Map([["account:alpha", makeProfile("Alpha")]]);
  return {
    profileKey:name=>String(name || "").trim().toLowerCase(),
    getProfileEntry:key=>entries.has(key) ? {key, profile:entries.get(key)} : null,
    findProfileEntryByPilotName:name=>{
      const target = String(name || "").trim().toLowerCase();
      for(const [key, profile] of entries){
        if(String(profile.player?.name || "").trim().toLowerCase() === target) return {key, profile};
      }
      return null;
    }
  };
}

test("firm snapshot enrichment attaches full public profile by key", ()=>{
  const snapshot = enrichFirmSnapshot(createProfileManager(), {
    individualRanking:[{key:"account:alpha", name:"Alpha", firmId:"astra", rank:1, points:810}]
  });

  const row = snapshot.individualRanking[0];
  assert.equal(row.publicProfile.name, "Alpha");
  assert.equal(row.publicProfile.ship.id, "orion");
  assert.equal(row.publicProfile.progression.totalKills, 42);
  assert.equal(row.publicProfile.sourceLabel, "Profil MMO");
});

test("firm snapshot enrichment falls back to pilot name when row key is stale", ()=>{
  const snapshot = enrichFirmSnapshot(createProfileManager(), {
    individualRanking:[{key:"guest:alpha", name:"Alpha", firmId:"astra", rank:1, points:810}]
  });

  const row = snapshot.individualRanking[0];
  assert.equal(row.publicProfile.key, "account:alpha");
  assert.equal(row.publicProfile.ship.id, "orion");
});
