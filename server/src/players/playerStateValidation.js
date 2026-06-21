import { ships } from "../../../src/data/ships.js";
import { droneFormations } from "../../../src/data/equipment.js";
import { skills } from "../../../src/data/progression.js";
import { getItemFromInventoryUid } from "../economy/equipment.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { getWorldSafePortals, isPointInWorldSafeArea } from "../world/spawn.js";
import { FIRMS, getFirmMapId } from "../../../src/data/firms.js";
import { getServerCombatTimedBoostPercent } from "../economy/combatBoosts.js";
import { resolveRickyPortalPoint, RICKY_PORTAL_MAP } from "../../../src/data/rickyPortal.js";
import { isPremiumActive, PREMIUM_REPAIR_BOT_MULTIPLIER } from "../../../src/data/premium.js";

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

function getActiveShip(profile){
  const shipId = String(profile?.activeShip || "orion");
  return ships.find(ship=>ship.id === shipId) || ships.find(ship=>ship.id === "orion") || ships[0];
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
  const upgrades = loadout.slice(0, 10).map((uid, index)=>Boolean(uid && profile?.dronePermanentUpgrades?.[index]));
  const activeFormation = droneFormations.find(formation=>formation.id === profile?.activeDroneFormation)?.id || "base";
  return {droneCount, droneUpgrades:upgrades, activeDroneFormation:activeFormation};
}

function getGeneratorStatTotal(profile, uids, key, upgradeValue){
  return uids.reduce((total, uid)=>{
    const item = getItemFromInventoryUid(profile, uid);
    const base = Math.max(0, finite(item?.stats?.[key]));
    const upgrade = Math.max(0, finite(profile?.equipmentUpgrades?.[item?.id]));
    return total + base + (base > 0 ? upgrade * upgradeValue : 0);
  }, 0);
}

function getTrustedGeneratorStat(profile, key, upgradeValue){
  const activeShipId = getActiveShip(profile)?.id || profile?.activeShip || "orion";
  const loadout = profile?.shipLoadouts?.[activeShipId] || {};
  const shipUids = (Array.isArray(loadout.generators) ? loadout.generators : []).filter(Boolean);
  const droneUids = (Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : []).filter(Boolean);
  const droneMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "drone");
  return getGeneratorStatTotal(profile, shipUids, key, upgradeValue)
    + getGeneratorStatTotal(profile, droneUids, key, upgradeValue) * droneMultiplier;
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

function getTrustedMaxHp(profile, ship){
  const skill = getSkillStats(profile);
  return Math.max(1, (finite(ship?.stats?.vie, 5000) + finite(skill.vie)) * finite(skill.hullMultiplier, 1));
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

function getShieldCap(profile, previous){
  const generatedShield = getTrustedGeneratorStat(profile, "bouclier", 30);
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const generatorMultiplier = 1 + getServerCombatTimedBoostPercent(profile, "generator");
  const trustedShield = (generatedShield > 0 ? generatedShield + finite(skill.shieldBonus) : 0)
    * finite(skill.shieldMultiplier, 1)
    * finite(formation.shieldMultiplier, 1)
    * generatorMultiplier;
  return Math.max(finite(previous?.maxShield), trustedShield * 1.5);
}

function clampPointToMap(point, map){
  if(!map) return {x:finite(point?.x), y:finite(point?.y)};
  return {
    x:clamp(finite(point?.x), -map.width / 2 - MAP_OUTSIDE_LIMIT, map.width / 2 + MAP_OUTSIDE_LIMIT),
    y:clamp(finite(point?.y), -map.height / 2 - MAP_OUTSIDE_LIMIT, map.height / 2 + MAP_OUTSIDE_LIMIT)
  };
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
  const group = player?.groupId ? groups?.get(player.groupId) : null;
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
    const group = player?.groupId ? groups?.get(player.groupId) : null;
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
  if(!slow || now >= Number(slow.expiresAt || 0)) return 0;
  return Math.max(0, Number(slow.amount || 0));
}

function getEffectiveMovementSpeed(profile, ship, player, now = Date.now()){
  return Math.max(1, getTrustedMovementSpeed(profile, ship) - getActiveMovementSlow(player, now));
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

function validateVitals({player, previous, payload, profile, ship, elapsedSeconds, mapChanged, nextPoint, nextMap, now}){
  const shipHp = getTrustedMaxHp(profile, ship);
  const trustedSession = getTrustedShipSession(profile, ship.id);
  const trustedInitialMaxHp = trustedSession
    ? clamp(finite(trustedSession.maxHp, shipHp), 1, shipHp * 1.75)
    : shipHp;
  const maxHpCap = Math.max(shipHp, finite(previous?.maxHp, trustedInitialMaxHp), shipHp * 1.75);
  const requestedMaxHp = clamp(finite(payload?.maxHp, previous?.maxHp || trustedInitialMaxHp), 1, maxHpCap);
  const maxHp = previous
    ? Math.max(1, Math.min(requestedMaxHp, Math.max(finite(previous.maxHp, requestedMaxHp), shipHp * 1.75)))
    : trustedInitialMaxHp;

  const previousMaxShield = Math.max(0, finite(previous?.maxShield));
  const requestedMaxShield = Math.max(0, finite(payload?.maxShield, previousMaxShield));
  const maxShieldCap = getShieldCap(profile, previous);
  const maxShield = Math.min(requestedMaxShield, maxShieldCap);

  if(!previous){
    const trustedInitialHp = trustedSession
      ? finite(trustedSession.hp, maxHp)
      : maxHp;
    const trustedInitialShield = trustedSession
      ? finite(trustedSession.shield, maxShield)
      : maxShield;
    return {
      hp:clamp(trustedInitialHp, 0, maxHp),
      maxHp,
      shield:clamp(trustedInitialShield, 0, maxShield),
      maxShield
    };
  }

  const previousHp = clamp(finite(previous.hp), 0, maxHp);
  const previousShield = clamp(finite(previous.shield), 0, maxShield);
  const safeRespawn = false;
  if(previousHp <= 0 && !safeRespawn){
    return {hp:0, maxHp, shield:0, maxShield};
  }
  const requestedHp = finite(payload?.hp, previousHp);
  const repairHealRate = getRepairBotHealRate(profile);
  const repairTickAllowance = maxHp * repairHealRate + 5;
  const repairTickReady = now - finite(player?.lastRepairBotHealAt) >= 850;
  const isRepairTick = requestedHp > previousHp
    && requestedHp - previousHp <= repairTickAllowance
    && repairTickReady;
  const hpHealAllowance = safeRespawn
    ? maxHp
    : Math.max(maxHp * 0.04 * elapsedSeconds + 5, isRepairTick ? repairTickAllowance : 0);
  const shieldRegenAllowance = safeRespawn ? maxShield : maxShield * 0.18 * elapsedSeconds + 25;
  const hp = clamp(requestedHp, 0, Math.min(maxHp, previousHp + hpHealAllowance));
  const shield = clamp(finite(payload?.shield, previousShield), 0, Math.min(maxShield, previousShield + shieldRegenAllowance));
  if(isRepairTick && hp > previousHp) player.lastRepairBotHealAt = now;

  return {hp, maxHp, shield, maxShield};
}

export function validatePlayerState({player, payload, profile, groups, now = Date.now()} = {}){
  const previous = player?.state || null;
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
        updatedAt:now
      }
    };
  }
  const ship = getActiveShip(profile);
  const previousSameShip = !previous || String(previous.shipId || ship.id) === ship.id;
  const requestedMapId = String(payload?.mapId ?? previous?.mapId ?? player?.mapId ?? "0");
  const rawPoint = {x:finite(payload?.x, previous?.x), y:finite(payload?.y, previous?.y)};
  const trustedSession = getTrustedShipSession(profile, ship.id);
  const savedInitialMapId = String(trustedSession?.mapId ?? profile?.worldSession?.mapId ?? "");
  const expectedInitialMapId = WORLD_MAPS[savedInitialMapId] ? savedInitialMapId : getProfileHomeMapId(profile);
  const requestedMapAllowed = instanceMapAllowed(player, requestedMapId, groups)
    || Boolean(WORLD_MAPS[requestedMapId]) && Boolean(previous || requestedMapId === expectedInitialMapId);
  let mapId = requestedMapAllowed ? requestedMapId : String(previous?.mapId ?? expectedInitialMapId);
  let nextMap = WORLD_MAPS[mapId] || null;
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
    nextMap = WORLD_MAPS[mapId] || null;
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
    const group = player?.groupId ? groups?.get(player.groupId) : null;
    const instance = group?.instance;
    if(instance?.type === "portal" && instance.portal?.id === "ricky"){
      const resolved = resolveRickyPortalPoint(
        previous || point,
        point,
        Boolean(instance.objective?.breachOpen),
        finite(payload?.radius, previous?.radius || 48)
      );
      if(resolved.x !== point.x || resolved.y !== point.y){
        point=resolved;
        corrected=true;
        reason ||= "collision portail";
      }
    }
  }

  const vitals = validateVitals({
    player,
    previous:previousSameShip ? previous : null,
    payload,
    profile,
    ship,
    elapsedSeconds,
    mapChanged,
    nextPoint:point,
    nextMap,
    now
  });
  if(finite(payload?.hp, vitals.hp) !== vitals.hp
    || finite(payload?.maxHp, vitals.maxHp) !== vitals.maxHp
    || finite(payload?.shield, vitals.shield) !== vitals.shield
    || finite(payload?.maxShield, vitals.maxShield) !== vitals.maxShield
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
    state:{
      x:point.x,
      y:point.y,
      angle:finite(payload?.angle, previous?.angle),
      ...vitals,
      vx:derivedVx,
      vy:derivedVy,
      enginePower:clamp(finite(payload?.enginePower), 0, 1),
      engineAngle:finite(payload?.engineAngle, payload?.angle),
      mapId,
      shipId:ship.id,
      shipImg:String(payload?.shipImg || previous?.shipImg || ship.combatImg || ship.img || ""),
      level:Math.max(1, Math.floor(finite(profile?.player?.level, previous?.level || 1))),
      speed:getEffectiveMovementSpeed(profile, ship, player, now),
      radius:Math.max(32, Math.min(96, finite(payload?.radius, previous?.radius || 48))),
      droneCount:droneState.droneCount,
      droneUpgrades:droneState.droneUpgrades,
      activeDroneFormation:droneState.activeDroneFormation,
      rankName:String(payload?.rankName || previous?.rankName || "").slice(0, 48),
      rankAssetPath:String(payload?.rankAssetPath || previous?.rankAssetPath || "").slice(0, 180),
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
