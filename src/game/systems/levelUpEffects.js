function readCombatLevel(state = {}){
  const raw = state.store?.state?.player?.level ?? state.player?.level ?? 1;
  const level = Math.floor(Number(raw || 1));
  return Math.max(1, Number.isFinite(level) ? level : 1);
}

export function spawnLevelUpEffects({state, level, previousLevel = level - 1, random = Math.random} = {}){
  const player = state?.player;
  const particles = state?.particles;
  const damageTexts = state?.damageTexts;
  if(!player || !Array.isArray(particles) || !Array.isArray(damageTexts)) return false;
  const x = Number(player.x || 0);
  const y = Number(player.y || 0);
  const radius = Math.max(38, Number(player.radius || 48));
  const levelGain = Math.max(1, Number(level || 1) - Number(previousLevel || 1));
  const sparkCount = Math.min(34, 22 + levelGain * 3);

  particles.push({
    kind:"levelUpPulse",
    x,
    y,
    followPlayer:true,
    offsetX:0,
    offsetY:0,
    life:.82,
    max:.82,
    size:radius * 3.25,
    color:"rgba(125,211,252,.86)"
  });
  particles.push({
    kind:"levelUpAura",
    x,
    y,
    followPlayer:true,
    offsetX:0,
    offsetY:0,
    life:.68,
    max:.68,
    size:radius * 1.8,
    color:"rgba(255,255,255,.62)"
  });

  for(let index = 0; index < sparkCount; index += 1){
    const angle = random() * Math.PI * 2;
    const distance = radius * (.25 + random() * .92);
    const lift = 48 + random() * 92;
    const speed = 20 + random() * 44;
    const life = .56 + random() * .38;
    particles.push({
      kind:"levelUpSpark",
      x:x + Math.cos(angle) * distance,
      y:y + Math.sin(angle) * distance,
      vx:Math.cos(angle) * speed * .35,
      vy:-lift + Math.sin(angle) * speed * .18,
      life,
      max:life,
      size:2.6 + random() * 4.8,
      color:index % 3 === 0 ? "rgba(255,255,255,.92)" : "rgba(56,189,248,.82)"
    });
  }

  damageTexts.push({
    kind:"levelUp",
    x,
    y:y - radius - 36,
    value:`NIVEAU ${Math.max(1, Math.floor(Number(level || 1)))}`,
    life:1.38,
    max:1.38,
    vx:0,
    vy:-26,
    wobble:random() * Math.PI * 2,
    color:"rgba(236,254,255,",
    shadowColor:"rgba(56,189,248,.96)"
  });
  return true;
}

export function createLevelUpEffectSystem({getState, random = Math.random} = {}){
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
    return spawnLevelUpEffects({state, level, previousLevel, random});
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
