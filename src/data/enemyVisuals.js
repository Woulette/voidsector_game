const HALF_TURN_ASSET_KINDS = new Set([
  "raider_astral",
  "cuirasse_nebulaire",
  "cristal_du_neant"
]);

const FULL_ROTATION_KINDS = new Set([
  "drone_pirate",
  "raider_astral",
  "chasseur_spectral",
  "cuirasse_ambre"
]);

const FIXED_ROTATION_KINDS = new Set([
  "boss_raider_astral"
]);

const COMPACT_QUEST_ASSET_KINDS = new Set([
  "drone_pirate",
  "sentinel_orb",
  "raider_astral",
  "shared_rusher"
]);

const FULL_SIZE_QUEST_ASSET_KINDS = new Set([
  "boss_raider_astral"
]);

export function getEnemyBaseKind(kind){
  return String(kind || "").replace(/^boss_/, "");
}

export function hasCompactQuestAsset(kind){
  if(FULL_SIZE_QUEST_ASSET_KINDS.has(String(kind || ""))) return false;
  return COMPACT_QUEST_ASSET_KINDS.has(getEnemyBaseKind(kind));
}

export function getEnemyAssetRotation(kind){
  if(FIXED_ROTATION_KINDS.has(String(kind || ""))) return Math.PI;
  return HALF_TURN_ASSET_KINDS.has(getEnemyBaseKind(kind)) ? Math.PI : 0;
}

export function canEnemyRotateFully(kind){
  if(FIXED_ROTATION_KINDS.has(String(kind || ""))) return false;
  return FULL_ROTATION_KINDS.has(getEnemyBaseKind(kind));
}

export function getEnemyRenderRotation(kind, movementAngle = 0){
  return getEnemyAssetRotation(kind) + (canEnemyRotateFully(kind) ? Number(movementAngle || 0) : 0);
}

export function getEnemyAssetRotationStyle(kind){
  const rotation = getEnemyAssetRotation(kind);
  return rotation ? `transform:rotate(${rotation}rad)` : "";
}
