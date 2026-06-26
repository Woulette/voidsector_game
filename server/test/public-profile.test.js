import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicPlayerProfile } from "../src/players/publicProfile.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

test("public player profile exposes equipped ship, weapons, drones and progression", ()=>{
  const profile = sanitizeProfile({
    player:{
      name:"Alpha",
      firmId:"astra",
      level:27,
      totalXp:2_400_000,
      reputation:180_000,
      totalKills:180,
      totalPlayerKills:7,
      totalPlaySeconds:12_345,
      activeTitleId:"hunter_100",
      titleVisible:true
    },
    activeShip:"velox",
    ownedShips:["orion", "velox"],
    inventoryItems:[
      {uid:"laser_a", itemId:"laser_mk2"},
      {uid:"gen_a", itemId:"shield_omega"},
      {uid:"rocket_a", itemId:"launcher_rocket_mk1"},
      {uid:"drone_laser_a", itemId:"laser_mk1"}
    ],
    shipLoadouts:{
      velox:{
        lasers:["laser_a"],
        generators:["gen_a"],
        rocketLauncher:"rocket_a",
        missileLauncher:null,
        extras:[]
      }
    },
    equipmentUpgrades:{laser_mk2:3, shield_omega:2},
    ownedDroneCount:2,
    droneLoadout:["drone_laser_a", null],
    dronePermanentUpgrades:{0:"drone_overdrive_chip"},
    activeDroneFormation:"tir",
    completedPortals:{blue:2},
    completedQuestClaims:{q1:true, q2:true},
    prestigeCount:1,
    lastLaserAmmoId:"ammo_x2"
  });

  const result = buildPublicPlayerProfile({
    key:"account:alpha",
    profile,
    ranking:{key:"account:alpha", name:"Alpha", firmId:"astra", rank:2, points:450}
  });

  assert.equal(result.key, "account:alpha");
  assert.equal(result.name, "Alpha");
  assert.equal(result.title, "Traqueur spatial");
  assert.equal(result.ship.id, "velox");
  assert.equal(result.loadout.lasers[0].id, "laser_mk2");
  assert.equal(result.loadout.lasers[0].upgradeLevel, 3);
  assert.equal(result.loadout.generators[0].id, "shield_omega");
  assert.equal(result.loadout.rocketLauncher.id, "launcher_rocket_mk1");
  assert.equal(result.loadout.laserAmmo.id, "ammo_x2");
  assert.equal(result.drones.owned, 2);
  assert.equal(result.drones.equipped, 1);
  assert.equal(result.drones.upgraded, 1);
  assert.equal(result.drones.formation.id, "tir");
  assert.equal(result.progression.portalClears, 2);
  assert.equal(result.progression.questsCompleted, 2);
  assert.equal(result.progression.prestige, 1);
  assert.equal(result.ranking.displayRank, 2);
  assert.equal(result.ranking.contribution, 450);
});

test("public player profile returns null without a profile", ()=>{
  assert.equal(buildPublicPlayerProfile({profile:null}), null);
});
