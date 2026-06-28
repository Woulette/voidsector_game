import { ammoTypes, droneCatalog, droneFormations, equipment } from "./equipment.js";
import { ships } from "./ships.js";
import {
  COMMON_CRAFT_RESOURCES,
  ELITE_CRAFT_RESOURCES,
  MYTHIC_CRAFT_RESOURCES,
  RARE_CRAFT_RESOURCES,
  VERY_RARE_CRAFT_RESOURCES
} from "./resources.js";
import { S1_BOOSTER_SHOP } from "../shared/firmBoosters.js";

export const CRAFT_DURATION_MS = 60_000;

export const CRAFT_CATEGORY_TABS = Object.freeze([
  {id:"all", label:"Tout"},
  {id:"ship", label:"Vaisseaux"},
  {id:"weapon", label:"Armes"},
  {id:"generator", label:"Générateurs"},
  {id:"extra", label:"Extras"},
  {id:"drone", label:"Drones"},
  {id:"formation", label:"Formations"},
  {id:"booster", label:"Boosters"},
  {id:"ammo", label:"Munitions"}
]);

const RARITY_RANKS = Object.freeze({
  common:1,
  rare:2,
  veryRare:3,
  elite:4,
  mythic:5,
  ancestral:5
});

const RARITY_POOLS = Object.freeze({
  common:COMMON_CRAFT_RESOURCES.map(entry=>entry.id),
  rare:RARE_CRAFT_RESOURCES.map(entry=>entry.id),
  veryRare:VERY_RARE_CRAFT_RESOURCES.map(entry=>entry.id),
  elite:ELITE_CRAFT_RESOURCES.map(entry=>entry.id),
  mythic:MYTHIC_CRAFT_RESOURCES.map(entry=>entry.id)
});

const TYPE_WEIGHTS = Object.freeze({
  ship:8,
  weapon:3,
  generator:3,
  extra:3,
  drone:4,
  formation:5,
  booster:2,
  ammo:1
});

function normalizeRarityTier(value, fallback = "common"){
  const clean = String(value || "").trim();
  if(RARITY_RANKS[clean]) return clean;
  const lower = clean.toLowerCase();
  if(lower.includes("elite")) return "elite";
  if(lower.includes("mythic") || lower.includes("ancestral")) return "mythic";
  if(lower.includes("rare") && (lower.includes("tres") || lower.includes("tr") || lower.includes("very"))) return "veryRare";
  if(lower.includes("rare")) return "rare";
  return fallback;
}

function recipeHash(id){
  return String(id || "").split("").reduce((hash, char)=>
    ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 2166136261);
}

function addMaterialCost(costs, poolName, seed, count, baseAmount){
  const pool = RARITY_POOLS[poolName] || [];
  if(!pool.length) return;
  const used = new Set(Object.keys(costs.materials));
  const start = ((Number(seed) || 0) % pool.length + pool.length) % pool.length;
  for(let i = 0; i < count; i += 1){
    let index = (start + i * 7) % pool.length;
    let materialId = pool[index];
    for(let guard = 0; guard < pool.length && used.has(materialId); guard += 1){
      index = (index + 1) % pool.length;
      materialId = pool[index];
    }
    if(!materialId) continue;
    used.add(materialId);
    costs.materials[materialId] = Math.max(1, Math.round(baseAmount + i));
  }
}

function roundCurrency(value, step){
  const amount = Math.max(0, Number(value || 0));
  if(amount <= 0) return 0;
  return Math.max(step, Math.round(amount / step) * step);
}

function buildCosts(source, category, rarityTier){
  const tier = normalizeRarityTier(rarityTier);
  const rank = RARITY_RANKS[tier] || 1;
  const weight = TYPE_WEIGHTS[category] || 2;
  const seed = recipeHash(`${category}:${source.id}`);
  const costs = {materials:{}, credits:0, premium:0};

  if(rank <= 1){
    addMaterialCost(costs, "common", seed, Math.min(3, 1 + weight), 2 + weight);
  }else if(rank === 2){
    addMaterialCost(costs, "common", seed, 2, 4 + weight);
    addMaterialCost(costs, "rare", seed >>> 2, 2, 2 + Math.ceil(weight / 2));
  }else if(rank === 3){
    addMaterialCost(costs, "rare", seed, 2, 5 + weight);
    addMaterialCost(costs, "veryRare", seed >>> 2, 2, 2 + Math.ceil(weight / 2));
  }else if(rank === 4){
    addMaterialCost(costs, "veryRare", seed, 2, 6 + weight);
    addMaterialCost(costs, "elite", seed >>> 2, 2, 3 + Math.ceil(weight / 2));
  }else{
    addMaterialCost(costs, "elite", seed, 2, 7 + weight);
    addMaterialCost(costs, "mythic", seed >>> 2, 2, 3 + Math.ceil(weight / 2));
  }

  if(rank >= 3){
    const price = Math.max(0, Number(source.price ?? source.basePrice ?? 0));
    if(String(source.priceType || "credits") === "premium"){
      const factor = rank === 3 ? .08 : rank === 4 ? .12 : .16;
      costs.premium = roundCurrency(price * factor, rank >= 4 ? 100 : 25);
    }else{
      const factor = rank === 3 ? .04 : rank === 4 ? .06 : .08;
      costs.credits = roundCurrency(price * factor, rank >= 4 ? 5000 : 1000);
    }
  }

  return costs;
}

function classifyEquipment(item){
  if(item.category === "canon" || item.slotType === "weapon" || item.slotType === "missileLauncher" || item.slotType === "rocketLauncher"){
    return "weapon";
  }
  if(item.category === "generateur" || item.slotType === "generator"){
    return "generator";
  }
  return "extra";
}

function recipeFromSource(source, category, output, options = {}){
  const rarityTier = normalizeRarityTier(options.rarityTier || source.rarityTier || source.rarity);
  return Object.freeze({
    id:`craft_${category}_${source.id}`.replace(/[^a-zA-Z0-9_:-]/g, "_"),
    category,
    name:source.name || source.label || source.id,
    short:source.short || source.name || source.id,
    img:source.img || source.asset || "assets/equipment/module_munitions.svg",
    rarity:source.rarity || options.rarity || rarityTier,
    rarityTier,
    desc:source.desc || source.shopDesc || "",
    durationMs:CRAFT_DURATION_MS,
    costs:buildCosts(source, category, rarityTier),
    output:Object.freeze(output)
  });
}

function buildCraftRecipes(){
  const itemRecipes = equipment
    .filter(item=>item.shop !== false)
    .map(item=>{
      const category = classifyEquipment(item);
      return recipeFromSource(item, category, {
        type:"item",
        id:item.id,
        amount:1
      });
    });

  const ammoRecipes = ammoTypes
    .filter(ammo=>ammo.shop !== false)
    .map(ammo=>recipeFromSource(ammo, "ammo", {
      type:"ammo",
      id:ammo.id,
      amount:Math.max(1, Math.floor(Number(ammo.amount || 1)))
    }));

  const shipRecipes = ships.map(ship=>recipeFromSource(ship, "ship", {
    type:"ship",
    id:ship.id,
    amount:1
  }));

  const droneRecipes = droneCatalog.map(drone=>recipeFromSource({
    ...drone,
    price:drone.price ?? drone.basePrice ?? 0
  }, "drone", {
    type:"drone",
    id:drone.id,
    amount:1
  }));

  const formationRecipes = droneFormations.map(formation=>recipeFromSource(formation, "formation", {
    type:"formation",
    id:formation.id,
    amount:1
  }));

  const boosterRecipes = S1_BOOSTER_SHOP.map(booster=>recipeFromSource({
    ...booster,
    rarityTier:"veryRare",
    rarity:"Booster"
  }, "booster", {
    type:"booster",
    id:booster.id,
    boosterType:booster.type,
    series:"s1",
    amount:1
  }, {rarityTier:"veryRare", rarity:"Booster"}));

  return Object.freeze([
    ...shipRecipes,
    ...droneRecipes,
    ...formationRecipes,
    ...itemRecipes,
    ...ammoRecipes,
    ...boosterRecipes
  ]);
}

export const craftingRecipes = buildCraftRecipes();

export function getCraftRecipe(id){
  return craftingRecipes.find(recipe=>recipe.id === String(id || "")) || null;
}

export function getCraftRecipes(){
  return craftingRecipes;
}

export function shouldHideCraftRecipeForProfile(recipe, profile = {}){
  if(!recipe?.output) return true;
  const outputId = String(recipe.output.id || "");
  if(recipe.output.type === "ship"){
    return Array.isArray(profile.ownedShips) && profile.ownedShips.map(String).includes(outputId);
  }
  if(recipe.output.type === "formation"){
    return Array.isArray(profile.ownedDroneFormations) && profile.ownedDroneFormations.map(String).includes(outputId);
  }
  return false;
}

export function getVisibleCraftRecipes(profile = {}){
  return craftingRecipes.filter(recipe=>!shouldHideCraftRecipeForProfile(recipe, profile));
}

export function getCraftJobProgress(job, now = Date.now()){
  if(!job || typeof job !== "object") return {active:false, done:false, progress:0, remainingMs:0};
  const startedAt = Number(job.startedAt || 0);
  const endsAt = Number(job.endsAt || job.finishAt || startedAt);
  const durationMs = Math.max(1, Number(job.durationMs || endsAt - startedAt || CRAFT_DURATION_MS));
  const remainingMs = Math.max(0, endsAt - Number(now || Date.now()));
  return {
    active:true,
    done:remainingMs <= 0,
    progress:Math.max(0, Math.min(1, 1 - remainingMs / durationMs)),
    remainingMs,
    durationMs,
    startedAt,
    endsAt
  };
}

export function getCraftRecipeAvailability(recipe, profile = {}, now = Date.now()){
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  const job = getCraftJobProgress(profile.craftingJob, now);
  if(job.active) return {ok:false, reason:job.done ? "Recupere le craft termine avant d'en lancer un autre." : "Une fabrication est deja en cours."};
  const outputId = String(recipe.output?.id || "");
  if(recipe.output?.type === "ship" && Array.isArray(profile.ownedShips) && profile.ownedShips.map(String).includes(outputId)){
    return {ok:false, reason:"Vaisseau deja possede."};
  }
  if(recipe.output?.type === "formation" && Array.isArray(profile.ownedDroneFormations) && profile.ownedDroneFormations.map(String).includes(outputId)){
    return {ok:false, reason:"Formation deja possedee."};
  }
  if(recipe.output?.type === "drone"){
    const maxOwned = Math.max(0, Number(droneCatalog.find(drone=>drone.id === outputId)?.maxOwned || 10));
    if(Math.max(0, Number(profile.ownedDroneCount || 0)) >= maxOwned){
      return {ok:false, reason:`Limite de drones atteinte (${maxOwned}/${maxOwned}).`};
    }
  }
  const cargoHold = profile.cargoHold && typeof profile.cargoHold === "object" ? profile.cargoHold : {};
  for(const [materialId, amount] of Object.entries(recipe.costs?.materials || {})){
    if(Math.max(0, Number(cargoHold[materialId] || 0)) < Math.max(0, Number(amount || 0))){
      return {ok:false, reason:"Ressources insuffisantes."};
    }
  }
  const player = profile.player || {};
  if(Math.max(0, Number(player.credits || 0)) < Math.max(0, Number(recipe.costs?.credits || 0))){
    return {ok:false, reason:"Credits insuffisants."};
  }
  if(Math.max(0, Number(player.premium || 0)) < Math.max(0, Number(recipe.costs?.premium || 0))){
    return {ok:false, reason:"NOVA insuffisants."};
  }
  return {ok:true, reason:""};
}
