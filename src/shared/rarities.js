export const RARITY_DEFINITIONS = Object.freeze({
  common:Object.freeze({id:"common", label:"Commun", short:"COM", color:"#94a3b8", order:1}),
  rare:Object.freeze({id:"rare", label:"Rare", short:"RAR", color:"#38bdf8", order:2}),
  veryRare:Object.freeze({id:"veryRare", label:"Très rare", short:"T-R", color:"#a78bfa", order:3}),
  elite:Object.freeze({id:"elite", label:"Élite", short:"ELI", color:"#fb923c", order:4}),
  mythic:Object.freeze({id:"mythic", label:"Mythique", short:"MYT", color:"#facc15", order:5})
});

const LEGACY_RARITY_TIERS = Object.freeze({
  standard:"common",
  commun:"common",
  commune:"common",
  common:"common",
  rare:"rare",
  tactique:"rare",
  renforcee:"rare",
  explosive:"common",
  lourde:"rare",
  siege:"veryRare",
  epique:"elite",
  legendaire:"mythic",
  ancienne:"elite",
  elite:"elite",
  mythique:"mythic",
  mythic:"mythic"
});

function normalizeRarityKey(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function getRarityTier(entry){
  const direct = String(entry?.rarityTier || "");
  if(RARITY_DEFINITIONS[direct]) return direct;
  const fromRarity = String(entry?.rarity || "");
  if(RARITY_DEFINITIONS[fromRarity]) return fromRarity;
  return LEGACY_RARITY_TIERS[normalizeRarityKey(fromRarity)] || "";
}

export function getRarityDefinition(entry){
  return RARITY_DEFINITIONS[getRarityTier(entry)] || null;
}

export function getRarityLabel(entry, fallback = ""){
  return getRarityDefinition(entry)?.label || fallback || String(entry?.rarity || "");
}

export function getRarityShort(entry, fallback = "RES"){
  return getRarityDefinition(entry)?.short || fallback;
}

export function getRarityOrder(entry, fallback = 99){
  return getRarityDefinition(entry)?.order || fallback;
}

export function rarityClass(entry){
  const tier = getRarityTier(entry);
  return tier ? `rarity-${tier}` : "";
}
