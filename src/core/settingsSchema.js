export const GRAPHICS_EFFECT_GROUPS = [
  {
    id:"ship",
    label:"Vaisseau",
    effects:[
      {id:"shipEngineTrail", label:"Réacteur / trail moteur"},
      {id:"combatDrones", label:"Drones de combat"},
      {id:"repairDrone", label:"Drone de réparation + faisceau"}
    ]
  },
  {
    id:"combat",
    label:"Combat",
    effects:[
      {id:"explosionsImpacts", label:"Explosions & impacts"},
      {id:"impactSparksSmoke", label:"Étincelles / fumée d’impact"},
      {id:"projectileTrails", label:"Traînées roquettes / missiles"},
      {id:"laserBeams", label:"Rayons laser / beams"},
      {id:"enemyAttackParticles", label:"Particules d’attaque des monstres"},
      {id:"muzzleFlashes", label:"Effets de bouche à feu"}
    ]
  },
  {
    id:"environment",
    label:"Environnement",
    effects:[
      {id:"nebulae", label:"Nébuleuses"},
      {id:"cosmicClouds", label:"Nuages / poussière cosmique"},
      {id:"starGlow", label:"Lumières des étoiles / glow"},
      {id:"backgroundAsteroids", label:"Astéroïdes de fond"},
      {id:"portalEffects", label:"Effets de portail"},
      {id:"portalWarp", label:"Warp / transition de portail"},
      {id:"vignette", label:"Vignettage des bords"}
    ]
  }
];

export const GRAPHICS_EFFECT_IDS = GRAPHICS_EFFECT_GROUPS.flatMap(group=>group.effects.map(effect=>effect.id));
export const GRAPHICS_PRESET_IDS = ["low", "medium", "high", "custom"];
export const FPS_LIMIT_VALUES = [30, 60, 120, 144, 240, 0];
export const UI_SCALE_VALUES = [.8, .9, 1, 1.1, 1.2];

const allEffects = value=>Object.fromEntries(GRAPHICS_EFFECT_IDS.map(id=>[id, value]));

export const GRAPHICS_PRESET_EFFECTS = {
  high:allEffects(true),
  medium:{
    ...allEffects(true),
    cosmicClouds:false,
    portalEffects:false,
    projectileTrails:false,
    enemyAttackParticles:false
  },
  low:{
    ...allEffects(false),
    combatDrones:true,
    repairDrone:true,
    laserBeams:true,
    muzzleFlashes:true
  }
};

export const DEFAULT_GAME_SETTINGS = Object.freeze({
  graphics:{
    preset:"high",
    basePreset:"high",
    effects:{...GRAPHICS_PRESET_EFFECTS.high},
    fpsLimit:0
  },
  interface:{
    uiScale:1,
    targetDetailsVisible:false,
    chatVisible:true,
    perfVisible:false
  },
  audio:{
    master:100,
    music:80,
    effects:100,
    ambience:80,
    muted:false
  }
});

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function nearestUiScale(value){
  const numeric = Number(value);
  if(!Number.isFinite(numeric)) return DEFAULT_GAME_SETTINGS.interface.uiScale;
  return UI_SCALE_VALUES.reduce((best, candidate)=>Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best, 1);
}

function normalizeVolume(value, fallback){
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 100) : fallback;
}

export function normalizeGraphicsBasePreset(value){
  return ["low", "medium", "high"].includes(value) ? value : "high";
}

export function normalizeGraphicsPreset(value){
  return GRAPHICS_PRESET_IDS.includes(value) ? value : "high";
}

export function normalizeGameSettings(raw, {legacyGraphicsQuality = "high"} = {}){
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const graphicsSource = source.graphics && typeof source.graphics === "object" ? source.graphics : {};
  const preset = normalizeGraphicsPreset(graphicsSource.preset || legacyGraphicsQuality);
  const basePreset = normalizeGraphicsBasePreset(graphicsSource.basePreset || (preset === "custom" ? legacyGraphicsQuality : preset));
  const presetEffects = GRAPHICS_PRESET_EFFECTS[preset === "custom" ? basePreset : preset];
  const effectSource = graphicsSource.effects && typeof graphicsSource.effects === "object" ? graphicsSource.effects : {};
  const effects = Object.fromEntries(GRAPHICS_EFFECT_IDS.map(id=>[
    id,
    typeof effectSource[id] === "boolean" ? effectSource[id] : Boolean(presetEffects[id])
  ]));
  const requestedFps = Number(graphicsSource.fpsLimit);
  const fpsLimit = FPS_LIMIT_VALUES.includes(requestedFps) ? requestedFps : 0;
  const interfaceSource = source.interface && typeof source.interface === "object" ? source.interface : {};
  const audioSource = source.audio && typeof source.audio === "object" ? source.audio : {};

  return {
    graphics:{preset, basePreset, effects, fpsLimit},
    interface:{
      uiScale:nearestUiScale(interfaceSource.uiScale),
      targetDetailsVisible:typeof interfaceSource.targetDetailsVisible === "boolean"
        ? interfaceSource.targetDetailsVisible
        : DEFAULT_GAME_SETTINGS.interface.targetDetailsVisible,
      chatVisible:interfaceSource.chatVisible !== false,
      perfVisible:typeof interfaceSource.perfVisible === "boolean"
        ? interfaceSource.perfVisible
        : DEFAULT_GAME_SETTINGS.interface.perfVisible
    },
    audio:{
      master:normalizeVolume(audioSource.master, DEFAULT_GAME_SETTINGS.audio.master),
      music:normalizeVolume(audioSource.music, DEFAULT_GAME_SETTINGS.audio.music),
      effects:normalizeVolume(audioSource.effects, DEFAULT_GAME_SETTINGS.audio.effects),
      ambience:normalizeVolume(audioSource.ambience, DEFAULT_GAME_SETTINGS.audio.ambience),
      muted:Boolean(audioSource.muted)
    }
  };
}

export function settingsWithGraphicsPreset(settings, preset){
  const normalized = normalizeGameSettings(settings);
  const nextPreset = normalizeGraphicsPreset(preset);
  if(nextPreset === "custom"){
    return {...normalized, graphics:{...normalized.graphics, preset:"custom"}};
  }
  return {
    ...normalized,
    graphics:{
      ...normalized.graphics,
      preset:nextPreset,
      basePreset:nextPreset,
      effects:{...GRAPHICS_PRESET_EFFECTS[nextPreset]}
    }
  };
}

export function settingsWithGraphicsEffect(settings, effectId, enabled){
  const normalized = normalizeGameSettings(settings);
  if(!GRAPHICS_EFFECT_IDS.includes(effectId)) return normalized;
  return {
    ...normalized,
    graphics:{
      ...normalized.graphics,
      preset:"custom",
      effects:{...normalized.graphics.effects, [effectId]:Boolean(enabled)}
    }
  };
}
