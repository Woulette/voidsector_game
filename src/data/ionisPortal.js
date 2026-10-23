export const IONIS_PORTAL_ID = "ionis";
export const IONIS_WAVE_TOTAL = 40;
export const IONIS_WAVE_GROUP_SIZE = 4;
export const IONIS_WAVE_GROUP_TOTAL = IONIS_WAVE_TOTAL / IONIS_WAVE_GROUP_SIZE;

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER){
  return Math.max(min, Math.min(max, Math.round(finite(value, fallback))));
}

export function isIonisPortal(portal){
  return String(portal?.id || portal?.portalId || portal || "") === IONIS_PORTAL_ID;
}

export function getIonisWaveGroup(wave){
  const safeWave = boundedInteger(wave, 0, 0, IONIS_WAVE_TOTAL);
  const group = safeWave <= 0
    ? 1
    : Math.min(IONIS_WAVE_GROUP_TOTAL, Math.ceil(safeWave / IONIS_WAVE_GROUP_SIZE));
  const groupStart = (group - 1) * IONIS_WAVE_GROUP_SIZE + 1;
  const groupEnd = group * IONIS_WAVE_GROUP_SIZE;
  return {
    wave:safeWave,
    group,
    groupTotal:IONIS_WAVE_GROUP_TOTAL,
    groupStart,
    groupEnd,
    positionInGroup:safeWave <= 0 ? 0 : safeWave - groupStart + 1,
    finalEliteAssault:safeWave === IONIS_WAVE_TOTAL
  };
}

export function normalizeIonisObjective(objective, {
  wave = objective?.wave,
  waveTotal = objective?.waveTotal
} = {}){
  const source = objective && typeof objective === "object" ? objective : {};
  const safeWave = boundedInteger(wave, source.wave || 0, 0, IONIS_WAVE_TOTAL);
  const safeTotal = boundedInteger(waveTotal, IONIS_WAVE_TOTAL, 1, IONIS_WAVE_TOTAL);
  const group = getIonisWaveGroup(safeWave);
  return {
    ...source,
    __ionisNormalized:true,
    kind:"ionis",
    wave:safeWave,
    waveTotal:safeTotal,
    waveState:String(source.waveState || ""),
    waveBatchEnd:boundedInteger(source.waveBatchEnd, group.groupEnd, 0, IONIS_WAVE_TOTAL),
    nextWaveAt:Math.max(0, finite(source.nextWaveAt)),
    nextWaveDelayMs:Math.max(0, finite(source.nextWaveDelayMs)),
    waveGroup:group.group,
    waveGroupTotal:group.groupTotal,
    waveGroupStart:group.groupStart,
    waveGroupEnd:group.groupEnd,
    eliteWave:Boolean(source.eliteWave) || group.finalEliteAssault,
    finalEliteAssault:Boolean(source.eliteWave) || group.finalEliteAssault
  };
}

export function getIonisWaveHud({
  wave = 0,
  waveTotal = IONIS_WAVE_TOTAL,
  waveState = "",
  waitingForClear = false,
  nextWaveDelay = 0,
  completed = false,
  lives = 3
} = {}){
  const safeTotal = boundedInteger(waveTotal, IONIS_WAVE_TOTAL, 1, IONIS_WAVE_TOTAL);
  const group = getIonisWaveGroup(Math.min(wave, safeTotal));
  const safeLives = boundedInteger(lives, 3, 0, 3);
  const clearing = Boolean(waitingForClear) || String(waveState) === "clear_batch";
  const title = completed
    ? "TEMPÊTE D’IONIS TERMINÉE"
    : group.wave <= 0
      ? "PRÉPAREZ-VOUS · 40 VAGUES"
      : group.finalEliteAssault
        ? "ASSAUT D’ÉLITE FINAL · VAGUE 40/40"
        : `GROUPE ${group.group}/${group.groupTotal} · VAGUE ${group.wave}/${safeTotal}`;
  let detail = "";
  if(completed){
    detail = "La tempête est maîtrisée.";
  }else if(group.finalEliteAssault){
    detail = "Éliminez les forces d’élite pour achever l’épreuve.";
  }else if(clearing){
    detail = `Nettoyez le groupe ${group.group}/${group.groupTotal} pour poursuivre.`;
  }else if(Number(nextWaveDelay) > 0){
    const nextWave = Math.min(safeTotal, group.wave + 1);
    detail = `Prochain renfort dans ${Math.max(1, Math.ceil(Number(nextWaveDelay)))} s · vague ${nextWave}/${safeTotal}`;
  }else if(group.wave <= 0){
    detail = "Le premier groupe arrive.";
  }else{
    detail = `Renfort ${group.positionInGroup}/${IONIS_WAVE_GROUP_SIZE} du groupe en cours.`;
  }
  return {
    title,
    detail,
    group,
    progress:completed ? 1 : Math.max(0, Math.min(1, group.wave / safeTotal)),
    lives:safeLives,
    completed:Boolean(completed),
    finalEliteAssault:group.finalEliteAssault
  };
}
