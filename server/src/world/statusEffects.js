function normalizePoison(effect = {}){
  return {
    type:"poison",
    damage:Math.max(1, Math.round(Number(effect.damage || 0))),
    intervalMs:Math.max(250, Number(effect.interval || 1) * 1000),
    durationMs:Math.max(250, Number(effect.duration || 0) * 1000)
  };
}

export function createWorldStatusEffectManager({io, players, presence, profileManager, emitProfileSync}){
  function emitQuestHpLoss(player, hpLost, now){
    if(hpLost <= 0) return;
    const questResult = profileManager.applyQuestAction({
      player,
      action:{kind:"hp-loss", amount:hpLost}
    });
    emitProfileSync?.(player, questResult.profile);
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

  function updateStatusEffects(now = Date.now()){
    for(const player of players.values()){
      const poison = player?.statusEffects?.poison;
      if(poison) tickPoison(player, poison, now);
    }
  }

  function syncPlayerStatusEffects(player, now = Date.now()){
    const poison = player?.statusEffects?.poison;
    if(poison && now < Number(poison.expiresAt || 0)) emitPoisonState(player, poison, true, now);
  }

  return {
    applyEnemyOnHitEffect,
    syncPlayerStatusEffects,
    updateStatusEffects
  };
}
