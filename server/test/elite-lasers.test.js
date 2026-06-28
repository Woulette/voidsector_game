import assert from "node:assert/strict";
import test from "node:test";
import {
  applyServerEliteLaserLifeSteal,
  resolveServerCombatFire
} from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { equipment } from "../../src/data/equipment.js";

function addInventoryItem(profile, uid, itemId){
  profile.inventoryItems.push({uid, itemId});
  return uid;
}

function equipShipLasers(profile, itemIds){
  profile.inventoryItems = profile.inventoryItems.filter(entry=>entry.uid !== "inv_laser_mk1_1");
  profile.shipLoadouts.orion.lasers = itemIds.map((itemId, index)=>addInventoryItem(profile, `elite_ship_${index + 1}`, itemId));
}

function fireLaser({profile, now = 2_000, playerId = `elite-player-${Math.random()}`} = {}){
  return resolveServerCombatFire({
    player:{id:playerId, state:{shipId:"orion", x:0, y:0, hp:1_000, maxHp:10_000}},
    profile,
    enemy:{id:"dummy", x:100, y:0, hp:1_000_000, shield:0, maxShield:0, radius:30},
    payload:{enemyId:"dummy", ammoId:"ammo_x1", weaponClass:"laser"},
    random:()=>0,
    now
  });
}

test("elite laser items are temporary premium shop weapons above MK-IV", ()=>{
  const expected = [
    ["laser_elite_green", "assets/equipment/laser_elite_emerald.webp", "green"],
    ["laser_elite_blue", "assets/equipment/laser_elite_azure.webp", "blue"],
    ["laser_elite_red", "assets/equipment/laser_elite_crimson.webp", "red"]
  ];
  for(const [id, img, color] of expected){
    const item = equipment.find(entry=>entry.id === id);
    assert.ok(item, `${id} should exist`);
    assert.equal(item.rarity, "ÉLITE");
    assert.equal(item.rarityTier, "elite");
    assert.equal(item.priceType, "premium");
    assert.equal(item.price, 100000);
    assert.equal(item.category, "canon");
    assert.equal(item.slotType, "weapon");
    assert.equal(item.img, img);
    assert.equal(item.effect.eliteLaserColor, color);
    assert.deepEqual(
      {
        minDamage:item.weapon.minDamage,
        maxDamage:item.weapon.maxDamage,
        cooldown:item.weapon.cooldown,
        range:item.weapon.range,
        speed:item.weapon.speed
      },
      {minDamage:210, maxDamage:240, cooldown:1, range:600, speed:1200}
    );
  }
});

test("charged red elite lasers add burst damage and consume their gauge", ()=>{
  const profile = createDefaultProfile();
  equipShipLasers(profile, Array.from({length:10}, ()=>"laser_elite_red"));
  profile.ammoInventory.ammo_x1 = 100;
  profile.eliteLaserStates = {
    current:{
      lastLaserAt:1_000,
      green:{charge:0},
      blue:{charge:0, phase:"charge"},
      red:{charge:4}
    }
  };

  const result = fireLaser({profile, now:2_000, playerId:"elite-red-burst"});

  assert.equal(result.ok, true);
  assert.equal(result.eliteLaser.red.triggered, true);
  assert.equal(result.eliteLaser.red.damageBonus, 0.10);
  assert.equal(result.damage, 2310);
  assert.equal(profile.eliteLaserStates.current.red.charge, 0);
});

test("green elite lifesteal counts ship and drone lasers", ()=>{
  const profile = createDefaultProfile();
  equipShipLasers(profile, ["laser_elite_green"]);
  const droneUid = addInventoryItem(profile, "elite_drone_green_1", "laser_elite_green");
  profile.droneLoadout = [droneUid];
  profile.dronePermanentUpgrades = {};
  profile.ammoInventory.ammo_x1 = 100;
  profile.eliteLaserStates = {
    current:{
      lastLaserAt:1_000,
      green:{charge:4},
      blue:{charge:0, phase:"charge"},
      red:{charge:0}
    }
  };

  const result = fireLaser({profile, now:2_000, playerId:"elite-green-siphon"});

  assert.equal(result.ok, true);
  assert.equal(result.eliteLaser.green.triggered, true);
  assert.equal(result.eliteLaser.green.count, 2);
  assert.equal(result.eliteLaser.green.lifestealPercent, 0.02);

  const player = {state:{hp:1_000, maxHp:10_000}};
  const heal = applyServerEliteLaserLifeSteal({
    player,
    eliteLaser:result.eliteLaser,
    damageDealt:10_000,
    weaponClass:"laser",
    now:3_000
  });
  assert.equal(heal.healed, 200);
  assert.equal(player.state.hp, 1_200);
});

test("blue elite gauge can enter discharge without enabling cadence yet", ()=>{
  const profile = createDefaultProfile();
  equipShipLasers(profile, Array.from({length:30}, ()=>"laser_elite_blue"));
  profile.ammoInventory.ammo_x1 = 100;
  profile.eliteLaserStates = {
    current:{
      lastLaserAt:1_000,
      green:{charge:0},
      blue:{charge:4, phase:"charge"},
      red:{charge:0}
    }
  };

  const result = fireLaser({profile, now:2_000, playerId:"elite-blue-gauge"});

  assert.equal(result.ok, true);
  assert.equal(result.eliteLaser.blue.count, 30);
  assert.equal(result.eliteLaser.blue.active, true);
  assert.equal(result.eliteLaser.blue.cadenceBonus, 0.15);
  assert.equal(result.eliteLaser.blue.cadenceEnabled, false);
});

test("profile sanitizer preserves elite laser combat state", ()=>{
  const sanitized = sanitizeProfile({
    ...createDefaultProfile(),
    eliteLaserStates:{
      current:{
        lastLaserAt:10_000,
        green:{charge:2},
        blue:{charge:5, phase:"discharge"},
        red:{charge:4}
      }
    }
  });

  assert.equal(sanitized.eliteLaserStates.current.green.charge, 2);
  assert.equal(sanitized.eliteLaserStates.current.blue.phase, "discharge");
  assert.equal(sanitized.eliteLaserStates.current.red.charge, 4);
});
