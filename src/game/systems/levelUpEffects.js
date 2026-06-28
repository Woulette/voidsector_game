function readCombatLevel(state = {}){
  const raw = state.store?.state?.player?.level ?? state.player?.level ?? 1;
  const level = Math.floor(Number(raw || 1));
  return Math.max(1, Number.isFinite(level) ? level : 1);
}

export function spawnLevelUpEffects({state, level, previousLevel = level - 1, random = Math.random} = {}){
  const player = state?.player;
  const particles = state?.particles;
  if(!player || !Array.isArray(particles)) return false;
  const x = Number(player.x || 0);
  const y = Number(player.y || 0);
  const radius = Math.max(38, Number(player.radius || 48));
  const levelGain = Math.max(1, Number(level || 1) - Number(previousLevel || 1));
  const sparkCount = Math.min(34, 22 + levelGain * 3);
  const displayLevel = Math.max(1, Math.floor(Number(level || 1)));
  const starOffsetY = -radius - 66;

  particles.push({
    kind:"levelUpAura",
    x,
    y,
    followPlayer:true,
    offsetX:0,
    offsetY:0,
    life:2.55,
    max:2.55,
    size:radius * 2.08,
    color:"rgba(255,255,255,.7)"
  });
  particles.push({
    kind:"levelUpHalo",
    x,
    y,
    followPlayer:true,
    offsetX:0,
    offsetY:0,
    life:2.18,
    max:2.18,
    size:radius * 2.4,
    color:"rgba(250,204,21,.72)"
  });

  for(let index = 0; index < sparkCount; index += 1){
    const angle = random() * Math.PI * 2;
    const onShip = index % 4 === 0;
    const distance = onShip
      ? radius * (.08 + random() * .42)
      : radius * (.35 + random() * 1.12);
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    const lift = 18 + random() * 44;
    const drift = 8 + random() * 24;
    const life = onShip ? 1.18 + random() * .62 : 1.05 + random() * .72;
    particles.push({
      kind:"levelUpSpark",
      x:x + offsetX,
      y:y + offsetY,
      followPlayer:true,
      offsetX,
      offsetY,
      vx:Math.cos(angle) * drift * .34,
      vy:-lift + Math.sin(angle) * drift * .16,
      life,
      max:life,
      size:(onShip ? 2.8 : 2.2) + random() * 5.4,
      angle,
      color:index % 5 === 0
        ? "rgba(255,255,255,.96)"
        : index % 3 === 0
          ? "rgba(250,204,21,.88)"
          : "rgba(125,211,252,.86)"
    });
  }

  particles.push({
    kind:"levelUpStar",
    x,
    y:y + starOffsetY,
    followPlayer:true,
    offsetX:0,
    offsetY:starOffsetY,
    level:displayLevel,
    life:3.1,
    max:3.1,
    size:Math.max(66, radius * 1.38),
    vx:0,
    vy:0,
    rotation:(random() - .5) * .55,
    spinEnd:.58,
    driftStart:1.72,
    driftSpeed:34,
    color:"rgba(250,204,21,.95)"
  });
  return true;
}

export function createLevelUpEffectSystem({getState, random = Math.random, onLevelUp = null} = {}){
  let lastLevel = 0;

  function reset(level = readCombatLevel(getState?.())){
    lastLevel = readCombatLevel({store:{state:{player:{level}}}});
    return lastLevel;
  }

  function update(){
    const state = getState?.();
    const level = readCombatLevel(state);
    if(lastLevel <= 0){
      lastLevel = level;
      return false;
    }
    if(level < lastLevel){
      lastLevel = level;
      return false;
    }
    if(level === lastLevel) return false;
    const previousLevel = lastLevel;
    lastLevel = level;
    const spawned = spawnLevelUpEffects({state, level, previousLevel, random});
    if(spawned) onLevelUp?.({level, previousLevel, at:Date.now()});
    return spawned;
  }

  return {
    reset,
    update,
    spawn:(level, previousLevel = lastLevel || level - 1)=>spawnLevelUpEffects({
      state:getState?.(),
      level,
      previousLevel,
      random
    }),
    getLastLevel:()=>lastLevel
  };
}
