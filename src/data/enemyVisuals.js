const HALF_TURN_ASSET_KINDS = new Set([
  "raider_astral",
  "cuirasse_nebulaire",
  "shared_rusher"
]);

const FULL_ROTATION_KINDS = new Set([
  "drone_pirate",
  "raider_astral",
  "chasseur_spectral",
  "pondeuse_astrale",
  "cuirasse_ambre",
  "shared_orb",
  "shared_crystal",
  "deadly_eclaireur",
  "deadly_intercepteur",
  "deadly_gardien",
  "deadly_traqueur",
  "deadly_ravageur",
  "deadly_amiral_k137"
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
  return HALF_TURN_ASSET_KINDS.has(getEnemyBaseKind(kind)) ? Math.PI : 0;
}

export function canEnemyRotateFully(kind){
  if(String(kind || "") === "boss_raider_astral") return false;
  return FULL_ROTATION_KINDS.has(getEnemyBaseKind(kind));
}

export function getEnemyRenderRotation(kind, movementAngle = 0){
  return getEnemyAssetRotation(kind) + (canEnemyRotateFully(kind) ? Number(movementAngle || 0) : 0);
}

export function getEnemyAssetRotationStyle(kind){
  const rotation = getEnemyAssetRotation(kind);
  return rotation ? `transform:rotate(${rotation}rad)` : "";
}
