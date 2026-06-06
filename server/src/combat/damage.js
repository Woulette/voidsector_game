import {ammoTypes} from "../../../src/data/equipment.js";
import {skills} from "../../../src/data/progression.js";
import {getItemFromInventoryUid, getServerItem} from "../economy/equipment.js";

const fireCooldowns = new Map();

function rollBetween(min, max){
  const lo = Number(min ?? max ?? 0);
  const hi = Number(max ?? min ?? lo);
  if(hi <= lo) return lo;
  return lo + Math.random() * (hi - lo);
}

function getAmmo(id){
  return ammoTypes.find(ammo=>ammo.id === id) || null;
}

function getUpgradeLevel(profile, itemId){
  return Math.max(0, Number(profile?.equipmentUpgrades?.[itemId] || 0));
}

function getCooldownKey(player, weaponClass){
  return `${player?.id || "unknown"}:${weaponClass || "laser"}`;
}

function checkCooldown(player, weaponClass, cooldownMs){
  const key = getCooldownKey(player, weaponClass);
  const now = Date.now();
  const readyAt = Number(fireCooldowns.get(key) || 0);
  if(now < readyAt) return {ok:false, reason:"Arme en recharge."};
  fireCooldowns.set(key, now + Math.max(100, cooldownMs));
  return {ok:true};
}

function consumeAmmo(profile, ammoId, amount){
  const need = Math.max(1, Math.floor(Number(amount || 1)));
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  const have = Math.max(0, Number(profile.ammoInventory[ammoId] || 0));
  if(have < need) return false;
  profile.ammoInventory[ammoId] = have - need;
  return true;
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
    acc.range = Math.max(acc.range, Number(item.weapon.range || 0));
    return acc;
  }, {min:0, max:0, range:0});
}

function distanceOk(player, enemy, range, tolerance = 180){
  const state = player?.state;
  if(!state) return false;
  const dist = Math.hypot(Number(enemy.x || 0) - Number(state.x || 0), Number(enemy.y || 0) - Number(state.y || 0));
  return dist <= Math.max(1, Number(range || 0)) + tolerance;
}

export function resolveServerCombatFire({player, profile, enemy, payload} = {}){
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

  if(weaponClass === "laser"){
    const lasers = [...getShipLaserItems(profile, player), ...getDroneLaserItems(profile)];
    if(lasers.length <= 0) return {ok:false, reason:"Aucun laser equipe."};
    const pool = sumLaserDamage(profile, lasers);
    consumed = lasers.length;
    range = pool.range;
    cooldownMs = Math.max(250, Number(ammo.cooldown || 1) * 1000);
    damage = rollBetween(pool.min, pool.max) * Math.max(1, Number(ammo.multiplier || 1));
  }else if(weaponClass === "rocket"){
    const launcher = getLauncher(profile, player, "rocket");
    if(!launcher) return {ok:false, reason:"Aucun lance roquette equipe."};
    consumed = 1;
    range = Number(launcher.effect?.rocketRange || ammo.range || 550);
    cooldownMs = Math.max(500, Number(launcher.effect?.rocketCooldown || ammo.cooldown || 5) * getRocketCooldownMultiplier(profile, player) * 1000);
    damage = (rollBetween(ammo.damageMin, ammo.damageMax) + getUpgradeLevel(profile, ammo.id) * 80) * Number(launcher.effect?.rocketDamageMultiplier || 1);
  }else if(weaponClass === "missile"){
    const launcher = getLauncher(profile, player, "missile");
    if(!launcher) return {ok:false, reason:"Aucun lance missile equipe."};
    const capacity = Math.max(1, Math.min(12, Number(launcher.effect?.missileCapacity || 3)));
    consumed = Math.max(1, Math.min(capacity, Math.floor(Number(payload?.count || capacity))));
    range = Number(launcher.effect?.missileRange || ammo.range || 600);
    cooldownMs = Math.max(750, consumed * Number(launcher.effect?.missileReload || 3) * 1000);
    const multiplier = Number(launcher.effect?.missileDamageMultiplier || 1);
    damage = Array.from({length:consumed}, ()=>rollBetween(ammo.damageMin, ammo.damageMax)).reduce((sum, value)=>sum + value, 0) * multiplier;
  }else{
    return {ok:false, reason:"Type d'arme invalide."};
  }

  if(!distanceOk(player, enemy, range)) return {ok:false, reason:"Cible hors de portee."};
  const cooldown = checkCooldown(player, weaponClass, cooldownMs);
  if(!cooldown.ok) return cooldown;
  if(!consumeAmmo(profile, ammo.id, consumed)) return {ok:false, reason:"Munitions insuffisantes."};
  const hit = Math.random() <= hitChance;
  return {
    ok:true,
    hit,
    damage:hit ? Math.max(1, Math.round(damage)) : 0,
    ammoId:ammo.id,
    consumed,
    weaponClass,
    range
  };
}
