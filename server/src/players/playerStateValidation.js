import { ships } from "../../../src/data/ships.js";
import { droneFormations } from "../../../src/data/equipment.js";
import { skills } from "../../../src/data/progression.js";
import { getItemFromInventoryUid } from "../economy/equipment.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { getWorldSafePortals, isPointInFriendlyWorldSafeArea, isPointInWorldSafeArea } from "../world/spawn.js";
import { FIRMS, getFirmMapId } from "../../../src/data/firms.js";

const MAP_OUTSIDE_LIMIT = 1800;
const PORTAL_TRANSFER_PADDING = 180;
const MOVEMENT_JITTER_ALLOWANCE = 90;
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
    add(getFirmMapId(firm.id, 3), getFirmMapId(firm.id, 5));
    add(getFirmMapId(firm.id, 4), getFirmMapId(firm.id, 5));
  }
  const byName = new Map(Object.values(WORLD_MAPS).map(map=>[String(map.name || ""), Number(map.id)]));
  for(const [from, to] of [
    ["ASTRA-03", "CYAN-03"],
    ["CYAN-04", "JAUNE-04"],
    ["CYAN-05", "ASTRA-05"],
    ["JAUNE-03", "VERTE-03"],
    ["ASTRA-04", "VERTE-04"],
    ["JAUNE-05", "VERTE-05"],
    ["ASTRA-05", "CORE"],
    ["CYAN-05", "CORE"],
    ["JAUNE-05", "CORE"],
    ["VERTE-05", "CORE"]
  ]){
    if(byName.has(from) && byName.has(to)) add(byName.get(from), byName.get(to));
  }
  return transitions;
}

const WORLD_MAP_TRANSITIONS = buildWorldMapTransitions();

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

function getSkillStats(profile){
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

function getFormationStats(profile){
  return droneFormations.find(formation=>formation.id === profile?.activeDroneFormation)?.effect || {};
}

function getPublicDroneState(profile){
  const loadout = Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [];
  const droneCount = loadout.filter(Boolean).length;
  const upgrades = loadout.slice(0, 10).map((uid, index)=>Boolean(uid && profile?.dronePermanentUpgrades?.[index]));
  const activeFormation = droneFormations.find(formation=>formation.id === profile?.activeDroneFormation)?.id || "base";
  return {droneCount, droneUpgrades:upgrades, activeDroneFormation:activeFormation};
}

function getRepairBotHealRate(profile){
  const loadout = profile?.shipLoadouts?.[profile?.activeShip] || {};
  const extras = Array.isArray(loadout.extras) ? loadout.extras : [];
  const equippedRate = extras.reduce((rate, uid)=>{
    const item = getItemFromInventoryUid(profile, uid);
    return Math.max(rate, finite(item?.effect?.repairBotHealRate));
  }, 0);
  return equippedRate * finite(getSkillStats(profile).repairBotHealMultiplier, 1);
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
  const loadout = profile?.shipLoadouts?.[profile?.activeShip] || {};
  const generatorUids = [
    ...(Array.isArray(loadout.generators) ? loadout.generators : []),
    ...(Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [])
  ].filter(Boolean);
  const generatedShield = generatorUids.reduce((total, uid)=>{
    const item = getItemFromInventoryUid(profile, uid);
    const base = Math.max(0, finite(item?.stats?.bouclier));
    const upgrade = Math.max(0, finite(profile?.equipmentUpgrades?.[item?.id]));
    return total + base + (base > 0 ? upgrade * 30 : 0);
  }, 0);
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const trustedShield = (generatedShield > 0 ? generatedShield + finite(skill.shieldBonus) : 0)
    * finite(skill.shieldMultiplier, 1)
    * finite(formation.shieldMultiplier, 1);
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

function instanceMapAllowed(player, mapId, groups){
  if(mapId === "coop-test"){
    const group = player?.groupId ? groups?.get(player.groupId) : null;
    return Boolean(group?.instance && group.instance.type !== "portal");
  }
  if(!mapId.startsWith("portal-")) return false;
  const group = player?.groupId ? groups?.get(player.groupId) : null;
  return Boolean(group?.instance?.type === "portal" && `portal-${group.instance.portal?.id}` === mapId);
}

function canChangeMap({player, previous, nextMapId, nextPoint, groups}){
  const previousMapId = String(previous?.mapId ?? player?.mapId ?? "0");
  if(nextMapId === previousMapId) return true;
  if(instanceMapAllowed(player, nextMapId, groups)) return true;
  if(previousMapId.startsWith("portal-") || previousMapId === "coop-test"){
    const nextMap = WORLD_MAPS[nextMapId];
    return Boolean(nextMap)
      && (isNearMapTransferPoint(nextPoint, nextMap) || isPointInWorldSafeArea(nextPoint, nextMap, PORTAL_TRANSFER_PADDING));
  }
  const previousMap = WORLD_MAPS[previousMapId];
  const nextMap = WORLD_MAPS[nextMapId];
  if(!previousMap || !nextMap) return false;
  if(!WORLD_MAP_TRANSITIONS.has(`${previousMapId}:${nextMapId}`)) return false;
  return isNearMapTransferPoint(previous, previousMap)
    && (isNearMapTransferPoint(nextPoint, nextMap) || isPointInWorldSafeArea(nextPoint, nextMap, PORTAL_TRANSFER_PADDING));
}

function allowedMovementDistance(profile, ship, elapsedSeconds){
  const baseSpeed = Math.max(1, finite(ship?.stats?.vitesse, 300));
  const skill = getSkillStats(profile);
  const formation = getFormationStats(profile);
  const speedWithEquipmentAndSkills = (baseSpeed + finite(skill.vitesse) + 100)
    * finite(skill.speedMultiplier, 1)
    * finite(formation.speedMultiplier, 1)
    * 1.2;
  return speedWithEquipmentAndSkills * elapsedSeconds + MOVEMENT_JITTER_ALLOWANCE;
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
  const safeRespawn = previousHp <= 0
    && ((nextMap && isPointInFriendlyWorldSafeArea(nextPoint, nextMap, profile?.player?.firmId || "astra", PORTAL_TRANSFER_PADDING))
      || String(previous.mapId || "").startsWith("portal-"));
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
  const ship = getActiveShip(profile);
  const previousSameShip = !previous || String(previous.shipId || ship.id) === ship.id;
  const requestedMapId = String(payload?.mapId ?? previous?.mapId ?? player?.mapId ?? "0");
  const rawPoint = {x:finite(payload?.x, previous?.x), y:finite(payload?.y, previous?.y)};
  const trustedSession = getTrustedShipSession(profile, ship.id);
  const expectedInitialMapId = String(trustedSession?.mapId ?? profile?.worldSession?.mapId ?? getProfileHomeMapId(profile));
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
  if(mapChanged && !canChangeMap({player, previous, nextMapId:mapId, nextPoint:point, groups})){
    mapId = String(previous.mapId ?? player?.mapId ?? "0");
    nextMap = WORLD_MAPS[mapId] || null;
    point = {x:finite(previous.x), y:finite(previous.y)};
    corrected = true;
    reason = "transition de map invalide";
  }

  const elapsedSeconds = previous
    ? clamp((now - finite(previous.updatedAt, now - 50)) / 1000, 0.05, 2)
    : 0.05;
  if(previous && mapId === String(previous.mapId ?? player?.mapId ?? "0")){
    const distance = Math.hypot(point.x - finite(previous.x), point.y - finite(previous.y));
    const allowed = allowedMovementDistance(profile, ship, elapsedSeconds);
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
      speed:Math.max(1, finite(ship?.stats?.vitesse, previous?.speed || 300)),
      radius:Math.max(32, Math.min(96, finite(payload?.radius, previous?.radius || 48))),
      droneCount:droneState.droneCount,
      droneUpgrades:droneState.droneUpgrades,
      activeDroneFormation:droneState.activeDroneFormation,
      rankName:String(payload?.rankName || previous?.rankName || "").slice(0, 48),
      rankAssetPath:String(payload?.rankAssetPath || previous?.rankAssetPath || "").slice(0, 180),
      lockedTargetId:String(payload?.lockedTargetId || "").slice(0, 100),
      updatedAt:now
    }
  };
}
