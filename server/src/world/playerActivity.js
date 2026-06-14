import { WORLD_MAPS } from "./definitions.js";
import { getRepairBotConfig, getTrustedShieldRegen } from "../players/playerStateValidation.js";

const CLIENT_STALE_MS = 250;
const MOVEMENT_SYNC_MS = 250;
const MOVEMENT_SAVE_MS = 1000;
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
  return now - lastClientStateAt >= CLIENT_STALE_MS;
}

function updateServerMovement(player, dt, now){
  const state = player?.state;
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

  const speed = Math.max(1, finite(state.speed, 300));
  const step = Math.min(speed * Math.max(0.001, dt), distance);
  const nx = dx / distance;
  const ny = dy / distance;
  state.x = finite(state.x) + nx * step;
  state.y = finite(state.y) + ny * step;
  const clampedPosition = clampPointToMovementMap({x:state.x, y:state.y}, map);
  state.x = clampedPosition.x;
  state.y = clampedPosition.y;
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

function updateServerRepairBot(player, profile, dt, now){
  const state = player?.state;
  if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
  if(!isClientStale(player, now)) return false;

  const config = getRepairBotConfig(profile);
  const hadActive = Boolean(state.repairBotActive);
  if(!config.hasRepairBot || Number(state.hp || 0) >= Number(state.maxHp || 0)){
    state.repairBotActive = false;
    player.serverRepairBotTick = 0;
    if(hadActive){
      state.updatedAt = now;
      return true;
    }
    return false;
  }

  const canRepair = secondsSinceServerDamage(player, now) >= config.delay;
  let active = hadActive;
  if(config.hasAuto && !active && canRepair) active = true;
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
    const healAmount = Math.max(1, Math.round(Number(state.maxHp || 0) * config.healRate));
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

function updateServerShieldRegen(player, profile, dt, now){
  const state = player?.state;
  if(!state || player.connected === false || Number(state.hp || 0) <= 0) return false;
  if(!isClientStale(player, now)) return false;
  const maxShield = Math.max(0, Number(state.maxShield || 0));
  if(maxShield <= 0 || Number(state.shield || 0) >= maxShield) return false;
  const regen = getTrustedShieldRegen(profile);
  if(regen <= 0) return false;
  const before = Math.max(0, Number(state.shield || 0));
  state.shield = Math.min(maxShield, before + regen * Math.max(0, finite(dt)));
  if(state.shield === before) return false;
  state.updatedAt = now;
  return true;
}

export function createPlayerActivityManager({
  io,
  players,
  profileManager,
  publicPlayer,
  applyEnemyHitForPlayer
}){
  function syncPlayerState(player, now){
    if(!player?.state) return;
    if(now < finite(player.nextServerMovementSyncAt)) return;
    player.nextServerMovementSyncAt = now + MOVEMENT_SYNC_MS;
    io.to(player.id).emit("player:state-correction", {
      ...player.state,
      source:"state-correction"
    });
    if(player.mapRoom && typeof publicPlayer === "function"){
      io.to([...new Set([player.mapRoom, player.groupId].filter(Boolean))]).emit("player:state", publicPlayer(player));
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
      const profile = profileManager?.getProfileForPlayer?.(player) || null;
      const moved = updateServerMovement(player, dt, now);
      const repaired = updateServerRepairBot(player, profile, dt, now);
      const shieldRegenerated = updateServerShieldRegen(player, profile, dt, now);
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
