function normalizePoison(effect = {}){
  return {
    type:"poison",
    damage:Math.max(1, Math.round(Number(effect.damage || 0))),
    intervalMs:Math.max(250, Number(effect.interval || 1) * 1000),
    durationMs:Math.max(250, Number(effect.duration || 0) * 1000)
  };
}

function normalizeSlow(effect = {}){
  return {
    type:"slow",
    amount:Math.max(1, Math.round(Number(effect.amount || 0))),
    durationMs:Math.max(250, Number(effect.duration || 0) * 1000),
    radius:Math.max(0, Number(effect.radius || 0))
  };
}

export function createWorldStatusEffectManager({io, players, presence, profileManager, emitProfileSync}){
  function emitQuestHpLoss(player, hpLost, now){
    if(hpLost <= 0) return;
    const questResult = profileManager.applyQuestAction({
      player,
      action:{kind:"hp-loss", amount:hpLost}
    });
    if(questResult?.failed?.length) emitProfileSync?.(player, questResult.profile);
    if(questResult.updates?.length || questResult.failed?.length){
      io.to(player.id).emit("quest:fail-progress", {
        updates:questResult.updates || [],
        failed:questResult.failed || [],
        at:now
      });
    }
  }

  function emitPoisonState(player, poison, active, now){
    io.to(player.id).emit("player:status-effect", {
      type:"poison",
      active,
      damage:poison.damage,
      interval:poison.intervalMs / 1000,
      duration:poison.durationMs / 1000,
      remaining:active ? Math.max(0, (poison.expiresAt - now) / 1000) : 0,
      sourceId:poison.sourceId,
      at:now
    });
  }

  function emitSlowState(player, slow, active, now){
    io.to(player.id).emit("player:status-effect", {
      type:"slow",
      active,
      amount:slow.amount,
      duration:slow.durationMs / 1000,
      remaining:active ? Math.max(0, (slow.expiresAt - now) / 1000) : 0,
      sourceId:slow.sourceId,
      originX:slow.originX,
      originY:slow.originY,
      radius:slow.radius,
      at:now
    });
  }

  function applySlowToPlayer(player, enemy, effect, now){
    if(!player?.state || Number(player.state.hp || 0) <= 0) return false;
    const current = player.statusEffects?.slow;
    if(!player.statusEffects || typeof player.statusEffects !== "object") player.statusEffects = {};
    player.statusEffects.slow = {
      ...effect,
      amount:Math.max(effect.amount, Number(current?.amount || 0)),
      durationMs:Math.max(effect.durationMs, Number(current?.durationMs || 0)),
      sourceId:enemy.id,
      originX:Number(enemy.x || 0),
      originY:Number(enemy.y || 0),
      appliedAt:now,
      expiresAt:now + effect.durationMs
    };
    emitSlowState(player, player.statusEffects.slow, true, now);
    return true;
  }

  function applyEnemyDeathEffect(mapId, enemy, now = Date.now()){
    if(enemy?.deathEffect?.type !== "slow") return [];
    const effect = normalizeSlow(enemy.deathEffect);
    const affected = [];
    for(const player of players.values()){
      if(String(player?.mapId ?? player?.state?.mapId ?? "") !== String(mapId ?? "")) continue;
      const distance = Math.hypot(
        Number(player.state?.x || 0) - Number(enemy.x || 0),
        Number(player.state?.y || 0) - Number(enemy.y || 0)
      );
      if(distance > effect.radius) continue;
      if(applySlowToPlayer(player, enemy, effect, now)) affected.push(player.id);
    }
    return affected;
  }

  function applyEnemyOnHitEffect(enemy, target, now = Date.now()){
    if(!target?.state || Number(target.state.hp || 0) <= 0) return false;
    if(enemy?.onHitEffect?.type !== "poison") return false;
    const poison = normalizePoison(enemy.onHitEffect);
    const current = target.statusEffects?.poison;
    if(!target.statusEffects || typeof target.statusEffects !== "object") target.statusEffects = {};
    target.statusEffects.poison = {
      ...poison,
      damage:Math.max(poison.damage, Number(current?.damage || 0)),
      durationMs:Math.max(poison.durationMs, Number(current?.durationMs || 0)),
      sourceId:enemy.id,
      appliedAt:now,
      nextTickAt:current && now < Number(current.expiresAt || 0)
        ? Math.max(now, Number(current.nextTickAt || now + poison.intervalMs))
        : now + poison.intervalMs,
      expiresAt:now + poison.durationMs
    };
    emitPoisonState(target, target.statusEffects.poison, true, now);
    return true;
  }

  function tickPoison(player, poison, now){
    if(!player?.state || Number(player.state.hp || 0) <= 0 || now >= Number(poison.expiresAt || 0)){
      emitPoisonState(player, poison, false, now);
      delete player.statusEffects.poison;
      return;
    }
    let applied = false;
    while(now >= Number(poison.nextTickAt || 0) && poison.nextTickAt <= poison.expiresAt && Number(player.state.hp || 0) > 0){
      const hpBefore = Math.max(0, Number(player.state.hp || 0));
      player.state.hp = Math.max(0, hpBefore - poison.damage);
      player.state.updatedAt = now;
      presence.markDamage(player, now);
      player.state.repairBotActive = false;
      player.serverRepairBotTick = 0;
      poison.nextTickAt += poison.intervalMs;
      const hpLost = Math.max(0, hpBefore - Number(player.state.hp || 0));
      if(hpLost <= 0) continue;
      applied = true;
      presence.markCombat(player, "poison");
      emitQuestHpLoss(player, hpLost, now);
      io.to(player.id).emit("player:damage", {
        enemyId:poison.sourceId,
        mapId:player.mapId,
        amount:hpLost,
        hp:Number(player.state.hp || 0),
        maxHp:Number(player.state.maxHp || 0),
        shield:Number(player.state.shield || 0),
        maxShield:Number(player.state.maxShield || 0),
        damageType:"poison",
        at:now
      });
    }
    if(applied) profileManager.saveWorldSession({player, state:player.state, force:Number(player.state.hp || 0) <= 0});
  }

  function tickSlow(player, slow, now){
    if(!player?.state || Number(player.state.hp || 0) <= 0 || now >= Number(slow.expiresAt || 0)){
      emitSlowState(player, slow, false, now);
      delete player.statusEffects.slow;
    }
  }

  function updateStatusEffects(now = Date.now()){
    for(const player of players.values()){
      const poison = player?.statusEffects?.poison;
      if(poison) tickPoison(player, poison, now);
      const slow = player?.statusEffects?.slow;
      if(slow) tickSlow(player, slow, now);
    }
  }

  function syncPlayerStatusEffects(player, now = Date.now()){
    const poison = player?.statusEffects?.poison;
    if(poison && now < Number(poison.expiresAt || 0)) emitPoisonState(player, poison, true, now);
    const slow = player?.statusEffects?.slow;
    if(slow && now < Number(slow.expiresAt || 0)) emitSlowState(player, slow, true, now);
  }

  return {
    applyEnemyOnHitEffect,
    applyEnemyDeathEffect,
    syncPlayerStatusEffects,
    updateStatusEffects
  };
}
