export const REFINERY_RUSH_NOVA_PER_MINUTE = 15;
export const REFINERY_PRODUCTION_TICK_MS = 30000;
export const REFINERY_MAX_LEVEL = 20;

export const REFINERY_MODULES = {
  storage:{name:"Stockage", maxLevel:20, baseCost:18000},
  transport:{name:"Transport", maxLevel:20, baseCost:14000}
};

export const REFINERY_SHIPMENT_MATERIALS_PER_MINUTE = 30;
export const REFINERY_SHIPMENT_BLOCKED = new Set(["nickel_brut", "catalyseur_quantique"]);
export const REFINERY_SHIPMENT_CREDIT_RATE = {
  raw:12,
  refined:40,
  special:40,
  advanced:120,
  final:500
};

export const REFINERY_RAW_UPGRADE_COSTS = {
  cuivre_orbital:["cuivre_orbital", "zinc_spatial"],
  zinc_spatial:["cuivre_orbital", "nickel_brut"],
  nickel_brut:["zinc_spatial", "titane_fissure"],
  titane_fissure:["silice_conductrice", "nickel_brut"],
  silice_conductrice:["silice_conductrice", "titane_fissure"]
};

export const REFINERY_PRODUCTION_BY_KIND = {
  raw:{base:1500, max:140000},
  refined:{base:150, max:14000},
  special:{base:150, max:14000},
  advanced:{base:15, max:1400},
  final:{base:2, max:140}
};

export const REFINERY_STORAGE_BY_KIND = {
  raw:{base:25000, max:10000000},
  refined:{base:10000, max:1000000},
  special:{base:10000, max:1000000},
  advanced:{base:8000, max:100000},
  final:{base:2000, max:10000}
};

export const REFINERY_UPGRADE_TUNING = {
  raw:{baseCredits:8000, maxCredits:6000000, baseHours:1, maxHours:36, exponent:2.05},
  refined:{baseCredits:25000, maxCredits:25000000, baseHours:2, maxHours:96, exponent:2.15},
  special:{baseCredits:35000, maxCredits:30000000, baseHours:3, maxHours:120, exponent:2.18},
  advanced:{baseCredits:100000, maxCredits:60000000, baseHours:6, maxHours:168, exponent:2.25},
  final:{baseCredits:500000, maxCredits:150000000, baseHours:12, maxHours:336, exponent:2.35}
};

export function refineryLevelProgress(level, maxLevel = REFINERY_MAX_LEVEL, exponent = 1){
  const clamped = Math.max(1, Math.min(maxLevel, Number(level || 1)));
  const raw = maxLevel <= 1 ? 1 : (clamped - 1) / (maxLevel - 1);
  return Math.pow(raw, exponent);
}

export function refineryUpgradeProgressFactor(nextLevel, exponent = 2){
  const clamped = Math.max(2, Math.min(REFINERY_MAX_LEVEL, Number(nextLevel || 2)));
  const raw = (clamped - 2) / Math.max(1, REFINERY_MAX_LEVEL - 2);
  return Math.pow(raw, exponent);
}

export function interpolateRounded(base, max, progress){
  return Math.max(0, Math.round(Number(base || 0) + (Number(max || 0) - Number(base || 0)) * Math.max(0, Math.min(1, progress))));
}

export function getRefineryUpgradeTuning(kind){
  return REFINERY_UPGRADE_TUNING[kind] || REFINERY_UPGRADE_TUNING.raw;
}

export function getRecipeUpgradeUnitCost(outputKind, inputKind, nextLevel){
  const progress = refineryUpgradeProgressFactor(nextLevel, getRefineryUpgradeTuning(outputKind).exponent);
  if(outputKind === "final"){
    const target = inputKind === "advanced" ? 42500 : inputKind === "special" ? 650000 : 250000;
    return interpolateRounded(800, target, progress);
  }
  if(outputKind === "advanced") return interpolateRounded(900, 180000, progress);
  if(outputKind === "special") return interpolateRounded(1000, 160000, progress);
  return interpolateRounded(1000, 160000, progress);
}

export function getRawUpgradeMaterialAmount(nextLevel){
  if(Number(nextLevel) === 2) return 50;
  return interpolateRounded(1000, 1200000, refineryUpgradeProgressFactor(nextLevel, REFINERY_UPGRADE_TUNING.raw.exponent));
}

export function getRefineryModuleUpgradeMaterials(id, nextLevel){
  if(Number(nextLevel) === 2){
    return id === "storage"
      ? {titane_fissure:50, silice_conductrice:50}
      : {cuivre_orbital:50, zinc_spatial:50};
  }
  const progress = refineryUpgradeProgressFactor(nextLevel, 2.05);
  const amount = (base, max)=>interpolateRounded(base, max, progress);
  const costs = id === "storage"
    ? {titane_fissure:amount(900, 750000), silice_conductrice:amount(900, 750000)}
    : {cuivre_orbital:amount(800, 650000), zinc_spatial:amount(800, 650000)};
  if(nextLevel >= 6){
    costs.alliage_cuivre_zinc = amount(500, 180000);
    if(id === "storage") costs.plaque_nickel_titane = amount(500, 180000);
  }
  if(nextLevel >= 10){
    costs.plaque_nickel_titane = amount(900, 240000);
    costs.catalyseur_quantique = amount(250, 60000);
  }
  if(nextLevel >= 14){
    costs.conducteur_renforce = amount(120, 32000);
    costs.blindage_composite = amount(120, 32000);
  }
  if(nextLevel >= 18) costs.noyau_astra = amount(5, 1200);
  for(const key of Object.keys(costs)) if(costs[key] <= 0) delete costs[key];
  return costs;
}

export function getRefineryUpgradeDuration(type, data){
  const nextLevel = Math.max(1, Number(data?.nextLevel || 1));
  if(type === "material"){
    const tuning = getRefineryUpgradeTuning(data?.kind || "raw");
    const progress = refineryUpgradeProgressFactor(nextLevel, tuning.exponent * 0.72);
    const hours = Number(tuning.baseHours || 1) + (Number(tuning.maxHours || tuning.baseHours || 1) - Number(tuning.baseHours || 1)) * progress;
    return Math.round(hours * 60 * 60 * 1000);
  }
  return Math.round(60 * 60 * 1000 * nextLevel);
}
