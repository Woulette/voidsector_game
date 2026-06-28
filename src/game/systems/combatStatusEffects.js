export function compactCombatListInPlace(list, keep, maxLength = 0){
  if(!Array.isArray(list)) return [];
  let write = 0;
  for(let read = 0; read < list.length; read += 1){
    const item = list[read];
    if(!keep(item)) continue;
    list[write] = item;
    write += 1;
  }
  list.length = write;
  if(maxLength > 0 && list.length > maxLength) list.splice(0, list.length - maxLength);
  return list;
}

const STATUS_UI_REFRESH_SECONDS = .2;

function nextStatusUiState(previous, remaining){
  if(previous && Number(previous.remaining || 0) > 0){
    return {
      uiT:Number(previous.uiT || 0),
      uiSecond:Number(previous.uiSecond || Math.ceil(Math.max(0, remaining)))
    };
  }
  return {
    uiT:STATUS_UI_REFRESH_SECONDS,
    uiSecond:Math.ceil(Math.max(0, remaining))
  };
}

function shouldRefreshStatusUi(effect, dt){
  if(!effect) return false;
  effect.uiT = Math.max(0, Number(effect.uiT || 0) - dt);
  const second = Math.ceil(Math.max(0, Number(effect.remaining || 0)));
  if(effect.uiT > 0 && effect.uiSecond === second) return false;
  effect.uiT = STATUS_UI_REFRESH_SECONDS;
  effect.uiSecond = second;
  return true;
}

export function createCombatStatusEffectSystem({
  getState,
  setState,
  updatePoisonStatus,
  updateSlowStatus,
  pushDamageText,
  handlePlayerDeath,
  onPlayerHpLost
}){
  function clearPoison(){
    const {player} = getState();
    if(player) player.poisonEffect = null;
    updatePoisonStatus(null);
  }

  function clearSlow(){
    const {player} = getState();
    if(player) player.slowEffect = null;
    updateSlowStatus(null);
  }

  function applyPlayerPoison(effect){
    const {player} = getState();
    if(!player || effect?.type !== "poison") return;
    const duration = Number(effect.duration || 0);
    const previous = player.poisonEffect;
    const remaining = Number(effect.remaining ?? duration);
    const uiState = nextStatusUiState(previous, remaining);
    player.poisonEffect = {
      damage:Number(effect.damage || 0),
      interval:Number(effect.interval || 1),
      duration,
      remaining,
      tick:previous && Number(previous.remaining || 0) > 0
        ? Number(previous.tick || effect.interval || 1)
        : Number(effect.interval || 1),
      pulseT:previous && Number(previous.remaining || 0) > 0
        ? Math.max(0, Number(previous.pulseT || 0))
        : 0,
      ...uiState,
      serverAuthoritative:Boolean(effect.serverAuthoritative)
    };
    if(!previous || shouldRefreshStatusUi(player.poisonEffect, 0)){
      updatePoisonStatus(player.poisonEffect);
    }
  }

  function updatePlayerPoison(dt){
    const {player, particles} = getState();
    if(!player) return;
    const effect = player.poisonEffect;
    if(!effect) return;
    if(Number(effect.remaining || 0) <= 0){
      player.poisonEffect = null;
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
      const dealt = effect.serverAuthoritative ? 0 : Math.max(0, Math.round(effect.damage || 0));
      if(dealt > 0){
        const hpBefore = Number(player.hp || 0);
        player.hp -= dealt;
        onPlayerHpLost?.(Math.max(0, hpBefore - Number(player.hp || 0)));
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
    if(effect.remaining <= 0){
      player.poisonEffect = null;
      updatePoisonStatus(null);
      return;
    }
    if(shouldRefreshStatusUi(effect, dt)) updatePoisonStatus(effect);
  }

  function applyPlayerSlow(effect){
    const {player} = getState();
    if(!player || effect?.type !== "slow") return;
    const duration = Number(effect.duration || 0);
    const previous = player.slowEffect;
    const remaining = Number(effect.remaining ?? duration);
    const uiState = nextStatusUiState(previous, remaining);
    player.slowEffect = {
      amount:Math.max(0, Number(effect.amount || 0)),
      duration,
      remaining,
      pulseT:previous && Number(previous.remaining || 0) > 0
        ? Math.max(0, Number(previous.pulseT || 0))
        : 0,
      ...uiState,
      serverAuthoritative:Boolean(effect.serverAuthoritative)
    };
    if(!previous || shouldRefreshStatusUi(player.slowEffect, 0)){
      updateSlowStatus(player.slowEffect);
    }
  }

  function updatePlayerSlow(dt){
    const {player, particles} = getState();
    if(!player) return;
    const effect = player.slowEffect;
    if(!effect) return;
    if(Number(effect.remaining || 0) <= 0){
      player.slowEffect = null;
      updateSlowStatus(null);
      return;
    }
    effect.remaining -= dt;
    effect.pulseT = Number(effect.pulseT || 0) - dt;
    if(effect.pulseT <= 0){
      effect.pulseT = .1;
      const angle = Math.random() * Math.PI * 2;
      const radius = 22 + Math.random() * 32;
      particles.push({
        x:player.x + Math.cos(angle) * radius,
        y:player.y + Math.sin(angle) * radius,
        vx:-Math.cos(angle) * 8,
        vy:-Math.sin(angle) * 8,
        life:.52,
        max:.52,
        size:3 + Math.random() * 5,
        color:"rgba(56,189,248,.68)"
      });
    }
    if(effect.remaining <= 0){
      player.slowEffect = null;
      updateSlowStatus(null);
      return;
    }
    if(shouldRefreshStatusUi(effect, dt)) updateSlowStatus(effect);
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
      particles:compactCombatListInPlace(particles, p=>p.life > 0, 240),
      impactEffects:compactCombatListInPlace(impactEffects, effect=>effect.life > 0 || effect.delay > 0, 96),
      damageTexts:compactCombatListInPlace(damageTexts, text=>text.life > 0, 80)
    });
  }

  return {
    clearPoison,
    clearSlow,
    applyPlayerPoison,
    applyPlayerSlow,
    updatePlayerPoison,
    updatePlayerSlow,
    updateParticles
  };
}
