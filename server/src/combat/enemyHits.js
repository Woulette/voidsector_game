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

export function createEnemyHitHandler({
  buildServerPortalWave,
  emitInstance,
  emitPortalComplete,
  emitPrivatePortalPieceDrop,
  emitWorldEnemies,
  emitWorldReward,
  findWorldEnemyForPlayer,
  groups,
  players,
  presence,
  profileManager,
  progressServerQuestsForKill,
  respawnWorldEnemy,
  updateLootOwner,
  portalWaveTotal
}){
  function applyEnemyHit(socket, payload){
    const player = players.get(socket.id);
    let incoming = Math.max(0, Math.min(5000000, Number(payload?.amount || 0)));
    let combatResult = null;
    if(payload?.serverCalculated){
      incoming = 0;
    }
    presence.markCombat(player, "attaque joueur");

    const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
    if(worldEnemy){
      if(payload?.serverCalculated){
        const result = profileManager.updateProfileForPlayer({
          player,
          update:profile=>resolveServerCombatFire({player, profile, enemy:worldEnemy, payload})
        });
        if(!result.ok){
          socket.emit("combat:error", {message:result.reason || "Tir refuse."});
          return;
        }
        combatResult = result;
        incoming = result.damage || 0;
        socket.emit("combat:hit", {
          enemyId:worldEnemy.id,
          weaponClass:result.weaponClass,
          ammoId:result.ammoId,
          consumed:result.consumed,
          hit:result.hit,
          damage:incoming,
          at:Date.now()
        });
        if(result.profile) socket.emit("profile:sync", result.profile);
        if(incoming <= 0){
          emitWorldEnemies(player.mapId);
          return;
        }
      }else if(incoming <= 0) return;
      const mapId = player.mapId;
      const wasAlive = worldEnemy.hp > 0;
      updateLootOwner(worldEnemy, socket.id);
      markEnemyAttackedByPlayer(worldEnemy, socket.id);
      applyDamageToEnemy(worldEnemy, incoming);
      if(wasAlive && worldEnemy.hp <= 0){
        emitWorldReward({enemy:worldEnemy, mapId, attackerId:socket.id});
        emitPrivatePortalPieceDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || socket.id});
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
    if(!instance) return;
    const enemy = instance.enemies.find(entry=>entry.id === payload?.enemyId && entry.hp > 0);
    if(!enemy) return;
    if(payload?.serverCalculated){
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>resolveServerCombatFire({player, profile, enemy, payload})
      });
      if(!result.ok){
        socket.emit("combat:error", {message:result.reason || "Tir refuse."});
        return;
      }
      combatResult = result;
      incoming = result.damage || 0;
      socket.emit("combat:hit", {
        enemyId:enemy.id,
        weaponClass:result.weaponClass,
        ammoId:result.ammoId,
        consumed:result.consumed,
        hit:result.hit,
        damage:incoming,
        at:Date.now()
      });
      if(result.profile) socket.emit("profile:sync", result.profile);
      if(incoming <= 0){
        emitInstance(group);
        return;
      }
    }else if(incoming <= 0) return;
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
