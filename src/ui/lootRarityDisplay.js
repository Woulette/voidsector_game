import { getRarityDefinition, getRarityTier } from "../shared/rarities.js";

export function escapeLootHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getLootRarityMeta(entry = {}){
  const tier = getRarityTier(entry);
  const definition = getRarityDefinition({rarityTier:tier, rarity:tier});
  return definition ? {...definition, className:`rarity-${definition.id}`} : null;
}

export function lootAmountSuffix(amount, fmt = value=>String(value)){
  const cleanAmount = Math.max(1, Math.round(Number(amount || 1)));
  return cleanAmount > 1 ? ` x${fmt(cleanAmount)}` : "";
}

export function lootNameWithRarityText(entry = {}, fmt){
  const name = String(entry.name || entry.portalName || entry.itemId || entry.ammoId || entry.materialId || "Butin");
  const rarity = getLootRarityMeta(entry);
  return `${rarity ? `${rarity.label} : ` : ""}${name}${lootAmountSuffix(entry.amount, fmt)}`;
}

export function lootNameWithRarityHtml(entry = {}, fmt){
  const name = String(entry.name || entry.portalName || entry.itemId || entry.ammoId || entry.materialId || "Butin");
  const rarity = getLootRarityMeta(entry);
  const prefix = rarity
    ? `<span class="loot-rarity-token ${escapeLootHtml(rarity.className)}">${escapeLootHtml(rarity.label)}</span> : `
    : "";
  return `${prefix}${escapeLootHtml(name)}${escapeLootHtml(lootAmountSuffix(entry.amount, fmt))}`;
}
