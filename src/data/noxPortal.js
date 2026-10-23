export const NOX_PORTAL_ID = "void";
export const NOX_PORTAL_LEVEL = 35;
export const NOX_WAVE_TOTAL = 30;
export const NOX_WAVE_GROUP_SIZE = 5;
export const NOX_WAVE_GROUP_TOTAL = NOX_WAVE_TOTAL / NOX_WAVE_GROUP_SIZE;
export const NOX_SHIELD_MAX_HP = 1_000_000;
export const NOX_DEFENSE_MAX_HP = 500_000;
export const NOX_CORE_MAX_HP = 3_000_000;
export const NOX_KAMIKAZE_BLAST_RADIUS = 150;

export const NOX_PORTAL_MAP = Object.freeze({
  width:5_600,
  height:5_600,
  // The pilot arrives inside the shield with the station immediately in view.
  spawn:Object.freeze({x:0, y:900}),
  station:Object.freeze({x:0, y:0}),
  shieldRadius:1_150,
  coreRadius:155,
  defenses:Object.freeze([
    Object.freeze({id:"nox_laser_north", type:"laser", x:0, y:-650, angle:Math.PI / 2}),
    Object.freeze({id:"nox_laser_south", type:"laser", x:0, y:650, angle:-Math.PI / 2}),
    Object.freeze({id:"nox_missile_west", type:"missile", x:-650, y:0, angle:0}),
    Object.freeze({id:"nox_missile_east", type:"missile", x:650, y:0, angle:Math.PI}),
    Object.freeze({id:"nox_summoner_northwest", type:"summoner", x:-470, y:-470, angle:Math.PI / 4}),
    Object.freeze({id:"nox_summoner_southeast", type:"summoner", x:470, y:470, angle:-Math.PI * .75})
  ])
});

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, finite(value, min)));
}

function normalizeVital(value, fallbackMax, fallbackMaxShield = 0){
  const source = value && typeof value === "object" ? value : {};
  const maxHp = Math.max(1, finite(source.maxHp, fallbackMax));
  const hp = clamp(source.hp === undefined ? maxHp : source.hp, 0, maxHp);
  const maxShield = Math.max(0, finite(source.maxShield, fallbackMaxShield));
  const shield = clamp(source.shield === undefined ? maxShield : source.shield, 0, maxShield);
  return {
    id:String(source.id || ""),
    hp,
    maxHp,
    shield,
    maxShield,
    alive:source.alive === undefined ? hp > 0 : Boolean(source.alive),
    ...(source.x === undefined ? {} : {x:finite(source.x)}),
    ...(source.y === undefined ? {} : {y:finite(source.y)})
  };
}

function normalizeDefense(value, index){
  const fallback = NOX_PORTAL_MAP.defenses[index] || {};
  const vital = normalizeVital(value, NOX_DEFENSE_MAX_HP);
  return {
    ...vital,
    id:String(value?.id || fallback.id || `nox_defense_${index + 1}`),
    type:["laser", "missile", "summoner"].includes(String(value?.type || fallback.type))
      ? String(value?.type || fallback.type)
      : "laser",
    x:finite(value?.x, fallback.x),
    y:finite(value?.y, fallback.y),
    angle:finite(value?.angle, fallback.angle),
    dronesAlive:Math.max(0, Math.floor(finite(value?.dronesAlive)))
  };
}

function normalizeDrone(value, index){
  const vital = normalizeVital(value, 20_000);
  return {
    ...vital,
    id:String(value?.id || `nox_drone_${index + 1}`),
    ownerId:String(value?.ownerId || ""),
    x:finite(value?.x),
    y:finite(value?.y),
    angle:finite(value?.angle)
  };
}

function normalizeEffect(value, index){
  const type = String(value?.type || value?.kind || "");
  return {
    id:String(value?.id || `nox_effect_${index}`),
    type,
    x:finite(value?.x, value?.to?.x),
    y:finite(value?.y, value?.to?.y),
    radius:Math.max(0, finite(value?.radius, type.includes("kamikaze") ? NOX_KAMIKAZE_BLAST_RADIUS : 0)),
    from:value?.from && typeof value.from === "object"
      ? {x:finite(value.from.x), y:finite(value.from.y)}
      : null,
    to:value?.to && typeof value.to === "object"
      ? {x:finite(value.to.x), y:finite(value.to.y)}
      : null,
    at:Math.max(0, finite(value?.at)),
    durationMs:Math.max(100, finite(value?.durationMs, type.includes("kamikaze") ? 900 : 420))
  };
}

export function isNoxPortal(portal){
  return String(portal?.id || portal?.portalId || portal || "") === NOX_PORTAL_ID;
}

export function getNoxWaveGroup(wave){
  const safeWave = Math.max(0, Math.min(NOX_WAVE_TOTAL, Math.floor(finite(wave))));
  const group = safeWave <= 0
    ? 1
    : Math.min(NOX_WAVE_GROUP_TOTAL, Math.ceil(safeWave / NOX_WAVE_GROUP_SIZE));
  return {
    wave:safeWave,
    group,
    groupTotal:NOX_WAVE_GROUP_TOTAL,
    groupStart:(group - 1) * NOX_WAVE_GROUP_SIZE + 1,
    groupEnd:group * NOX_WAVE_GROUP_SIZE,
    positionInGroup:safeWave <= 0 ? 0 : ((safeWave - 1) % NOX_WAVE_GROUP_SIZE) + 1,
    bossWave:safeWave === NOX_WAVE_TOTAL
  };
}

export function normalizeNoxObjective(value, {
  receivedAt = Date.now(),
  serverAt = value?.at
} = {}){
  const source = value && typeof value === "object" ? value : {};
  const wave = Math.max(0, Math.min(NOX_WAVE_TOTAL, Math.floor(finite(source.wave))));
  const group = getNoxWaveGroup(wave);
  const defensesSource = Array.isArray(source.defenses) ? source.defenses : [];
  const dronesSource = Array.isArray(source.drones) ? source.drones : [];
  const effectsSource = [
    ...(Array.isArray(source.recentEffects) ? source.recentEffects : []),
    ...(Array.isArray(source.attackEvents) ? source.attackEvents : [])
  ].filter((effect, index, list)=>{
    const id = String(effect?.id || "");
    return !id || list.findIndex(candidate=>String(candidate?.id || "") === id) === index;
  });
  const shield = normalizeVital(source.shield, NOX_SHIELD_MAX_HP);
  const core = normalizeVital(source.core, NOX_CORE_MAX_HP);
  const drones = dronesSource.map(normalizeDrone).filter(drone=>drone.alive);
  const defenses = NOX_PORTAL_MAP.defenses.map((fallback, index)=>{
    const match = defensesSource.find(defense=>String(defense?.id || "") === fallback.id)
      || defensesSource[index]
      || fallback;
    const defense = normalizeDefense(match, index);
    if(defense.type === "summoner"){
      defense.dronesAlive = drones.filter(drone=>drone.ownerId === defense.id).length;
    }
    return defense;
  });
  const normalizedReceivedAt = Math.max(0, finite(receivedAt, Date.now()));
  const normalizedServerAt = Math.max(0, finite(serverAt));
  const normalizedEffects = effectsSource.map(normalizeEffect)
    .map(effect=>({...effect, receivedAt:normalizedReceivedAt, serverAt:normalizedServerAt}));
  const completedAt = Math.max(0, finite(source.completedAt));
  const failedAt = Math.max(0, finite(source.failedAt));
  return {
    kind:"nox",
    stage:String(source.stage || ""),
    phase:String(source.phase || source.stage || ""),
    wave,
    waveTotal:NOX_WAVE_TOTAL,
    waveState:String(source.waveState || (completedAt ? "complete" : failedAt ? "failed" : "preparing")),
    batchEnd:Math.max(wave, Math.min(NOX_WAVE_TOTAL, Math.floor(finite(source.batchEnd ?? source.waveBatchEnd, group.groupEnd)))),
    waveBatchEnd:Math.max(wave, Math.min(NOX_WAVE_TOTAL, Math.floor(finite(source.batchEnd ?? source.waveBatchEnd, group.groupEnd)))),
    nextWaveAt:Math.max(0, finite(source.nextWaveAt)),
    nextWaveDelayMs:Math.max(0, finite(source.nextWaveDelayMs)),
    enemiesRemaining:Math.max(0, Math.floor(finite(source.enemiesRemaining))),
    kamikazesRemaining:Math.max(0, Math.floor(finite(source.kamikazesRemaining))),
    shield,
    core,
    defenses,
    drones,
    boss:source.boss ? normalizeVital(source.boss, 5_000_000, 5_000_000) : null,
    recentEffects:normalizedEffects,
    attackEvents:normalizedEffects,
    completedAt,
    failedAt,
    at:normalizedServerAt,
    receivedAt:normalizedReceivedAt
  };
}

export function getNoxNextWaveDelayMs(objective, now = Date.now()){
  const state = objective?.kind === "nox" ? objective : normalizeNoxObjective(objective);
  if(state.nextWaveAt > 0 && state.at > 0){
    const elapsed = Math.max(0, finite(now) - finite(state.receivedAt, now));
    return Math.max(0, finite(state.nextWaveDelayMs) - elapsed);
  }
  return Math.max(0, finite(state.nextWaveDelayMs));
}

function vitalPercent(vital){
  return Math.round(clamp(finite(vital?.hp) / Math.max(1, finite(vital?.maxHp, 1)), 0, 1) * 100);
}

export function getNoxObjectiveHud(objective, lives = 3, now = Date.now()){
  const state = normalizeNoxObjective(objective, {
    receivedAt:objective?.receivedAt ?? now,
    serverAt:objective?.at
  });
  const group = getNoxWaveGroup(state.wave);
  const nextDelayMs = getNoxNextWaveDelayMs(state, now);
  const aliveDefenses = state.defenses.filter(defense=>defense.alive).length;
  const shieldPct = vitalPercent(state.shield);
  const corePct = vitalPercent(state.core);
  const bossHpPct = state.boss ? vitalPercent(state.boss) : 0;
  const bossShieldPct = state.boss
    ? Math.round(clamp(finite(state.boss.shield) / Math.max(1, finite(state.boss.maxShield, 1)), 0, 1) * 100)
    : 0;
  let title = state.wave > 0
    ? `ASSAUT ${group.group}/${group.groupTotal} · VAGUE ${state.wave}/${NOX_WAVE_TOTAL}`
    : "STATION DE NOX · PRÉPAREZ LA DÉFENSE";
  let detail = `Bouclier ${shieldPct}% · Noyau ${corePct}% · Défenses ${aliveDefenses}/6 · Drones ${state.drones.length}`;
  if(state.failedAt || state.waveState === "failed"){
    title = "NOYAU DÉTRUIT · PORTAIL FERMÉ";
    detail = "La station de Nox est perdue.";
  }else if(state.completedAt || state.waveState === "complete"){
    title = "STATION DE NOX SAUVÉE";
    detail = `Bouclier ${shieldPct}% · Noyau ${corePct}% · ${aliveDefenses}/6 défenses opérationnelles`;
  }else if(group.bossWave || state.boss?.alive){
    title = "VAGUE 30/30 · ASSAUT DU BOSS";
    detail = `Boss PV ${bossHpPct}% · Bouclier ${bossShieldPct}% · il ignore les drones et attaque la station`;
  }else if(nextDelayMs > 0){
    detail += ` · Prochaine vague ${Math.max(1, Math.ceil(nextDelayMs / 1000))} s`;
  }else if(state.waveState === "clear_batch"){
    detail += ` · Éliminez ${state.enemiesRemaining} ennemi(s) pour ouvrir l’assaut suivant`;
  }
  return {
    title,
    detail,
    lives:Math.max(0, Math.min(3, Math.floor(finite(lives, 3)))),
    progress:state.completedAt ? 1 : clamp(state.wave / NOX_WAVE_TOTAL, 0, 1),
    group,
    shieldPct,
    corePct,
    bossHpPct,
    bossShieldPct,
    aliveDefenses,
    dronesAlive:state.drones.length,
    enemiesRemaining:state.enemiesRemaining,
    kamikazesRemaining:state.kamikazesRemaining,
    nextWaveDelayMs:nextDelayMs,
    boss:state.boss,
    failed:Boolean(state.failedAt || state.waveState === "failed"),
    completed:Boolean(state.completedAt || state.waveState === "complete")
  };
}
