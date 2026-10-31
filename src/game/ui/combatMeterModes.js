const STORAGE_KEY = "voidsector-combat-meter-modes";
const METRICS = ["hp", "shield", "xp"];
const MODES = ["value", "fraction", "bar"];

export function normalizeCombatMeterMode(mode){
  if(mode === "text") return "value";
  return MODES.includes(mode) ? mode : "fraction";
}

export function nextCombatMeterMode(mode){
  return MODES[(MODES.indexOf(normalizeCombatMeterMode(mode)) + 1) % MODES.length];
}

export function readCombatMeterModes(storage){
  let saved;
  try{
    saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY) || "{}");
  }catch{
    saved = null;
  }
  return Object.fromEntries(METRICS.map(metric=>[metric, normalizeCombatMeterMode(saved?.[metric])]));
}

// These browser preferences only affect the HUD, never the player's statistics.
export function cycleCombatMeterMode(modes, metric, storage){
  if(!modes || !METRICS.includes(metric)) return false;
  modes[metric] = nextCombatMeterMode(modes[metric]);
  try{
    const saved = Object.fromEntries(METRICS.map(id=>[id, normalizeCombatMeterMode(modes[id])]));
    (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(saved));
  }catch{
    // Clicking still works if browser storage is unavailable or full.
  }
  return true;
}
