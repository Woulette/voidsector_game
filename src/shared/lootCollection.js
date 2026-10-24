export const LOOT_COLLECTION_DURATION_MS = 700;
export const LOOT_COLLECTION_HOVER_OFFSET = 48;
export const LOOT_COLLECTION_APPROACH_RADIUS = 12;
export const LOOT_COLLECTION_START_RADIUS = 56;
export const LOOT_COLLECTION_MOVE_TOLERANCE = 18;
export const LOOT_COLLECTION_TIMEOUT_MS = 4000;

export function getLootCollectionHoverPoint(drop, map){
  const point = {x:Number(drop?.x || 0), y:Number(drop?.y || 0) - LOOT_COLLECTION_HOVER_OFFSET};
  if(Number(map?.width) > 130) point.x = Math.max(-map.width / 2 + 65, Math.min(map.width / 2 - 65, point.x));
  if(Number(map?.height) > 130) point.y = Math.max(-map.height / 2 + 65, Math.min(map.height / 2 - 65, point.y));
  return point;
}
