export const KHARON_PORTAL_ID = "red";
export const KHARON_WAVE_TOTAL = 30;
export const KHARON_BOMB_RADIUS = 500;
export const KHARON_BOMB_DURATION_MS = 3_000;

export const KHARON_PORTAL_MAP = Object.freeze({
  width:5200,
  height:3600,
  spawn:Object.freeze({x:0, y:1250})
});

export const KHARON_BOSS_ASSETS = Object.freeze({
  10:"assets/ships/combat/Vesperion.png",
  20:"assets/ships/combat/Nyxaris.png",
  30:"assets/ships/combat/Asterion.png"
});

const KHARON_BOSS_NAMES = Object.freeze({
  10:"VESPERION",
  20:"NYXARIS",
  30:"ASTERION"
});

export const KHARON_BOSS_EFFECT_KINDS = Object.freeze([
  "boss_absorption",
  "boss_poison_wave",
  "boss_spectral_charge",
  "boss_spectral_impact"
]);

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER){
  return Math.max(min, Math.min(max, Math.round(finite(value, fallback))));
}

export function isKharonPortal(portal){
  return portal?.encounterKind !== "azuron" && String(portal?.id || portal?.portalId || portal || "") === KHARON_PORTAL_ID;
}

export function getKharonWavePhase(wave){
  const safeWave = boundedInteger(wave, 0, 0, KHARON_WAVE_TOTAL);
  if(safeWave <= 0) return {id:"preparation", label:"PRÉPARATION", boss:false, bossName:""};
  if(KHARON_BOSS_NAMES[safeWave]){
    const finalBoss = safeWave === KHARON_WAVE_TOTAL;
    return {
      id:finalBoss ? "final_boss" : "semi_boss",
      label:finalBoss ? "BOSS FINAL" : "SEMI-BOSS",
      boss:true,
      bossName:KHARON_BOSS_NAMES[safeWave]
    };
  }
  if(safeWave <= 5) return {id:"assault_1", label:"ASSAUT I", boss:false, bossName:""};
  if(safeWave <= 9) return {id:"assault_2", label:"ASSAUT II", boss:false, bossName:""};
  if(safeWave <= 15) return {id:"assault_3", label:"ASSAUT III", boss:false, bossName:""};
  if(safeWave <= 19) return {id:"assault_4", label:"ASSAUT IV", boss:false, bossName:""};
  if(safeWave <= 25) return {id:"assault_5", label:"ASSAUT V", boss:false, bossName:""};
  return {id:"final_assault", label:"ASSAUT FINAL", boss:false, bossName:""};
}

export function getKharonWaveHud({
  wave = 0,
  waveTotal = KHARON_WAVE_TOTAL,
  waveState = "",
  waitingForClear = false,
  nextWaveDelay = 0,
  completed = false,
  lives = 3,
  objective = null
} = {}){
  const safeTotal = Math.max(1, boundedInteger(waveTotal, KHARON_WAVE_TOTAL, 1, KHARON_WAVE_TOTAL));
  const safeWave = boundedInteger(wave, 0, 0, safeTotal);
  const phase = getKharonWavePhase(safeWave);
  const hazards = normalizeKharonObjective(objective).hazards;
  const liveBomb = hazards.find(hazard=>hazard.phase === "charging");
  const safeLives = boundedInteger(lives, 3, 0, 3);
  const progress = completed ? 1 : safeWave / safeTotal;
  const title = completed
    ? "FORGE DE KHARON TERMINÉE"
    : safeWave <= 0
      ? "PRÉPAREZ-VOUS · 30 VAGUES"
      : `${phase.label} · VAGUE ${safeWave}/${safeTotal}`;
  let detail = "";
  if(completed){
    detail = "La forge est sécurisée.";
  }else if(liveBomb){
    detail = "BOMBE DE FAILLE · SORTEZ DU CERCLE AVANT L’EXPLOSION";
  }else if(phase.boss){
    detail = `${phase.bossName} · Surveillez ses téléportations`;
  }else if(waitingForClear || String(waveState) === "clear_batch"){
    detail = "Éliminez tous les ennemis pour poursuivre.";
  }else if(nextWaveDelay > 0){
    detail = `Renforts dans ${Math.max(1, Math.ceil(Number(nextWaveDelay) || 0))} s`;
  }else{
    detail = "Vagues groupées · intervalle de 10 secondes";
  }
  return {
    title,
    detail,
    phase,
    progress:Math.max(0, Math.min(1, progress)),
    lives:safeLives,
    bombActive:Boolean(liveBomb)
  };
}

export function normalizeKharonHazard(hazard, {
  receivedAt = Date.now(),
  serverAt = hazard?.at
} = {}){
  const source = hazard && typeof hazard === "object" ? hazard : {};
  if(source.__kharonHazardNormalized === true) return source;
  const localReceivedAt = finite(receivedAt, Date.now());
  const remoteAt = finite(serverAt, 0);
  const clockOffset = remoteAt > 0 ? localReceivedAt - remoteAt : 0;
  const translateTime = value=>{
    const raw = finite(value, 0);
    return raw > 0 ? raw + clockOffset : 0;
  };
  const durationMs = Math.max(250, finite(source.durationMs, KHARON_BOMB_DURATION_MS));
  const startedAt = translateTime(source.startedAt) || localReceivedAt;
  const detonateAt = translateTime(source.detonateAt) || startedAt + durationMs;
  const explodedAt = translateTime(source.explodedAt);
  const phase = String(source.phase || "") === "exploded" ? "exploded" : "charging";
  return {
    ...source,
    __kharonHazardNormalized:true,
    id:String(source.id || `kharon-bomb-${Math.round(startedAt)}`),
    kind:"boss_teleport_bomb",
    phase,
    x:finite(source.x),
    y:finite(source.y),
    fromX:Number.isFinite(Number(source.fromX)) ? Number(source.fromX) : null,
    fromY:Number.isFinite(Number(source.fromY)) ? Number(source.fromY) : null,
    toX:Number.isFinite(Number(source.toX)) ? Number(source.toX) : finite(source.x),
    toY:Number.isFinite(Number(source.toY)) ? Number(source.toY) : finite(source.y),
    radius:Math.max(0, finite(source.radius)),
    maxRadius:Math.max(1, finite(source.maxRadius, KHARON_BOMB_RADIUS)),
    durationMs,
    startedAt,
    detonateAt,
    explodedAt:explodedAt || (phase === "exploded" ? detonateAt : 0),
    bossId:source.bossId ? String(source.bossId) : null,
    receivedAt:localReceivedAt
  };
}

export function normalizeKharonObjective(objective, {
  hazards = null,
  bossEffects = null,
  receivedAt = Date.now(),
  serverAt = objective?.at
} = {}){
  const source = objective && typeof objective === "object" ? objective : {};
  if(source.__kharonNormalized === true && hazards === null && bossEffects === null) return source;
  const hazardSource = Array.isArray(hazards)
    ? hazards
    : Array.isArray(source.hazards)
      ? source.hazards
      : [];
  const effectSource = Array.isArray(bossEffects)
    ? bossEffects
    : Array.isArray(source.bossEffects)
      ? source.bossEffects
      : [];
  return {
    ...source,
    __kharonNormalized:true,
    kind:"kharon",
    wave:boundedInteger(source.wave, 0, 0, KHARON_WAVE_TOTAL),
    waveTotal:boundedInteger(source.waveTotal, KHARON_WAVE_TOTAL, 1, KHARON_WAVE_TOTAL),
    hazards:hazardSource
      .filter(hazard=>String(hazard?.kind || "boss_teleport_bomb") === "boss_teleport_bomb")
      .slice(-8)
      .map(hazard=>normalizeKharonHazard(hazard, {receivedAt, serverAt})),
    bossEffects:effectSource
      .filter(effect=>KHARON_BOSS_EFFECT_KINDS.includes(String(effect?.kind || "")))
      .slice(-16)
      .map(effect=>normalizeKharonBossEffect(effect, {receivedAt, serverAt}))
  };
}

export function mergeKharonEffect(objective, effect, options = {}){
  const normalized = normalizeKharonObjective(objective, options);
  const source = effect?.hazard || effect?.effect || effect;
  if(KHARON_BOSS_EFFECT_KINDS.includes(String(source?.kind || ""))){
    const bossEffect = normalizeKharonBossEffect(source, {
      receivedAt:options.receivedAt,
      serverAt:effect?.at
    });
    const bossEffects = normalized.bossEffects.filter(entry=>entry.id !== bossEffect.id);
    bossEffects.push(bossEffect);
    return {
      ...normalized,
      bossEffects:bossEffects.slice(-16)
    };
  }
  if(String(source?.kind || "") !== "boss_teleport_bomb") return normalized;
  const hazard = normalizeKharonHazard(source, {
    receivedAt:options.receivedAt,
    serverAt:effect?.at
  });
  const hazards = normalized.hazards.filter(entry=>entry.id !== hazard.id);
  hazards.push(hazard);
  return {
    ...normalized,
    hazards:hazards.slice(-8)
  };
}

export function normalizeKharonBossEffect(effect, {
  receivedAt = Date.now(),
  serverAt = effect?.at
} = {}){
  const source = effect && typeof effect === "object" ? effect : {};
  if(source.__kharonBossEffectNormalized === true) return source;
  const kind = KHARON_BOSS_EFFECT_KINDS.includes(String(source.kind || ""))
    ? String(source.kind)
    : "boss_absorption";
  const localReceivedAt = finite(receivedAt, Date.now());
  const remoteAt = finite(serverAt, 0);
  const clockOffset = remoteAt > 0 ? localReceivedAt - remoteAt : 0;
  const rawStartedAt = finite(source.startedAt, remoteAt);
  const startedAt = rawStartedAt > 0 ? rawStartedAt + clockOffset : localReceivedAt;
  const defaultDuration = kind === "boss_poison_wave"
    ? 1_000
    : kind === "boss_spectral_charge"
      ? 3_000
      : 850;
  return {
    ...source,
    __kharonBossEffectNormalized:true,
    id:String(source.id || `${kind}-${Math.round(startedAt)}`),
    kind,
    bossId:source.bossId ? String(source.bossId) : null,
    x:finite(source.x),
    y:finite(source.y),
    radius:Math.max(1, finite(source.radius, kind === "boss_poison_wave" ? 300 : 120)),
    durationMs:Math.max(120, finite(source.durationMs, defaultDuration)),
    startedAt,
    receivedAt:localReceivedAt
  };
}

export function getKharonBossEffectVisualState(effect, now = Date.now()){
  const normalized = effect?.kind && Number.isFinite(Number(effect?.startedAt))
    ? effect
    : normalizeKharonBossEffect(effect);
  const durationMs = Math.max(1, finite(normalized.durationMs, 850));
  const progress = Math.max(0, Math.min(1, (finite(now, Date.now()) - finite(normalized.startedAt, now)) / durationMs));
  return {
    ...normalized,
    progress,
    visible:progress < 1
  };
}

export function getKharonBombVisualState(hazard, now = Date.now()){
  const normalized = hazard?.kind === "boss_teleport_bomb" && Number.isFinite(Number(hazard?.detonateAt))
    ? hazard
    : normalizeKharonHazard(hazard);
  const startedAt = finite(normalized.startedAt, now);
  const detonateAt = Math.max(startedAt + 1, finite(normalized.detonateAt, startedAt + KHARON_BOMB_DURATION_MS));
  const chargeProgress = Math.max(0, Math.min(1, (finite(now, Date.now()) - startedAt) / (detonateAt - startedAt)));
  const explodedAt = finite(normalized.explodedAt, detonateAt);
  const explosionProgress = normalized.phase === "exploded"
    ? Math.max(0, Math.min(1, (finite(now, Date.now()) - explodedAt) / 900))
    : 0;
  return {
    ...normalized,
    chargeProgress,
    displayRadius:Math.max(
      finite(normalized.radius),
      Math.max(18, finite(normalized.maxRadius, KHARON_BOMB_RADIUS) * chargeProgress)
    ),
    countdownSeconds:Math.max(0, Math.ceil((detonateAt - finite(now, Date.now())) / 1000)),
    teleportProgress:Math.max(0, Math.min(1, (finite(now, Date.now()) - startedAt) / 520)),
    explosionProgress,
    visible:normalized.phase !== "exploded" || explosionProgress < 1
  };
}
