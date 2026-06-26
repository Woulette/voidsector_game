import {ammoTypes, droneFormations} from "../../../src/data/equipment.js";
import {skills} from "../../../src/data/progression.js";
import {getItemFromInventoryUid, getServerItem} from "../economy/equipment.js";
import {consumeServerCombatBoostCharges, getServerCombatTimedBoostPercent} from "../economy/combatBoosts.js";
import {applyServerLaserDoubleStrike} from "./shipAbilities.js";

export function createCombatCooldownTracker({
  now = ()=>Date.now(),
  pruneIntervalMs = 60000
} = {}){
  const cooldowns = new Map();
  let nextPruneAt = 0;

  function playerKey(player){
    return String(
      player?.accountId
      || player?.account?.id
      || player?.clientId
      || player?.id
      || "unknown"
    );
  }

  function prune(currentTime = now()){
    for(const [key, readyAt] of cooldowns){
      if(currentTime >= Number(readyAt || 0)) cooldowns.delete(key);
    }
    nextPruneAt = currentTime + Math.max(1000, Number(pruneIntervalMs || 60000));
    return cooldowns.size;
  }

  function check(player, weaponClass, cooldownMs){
    const currentTime = now();
    if(currentTime >= nextPruneAt) prune(currentTime);
    const key = `${playerKey(player)}:${weaponClass || "laser"}`;
    const readyAt = Number(cooldowns.get(key) || 0);
    if(currentTime < readyAt) return {ok:false, reason:"Arme en recharge."};
    cooldowns.set(key, currentTime + Math.max(100, cooldownMs));
    return {ok:true};
  }

  return {
    check,
    prune,
    size:()=>cooldowns.size
  };
}

const fireCooldowns = createCombatCooldownTracker();

function rollBetween(min, max, random = Math.random){
  const lo = Number(min ?? max ?? 0);
  const hi = Number(max ?? min ?? lo);
  if(hi <= lo) return lo;
  return lo + random() * (hi - lo);
}

function getAmmo(id){
  return ammoTypes.find(ammo=>ammo.id === id) || null;
}

function getUpgradeLevel(profile, itemId){
  return Math.max(0, Number(profile?.equipmentUpgrades?.[itemId] || 0));
}

function checkCooldown(player, weaponClass, cooldownMs){
  return fireCooldowns.check(player, weaponClass, cooldownMs);
}

function consumeAmmo(profile, ammoId, amount){
  const need = Math.max(1, Math.floor(Number(amount || 1)));
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  const have = Math.max(0, Number(profile.ammoInventory[ammoId] || 0));
  if(have < need) return false;
  profile.ammoInventory[ammoId] = have - need;
  return true;
}

function recordServerWeaponUse(profile, weaponClass, amount){
  if(!profile.player || typeof profile.player !== "object") profile.player = {};
  const keys = {
    laser:"laserShotsFired",
    rocket:"rocketShotsFired",
    missile:"missileShotsFired"
  };
  const key = keys[weaponClass];
  if(!key) return;
  profile.player[key] = Math.max(0, Math.floor(Number(profile.player[key] || 0))) + Math.max(0, Math.floor(Number(amount || 0)));
}

function getShipLoadout(profile, player){
  const shipId = String(profile.activeShip || player?.state?.shipId || "");
  return profile?.shipLoadouts?.[shipId] || null;
}

function getShipLaserItems(profile, player){
  const loadout = getShipLoadout(profile, player);
  return (Array.isArray(loadout?.lasers) ? loadout.lasers : [])
    .map(uid=>getItemFromInventoryUid(profile, uid))
    .filter(item=>item?.category === "canon" && item?.weapon);
}

function getDroneLaserItems(profile){
  const loadout = Array.isArray(profile.droneLoadout) ? profile.droneLoadout : [];
  return loadout.map((uid, index)=>{
    const item = getItemFromInventoryUid(profile, uid);
    if(item?.category !== "canon" || !item?.weapon) return null;
    const upgradeId = profile.dronePermanentUpgrades?.[index] || null;
    const upgrade = upgradeId ? getServerItem(upgradeId) : null;
    return {
      ...item,
      droneDamageMultiplier:Math.max(1, Number(upgrade?.effect?.droneDamageMultiplier || 1))
    };
  }).filter(Boolean);
}

function getLauncher(profile, player, type){
  const loadout = getShipLoadout(profile, player);
  const uid = type === "rocket" ? loadout?.rocketLauncher : loadout?.missileLauncher;
  const item = uid ? getItemFromInventoryUid(profile, uid) : null;
  if(type === "rocket" && item?.slotType === "rocketLauncher") return item;
  if(type === "missile" && item?.slotType === "missileLauncher") return item;
  return null;
}

function getProfileSkillBonus(profile, key, defaultValue = 1){
  let bonus = defaultValue;
  for(const skill of skills){
    const savedRanks = Array.isArray(profile?.skillRanks?.[skill.id]) ? profile.skillRanks[skill.id] : [];
    for(let index = 0; index < skill.levels.length; index += 1){
      const node = skill.levels[index];
      const rank = Math.max(0, Number(savedRanks[index] || 0));
      if(rank <= 0) continue;
      const activeRank = Array.isArray(node.ranks) ? node.ranks[Math.min(rank, node.ranks.length) - 1] : node;
      const value = activeRank?.stats?.[key];
      if(value !== undefined) bonus *= Number(value || 1);
    }
  }
  return bonus;
}

function getFormationBonus(profile, key, defaultValue = 1){
  const formation = droneFormations.find(entry=>entry.id === profile?.activeDroneFormation);
  return Number(formation?.effect?.[key] ?? defaultValue);
}

function getLaserDamageMultiplier(profile){
  return getProfileSkillBonus(profile, "weaponDamageMultiplier", 1)
    * getFormationBonus(profile, "laserDamageMultiplier", 1);
}

function getRocketDamageMultiplier(profile){
  return getProfileSkillBonus(profile, "rocketDamageMultiplier", 1)
    * getFormationBonus(profile, "rocketDamageMultiplier", 1);
}

function getRocketCooldownMultiplier(profile, player){
  const loadout = getShipLoadout(profile, player);
  const extras = Array.isArray(loadout?.extras) ? loadout.extras : [];
  let multiplier = getProfileSkillBonus(profile, "rocketCooldownMultiplier", 1);
  for(const uid of extras){
    const item = getItemFromInventoryUid(profile, uid);
    if(item?.effect?.rocketCooldownMultiplier){
      multiplier *= Number(item.effect.rocketCooldownMultiplier);
    }
  }
  return Math.max(0.25, multiplier);
}

function sumLaserDamage(profile, lasers){
  return lasers.reduce((acc, item)=>{
    const upgradeBonus = getUpgradeLevel(profile, item.id) * 10;
    const min = Number(item.weapon.minDamage ?? item.weapon.damage ?? 0) + upgradeBonus;
    const max = Number(item.weapon.maxDamage ?? item.weapon.damage ?? min) + upgradeBonus;
    const multiplier = Math.max(1, Number(item.droneDamageMultiplier || 1));
    acc.min += min * multiplier;
    acc.max += max * multiplier;
    const itemRange = Math.max(0, Number(item.weapon.range || 0));
    if(itemRange > 0) acc.range = acc.range > 0 ? Math.min(acc.range, itemRange) : itemRange;
    return acc;
  }, {min:0, max:0, range:0});
}

function distanceOk(player, enemy, range, tolerance = 180){
  const state = player?.state;
  if(!state) return false;
  const dist = Math.hypot(Number(enemy.x || 0) - Number(state.x || 0), Number(enemy.y || 0) - Number(state.y || 0));
  return dist <= Math.max(1, Number(range || 0)) + tolerance;
}

export function resolveServerCombatFire({player, profile, enemy, payload, firmDamageBonus = 0, random = Math.random, now = Date.now()} = {}){
  if(!player || !profile || !enemy) return {ok:false, reason:"Combat impossible."};
  const ammo = getAmmo(String(payload?.ammoId || "ammo_x1"));
  if(!ammo) return {ok:false, reason:"Munition inconnue."};
  const weaponClass = String(payload?.weaponClass || ammo.weaponClass || "laser");
  if(weaponClass !== ammo.weaponClass) return {ok:false, reason:"Munition incompatible."};
  const hitChance = 0.88;
  let damage = 0;
  let consumed = 1;
  let cooldownMs = 1000;
  let range = 500;
  let missileHits = 0;
  let missileMisses = 0;
  let laserDamage = null;

  if(weaponClass === "laser"){
    const shipLasers = getShipLaserItems(profile, player);
    const droneLasers = getDroneLaserItems(profile);
    const lasers = [...shipLasers, ...droneLasers];
    if(lasers.length <= 0) return {ok:false, reason:"Aucun laser equipe."};
    const shipPool = sumLaserDamage(profile, shipLasers);
    const dronePool = sumLaserDamage(profile, droneLasers);
    consumed = lasers.length;
    range = shipLasers.length > 0 ? shipPool.range : dronePool.range;
    cooldownMs = Math.max(250, Number(ammo.cooldown || 1) * 1000);
    laserDamage = {
      ship:rollBetween(shipPool.min, shipPool.max, random),
      drone:rollBetween(dronePool.min, dronePool.max, random),
      droneCount:droneLasers.length
    };
  }else if(weaponClass === "rocket"){
    const launcher = getLauncher(profile, player, "rocket");
    if(!launcher) return {ok:false, reason:"Aucun lance roquette equipe."};
    consumed = 1;
    range = Number(launcher.effect?.rocketRange || ammo.range || 550);
    cooldownMs = Math.max(500, Number(launcher.effect?.rocketCooldown || ammo.cooldown || 5) * getRocketCooldownMultiplier(profile, player) * 1000);
    damage = (rollBetween(ammo.damageMin, ammo.damageMax, random) + getUpgradeLevel(profile, ammo.id) * 80) * Number(launcher.effect?.rocketDamageMultiplier || 1);
  }else if(weaponClass === "missile"){
    const launcher = getLauncher(profile, player, "missile");
    if(!launcher) return {ok:false, reason:"Aucun lance missile equipe."};
    const capacity = Math.max(1, Math.min(12, Number(launcher.effect?.missileCapacity || 3)));
    consumed = Math.max(1, Math.min(capacity, Math.floor(Number(payload?.count || capacity))));
    range = Number(launcher.effect?.missileRange || ammo.range || 600);
    cooldownMs = Math.max(750, consumed * Number(launcher.effect?.missileReload || 3) * 1000);
    const multiplier = Number(launcher.effect?.missileDamageMultiplier || 1);
    for(let index = 0; index < consumed; index += 1){
      if(random() <= hitChance){
        missileHits += 1;
        damage += rollBetween(ammo.damageMin, ammo.damageMax, random) * multiplier;
      }else{
        missileMisses += 1;
      }
    }
  }else{
    return {ok:false, reason:"Type d'arme invalide."};
  }

  if(!distanceOk(player, enemy, range)) return {ok:false, reason:"Cible hors de portee."};
  const cooldown = checkCooldown(player, weaponClass, cooldownMs);
  if(!cooldown.ok) return cooldown;
  if(!consumeAmmo(profile, ammo.id, consumed)) return {ok:false, reason:"Munitions insuffisantes."};
  recordServerWeaponUse(profile, weaponClass, consumed);
  let boostPercent = 0;
  let droneBoostPercent = 0;
  if(weaponClass === "laser"){
    boostPercent = consumeServerCombatBoostCharges(profile, "laser", consumed);
    droneBoostPercent = laserDamage.droneCount > 0 ? getServerCombatTimedBoostPercent(profile, "drone") : 0;
    damage = (laserDamage.ship + laserDamage.drone * (1 + droneBoostPercent))
      * Math.max(1, Number(ammo.multiplier || 1))
      * getLaserDamageMultiplier(profile)
      * (1 + boostPercent);
  }else if(weaponClass === "rocket"){
    boostPercent = consumeServerCombatBoostCharges(profile, "rocket", 1);
    damage *= getRocketDamageMultiplier(profile) * (1 + boostPercent);
  }
  const activeFirmDamageBonus = Math.max(0, Number(firmDamageBonus || 0));
  damage *= 1 + activeFirmDamageBonus;
  const hit = weaponClass === "missile" ? missileHits > 0 : random() <= hitChance;
  const baseDamage = hit ? Math.max(1, Math.round(damage)) : 0;
  const doubleStrike = weaponClass === "laser"
    ? applyServerLaserDoubleStrike({player, profile, weaponClass, hit, damage:baseDamage, now})
    : {triggered:false, bonusDamage:0};
  const bonusDamage = Math.max(0, Math.round(Number(doubleStrike?.bonusDamage || 0)));
  return {
    ok:true,
    hit,
    damage:baseDamage + bonusDamage,
    ammoId:ammo.id,
    consumed,
    ammoRemaining:Math.max(0, Number(profile.ammoInventory?.[ammo.id] || 0)),
    weaponClass,
    missileHits,
    missileMisses,
    boostPercent,
    droneBoostPercent,
    firmDamageBonus:activeFirmDamageBonus,
    range,
    doubleStrike:doubleStrike?.triggered ? {
      abilityId:doubleStrike.status?.abilityId || "spectral_double_shot",
      baseDamage,
      bonusDamage,
      chargeMs:Number(doubleStrike.chargeMs || doubleStrike.status?.chargeMs || 0),
      chargeSegments:Number(doubleStrike.chargeSegments || doubleStrike.status?.chargeSegments || 0),
      chargeStartedAt:Number(doubleStrike.chargeStartedAt || doubleStrike.status?.chargeStartedAt || 0),
      chargeReadyAt:Number(doubleStrike.chargeReadyAt || doubleStrike.status?.chargeReadyAt || 0),
      activeUntil:Number(doubleStrike.status?.activeUntil || 0)
    } : null
  };
}
