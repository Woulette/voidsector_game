import { WORLD_AI_REPATH_MS, WORLD_ENEMY_AGGRO_MULTIPLIER, WORLD_ENEMY_TARGET_MEMORY_MS } from "./constants.js";
import { canEnemyTargetPlayerInSafeZone } from "./aggro.js";
import { seededRandom } from "./spawn.js";

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function getEnemyAiKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

export function createWorldAiManager({io, players, presence, profileManager, emitProfileSync, applyEnemyOnHitEffect, isPlayerSafeOnMap}){
  function canTargetPlayer(enemy, player, map, now){
    return canEnemyTargetPlayerInSafeZone({
      enemy,
      player,
      map,
      now,
      isPlayerSafeOnMap
    });
  }

  function nearestPlayer(enemy, candidates, map, now){
    let best = null;
    let bestDistance = Infinity;
    for(const player of candidates){
      if(!canTargetPlayer(enemy, player, map, now)) continue;
      const dx = Number(player.state.x || 0) - enemy.x;
      const dy = Number(player.state.y || 0) - enemy.y;
      const distance = Math.hypot(dx, dy);
      if(distance < bestDistance){
        best = {player, dx, dy, distance};
        bestDistance = distance;
      }
    }
    return best;
  }

  function emitEnemyAttack(enemy, map, target, amount){
    presence.markCombat(target, "attaque ennemi");
    const hpLost = presence.applyDamageToPlayerState(target, amount);
    if(hpLost > 0){
      const questResult = profileManager.applyQuestAction({
        player:target,
        action:{kind:"hp-loss", amount:hpLost}
      });
      emitProfileSync?.(target, questResult.profile);
      if(questResult.updates?.length || questResult.failed?.length){
        io.to(target.id).emit("quest:fail-progress", {
          updates:questResult.updates || [],
          failed:questResult.failed || [],
          at:Date.now()
        });
      }
    }
    profileManager.saveWorldSession({player:target, state:target.state, force:Number(target.state?.hp || 0) <= 0});
    enemy.attackAnimUntil = Date.now() + 320;
    const fromX = enemy.x;
    const fromY = enemy.y;
    const toX = Number(target.state.x || 0);
    const toY = Number(target.state.y || 0);
    io.to(map.room || `map:${map.id}`).emit("enemy:attack", {
      sourceId:enemy.id,
      enemyId:enemy.id,
      targetId:target.id,
      mapId:map.id,
      fromX,
      fromY,
      toX,
      toY,
      color:enemy.color || "rgba(248,113,113,.9)",
      particle:enemy.particle || enemy.color || "rgba(248,113,113,.9)",
      projectileSpeed:enemy.projectileSpeed || 600,
      enemyKind:enemy.kind,
      attackStyle:enemy.attackStyle || getEnemyAiKind(enemy.kind),
      life:.22
    });
    io.to(target.id).emit("player:damage", {
      enemyId:enemy.id,
      mapId:map.id,
      amount,
      fromX,
      fromY,
      toX,
      toY,
      at:Date.now()
    });
    applyEnemyOnHitEffect?.(enemy, target);
  }

  function pickEnemyWanderTarget(enemy, map, now){
    if(enemy.wanderT > now && Number.isFinite(enemy.wanderX) && Number.isFinite(enemy.wanderY)) return;
    const rnd = seededRandom(now + Number(enemy.id.replace(/\D/g, "") || 1) * 101);
    const radius = 180 + rnd() * 420;
    const angle = rnd() * Math.PI * 2;
    enemy.wanderX = clamp(enemy.homeX + Math.cos(angle) * radius, -map.width / 2 + 80, map.width / 2 - 80);
    enemy.wanderY = clamp(enemy.homeY + Math.sin(angle) * radius, -map.height / 2 + 80, map.height / 2 - 80);
    enemy.wanderT = now + 3500 + rnd() * 5500;
  }

  function computeWorldEnemyDecision(enemy, map, mapPlayers, now){
    const spottedTarget = nearestPlayer(enemy, mapPlayers, map, now);
    let targetX = enemy.x;
    let targetY = enemy.y;
    let speed = Number(enemy.speed || 160);
    const aggroDistance = Math.max(780, Number(enemy.attackRange || 400) + 260) * WORLD_ENEMY_AGGRO_MULTIPLIER;
    let target = null;

    if(spottedTarget && spottedTarget.distance <= aggroDistance){
      target = spottedTarget;
      enemy.lockedPlayerId = target.player.id;
      enemy.lockedPlayerLastSeenAt = now;
    }else if(enemy.lockedPlayerId){
      const lockedPlayer = mapPlayers.find(player=>
        player.id === enemy.lockedPlayerId
        && player.state
        && canTargetPlayer(enemy, player, map, now)
      );
      if(lockedPlayer){
        const dx = Number(lockedPlayer.state.x || 0) - enemy.x;
        const dy = Number(lockedPlayer.state.y || 0) - enemy.y;
        const distance = Math.hypot(dx, dy);
        if(distance <= aggroDistance){
          enemy.lockedPlayerLastSeenAt = now;
        }
        if(now - Number(enemy.lockedPlayerLastSeenAt || 0) <= WORLD_ENEMY_TARGET_MEMORY_MS){
          target = {player:lockedPlayer, dx, dy, distance};
        }else{
          enemy.lockedPlayerId = null;
          enemy.lockedPlayerLastSeenAt = 0;
        }
      }else{
        enemy.lockedPlayerId = null;
        enemy.lockedPlayerLastSeenAt = 0;
      }
    }

    if(target){
      const dirX = target.dx / Math.max(1, target.distance);
      const dirY = target.dy / Math.max(1, target.distance);
      const sideX = -dirY;
      const sideY = dirX;
      const aiKind = getEnemyAiKind(enemy.kind);
      const range = Number(enemy.attackRange || 360);
      if(aiKind === "drone_pirate"){
        const preferredDistance = Math.max(110, range - 45);
        const orbit = Math.sin(now / 1000 + Number(String(enemy.id).replace(/\D/g, "") || 0) * 0.77) * Math.min(180, range * .34);
        if(target.distance > range - 20){
          targetX = Number(target.player.state.x || enemy.x) - dirX * preferredDistance + sideX * orbit;
          targetY = Number(target.player.state.y || enemy.y) - dirY * preferredDistance + sideY * orbit;
        }else{
          const currentDistance = Math.max(120, Math.min(range - 35, target.distance || preferredDistance));
          targetX = Number(target.player.state.x || enemy.x) - dirX * currentDistance + sideX * orbit;
          targetY = Number(target.player.state.y || enemy.y) - dirY * currentDistance + sideY * orbit;
          speed *= .72;
        }
      }else if(aiKind === "raider_astral"){
        const contactDistance = Math.max(75, Number(enemy.radius || 32) + 46);
        if(target.distance > contactDistance){
          targetX = Number(target.player.state.x || enemy.x);
          targetY = Number(target.player.state.y || enemy.y);
          speed *= 1.04;
        }else{
          targetX = enemy.x - dirX * 58;
          targetY = enemy.y - dirY * 58;
        }
      }else if(aiKind === "chasseur_spectral"){
        const preferredDistance = range * .62;
        const side = Math.sin(now / 760 + Number(String(enemy.id).replace(/\D/g, "") || 0)) * 145;
        if(target.distance > preferredDistance + 45){
          targetX = Number(target.player.state.x || enemy.x) - dirX * preferredDistance + sideX * side;
          targetY = Number(target.player.state.y || enemy.y) - dirY * preferredDistance + sideY * side;
        }else if(target.distance < preferredDistance - 55){
          targetX = enemy.x - dirX * 170 + sideX * side * .45;
          targetY = enemy.y - dirY * 170 + sideY * side * .45;
        }else{
          targetX = enemy.x + sideX * side;
          targetY = enemy.y + sideY * side;
        }
      }else{
        const preferredDistance = Math.max(120, range * .72);
        if(target.distance > preferredDistance + 35){
          targetX = Number(target.player.state.x || enemy.x);
          targetY = Number(target.player.state.y || enemy.y);
        }else if(target.distance < Math.max(95, preferredDistance - 75)){
          targetX = enemy.x - target.dx;
          targetY = enemy.y - target.dy;
        }else{
          const side = Math.sin(now / 900 + Number(String(enemy.id).replace(/\D/g, "") || 0)) * 130;
          targetX = enemy.x + sideX * side;
          targetY = enemy.y + sideY * side;
          speed *= .55;
        }
      }
    }else{
      pickEnemyWanderTarget(enemy, map, now);
      targetX = enemy.wanderX;
      targetY = enemy.wanderY;
      enemy.lockedPlayerId = null;
      enemy.lockedPlayerLastSeenAt = 0;
    }

    return {
      targetX:clamp(targetX, -map.width / 2 + 70, map.width / 2 - 70),
      targetY:clamp(targetY, -map.height / 2 + 70, map.height / 2 - 70),
      speed,
      targetPlayerId:target?.player?.id || null,
      targetDistance:Number(target?.distance || Infinity)
    };
  }

  function updateWorldEnemy(enemy, map, mapPlayers, dt, now){
    if(enemy.hp <= 0){
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.moving = false;
      return;
    }
    enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
    if(!enemy.aiDecision || now >= Number(enemy.nextAiDecisionAt || 0)){
      enemy.aiDecision = computeWorldEnemyDecision(enemy, map, mapPlayers, now);
      const jitter = Number(String(enemy.id).replace(/\D/g, "") || 0) % 90;
      enemy.nextAiDecisionAt = now + WORLD_AI_REPATH_MS + jitter;
    }
    const decision = enemy.aiDecision || {targetX:enemy.x, targetY:enemy.y, speed:0, targetPlayerId:null, targetDistance:Infinity};
    const targetX = Number(decision.targetX || enemy.x);
    const targetY = Number(decision.targetY || enemy.y);
    const speed = Number(decision.speed || 0);
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const distance = Math.hypot(dx, dy);
    if(distance > 8){
      const step = Math.min(distance, speed * dt);
      let nx = dx / distance;
      let ny = dy / distance;
      const currentSpeed = Math.hypot(Number(enemy.vx || 0), Number(enemy.vy || 0));
      if(currentSpeed > 1){
        const prevX = Number(enemy.vx || 0) / currentSpeed;
        const prevY = Number(enemy.vy || 0) / currentSpeed;
        const turnDot = prevX * nx + prevY * ny;
        if(turnDot < -0.25){
          nx = prevX * .72 + nx * .28;
          ny = prevY * .72 + ny * .28;
          const blendedLength = Math.hypot(nx, ny) || 1;
          nx /= blendedLength;
          ny /= blendedLength;
        }
      }
      enemy.x += nx * step;
      enemy.y += ny * step;
      enemy.vx = nx * speed;
      enemy.vy = ny * speed;
      enemy.angle = Math.atan2(ny, nx) + Math.PI / 2;
      enemy.moving = true;
    }else{
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.moving = false;
    }

    const attackTarget = decision.targetPlayerId ? players.get(decision.targetPlayerId) : null;
    const canAttackTarget = canTargetPlayer(enemy, attackTarget, map, now);
    const attackDistance = attackTarget?.state
      ? Math.hypot(Number(attackTarget.state.x || 0) - enemy.x, Number(attackTarget.state.y || 0) - enemy.y)
      : Infinity;
    if(canAttackTarget && presence.isActiveForWorld(attackTarget, now) && attackDistance <= Number(enemy.attackRange || 360) && now >= Number(enemy.nextAttackAt || 0)){
      const amount = Math.max(1, Math.round(Number(enemy.attackDamage || 25) * (0.85 + Math.random() * 0.3)));
      enemy.nextAttackAt = now + Number(enemy.attackCooldown || 1400);
      emitEnemyAttack(enemy, map, attackTarget, amount);
    }
  }

  return {updateWorldEnemy};
}
