import { ammoTypes, droneCatalog, droneFormations, equipment } from "./equipment.js?v=craft-balance-2";
import { ships } from "./ships.js?v=craft-balance-2";
import {
  COMMON_CRAFT_RESOURCES,
  ELITE_CRAFT_RESOURCES,
  MYTHIC_CRAFT_RESOURCES,
  RARE_CRAFT_RESOURCES,
  VERY_RARE_CRAFT_RESOURCES
} from "./resources.js?v=craft-balance-2";
import { S1_BOOSTER_DURATION_MS, S1_BOOSTER_SHOP } from "../shared/firmBoosters.js?v=craft-balance-2";

export const CRAFT_DURATION_MS = 60_000;

export const CRAFT_CATEGORY_TABS = Object.freeze([
  {id:"all", label:"Tout"},
  {id:"ship", label:"Vaisseaux"},
  {id:"weapon", label:"Armes"},
  {id:"generator", label:"Générateurs"},
  {id:"extra", label:"Extras"},
  {id:"drone", label:"Drones"},
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

const NON_CRAFTABLE_SHIP_IDS = new Set(["orion", "velox"]);
const NON_CRAFTABLE_ITEM_IDS = new Set([
  "launcher_missile_mk1",
  "launcher_rocket_mk1",
  "extra_repair_starter",
  "teleportation_fluid"
]);
const FORCE_CRAFTABLE_ITEM_IDS = new Set([
  "laser_mk4",
  "laser_elite_green",
  "laser_elite_blue",
  "laser_elite_red"
]);

function costs(materials = {}, credits = 0, premium = 0){
  return {
    materials:{...materials},
    credits:Math.max(0, Math.floor(Number(credits || 0))),
    premium:Math.max(0, Math.floor(Number(premium || 0)))
  };
}

const CRAFT_RECIPE_OVERRIDES = Object.freeze({
  valkyrie:{costs:costs({
    plaques_acier:3,
    cables_cuivre:2,
    micro_pompe_cryogenique:1,
    ruban_carbone_ceramique:1
  })},
  razorion:{costs:costs({
    polymere_isolant:5,
    bobine_supraconductrice:3,
    gyroscope_stabilise:2
  }, 2_500_000)},
  astralis:{costs:costs({
    gyroscope_stabilise:4,
    ruban_carbone_ceramique:3,
    diaphragme_gravitonique:1,
    micro_heatpipe_quantique:2
  })},
  helion_titan:{costs:costs({
    panneau_titane_nid_abeille:4,
    ruban_carbone_ceramique:3,
    bobine_supraconductrice:3,
    ruban_alliage_memoire:1
  })},
  vesperion:{costs:costs({
    ruban_alliage_memoire:14,
    tresse_optique_quantique:15,
    plaque_matiere_noire:5,
    stabilisateur_dimensionnel:6
  }, 100_000_000)},
  nyxaris:{costs:costs({
    injecteur_ionique_miniature:13,
    ruban_alliage_memoire:14,
    roulement_magnetique:5,
    noyau_fusion_miniature:6
  }, 100_000_000)},
  asterion:{costs:costs({
    micro_heatpipe_quantique:20,
    diaphragme_gravitonique:12,
    bobine_plasma_solaire:4,
    roulement_magnetique:6
  }, 100_000_000)},
  laser_mk1:{costs:costs({
    lentilles_optiques:1,
    cables_cuivre:1,
    plaques_acier:1
  })},
  laser_mk2:{costs:costs({
    cables_cuivre:2,
    plaques_acier:3,
    lentille_focalisation_dopee:1
  })},
  laser_mk3:{costs:costs({
    cables_cuivre:7,
    plaques_acier:8,
    lentille_focalisation_dopee:3,
    cartouche_aerogel_cryogenique:2
  })},
  laser_mk4:{costs:costs({
    bobine_supraconductrice:5,
    lentille_focalisation_dopee:4,
    micro_heatpipe_quantique:3,
    prisme_phase:2
  })},
  laser_elite_green:{costs:costs({
    prisme_phase:8,
    tresse_optique_quantique:6,
    bobine_plasma_solaire:3,
    capsule_nanoreparation:3
  }, 25_000_000)},
  laser_elite_blue:{costs:costs({
    capsule_fluide_neutronique:8,
    micro_heatpipe_quantique:6,
    cristal_phase_encapsule:4,
    injecteur_vide:3
  }, 25_000_000)},
  laser_elite_red:{costs:costs({
    cartouche_plasma_condense:8,
    ruban_alliage_memoire:6,
    noyau_fusion_miniature:4,
    bobine_plasma_solaire:3
  }, 25_000_000)},
  shield_gen:{costs:costs({
    plaques_acier:2,
    condensateurs_ceramiques:1,
    polymere_isolant:1
  })},
  shield_omega:{costs:costs({
    condensateurs_ceramiques:3,
    polymere_isolant:5,
    panneau_titane_nid_abeille:2,
    gyroscope_stabilise:1
  })},
  engine_ion:{costs:costs({
    reservoirs_pressurises:1,
    poudre_propulsive:2,
    circuits_imprimes:1
  })},
  reactor_ion:{costs:costs({
    poudre_propulsive:5,
    circuits_imprimes:3,
    bobine_supraconductrice:1,
    micro_pompe_cryogenique:1
  })}
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

function normalizeCosts(value){
  const source = value && typeof value === "object" ? value : {};
  return Object.freeze({
    materials:Object.freeze(Object.fromEntries(Object.entries(source.materials || {})
      .map(([id, amount])=>[id, Math.max(0, Math.floor(Number(amount || 0)))])
      .filter(([, amount])=>amount > 0))),
    credits:Math.max(0, Math.floor(Number(source.credits || 0))),
    premium:Math.max(0, Math.floor(Number(source.premium || 0)))
  });
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
  const override = CRAFT_RECIPE_OVERRIDES[source.id] || null;
  const recipeCosts = normalizeCosts(override?.costs || buildCosts(source, category, rarityTier));
  const finalCosts = options.freeCurrency ? normalizeCosts({...recipeCosts, credits:0, premium:0}) : recipeCosts;
  const idCategory = options.idCategory || category;
  return Object.freeze({
    id:(options.recipeId || `craft_${idCategory}_${source.id}`).replace(/[^a-zA-Z0-9_:-]/g, "_"),
    category,
    name:source.name || source.label || source.id,
    short:source.short || source.name || source.id,
    img:source.img || source.asset || "assets/equipment/module_munitions.svg",
    rarity:source.rarity || options.rarity || rarityTier,
    rarityTier,
    desc:source.desc || source.shopDesc || "",
    durationMs:CRAFT_DURATION_MS,
    costs:finalCosts,
    output:Object.freeze(output)
  });
}

function isCraftableItem(item){
  if(!item?.id || NON_CRAFTABLE_ITEM_IDS.has(item.id)) return false;
  return item.shop !== false || FORCE_CRAFTABLE_ITEM_IDS.has(item.id);
}

function craftAmmoOutputAmount(ammo){
  if(ammo.weaponClass === "laser") return 10_000;
  if(ammo.weaponClass === "rocket" || ammo.weaponClass === "missile") return 100;
  return Math.max(1, Math.floor(Number(ammo.amount || 1)));
}

function buildCraftRecipes(){
  const itemRecipes = equipment
    .filter(isCraftableItem)
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
      amount:craftAmmoOutputAmount(ammo)
    }, {freeCurrency:true}));

  const shipRecipes = ships
    .filter(ship=>!NON_CRAFTABLE_SHIP_IDS.has(ship.id))
    .map(ship=>recipeFromSource(ship, "ship", {
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

  const formationRecipes = droneFormations.map(formation=>recipeFromSource(formation, "drone", {
    type:"formation",
    id:formation.id,
    amount:1
  }, {idCategory:"formation"}));

  const boosterRecipes = S1_BOOSTER_SHOP.map(booster=>recipeFromSource({
    ...booster,
    rarityTier:"veryRare",
    rarity:"Booster"
  }, "booster", {
    type:"booster",
    id:booster.id,
    boosterType:booster.type,
    series:"s1",
    amount:1,
    durationMs:booster.durationMs || S1_BOOSTER_DURATION_MS
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
