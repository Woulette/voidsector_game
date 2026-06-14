export const COMBAT_BOOST_TARGETS = ["laser", "rocket", "generator", "drone"];

export const COMBAT_BOOST_DEFS = {
  alliage_cuivre_zinc:{
    name:"Alliage",
    targets:{laser:{percent:0.10}, rocket:{percent:0.10}}
  },
  plaque_nickel_titane:{
    name:"Plaque",
    targets:{generator:{percent:0.10}, drone:{percent:0.10}}
  },
  conducteur_renforce:{
    name:"Conducteur",
    targets:{laser:{percent:0.25}, rocket:{percent:0.25}}
  },
  blindage_composite:{
    name:"Blindage",
    targets:{generator:{percent:0.25}, drone:{percent:0.25}}
  },
  noyau_astra:{
    name:"Noyau Astra",
    targets:{laser:{percent:0.50}, rocket:{percent:0.50}, generator:{percent:0.40}, drone:{percent:0.40}}
  }
};

const TARGET_ALIASES = {
  laser:"laser",
  lasers:"laser",
  roquette:"rocket",
  roquettes:"rocket",
  rocket:"rocket",
  rockets:"rocket",
  generateur:"generator",
  generateurs:"generator",
  generator:"generator",
  generators:"generator",
  drone:"drone",
  drones:"drone"
};

export function normalizeCombatBoostTarget(target){
  const key = String(target || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return TARGET_ALIASES[key] || "";
}

export function getCombatBoostMaterialInfo(materialId){
  return COMBAT_BOOST_DEFS[materialId] || null;
}

export function getCombatBoostTargetMaterialInfo(target, materialId){
  const normalized = normalizeCombatBoostTarget(target);
  const def = getCombatBoostMaterialInfo(materialId);
  const targetDef = def?.targets?.[normalized];
  return targetDef ? {...targetDef, target:normalized, materialId, name:def.name} : null;
}

export function getCombatBoostUnitAmount(target){
  const normalized = normalizeCombatBoostTarget(target);
  if(normalized === "laser") return 10;
  if(normalized === "rocket") return 1;
  return 60;
}

export function getCombatBoostStoreField(target){
  const normalized = normalizeCombatBoostTarget(target);
  return normalized === "laser" || normalized === "rocket" ? "charges" : "seconds";
}
