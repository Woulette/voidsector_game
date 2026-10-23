import { getPlayerInstanceGroup } from "../portals/portalSessions.js";
import { WORLD_MAPS } from "./definitions.js";
import { getRepairBotConfig, getTrustedShieldRegen } from "../players/playerStateValidation.js";
import { WORLD_SESSION_SAVE_INTERVAL_MS } from "../players/profileWorldSession.js";
import { advanceServerPlayerStateTimeline } from "../players/playerStateStream.js";
import { PRISMATIC_PORTAL_ID, PRISMATIC_PORTAL_MAP } from "../../../src/data/prismaticPortal.js";
import {
  ANCIENT_PORTAL_ID,
  ANCIENT_PORTAL_MAP,
  resolveAncientPortalPoint
} from "../../../src/data/ancientPortal.js";

const HIDDEN_CLIENT_STALE_MS = 250;
const VISIBLE_CLIENT_STALE_MS = 2500;
const BACKGROUND_RECOVERY_CACHE_MS = 1000;
const MOVEMENT_SYNC_MS = 250;
const MOVEMENT_SAVE_MS = WORLD_SESSION_SAVE_INTERVAL_MS;
const AUTO_FIRE_CHECK_MS = 120;
const MAP_PADDING = 65;

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function getMovementMap(mapId){
  const token = String(mapId ?? "0");
  if(WORLD_MAPS[token]) return WORLD_MAPS[token];
  if(token === `portal-${PRISMATIC_PORTAL_ID}`) return PRISMATIC_PORTAL_MAP;
  if(token === `portal-${ANCIENT_PORTAL_ID}`) return ANCIENT_PORTAL_MAP;
  if(token === "coop-test" || token.startsWith("portal-")){
    return {id:token, width:5200, height:3600};
  }
  return null;
}

function clampPointToMovementMap(point, map){
  if(!map?.width || !map?.height) return point;
  return {
    x:clamp(finite(point.x), -map.width / 2 + MAP_PADDING, map.width / 2 - MAP_PADDING),
    y:clamp(finite(point.y), -map.height / 2 + MAP_PADDING, map.height / 2 - MAP_PADDING)
  };
}

function isClientStale(player, now){
  const lastClientStateAt = finite(player?.lastClientStateAt, finite(player?.state?.updatedAt, now));
  const staleAfterMs = player?.clientPageHidden === true
    ? HIDDEN_CLIENT_STALE_MS
    : VISIBLE_CLIENT_STALE_MS;
  return now - lastClientStateAt >= staleAfterMs;
}

function updateServerMovement(player, dt, now, groups, isAutomaticTravelActive){
  const state = player?.state;
  if(isAutomaticTravelActive?.(player)) return false;
  if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
  const target = state.moveTarget;
  if(!target) return false;
  if(!isClientStale(player, now)) return false;

  const map = getMovementMap(state.mapId);
  const clampedTarget = clampPointToMovementMap(target, map);
  state.moveTarget = clampedTarget;

  const dx = finite(clampedTarget.x) - finite(state.x);
  const dy = finite(clampedTarget.y) - finite(state.y);
  const distance = Math.hypot(dx, dy);
  if(distance < 8){
    state.vx = 0;
    state.vy = 0;
    state.enginePower = 0;
    state.moveTarget = null;
    state.updatedAt = now;
    return true;
  }

  const slow = player?.statusEffects?.slow;
  const slowAmount = slow && now < finite(slow.expiresAt)
    ? Math.max(0, finite(slow.amount))
    : 0;
  const speed = Math.max(1, finite(state.speed, 300) - slowAmount);
  const step = Math.min(speed * Math.max(0.001, dt), distance);
  const nx = dx / distance;
  const ny = dy / distance;
  const previousPoint = {x:finite(state.x), y:finite(state.y)};
  state.x = previousPoint.x + nx * step;
  state.y = previousPoint.y + ny * step;
  const clampedPosition = clampPointToMovementMap({x:state.x, y:state.y}, map);
  const group = getPlayerInstanceGroup(player, groups);
  const instance = group?.instance;
  const resolvedPosition = String(state.mapId || "") === `portal-${ANCIENT_PORTAL_ID}`
    && instance?.type === "portal"
    && instance.portal?.id === ANCIENT_PORTAL_ID
    ? resolveAncientPortalPoint(
        previousPoint,
        clampedPosition,
        {
          phase:instance.objective?.phase,
          rooms:instance.objective?.rooms
        },
        finite(state.radius, 48)
      )
    : clampedPosition;
  state.x = resolvedPosition.x;
  state.y = resolvedPosition.y;
  state.vx = nx * speed;
  state.vy = ny * speed;
  state.angle = Math.atan2(ny, nx) + Math.PI / 2;
  state.engineAngle = state.angle;
  state.enginePower = 1;
  state.updatedAt = now;
  return true;
}

function secondsSinceServerDamage(player, now){
  const lastDamageAt = finite(player?.lastServerDamageAt);
  return lastDamageAt > 0 ? Math.max(0, (now - lastDamageAt) / 1000) : 999;
}

function updateServerRepairBot(player, config, dt, now){
  const state = player?.state;
  if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
  if(!isClientStale(player, now)) return false;

  const repairConfig = config || {
    hasRepairBot:false,
    hasAuto:false,
    healRate:0,
    delay:15
  };
  const hadActive = Boolean(state.repairBotActive);
  if(!repairConfig.hasRepairBot || Number(state.hp || 0) >= Number(state.maxHp || 0)){
    state.repairBotActive = false;
    player.serverRepairBotTick = 0;
    if(hadActive){
      state.updatedAt = now;
      return true;
    }
    return false;
  }

  const canRepair = secondsSinceServerDamage(player, now) >= repairConfig.delay;
  let active = hadActive;
  if(repairConfig.hasAuto && !active && canRepair) active = true;
  if(!canRepair) active = false;

  if(!active){
    state.repairBotActive = false;
    player.serverRepairBotTick = 0;
    if(hadActive){
      state.updatedAt = now;
      return true;
    }
    return false;
  }

  state.repairBotActive = true;
  player.serverRepairBotTick = finite(player.serverRepairBotTick) + Math.max(0, finite(dt));
  let healed = false;
  while(player.serverRepairBotTick >= 1 && Number(state.hp || 0) < Number(state.maxHp || 0)){
    player.serverRepairBotTick -= 1;
    const healAmount = Math.max(1, Math.round(Number(state.maxHp || 0) * repairConfig.healRate));
    const before = Number(state.hp || 0);
    state.hp = Math.min(Number(state.maxHp || 0), before + healAmount);
    healed ||= Number(state.hp || 0) > before;
  }
  if(Number(state.hp || 0) >= Number(state.maxHp || 0)){
    state.hp = Number(state.maxHp || 0);
    state.repairBotActive = false;
    player.serverRepairBotTick = 0;
  }
  if(healed || hadActive !== Boolean(state.repairBotActive)){
    state.updatedAt = now;
    return true;
  }
  return false;
}

function updateServerShieldRegen(player, regen, dt, now){
  const state = player?.state;
  if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
  if(!isClientStale(player, now)) return false;
  const maxShield = Math.max(0, Number(state.maxShield || 0));
  if(maxShield <= 0 || Number(state.shield || 0) >= maxShield) return false;
  const trustedRegen = Math.max(0, finite(regen));
  if(trustedRegen <= 0) return false;
  const before = Math.max(0, Number(state.shield || 0));
  state.shield = Math.min(maxShield, before + trustedRegen * Math.max(0, finite(dt)));
  if(state.shield === before) return false;
  state.updatedAt = now;
  return true;
}

export function createPlayerActivityManager({
  io,
  players,
  groups,
  presence,
  profileManager,
  publicPlayer,
  applyEnemyHitForPlayer,
  isAutomaticTravelActive
}){
  function getBackgroundRecoveryConfig(player, now){
    if(
      player.backgroundRecoveryConfig
      && now < finite(player.nextBackgroundRecoveryConfigAt)
    ){
      return player.backgroundRecoveryConfig;
    }
    const profile = profileManager?.getProfileSnapshotForPlayer?.(player)
      || profileManager?.getProfileForPlayer?.(player)
      || null;
    const config = profile
      ? {
          repairBot:getRepairBotConfig(profile),
          shieldRegen:getTrustedShieldRegen(profile)
        }
      : {
          repairBot:{hasRepairBot:false, hasAuto:false, healRate:0, delay:15},
          shieldRegen:0
        };
    player.backgroundRecoveryConfig = config;
    player.nextBackgroundRecoveryConfigAt = now + BACKGROUND_RECOVERY_CACHE_MS;
    return config;
  }

  function syncPlayerState(player, now){
    if(!player?.state) return;
    if(now < finite(player.nextServerMovementSyncAt)) return;
    player.nextServerMovementSyncAt = now + MOVEMENT_SYNC_MS;
    advanceServerPlayerStateTimeline(player, now, MOVEMENT_SYNC_MS);
    const moving = Boolean(player.state.moveTarget)
      || Math.hypot(finite(player.state.vx), finite(player.state.vy)) > .5
      || finite(player.state.enginePower) > .02;
    const reliable = player.lastServerMotionBroadcastMoving === undefined
      || player.lastServerMotionBroadcastMoving !== moving
      || now - finite(player.lastReliableStateBroadcastAt) >= 1000;
    player.lastServerMotionBroadcastMoving = moving;
    io.to(player.id).emit("player:state-correction", {
      ...player.state,
      source:"state-correction"
    });
    if(player.mapRoom && typeof publicPlayer === "function"){
      const target = io.to(player.mapRoom);
      const emitter = reliable ? target : target?.volatile || target;
      emitter.emit("player:state", publicPlayer(player));
      if(reliable) player.lastReliableStateBroadcastAt = now;
    }
  }

  function savePlayerState(player, now){
    if(now < finite(player.nextServerMovementSaveAt)) return;
    player.nextServerMovementSaveAt = now + MOVEMENT_SAVE_MS;
    profileManager?.saveWorldSession?.({player, state:player.state});
  }

  function updateServerAutoFire(player, now){
    const state = player?.state;
    if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
    if(!isClientStale(player, now)) return false;
    if(now < finite(player.nextServerAutoFireCheckAt)) return false;
    player.nextServerAutoFireCheckAt = now + AUTO_FIRE_CHECK_MS;

    const attackTargetId = String(state.attackTargetId || "");
    if(!attackTargetId || attackTargetId.startsWith("player:")) return false;
    const ammoId = String(state.attackAmmoId || "ammo_x1").slice(0, 40) || "ammo_x1";
    const weaponClass = ["laser", "rocket", "missile"].includes(state.attackWeaponClass)
      ? String(state.attackWeaponClass)
      : "laser";
    const result = applyEnemyHitForPlayer?.(player, {
      enemyId:attackTargetId,
      weaponClass,
      ammoId,
      count:1
    }, {
      silentMiss:true,
      serverAuto:true
    });
    return Boolean(result?.ok);
  }

  function updatePlayerActivity(dt, now = Date.now()){
    for(const player of players.values()){
      if(!player?.state || !isClientStale(player, now)) continue;
      const moved = updateServerMovement(player, dt, now, groups, isAutomaticTravelActive);
      if(moved) presence?.markActivity?.(player, "deplacement serveur", now);
      const state = player.state;
      const needsRepairProfile = Boolean(state.repairBotActive)
        || Number(state.hp || 0) < Number(state.maxHp || 0);
      const needsShieldProfile = Number(state.maxShield || 0) > 0
        && Number(state.shield || 0) < Number(state.maxShield || 0);
      const recovery = needsRepairProfile || needsShieldProfile
        ? getBackgroundRecoveryConfig(player, now)
        : null;
      const repaired = updateServerRepairBot(player, recovery?.repairBot, dt, now);
      const shieldRegenerated = updateServerShieldRegen(player, recovery?.shieldRegen, dt, now);
      const fired = updateServerAutoFire(player, now);
      if(!moved && !repaired && !shieldRegenerated && !fired) continue;
      if(moved || repaired || shieldRegenerated){
        syncPlayerState(player, now);
        savePlayerState(player, now);
      }
    }
  }

  return {updatePlayerActivity};
}
