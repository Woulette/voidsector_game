import { AGGRO_RANGE, ENEMY_HIT_CHANCE, LEASH_RANGE, PLAYER_COLLISION_RADIUS, PLAYER_HIT_CHANCE } from "../combatData.js";
import { getServerEnemyId, getSoloEnemies, hasServerControlledEnemies, isServerControlledEnemy } from "../../multiplayer/enemies.js";
import { createProjectile, updateProjectiles } from "./projectiles.js";
import { createMapEnemy } from "./mapState.js";
import { updateEnemyAi } from "./enemyAi.js";

export function createCombatEnemyRuntime({
  multiplayer,
  getState,
  setState,
  getMapState,
  findRemotePlayerTargetById,
  damagePlayer,
  rollBetween,
  resolveBulletImpact,
  isSafeModeActive
}){
  function getEnemyHitChance(enemy){
    const {player} = getState();
    return Math.max(0.05, (ENEMY_HIT_CHANCE[enemy?.kind] || 0.88) - Math.max(0, Number(player?.evasionChance || 0)));
  }

  function getBulletTarget(bullet){
    const {player, enemies} = getState();
    if(bullet.owner === "enemy" || bullet.owner === "serverEnemy") return {x:player.x, y:player.y, entity:player};
    if(String(bullet.targetId || "").startsWith("player:")){
      const target = findRemotePlayerTargetById?.(String(bullet.targetId).slice("player:".length));
      return target && target.hp > 0 ? {x:target.x, y:target.y, entity:target} : null;
    }
    const enemy = enemies.find(e=>e.id === bullet.targetId && e.hp > 0);
    return enemy ? {x:enemy.x, y:enemy.y, entity:enemy} : null;
  }

  function scheduleRespawn(enemy){
    const {gameMode, currentMap} = getState();
    if(gameMode !== "open" || !enemy || enemy.respawnScheduled || isServerControlledEnemy(enemy)) return;
    const mapState = getMapState(currentMap);
    mapState.respawnQueue = mapState.respawnQueue || [];
    mapState.respawnQueue.push({remaining:5, kind:enemy.kind});
    enemy.respawnScheduled = true;
  }

  function updateMapRespawns(dt){
    const state = getState();
    const {gameMode, currentMap, player} = state;
    if(gameMode !== "open") return;
    const mapState = getMapState(currentMap);
    const queue = mapState.respawnQueue || [];
    if(!queue.length) return;
    const enemies = state.enemies;
    const maxEnemies = currentMap.enemyCount || 0;
    let enemySeq = state.enemySeq;
    for(const entry of queue) entry.remaining -= dt;
    for(let i = queue.length - 1; i >= 0; i--){
      if(queue[i].remaining > 0) continue;
      if(enemies.length >= maxEnemies) continue;
      const enemy = createMapEnemy({map:currentMap, id:enemySeq++, player, kind:queue[i].kind});
      enemies.push(enemy);
      mapState.enemies = enemies;
      queue.splice(i, 1);
    }
    mapState.respawnQueue = queue;
    setState({enemySeq});
  }

  function fireEnemyBullet(enemy, dx, dy, dist){
    const {bullets, particles} = getState();
    const d = dist || Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);
    const speed = enemy.projectileSpeed || 600;
    const startX = enemy.x + Math.cos(a)*(enemy.radius+14);
    const startY = enemy.y + Math.sin(a)*(enemy.radius+14);
    bullets.push(createProjectile({
      owner:"enemy",
      startX,
      startY,
      damage:rollBetween(enemy.attackDamageMin, enemy.attackDamageMax) || enemy.attackDamage || 10,
      travelTime:Math.max(.11, Math.min(1.15, d/speed + .06)),
      radius:5,
      color:enemy.color || "rgba(248,113,113,.95)",
      particle:enemy.particle || "rgba(252,165,165,.75)",
      sourceId:enemy.id,
      onHitEffect:enemy.onHitEffect,
      hitChance:getEnemyHitChance(enemy)
    }));
    particles.push({x:startX,y:startY,life:.16,max:.16,size:16,color:enemy.particle || "rgba(252,165,165,.72)"});
  }

  function updateEnemies(dt){
    const state = getState();
    const {enemies, player, currentMap, gameMode} = state;
    for(const enemy of enemies) enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
    const aiEnemies = getSoloEnemies(enemies);
    if(hasServerControlledEnemies(multiplayer) && aiEnemies.length <= 0) return;
    updateEnemyAi({
      enemies:aiEnemies,
      player,
      dt,
      map:currentMap,
      safeMode:isSafeModeActive(),
      aggroRange:AGGRO_RANGE,
      leashRange:gameMode === "portal" ? 999999 : LEASH_RANGE,
      playerCollisionRadius:PLAYER_COLLISION_RADIUS,
      onEnemyAttack:fireEnemyBullet
    });
  }

  function updateBullets(dt){
    const {bullets, enemies, currentMap} = getState();
    const nextBullets = updateProjectiles({bullets, dt, getTarget:getBulletTarget, onImpact:bullet=>resolveBulletImpact(bullet, getBulletTarget(bullet))});
    const nextEnemies = enemies.filter(e=>e.hp>0);
    if(!hasServerControlledEnemies(multiplayer)) getMapState(currentMap).enemies = getSoloEnemies(nextEnemies);
    setState({bullets:nextBullets, enemies:nextEnemies});
  }

  return {
    getEnemyHitChance,
    getBulletTarget,
    scheduleRespawn,
    updateMapRespawns,
    fireEnemyBullet,
    updateEnemies,
    updateBullets
  };
}
