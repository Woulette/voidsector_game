import {ammoTypes, droneFormations} from "../../../src/data/equipment.js";
import {skills} from "../../../src/data/progression.js";
import {getDroneLaserDamageMultiplier, getItemFromInventoryUid, getTrustedEquipmentUpgradeLevel} from "../economy/equipment.js";
import {consumeServerCombatBoostCharges, getServerCombatTimedBoostPercent} from "../economy/combatBoosts.js";
import { ANCIENT_PORTAL_ID } from "../../../src/data/ancientPortal.js";
import {applyServerLaserDoubleStrike} from "./shipAbilities.js";
import {getEquippedProfileTitleDamageMultiplier} from "../players/profileTitles.js";
import {canAccountRoleAccessShip, ships} from "../../../src/data/ships.js";
import {getAmmoCooldownKey} from "../../../src/shared/weaponCooldowns.js";

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

  function retryAfterMs(player, weaponClass){
    const key = `${playerKey(player)}:${weaponClass || "laser"}`;
    return Math.max(0, Math.ceil(Number(cooldowns.get(key) || 0) - now()));
  }

  function readyAt(player, weaponClass){
    const key = `${playerKey(player)}:${weaponClass || "laser"}`;
    return Math.max(0, Number(cooldowns.get(key) || 0));
  }

  return {
    check,
    prune,
    readyAt,
    retryAfterMs,
    size:()=>cooldowns.size
  };
}

const fireCooldowns = createCombatCooldownTracker();
export const SERVER_WEAPON_HIT_CHANCES = Object.freeze({
  laser:0.8,
  rocket:0.88,
  missile:0.8
});
const ELITE_LASER_CHARGE_MAX = 5;
const ELITE_LASER_RESET_MS = 10_000;
const ELITE_GREEN_LIFESTEAL_PER_LASER = 0.01;
const ELITE_GREEN_LIFESTEAL_MAX = 0.25;
const ELITE_BLUE_CADENCE_PER_LASER = 0.005;
const ELITE_BLUE_CADENCE_MAX = 0.15;
const ELITE_RED_DAMAGE_PER_LASER = 0.01;
const ELITE_RED_DAMAGE_MAX = 0.25;
const ELITE_LASER_COLORS = ["green", "blue", "red"];
const ELITE_LASER_IDS = new Map([
  ["laser_elite_green", "green"],
  ["laser_elite_blue", "blue"],
  ["laser_elite_red", "red"]
]);
const ELITE_BLUE_CADENCE_ENABLED = true;

function getEliteBlueCooldownMultiplier(cadenceBonus){
  return ELITE_BLUE_CADENCE_ENABLED && Number(cadenceBonus || 0) > 0
    ? 1 / (1 + Number(cadenceBonus || 0))
    : 1;
}

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
  return getTrustedEquipmentUpgradeLevel(profile, itemId);
}

function checkCooldown(player, weaponClass, cooldownMs){
  const result = fireCooldowns.check(player, weaponClass, cooldownMs);
  const cooldownReadyAt = fireCooldowns.readyAt(player, weaponClass);
  if(result.ok) return {...result, cooldownReadyAt};
  return {
    ...result,
    cooldownReadyAt,
    retryAfterMs:fireCooldowns.retryAfterMs(player, weaponClass)
  };
}

export function getServerWeaponHitChance(weaponClass){
  return Number(SERVER_WEAPON_HIT_CHANCES[String(weaponClass || "")] || 0);
}

function rejectCombatFire(reasonCode, reason, extra = {}){
  return {
    ok:false,
    accepted:false,
    outcome:"rejected",
    reasonCode:String(reasonCode || "COMBAT_REJECTED"),
    reason:String(reason || "Tir refuse."),
    consumed:0,
    ...extra
  };
}

function consumeAmmo(profile, ammoId, amount){
  const need = Math.max(1, Math.floor(Number(amount || 1)));
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  const have = Math.max(0, Number(profile.ammoInventory[ammoId] || 0));
  if(have < need) return false;
  profile.ammoInventory[ammoId] = have - need;
  return true;
}

function hasAmmo(profile, ammoId, amount){
  const need = Math.max(1, Math.floor(Number(amount || 1)));
  const have = Math.max(0, Number(profile?.ammoInventory?.[ammoId] || 0));
  return have >= need;
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

function clampEliteCharge(value){
  return Math.max(0, Math.min(ELITE_LASER_CHARGE_MAX, Number(value || 0)));
}

function blankEliteLaserState(){
  return {
    lastLaserAt:0,
    green:{charge:0},
    blue:{charge:0, phase:"charge"},
    red:{charge:0}
  };
}

function ensureEliteLaserStates(profile){
  if(!profile.eliteLaserStates || typeof profile.eliteLaserStates !== "object" || Array.isArray(profile.eliteLaserStates)){
    profile.eliteLaserStates = {};
  }
  return profile.eliteLaserStates;
}

function normalizeEliteLaserState(value){
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    lastLaserAt:Math.max(0, Number(state.lastLaserAt || 0)),
    green:{charge:clampEliteCharge(state.green?.charge)},
    blue:{
      charge:clampEliteCharge(state.blue?.charge),
      phase:state.blue?.phase === "discharge" ? "discharge" : "charge"
    },
    red:{charge:clampEliteCharge(state.red?.charge)}
  };
}

function eliteLaserColor(item){
  const fromEffect = String(item?.effect?.eliteLaserColor || "");
  if(ELITE_LASER_COLORS.includes(fromEffect)) return fromEffect;
  return ELITE_LASER_IDS.get(String(item?.id || "")) || "";
}

function getEliteLaserCounts(lasers){
  const counts = {green:0, blue:0, red:0};
  for(const item of lasers){
    const color = eliteLaserColor(item);
    if(Object.hasOwn(counts, color)) counts[color] += 1;
  }
  return counts;
}

function totalEliteLaserCount(counts){
  return ELITE_LASER_COLORS.reduce((sum, color)=>sum + Math.max(0, Number(counts?.[color] || 0)), 0);
}

function advanceBlueGauge(blue, elapsedSeconds){
  let charge = clampEliteCharge(blue?.charge);
  let phase = blue?.phase === "discharge" ? "discharge" : "charge";
  let remaining = Math.max(0, Number(elapsedSeconds || 0));

  if(phase === "discharge"){
    const activeRemaining = charge;
    if(remaining < activeRemaining){
      return {charge:clampEliteCharge(charge - remaining), phase:"discharge"};
    }
    remaining -= activeRemaining;
    charge = 0;
    phase = "charge";
  }

  charge = clampEliteCharge(charge + remaining);
  return {charge:clampEliteCharge(charge), phase};
}

function serializeEliteLaserState({state, counts, triggers = {}, now = Date.now()}){
  if(totalEliteLaserCount(counts) <= 0) return null;
  const greenPercent = Math.min(Math.max(0, Number(counts.green || 0)) * ELITE_GREEN_LIFESTEAL_PER_LASER, ELITE_GREEN_LIFESTEAL_MAX);
  const redBonus = Math.min(Math.max(0, Number(counts.red || 0)) * ELITE_RED_DAMAGE_PER_LASER, ELITE_RED_DAMAGE_MAX);
  const blueActive = state.blue?.phase === "discharge";
  const cadenceBonus = blueActive
    ? Math.min(Math.max(0, Number(counts.blue || 0)) * ELITE_BLUE_CADENCE_PER_LASER, ELITE_BLUE_CADENCE_MAX)
    : 0;
  const cooldownMultiplier = getEliteBlueCooldownMultiplier(cadenceBonus);
  return {
    maxCharge:ELITE_LASER_CHARGE_MAX,
    resetAfterMs:ELITE_LASER_RESET_MS,
    lastLaserAt:Math.max(0, Number(state.lastLaserAt || 0)),
    updatedAt:now,
    green:{
      count:Math.max(0, Number(counts.green || 0)),
      charge:clampEliteCharge(state.green?.charge),
      triggered:Boolean(triggers.green),
      lifestealPercent:greenPercent
    },
    blue:{
      count:Math.max(0, Number(counts.blue || 0)),
      charge:clampEliteCharge(state.blue?.charge),
      phase:blueActive ? "discharge" : "charge",
      active:blueActive,
      cadenceBonus,
      cooldownMultiplier,
      cadenceEnabled:ELITE_BLUE_CADENCE_ENABLED
    },
    red:{
      count:Math.max(0, Number(counts.red || 0)),
      charge:clampEliteCharge(state.red?.charge),
      triggered:Boolean(triggers.red),
      damageBonus:redBonus
    }
  };
}

function prepareEliteLaserShot(profile, counts, now = Date.now()){
  const states = ensureEliteLaserStates(profile);
  const previous = normalizeEliteLaserState(states.current);
  const hasEliteLasers = totalEliteLaserCount(counts) > 0;
  if(!hasEliteLasers){
    states.current = blankEliteLaserState();
    return null;
  }
  const reset = previous.lastLaserAt <= 0 || now - previous.lastLaserAt > ELITE_LASER_RESET_MS;
  const elapsedSeconds = reset ? 0 : Math.max(0, Math.min(ELITE_LASER_RESET_MS, now - previous.lastLaserAt)) / 1000;
  const next = reset ? blankEliteLaserState() : normalizeEliteLaserState(previous);

  for(const color of ["green", "red"]){
    if(Number(counts[color] || 0) > 0){
      next[color].charge = clampEliteCharge(next[color].charge + elapsedSeconds);
    }else{
      next[color].charge = 0;
    }
  }
  const blueCount = Number(counts.blue || 0);
  next.blue = blueCount > 0
    ? advanceBlueGauge(next.blue, elapsedSeconds)
    : {charge:0, phase:"charge"};
  const blueTriggered = blueCount > 0 && next.blue.phase !== "discharge" && next.blue.charge >= ELITE_LASER_CHARGE_MAX;
  if(blueTriggered){
    next.blue = {charge:ELITE_LASER_CHARGE_MAX, phase:"discharge"};
  }

  const triggers = {
    green:Number(counts.green || 0) > 0 && next.green.charge >= ELITE_LASER_CHARGE_MAX,
    red:Number(counts.red || 0) > 0 && next.red.charge >= ELITE_LASER_CHARGE_MAX,
    blue:blueTriggered
  };
  const greenLifestealPercent = triggers.green ? Math.min(Number(counts.green || 0) * ELITE_GREEN_LIFESTEAL_PER_LASER, ELITE_GREEN_LIFESTEAL_MAX) : 0;
  const redDamageBonus = triggers.red ? Math.min(Number(counts.red || 0) * ELITE_RED_DAMAGE_PER_LASER, ELITE_RED_DAMAGE_MAX) : 0;
  const blueCadenceBonus = next.blue.phase === "discharge" ? Math.min(blueCount * ELITE_BLUE_CADENCE_PER_LASER, ELITE_BLUE_CADENCE_MAX) : 0;
  const blueCooldownMultiplier = getEliteBlueCooldownMultiplier(blueCadenceBonus);

  return {
    redDamageBonus,
    greenLifestealPercent,
    blueCooldownMultiplier,
    commit(){
      next.lastLaserAt = now;
      if(triggers.green) next.green.charge = 0;
      if(triggers.red) next.red.charge = 0;
      states.current = next;
      return serializeEliteLaserState({state:next, counts, triggers, now});
    }
  };
}

export function applyServerEliteLaserLifeSteal({player, eliteLaser, damageDealt, weaponClass = "", now = Date.now()} = {}){
  const green = eliteLaser?.green;
  if(!player?.state || String(weaponClass || "") !== "laser" || !green?.triggered) return {healed:0};
  if(Number(player.state.hp || 0) <= 0) return {healed:0};
  const ratio = Math.max(0, Math.min(0.25, Number(green.lifestealPercent || 0)));
  if(ratio <= 0) return {healed:0};
  const maximum = Math.max(1, Number(player.state.maxHp || player.state.hp || 1));
  const before = Math.max(0, Number(player.state.hp || 0));
  const requested = Math.max(0, Math.round(Number(damageDealt || 0) * ratio));
  player.state.hp = Math.min(maximum, before + requested);
  player.state.updatedAt = now;
  return {
    healed:Math.max(0, Math.round(player.state.hp - before)),
    requested,
    sourceId:"elite_laser_green",
    lifestealPercent:ratio
  };
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
    return {
      ...item,
      droneDamageMultiplier:getDroneLaserDamageMultiplier(profile, index)
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

function getMissileDamageMultiplier(profile){
  return getProfileSkillBonus(profile, "missileDamageMultiplier", 1)
    * getFormationBonus(profile, "missileDamageMultiplier", 1);
}

export function getPrecursorBlessingDamageMultiplier(player, now = Date.now()){
  const blessing = player?.precursorBlessing;
  if(!blessing) return 1;
  const sourceInstanceId = String(blessing.sourceInstanceId || "");
  if(Number(now || 0) >= Number(blessing.expiresAt || 0)
    || String(player?.state?.mapId || player?.mapId || "") !== `portal-${ANCIENT_PORTAL_ID}`
    || !sourceInstanceId
    || String(player?.precursorActiveInstanceId || "") !== sourceInstanceId){
    delete player.precursorBlessing;
    return 1;
  }
  return Math.max(1, Math.min(1.5, Number(blessing.damageMultiplier || 1)));
}

export function getServerShipDamageMultiplier(profile, player){
  const shipId = String(profile?.activeShip || player?.state?.shipId || "");
  if(!shipId || (player?.state?.shipId && String(player.state.shipId) !== shipId)) return 1;
  const ship = ships.find(candidate=>candidate.id === shipId);
  if(!ship || !canAccountRoleAccessShip(ship, player?.account?.role)) return 1;
  return Math.max(1, Number(ship.stats?.damageMultiplier || 1));
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

export function calculateServerCombatTravelTimeMs({player, enemy, weaponClass, projectileSpeed} = {}){
  if(String(weaponClass || "") === "laser") return 0;
  const distance = Math.hypot(
    Number(enemy?.x || 0) - Number(player?.state?.x || 0),
    Number(enemy?.y || 0) - Number(player?.state?.y || 0)
  );
  if(String(weaponClass || "") === "rocket"){
    const seconds = Math.max(0.22, Math.min(1.55, distance / Math.max(1, Number(projectileSpeed || 620)) + 0.14));
    return Math.round(seconds * 1000);
  }
  if(String(weaponClass || "") === "missile"){
    const seconds = Math.max(0.28, Math.min(1.65, distance / Math.max(1, Number(projectileSpeed || 520)) + 0.18));
    return Math.round(seconds * 1000);
  }
  return 0;
}

export function resolveServerCombatFire({player, profile, enemy, payload, firmDamageBonus = 0, random = Math.random, now = Date.now()} = {}){
  if(!player || !profile || !enemy) return rejectCombatFire("COMBAT_UNAVAILABLE", "Combat impossible.");
  const ammo = getAmmo(String(payload?.ammoId || "ammo_x1"));
  if(!ammo) return rejectCombatFire("UNKNOWN_AMMO", "Munition inconnue.");
  const weaponClass = String(payload?.weaponClass || ammo.weaponClass || "laser");
  if(weaponClass !== ammo.weaponClass) return rejectCombatFire("INCOMPATIBLE_AMMO", "Munition incompatible.");
  const hitChance = getServerWeaponHitChance(weaponClass);
  const missileHitChance = getServerWeaponHitChance("missile");
  let damage = 0;
  let consumed = 1;
  let cooldownMs = 1000;
  let range = 500;
  let projectileSpeed = 0;
  let missileHits = 0;
  let missileMisses = 0;
  let laserDamage = null;
  let eliteLaserShot = null;
  let eliteLaser = null;

  if(weaponClass === "laser"){
    const shipLasers = getShipLaserItems(profile, player);
    const droneLasers = getDroneLaserItems(profile);
    const lasers = [...shipLasers, ...droneLasers];
    if(lasers.length <= 0) return rejectCombatFire("NO_WEAPON", "Aucun laser equipe.");
    const shipPool = sumLaserDamage(profile, shipLasers);
    const dronePool = sumLaserDamage(profile, droneLasers);
    consumed = lasers.length;
    range = shipLasers.length > 0 ? shipPool.range : dronePool.range;
    cooldownMs = Math.max(250, Number(ammo.cooldown || 1) * 1000);
    eliteLaserShot = prepareEliteLaserShot(profile, getEliteLaserCounts(lasers), now);
    if(ammo.id !== "ammo_x6") cooldownMs = Math.max(250, cooldownMs * Math.max(0.25, Number(eliteLaserShot?.blueCooldownMultiplier || 1)));
    laserDamage = {
      ship:rollBetween(shipPool.min, shipPool.max, random),
      drone:rollBetween(dronePool.min, dronePool.max, random),
      droneCount:droneLasers.length
    };
  }else if(weaponClass === "rocket"){
    const launcher = getLauncher(profile, player, "rocket");
    if(!launcher) return rejectCombatFire("NO_WEAPON", "Aucun lance roquette equipe.");
    consumed = 1;
    range = Number(launcher.effect?.rocketRange || 550);
    projectileSpeed = Math.max(1, Number(ammo.speed || 620));
    cooldownMs = Math.max(500, Number(launcher.effect?.rocketCooldown || ammo.cooldown || 5) * getRocketCooldownMultiplier(profile, player) * 1000);
    damage = (rollBetween(ammo.damageMin, ammo.damageMax, random) + getUpgradeLevel(profile, ammo.id) * 80) * Number(launcher.effect?.rocketDamageMultiplier || 1);
  }else if(weaponClass === "missile"){
    const launcher = getLauncher(profile, player, "missile");
    if(!launcher) return rejectCombatFire("NO_WEAPON", "Aucun lance missile equipe.");
    const capacity = Math.max(1, Math.min(12, Number(launcher.effect?.missileCapacity || 3)));
    consumed = Math.max(1, Math.min(capacity, Math.floor(Number(payload?.count || capacity))));
    range = Number(launcher.effect?.missileRange || 600);
    projectileSpeed = Math.max(1, Number(ammo.speed || 520));
    cooldownMs = Math.max(750, consumed * Number(launcher.effect?.missileReload || 3) * 1000);
    const multiplier = Number(launcher.effect?.missileDamageMultiplier || 1) * getMissileDamageMultiplier(profile);
    for(let index = 0; index < consumed; index += 1){
      if(random() < missileHitChance){
        missileHits += 1;
        damage += rollBetween(ammo.damageMin, ammo.damageMax, random) * multiplier;
      }else{
        missileMisses += 1;
      }
    }
  }else{
    return rejectCombatFire("INVALID_WEAPON", "Type d'arme invalide.");
  }

  if(!distanceOk(player, enemy, range)) return rejectCombatFire("OUT_OF_RANGE", "Cible hors de portee.");
  if(!hasAmmo(profile, ammo.id, consumed)) return rejectCombatFire("NO_AMMO", "Munitions insuffisantes.");
  const cooldown = checkCooldown(player, getAmmoCooldownKey(ammo), cooldownMs);
  if(!cooldown.ok){
    return rejectCombatFire("COOLDOWN", cooldown.reason || "Arme en recharge.", {
      cooldownReadyAt:Math.max(0, Number(cooldown.cooldownReadyAt || 0)),
      retryAfterMs:Math.max(0, Number(cooldown.retryAfterMs || 0))
    });
  }
  consumeAmmo(profile, ammo.id, consumed);
  recordServerWeaponUse(profile, weaponClass, consumed);
  if(weaponClass === "laser" && eliteLaserShot){
    eliteLaser = eliteLaserShot.commit();
  }
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
  const shipDamageMultiplier = getServerShipDamageMultiplier(profile, player);
  damage *= shipDamageMultiplier;
  const titleDamageMultiplier = getEquippedProfileTitleDamageMultiplier(profile);
  damage *= titleDamageMultiplier;
  const activeFirmDamageBonus = Math.max(0, Number(firmDamageBonus || 0));
  damage *= 1 + activeFirmDamageBonus;
  damage *= getPrecursorBlessingDamageMultiplier(player, now);
  if(weaponClass === "laser" && eliteLaser?.red?.triggered){
    damage *= 1 + Math.max(0, Number(eliteLaser.red.damageBonus || 0));
  }
  const hit = weaponClass === "missile" ? missileHits > 0 : random() < hitChance;
  const baseDamage = hit ? Math.max(1, Math.round(damage)) : 0;
  const doubleStrike = weaponClass === "laser"
    ? applyServerLaserDoubleStrike({player, profile, weaponClass, hit, damage:baseDamage, now})
    : {triggered:false, bonusDamage:0};
  const bonusDamage = Math.max(0, Math.round(Number(doubleStrike?.bonusDamage || 0)));
  const shipAbilityState = doubleStrike?.status || null;
  const travelTimeMs = calculateServerCombatTravelTimeMs({
    player,
    enemy,
    weaponClass,
    projectileSpeed
  });
  return {
    ok:true,
    accepted:true,
    outcome:hit ? "hit" : "miss",
    hit,
    damage:baseDamage + bonusDamage,
    ammoId:ammo.id,
    consumed,
    ammoRemaining:Math.max(0, Number(profile.ammoInventory?.[ammo.id] || 0)),
    weaponClass,
    cooldownMs:Math.max(0, Math.round(Number(cooldownMs || 0))),
    cooldownReadyAt:Math.max(0, Number(cooldown.cooldownReadyAt || 0)),
    projectileSpeed,
    travelTimeMs,
    missileHits,
    missileMisses,
    boostPercent,
    droneBoostPercent,
    shipDamageMultiplier,
    titleDamageMultiplier,
    firmDamageBonus:activeFirmDamageBonus,
    eliteLaser,
    shipAbilityState,
    range,
    doubleStrike:doubleStrike?.triggered ? {
      abilityId:doubleStrike.status?.abilityId || "spectral_double_shot",
      shipId:doubleStrike.status?.shipId || String(profile.activeShip || player.state.shipId || ""),
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
