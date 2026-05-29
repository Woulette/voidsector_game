export function createCombatStatusEffectSystem({
  getState,
  setState,
  updatePoisonStatus,
  pushDamageText,
  handlePlayerDeath
}){
  function clearPoison(){
    const {player} = getState();
    if(player) player.poisonEffect = null;
    updatePoisonStatus(null);
  }

  function applyPlayerPoison(effect){
    const {player} = getState();
    if(!player || effect?.type !== "poison") return;
    const duration = Number(effect.duration || 0);
    player.poisonEffect = {
      damage:Number(effect.damage || 0),
      interval:Number(effect.interval || 1),
      duration,
      remaining:duration,
      tick:Number(effect.interval || 1),
      pulseT:0
    };
    updatePoisonStatus(player.poisonEffect);
  }

  function updatePlayerPoison(dt){
    const {player, particles} = getState();
    if(!player) return;
    const effect = player.poisonEffect;
    if(!effect?.remaining){
      updatePoisonStatus(null);
      return;
    }
    effect.remaining -= dt;
    effect.tick -= dt;
    effect.pulseT = (effect.pulseT || 0) - dt;
    if(effect.pulseT <= 0){
      effect.pulseT = .12;
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 28;
      particles.push({
        x:player.x + Math.cos(angle) * radius,
        y:player.y + Math.sin(angle) * radius,
        vx:Math.cos(angle) * 12,
        vy:Math.sin(angle) * 12,
        life:.48,
        max:.48,
        size:4 + Math.random() * 5,
        color:"rgba(74,222,128,.62)"
      });
    }
    while(effect.tick <= 0 && effect.remaining > 0){
      effect.tick += effect.interval;
      const dealt = Math.max(0, Math.round(effect.damage || 0));
      if(dealt > 0){
        player.hp -= dealt;
        player.secondsSinceDamage = 0;
        pushDamageText({
          x:player.x,
          y:player.y - 68,
          value:`-${dealt}`,
          color:"rgba(74,222,128,",
          shadowColor:"rgba(34,197,94,.78)"
        });
        if(player.hp <= 0){
          handlePlayerDeath();
          return;
        }
      }
    }
    if(effect.remaining <= 0) player.poisonEffect = null;
    updatePoisonStatus(player.poisonEffect);
  }

  function updateParticles(dt){
    const {player, particles, impactEffects, damageTexts} = getState();
    for(const p of particles){
      p.life -= dt;
      if(p.followPlayer && player){
        p.offsetX = Number(p.offsetX || 0) + (p.vx || 0) * dt;
        p.offsetY = Number(p.offsetY || 0) + (p.vy || 0) * dt;
        p.x = player.x + p.offsetX;
        p.y = player.y + p.offsetY;
      }else{
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
      }
    }
    for(const effect of impactEffects){
      if(effect.delay > 0) effect.delay -= dt;
      else effect.life -= dt;
    }
    for(const text of damageTexts){
      text.life -= dt;
      text.x += (text.vx || 0) * dt;
      text.y += (text.vy || -38) * dt;
      text.vy = (text.vy || -38) + 42 * dt;
    }
    setState({
      particles:particles.filter(p=>p.life > 0),
      impactEffects:impactEffects.filter(effect=>effect.life > 0 || effect.delay > 0),
      damageTexts:damageTexts.filter(text=>text.life > 0)
    });
  }

  return {
    clearPoison,
    applyPlayerPoison,
    updatePlayerPoison,
    updateParticles
  };
}
