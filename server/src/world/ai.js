import { WORLD_AI_REPATH_MS, WORLD_ENEMY_AGGRO_MULTIPLIER, WORLD_ENEMY_TARGET_MEMORY_MS } from "./constants.js";
import { canEnemyTargetPlayerInSafeZone, ENEMY_THREAT_RECALC_MS, pickEnemyThreatTarget } from "./aggro.js";
import { seededRandom } from "./spawn.js";
import {
  completeEnemyEngagement,
  getEnemyEngagementPoint,
  getEnemyRepathDelayMs,
  isEnemyEngagementCrossing,
  isEnemyEngagementHolding,
  resetEnemyEngagement
} from "../../../src/game/systems/enemyTrajectory.js";

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function getEnemyAiKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

const PASSIVE_UNTIL_ATTACKED = new Set(["drone_pirate", "raider_astral"]);
function requiresPlayerAttack(enemy){
  return Boolean(enemy?.requiresPlayerAttack) || PASSIVE_UNTIL_ATTACKED.has(getEnemyAiKind(enemy?.kind));
}

function followsPlayerBeforeAttack(enemy){
  return Boolean(enemy?.followBeforeAttacked);
}

function hasBeenAttackedByPlayer(enemy){
  return Boolean(enemy?.attackedPlayerId) || Object.keys(enemy?.damageThreat || {}).length > 0;
}

function clearEnemyTargetMemory(enemy){
  enemy.lockedPlayerId = null;
  enemy.lockedPlayerLastSeenAt = 0;
  enemy.attackedPlayerId = null;
  enemy.attackedPlayerLastAt = 0;
  enemy.damageThreat = {};
  enemy.threatRecalcAt = 0;
  enemy.aiDecision = null;
  enemy.nextAiDecisionAt = 0;
}

export function createWorldAiManager({players, presence, launchEnemyAttack, isPlayerSafeOnMap}){
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
      if(player?.npcTarget) continue;
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

    const canAcquireByProximity = !requiresPlayerAttack(enemy) || followsPlayerBeforeAttack(enemy);
    const targetMemoryMs = Math.max(0, Number(enemy.targetMemoryMs || WORLD_ENEMY_TARGET_MEMORY_MS));
    const activePlayerIds = new Set(mapPlayers
      .filter(player=>canTargetPlayer(enemy, player, map, now))
      .map(player=>player.id));

    if(enemy.lockedPlayerId && now >= Number(enemy.threatRecalcAt || 0)){
      enemy.lockedPlayerId = pickEnemyThreatTarget(enemy, activePlayerIds) || enemy.lockedPlayerId;
      enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
    }
    if(!enemy.lockedPlayerId){
      enemy.lockedPlayerId = pickEnemyThreatTarget(enemy, activePlayerIds);
      if(enemy.lockedPlayerId) enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
    }

    if(!enemy.lockedPlayerId && canAcquireByProximity && spottedTarget && spottedTarget.distance <= aggroDistance){
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
        if(now - Number(enemy.lockedPlayerLastSeenAt || 0) <= targetMemoryMs){
          target = {player:lockedPlayer, dx, dy, distance};
        }else{
          clearEnemyTargetMemory(enemy);
        }
      }else{
        clearEnemyTargetMemory(enemy);
      }
    }

    if(target){
      const engagementPoint = getEnemyEngagementPoint(
        enemy,
        {
          id:target.player.id,
          x:Number(target.player.state.x || 0),
          y:Number(target.player.state.y || 0),
          vx:Number(target.player.state.vx || 0),
          vy:Number(target.player.state.vy || 0),
          moving:Boolean(target.player.state.moving)
        },
        Number(enemy.attackRange || 360),
        Number(enemy.aiDecisionIndex || 0),
        now
      );
      targetX = engagementPoint.x;
      targetY = engagementPoint.y;
    }else{
      resetEnemyEngagement(enemy);
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
    const engagementTarget = enemy.lockedPlayerId
      ? players.get(enemy.lockedPlayerId) || mapPlayers.find(player=>player.id === enemy.lockedPlayerId) || null
      : null;
    const engagementAttackRange = Number(enemy.attackRange || 360);
    const engagementTargetDistance = engagementTarget?.state
      ? Math.hypot(
        Number(engagementTarget.state.x || 0) - enemy.x,
        Number(engagementTarget.state.y || 0) - enemy.y
      )
      : Infinity;
    if(isEnemyEngagementHolding(enemy) && engagementTargetDistance > engagementAttackRange){
      enemy.aiDecision = null;
      enemy.nextAiDecisionAt = 0;
    }
    if(!enemy.aiDecision || now >= Number(enemy.nextAiDecisionAt || 0)){
      enemy.aiDecisionIndex = Number(enemy.aiDecisionIndex || 0) + 1;
      enemy.aiDecision = computeWorldEnemyDecision(enemy, map, mapPlayers, now);
      enemy.nextAiDecisionAt = now + getEnemyRepathDelayMs(enemy, WORLD_AI_REPATH_MS);
    }
    const decision = enemy.aiDecision || {targetX:enemy.x, targetY:enemy.y, speed:0, targetPlayerId:null, targetDistance:Infinity};
    const attackTarget = decision.targetPlayerId
      ? players.get(decision.targetPlayerId) || mapPlayers.find(player=>player.id === decision.targetPlayerId) || null
      : null;
    const canAttackTarget = canTargetPlayer(enemy, attackTarget, map, now);
    const attackRange = Number(enemy.attackRange || 360);
    const liveTargetDistance = attackTarget?.state
      ? Math.hypot(Number(attackTarget.state.x || 0) - enemy.x, Number(attackTarget.state.y || 0) - enemy.y)
      : Infinity;
    const targetInAttackRange = canAttackTarget && liveTargetDistance <= attackRange;
    const crossingTargetCenter = isEnemyEngagementCrossing(enemy);
    const targetX = Number(decision.targetX || enemy.x);
    const targetY = Number(decision.targetY || enemy.y);
    const speed = Number(decision.speed || 0);
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const distance = Math.hypot(dx, dy);
    if((crossingTargetCenter || !targetInAttackRange) && distance > 8){
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

    if(crossingTargetCenter && Math.hypot(targetX - enemy.x, targetY - enemy.y) <= 8){
      const distanceAfterMove = attackTarget?.state
        ? Math.hypot(
          Number(attackTarget.state.x || 0) - enemy.x,
          Number(attackTarget.state.y || 0) - enemy.y
        )
        : Infinity;
      if(canAttackTarget && distanceAfterMove <= attackRange){
        completeEnemyEngagement(enemy);
      }else{
        resetEnemyEngagement(enemy);
        enemy.aiDecision = null;
        enemy.nextAiDecisionAt = 0;
      }
    }

    const attackDistance = attackTarget?.state
      ? Math.hypot(Number(attackTarget.state.x || 0) - enemy.x, Number(attackTarget.state.y || 0) - enemy.y)
      : Infinity;
    const attackUnlocked = !requiresPlayerAttack(enemy) || hasBeenAttackedByPlayer(enemy);
    if(attackUnlocked && canAttackTarget && presence.isActiveForWorld(attackTarget, now) && attackDistance <= attackRange && now >= Number(enemy.nextAttackAt || 0)){
      enemy.angle = Math.atan2(
        Number(attackTarget.state.y || 0) - enemy.y,
        Number(attackTarget.state.x || 0) - enemy.x
      ) + Math.PI / 2;
      const damageMin = Number(enemy.attackDamageMin);
      const damageMax = Number(enemy.attackDamageMax);
      const amount = enemy.useExactDamageRange && Number.isFinite(damageMin) && Number.isFinite(damageMax)
        ? Math.max(1, Math.round(Math.min(damageMin, damageMax) + Math.random() * Math.abs(damageMax - damageMin)))
        : Math.max(1, Math.round(Number(enemy.attackDamage || 25) * (0.85 + Math.random() * 0.3)));
      enemy.nextAttackAt = now + Number(enemy.attackCooldown || 1400);
      launchEnemyAttack({
        enemy,
        map,
        target:attackTarget,
        amount,
        now,
        attackStyle:enemy.attackStyle || getEnemyAiKind(enemy.kind)
      });
    }
  }

  return {updateWorldEnemy};
}
