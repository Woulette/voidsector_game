import { WORLD_MAPS } from "../world/definitions.js";
import { getItemFromInventoryUid } from "../economy/equipment.js";
import { getInventoryItemCount } from "../economy/inventoryStacks.js";

export const PISTOU_PORTGUN_ITEM_ID = "pistou_portgun";
export const PORTGUN_FLUID_ITEM_ID = "teleportation_fluid";
export const PORTGUN_NORMAL_DURATION_MS = 20000;
export const PORTGUN_PREMIUM_DURATION_MS = 5000;
export const PORTGUN_MOVE_TOLERANCE = 24;

export function cancelPendingPortgunTeleport(player, {
  io = null,
  reason = "cancelled",
  message = "Teleportation annulee.",
  now = Date.now()
} = {}){
  if(!player?.pendingPortgunTeleport) return false;
  player.pendingPortgunTeleport = null;
  const payload = {reason, message, at:now};
  const targetSocket = io?.sockets?.sockets?.get?.(player.id);
  if(targetSocket?.emit) targetSocket.emit("portgun:cancelled", payload);
  else io?.to?.(player.id)?.emit?.("portgun:cancelled", payload);
  return true;
}

function normalizeMapId(value){
  return String(value ?? "").trim();
}

function mapNumberFromName(name){
  const match = String(name || "").toUpperCase().match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function getPortgunMapLevelRequirement(map){
  const name = String(map?.name || "").toUpperCase();
  if(name === "CORE") return 0;
  const num = mapNumberFromName(name);
  if(num === 3) return 5;
  if(num === 4) return 10;
  if(num === 5) return 15;
  return 0;
}

export function hasEquippedPortgun(profile){
  const shipId = String(profile?.activeShip || profile?.selectedShip || profile?.ownedShips?.[0] || "orion");
  const loadout = profile?.shipLoadouts?.[shipId] || {};
  const extras = Array.isArray(loadout.extras) ? loadout.extras : [];
  return extras.some(uid=>getItemFromInventoryUid(profile, uid)?.id === PISTOU_PORTGUN_ITEM_ID);
}

export function hasPremiumPortgunTeleport(profile, now = Date.now()){
  const directUntil = Number(profile?.premiumUntil || profile?.player?.premiumUntil || profile?.premium?.until || 0);
  if(Number.isFinite(directUntil) && directUntil > now) return true;
  return profile?.premium?.active === true || profile?.player?.premiumActive === true;
}

export function getPortgunTeleportDurationMs(profile, now = Date.now()){
  return hasPremiumPortgunTeleport(profile, now) ? PORTGUN_PREMIUM_DURATION_MS : PORTGUN_NORMAL_DURATION_MS;
}

export function getRandomPortgunDestination(map, {random = Math.random} = {}){
  const width = Math.max(1200, Number(map?.width || 10000));
  const height = Math.max(1200, Number(map?.height || 8000));
  const margin = Math.min(850, width / 2 - 150, height / 2 - 150);
  const minX = -width / 2 + margin;
  const maxX = width / 2 - margin;
  const minY = -height / 2 + margin;
  const maxY = height / 2 - margin;
  const x = minX + (maxX - minX) * Math.max(0, Math.min(1, Number(random())));
  const y = minY + (maxY - minY) * Math.max(0, Math.min(1, Number(random())));
  return {x:Math.round(x), y:Math.round(y)};
}

export function hasPortgunTeleportMoved(pending, state, tolerance = PORTGUN_MOVE_TOLERANCE){
  if(!pending || !state) return false;
  if(normalizeMapId(state.mapId) !== normalizeMapId(pending.startMapId)) return true;
  if(Math.hypot(Number(state.vx || 0), Number(state.vy || 0)) > 1) return true;
  if(Math.abs(Number(state.enginePower || 0)) > 0.05 || state.moveTarget) return true;
  const dx = Number(state.x || 0) - Number(pending.startX || 0);
  const dy = Number(state.y || 0) - Number(pending.startY || 0);
  return Math.hypot(dx, dy) > Math.max(0, Number(tolerance || 0));
}

export function validatePortgunTeleport({player, profile, targetMapId, now = Date.now(), allowPending = false} = {}){
  if(!player?.state) return {ok:false, reason:"Session de vol introuvable."};
  if(Number(player.state.hp ?? 1) <= 0 || player.state.isDead) return {ok:false, reason:"Impossible de teleporter un vaisseau detruit."};
  if(!allowPending && player.pendingPortgunTeleport) return {ok:false, reason:"Teleportation deja en preparation."};
  const map = WORLD_MAPS[normalizeMapId(targetMapId)];
  if(!map) return {ok:false, reason:"Secteur de destination introuvable."};
  const currentMapId = normalizeMapId(player.state.mapId || player.mapId);
  if(currentMapId.startsWith("portal-") || currentMapId.startsWith("coop-")){
    return {ok:false, reason:"Le Portgun est instable dans cette instance."};
  }
  if(!hasEquippedPortgun(profile)) return {ok:false, reason:"Pistou Portgun non equipe."};
  if(getInventoryItemCount(profile, PORTGUN_FLUID_ITEM_ID) < 1){
    return {ok:false, reason:"Il faut 1 fluide de teleportation."};
  }
  const requirement = getPortgunMapLevelRequirement(map);
  const level = Math.max(1, Math.floor(Number(profile?.player?.level || player?.level || 1)));
  if(level < requirement){
    return {ok:false, reason:`Niveau ${requirement} requis pour cette carte.`, requirement, level};
  }
  return {
    ok:true,
    map,
    requirement,
    level,
    durationMs:getPortgunTeleportDurationMs(profile, now)
  };
}
