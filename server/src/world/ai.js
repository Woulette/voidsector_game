import { WORLD_AI_REPATH_MS, WORLD_ENEMY_AGGRO_MULTIPLIER, WORLD_ENEMY_TARGET_MEMORY_MS } from "./constants.js";
import { canEnemyTargetPlayerInSafeZone, ENEMY_THREAT_RECALC_MS, pickEnemyThreatTarget } from "./aggro.js";
import { seededRandom } from "./spawn.js";
import { prepareNpcEliteLaserAttack } from "../combat/npcEliteLasers.js";
import { getEnemyRepathDelayMs } from "../../../src/game/systems/enemyTrajectory.js";
import { moveEnemyToward, resetEnemyPursuit, updateEnemyPursuit } from "./pursuit.js";
import { createEnemyFormationManager } from "./enemyFormation.js";
import { rollEnemyDamage } from "../../../src/shared/enemyDamage.js";
import { isWavePortal } from "../../../src/data/wavePortalTiers.js";

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function hashText(value){
  let hash = 2166136261;
  for(const char of String(value || "")){
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(key){
  return hashText(key) / 4294967296;
}

function getEnemyAttackCooldownMs(enemy){
  return Math.max(250, Number(enemy?.attackCooldown || 1400));
}

function getEnemyOpeningAttackDelayMs(enemy, cooldownMs){
  const configured = Number(enemy?.attackPhaseMs ?? enemy?.firstAttackDelayMs);
  if(Number.isFinite(configured) && configured > 0){
    return Math.max(40, Math.min(Math.max(80, cooldownMs - 50), configured));
  }
  const windowMs = Math.min(650, Math.max(220, cooldownMs * .65));
  const spread = Math.max(1, Math.round(windowMs - 120));
  return 120 + Math.round(randomUnit(`${enemy?.id || enemy?.kind || "enemy"}:opening-attack`) * spread);
}

function getEnemyCooldownJitterMs(enemy, cooldownMs){
  const span = Math.min(180, Math.max(40, cooldownMs * .12));
  const unit = randomUnit(`${enemy?.id || enemy?.kind || "enemy"}:${Number(enemy?.attackSequence || 0)}:attack-jitter`);
  return Math.round((unit - .5) * span);
}

function enemyCanAttackNow(enemy, now, cooldownMs){
  const nextAttackAt = Number(enemy?.nextAttackAt ?? 0);
  if(nextAttackAt === Infinity) return false;
  if(Number.isFinite(nextAttackAt) && nextAttackAt > 0) return now >= nextAttackAt;
  if(enemy?.staggerFirstAttack){
    enemy.nextAttackAt = now + getEnemyOpeningAttackDelayMs(enemy, cooldownMs);
    enemy.staggerFirstAttack = false;
    return false;
  }
  return true;
}

function scheduleEnemyNextAttack(enemy, now, cooldownMs){
  enemy.attackSequence = Number(enemy.attackSequence || 0) + 1;
  enemy.nextAttackAt = now + cooldownMs + getEnemyCooldownJitterMs(enemy, cooldownMs);
}

export function applyKharonBossAttackAbility(enemy, amount, target, now = Date.now()){
  const ability = enemy?.kharonAbility;
  const baseAmount = Math.max(0, Number(amount || 0));
  if(!enemy?.kharonBoss
    || ability?.abilityId !== "spectral_double_shot"
    || !ability.active
    || now >= Number(ability.activeUntil || 0)
    || now < Number(ability.chargeReadyAt || 0)){
    return baseAmount;
  }
  ability.chargeStartedAt = now;
  ability.chargeReadyAt = now + 3_000;
  enemy.kharonSpectralImpact = {
    targetId:String(target?.id || ""),
    x:Number(target?.state?.x || enemy.x || 0),
    y:Number(target?.state?.y || enemy.y || 0),
    at:now,
    emitted:false
  };
  return baseAmount * 2;
}

function getEnemyAiKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

const PASSIVE_UNTIL_ATTACKED = new Set(["drone_pirate", "raider_astral"]);
function requiresPlayerAttack(enemy){
  if(enemy?.azuronEnemy && enemy?.permanentAggro) return false;
  return Boolean(enemy?.requiresPlayerAttack) || PASSIVE_UNTIL_ATTACKED.has(getEnemyAiKind(enemy?.kind));
}

function followsPlayerBeforeAttack(enemy){
  return Boolean(enemy?.followBeforeAttacked);
}

function hasBeenAttackedByPlayer(enemy){
  return Boolean(enemy?.attackedPlayerId) || Object.keys(enemy?.damageThreat || {}).length > 0;
}

function isInsideGuardLeash(enemy, player){
  const leashRadius = Number(enemy?.guardLeashRadius || 0);
  if(leashRadius <= 0 || !player?.state) return true;
  return Math.hypot(
    Number(player.state.x || 0) - Number(enemy.homeX || 0),
    Number(player.state.y || 0) - Number(enemy.homeY || 0)
  ) <= leashRadius;
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
  resetEnemyPursuit(enemy);
}

export function createWorldAiManager({players, presence, launchEnemyAttack, isPlayerSafeOnMap}){
  const formations = createEnemyFormationManager();
  let safeZoneCacheNow = Number.NaN;
  const safeZoneCache = new Map();

  function playerIsSafeOnMap(player, map, now){
    if(now !== safeZoneCacheNow){
      safeZoneCacheNow = now;
      safeZoneCache.clear();
    }
    const key = `${player?.id || ""}:${map?.id || map?.name || ""}:${Number(player?.state?.x || 0)}:${Number(player?.state?.y || 0)}:${player?.firmId || player?.account?.firmId || ""}`;
    if(safeZoneCache.has(key)) return safeZoneCache.get(key);
    const safe = Boolean(isPlayerSafeOnMap?.(player, map));
    safeZoneCache.set(key, safe);
    return safe;
  }

  function canTargetPlayer(enemy, player, map, now){
    if(enemy?.azuronEnemy && enemy?.permanentAggro && isWavePortal(map)) return Boolean(player?.state);
    return canEnemyTargetPlayerInSafeZone({
      enemy,
      player,
      map,
      now,
      isPlayerSafeOnMap:(target, targetMap)=>playerIsSafeOnMap(target, targetMap, now)
    });
  }

  function scanTargetablePlayers(enemy, candidates, map, now){
    let nearest = null;
    let nearestDistance = Infinity;
    const activePlayerIds = new Set();
    for(const player of candidates){
      if(!canTargetPlayer(enemy, player, map, now)) continue;
      if(!isInsideGuardLeash(enemy, player)) continue;
      activePlayerIds.add(player.id);
      if(player?.npcTarget) continue;
      const dx = Number(player.state.x || 0) - enemy.x;
      const dy = Number(player.state.y || 0) - enemy.y;
      const distance = Math.hypot(dx, dy);
      if(distance < nearestDistance){
        nearest = {player, dx, dy, distance};
        nearestDistance = distance;
      }
    }
    return {nearest, activePlayerIds};
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
    const permanentAggro = Boolean(enemy.azuronEnemy && enemy.permanentAggro && isWavePortal(map));
    const targetable = scanTargetablePlayers(enemy, mapPlayers, map, now);
    const spottedTarget = targetable.nearest;
    let targetX = enemy.x;
    let targetY = enemy.y;
    let speed = Number(enemy.speed || 160);
    const aggroDistance = Math.max(780, Number(enemy.attackRange || 400) + 260) * WORLD_ENEMY_AGGRO_MULTIPLIER;
    let target = null;

    const canAcquireByProximity = !requiresPlayerAttack(enemy) || followsPlayerBeforeAttack(enemy);
    const targetMemoryMs = Math.max(0, Number(enemy.targetMemoryMs || WORLD_ENEMY_TARGET_MEMORY_MS));
    const activePlayerIds = targetable.activePlayerIds;

    if(enemy.lockedPlayerId && now >= Number(enemy.threatRecalcAt || 0)){
      enemy.lockedPlayerId = pickEnemyThreatTarget(enemy, activePlayerIds) || enemy.lockedPlayerId;
      enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
    }
    if(!enemy.lockedPlayerId){
      enemy.lockedPlayerId = pickEnemyThreatTarget(enemy, activePlayerIds);
      if(enemy.lockedPlayerId) enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
    }

    if(!enemy.lockedPlayerId && canAcquireByProximity && spottedTarget && (permanentAggro || spottedTarget.distance <= aggroDistance)){
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
        if(!isInsideGuardLeash(enemy, lockedPlayer)){
          clearEnemyTargetMemory(enemy);
          target = null;
        }else{
          const dx = Number(lockedPlayer.state.x || 0) - enemy.x;
          const dy = Number(lockedPlayer.state.y || 0) - enemy.y;
          const distance = Math.hypot(dx, dy);
          if(permanentAggro || distance <= aggroDistance){
            enemy.lockedPlayerLastSeenAt = now;
          }
          if(permanentAggro || now - Number(enemy.lockedPlayerLastSeenAt || 0) <= targetMemoryMs){
            target = {player:lockedPlayer, dx, dy, distance};
          }else{
            clearEnemyTargetMemory(enemy);
          }
        }
      }else{
        clearEnemyTargetMemory(enemy);
      }
    }

    if(target){
      targetX = Number(target.player.state.x || 0);
      targetY = Number(target.player.state.y || 0);
    }else{
      resetEnemyPursuit(enemy);
      if(Number(enemy.guardLeashRadius || 0) > 0){
        targetX = Number(enemy.homeX || 0);
        targetY = Number(enemy.homeY || 0);
      }else{
        pickEnemyWanderTarget(enemy, map, now);
        targetX = enemy.wanderX;
        targetY = enemy.wanderY;
      }
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
      formations.release(enemy);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.moving = false;
      return;
    }
    enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
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
    const speed = Number(decision.speed || 0);
    if(enemy.anchored){
      formations.release(enemy);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.moving = false;
      if(attackTarget?.state){
        enemy.angle = Math.atan2(
          Number(attackTarget.state.y || 0) - enemy.y,
          Number(attackTarget.state.x || 0) - enemy.x
        ) + Math.PI / 2;
      }
    }else if(canAttackTarget && isInsideGuardLeash(enemy, attackTarget)){
      // Target selection and movement reactions use separate clocks. Pursuit
      // keeps its last sampled point for 0.8-1.5 seconds between reactions.
      const hasMotionHint = typeof attackTarget.state.moving === "boolean"
        || Number.isFinite(attackTarget.state.vx) || Number.isFinite(attackTarget.state.vy);
      updateEnemyPursuit(enemy, {
        id:attackTarget.id,
        x:clamp(Number(attackTarget.state.x || 0), -map.width / 2 + 70, map.width / 2 - 70),
        y:clamp(Number(attackTarget.state.y || 0), -map.height / 2 + 70, map.height / 2 - 70),
        moving:hasMotionHint ? Boolean(attackTarget.state.moving) || Math.hypot(Number(attackTarget.state.vx || 0),Number(attackTarget.state.vy || 0))>5 : undefined,
        formationAngle:formations.getAngle(enemy,map,attackTarget,now),
        mapWidth:map.width,
        mapHeight:map.height
      }, speed, attackRange, dt, now);
    }else{
      formations.release(enemy);
      resetEnemyPursuit(enemy);
      moveEnemyToward(enemy, {
        x:decision.targetPlayerId ? enemy.x : Number(decision.targetX ?? enemy.x),
        y:decision.targetPlayerId ? enemy.y : Number(decision.targetY ?? enemy.y)
      }, speed, dt);
    }

    const attackDistance = attackTarget?.state
      ? Math.hypot(Number(attackTarget.state.x || 0) - enemy.x, Number(attackTarget.state.y || 0) - enemy.y)
      : Infinity;
    const attackUnlocked = !requiresPlayerAttack(enemy) || hasBeenAttackedByPlayer(enemy);
    const attackCooldownMs = getEnemyAttackCooldownMs(enemy);
    if(attackUnlocked
      && canAttackTarget
      && presence.isActiveForWorld(attackTarget, now)
      && attackDistance <= attackRange
      && enemyCanAttackNow(enemy, now, attackCooldownMs)){
      enemy.angle = Math.atan2(
        Number(attackTarget.state.y || 0) - enemy.y,
        Number(attackTarget.state.x || 0) - enemy.x
      ) + Math.PI / 2;
      let amount = rollEnemyDamage(enemy.attackDamage || 25);
      amount = applyKharonBossAttackAbility(enemy, amount, attackTarget, now);
      const eliteLaserShot = prepareNpcEliteLaserAttack(enemy, {
        amount,
        cooldownMs:attackCooldownMs,
        now
      });
      amount = eliteLaserShot.amount;
      scheduleEnemyNextAttack(enemy, now, eliteLaserShot.cooldownMs);
      launchEnemyAttack({
        enemy,
        map,
        target:attackTarget,
        amount,
        now,
        attackStyle:enemy.attackStyle || getEnemyAiKind(enemy.kind),
        eliteLaser:eliteLaserShot.eliteLaser
      });
    }
  }

  return {updateWorldEnemy};
}
