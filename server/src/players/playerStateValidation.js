import { getPlayerInstanceGroup } from "../portals/portalSessions.js";
import { AZURON_PORTAL_MAP } from "../../../src/data/azuronPortal.js";
import { isWavePortal } from "../../../src/data/wavePortalTiers.js";
import { getSlowedMovementSpeed } from "../../../src/shared/movementSlow.js";
import { getRankById, getRankForScore, getRankAssetPath } from "../../../src/data/ranks.js";
import { canAccountRoleAccessShip, ships } from "../../../src/data/ships.js";
import { droneFormations } from "../../../src/data/equipment.js";
import { skills } from "../../../src/data/progression.js";
import { getDroneGeneratorStatMultiplier, getDronePermanentUpgradeItem, getItemFromInventoryUid, getTrustedEquipmentUpgradeLevel } from "../economy/equipment.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { getWorldSafePortals, isPointInWorldSafeArea } from "../world/spawn.js";
import { FIRMS, getFirmMapId } from "../../../src/data/firms.js";
import { getServerCombatTimedBoostPercent } from "../economy/combatBoosts.js";
import { resolveRickyPortalPoint, RICKY_PORTAL_MAP } from "../../../src/data/rickyPortal.js";
import { ECLANITE_PORTAL_ID, resolveEclanitePortalPoint } from "../../../src/data/eclanitePortal.js";
import { isPremiumActive, PREMIUM_REPAIR_BOT_MULTIPLIER } from "../../../src/data/premium.js";
import { calculateShieldAbsorbRatio } from "../../../src/shared/shieldAbsorption.js";
import { getShipProgressionLockReason } from "../../../src/shared/progressionUnlocks.js";
import { getActiveProfileTitleName, STELLAR_SYSTEM_TITLE_ORNAMENT_ID } from "./profileTitles.js";
import { PRISMATIC_PORTAL_ID, PRISMATIC_PORTAL_MAP } from "../../../src/data/prismaticPortal.js";
import {
  ANCIENT_PORTAL_ID,
  ANCIENT_PORTAL_MAP,
  resolveAncientPortalPoint
} from "../../../src/data/ancientPortal.js";

const MAP_OUTSIDE_LIMIT = 1800;
const PORTAL_TRANSFER_PADDING = 180;
const MOVEMENT_JITTER_ALLOWANCE = 90;
const PORTAL_TRANSFER_POINTS = {
  top:{x:0, y:-3300},
  bottom:{x:0, y:3300},
  left:{x:-4300, y:0},
  right:{x:4300, y:0},
  topLeft:{x:-4300, y:-3300},
  topRight:{x:4300, y:-3300},
  bottomLeft:{x:-4300, y:3300},
  bottomRight:{x:4300, y:3300}
};
const ZONE_TWO_FOUR_PORTAL_POINTS = {
  astra:{map2:"bottomRight", map4:"bottomLeft"},
  cyan:{map2:"topRight", map4:"topLeft"},
  jaune:{map2:"topLeft", map4:"topRight"},
  verte:{map2:"bottomLeft", map4:"bottomRight"}
};
function buildWorldMapTransitions(){
  const transitions = new Set();
  const add = (a, b)=>{
    transitions.add(`${a}:${b}`);
    transitions.add(`${b}:${a}`);
  };
  for(const firm of FIRMS){
    add(getFirmMapId(firm.id, 1), getFirmMapId(firm.id, 2));
    add(getFirmMapId(firm.id, 2), getFirmMapId(firm.id, 3));
    add(getFirmMapId(firm.id, 2), getFirmMapId(firm.id, 4));
    add(getFirmMapId(firm.id, 3), getFirmMapId(firm.id, 4));
    add(getFirmMapId(firm.id, 3), getFirmMapId(firm.id, 5));
    add(getFirmMapId(firm.id, 4), getFirmMapId(firm.id, 5));
  }
  const byName = new Map(Object.values(WORLD_MAPS).map(map=>[String(map.name || ""), Number(map.id)]));
  for(const [from, to] of [
    ["Helion-03", "Nereid-03"],
    ["Nereid-04", "Aureon-04"],
    ["Nereid-05", "Helion-05"],
    ["Aureon-03", "Sylva-03"],
    ["Helion-04", "Sylva-04"],
    ["Aureon-05", "Sylva-05"],
    ["Helion-05", "CORE"],
    ["Nereid-05", "CORE"],
    ["Aureon-05", "CORE"],
    ["Sylva-05", "CORE"]
  ]){
    if(byName.has(from) && byName.has(to)) add(byName.get(from), byName.get(to));
  }
  return transitions;
}

const WORLD_MAP_TRANSITIONS = buildWorldMapTransitions();

function getZoneTwoFourTransitionFirmId(fromMapId, toMapId){
  const from = String(fromMapId);
  const to = String(toMapId);
  for(const firm of FIRMS){
    const map2 = String(getFirmMapId(firm.id, 2));
    const map4 = String(getFirmMapId(firm.id, 4));
    if((from === map2 && to === map4) || (from === map4 && to === map2)) return firm.id;
  }
  return null;
}

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function getActiveShip(profile, accountRole = null){
  const ownedShipIds = new Set((Array.isArray(profile?.ownedShips) ? profile.ownedShips : ["orion"]).map(String));
  ownedShipIds.add("orion");
  const candidates = [
    profile?.activeShip,
    profile?.selectedShip,
    ...(Array.isArray(profile?.ownedShips) ? profile.ownedShips : []),
    "orion"
  ].map(String);
  for(const shipId of candidates){
    const ship = ships.find(candidate=>candidate.id === shipId);
    const roleAllowed = accountRole === null || canAccountRoleAccessShip(ship, accountRole);
    if(ship && ownedShipIds.has(ship.id) && roleAllowed && !getShipProgressionLockReason(profile, ship)) return ship;
  }
  return ships.find(ship=>ship.id === "orion") || ships[0];
}

export function getSkillStats(profile){
  const result = {};
  for(const skill of skills){
    const savedRanks = Array.isArray(profile?.skillRanks?.[skill.id]) ? profile.skillRanks[skill.id] : [];
    for(let index = 0; index < skill.levels.length; index += 1){
      const node = skill.levels[index];
      const rank = Math.max(0, finite(savedRanks[index]));
      if(rank <= 0) continue;
      const activeRank = Array.isArray(node.ranks) ? node.ranks[Math.min(rank, node.ranks.length) - 1] : node;
      for(const [key, value] of Object.entries(activeRank?.stats || {})){
        if(key.endsWith("Multiplier")) result[key] = finite(result[key], 1) * finite(value, 1);
        else result[key] = finite(result[key]) + finite(value);
      }
    }
  }
  return result;
}

export function getFormationStats(profile){
  return droneFormations.find(formation=>formation.id === profile?.activeDroneFormation)?.effect || {};
}

function getPublicDroneState(profile){
  const loadout = Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [];
  const droneCount = loadout.filter(Boolean).length;
  const upgrades = loadout.slice(0, 10).map((uid, index)=>Boolean(uid && getDronePermanentUpgradeItem(profile, index)));
  const activeFormation = droneFormations.find(formation=>formation.id === profile?.activeDroneFormation)?.id || "base";
  return {droneCount, droneUpgrades:upgrades, activeDroneFormation:activeFormation};
}

function getPublicPilotIdentity(profile){
  const pilotTitle = getActiveProfileTitleName(profile) || "";
  return {
    pilotTitle,
    pilotOrnamentId:pilotTitle ? STELLAR_SYSTEM_TITLE_ORNAMENT_ID : ""
  };
}

function getGeneratorStatTotal(profile, uids, key, upgradeValue){
  return uids.reduce((total, uid)=>{
    const item = getItemFromInventoryUid(profile, uid);
    const base = Math.max(0, finite(item?.stats?.[key]));
    const upgrade = getTrustedEquipmentUpgradeLevel(profile, item?.id);
    return total + base + (base > 0 ? upgrade * upgradeValue : 0);
  }, 0);
}

export function getTrustedGeneratorStat(profile, key, upgradeValue){
  const activeShipId = getActiveShip(profile)?.id || profile?.activeShip || "orion";
  const loadout = profile?.shipLoadouts?.[activeShipId] || {};
  const shipUids = (Array.isArray(loadout.generators) ? loadout.generators : []).filter(Boolean);
  const droneLoadout = Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [];
  const droneMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "drone");
  const droneTotal = droneLoadout.reduce((total, uid, index)=>{
    if(!uid) return total;
    return total
      + getGeneratorStatTotal(profile, [uid], key, upgradeValue)
        * getDroneGeneratorStatMultiplier(profile, index, key);
  }, 0);
  return getGeneratorStatTotal(profile, shipUids, key, upgradeValue)
    + droneTotal * droneMultiplier;
}

export function getTrustedShieldAbsorbRatio(profile){
  const activeShipId = getActiveShip(profile)?.id || profile?.activeShip || "orion";
  const loadout = profile?.shipLoadouts?.[activeShipId] || {};
  const shipUids = (Array.isArray(loadout.generators) ? loadout.generators : []).filter(Boolean);
  const droneLoadout = Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [];
  const droneMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "drone");
  const contribution = (uid, multiplier)=>{
    const item = getItemFromInventoryUid(profile, uid);
    const baseShield = Math.max(0, finite(item?.stats?.bouclier));
    const upgrade = getTrustedEquipmentUpgradeLevel(profile, item?.id);
    return {
      capacity:(baseShield + (baseShield > 0 ? upgrade * 30 : 0)) * multiplier,
      ratio:item?.effect?.shieldAbsorbRatio
    };
  };
  return calculateShieldAbsorbRatio([
    ...shipUids.map(uid=>contribution(uid, 1)),
    ...droneLoadout.map((uid, index)=>uid
      ? contribution(uid, droneMultiplier * getDroneGeneratorStatMultiplier(profile, index, "bouclier"))
      : null
    ).filter(Boolean)
  ], getSkillStats(profile).shieldAbsorbBonus);
}

export function getRepairBotConfig(profile){
  const skill = getSkillStats(profile);
  const activeShipId = getActiveShip(profile)?.id || profile?.activeShip || "orion";
  const loadout = profile?.shipLoadouts?.[activeShipId] || {};
  const extras = Array.isArray(loadout.extras) ? loadout.extras : [];
  const config = extras.reduce((result, uid)=>{
    const item = getItemFromInventoryUid(profile, uid);
    const effect = item?.effect || {};
    if(effect.repairBot) result.hasRepairBot = true;
    if(effect.repairBotAuto) result.hasAuto = true;
    result.healRate = Math.max(result.healRate, finite(effect.repairBotHealRate));
    if(effect.repairBotDelay) result.delay = Math.max(1, Math.min(result.delay, finite(effect.repairBotDelay, result.delay)));
    return result;
  }, {
    hasRepairBot:false,
    hasAuto:false,
    healRate:0,
    delay:Math.max(6, 15 - Math.max(0, finite(skill.repairBotDelayReduction)))
  });
  config.healRate = config.hasRepairBot
    ? config.healRate * finite(skill.repairBotHealMultiplier, 1)
    : 0;
  if(config.hasRepairBot && isPremiumActive(profile?.player)) config.healRate *= PREMIUM_REPAIR_BOT_MULTIPLIER;
  return config;
}

export function getRepairBotHealRate(profile){
  return getRepairBotConfig(profile).healRate;
}

export function getTrustedShieldRegen(profile){
  const baseRegen = getTrustedGeneratorStat(profile, "regen", 1);
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const generatorMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "generator");
  return Math.max(0, (baseRegen + finite(skill.regen))
    * finite(formation.regenMultiplier, 1)
    * finite(skill.regenMultiplier, 1)
    * generatorMultiplier);
}

function getTrustedMaxHp(profile, ship, firmBoosters = {}){
  const skill = getSkillStats(profile);
  return Math.max(1, (finite(ship?.stats?.vie, 5000) + finite(skill.vie))
    * finite(skill.hullMultiplier, 1)
    * (1 + Math.max(0, finite(firmBoosters.hull))));
}

function getTrustedShipSession(profile, shipId){
  const cleanShipId = String(shipId || "");
  const shipSession = profile?.shipWorldSessions?.[cleanShipId];
  if(shipSession && String(shipSession.shipId || "") === cleanShipId) return shipSession;
  if(profile?.worldSession && String(profile.worldSession.shipId || "") === cleanShipId) return profile.worldSession;
  return null;
}

function getProfileHomeMapId(profile){
  const firm = FIRMS.find(entry=>entry.id === String(profile?.player?.firmId || "astra").toLowerCase()) || FIRMS[0];
  return String(firm.baseMapId);
}

function getTrustedMaxShield(profile, firmBoosters = {}){
  const generatedShield = getTrustedGeneratorStat(profile, "bouclier", 30);
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const generatorMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "generator");
  const trustedShield = (generatedShield > 0 ? generatedShield + finite(skill.shieldBonus) : 0)
    * finite(skill.shieldMultiplier, 1)
    * finite(formation.shieldMultiplier, 1)
    * generatorMultiplier
    * (1 + Math.max(0, finite(firmBoosters.shield)));
  return Math.max(0, trustedShield);
}

function clampPointToMap(point, map){
  if(!map) return {x:finite(point?.x), y:finite(point?.y)};
  if(Number.isFinite(Number(map.strictBoundsPadding))){
    const padding = Math.max(0, Number(map.strictBoundsPadding));
    return {
      x:clamp(finite(point?.x), -map.width / 2 + padding, map.width / 2 - padding),
      y:clamp(finite(point?.y), -map.height / 2 + padding, map.height / 2 - padding)
    };
  }
  return {
    x:clamp(finite(point?.x), -map.width / 2 - MAP_OUTSIDE_LIMIT, map.width / 2 + MAP_OUTSIDE_LIMIT),
    y:clamp(finite(point?.y), -map.height / 2 - MAP_OUTSIDE_LIMIT, map.height / 2 + MAP_OUTSIDE_LIMIT)
  };
}

function getTrustedStateMap(mapId){
  const id = String(mapId ?? "");
  if(WORLD_MAPS[id]) return WORLD_MAPS[id];
  if(isWavePortal(id)) return {...AZURON_PORTAL_MAP,strictBoundsPadding:65};
  if(id === `portal-${PRISMATIC_PORTAL_ID}`){
    return {...PRISMATIC_PORTAL_MAP, strictBoundsPadding:65};
  }
  if(id === `portal-${ANCIENT_PORTAL_ID}`){
    return {...ANCIENT_PORTAL_MAP, strictBoundsPadding:65};
  }
  return null;
}

function isNearMapPortal(point, map){
  return getWorldSafePortals(map).some(portal=>{
    const radius = Math.max(Number(portal.safeRadius || 0), Number(portal.r || 95) * 3, 280) + PORTAL_TRANSFER_PADDING;
    return Math.hypot(finite(point?.x) - finite(portal.x), finite(point?.y) - finite(portal.y)) <= radius;
  });
}

function isNearStandardSectorPortal(point, map){
  if(!map?.width || !map?.height) return false;
  const x = finite(point?.x);
  const y = finite(point?.y);
  const halfW = map.width / 2;
  const halfH = map.height / 2;
  const portals = [
    {x:halfW - 700, y:-halfH + 700},
    {x:-halfW + 700, y:-halfH + 700},
    {x:halfW - 700, y:halfH - 700},
    {x:-halfW + 700, y:halfH - 700},
    {x:0, y:-halfH + 700},
    {x:0, y:halfH - 700},
    {x:halfW - 700, y:0},
    {x:-halfW + 700, y:0}
  ];
  return portals.some(portal=>Math.hypot(x - portal.x, y - portal.y) <= 420 + PORTAL_TRANSFER_PADDING);
}

function isNearMapTransferPoint(point, map){
  return isNearMapPortal(point, map) || isNearStandardSectorPortal(point, map);
}

function isNearPortalTransferPoint(point, portalPoint){
  return Boolean(portalPoint)
    && Math.hypot(finite(point?.x) - finite(portalPoint.x), finite(point?.y) - finite(portalPoint.y)) <= 420 + PORTAL_TRANSFER_PADDING;
}

function isNearZoneTwoFourPortal(point, mapId, firmId){
  const layout = ZONE_TWO_FOUR_PORTAL_POINTS[firmId];
  if(!layout) return false;
  const zone = String(mapId) === String(getFirmMapId(firmId, 2)) ? "map2" : "map4";
  return isNearPortalTransferPoint(point, PORTAL_TRANSFER_POINTS[layout[zone]]);
}

function instanceMapAllowed(player, mapId, groups){
  const group = getPlayerInstanceGroup(player, groups);
  const instance = group?.instance;
  if(instance?.abandonedMemberIds?.includes(player?.id)) return false;
  if(mapId === "coop-test"){
    return Boolean(instance && instance.type !== "portal");
  }
  if(!mapId.startsWith("portal-")) return false;
  if(instance?.type !== "portal" || `portal-${instance.portal?.id}` !== mapId) return false;
  if(Array.isArray(instance.joinedMemberIds) && !instance.joinedMemberIds.includes(player?.id)) return false;
  return true;
}

function canChangeMap({player, previous, nextMapId, nextPoint, groups, profile}){
  const previousMapId = String(previous?.mapId ?? player?.mapId ?? "0");
  if(nextMapId === previousMapId) return true;
  if(instanceMapAllowed(player, nextMapId, groups)) return true;
  if(previousMapId.startsWith("portal-")){
    // Azuron exits are committed by the server after the four-second transfer.
    if(isWavePortal(previousMapId)) return false;
    const group = getPlayerInstanceGroup(player, groups);
    if(group?.instance?.type !== "portal" || !group.instance.completed) return false;
    const nextMap = WORLD_MAPS[nextMapId];
    return Boolean(nextMap)
      && (isNearMapTransferPoint(nextPoint, nextMap) || isPointInWorldSafeArea(nextPoint, nextMap, PORTAL_TRANSFER_PADDING));
  }
  if(previousMapId === "coop-test"){
    const nextMap = WORLD_MAPS[nextMapId];
    return Boolean(nextMap)
      && (isNearMapTransferPoint(nextPoint, nextMap) || isPointInWorldSafeArea(nextPoint, nextMap, PORTAL_TRANSFER_PADDING));
  }
  const previousMap = WORLD_MAPS[previousMapId];
  const nextMap = WORLD_MAPS[nextMapId];
  if(!previousMap || !nextMap) return false;
  if(!WORLD_MAP_TRANSITIONS.has(`${previousMapId}:${nextMapId}`)) return false;
  const zoneTwoFourFirmId = getZoneTwoFourTransitionFirmId(previousMapId, nextMapId);
  if(zoneTwoFourFirmId){
    return isNearZoneTwoFourPortal(previous, previousMapId, zoneTwoFourFirmId)
      && isNearZoneTwoFourPortal(nextPoint, nextMapId, zoneTwoFourFirmId);
  }
  return isNearMapTransferPoint(previous, previousMap)
    && (isNearMapTransferPoint(nextPoint, nextMap) || isPointInWorldSafeArea(nextPoint, nextMap, PORTAL_TRANSFER_PADDING));
}

function getActiveMovementSlow(player, now = Date.now()){
  const slow = player?.statusEffects?.slow;
  if(!slow || now >= Number(slow.expiresAt || 0)) return null;
  return slow;
}

function getEffectiveMovementSpeed(profile, ship, player, now = Date.now()){
  return getSlowedMovementSpeed(getTrustedMovementSpeed(profile, ship), getActiveMovementSlow(player, now));
}

function allowedMovementDistance(profile, ship, elapsedSeconds, player, now){
  const speedWithEquipmentAndSkills = (getEffectiveMovementSpeed(profile, ship, player, now) + 100) * 1.2;
  return speedWithEquipmentAndSkills * elapsedSeconds + MOVEMENT_JITTER_ALLOWANCE;
}

export function getTrustedMovementSpeed(profile, ship = getActiveShip(profile)){
  const baseSpeed = Math.max(1, finite(ship?.stats?.vitesse, 300));
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const generatorSpeed = getTrustedGeneratorStat(profile, "vitesse", 2);
  const generatorMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "generator");
  return Math.max(1, (baseSpeed + finite(skill.vitesse) + generatorSpeed)
    * finite(skill.speedMultiplier, 1)
    * finite(formation.speedMultiplier, 1)
    * generatorMultiplier);
}

function validateVitals({player, previous, payload, profile, ship, firmBoosters, elapsedSeconds, mapChanged, nextPoint, nextMap, now}){
  const hullMultiplier = 1 + Math.max(0, finite(firmBoosters?.hull));
  const shieldMultiplier = 1 + Math.max(0, finite(firmBoosters?.shield));
  const trustedSession = getTrustedShipSession(profile, ship.id);
  const maxHp = getTrustedMaxHp(profile, ship, firmBoosters);
  const maxShield = getTrustedMaxShield(profile, firmBoosters);

  if(!previous){
    const savedMaxHp = Math.max(1, finite(trustedSession?.maxHp, maxHp));
    const savedHpRatio = trustedSession
      ? clamp(finite(trustedSession.hp, savedMaxHp) / savedMaxHp, 0, 1)
      : 1;
    const trustedInitialHp = maxHp * savedHpRatio;
    const savedMaxShield = Math.max(0, finite(trustedSession?.maxShield));
    const savedShieldRatio = trustedSession && savedMaxShield > 0
      ? clamp(finite(trustedSession.shield, savedMaxShield) / savedMaxShield, 0, 1)
      : 1;
    const trustedInitialShield = maxShield * savedShieldRatio;
    return {
      hp:clamp(trustedInitialHp, 0, maxHp),
      maxHp,
      shield:clamp(trustedInitialShield, 0, maxShield),
      maxShield,
      firmHullMultiplier:hullMultiplier,
      firmShieldMultiplier:shieldMultiplier
    };
  }

  const previousMaxHp = Math.max(1, finite(previous.maxHp, maxHp));
  const previousHpRatio = clamp(finite(previous.hp) / previousMaxHp, 0, 1);
  const previousHp = maxHp * previousHpRatio;
  const previousMaxShield = Math.max(0, finite(previous.maxShield));
  const previousShieldRatio = previousMaxShield > 0
    ? clamp(finite(previous.shield) / previousMaxShield, 0, 1)
    : 1;
  const previousShield = maxShield * previousShieldRatio;
  const safeRespawn = false;
  if(previousHp <= 0 && !safeRespawn){
    return {hp:0, maxHp, shield:0, maxShield, firmHullMultiplier:hullMultiplier, firmShieldMultiplier:shieldMultiplier};
  }
  const requestedHp = finite(payload?.hp, previousHp);
  const repairConfig = getRepairBotConfig(profile);
  const repairTickAllowance = maxHp * repairConfig.healRate + 5;
  const lastDamageAt = finite(player?.lastServerDamageAt);
  const poisonActive = now < finite(player?.statusEffects?.poison?.expiresAt);
  // A snapshot captured before a hit is not a heal. Match the repair cooldown,
  // including poison ticks, before accepting any client-reported hull recovery.
  const canHeal = !poisonActive && (lastDamageAt <= 0 || now - lastDamageAt >= repairConfig.delay * 1000);
  const repairTickReady = now - finite(player?.lastRepairBotHealAt) >= 850;
  const isRepairTick = canHeal && requestedHp > previousHp
    && requestedHp - previousHp <= repairTickAllowance
    && repairTickReady;
  const hpHealAllowance = !canHeal ? 0 : safeRespawn
    ? maxHp
    : Math.max(maxHp * 0.04 * elapsedSeconds + 5, isRepairTick ? repairTickAllowance : 0);
  const shieldRegenAllowance = safeRespawn ? maxShield : maxShield * 0.18 * elapsedSeconds + 25;
  const hp = clamp(requestedHp, previousHp, Math.min(maxHp, previousHp + hpHealAllowance));
  const shield = clamp(
    finite(payload?.shield, previousShield),
    previousShield,
    Math.min(maxShield, previousShield + shieldRegenAllowance)
  );
  if(isRepairTick && hp > previousHp) player.lastRepairBotHealAt = now;

  return {hp, maxHp, shield, maxShield, firmHullMultiplier:hullMultiplier, firmShieldMultiplier:shieldMultiplier};
}

function addCombatCorrectionDetail(details, field, clientValue, serverValue, tolerance = 0){
  const client = finite(clientValue, serverValue);
  const server = finite(serverValue);
  if(Math.abs(client - server) <= tolerance) return;
  details.push({field, client, server});
}

export function validatePlayerState({player, payload, profile, groups, firmBoosters = {}, rankAssignment = null, now = Date.now()} = {}){
  const previous = player?.state || null;
  const rank = rankAssignment?.source === "server" ? getRankById(rankAssignment.rankId) : getRankForScore(Number(profile?.player?.rankScore || 0));
  const pilotIdentity = getPublicPilotIdentity(profile);
  if(previous && player?.deathState){
    return {
      corrected:true,
      reason:"vaisseau detruit",
      state:{
        ...previous,
        hp:0,
        vx:0,
        vy:0,
        enginePower:0,
        moveTarget:null,
        attackTargetId:"",
        attackAmmoId:"",
        attackWeaponClass:"",
        repairBotActive:false,
        ...pilotIdentity,
        updatedAt:now
      }
    };
  }
  const ship = getActiveShip(profile, player?.account?.role);
  const previousSameShip = !previous || String(previous.shipId || ship.id) === ship.id;
  const requestedMapId = String(payload?.mapId ?? previous?.mapId ?? player?.mapId ?? "0");
  const rawPoint = {x:finite(payload?.x, previous?.x), y:finite(payload?.y, previous?.y)};
  const trustedSession = getTrustedShipSession(profile, ship.id);
  const savedInitialMapId = String(trustedSession?.mapId ?? profile?.worldSession?.mapId ?? "");
  const expectedInitialMapId = WORLD_MAPS[savedInitialMapId] ? savedInitialMapId : getProfileHomeMapId(profile);
  const requestedMapAllowed = instanceMapAllowed(player, requestedMapId, groups)
    || Boolean(WORLD_MAPS[requestedMapId]) && Boolean(previous || requestedMapId === expectedInitialMapId);
  let mapId = requestedMapAllowed ? requestedMapId : String(previous?.mapId ?? expectedInitialMapId);
  let nextMap = getTrustedStateMap(mapId);
  let point = nextMap ? clampPointToMap(rawPoint, nextMap) : rawPoint;
  let corrected = !requestedMapAllowed || point.x !== rawPoint.x || point.y !== rawPoint.y;
  let reason = !requestedMapAllowed ? "map interdite" : corrected ? "position hors limites" : "";

  if(!previous && nextMap){
    const expectedPoint = trustedSession && String(trustedSession.mapId) === mapId
      ? trustedSession
      : nextMap.spawn || {x:0, y:0};
    if(Math.hypot(point.x - finite(expectedPoint.x), point.y - finite(expectedPoint.y)) > MOVEMENT_JITTER_ALLOWANCE){
      point = clampPointToMap(expectedPoint, nextMap);
      corrected = true;
      reason ||= "position initiale invalide";
    }
  }

  const mapChanged = Boolean(previous && mapId !== String(previous.mapId ?? player?.mapId ?? "0"));
  if(mapChanged && !canChangeMap({player, previous, nextMapId:mapId, nextPoint:point, groups, profile})){
    mapId = String(previous.mapId ?? player?.mapId ?? "0");
    nextMap = getTrustedStateMap(mapId);
    point = {x:finite(previous.x), y:finite(previous.y)};
    corrected = true;
    reason = "transition de map invalide";
  }
  if(mapChanged && mapId === "portal-ricky"){
    point={...RICKY_PORTAL_MAP.spawn};
    corrected=true;
    reason ||= "point d'entree du portail";
  }

  const elapsedSeconds = previous
    ? clamp((now - finite(previous.updatedAt, now - 50)) / 1000, 0.05, 2)
    : 0.05;
  if(previous && mapId === String(previous.mapId ?? player?.mapId ?? "0")){
    const distance = Math.hypot(point.x - finite(previous.x), point.y - finite(previous.y));
    const allowed = allowedMovementDistance(profile, ship, elapsedSeconds, player, now);
    if(distance > allowed){
      const ratio = allowed / Math.max(1, distance);
      point = {
        x:finite(previous.x) + (point.x - finite(previous.x)) * ratio,
        y:finite(previous.y) + (point.y - finite(previous.y)) * ratio
      };
      corrected = true;
      reason = "vitesse impossible";
    }
  }

  if(mapId === "portal-ricky" && previous && String(previous.mapId ?? player?.mapId ?? "") === "portal-ricky"){
    const group = getPlayerInstanceGroup(player, groups);
    const instance = group?.instance;
    if(instance?.type === "portal" && instance.portal?.id === "ricky"){
      const resolved = resolveRickyPortalPoint(
        previous || point,
        point,
        Boolean(instance.objective?.breachOpen),
        finite(previous?.radius, 48)
      );
      if(resolved.x !== point.x || resolved.y !== point.y){
        point=resolved;
        corrected=true;
        reason ||= "collision portail";
      }
    }
  }
  if(mapId === `portal-${ECLANITE_PORTAL_ID}`
    && previous
    && String(previous.mapId ?? player?.mapId ?? "") === `portal-${ECLANITE_PORTAL_ID}`){
    const group = getPlayerInstanceGroup(player, groups);
    const instance = group?.instance;
    if(instance?.type === "portal" && instance.portal?.id === ECLANITE_PORTAL_ID){
      const resolved = resolveEclanitePortalPoint(
        previous || point,
        point,
        instance.objective?.breaches || {},
        finite(previous?.radius, 48)
      );
      if(resolved.x !== point.x || resolved.y !== point.y){
        point=resolved;
        corrected=true;
        reason ||= "collision portail Éclanite";
      }
    }
  }
  if(mapId === `portal-${ANCIENT_PORTAL_ID}`
    && previous
    && String(previous.mapId ?? player?.mapId ?? "") === `portal-${ANCIENT_PORTAL_ID}`){
    const group = getPlayerInstanceGroup(player, groups);
    const instance = group?.instance;
    if(instance?.type === "portal" && instance.portal?.id === ANCIENT_PORTAL_ID){
      const resolved = resolveAncientPortalPoint(
        previous || point,
        point,
        {
          phase:instance.objective?.phase,
          rooms:instance.objective?.rooms
        },
        finite(previous?.radius, 48)
      );
      if(resolved.x !== point.x || resolved.y !== point.y){
        point=resolved;
        corrected=true;
        reason ||= "collision portail des Precurseurs";
      }
    }
  }

  const vitals = validateVitals({
    player,
    previous:previousSameShip ? previous : null,
    payload,
    profile,
    ship,
    firmBoosters,
    elapsedSeconds,
    mapChanged,
    nextPoint:point,
    nextMap,
    now
  });
  const correctionDetails = [];
  addCombatCorrectionDetail(correctionDetails, "hp", payload?.hp, vitals.hp);
  addCombatCorrectionDetail(correctionDetails, "maxHp", payload?.maxHp, vitals.maxHp);
  addCombatCorrectionDetail(correctionDetails, "shield", payload?.shield, vitals.shield, 1e-6);
  addCombatCorrectionDetail(correctionDetails, "maxShield", payload?.maxShield, vitals.maxShield, 1e-6);
  if(String(payload?.shipId || ship.id) !== ship.id){
    correctionDetails.push({
      field:"shipId",
      client:String(payload?.shipId || ""),
      server:ship.id
    });
  }
  const shieldDiffers = Math.abs(finite(payload?.shield, vitals.shield) - vitals.shield) > 1e-6;
  const maxShieldDiffers = Math.abs(finite(payload?.maxShield, vitals.maxShield) - vitals.maxShield) > 1e-6;
  if(finite(payload?.hp, vitals.hp) !== vitals.hp
    || finite(payload?.maxHp, vitals.maxHp) !== vitals.maxHp
    || shieldDiffers
    || maxShieldDiffers
    || String(payload?.shipId || ship.id) !== ship.id){
    corrected = true;
    reason ||= "etat de combat invalide";
  }

  const derivedVx = previous && !mapChanged ? (point.x - finite(previous.x)) / elapsedSeconds : 0;
  const derivedVy = previous && !mapChanged ? (point.y - finite(previous.y)) / elapsedSeconds : 0;
  const droneState = getPublicDroneState(profile);
  let moveTarget = null;
  if(payload?.moveTarget && typeof payload.moveTarget === "object"){
    const rawMoveTarget = {
      x:finite(payload.moveTarget.x),
      y:finite(payload.moveTarget.y)
    };
    moveTarget = nextMap ? clampPointToMap(rawMoveTarget, nextMap) : rawMoveTarget;
  }
  const attackTargetId = String(payload?.attackTargetId || "").slice(0, 100);
  const attackWeaponClass = ["laser", "rocket", "missile"].includes(payload?.attackWeaponClass)
    ? String(payload.attackWeaponClass)
    : "";
  const repairBotConfig = getRepairBotConfig(profile);

  return {
    corrected,
    reason,
    positionCorrected:point.x !== rawPoint.x || point.y !== rawPoint.y || mapId !== requestedMapId,
    correctionDetails,
    state:{
      x:point.x,
      y:point.y,
      angle:finite(payload?.angle, previous?.angle),
      ...vitals,
      // Velocity describes motion at capture time, not the spacing of network arrivals.
      // It is only a rendering hint; position validation above remains authoritative.
      ...getBoundedMotionVelocity(payload, derivedVx, derivedVy, getEffectiveMovementSpeed(profile, ship, player, now)),
      enginePower:clamp(finite(payload?.enginePower), 0, 1),
      engineAngle:finite(payload?.engineAngle, payload?.angle),
      mapId,
      shipId:ship.id,
      shipImg:String(payload?.shipImg || previous?.shipImg || ship.combatImg || ship.img || ""),
      level:Math.max(1, Math.floor(finite(profile?.player?.level, previous?.level || 1))),
      speed:getEffectiveMovementSpeed(profile, ship, player, now),
      baseMovementSpeed:getTrustedMovementSpeed(profile, ship),
      radius:Math.max(32, Math.min(96, finite(payload?.radius, previous?.radius || 48))),
      droneCount:droneState.droneCount,
      droneUpgrades:droneState.droneUpgrades,
      activeDroneFormation:droneState.activeDroneFormation,
      shieldAbsorbRatio:getTrustedShieldAbsorbRatio(profile),
      rankId:rank.id,
      rankName:rank.name,
      rankAssetPath:getRankAssetPath(rank),
      ...pilotIdentity,
      moveTarget,
      lockedTargetId:String(payload?.lockedTargetId || "").slice(0, 100),
      attackTargetId,
      attackAmmoId:attackTargetId ? String(payload?.attackAmmoId || "").slice(0, 40) : "",
      attackWeaponClass:attackTargetId ? attackWeaponClass : "",
      repairBotActive:repairBotConfig.hasRepairBot ? Boolean(payload?.repairBotActive ?? previous?.repairBotActive) : false,
      updatedAt:now
    }
  };
}

function getBoundedMotionVelocity(payload, fallbackX, fallbackY, maxSpeed){
  const vx = finite(payload?.vx, fallbackX);
  const vy = finite(payload?.vy, fallbackY);
  const speed = Math.hypot(vx, vy);
  const scale = speed > maxSpeed ? maxSpeed / speed : 1;
  return {vx:vx * scale, vy:vy * scale};
}
