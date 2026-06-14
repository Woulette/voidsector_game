import { getDroneFormationBonus, getShip } from "./catalogStore.js";
import { getCombatTimedBoostPercent } from "./combatBoostStore.js";
import { getDroneDamageMultiplier, getDroneLoadout, getEquipmentUpgradeLevel, getItemFromInventoryUid, getLoadout } from "./equipmentStore.js";
import { getRankScore } from "./rankStore.js";
import { saveState, store } from "./store.js";
import { getSkillBonus } from "./skillStore.js";
import { getXpNextForLevel, syncSkillPoints } from "./xpStore.js";

export function recordWeaponUse(type, amount=1){
  const keys = {
    laser:"laserShotsFired",
    rocket:"rocketShotsFired",
    missile:"missileShotsFired"
  };
  const key = keys[type];
  if(!key) return 0;
  store.state.player[key] = Math.max(0, Number(store.state.player[key] || 0)) + Math.max(0, Math.floor(Number(amount || 0)));
  return store.state.player[key];
}

export function getEquippedGenerators(shipId = store.state.activeShip){
  return getLoadout(shipId).generators.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedExtras(shipId = store.state.activeShip){
  return getLoadout(shipId).extras.map(getItemFromInventoryUid).filter(Boolean);
}

export function getExtraBonus(shipId = store.state.activeShip){
  const skill = getSkillBonus();
  const bonus = {
    autoRocket:false,
    autoMissile:false,
    rocketCooldownMultiplier:Number(skill.rocketCooldownMultiplier || 1),
    rocketDamageBonus:0,
    repairBot:false,
    repairBotAuto:false,
    repairBotHealRate:0,
    repairBotDelay:Math.max(6, 15 - Math.max(0, Number(skill.repairBotDelayReduction || 0))),
    repairBotImg:"assets/equipment/drone_repair_starter.png"
  };
  for(const item of getEquippedExtras(shipId)){
    const effect = item.effect || {};
    if(effect.autoRocket) bonus.autoRocket = true;
    if(effect.autoMissile) bonus.autoMissile = true;
    if(effect.rocketCooldownMultiplier) bonus.rocketCooldownMultiplier *= effect.rocketCooldownMultiplier;
    if(effect.rocketDamageBonus) bonus.rocketDamageBonus += effect.rocketDamageBonus;
    if(effect.repairBot) bonus.repairBot = true;
    if(effect.repairBotAuto) bonus.repairBotAuto = true;
    if(effect.repairBotHealRate) bonus.repairBotHealRate = Math.max(bonus.repairBotHealRate, effect.repairBotHealRate);
    if(effect.repairBotDelay) bonus.repairBotDelay = Math.max(1, Math.min(bonus.repairBotDelay, effect.repairBotDelay));
    if(effect.repairBotImg && Number(effect.repairBotHealRate || 0) >= Number(bonus.repairBotHealRate || 0)) bonus.repairBotImg = effect.repairBotImg;
  }
  bonus.rocketCooldownMultiplier = Math.max(0.25, bonus.rocketCooldownMultiplier);
  bonus.repairBotHealRate *= Number(skill.repairBotHealMultiplier || 1);
  return bonus;
}

export function getRealSpeedFromStat(vitesse){
  return Math.round(Number(vitesse || 0));
}

export function getEquippedLasers(shipId = store.state.activeShip){
  return getLoadout(shipId).lasers.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedLauncher(type, shipId = store.state.activeShip){
  const loadout = getLoadout(shipId);
  const uid = type === "rocket" ? loadout.rocketLauncher : type === "missile" ? loadout.missileLauncher : null;
  return uid ? getItemFromInventoryUid(uid) : null;
}

export function getEquippedDroneItems(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneLasers(){
  return getDroneLoadout()
    .map((uid, index)=>{
      const item = getItemFromInventoryUid(uid);
      return item?.category === "canon" ? {...item, droneIndex:index, droneDamageMultiplier:getDroneDamageMultiplier(index)} : null;
    })
    .filter(Boolean);
}

export function getEquippedDroneGenerators(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "generateur");
}

export function getShipCombatStats(shipId = store.state.activeShip){
  const ship = getShip(shipId);
  const skill = getSkillBonus();
  const formationBonus = getDroneFormationBonus();
  const generatorBoost = getCombatTimedBoostPercent("generator");
  const droneBoost = getCombatTimedBoostPercent("drone");
  const shipGenerators = getEquippedGenerators(shipId);
  const droneGenerators = getEquippedDroneGenerators();
  const statFromGenerator = (item, key, upgradeValue)=>{
    const base = Number(item.stats?.[key] || 0);
    return base + (base ? getEquipmentUpgradeLevel(item.id) * upgradeValue : 0);
  };
  const generatorValue = (items, key, upgradeValue, multiplier = 1)=>{
    return items.reduce((sum, item)=>sum + statFromGenerator(item, key, upgradeValue) * multiplier, 0);
  };
  const droneMultiplier = 1 + droneBoost;
  const generatorMultiplier = 1 + generatorBoost;
  const shieldFromGenerators = generatorValue(shipGenerators, "bouclier", 30)
    + generatorValue(droneGenerators, "bouclier", 30, droneMultiplier);
  const regen = generatorValue(shipGenerators, "regen", 1)
    + generatorValue(droneGenerators, "regen", 1, droneMultiplier);
  const generatorSpeed = generatorValue(shipGenerators, "vitesse", 2)
    + generatorValue(droneGenerators, "vitesse", 2, droneMultiplier);
  const vitesse = (ship.stats.vitesse + (skill.vitesse || 0) + generatorSpeed)
    * Number(formationBonus.speedMultiplier || 1)
    * Number(skill.speedMultiplier || 1)
    * generatorMultiplier;
  const bouclier = (shieldFromGenerators > 0 ? shieldFromGenerators + (skill.shieldBonus || 0) : 0)
    * Number(formationBonus.shieldMultiplier || 1)
    * Number(skill.shieldMultiplier || 1)
    * generatorMultiplier;
  const extraBonus = getExtraBonus(shipId);
  extraBonus.rocketDamageMultiplier = Number(formationBonus.rocketDamageMultiplier || 1) * Number(skill.rocketDamageMultiplier || 1);
  extraBonus.missileDamageMultiplier = Number(formationBonus.missileDamageMultiplier || 1) * Number(skill.missileDamageMultiplier || 1);
  return {
    vie: (ship.stats.vie + (skill.vie || 0)) * Number(skill.hullMultiplier || 1),
    vitesse,
    vitesseReelle:getRealSpeedFromStat(vitesse),
    cargo: (ship.stats.cargo + (skill.cargo || 0)) * Number(skill.cargoMultiplier || 1),
    maxLasers: ship.stats.maxLasers,
    maxGenerators: ship.stats.maxGenerators,
    maxExtras:ship.stats.maxExtras || 3,
    droneCount: getDroneLoadout().length,
    bouclier,
    regen: (regen + (skill.regen || 0)) * Number(formationBonus.regenMultiplier || 1) * Number(skill.regenMultiplier || 1) * generatorMultiplier,
    weaponDamage: skill.weaponDamage || 0,
    weaponDamageMultiplier: Number(skill.weaponDamageMultiplier || 1) * Number(formationBonus.laserDamageMultiplier || 1),
    weaponDamagePercent: Number(skill.weaponDamageMultiplier || 1) * Number(formationBonus.laserDamageMultiplier || 1) - 1,
    shieldAbsorbRatio: Math.max(0, Math.min(0.9, 0.5 + Number(skill.shieldAbsorbBonus || 0))),
    evasionChance: Math.max(0, Math.min(0.75, Number(skill.evasionChance || 0))),
    damageToHpChance: Math.max(0, Math.min(0.5, Number(skill.damageToHpChance || 0))),
    blueLaserBeams: Number(skill.blueLaserBeams || 0) > 0,
    extraBonus
  };
}

export function addXP(amount){
  const gain = Math.max(0, Number(amount || 0));
  store.state.player.xp += gain;
  store.state.player.totalXp = Math.max(0, Number(store.state.player.totalXp || 0)) + gain;
  let leveled = false;
  const levelCap = getPlayerLevelCap();
  while(store.state.player.level < levelCap && store.state.player.xp >= store.state.player.xpNext){
    store.state.player.xp -= store.state.player.xpNext;
    store.state.player.level += 1;
    store.state.player.xpNext = getXpNextForLevel(store.state.player.level);
    leveled = true;
  }
  if(store.state.player.level >= levelCap) store.state.player.xp = Math.min(store.state.player.xp, store.state.player.xpNext);
  syncSkillPoints();
  store.state.player.rankScore = getRankScore();
  return leveled;
}

export function addReputation(amount){
  const gain = Math.max(0, Math.round(Number(amount || 0)));
  if(gain <= 0) return 0;
  store.state.player.reputation = Math.max(0, Number(store.state.player.reputation || 0)) + gain;
  store.state.player.rankScore = getRankScore();
  return gain;
}

export function addReputationFromXp(xp, ratio = 0.1){
  return addReputation(Math.max(0, Number(xp || 0)) * Math.max(0, Number(ratio || 0)));
}
