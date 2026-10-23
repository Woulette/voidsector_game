import { getInstanceGroups } from "./portalSessions.js";
import { applyDamageToEnemy, enemyDurability } from "../combat/enemyHits.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";
import {
  createVesperAlliedDrone,
  createVesperBoss,
  createVesperBossOrbiters,
  createVesperDefenders,
  isVesperPortalInstance,
  VESPER_PORTAL_MAP
} from "./vesperPortalState.js";

function randomBetween(min, max, random = Math.random){
  const low = Math.min(Number(min || 0), Number(max || 0));
  const high = Math.max(Number(min || 0), Number(max || 0));
  return Math.round(low + Math.max(0, Math.min(.999999, Number(random() || 0))) * (high - low));
}

function moveEntity(entity, targetX, targetY, dt){
  const dx = Number(targetX || 0) - Number(entity.x || 0);
  const dy = Number(targetY || 0) - Number(entity.y || 0);
  const distance = Math.hypot(dx, dy);
  if(distance <= 8){
    entity.vx = 0;
    entity.vy = 0;
    return false;
  }
  const speed = Math.max(0, Number(entity.speed || 0));
  const step = Math.min(distance, speed * Math.max(0, Number(dt || 0)));
  const nx = dx / distance;
  const ny = dy / distance;
  entity.x = Number(entity.x || 0) + nx * step;
  entity.y = Number(entity.y || 0) + ny * step;
  entity.vx = nx * speed;
  entity.vy = ny * speed;
  entity.angle = Math.atan2(ny, nx) + Math.PI / 2;
  return true;
}

function clearEntityMotion(entity){
  entity.vx = 0;
  entity.vy = 0;
}

function findVesperCageState(instance, cageNumber){
  return instance?.objective?.cages?.find(cage=>Number(cage.number) === Number(cageNumber)) || null;
}

function getAliveEnemy(instance, enemyId){
  return (instance?.enemies || []).find(enemy=>
    String(enemy.id || "") === String(enemyId || "")
    && Number(enemy.hp || 0) > 0
  ) || null;
}

function getLiveTurrets(instance, cage){
  const turretIds = new Set((cage?.turretIds || []).map(String));
  return (instance?.enemies || []).filter(enemy=>
    turretIds.has(String(enemy.id || ""))
    && Number(enemy.hp || 0) > 0
  );
}

function getJoinedMemberIds(group){
  const instance = group?.instance;
  return Array.isArray(instance?.joinedMemberIds)
    ? instance.joinedMemberIds
    : (group?.members || []);
}

export function createVesperPortalRuntime({
  io,
  players,
  groups,
  emitInstance,
  emitPortalComplete,
  awardPortalEnemyReward,
  random = Math.random
} = {}){
  function getVesperPlayers(group, {aliveOnly = true} = {}){
    const instance = group?.instance;
    if(!isVesperPortalInstance(instance)) return [];
    const mapId = `portal-${instance.portal.id}`;
    const abandoned = new Set((instance.abandonedMemberIds || []).map(String));
    return getJoinedMemberIds(group)
      .map(playerId=>players?.get?.(playerId))
      .filter(Boolean)
      .filter(player=>!abandoned.has(String(player.id)))
      .filter(player=>String(player.state?.mapId || player.mapId || "") === mapId)
      .filter(player=>!aliveOnly || (!player.deathState && Number(player.state?.hp || 0) > 0));
  }

  function getVesperNpcTargets(instance, mapId = `portal-${instance?.portal?.id || ""}`){
    if(!isVesperPortalInstance(instance)) return [];
    return (Array.isArray(instance.allies) ? instance.allies : [])
      .filter(ally=>ally?.alive !== false && Number(ally?.hp || 0) > 0)
      .map(ally=>({
        id:ally.id,
        npcTarget:true,
        connected:true,
        clientMode:"game",
        mapId,
        state:ally
      }));
  }

  function nearestPlayerToCage(group, cage){
    let nearest = null;
    let nearestDistance = Infinity;
    for(const player of getVesperPlayers(group)){
      const distance = Math.hypot(
        Number(player.state?.x || 0) - Number(cage.x || 0),
        Number(player.state?.y || 0) - Number(cage.y || 0)
      );
      if(distance < nearestDistance){
        nearest = player;
        nearestDistance = distance;
      }
    }
    return nearest ? {player:nearest, distance:nearestDistance} : null;
  }

  function cageDefinitionFromState(cage){
    return {
      id:cage.key || `cage_${cage.number}`,
      number:Number(cage.number || 0),
      x:Number(cage.x || 0),
      y:Number(cage.y || 0)
    };
  }

  function alertCageDefenders(group, cage, now){
    const instance = group.instance;
    if(cage.destroyed || cage.defendersSpawned) return false;
    const nearest = nearestPlayerToCage(group, cage);
    const defenseWasAttacked = [cage.id, ...(cage.turretIds || [])].some(enemyId=>{
      const enemy = (instance.enemies || []).find(entry=>String(entry.id) === String(enemyId));
      return Boolean(enemy?.attackedPlayerId) || Object.keys(enemy?.damageThreat || {}).length > 0;
    });
    if(!defenseWasAttacked && (!nearest || nearest.distance > VESPER_PORTAL_MAP.cageApproachRadius)) return false;
    const defenders = createVesperDefenders(cageDefinitionFromState(cage), "approach", now);
    cage.defendersSpawned = true;
    cage.defendersSpawnedAt = now;
    instance.enemies.push(...defenders);
    const target = nearest?.player;
    if(target){
      for(const defender of defenders) markEnemyAttackedByPlayer(defender, target.id, 1, now);
    }
    io?.to?.(`instance:${instance.id}`)?.emit?.("portal:vesper-cage-alert", {
      cageId:cage.id,
      cageNumber:cage.number,
      defenders:defenders.length,
      at:now
    });
    emitInstance?.(group);
    return true;
  }

  function keepCageDefenseAuthoritative(group, cage, now){
    const instance = group.instance;
    const cageEnemy = getAliveEnemy(instance, cage.id);
    if(cageEnemy){
      cage.hp = Math.max(0, Number(cageEnemy.hp || 0));
      cage.maxHp = Math.max(0, Number(cageEnemy.maxHp || cage.maxHp || 0));
    }
    const liveTurrets = getLiveTurrets(instance, cage);
    cage.turretsRemaining = liveTurrets.length;
    if(cageEnemy){
      const shouldBeImmune = liveTurrets.length > 0;
      if(Boolean(cageEnemy.damageImmune) !== shouldBeImmune){
        cageEnemy.damageImmune = shouldBeImmune;
        cageEnemy.damageImmuneReason = shouldBeImmune
          ? "Detruis d'abord les tourelles de cette cage."
          : "";
        if(!shouldBeImmune){
          io?.to?.(`instance:${instance.id}`)?.emit?.("portal:vesper-cage-unlocked", {
            cageId:cage.id,
            cageNumber:cage.number,
            at:now
          });
          emitInstance?.(group);
        }
      }
    }

    const nearest = nearestPlayerToCage(group, cage);
    if(!nearest || nearest.distance > VESPER_PORTAL_MAP.cageApproachRadius) return;
    for(const guard of instance.enemies || []){
      if(!guard.vesperGuard
        || Number(guard.vesperCageNumber) !== Number(cage.number)
        || Number(guard.hp || 0) <= 0
        || guard.lockedPlayerId){
        continue;
      }
      markEnemyAttackedByPlayer(guard, nearest.player.id, 1, now);
    }
  }

  function spawnCageReinforcements(group, cage, killerId, now){
    if(cage.reinforcementsSpawned) return [];
    const defenders = createVesperDefenders(cageDefinitionFromState(cage), "reinforcement", now);
    cage.reinforcementsSpawned = true;
    cage.reinforcementsSpawnedAt = now;
    group.instance.enemies.push(...defenders);
    const target = players?.get?.(killerId) || nearestPlayerToCage(group, cage)?.player || null;
    if(target){
      for(const defender of defenders) markEnemyAttackedByPlayer(defender, target.id, 1, now);
    }
    return defenders;
  }

  function releaseCageAlly(group, cage, now){
    const instance = group.instance;
    if(cage.allyId) return (instance.allies || []).find(ally=>ally.id === cage.allyId) || null;
    if(!Array.isArray(instance.allies)) instance.allies = [];
    const ally = createVesperAlliedDrone(
      cageDefinitionFromState(cage),
      instance.allies.length,
      now
    );
    cage.allyId = ally.id;
    instance.allies.push(ally);
    return ally;
  }

  function spawnVesperBoss(group, now){
    const instance = group.instance;
    const objective = instance.objective;
    if(objective.bossSpawned) return getAliveEnemy(instance, objective.bossId);
    const boss = createVesperBoss(now);
    objective.stage = "boss";
    objective.bossSpawned = true;
    objective.bossSpawnedAt = now;
    objective.bossId = boss.id;
    objective.bossOrbiters = createVesperBossOrbiters(boss, now);
    instance.enemies.push(boss);
    io?.to?.(`instance:${instance.id}`)?.emit?.("portal:vesper-boss", {
      bossId:boss.id,
      hp:boss.maxHp,
      shield:boss.maxShield,
      orbiters:objective.bossOrbiters.length,
      at:now
    });
    emitInstance?.(group);
    return boss;
  }

  function handleVesperEnemyDeath(group, enemy, killerId = ""){
    const instance = group?.instance;
    if(!isVesperPortalInstance(instance) || instance.completed || !enemy || Number(enemy.hp || 0) > 0) return false;
    if(enemy.vesperDeathHandled) return true;
    enemy.vesperDeathHandled = true;
    const now = Date.now();

    if(enemy.vesperTurret){
      const cage = findVesperCageState(instance, enemy.vesperCageNumber);
      if(cage) keepCageDefenseAuthoritative(group, cage, now);
      return true;
    }

    if(enemy.vesperCage){
      const cage = findVesperCageState(instance, enemy.vesperCageNumber);
      if(!cage) return true;
      if(getLiveTurrets(instance, cage).length > 0){
        enemy.hp = Math.max(1, Number(enemy.maxHp || 1));
        enemy.vesperDeathHandled = false;
        return true;
      }
      cage.destroyed = true;
      cage.destroyedAt = now;
      cage.hp = 0;
      const ally = releaseCageAlly(group, cage, now);
      const reinforcements = spawnCageReinforcements(group, cage, killerId, now);
      instance.objective.cagesDestroyed = instance.objective.cages.filter(entry=>entry.destroyed).length;
      io?.to?.(`instance:${instance.id}`)?.emit?.("portal:vesper-cage-destroyed", {
        cageId:cage.id,
        cageNumber:cage.number,
        cagesDestroyed:instance.objective.cagesDestroyed,
        cagesTotal:instance.objective.cagesTotal,
        allyId:ally?.id || null,
        reinforcements:reinforcements.length,
        at:now
      });
      if(instance.objective.cagesDestroyed >= instance.objective.cagesTotal){
        spawnVesperBoss(group, now);
      }else{
        emitInstance?.(group);
      }
      return true;
    }

    if(enemy.vesperBoss){
      instance.objective.stage = "complete";
      instance.objective.completedAt = now;
      instance.objective.bossOrbiters = [];
      emitPortalComplete?.(group);
      return true;
    }

    return Boolean(enemy.vesperGuard);
  }

  function findAllyLeader(group, ally){
    const candidates = getVesperPlayers(group);
    if(!candidates.length) return null;
    return candidates.sort((a, b)=>{
      const distanceA = Math.hypot(Number(a.state.x || 0) - ally.x, Number(a.state.y || 0) - ally.y);
      const distanceB = Math.hypot(Number(b.state.x || 0) - ally.x, Number(b.state.y || 0) - ally.y);
      return distanceA - distanceB;
    })[0];
  }

  function findAllyTarget(instance, ally, leader){
    const leaderX = Number(leader?.state?.x || 0);
    const leaderY = Number(leader?.state?.y || 0);
    const maximumLeaderDistance = Number(ally.maxLeaderDistance || 950) + Number(ally.attackRange || 500);
    let best = null;
    let bestScore = Infinity;
    for(const enemy of instance.enemies || []){
      if(Number(enemy.hp || 0) <= 0 || enemy.damageImmune) continue;
      const leaderDistance = Math.hypot(Number(enemy.x || 0) - leaderX, Number(enemy.y || 0) - leaderY);
      if(leaderDistance > maximumLeaderDistance) continue;
      const allyDistance = Math.hypot(Number(enemy.x || 0) - ally.x, Number(enemy.y || 0) - ally.y);
      const priority = enemy.vesperBoss ? 0
        : enemy.vesperTurret ? 1
          : enemy.vesperGuard ? 2
            : enemy.vesperCage ? 3
              : 4;
      const score = priority * 100_000 + allyDistance;
      if(score < bestScore){
        best = enemy;
        bestScore = score;
      }
    }
    return best;
  }

  function emitAllyHit(group, ally, enemy, damage, now){
    io?.to?.(`instance:${group.instance.id}`)?.emit?.("combat:hit", {
      enemyId:enemy.id,
      attackerId:ally.id,
      weaponClass:"laser",
      ammoId:"",
      consumed:0,
      hit:true,
      damage,
      mapId:`portal-${group.instance.portal.id}`,
      fromX:Number(ally.x || 0),
      fromY:Number(ally.y || 0),
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      radius:Number(enemy.radius || 0),
      color:ally.color,
      npcAttack:true,
      at:now
    });
  }

  function updateVesperAlly(group, ally, dt, now){
    if(ally.alive === false || Number(ally.hp || 0) <= 0){
      ally.alive = false;
      clearEntityMotion(ally);
      return;
    }
    const leader = findAllyLeader(group, ally);
    if(!leader?.state){
      clearEntityMotion(ally);
      return;
    }
    const leaderX = Number(leader.state.x || 0);
    const leaderY = Number(leader.state.y || 0);
    const leaderDistance = Math.hypot(leaderX - ally.x, leaderY - ally.y);
    const target = findAllyTarget(group.instance, ally, leader);
    if(leaderDistance > Number(ally.maxLeaderDistance || 950)){
      const angle = Number(ally.slotIndex || 0) / 4 * Math.PI * 2;
      moveEntity(ally, leaderX + Math.cos(angle) * 210, leaderY + Math.sin(angle) * 210, dt);
      return;
    }
    if(target){
      const targetDistance = Math.hypot(Number(target.x || 0) - ally.x, Number(target.y || 0) - ally.y);
      if(targetDistance > Number(ally.attackRange || 500) * .82){
        moveEntity(ally, target.x, target.y, dt);
      }else{
        clearEntityMotion(ally);
        ally.angle = Math.atan2(Number(target.y || 0) - ally.y, Number(target.x || 0) - ally.x) + Math.PI / 2;
      }
      if(targetDistance <= Number(ally.attackRange || 500) && now >= Number(ally.nextAttackAt || 0)){
        ally.nextAttackAt = now + Number(ally.attackCooldownMs || 1_250);
        const rolledDamage = randomBetween(ally.damageMin, ally.damageMax, random);
        const wasAlive = Number(target.hp || 0) > 0;
        const durabilityBefore = enemyDurability(target);
        markEnemyAttackedByPlayer(target, ally.id, rolledDamage, now);
        applyDamageToEnemy(target, rolledDamage);
        const damage = Math.max(0, durabilityBefore - enemyDurability(target));
        emitAllyHit(group, ally, target, damage, now);
        if(wasAlive && Number(target.hp || 0) <= 0){
          awardPortalEnemyReward?.(group, target, ally.id);
          handleVesperEnemyDeath(group, target, ally.id);
        }
      }
      return;
    }
    const formationAngle = Number(ally.slotIndex || 0) / 4 * Math.PI * 2;
    const targetX = leaderX + Math.cos(formationAngle) * Number(ally.followDistance || 260);
    const targetY = leaderY + Math.sin(formationAngle) * Number(ally.followDistance || 260);
    if(Math.hypot(targetX - ally.x, targetY - ally.y) > 55){
      moveEntity(ally, targetX, targetY, dt);
    }else{
      clearEntityMotion(ally);
    }
  }

  function updateBossOrbiters(instance, now){
    const objective = instance.objective;
    if(!objective?.bossSpawned || !objective.bossId) return;
    const boss = getAliveEnemy(instance, objective.bossId);
    if(!boss){
      objective.bossOrbiters = [];
      return;
    }
    for(const orbiter of objective.bossOrbiters || []){
      const angle = Number(orbiter.baseAngle || 0) + now / 1_000 * Number(orbiter.angularSpeed || 0);
      const radius = Number(orbiter.orbitRadius || 225);
      orbiter.angle = angle + Math.PI / 2;
      orbiter.x = Number(boss.x || 0) + Math.cos(angle) * radius;
      orbiter.y = Number(boss.y || 0) + Math.sin(angle) * radius;
    }
  }

  function updateVesperGroup(group, dt, now){
    const instance = group?.instance;
    if(!isVesperPortalInstance(instance) || instance.completed || instance.objective?.kind !== "vesper") return;
    for(const cage of instance.objective.cages || []){
      if(cage.destroyed) continue;
      alertCageDefenders(group, cage, now);
      keepCageDefenseAuthoritative(group, cage, now);
    }
    for(const ally of instance.allies || []) updateVesperAlly(group, ally, dt, now);
    updateBossOrbiters(instance, now);
  }

  function updateVesperEncounters(dt, now = Date.now()){
    for(const group of getInstanceGroups(groups)) updateVesperGroup(group, dt, now);
  }

  return {
    getVesperNpcTargets,
    handleVesperEnemyDeath,
    updateVesperEncounters,
    updateVesperGroup
  };
}
