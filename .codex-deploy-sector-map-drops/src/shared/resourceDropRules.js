export const RESOURCE_DROP_RARITIES = Object.freeze([
  "common",
  "rare",
  "veryRare",
  "elite",
  "mythic"
]);

function createBand({id, minLevel, maxLevel, mapLabel, levelLabel, chances}){
  return Object.freeze({
    id,
    minLevel,
    maxLevel,
    mapLabel,
    levelLabel,
    chances:Object.freeze({...chances})
  });
}

export const RESOURCE_DROP_BANDS = Object.freeze({
  early:createBand({
    id:"early",
    minLevel:1,
    maxLevel:14,
    mapLabel:"Maps X-1 / X-2 / X-3",
    levelLabel:"Monstres LV 1-14",
    chances:{common:0.05, rare:0.01}
  }),
  mid:createBand({
    id:"mid",
    minLevel:15,
    maxLevel:24,
    mapLabel:"Maps X-4 / X-5",
    levelLabel:"Monstres LV 15-24",
    chances:{rare:0.05, veryRare:0.01}
  }),
  core:createBand({
    id:"core",
    minLevel:25,
    maxLevel:34,
    mapLabel:"Map CORE",
    levelLabel:"Monstres LV 25-34",
    chances:{rare:0.05, veryRare:0.01, elite:0.001}
  }),
  frontier35_50:createBand({
    id:"frontier35_50",
    minLevel:35,
    maxLevel:50,
    mapLabel:"Futures zones LV 35-50",
    levelLabel:"Monstres LV 35-50",
    chances:{rare:0.05, elite:0.01, mythic:0.001}
  })
});

export function getResourceDropChance(rarity, enemyLevel, resourceDropBand){
  const band = RESOURCE_DROP_BANDS[String(resourceDropBand || "")];
  const level = Math.max(1, Math.floor(Number(enemyLevel || 1)));
  if(!band || level < band.minLevel || level > band.maxLevel) return 0;
  return Math.max(0, Number(band.chances[String(rarity || "")] || 0));
}

export function formatResourceDropChance(chance){
  const percent = Math.max(0, Number(chance || 0)) * 100;
  const digits = percent < 1 ? 1 : 0;
  return `${percent.toFixed(digits).replace(".", ",")}%`;
}
