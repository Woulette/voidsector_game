import { getInstanceGroup, getPlayerInstanceGroup } from "../portals/portalSessions.js";
import { applyServerEliteLaserLifeSteal, resolveServerCombatFire } from "./damage.js";
import { applyServerShipLifeSteal } from "./shipAbilities.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";
import { getFirmHitOwner, markFirmHitOwner } from "../firms/firmHitOwnership.js";
import { scaleEclaniteEnemyDamage } from "../portals/eclanitePortal.js";

export function applyDamageToEnemy(enemy, incoming){
  enemy.recentHitTimer = 4;
  if(enemy?.damageImmune) return;
  if(enemy.maxShield > 0 && enemy.shield > 0){
    const shieldPart = incoming * Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? .8)));
    let hullPart = incoming - shieldPart;
    const absorbed = Math.min(enemy.shield, shieldPart);
    enemy.shield -= absorbed;
    hullPart += shieldPart - absorbed;
    if(hullPart > 0) enemy.hp -= hullPart;
  }else{
    enemy.hp -= incoming;
  }
  enemy.hp = Math.max(0, enemy.hp);
  enemy.shield = Math.max(0, enemy.shield);
}

export function enemyDurability(enemy){
  return Math.max(0, Number(enemy?.hp || 0)) + Math.max(0, Number(enemy?.shield || 0));
}

export function wouldEnemyHitKill(enemy, incoming){
  if(!enemy || !(Number(enemy.hp) > 0) || !(Number(incoming) > 0)) return false;
  // Reuse the damage rules on an isolated copy, preserving event/reward order.
  const preview = {...enemy};
  applyDamageToEnemy(preview, incoming);
  return preview.hp <= 0;
}

const MAX_COMBAT_TRAVEL_TIME_MS = 5_000;
let combatShotSequence = 0;

function finiteNumber(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeShotOwner(value){
  return String(value || "server").replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 48) || "server";
}

export function ensureCombatShotId(value, playerId = ""){
  const requested = typeof value === "object" && value !== null ? value.shotId : value;
  const normalized = String(requested || "").trim();
  if(/^[a-zA-Z0-9_.:-]{1,96}$/.test(normalized)) return normalized;
  combatShotSequence = (combatShotSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${safeShotOwner(playerId)}:${Date.now().toString(36)}:${combatShotSequence.toString(36)}`;
}

function combatVisualStartCount(weaponClass, consumed){
  return String(weaponClass || "") === "missile"
    ? Math.max(1, Math.min(12, Math.floor(finiteNumber(consumed, 1))))
    : 1;
}

function combatVisualStartRadius(weaponClass, count){
  if(weaponClass === "laser") return 70;
  if(weaponClass === "rocket") return 80;
  const maxSpread = Math.max(0, (Math.max(1, count) - 1) / 2) * 30;
  return Math.min(220, Math.max(90, Math.hypot(44, maxSpread) + 20));
}

function clampCombatStartToShip(start, fromX, fromY, radius){
  const requestedX = finiteNumber(start?.x, fromX);
  const requestedY = finiteNumber(start?.y, fromY);
  const dx = requestedX - fromX;
  const dy = requestedY - fromY;
  const distance = Math.hypot(dx, dy);
  if(distance <= radius || distance <= 0) return {x:requestedX, y:requestedY};
  const scale = radius / distance;
  return {
    x:fromX + dx * scale,
    y:fromY + dy * scale
  };
}

function defaultCombatVisualStarts({weaponClass, count, fromX, fromY, toX, toY, starts}){
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const sideX = -forwardY;
  const sideY = forwardX;
  if(weaponClass === "laser"){
    return [{x:fromX + forwardX * 45, y:fromY + forwardY * 45, curveSide:0, curveStrength:0}];
  }
  if(weaponClass === "rocket"){
    const requestedSide = finiteNumber(starts?.[0]?.curveSide, 1) < 0 ? -1 : 1;
    return [{
      x:fromX + forwardX * 42 + sideX * requestedSide * 28,
      y:fromY + forwardY * 42 + sideY * requestedSide * 28,
      curveSide:requestedSide,
      curveStrength:42
    }];
  }
  return Array.from({length:count}, (_, index)=>{
    const spread = (index - (count - 1) / 2) * 30;
    return {
      x:fromX + forwardX * 44 + sideX * spread,
      y:fromY + forwardY * 44 + sideY * spread,
      curveSide:index % 2 === 0 ? 1 : -1,
      curveStrength:46 + index * 8
    };
  });
}

function normalizeCombatVisualStarts({starts, weaponClass, consumed, fromX, fromY, toX, toY}){
  const count = combatVisualStartCount(weaponClass, consumed);
  const requested = Array.isArray(starts) ? starts.slice(0, count) : [];
  const defaults = defaultCombatVisualStarts({
    weaponClass,
    count,
    fromX,
    fromY,
    toX,
    toY,
    starts:requested
  });
  const radius = combatVisualStartRadius(weaponClass, count);
  const maxCurveStrength = weaponClass === "missile" ? 160 : weaponClass === "rocket" ? 64 : 0;
  return defaults.map((fallback, index)=>{
    const supplied = requested[index] || fallback;
    const position = clampCombatStartToShip(supplied, fromX, fromY, radius);
    const requestedSide = finiteNumber(supplied?.curveSide, fallback.curveSide);
    return {
      ...position,
      curveSide:maxCurveStrength > 0 ? requestedSide < 0 ? -1 : 1 : 0,
      curveStrength:Math.max(0, Math.min(maxCurveStrength, finiteNumber(supplied?.curveStrength, fallback.curveStrength)))
    };
  });
}

export function createCombatRejectedPayload({
  payload = {},
  player = null,
  target = null,
  targetId = "",
  shotId = "",
  reason = "Tir refuse.",
  reasonCode = "COMBAT_REJECTED",
  retryAfterMs = 0,
  cooldownReadyAt = 0,
  now = Date.now()
} = {}){
  const resolvedShotId = ensureCombatShotId(shotId || payload, player?.id);
  const resolvedTargetId = String(
    targetId
    || payload?.enemyId
    || (payload?.targetPlayerId ? `player:${payload.targetPlayerId}` : "")
    || target?.id
    || ""
  );
  return {
    accepted:false,
    outcome:"rejected",
    shotId:resolvedShotId,
    targetId:resolvedTargetId,
    enemyId:String(payload?.enemyId || resolvedTargetId || ""),
    targetPlayerId:String(payload?.targetPlayerId || ""),
    weaponClass:String(payload?.weaponClass || ""),
    ammoId:String(payload?.ammoId || ""),
    consumed:0,
    reason:String(reason || "Tir refuse."),
    reasonCode:String(reasonCode || "COMBAT_REJECTED"),
    retryAfterMs:Math.max(0, Math.ceil(finiteNumber(retryAfterMs, 0))),
    cooldownReadyAt:Math.max(0, finiteNumber(cooldownReadyAt, 0)),
    mapId:String(player?.mapId ?? player?.state?.mapId ?? ""),
    fromX:finiteNumber(player?.state?.x, finiteNumber(payload?.fromX, 0)),
    fromY:finiteNumber(player?.state?.y, finiteNumber(payload?.fromY, 0)),
    x:finiteNumber(target?.x ?? target?.state?.x, finiteNumber(payload?.clientAimX ?? payload?.toX, 0)),
    y:finiteNumber(target?.y ?? target?.state?.y, finiteNumber(payload?.clientAimY ?? payload?.toY, 0)),
    radius:finiteNumber(target?.radius ?? target?.state?.radius, finiteNumber(payload?.targetRadius, 0)),
    at:now
  };
}

export function emitCombatRejectedToPlayer({io, socket, player, rejection, silent = false} = {}){
  if(silent) return rejection;
  const emitter = socket || (player?.id ? io?.to?.(player.id) : null);
  emitter?.emit?.("combat:rejected", rejection);
  return rejection;
}

export function createCombatShotPayload({
  payload = {},
  player = null,
  target = null,
  targetId = "",
  result = {},
  shotId = "",
  travelTimeMs = 0,
  targetDestroyed = false,
  now = Date.now()
} = {}){
  const fromX = finiteNumber(player?.state?.x, finiteNumber(payload?.fromX, 0));
  const fromY = finiteNumber(player?.state?.y, finiteNumber(payload?.fromY, 0));
  const toX = finiteNumber(target?.x ?? target?.state?.x, finiteNumber(payload?.toX ?? payload?.clientAimX, 0));
  const toY = finiteNumber(target?.y ?? target?.state?.y, finiteNumber(payload?.toY ?? payload?.clientAimY, 0));
  const resolvedTargetId = String(targetId || payload?.enemyId || target?.id || "");
  const weaponClass = String(result?.weaponClass || payload?.weaponClass || "");
  return {
    accepted:true,
    shotId:ensureCombatShotId(shotId || payload, player?.id),
    attackerId:String(player?.id || ""),
    targetId:resolvedTargetId,
    enemyId:String(payload?.enemyId || resolvedTargetId),
    targetPlayerId:String(payload?.targetPlayerId || ""),
    kind:weaponClass,
    weaponClass,
    ammoId:String(result?.ammoId || payload?.ammoId || ""),
    consumed:Math.max(0, Math.floor(finiteNumber(result?.consumed, 0))),
    ammoRemaining:Math.max(0, finiteNumber(result?.ammoRemaining, 0)),
    starts:normalizeCombatVisualStarts({
      starts:payload?.starts,
      weaponClass,
      consumed:result?.consumed,
      fromX,
      fromY,
      toX,
      toY
    }),
    fromX,
    fromY,
    toX,
    toY,
    travelTime:Math.max(0, finiteNumber(travelTimeMs, 0)) / 1000,
    shieldBefore:Math.max(0, finiteNumber(target?.shield ?? target?.state?.shield, 0)),
    ...(targetDestroyed ? {targetDestroyed:true} : {}),
    travelTimeMs:Math.max(0, Math.round(finiteNumber(travelTimeMs, 0))),
    cooldownMs:Math.max(0, Math.round(finiteNumber(result?.cooldownMs, 0))),
    cooldownReadyAt:Math.max(0, finiteNumber(result?.cooldownReadyAt, 0)),
    blueLaser:Boolean(payload?.blueLaser),
    mapId:String(player?.mapId ?? player?.state?.mapId ?? ""),
    at:now
  };
}

export function emitCombatHitToAudience({io, socket, player, group, payload}){
  const room = player?.mapRoom || group?.id;
  if(room && io?.to) io.to(room).emit("combat:hit", payload);
  else socket.emit("combat:hit", payload);
}

export function emitCombatShotToAudience({io, socket, player, group, payload}){
  const room = player?.mapRoom || group?.id;
  if(room && io?.to) io.to(room).emit("combat:shot", payload);
  else socket.emit("combat:shot", payload);
}

export function createEnemyHitHandler({
  buildServerPortalWave,
  emitInstance,
  emitPortalComplete,
  handlePortalEnemyDeath,
  emitPrivatePortalAnchorKeyDrop,
  emitPrivatePortalPieceDrop,
  emitPrivateQuestItemDrop,
  emitPrivateResourceDrops,
  emitWorldEnemies,
  emitWorldReward,
  findWorldEnemyForPlayer,
  groups,
  io,
  players,
  presence,
  profileManager,
  firmWarManager,
  emitProfileSync,
  applyEnemyDeathEffect,
  progressServerQuestsForKill,
  removeWorldEnemy,
  respawnWorldEnemy,
  spawnWorldEnemyChildren,
  updateLootOwner,
  portalWaveTotal,
  scheduleCombatImpact = (callback, delay)=>setTimeout(callback, delay)
}){
  function getFirmDamageBonus(profile, player){
    const firmId = profile?.player?.firmId || player?.account?.firmId || "astra";
    const playerKey = profileManager.profileKeyForPlayer?.(player) || "";
    return Math.max(0, Number(firmWarManager?.getActiveBoosters?.(firmId, profile, player, playerKey)?.damage || 0));
  }

  function applyLifeSteal(player, profile, damageDealt, weaponClass, source){
    return emitLifeStealHeal(player, applyServerShipLifeSteal({player, profile, damageDealt, weaponClass}), weaponClass, source);
  }

  function applyEliteLifeSteal(player, result, damageDealt, source){
    return emitLifeStealHeal(
      player,
      applyServerEliteLaserLifeSteal({player, eliteLaser:result?.eliteLaser, damageDealt, weaponClass:result?.weaponClass}),
      result?.weaponClass,
      source
    );
  }

  function emitLifeStealHeal(player, result, weaponClass, source){
    if(result.healed <= 0) return result;
    profileManager.saveWorldSession?.({player, state:player.state, force:false});
    io.to(player.id).emit("player:healed", {
      targetId:player.id,
      sourceId:result.sourceId || result.status?.abilityId || "absorbing_fire",
      amount:result.healed,
      hp:Number(player.state.hp || 0),
      maxHp:Number(player.state.maxHp || 0),
      mapId:String(player.mapId ?? player.state.mapId ?? ""),
      x:Number(player.state.x || 0),
      y:Number(player.state.y || 0),
      fromX:Number(source?.x || 0),
      fromY:Number(source?.y || 0),
      weaponClass:String(weaponClass || ""),
      at:Date.now()
    });
    return result;
  }

  function rejectCombatFire({
    socket = null,
    player = null,
    payload = {},
    enemy = null,
    targetId = "",
    shotId = "",
    reason = "",
    reasonCode = "COMBAT_REJECTED",
    retryAfterMs = 0,
    cooldownReadyAt = 0,
    silent = false
  } = {}){
    const rejection = createCombatRejectedPayload({
      payload,
      player,
      target:enemy,
      targetId,
      shotId,
      reason,
      reasonCode,
      retryAfterMs,
      cooldownReadyAt
    });
    emitCombatRejectedToPlayer({io, socket, player, rejection, silent});
    return {
      ok:false,
      ...rejection
    };
  }

  function schedulePreparedImpact(callback, travelTimeMs){
    if(travelTimeMs <= 0){
      callback();
      return;
    }
    scheduleCombatImpact(callback, travelTimeMs);
  }

  function getAudienceSocket(socket, player){
    return socket || {
      id:player?.id,
      emit(eventName, payload){
        if(player?.id) io.to(player.id).emit(eventName, payload);
      }
    };
  }

  function applyEnemyHitForPlayer(player, requestedPayload, options = {}){
    const socket = options.socket || null;
    const shotId = ensureCombatShotId(requestedPayload, player?.id || socket?.id);
    const payload = {...(requestedPayload || {}), shotId};
    const attackerId = player?.id || socket?.id || "";
    const reject = (
      enemy = null,
      reason = "",
      reasonCode = "COMBAT_REJECTED",
      retryAfterMs = 0,
      cooldownReadyAt = 0
    )=>{
      return rejectCombatFire({
        socket,
        player,
        payload,
        enemy,
        targetId:String(payload?.enemyId || enemy?.id || ""),
        shotId,
        reason,
        reasonCode,
        retryAfterMs,
        cooldownReadyAt,
        silent:options.silentMiss === true || options.silentRejection === true
      });
    };
    if(!player){
      return reject(null, "Joueur serveur introuvable.", "PLAYER_NOT_FOUND");
    }
    const updateCombatProfile = profileManager.updateCombatProfileForPlayer
      ? profileManager.updateCombatProfileForPlayer.bind(profileManager)
      : profileManager.updateProfileForPlayer.bind(profileManager);

    function acceptPreparedEnemyShot({
      enemy,
      group = null,
      result,
      isImpactStillValid = ()=>true,
      applyPreparedDamage
    }){
      const travelTimeMs = Math.max(0, Math.min(
        MAX_COMBAT_TRAVEL_TIME_MS,
        Math.round(finiteNumber(result?.travelTimeMs, 0))
      ));
      const incoming = scaleEclaniteEnemyDamage(enemy, result.damage || 0);
      const audienceSocket = getAudienceSocket(socket, player);
      const shot = createCombatShotPayload({
        payload,
        player,
        target:enemy,
        targetId:String(enemy.id || payload.enemyId || ""),
        result,
        shotId,
        travelTimeMs,
        targetDestroyed:travelTimeMs === 0 && wouldEnemyHitKill(enemy, incoming)
      });

      // Presence and retaliation begin only after every launch validation has
      // succeeded. A genuine accuracy miss is still an accepted hostile shot.
      presence.markCombat(player, "attaque joueur");
      markEnemyAttackedByPlayer(enemy, attackerId, incoming);
      emitCombatShotToAudience({io, socket:audienceSocket, player, group, payload:shot});

      schedulePreparedImpact(()=>{
        if(!isImpactStillValid()) return;
        emitCombatHitToAudience({io, socket:audienceSocket, player, group, payload:{
          accepted:true,
          outcome:result.hit ? "hit" : "miss",
          shotId,
          enemyId:enemy.id,
          targetId:String(enemy.id || payload.enemyId || ""),
          attackerId,
          weaponClass:result.weaponClass,
          ammoId:result.ammoId,
          consumed:result.consumed,
          ammoRemaining:result.ammoRemaining,
          hit:Boolean(result.hit),
          damage:incoming,
          missileHits:result.missileHits || 0,
          missileMisses:result.missileMisses || 0,
          doubleStrike:result.doubleStrike || null,
          shipAbilityState:result.shipAbilityState || null,
          eliteLaser:result.eliteLaser || null,
          mapId:shot.mapId,
          fromX:shot.fromX,
          fromY:shot.fromY,
          x:shot.toX,
          y:shot.toY,
          radius:Number(enemy.radius || 0),
          shieldBefore:Math.max(0, Number(enemy.shield || 0)),
          targetDestroyed:wouldEnemyHitKill(enemy, incoming),
          travelTimeMs,
          cooldownMs:Math.max(0, Math.round(finiteNumber(result?.cooldownMs, 0))),
          cooldownReadyAt:Math.max(0, finiteNumber(result?.cooldownReadyAt, 0)),
          at:Date.now()
        }});
        if(incoming > 0) applyPreparedDamage(incoming);
      }, travelTimeMs);

      return {
        ok:true,
        accepted:true,
        outcome:result.hit ? "hit" : "miss",
        shotId,
        travelTimeMs,
        hit:Boolean(result.hit),
        ammoRemaining:result.ammoRemaining,
        consumed:result.consumed,
        cooldownMs:Math.max(0, Math.round(finiteNumber(result?.cooldownMs, 0))),
        cooldownReadyAt:Math.max(0, finiteNumber(result?.cooldownReadyAt, 0)),
        enemy,
        result
      };
    }

    const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
    if(worldEnemy){
      if(worldEnemy.damageImmune){
        return reject(
          worldEnemy,
          String(worldEnemy.damageImmuneReason || "Cette cible est protegee."),
          "TARGET_IMMUNE"
        );
      }
      const result = updateCombatProfile({
        player,
        update:profile=>resolveServerCombatFire({player, profile, enemy:worldEnemy, payload, firmDamageBonus:getFirmDamageBonus(profile, player)})
      });
      if(!result.ok){
        return reject(
          worldEnemy,
          result.reason || "Tir non valide.",
          result.reasonCode || "COMBAT_REJECTED",
          result.retryAfterMs || 0,
          result.cooldownReadyAt || 0
        );
      }
      const mapId = player.mapId;
      const mapIdAtLaunch = String(player.mapId ?? player.state?.mapId ?? "");
      const mapRoomAtLaunch = String(player.mapRoom || "");
      return acceptPreparedEnemyShot({
        enemy:worldEnemy,
        result,
        isImpactStillValid:()=>{
          return players.get(player.id) === player
            && String(player.mapId ?? player.state?.mapId ?? "") === mapIdAtLaunch
            && String(player.mapRoom || "") === mapRoomAtLaunch
            && findWorldEnemyForPlayer(player, worldEnemy.id) === worldEnemy
            && Number(worldEnemy.hp || 0) > 0
            && worldEnemy.respawning !== true
            && worldEnemy.damageImmune !== true;
        },
        applyPreparedDamage:incoming=>{
          const wasAlive = worldEnemy.hp > 0;
          updateLootOwner(worldEnemy, attackerId);
          markFirmHitOwner(worldEnemy, player);
          const durabilityBefore = enemyDurability(worldEnemy);
          applyDamageToEnemy(worldEnemy, incoming);
          const damageDealt = durabilityBefore - enemyDurability(worldEnemy);
          applyLifeSteal(player, result.profile, damageDealt, result.weaponClass, worldEnemy);
          applyEliteLifeSteal(player, result, damageDealt, worldEnemy);
          if(wasAlive && worldEnemy.hp <= 0){
            emitWorldReward({
              enemy:worldEnemy,
              mapId,
              attackerId,
              firmAttackerId:getFirmHitOwner(worldEnemy, players)?.id || attackerId
            });
            emitPrivateQuestItemDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || attackerId});
            emitPrivatePortalPieceDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || attackerId});
            emitPrivatePortalAnchorKeyDrop?.({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || attackerId});
            emitPrivateResourceDrops?.({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || attackerId});
            progressServerQuestsForKill({enemy:worldEnemy, mapId, attackerId});
            applyEnemyDeathEffect?.(mapId, worldEnemy, Date.now());
            spawnWorldEnemyChildren?.(mapId, worldEnemy);
          }
          if(worldEnemy.hp <= 0 && !worldEnemy.respawning){
            worldEnemy.respawning = true;
            if(worldEnemy.temporarySpawn) setTimeout(()=>removeWorldEnemy?.(mapId, worldEnemy.id), 100);
            else setTimeout(()=>respawnWorldEnemy(mapId, worldEnemy.id), 8000);
          }
        }
      });
    }

    const group = getPlayerInstanceGroup(player, groups);
    const instance = group?.instance;
    const instanceMapId = instance?.type === "portal" ? `portal-${instance.portal?.id}` : "coop-test";
    if(!instance
      || instance.abandonedMemberIds?.includes(player.id)
      || String(player.state?.mapId || player.mapId || "") !== instanceMapId){
      return reject(null, "Cible serveur introuvable.", "TARGET_NOT_FOUND");
    }
    const enemy = instance.enemies.find(entry=>entry.id === payload?.enemyId && entry.hp > 0);
    if(!enemy){
      return reject(null, "Cible deja detruite ou introuvable.", "TARGET_DESTROYED");
    }
    if(enemy.damageImmune){
      return reject(
        enemy,
        String(enemy.damageImmuneReason || "Cette cible est protegee."),
        "TARGET_IMMUNE"
      );
    }
    const result = updateCombatProfile({
      player,
      update:profile=>resolveServerCombatFire({player, profile, enemy, payload, firmDamageBonus:getFirmDamageBonus(profile, player)})
    });
    if(!result.ok){
      return reject(
        enemy,
        result.reason || "Tir non valide.",
        result.reasonCode || "COMBAT_REJECTED",
        result.retryAfterMs || 0,
        result.cooldownReadyAt || 0
      );
    }
    const instanceWaveAtLaunch = Number(instance.wave || 0);
    const instanceEnemiesAtLaunch = instance.enemies;
    const instanceMapRoomAtLaunch = String(player.mapRoom || "");
    return acceptPreparedEnemyShot({
      enemy,
      group,
      result,
      isImpactStillValid:()=>{
        return players.get(player.id) === player
          && getPlayerInstanceGroup(player, groups) === group
          && getInstanceGroup(groups, group.id) === group
          && group.instance === instance
          && instance.completed !== true
          && Number(instance.wave || 0) === instanceWaveAtLaunch
          && instance.enemies === instanceEnemiesAtLaunch
          && instance.enemies.includes(enemy)
          && String(player.state?.mapId || player.mapId || "") === instanceMapId
          && String(player.mapRoom || "") === instanceMapRoomAtLaunch
          && !instance.abandonedMemberIds?.includes(player.id)
          && Number(enemy.hp || 0) > 0
          && enemy.respawning !== true
          && enemy.damageImmune !== true;
      },
      applyPreparedDamage:incoming=>{
        const wasAlive = enemy.hp > 0;
        markFirmHitOwner(enemy, player);
        const durabilityBefore = enemyDurability(enemy);
        applyDamageToEnemy(enemy, incoming);
        const damageDealt = durabilityBefore - enemyDurability(enemy);
        applyLifeSteal(player, result.profile, damageDealt, result.weaponClass, enemy);
        applyEliteLifeSteal(player, result, damageDealt, enemy);
        if(instance.type === "portal" && wasAlive && enemy.hp <= 0 && !instance.completed){
          applyEnemyDeathEffect?.(instanceMapId, enemy, Date.now(), {
            playerIds:group.members.filter(id=>!instance.abandonedMemberIds?.includes(id))
          });
          if(handlePortalEnemyDeath) handlePortalEnemyDeath(group, enemy, attackerId);
          else{
            const alive = instance.enemies.some(entry=>entry.hp > 0);
            if(!alive){
              if(instance.wave >= portalWaveTotal) emitPortalComplete(group);
              else{
                instance.wave += 1;
                instance.enemies = buildServerPortalWave(instance.wave);
              }
            }
          }
        }
      }
    });
  }

  function applyEnemyHit(socket, payload){
    return applyEnemyHitForPlayer(players.get(socket.id), payload, {socket});
  }

  return {applyEnemyHit, applyEnemyHitForPlayer};
}
