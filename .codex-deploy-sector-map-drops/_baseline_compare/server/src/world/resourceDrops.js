import { RESOURCE_DROP_POOLS } from "../../../src/data/resources.js";

export const RESOURCE_DROP_RARITIES = ["common", "rare", "veryRare", "elite", "mythic"];

export function getResourceDropChance(rarity, enemyLevel){
  const level = Math.max(1, Math.floor(Number(enemyLevel || 1)));
  if(rarity === "common") return level <= 14 ? 0.05 : 0;
  if(rarity === "rare") return level <= 14 ? 0.01 : level <= 24 ? 0.05 : 0;
  if(rarity === "veryRare") return level >= 15 && level <= 24 ? 0.01 : level >= 25 && level <= 34 ? 0.05 : 0;
  if(rarity === "elite") return level >= 25 && level <= 34 ? 0.01 : level >= 35 && level <= 50 ? 0.05 : 0;
  if(rarity === "mythic") return level >= 45 && level <= 50 ? 0.01 : level >= 35 && level <= 44 ? 0.001 : 0;
  return 0;
}

export function rollResourceDrops(enemyLevel, {random = Math.random} = {}){
  const drops = [];
  for(const rarity of RESOURCE_DROP_RARITIES){
    const chance = getResourceDropChance(rarity, enemyLevel);
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
