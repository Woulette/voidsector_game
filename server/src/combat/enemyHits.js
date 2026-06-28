import { resolveServerCombatFire } from "./damage.js";
import { applyServerShipLifeSteal } from "./shipAbilities.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";
import { getFirmHitOwner, markFirmHitOwner } from "../firms/firmHitOwnership.js";

export function applyDamageToEnemy(enemy, incoming){
  enemy.recentHitTimer = 4;
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

export function emitCombatHitToAudience({io, socket, player, group, payload}){
  const room = player?.mapRoom || group?.id;
  if(room && io?.to) io.to(room).emit("combat:hit", payload);
  else socket.emit("combat:hit", payload);
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
  portalWaveTotal
}){
  function getFirmDamageBonus(profile, player){
    const firmId = profile?.player?.firmId || player?.account?.firmId || "astra";
    const playerKey = profileManager.profileKeyForPlayer?.(player) || "";
    return Math.max(0, Number(firmWarManager?.getActiveBoosters?.(firmId, profile, player, playerKey)?.damage || 0));
  }

  function applyLifeSteal(player, profile, damageDealt, weaponClass, source){
    const result = applyServerShipLifeSteal({player, profile, damageDealt, weaponClass});
    if(result.healed <= 0) return result;
    profileManager.saveWorldSession?.({player, state:player.state, force:false});
    io.to(player.id).emit("player:healed", {
      targetId:player.id,
      sourceId:result.status?.abilityId || "absorbing_fire",
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

  function emitCombatMissPayload({socket = null, player = null, payload = {}, enemy = null, reason = "", silent = false} = {}){
    if(silent) return {ok:false, reason};
    const emitter = socket || (player?.id ? io.to(player.id) : null);
    emitter?.emit("combat:hit", {
      enemyId:String(payload?.enemyId || enemy?.id || ""),
      weaponClass:String(payload?.weaponClass || ""),
      ammoId:String(payload?.ammoId || ""),
      consumed:0,
      hit:false,
      damage:0,
      mapId:String(player?.mapId ?? ""),
      x:Number(enemy?.x ?? payload?.clientAimX ?? 0),
      y:Number(enemy?.y ?? payload?.clientAimY ?? 0),
      radius:Number(enemy?.radius ?? payload?.targetRadius ?? 0),
      reason,
      at:Date.now()
    });
    return {ok:false, reason};
  }

  function getAudienceSocket(socket, player){
    return socket || {
      id:player?.id,
      emit(eventName, payload){
        if(player?.id) io.to(player.id).emit(eventName, payload);
      }
    };
  }

  function applyEnemyHitForPlayer(player, payload, options = {}){
    const socket = options.socket || null;
    const attackerId = player?.id || socket?.id || "";
    const emitCombatMiss = (enemy = null, reason = "")=>{
      return emitCombatMissPayload({
        socket,
        player,
        payload,
        enemy,
        reason,
        silent:options.silentMiss === true
      });
    };
    if(!player){
      return emitCombatMiss(null, "Joueur serveur introuvable.");
    }
    presence.markCombat(player, "attaque joueur");
    const updateCombatProfile = profileManager.updateCombatProfileForPlayer
      ? profileManager.updateCombatProfileForPlayer.bind(profileManager)
      : profileManager.updateProfileForPlayer.bind(profileManager);

    const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
    if(worldEnemy){
      const result = updateCombatProfile({
        player,
        update:profile=>resolveServerCombatFire({player, profile, enemy:worldEnemy, payload, firmDamageBonus:getFirmDamageBonus(profile, player)})
      });
      if(!result.ok){
        return emitCombatMiss(worldEnemy, result.reason || "Tir non valide.");
      }
      const incoming = result.damage || 0;
      emitCombatHitToAudience({io, socket:getAudienceSocket(socket, player), player, group:null, payload:{
        enemyId:worldEnemy.id,
        attackerId,
        weaponClass:result.weaponClass,
        ammoId:result.ammoId,
        consumed:result.consumed,
        ammoRemaining:result.ammoRemaining,
        hit:result.hit,
        damage:incoming,
        missileHits:result.missileHits || 0,
        missileMisses:result.missileMisses || 0,
        doubleStrike:result.doubleStrike || null,
        mapId:String(player.mapId ?? ""),
        fromX:Number(player.state?.x || 0),
        fromY:Number(player.state?.y || 0),
        x:Number(worldEnemy.x || 0),
        y:Number(worldEnemy.y || 0),
        radius:Number(worldEnemy.radius || 0),
        at:Date.now()
      }});
      // A valid shot is hostile even when the accuracy roll misses. Register
      // the attacker before the damage-only path so passive enemies retaliate.
      markEnemyAttackedByPlayer(worldEnemy, attackerId, incoming);
      if(incoming <= 0){
        return {ok:true, hit:false, enemy:worldEnemy, result};
      }
      const mapId = player.mapId;
      const wasAlive = worldEnemy.hp > 0;
      updateLootOwner(worldEnemy, attackerId);
      markFirmHitOwner(worldEnemy, player);
      const durabilityBefore = enemyDurability(worldEnemy);
      applyDamageToEnemy(worldEnemy, incoming);
      applyLifeSteal(player, result.profile, durabilityBefore - enemyDurability(worldEnemy), result.weaponClass, worldEnemy);
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
      return {ok:true, hit:true, enemy:worldEnemy, result};
    }

    const group = player?.groupId ? groups.get(player.groupId) : null;
    const instance = group?.instance;
    const instanceMapId = instance?.type === "portal" ? `portal-${instance.portal?.id}` : "coop-test";
    if(!instance
      || instance.abandonedMemberIds?.includes(player.id)
      || String(player.state?.mapId || player.mapId || "") !== instanceMapId){
      return emitCombatMiss(null, "Cible serveur introuvable.");
    }
    const enemy = instance.enemies.find(entry=>entry.id === payload?.enemyId && entry.hp > 0);
    if(!enemy){
      return emitCombatMiss(null, "Cible deja detruite ou introuvable.");
    }
    const result = updateCombatProfile({
      player,
      update:profile=>resolveServerCombatFire({player, profile, enemy, payload, firmDamageBonus:getFirmDamageBonus(profile, player)})
    });
    if(!result.ok){
      return emitCombatMiss(enemy, result.reason || "Tir non valide.");
    }
    const incoming = result.damage || 0;
    emitCombatHitToAudience({io, socket:getAudienceSocket(socket, player), player, group, payload:{
      enemyId:enemy.id,
      attackerId,
      weaponClass:result.weaponClass,
      ammoId:result.ammoId,
      consumed:result.consumed,
      ammoRemaining:result.ammoRemaining,
      hit:result.hit,
      damage:incoming,
      missileHits:result.missileHits || 0,
      missileMisses:result.missileMisses || 0,
      doubleStrike:result.doubleStrike || null,
      mapId:String(player.mapId ?? ""),
      fromX:Number(player.state?.x || 0),
      fromY:Number(player.state?.y || 0),
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      radius:Number(enemy.radius || 0),
      at:Date.now()
    }});
    markEnemyAttackedByPlayer(enemy, attackerId, incoming);
    if(incoming <= 0){
      return {ok:true, hit:false, enemy, result};
    }
    const wasAlive = enemy.hp > 0;
    markFirmHitOwner(enemy, player);
    const durabilityBefore = enemyDurability(enemy);
    applyDamageToEnemy(enemy, incoming);
    applyLifeSteal(player, result.profile, durabilityBefore - enemyDurability(enemy), result.weaponClass, enemy);
    if(instance.type === "portal" && wasAlive && enemy.hp <= 0 && !instance.completed){
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
    return {ok:true, hit:true, enemy, result};
  }

  function applyEnemyHit(socket, payload){
    return applyEnemyHitForPlayer(players.get(socket.id), payload, {socket});
  }

  return {applyEnemyHit, applyEnemyHitForPlayer};
}
