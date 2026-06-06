const HALF_TURN_ASSET_KINDS = new Set([
  "raider_astral",
  "cuirasse_nebulaire",
  "cristal_du_neant"
]);

const FULL_ROTATION_KINDS = new Set([
  "drone_pirate",
  "chasseur_spectral",
  "cuirasse_ambre"
]);

export function getEnemyBaseKind(kind){
  return String(kind || "").replace(/^boss_/, "");
}

export function getEnemyAssetRotation(kind){
  return HALF_TURN_ASSET_KINDS.has(getEnemyBaseKind(kind)) ? Math.PI : 0;
}

export function canEnemyRotateFully(kind){
  return FULL_ROTATION_KINDS.has(getEnemyBaseKind(kind));
}

export function getEnemyRenderRotation(kind, movementAngle = 0){
  return getEnemyAssetRotation(kind) + (canEnemyRotateFully(kind) ? Number(movementAngle || 0) : 0);
}

export function getEnemyAssetRotationStyle(kind){
  const rotation = getEnemyAssetRotation(kind);
  return rotation ? `transform:rotate(${rotation}rad)` : "";
}
