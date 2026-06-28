import { droneFormations } from "../../../src/data/equipment.js";
import { rawMaterialCatalog } from "../../../src/data/progression.js";
import { getCraftRecipe } from "../../../src/data/craftingRecipes.js";
import { addPlayerBoosterUnits } from "../../../src/shared/firmBoosters.js";
import { addInventoryItemAmount } from "./inventoryStacks.js";
import { getServerAmmo, getServerDroneCatalog, getServerItem, getServerShip, makeEmptyLoadout } from "./equipment.js";
import { spendCurrency } from "../players/progression.js";

function getCraftMaterial(id){
  return rawMaterialCatalog.find(material=>material.id === id) || null;
}

function getMaterialCount(profile, id){
  return Math.max(0, Number(profile?.cargoHold?.[id] || 0));
}

function consumeMaterial(profile, id, amount){
  const material = getCraftMaterial(id);
  const need = Math.max(0, Math.round(Number(amount || 0)));
  if(!material || need <= 0) return false;
  if(getMaterialCount(profile, id) < need) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[id] = getMaterialCount(profile, id) - need;
  return true;
}

function publicRecipe(recipe){
  if(!recipe) return null;
  return {
    id:recipe.id,
    category:recipe.category,
    name:recipe.name,
    img:recipe.img,
    rarity:recipe.rarity,
    rarityTier:recipe.rarityTier,
    durationMs:recipe.durationMs,
    costs:recipe.costs,
    output:recipe.output
  };
}

function sanitizeCraftingJob(job, recipe){
  const startedAt = Math.max(0, Number(job?.startedAt || Date.now()));
  const durationMs = Math.max(1, Number(job?.durationMs || recipe?.durationMs || 60_000));
  const endsAt = Math.max(startedAt, Number(job?.endsAt || job?.finishAt || startedAt + durationMs));
  return {
    recipeId:recipe.id,
    startedAt,
    endsAt,
    durationMs
  };
}

function spendCraftCurrency(profile, recipe){
  const costs = recipe.costs || {};
  let player = profile.player || {};
  const credits = spendCurrency(player, "credits", costs.credits || 0);
  if(!credits.ok) return credits;
  player = credits.player;
  const premium = spendCurrency(player, "premium", costs.premium || 0);
  if(!premium.ok) return premium;
  profile.player = premium.player;
  return {
    ok:true,
    credits:credits.cost || 0,
    premium:premium.cost || 0
  };
}

function validateCraftMaterials(profile, recipe){
  for(const [materialId, amount] of Object.entries(recipe.costs?.materials || {})){
    const material = getCraftMaterial(materialId);
    if(!material) return {ok:false, reason:`Ressource inconnue : ${materialId}.`};
    if(getMaterialCount(profile, materialId) < Math.max(0, Number(amount || 0))){
      return {ok:false, reason:`Ressources insuffisantes : ${material.name || materialId}.`};
    }
  }
  return {ok:true};
}

function validateCraftOutputAvailability(profile, recipe){
  const output = recipe?.output || {};
  const outputId = String(output.id || "");
  if(output.type === "ship" && Array.isArray(profile.ownedShips) && profile.ownedShips.map(String).includes(outputId)){
    return {ok:false, reason:"Vaisseau deja possede."};
  }
  if(output.type === "formation" && Array.isArray(profile.ownedDroneFormations) && profile.ownedDroneFormations.map(String).includes(outputId)){
    return {ok:false, reason:"Formation deja possedee."};
  }
  if(output.type === "drone"){
    const drone = getServerDroneCatalog();
    const maxOwned = Math.max(0, Number(drone.maxOwned || 10));
    if(Math.max(0, Math.floor(Number(profile.ownedDroneCount || 0))) >= maxOwned){
      return {ok:false, reason:`Limite de drones atteinte (${maxOwned}/${maxOwned}).`};
    }
  }
  return {ok:true};
}

function consumeCraftMaterials(profile, recipe){
  const consumed = {};
  for(const [materialId, amount] of Object.entries(recipe.costs?.materials || {})){
    const count = Math.max(0, Number(amount || 0));
    if(count <= 0) continue;
    if(!consumeMaterial(profile, materialId, count)) return {ok:false, reason:"Ressources insuffisantes."};
    consumed[materialId] = count;
  }
  return {ok:true, consumed};
}

function ensureShipOwnedByCraft(profile, shipId){
  const ship = getServerShip(shipId);
  if(!ship) return {ok:false, reason:"Vaisseau introuvable."};
  if(!Array.isArray(profile.ownedShips)) profile.ownedShips = ["orion"];
  if(profile.ownedShips.map(String).includes(ship.id)) return {ok:false, reason:"Vaisseau deja possede."};
  profile.ownedShips.push(ship.id);
  if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
  if(!profile.shipLoadouts[ship.id]) profile.shipLoadouts[ship.id] = makeEmptyLoadout(ship.id);
  return {ok:true, ship:{id:ship.id, name:ship.name}};
}

function grantItemOutput(profile, itemId, amount){
  const item = getServerItem(itemId);
  if(!item) return {ok:false, reason:"Objet introuvable."};
  const count = Math.max(1, Math.floor(Number(amount || 1)));
  for(let i = 0; i < count; i += 1) addInventoryItemAmount(profile, item.id, 1);
  return {ok:true, item:{id:item.id, name:item.name}, amount:count};
}

function grantAmmoOutput(profile, ammoId, amount){
  const ammo = getServerAmmo(ammoId);
  if(!ammo) return {ok:false, reason:"Munition introuvable."};
  const count = Math.max(1, Math.floor(Number(amount || 1)));
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  profile.ammoInventory[ammo.id] = Math.max(0, Number(profile.ammoInventory[ammo.id] || 0)) + count;
  return {ok:true, ammo:{id:ammo.id, name:ammo.name}, amount:count};
}

function grantDroneOutput(profile, droneId){
  const drone = getServerDroneCatalog();
  if(String(drone.id || "combat_drone") !== String(droneId || "combat_drone")) return {ok:false, reason:"Drone introuvable."};
  const maxOwned = Math.max(0, Number(drone.maxOwned || 10));
  const current = Math.max(0, Math.floor(Number(profile.ownedDroneCount || 0)));
  if(current >= maxOwned) return {ok:false, reason:`Limite de drones atteinte (${maxOwned}/${maxOwned}).`};
  profile.ownedDroneCount = current + 1;
  if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
  while(profile.droneLoadout.length < profile.ownedDroneCount) profile.droneLoadout.push(null);
  if(profile.droneLoadout.length > profile.ownedDroneCount) profile.droneLoadout.length = profile.ownedDroneCount;
  return {ok:true, drone:{id:drone.id || "combat_drone", name:drone.name || "Drone"}, nextCount:profile.ownedDroneCount};
}

function grantFormationOutput(profile, formationId){
  const formation = droneFormations.find(entry=>entry.id === formationId) || null;
  if(!formation) return {ok:false, reason:"Formation introuvable."};
  if(!Array.isArray(profile.ownedDroneFormations)) profile.ownedDroneFormations = ["base"];
  if(profile.ownedDroneFormations.map(String).includes(formation.id)) return {ok:false, reason:"Formation deja possedee."};
  profile.ownedDroneFormations.push(formation.id);
  return {ok:true, formation:{id:formation.id, name:formation.name}};
}

function grantBoosterOutput(profile, output){
  const type = String(output.boosterType || "").trim();
  if(!type) return {ok:false, reason:"Booster introuvable."};
  const quantity = Math.max(1, Math.floor(Number(output.amount || 1)));
  profile.boosters = addPlayerBoosterUnits(profile.boosters, {
    series:"s1",
    type,
    quantity,
    now:Date.now()
  });
  return {ok:true, booster:{id:output.id, type, series:"s1"}, amount:quantity};
}

function grantCraftOutput(profile, recipe){
  const output = recipe.output || {};
  if(output.type === "item") return grantItemOutput(profile, output.id, output.amount);
  if(output.type === "ammo") return grantAmmoOutput(profile, output.id, output.amount);
  if(output.type === "ship") return ensureShipOwnedByCraft(profile, output.id);
  if(output.type === "drone") return grantDroneOutput(profile, output.id);
  if(output.type === "formation") return grantFormationOutput(profile, output.id);
  if(output.type === "booster") return grantBoosterOutput(profile, output);
  return {ok:false, reason:"Sortie de craft invalide."};
}

export function startServerCraftingJob(profile, {recipeId, now = Date.now()} = {}){
  const recipe = getCraftRecipe(recipeId);
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  if(profile.craftingJob) return {ok:false, reason:"Une fabrication est deja en cours."};

  const availability = validateCraftOutputAvailability(profile, recipe);
  if(!availability.ok) return availability;
  const materialCheck = validateCraftMaterials(profile, recipe);
  if(!materialCheck.ok) return materialCheck;

  const currency = spendCraftCurrency(profile, recipe);
  if(!currency.ok) return currency;
  const materials = consumeCraftMaterials(profile, recipe);
  if(!materials.ok) return materials;

  profile.craftingJob = sanitizeCraftingJob({
    recipeId:recipe.id,
    startedAt:now,
    endsAt:now + Math.max(1, Number(recipe.durationMs || 60_000)),
    durationMs:Math.max(1, Number(recipe.durationMs || 60_000))
  }, recipe);

  return {
    ok:true,
    action:"job-start",
    recipe:publicRecipe(recipe),
    job:profile.craftingJob,
    costs:{credits:currency.credits, premium:currency.premium, materials:materials.consumed || {}}
  };
}

export function claimServerCraftingJob(profile, {now = Date.now()} = {}){
  const job = profile.craftingJob;
  if(!job) return {ok:false, reason:"Aucune fabrication en cours."};
  const recipe = getCraftRecipe(job.recipeId);
  if(!recipe) return {ok:false, reason:"Recette de fabrication invalide."};
  const cleanJob = sanitizeCraftingJob(job, recipe);
  if(Number(cleanJob.endsAt || 0) > Number(now || Date.now())) return {ok:false, reason:"Fabrication non terminee."};

  const availability = validateCraftOutputAvailability({...profile, craftingJob:null}, recipe);
  if(!availability.ok) return availability;
  const output = grantCraftOutput(profile, recipe);
  if(!output.ok) return output;
  profile.craftingJob = null;

  return {
    ok:true,
    action:"job-claim",
    recipe:publicRecipe(recipe),
    output,
    job:null
  };
}
