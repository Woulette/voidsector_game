import { getProgressionSnapshot } from "../players/progression.js";
import { ENEMY_THREAT_RECALC_MS, markEnemyAttackedByPlayer } from "../world/aggro.js";
import { getFirmMapId, normalizeFirmId } from "../../../src/data/firms.js";
import {
  findRickyPortalLever,
  isPointInRickyTriggerZone,
  RICKY_PORTAL_MAP,
  RICKY_PORTAL_RETURN_POINTS
} from "../../../src/data/rickyPortal.js";
import {
  createDeadlyEnemy,
  DEADLY_BEACON_WAVES,
  DEADLY_BOSS_MAX_LIVE_SUMMONS,
  DEADLY_BOSS_SUMMON_BATCH_SIZE,
  DEADLY_BOSS_SUMMON_INTERVAL_MS,
  DEADLY_FINAL_GATE_WAVE,
  DEADLY_ROUTE_WAVES,
  pickDeadlyMinionKind
} from "./deadlyEnemies.js";
import {
  createDeadlyCage,
  createRickyBoss,
  isRickyPortalInstance,
  RICKY_ALLY_ID,
  RICKY_HEAL_BEACON_AMOUNT,
  RICKY_HEAL_BEACON_DURATION_MS,
  RICKY_HEAL_BEACON_INTERVAL_MS,
  RICKY_HEAL_BEACON_RADIUS,
  RICKY_HEAL_COOLDOWN_MS,
  RICKY_LEVER_MOVE_TOLERANCE
} from "./rickyPortalState.js";

function applyDamageToEnemy(enemy, incoming){
  enemy.recentHitTimer = 4;
  const damage = Math.max(0, Number(incoming || 0));
  if(enemy.maxShield > 0 && enemy.shield > 0){
    const shieldPart = damage * Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? .8)));
    let hullPart = damage - shieldPart;
    const absorbed = Math.min(enemy.shield, shieldPart);
    enemy.shield -= absorbed;
    hullPart += shieldPart - absorbed;
    if(hullPart > 0) enemy.hp -= hullPart;
  }else{
    enemy.hp -= damage;
  }
  enemy.hp = Math.max(0, enemy.hp);
  enemy.shield = Math.max(0, enemy.shield);
}

function healShipState(state, amount){
  if(!state) return 0;
  const maxHp = Math.max(0, Number(state.maxHp || state.hp || 0));
  const before = Math.max(0, Number(state.hp || 0));
  state.hp = Math.min(maxHp || before, before + Math.max(0, Number(amount || 0)));
  return Math.max(0, state.hp - before);
}

function randomBetween(min, max){
  return Math.round(Number(min || 0) + Math.random() * (Number(max || min || 0) - Number(min || 0)));
}

function compositionKinds(composition = {}){
  return Object.entries(composition).flatMap(([kind, count])=>
    Array.from({length:Math.max(0, Math.floor(Number(count || 0)))}, ()=>kind)
  );
}

export function createRickyPortalRuntime({
  io,
  players,
  groups,
  profileManager,
  firmWarManager,
  emitProfileSync,
  emitInstance,
  setPlayerMap,
  resetGroupInstance,
  emitPortalComplete,
  getInstanceMapId,
  getJoinedMemberIds
}){
  function getRickyPortalPlayers(group, {requireMap = false, aliveOnly = false} = {}){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return [];
    const joined = new Set(getJoinedMemberIds(instance));
    const mapId = getInstanceMapId(instance);
    return (group.members || [])
      .filter(memberId=>joined.has(memberId) && !instance.abandonedMemberIds?.includes(memberId))
      .map(memberId=>players.get(memberId))
      .filter(player=>{
        if(!player || player.connected === false || player.clientMode !== "game") return false;
        if(requireMap && String(player.state?.mapId || player.mapId || "") !== mapId) return false;
        if(aliveOnly && Number(player.state?.hp || 0) <= 0) return false;
        return true;
      });
  }

  function getRickyFollowTarget(group){
    const activePlayers = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    return activePlayers.find(player=>player.id === group.leaderId) || activePlayers[0] || null;
  }

  function spawnRickyEncounter(group, {
    encounterId,
    composition,
    centerX,
    centerY,
    radiusMin = 300,
    radiusMax = 560,
    lever = null,
    phase = ""
  } = {}){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance) || !encounterId) return [];
    const kinds = compositionKinds(composition);
    const count = kinds.length;
    const targets = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    const spawnNow = Date.now();
    const spawned = kinds.map((kind, index)=>{
      const angle = index / Math.max(1, count) * Math.PI * 2 + Math.random() * .35;
      const distance = radiusMin + Math.random() * Math.max(0, radiusMax - radiusMin);
      const enemy = createDeadlyEnemy(kind, {
        id:`RICKY-${encounterId}-${spawnNow.toString(36)}-${index}`,
        x:Number(centerX || 0) + Math.cos(angle) * distance,
        y:Number(centerY || 0) + Math.sin(angle) * distance,
        now:spawnNow
      });
      enemy.rickyEncounterId=encounterId;
      enemy.rickyMandatory=true;
      if(lever){
        enemy.rickyLeverId=lever.id;
        enemy.rickyLeverNumber=lever.number;
        enemy.rickyLeverPhase=phase;
      }
      const target = targets[index % Math.max(1, targets.length)] || null;
      if(target){
        enemy.lockedPlayerId=target.id;
        enemy.lockedPlayerLastSeenAt=spawnNow;
        enemy.threatRecalcAt=spawnNow + ENEMY_THREAT_RECALC_MS;
      }
      return enemy;
    });
    instance.enemies.push(...spawned);
    return spawned;
  }

  function spawnRickyRouteWave(group, routeWave){
    return spawnRickyEncounter(group, {
      encounterId:`route_${routeWave.number}`,
      composition:DEADLY_ROUTE_WAVES[routeWave.number],
      centerX:routeWave.centerX,
      centerY:routeWave.centerY,
      radiusMin:260,
      radiusMax:540
    });
  }

  function spawnRickyBeaconWave(group, lever){
    return spawnRickyEncounter(group, {
      encounterId:`beacon_${lever.number}`,
      composition:DEADLY_BEACON_WAVES[lever.number],
      centerX:lever.x,
      centerY:lever.y,
      radiusMin:300,
      radiusMax:560,
      lever,
      phase:"activate"
    });
  }

  function spawnRickyFinalGateWave(group){
    return spawnRickyEncounter(group, {
      encounterId:"final_gate",
      composition:DEADLY_FINAL_GATE_WAVE,
      centerX:0,
      centerY:2500,
      radiusMin:320,
      radiusMax:700
    });
  }

  function findRickyTarget(ally, leader, enemies){
    if(!ally || !leader?.state) return null;
    const leaderX = Number(leader.state.x || 0);
    const leaderY = Number(leader.state.y || 0);
    const maxDistanceFromLeader = Number(ally.maxLeaderDistance || 720) + Number(ally.attackRange || 600);
    const group = leader.groupId ? groups.get(leader.groupId) : null;
    const playersInPortal = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    const playerIds = new Set(playersInPortal.map(player=>String(player.id)));
    const selectedTargetIds = new Set(playersInPortal
      .map(player=>String(player.state?.attackTargetId || player.state?.lockedTargetId || ""))
      .filter(Boolean));
    let best = null;
    for(const enemy of enemies || []){
      if(!enemy || Number(enemy.hp || 0) <= 0) continue;
      const allyDistance = Math.hypot(Number(enemy.x || 0) - ally.x, Number(enemy.y || 0) - ally.y);
      const leaderDistance = Math.hypot(Number(enemy.x || 0) - leaderX, Number(enemy.y || 0) - leaderY);
      if(leaderDistance > maxDistanceFromLeader) continue;
      const selectedByPlayer = selectedTargetIds.has(String(enemy.id));
      const attackedByPlayer = playerIds.has(String(enemy.attackedPlayerId || ""));
      if(!selectedByPlayer
        && !attackedByPlayer
        && allyDistance > Number(ally.attackRange || 600)
        && leaderDistance > Number(ally.attackRange || 600)){
        continue;
      }
      const priority = selectedByPlayer ? 0 : attackedByPlayer ? 1 : 2;
      const score = priority * 100_000 + Math.min(allyDistance, leaderDistance + 120);
      if(!best || score < best.score) best = {enemy, score};
    }
    return best?.enemy || null;
  }

  function moveRickyAlly(ally, targetX, targetY, dt){
    const dx = Number(targetX || 0) - ally.x;
    const dy = Number(targetY || 0) - ally.y;
    const distance = Math.hypot(dx, dy);
    if(distance <= 8){
      ally.vx = 0;
      ally.vy = 0;
      return;
    }
    const step = Math.min(distance, Number(ally.speed || 320) * dt);
    const nx = dx / distance;
    const ny = dy / distance;
    ally.x += nx * step;
    ally.y += ny * step;
    ally.vx = nx * Number(ally.speed || 320);
    ally.vy = ny * Number(ally.speed || 320);
    ally.angle = Math.atan2(ny, nx) + Math.PI / 2;
  }

  function emitRickyHit(group, enemy, damage, weaponClass){
    io.to(`instance:${group.instance.id}`).emit("combat:hit", {
      enemyId:enemy.id,
      attackerId:RICKY_ALLY_ID,
      weaponClass,
      ammoId:weaponClass === "rocket" ? "ricky_rocket" : "ricky_laser",
      consumed:0,
      hit:damage > 0,
      damage,
      mapId:getInstanceMapId(group.instance),
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      radius:Number(enemy.radius || 0),
      at:Date.now()
    });
  }

  function awardRickyPortalEnemyReward(group, enemy, killerId = RICKY_ALLY_ID){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance) || enemy.rewardGranted) return;
    enemy.rewardGranted = true;
    enemy.rewardGrantedAt = Date.now();
    const reward = enemy.reward || {credits:0, xp:0, premium:0};
    const rewardId = `${enemy.id}:${killerId}:${enemy.rewardGrantedAt}`;
    const recipients = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:false});
    const share = recipients.length > 1 ? 1 / recipients.length : 1;
    for(const player of recipients){
      const currentProfile = profileManager.getProfileForPlayer?.(player);
      const firmId = currentProfile?.player?.firmId || player.account?.firmId || "astra";
      const playerKey = profileManager.profileKeyForPlayer?.(player) || "";
      const firmBoosters = firmWarManager?.getActiveBoosters?.(firmId, currentProfile, player, playerKey) || {};
      const credits = Math.max(0, Math.round(Number(reward.credits || 0) * share * (1 + Math.max(0, Number(firmBoosters.credits || 0)))));
      const xp = Math.max(0, Math.round(Number(reward.xp || 0) * share));
      const premium = Math.max(0, Math.round(Number(reward.premium || 0) * share * (1 + Math.max(0, Number(firmBoosters.nova || 0)))));
      const reputation = Math.max(0, Math.round(xp * 0.1));
      const previousMonsterRankPoints = Math.max(0, Number(currentProfile?.player?.monsterRankPoints || 0));
      const profile = (profileManager.applyCombatReward || profileManager.applyReward)?.({
        player,
        reward:{
          credits,
          xp,
          premium,
          enemyName:enemy.name || enemy.type || enemy.kind,
          enemyKind:enemy.kind || enemy.type,
          enemyType:enemy.type,
          enemyLevel:enemy.level
        }
      });
      const rankPoints = Math.max(0, Number(profile?.player?.monsterRankPoints || 0) - previousMonsterRankPoints);
      io.to(player.id).emit("player:reward", {
        rewardId,
        enemyId:enemy.id,
        enemyType:enemy.type,
        enemyName:enemy.name || enemy.type || enemy.kind,
        enemyLevel:enemy.level,
        mapId:getInstanceMapId(instance),
        share,
        killerId,
        credits,
        xp,
        premium,
        reputation,
        rankPoints,
        firmBoosters,
        progression:getProgressionSnapshot(profile?.player),
        rewardAppliedByServer:true,
        at:Date.now()
      });
    }
  }

  function handleRickyEnemyDeath(group, enemy, killerId = RICKY_ALLY_ID){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return false;
    if(!enemy.noReward) awardRickyPortalEnemyReward(group, enemy, killerId);
    if(enemy.rickyCage){
      emitPortalComplete(group);
      return true;
    }
    if(enemy.rickyBoss && instance.objective && !instance.objective.cageSpawned){
      instance.enemies = instance.enemies.filter(entry=>!entry.rickyBossSummon);
      instance.objective.stage="cage";
      instance.objective.cageSpawned=true;
      instance.enemies.push(createDeadlyCage());
      emitInstance(group);
    }
    return true;
  }

  function damagePortalEnemyByRicky(group, enemy, damage, weaponClass, now){
    if(!enemy || Number(enemy.hp || 0) <= 0 || damage <= 0) return;
    const wasAlive = enemy.hp > 0;
    if(!enemy.lockedPlayerId){
      const priorityTarget = getRickyFollowTarget(group);
      if(priorityTarget){
        enemy.lockedPlayerId = priorityTarget.id;
        enemy.lockedPlayerLastSeenAt = now;
        enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
      }
    }
    markEnemyAttackedByPlayer(enemy, RICKY_ALLY_ID, damage, now);
    applyDamageToEnemy(enemy, damage);
    emitRickyHit(group, enemy, damage, weaponClass);
    if(wasAlive && enemy.hp <= 0) handleRickyEnemyDeath(group, enemy, RICKY_ALLY_ID);
  }

  function healRickyBeaconTargets(group, beacon){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return;
    const targets = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    const ally = instance.ally;
    if(ally?.alive !== false && Number(ally.hp || 0) > 0){
      targets.push({id:RICKY_ALLY_ID, state:ally});
    }
    for(const target of targets){
      const state = target.state;
      const distance = Math.hypot(Number(state.x || 0) - beacon.x, Number(state.y || 0) - beacon.y);
      if(distance > Number(beacon.radius || RICKY_HEAL_BEACON_RADIUS)) continue;
      const healed = healShipState(state, beacon.heal);
      if(healed <= 0) continue;
      if(target.id !== RICKY_ALLY_ID){
        profileManager.saveWorldSession?.({player:target, state, force:false});
        const profile = profileManager.getProfileForPlayer?.(target);
        emitProfileSync?.(target, profile);
      }
      io.to(target.id === RICKY_ALLY_ID ? `instance:${instance.id}` : target.id).emit("player:healed", {
        targetId:target.id,
        sourceId:RICKY_ALLY_ID,
        amount:healed,
        hp:state.hp,
        maxHp:state.maxHp,
        mapId:getInstanceMapId(instance),
        x:Number(state.x || beacon.x),
        y:Number(state.y || beacon.y),
        at:Date.now()
      });
    }
  }

  function updateRickyBeacons(group, now){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return;
    instance.beacons = (Array.isArray(instance.beacons) ? instance.beacons : []).filter(beacon=>Number(beacon.expiresAt || 0) > now);
    for(const beacon of instance.beacons){
      if(now < Number(beacon.nextTickAt || 0)) continue;
      healRickyBeaconTargets(group, beacon);
      beacon.nextTickAt = now + RICKY_HEAL_BEACON_INTERVAL_MS;
    }
  }

  function hasAliveRickyEncounter(instance, encounterId){
    return (instance?.enemies || []).some(enemy=>
      Number(enemy.hp || 0) > 0
      && enemy.rickyEncounterId === encounterId
    );
  }

  function openRickyBreach(group, now){
    const instance = group?.instance;
    const objective = instance?.objective;
    if(!isRickyPortalInstance(instance) || !objective || objective.breachOpen) return;
    objective.breachOpen=true;
    objective.stage="boss";
    objective.cinematicPlayed=true;
    if(!objective.bossSpawned){
      objective.bossSpawned=true;
      instance.enemies.push(createRickyBoss(now));
    }
    io.to(`instance:${instance.id}`).emit("portal:ricky-cinematic", {
      target:{x:RICKY_PORTAL_MAP.cage.x, y:RICKY_PORTAL_MAP.cage.y},
      message:"A l'aiiiideeee !!",
      durationMs:5600,
      at:now
    });
    emitInstance(group);
  }

  function updateRickyLeverObjectives(group, now){
    const instance = group?.instance;
    const objective = instance?.objective;
    if(!isRickyPortalInstance(instance) || !objective || instance.completed) return;
    const activePlayers = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});

    for(const lever of objective.levers || []){
      if(!lever.active || !lever.activationWaveSpawned || lever.activationWaveCleared) continue;
      if(hasAliveRickyEncounter(instance, `beacon_${lever.number}`)) continue;
      lever.activationWaveCleared=true;
      lever.activationWaveClearedAt=now;
      objective.stage = lever.number < 4 ? `route_${lever.number + 1}` : "final_gate";
    }

    const activeCount = (objective.levers || []).filter(lever=>lever.active).length;
    if(activeCount >= 4){
      const fourth = objective.levers?.[3];
      if(fourth?.activationWaveCleared && !objective.finalWaveSpawned){
        objective.finalWaveSpawned=true;
        objective.finalWaveSpawnedAt=now;
        objective.stage="final_gate";
        spawnRickyFinalGateWave(group);
        emitInstance(group);
      }
      if(objective.finalWaveSpawned
        && !objective.finalWaveCleared
        && !hasAliveRickyEncounter(instance, "final_gate")){
        objective.finalWaveCleared=true;
        objective.finalWaveClearedAt=now;
        openRickyBreach(group, now);
      }
      return;
    }

    for(const routeWave of objective.routeWaves || []){
      if(!routeWave.triggered && activePlayers.some(player=>
        isPointInRickyTriggerZone(player.state, routeWave)
      )){
        routeWave.triggered=true;
        routeWave.triggeredAt=now;
        spawnRickyRouteWave(group, routeWave);
        emitInstance(group);
      }
      if(routeWave.triggered
        && !routeWave.cleared
        && !hasAliveRickyEncounter(instance, `route_${routeWave.number}`)){
        routeWave.cleared=true;
        routeWave.clearedAt=now;
        const protectedLever = objective.levers?.[routeWave.number - 1];
        if(protectedLever) protectedLever.unlocked=true;
        emitInstance(group);
      }
    }

    const lever = objective.levers?.[activeCount];
    const routeWave = objective.routeWaves?.[activeCount];
    const previousCleared = activeCount === 0 || Boolean(objective.levers?.[activeCount - 1]?.activationWaveCleared);
    if(lever){
      lever.approached = activePlayers.some(player=>
        Math.hypot(Number(player.state?.x || 0) - lever.x, Number(player.state?.y || 0) - lever.y) <= RICKY_PORTAL_MAP.approachRadius
      );
    }
    if(routeWave?.cleared && lever && objective.stage === `route_${routeWave.number}`){
      objective.stage=`beacon_${lever.number}`;
    }

    if(!lever?.activation) return;
    const routeCleared = Boolean(routeWave?.cleared);
    const correctOrder = Number(lever.number || 0) === activeCount + 1;
    if(!routeCleared || !previousCleared || !correctOrder){
      lever.activation.startedAt=0;
      lever.activation.progress=0;
      lever.activation.blocked=true;
      return;
    }
    const activator = activePlayers.find(player=>player.id === lever.activation.playerId);
    if(!activator){
      lever.activation=null;
      return;
    }
    const state = activator.state;
    const distance = Math.hypot(Number(state.x || 0) - lever.x, Number(state.y || 0) - lever.y);
    if(distance > RICKY_PORTAL_MAP.interactionRadius){
      lever.activation.startedAt=0;
      lever.activation.progress=0;
      return;
    }
    lever.activation.blocked=false;
    const currentVitals = Math.max(0, Number(state.hp || 0)) + Math.max(0, Number(state.shield || 0));
    if(!lever.activation.startedAt){
      lever.activation.startedAt=now;
      lever.activation.startX=Number(state.x || 0);
      lever.activation.startY=Number(state.y || 0);
      lever.activation.lastVitals=currentVitals;
      lever.activation.progress=0;
      return;
    }
    const moved = Math.hypot(
      Number(state.x || 0) - Number(lever.activation.startX || 0),
      Number(state.y || 0) - Number(lever.activation.startY || 0)
    ) > RICKY_LEVER_MOVE_TOLERANCE;
    const damaged = currentVitals + .5 < Number(lever.activation.lastVitals ?? currentVitals);
    lever.activation.lastVitals=currentVitals;
    if(moved || damaged){
      lever.activation.startedAt=now;
      lever.activation.startX=Number(state.x || 0);
      lever.activation.startY=Number(state.y || 0);
      lever.activation.progress=0;
      lever.activation.resetReason=damaged ? "damage" : "movement";
      return;
    }
    const durationMs = RICKY_PORTAL_MAP.channelSeconds * 1000;
    lever.activation.progress=Math.max(0, Math.min(1, (now - lever.activation.startedAt) / durationMs));
    if(lever.activation.progress < 1) return;
    lever.active=true;
    lever.activatedAt=now;
    lever.activation=null;
    lever.activationWaveSpawned=true;
    objective.stage=`beacon_${lever.number}_combat`;
    spawnRickyBeaconWave(group, lever);
    emitInstance(group);
  }

  function updateRickyBossSummons(group, now){
    const instance = group?.instance;
    const objective = instance?.objective;
    if(!isRickyPortalInstance(instance) || instance.completed || objective?.stage !== "boss") return;
    const boss = (instance.enemies || []).find(enemy=>enemy.rickyBoss && Number(enemy.hp || 0) > 0);
    if(!boss) return;
    if(!getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true}).length) return;
    const nextSummonAt = Number(boss.rickyBossNextSummonAt || 0);
    if(!nextSummonAt){
      boss.rickyBossNextSummonAt = now + DEADLY_BOSS_SUMMON_INTERVAL_MS;
      return;
    }
    if(now < nextSummonAt) return;
    boss.rickyBossNextSummonAt = now + DEADLY_BOSS_SUMMON_INTERVAL_MS;
    const liveSummons = (instance.enemies || []).filter(enemy=>
      enemy.rickyBossSummon && Number(enemy.hp || 0) > 0
    ).length;
    const availableSlots = Math.max(0, DEADLY_BOSS_MAX_LIVE_SUMMONS - liveSummons);
    const spawnCount = Math.min(DEADLY_BOSS_SUMMON_BATCH_SIZE, availableSlots);
    if(spawnCount <= 0) return;
    const wave = Math.max(0, Number(boss.rickyBossSummonWave || 0)) + 1;
    boss.rickyBossSummonWave = wave;
    const spawned = Array.from({length:spawnCount}, (_, index)=>{
      const angle = (index / Math.max(1, spawnCount)) * Math.PI * 2 + Math.random() * .45;
      const distance = 430 + Math.random() * 210;
      return createDeadlyEnemy(pickDeadlyMinionKind(), {
        id:`RICKY-SUMMON-${wave}-${now.toString(36)}-${index}`,
        x:Number(boss.x || RICKY_PORTAL_MAP.boss.x) + Math.cos(angle) * distance,
        y:Number(boss.y || RICKY_PORTAL_MAP.boss.y) + Math.sin(angle) * distance,
        angle:angle + Math.PI / 2,
        summonedByBoss:true,
        now
      });
    });
    instance.enemies.push(...spawned);
    io.to(`instance:${instance.id}`).emit("portal:ricky-boss-summon", {
      bossId:boss.id,
      count:spawned.length,
      liveSummons:liveSummons + spawned.length,
      maxLiveSummons:DEADLY_BOSS_MAX_LIVE_SUMMONS,
      at:now
    });
    emitInstance(group);
  }

  function activateRickyLever(socket, leverId){
    const player = players.get(socket.id);
    const group = player?.groupId ? groups.get(player.groupId) : null;
    const instance = group?.instance;
    const leverDefinition = findRickyPortalLever(leverId);
    const lever = instance?.objective?.levers?.find(entry=>entry.id === leverDefinition?.id);
    if(!player || !isRickyPortalInstance(instance) || instance.completed || !lever){
      socket.emit("portal:error", {message:"Levier indisponible."});
      return false;
    }
    if(!getJoinedMemberIds(instance).includes(player.id)
      || String(player.state?.mapId || player.mapId || "") !== getInstanceMapId(instance)){
      socket.emit("portal:error", {message:"Tu dois etre dans le portail de Ricky."});
      return false;
    }
    if(lever.active){
      socket.emit("portal:error", {message:"Cette balise est deja activee."});
      return false;
    }
    const activeCount = (instance.objective?.levers || []).filter(entry=>entry.active).length;
    if(Number(lever.number || 0) !== activeCount + 1){
      socket.emit("portal:error", {message:`Active d'abord la balise ${activeCount + 1}.`});
      return false;
    }
    const routeWave = instance.objective?.routeWaves?.[activeCount];
    if(!routeWave?.cleared){
      socket.emit("portal:error", {message:`Detruis les ennemis qui protegent la balise ${lever.number}.`});
      return false;
    }
    if(activeCount > 0 && !instance.objective?.levers?.[activeCount - 1]?.activationWaveCleared){
      socket.emit("portal:error", {message:"Detruis d'abord les renforts de la balise precedente."});
      return false;
    }
    lever.activation={
      playerId:player.id,
      playerName:player.name || "Pilote",
      startedAt:0,
      progress:0,
      blocked:false
    };
    socket.emit("portal:ricky-lever", {ok:true, leverId:lever.id, at:Date.now()});
    emitInstance(group);
    return true;
  }

  function returnCompletedRickyPlayers(group, now){
    const instance = group?.instance;
    const objective = instance?.objective;
    if(!isRickyPortalInstance(instance) || !instance.completed || !objective?.exitAt || now < objective.exitAt) return;
    if(!Array.isArray(objective.returnedMemberIds)) objective.returnedMemberIds=[];
    for(const player of getRickyPortalPlayers(group, {requireMap:true, aliveOnly:false})){
      if(objective.returnedMemberIds.includes(player.id)) continue;
      const profile = profileManager.getProfileForPlayer?.(player);
      const firmId = normalizeFirmId(profile?.player?.firmId || player.account?.firmId || "astra");
      const mapId = String(getFirmMapId(firmId, 2));
      const point = RICKY_PORTAL_RETURN_POINTS[firmId] || RICKY_PORTAL_RETURN_POINTS.astra;
      player.state={
        ...player.state,
        mapId,
        x:point.x,
        y:point.y,
        vx:0,
        vy:0,
        enginePower:0,
        moveTarget:null,
        attackTargetId:"",
        attackAmmoId:"",
        attackWeaponClass:"",
        updatedAt:now
      };
      player.mapId=mapId;
      const memberSocket = io.sockets?.sockets?.get?.(player.id);
      if(memberSocket) setPlayerMap?.(memberSocket, mapId);
      profileManager.saveWorldSession?.({player, state:player.state, force:true});
      objective.returnedMemberIds.push(player.id);
      io.to(player.id).emit("coop:enemies", {
        instanceId:null,
        previousInstanceId:instance.id,
        spawn:null,
        portal:null,
        wave:0,
        completed:false,
        enemies:[]
      });
      io.to(player.id).emit("player:respawned", {
        session:{...player.state, source:"ricky-portal-complete"},
        message:"Ricky referme la breche derriere vous.",
        at:now
      });
    }
    const resolvedMemberIds = new Set([
      ...objective.returnedMemberIds,
      ...(instance.abandonedMemberIds || [])
    ]);
    if(getJoinedMemberIds(instance).every(memberId=>resolvedMemberIds.has(memberId))){
      resetGroupInstance?.(group.id, "ricky-portal-complete");
    }
  }

  function updateRickyCompanion(group, dt, now){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance) || instance.completed) return;
    updateRickyBeacons(group, now);
    const ally = instance.ally;
    if(!ally || ally.alive === false) return;
    if(Number(ally.hp || 0) <= 0){
      ally.alive = false;
      return;
    }
    const maxShield = Math.max(0, Number(ally.maxShield || 0));
    ally.shield = Math.min(
      maxShield,
      Math.max(0, Number(ally.shield || 0))
        + Math.max(0, Number(ally.shieldRegenPerSecond || 0)) * Math.max(0, Number(dt || 0))
    );
    const leader = getRickyFollowTarget(group);
    if(!leader?.state){
      ally.vx = 0;
      ally.vy = 0;
      return;
    }
    const leaderX = Number(leader.state.x || 0);
    const leaderY = Number(leader.state.y || 0);
    const target = findRickyTarget(ally, leader, instance.enemies);
    const leaderDistance = Math.hypot(leaderX - ally.x, leaderY - ally.y);
    if(leaderDistance > Number(ally.maxLeaderDistance || 720)){
      moveRickyAlly(ally, leaderX - 150, leaderY + 90, dt);
      return;
    }
    if(target){
      const targetDistance = Math.hypot(Number(target.x || 0) - ally.x, Number(target.y || 0) - ally.y);
      if(targetDistance > Number(ally.attackRange || 600) * .82){
        moveRickyAlly(ally, target.x, target.y, dt);
      }else{
        ally.vx = 0;
        ally.vy = 0;
        ally.angle = Math.atan2(Number(target.y || 0) - ally.y, Number(target.x || 0) - ally.x) + Math.PI / 2;
      }
      if(targetDistance <= Number(ally.attackRange || 600) && now >= Number(ally.nextLaserAt || 0)){
        ally.nextLaserAt = now + Number(ally.laserCooldownMs || 1400);
        damagePortalEnemyByRicky(group, target, randomBetween(ally.laserDamageMin, ally.laserDamageMax), "laser", now);
      }
      if(targetDistance <= Number(ally.attackRange || 600) && now >= Number(ally.nextRocketAt || 0)){
        ally.nextRocketAt = now + Number(ally.rocketCooldownMs || 4600);
        damagePortalEnemyByRicky(group, target, randomBetween(ally.rocketDamageMin, ally.rocketDamageMax), "rocket", now);
      }
      return;
    }
    if(leaderDistance > Number(ally.followDistance || 260)){
      moveRickyAlly(ally, leaderX - 160, leaderY + 90, dt);
    }else{
      ally.vx = 0;
      ally.vy = 0;
    }
  }

  function updateRickyCompanions(dt, now = Date.now()){
    for(const group of groups.values()){
      updateRickyLeverObjectives(group, now);
      updateRickyBossSummons(group, now);
      updateRickyCompanion(group, dt, now);
      returnCompletedRickyPlayers(group, now);
    }
  }

  function activateRickyHealBeacon(socket){
    const player = players.get(socket.id);
    const group = player?.groupId ? groups.get(player.groupId) : null;
    const instance = group?.instance;
    if(!player || !isRickyPortalInstance(instance) || instance.completed){
      socket.emit("portal:error", {message:"Balise Ricky indisponible."});
      return false;
    }
    if(!getJoinedMemberIds(instance).includes(player.id)){
      socket.emit("portal:error", {message:"Tu dois etre dans le portail de Ricky."});
      return false;
    }
    if(instance.abandonedMemberIds?.includes(player.id) || String(player.state?.mapId || player.mapId || "") !== getInstanceMapId(instance)){
      socket.emit("portal:error", {message:"Tu dois etre dans le portail de Ricky."});
      return false;
    }
    const ally = instance.ally;
    if(!ally || ally.alive === false || Number(ally.hp || 0) <= 0){
      socket.emit("portal:error", {message:"Ricky n'est plus en etat de poser une balise."});
      return false;
    }
    const now = Date.now();
    if(now < Number(ally.healCooldownUntil || 0)){
      socket.emit("portal:error", {message:`Balise en recharge : ${Math.ceil((ally.healCooldownUntil - now) / 1000)}s.`});
      return false;
    }
    ally.healCooldownUntil = now + RICKY_HEAL_COOLDOWN_MS;
    const beacon = {
      id:`RB-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      x:Number(player.state?.x || ally.x || 0),
      y:Number(player.state?.y || ally.y || 0),
      radius:RICKY_HEAL_BEACON_RADIUS,
      heal:RICKY_HEAL_BEACON_AMOUNT,
      nextTickAt:now,
      expiresAt:now + RICKY_HEAL_BEACON_DURATION_MS
    };
    if(!Array.isArray(instance.beacons)) instance.beacons = [];
    instance.beacons.push(beacon);
    io.to(`instance:${instance.id}`).emit("portal:ricky-heal", {beacon, cooldown:RICKY_HEAL_COOLDOWN_MS / 1000, at:now});
    healRickyBeaconTargets(group, beacon);
    emitInstance(group);
    return true;
  }

  return {
    activateRickyHealBeacon,
    activateRickyLever,
    handleRickyEnemyDeath,
    updateRickyCompanions
  };
}
