import { resolveServerCombatFire } from "./damage.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";

function applyDamageToEnemy(enemy, incoming){
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

export function emitCombatHitToAudience({io, socket, player, group, payload}){
  const room = group?.id || player?.mapRoom;
  if(room && io?.to) io.to(room).emit("combat:hit", payload);
  else socket.emit("combat:hit", payload);
}

export function createEnemyHitHandler({
  buildServerPortalWave,
  emitInstance,
  emitPortalComplete,
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
  emitProfileSync,
  progressServerQuestsForKill,
  respawnWorldEnemy,
  updateLootOwner,
  portalWaveTotal
}){
  function applyEnemyHit(socket, payload){
    const player = players.get(socket.id);
    const emitCombatMiss = (enemy = null, reason = "")=>{
      socket.emit("combat:hit", {
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
    };
    if(!player){
      emitCombatMiss(null, "Joueur serveur introuvable.");
      return;
    }
    presence.markCombat(player, "attaque joueur");

    const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
    if(worldEnemy){
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>resolveServerCombatFire({player, profile, enemy:worldEnemy, payload})
      });
      if(!result.ok){
        emitCombatMiss(worldEnemy, result.reason || "Tir non valide.");
        return;
      }
      const incoming = result.damage || 0;
      emitCombatHitToAudience({io, socket, player, group:null, payload:{
        enemyId:worldEnemy.id,
        attackerId:socket.id,
        weaponClass:result.weaponClass,
        ammoId:result.ammoId,
        consumed:result.consumed,
        hit:result.hit,
        damage:incoming,
        mapId:String(player.mapId ?? ""),
        x:Number(worldEnemy.x || 0),
        y:Number(worldEnemy.y || 0),
        radius:Number(worldEnemy.radius || 0),
        at:Date.now()
      }});
      emitProfileSync?.(player, result.profile);
      if(incoming <= 0){
        emitWorldEnemies(player.mapId);
        return;
      }
      const mapId = player.mapId;
      const wasAlive = worldEnemy.hp > 0;
      updateLootOwner(worldEnemy, socket.id);
      markEnemyAttackedByPlayer(worldEnemy, socket.id);
      applyDamageToEnemy(worldEnemy, incoming);
      if(wasAlive && worldEnemy.hp <= 0){
        emitWorldReward({enemy:worldEnemy, mapId, attackerId:socket.id});
        emitPrivateQuestItemDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || socket.id});
        emitPrivatePortalPieceDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || socket.id});
        emitPrivateResourceDrops?.({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || socket.id});
        progressServerQuestsForKill({enemy:worldEnemy, mapId, attackerId:socket.id});
      }
      emitWorldEnemies(mapId);
      if(worldEnemy.hp <= 0 && !worldEnemy.respawning){
        worldEnemy.respawning = true;
        setTimeout(()=>respawnWorldEnemy(mapId, worldEnemy.id), 8000);
      }
      return;
    }

    const group = player?.groupId ? groups.get(player.groupId) : null;
    const instance = group?.instance;
    if(!instance){
      emitCombatMiss(null, "Cible serveur introuvable.");
      return;
    }
    const enemy = instance.enemies.find(entry=>entry.id === payload?.enemyId && entry.hp > 0);
    if(!enemy){
      emitCombatMiss(null, "Cible deja detruite ou introuvable.");
      return;
    }
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>resolveServerCombatFire({player, profile, enemy, payload})
    });
    if(!result.ok){
      emitCombatMiss(enemy, result.reason || "Tir non valide.");
      return;
    }
    const incoming = result.damage || 0;
    emitCombatHitToAudience({io, socket, player, group, payload:{
      enemyId:enemy.id,
      attackerId:socket.id,
      weaponClass:result.weaponClass,
      ammoId:result.ammoId,
      consumed:result.consumed,
      hit:result.hit,
      damage:incoming,
      mapId:String(player.mapId ?? ""),
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      radius:Number(enemy.radius || 0),
      at:Date.now()
    }});
    emitProfileSync?.(player, result.profile);
    if(incoming <= 0){
      emitInstance(group);
      return;
    }
    const wasAlive = enemy.hp > 0;
    markEnemyAttackedByPlayer(enemy, socket.id);
    applyDamageToEnemy(enemy, incoming);
    if(instance.type === "portal" && wasAlive && enemy.hp <= 0 && !instance.completed){
      const alive = instance.enemies.some(entry=>entry.hp > 0);
      if(!alive){
        if(instance.wave >= portalWaveTotal) emitPortalComplete(group);
        else{
          instance.wave += 1;
          instance.enemies = buildServerPortalWave(instance.wave);
        }
      }
    }
    emitInstance(group);
  }

  return {applyEnemyHit};
}
