import { appendProfileActivity } from "./activityLog.js";
import { sanitizeCraftingCosts } from "../economy/craftingJobs.js";

const SHIP_ID = "imperial";
const RECIPE_ID = "craft_ship_imperial";
const SHIP_FIELDS = ["shipLoadouts", "shipCargo", "shipAbilityStates", "shipWorldSessions", "actionSlotsByShip"];
// Frozen historical recipe, used only to recover jobs created before payment receipts.
const LEGACY_COSTS = Object.freeze({
  version:1, credits:0, premium:0, paymentType:"all",
  materials:{injecteur_vide:15, plaque_matiere_noire:16, plaque_astrometallique:7, ampoule_condensat_vide:8}
});

function recoveryError(message){
  return Object.assign(new Error(message), {retiredShipRecovery:true});
}

function addAmount(current, amount){
  const next = Number(current || 0) + Number(amount || 0);
  if(!Number.isSafeInteger(next) || next < 0) throw recoveryError("Invalid retired ship recovery balance.");
  return next;
}

export function recoverRetiredShipProfile(raw = {}, {now = Date.now()} = {}){
  const retiredJob = raw.craftingJob?.recipeId === RECIPE_ID;
  const changed = retiredJob || raw.activeShip === SHIP_ID || raw.selectedShip === SHIP_ID
    || (Array.isArray(raw.ownedShips) && raw.ownedShips.includes(SHIP_ID)) || raw.worldSession?.shipId === SHIP_ID
    || SHIP_FIELDS.some(field=>Object.hasOwn(raw[field] || {}, SHIP_ID));
  if(!changed) return {profile:raw, changed:false};
  const profile = JSON.parse(JSON.stringify(raw));
  let refund = null;
  if(retiredJob){
    refund = Object.hasOwn(profile.craftingJob, "paidCosts")
      ? sanitizeCraftingCosts(profile.craftingJob.paidCosts)
      : LEGACY_COSTS;
    if(!refund) throw recoveryError("The retired ship craft has an unverifiable payment receipt.");
    profile.player = {...profile.player,
      credits:addAmount(profile.player?.credits, refund.credits),
      premium:addAmount(profile.player?.premium, refund.premium)};
    profile.cargoHold = {...profile.cargoHold};
    for(const [id, amount] of Object.entries(refund.materials)){
      profile.cargoHold[id] = addAmount(profile.cargoHold[id], amount);
    }
    profile.craftingJob = null;
  }
  profile.cargoHold = {...profile.cargoHold};
  for(const [id, amount] of Object.entries(profile.shipCargo?.[SHIP_ID] || {})){
    profile.cargoHold[id] = addAmount(profile.cargoHold[id], amount);
  }
  profile.ownedShips = (Array.isArray(profile.ownedShips) ? profile.ownedShips : []).filter(id=>id !== SHIP_ID);
  if(!profile.ownedShips.includes("orion")) profile.ownedShips.unshift("orion");
  if(profile.activeShip === SHIP_ID) profile.activeShip = "orion";
  if(profile.selectedShip === SHIP_ID) profile.selectedShip = profile.activeShip || "orion";
  for(const field of SHIP_FIELDS) if(profile[field]) delete profile[field][SHIP_ID];
  if(profile.worldSession?.shipId === SHIP_ID) profile.worldSession = null;
  appendProfileActivity(profile, {
    type:"ship_retired", label:"Vaisseau retire du jeu",
    detail:`Impérial retiré. Équipements conservés dans l'inventaire et soute transférée au stockage.${refund ? " Fabrication remboursée et chantier libéré." : ""}`,
    data:{shipId:SHIP_ID, craftRefunded:Boolean(refund)}
  }, now);
  return {profile, changed:true};
}

export async function persistRetiredShipRecoveries(entries, repaired, persistProfileEntries){
  const changed = entries.filter(([, profile])=>repaired.has(profile));
  if(!changed.length) return;
  for(const [, profile] of changed) profile.updatedAt = Math.max(Date.now(), Number(profile.updatedAt || 0) + 1);
  try{
    await persistProfileEntries(changed);
  }catch(error){
    error.retiredShipRecovery = true;
    throw error;
  }
}
