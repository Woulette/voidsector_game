import { RESOURCE_DROP_POOLS } from "../../../src/data/resources.js";
import {
  RESOURCE_DROP_BANDS,
  RESOURCE_DROP_RARITIES,
  getResourceDropChance
} from "../../../src/shared/resourceDropRules.js";

export { RESOURCE_DROP_BANDS, RESOURCE_DROP_RARITIES, getResourceDropChance };

export function rollResourceDrops(enemyLevel, {random = Math.random, resourceDropBand = ""} = {}){
  const drops = [];
  for(const rarity of RESOURCE_DROP_RARITIES){
    const chance = getResourceDropChance(rarity, enemyLevel, resourceDropBand);
    if(chance <= 0 || Number(random()) > chance) continue;
    const pool = RESOURCE_DROP_POOLS[rarity] || [];
    if(!pool.length) continue;
    const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Number(random())) * pool.length));
    const resource = pool[index];
    drops.push({
      rarity,
      materialId:resource.id,
      name:resource.name,
      img:resource.dropImg || resource.img,
      amount:1
    });
  }
  return drops;
}
