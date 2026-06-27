const MIN_PROJECTILE_TRAVEL_SECONDS = 0.11;
const MAX_PROJECTILE_TRAVEL_SECONDS = 1.15;

export function getEnemyProjectileTravelTime({fromX, fromY, toX, toY, projectileSpeed}){
  const distance = Math.hypot(Number(toX || 0) - Number(fromX || 0), Number(toY || 0) - Number(fromY || 0));
  const speed = Math.max(120, Number(projectileSpeed || 600));
  return Math.max(MIN_PROJECTILE_TRAVEL_SECONDS, Math.min(MAX_PROJECTILE_TRAVEL_SECONDS, distance / speed + 0.06));
}

function applyDamageToNpcState(state, amount){
  if(!state) return 0;
  let incoming = Math.max(0, Number(amount || 0));
  const hpBeforeDamage = Number(state.hp || 0);
  if(Number(state.shield || 0) > 0){
    const absorbed = Math.min(Number(state.shield || 0), incoming * 0.8);
    state.shield = Math.max(0, Number(state.shield || 0) - absorbed);
    incoming -= absorbed;
  }
  if(incoming > 0) state.hp = Math.max(0, Number(state.hp || 0) - incoming);
  if(Number(state.hp || 0) <= 0) state.alive = false;
  return Math.max(0, hpBeforeDamage - Number(state.hp || 0));
}

export function createEnemyAttackManager({io, players, presence, profileManager, emitProfileSync, applyEnemyOnHitEffect}){
  const pendingAttacks = [];

  function emitQuestHpLoss(target, hpLost, now){
    if(hpLost <= 0) return;
    const questResult = profileManager.applyQuestAction({
      player:target,
      action:{kind:"hp-loss", amount:hpLost}
    });
    if(questResult?.failed?.length) emitProfileSync?.(target, questResult.profile);
    if(questResult.updates?.length || questResult.failed?.length){
      io.to(target.id).emit("quest:fail-progress", {
        updates:questResult.updates || [],
        failed:questResult.failed || [],
        at:now
      });
    }
  }

  function launchEnemyAttack({enemy, map, target, amount, now = Date.now(), attackStyle}){
    if(!target?.npcTarget) presence.markCombat(target, "attaque ennemi");
    enemy.attackAnimUntil = now + 320;
    const fromX = Number(enemy.x || 0);
    const fromY = Number(enemy.y || 0);
    const toX = Number(target.state?.x || 0);
    const toY = Number(target.state?.y || 0);
    const projectileSpeed = Number(enemy.projectileSpeed || 600);
    const travelTime = getEnemyProjectileTravelTime({fromX, fromY, toX, toY, projectileSpeed});
    const impactAt = now + travelTime * 1000;
    const enemySnapshot = {
      id:enemy.id,
      onHitEffect:enemy.onHitEffect
    };

    pendingAttacks.push({
      amount,
      enemy:enemySnapshot,
      fromX,
      fromY,
      impactAt,
      mapId:map.id,
      room:map.room || `map:${map.id}`,
      targetId:target.id,
      targetNpc:Boolean(target.npcTarget),
      targetRef:target.npcTarget ? target : null,
      toX,
      toY
    });

    const attackRecipient = target.npcTarget ? (map.room || `map:${map.id}`) : target.id;
    io.to(attackRecipient).emit("enemy:attack", {
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
      projectileSpeed,
      travelTime,
      impactAt,
      enemyKind:enemy.kind,
      attackStyle,
      life:.22
    });
  }

  function targetIsValidForPlayerAttack(attack, target, now){
    const targetIsActive = typeof presence.isActiveForWorld === "function"
      ? presence.isActiveForWorld(target, now)
      : target?.connected !== false;
    return Boolean(
      target?.state
      && targetIsActive
      && String(target.mapId ?? "") === String(attack.mapId ?? "")
      && Number(target.state.hp || 0) > 0
    );
  }

  function resolveNpcAttack(attack, target, now){
    if(!target?.state || Number(target.state.hp || 0) <= 0) return;
    const hpLost = applyDamageToNpcState(target.state, attack.amount);
    io.to(attack.room || `map:${attack.mapId}`).emit("npc:damage", {
      targetId:target.id,
      enemyId:attack.enemy.id,
      mapId:attack.mapId,
      amount:attack.amount,
      hp:Number(target.state.hp || 0),
      maxHp:Number(target.state.maxHp || 0),
      shield:Number(target.state.shield || 0),
      maxShield:Number(target.state.maxShield || 0),
      hpLost,
      at:now
    });
  }

  function strongestOnHitEnemy(attacks){
    let strongest = null;
    for(const attack of attacks){
      const effect = attack?.enemy?.onHitEffect;
      if(!effect) continue;
      if(!strongest || Number(effect.damage || 0) > Number(strongest.onHitEffect?.damage || 0)){
        strongest = attack.enemy;
      }
    }
    return strongest;
  }

  function resolvePlayerAttackBatch(target, attacks, now){
    if(!targetIsValidForPlayerAttack(attacks[0], target, now)) return;
    const amount = attacks.reduce((sum, attack)=>sum + Math.max(0, Number(attack.amount || 0)), 0);
    if(amount <= 0) return;
    presence.markCombat(target, "impact ennemi");
    const hpLost = presence.applyDamageToPlayerState(target, amount, now);
    emitQuestHpLoss(target, hpLost, now);
    profileManager.saveWorldSession({player:target, state:target.state, force:Number(target.state.hp || 0) <= 0});
    io.to(target.id).emit("player:damage", {
      enemyId:attacks.length === 1 ? attacks[0].enemy.id : "enemy:batch",
      sourceEnemyIds:attacks.map(attack=>attack.enemy.id),
      attackCount:attacks.length,
      mapId:attacks[0].mapId,
      amount,
      hp:Number(target.state.hp || 0),
      maxHp:Number(target.state.maxHp || 0),
      shield:Number(target.state.shield || 0),
      maxShield:Number(target.state.maxShield || 0),
      fromX:attacks[0].fromX,
      fromY:attacks[0].fromY,
      toX:target.state?.x ?? attacks[0].toX,
      toY:target.state?.y ?? attacks[0].toY,
      at:now
    });
    const onHitEnemy = strongestOnHitEnemy(attacks);
    if(onHitEnemy) applyEnemyOnHitEffect?.(onHitEnemy, target, now);
  }

  function resolveEnemyAttack(attack, now){
    const target = players.get(attack.targetId) || attack.targetRef;
    if(target?.npcTarget){
      resolveNpcAttack(attack, target, now);
      return;
    }
    if(!targetIsValidForPlayerAttack(attack, target, now)) return;
    resolvePlayerAttackBatch(target, [attack], now);
  }

  function updatePendingEnemyAttacks(now = Date.now()){
    const playerBatches = new Map();
    for(let index = pendingAttacks.length - 1; index >= 0; index -= 1){
      const attack = pendingAttacks[index];
      if(now < attack.impactAt) continue;
      pendingAttacks.splice(index, 1);
      const target = players.get(attack.targetId) || attack.targetRef;
      if(target?.npcTarget){
        resolveNpcAttack(attack, target, now);
        continue;
      }
      if(!targetIsValidForPlayerAttack(attack, target, now)) continue;
      const key = `${attack.targetId}:${attack.mapId}`;
      const batch = playerBatches.get(key) || {target, attacks:[]};
      batch.attacks.push(attack);
      playerBatches.set(key, batch);
    }
    for(const batch of playerBatches.values()){
      resolvePlayerAttackBatch(batch.target, batch.attacks, now);
    }
  }

  return {
    launchEnemyAttack,
    updatePendingEnemyAttacks
  };
}
