import { addInventoryItemAmount } from "../economy/inventoryStacks.js";

export const KHARON_DRONE_SKIN_REWARD_ID = "drone_skin_kharon";
export const ANCESTRAL_DRONE_SKIN_REWARD_ID = "drone_skin_ancestral";

const ITEM_NAMES = Object.freeze({
  drone_overdrive_chip:"Noyau Overdrive Drone",
  laser_mk4:"Canon Laser MK-IV",
  laser_elite_blue:"Canon Laser Élite Bleu",
  laser_elite_red:"Canon Laser Élite Rouge",
  laser_elite_green:"Canon Laser Élite Vert",
  ancestral_drone_core:"Noyau de Drone Ancestral"
});

const COSMETIC_NAMES = Object.freeze({
  [KHARON_DRONE_SKIN_REWARD_ID]:"Apparence de drone Kharon",
  [ANCESTRAL_DRONE_SKIN_REWARD_ID]:"Apparence de drone ancestrale"
});

export const PORTAL_BONUS_REWARD_TABLES = Object.freeze({
  violet:Object.freeze({
    firstClear:Object.freeze({kind:"item", itemId:"drone_overdrive_chip", chance:1}),
    repeat:Object.freeze({kind:"item", itemId:"drone_overdrive_chip", chance:0.5})
  }),
  red:Object.freeze([
    Object.freeze({kind:"item", itemId:"laser_mk4", chance:0.33}),
    Object.freeze({kind:"cosmetic", cosmeticId:KHARON_DRONE_SKIN_REWARD_ID, chance:0.33}),
    Object.freeze({kind:"none", chance:0.34})
  ]),
  void:Object.freeze([
    Object.freeze({kind:"item", itemId:"laser_elite_blue", chance:0.15}),
    Object.freeze({kind:"item", itemId:"laser_elite_red", chance:0.15}),
    Object.freeze({kind:"item", itemId:"laser_elite_green", chance:0.15}),
    Object.freeze({kind:"none", chance:0.55})
  ]),
  prismatic:Object.freeze([
    Object.freeze({kind:"item", itemId:"ancestral_drone_core", chance:0.33}),
    Object.freeze({kind:"item", itemId:"laser_mk4", chance:0.33}),
    Object.freeze({kind:"none", chance:0.34})
  ]),
  ancient:Object.freeze({
    cosmetic:Object.freeze({kind:"cosmetic", cosmeticId:ANCESTRAL_DRONE_SKIN_REWARD_ID, chance:0.5}),
    coloredLaser:Object.freeze({
      kind:"random_item",
      itemIds:Object.freeze(["laser_elite_blue", "laser_elite_red", "laser_elite_green"]),
      chance:0.5
    })
  })
});

function getRandomValue(random){
  const value = Number(random());
  if(!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function itemOutcome(portalId, entry, firstClear){
  return {
    portalId,
    kind:"item",
    itemId:entry.itemId,
    name:ITEM_NAMES[entry.itemId] || entry.itemId,
    awarded:true,
    firstClear,
    guaranteed:Boolean(portalId === "violet" && firstClear && Number(entry.chance || 0) >= 1),
    chance:Number(entry.chance || 0)
  };
}

function cosmeticOutcome(portalId, entry, firstClear){
  return {
    portalId,
    kind:"cosmetic",
    cosmeticId:entry.cosmeticId,
    name:COSMETIC_NAMES[entry.cosmeticId] || entry.cosmeticId,
    awarded:false,
    selected:true,
    pending:true,
    firstClear,
    guaranteed:false,
    chance:Number(entry.chance || 0),
    reason:"Récompense cosmétique réservée : son stockage sera activé avec le contenu du portail."
  };
}

function noneOutcome(portalId, chance, firstClear, potentialItemId = null){
  return {
    portalId,
    kind:"none",
    awarded:false,
    firstClear,
    guaranteed:false,
    chance:Number(chance || 0),
    ...(potentialItemId ? {itemId:potentialItemId, name:ITEM_NAMES[potentialItemId] || potentialItemId} : {})
  };
}

function resolveExclusiveTable(portalId, table, firstClear, random){
  const roll = getRandomValue(random);
  let cumulativeChance = 0;
  for(const entry of table){
    cumulativeChance += Number(entry.chance || 0);
    if(roll >= cumulativeChance) continue;
    if(entry.kind === "item") return itemOutcome(portalId, entry, firstClear);
    if(entry.kind === "cosmetic") return cosmeticOutcome(portalId, entry, firstClear);
    return noneOutcome(portalId, entry.chance, firstClear);
  }
  const fallback = table.at(-1);
  return noneOutcome(portalId, fallback?.chance || 0, firstClear);
}

export function resolvePortalBonusReward({
  portalId,
  previousCompletions = 0,
  random = Math.random
} = {}){
  const id = String(portalId || "");
  const firstClear = Math.max(0, Number(previousCompletions || 0)) === 0;

  if(id === "violet"){
    const entry = firstClear
      ? PORTAL_BONUS_REWARD_TABLES.violet.firstClear
      : PORTAL_BONUS_REWARD_TABLES.violet.repeat;
    if(firstClear || getRandomValue(random) < entry.chance){
      return itemOutcome(id, entry, firstClear);
    }
    return noneOutcome(id, 1 - entry.chance, firstClear, entry.itemId);
  }

  if(id === "red" || id === "void" || id === "prismatic"){
    return resolveExclusiveTable(id, PORTAL_BONUS_REWARD_TABLES[id], firstClear, random);
  }

  if(id === "ancient"){
    const table = PORTAL_BONUS_REWARD_TABLES.ancient;
    if(getRandomValue(random) < table.cosmetic.chance){
      return cosmeticOutcome(id, table.cosmetic, firstClear);
    }
    const itemIds = table.coloredLaser.itemIds;
    const colorRoll = getRandomValue(random);
    const itemId = itemIds[Math.min(itemIds.length - 1, Math.floor(colorRoll * itemIds.length))];
    return itemOutcome(id, {
      itemId,
      chance:table.coloredLaser.chance / itemIds.length
    }, firstClear);
  }

  return null;
}

export function grantPortalBonusReward(profile, portalId, {random = Math.random} = {}){
  const previousCompletions = Math.max(0, Number(profile?.completedPortals?.[portalId] || 0));
  const outcome = resolvePortalBonusReward({portalId, previousCompletions, random});
  if(outcome?.kind === "item" && outcome.awarded){
    addInventoryItemAmount(profile, outcome.itemId, 1);
  }
  return outcome;
}
