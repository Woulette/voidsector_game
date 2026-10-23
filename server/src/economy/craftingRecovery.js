import { getCraftCurrencySelection, getCraftRecipe, getRedundantCraftOutputReason } from "../../../src/data/craftingRecipes.js";
import { appendProfileActivity } from "../players/activityLog.js";
import { sanitizeCraftingCosts } from "./craftingJobs.js";

function getRefundCosts(job, recipe){
  if(Object.hasOwn(job, "paidCosts")){
    const costs = sanitizeCraftingCosts(job.paidCosts);
    return costs ? {...costs, source:"paid-costs"} : null;
  }
  // Historical jobs did not retain their payment. Compensate fixed-price
  // unique outputs once at the server recipe's nominal rate. Never guess
  // a currency for an old recipe offering a choice.
  const currency = getCraftCurrencySelection(recipe);
  if(!currency.ok) return null;
  const costs = sanitizeCraftingCosts({version:1, ...currency, materials:recipe.costs?.materials || {}});
  return costs ? {...costs, source:"legacy-recipe"} : null;
}

export function refundRedundantCraftingJob(profile, {now = Date.now()} = {}){
  const job = profile?.craftingJob;
  if(!job) return {ok:false, reason:"Aucune fabrication en cours."};
  const recipe = getCraftRecipe(job.recipeId);
  if(!recipe) return {ok:false, reason:"Recette de fabrication invalide."};
  const reason = getRedundantCraftOutputReason(recipe, profile);
  if(!reason) return {ok:false, code:"CRAFT_NOT_REDUNDANT", reason:"Cette fabrication peut encore etre recuperee."};
  const refund = getRefundCosts(job, recipe);
  if(!refund) return {ok:false, code:"CRAFT_REFUND_UNVERIFIED", reason:"Cout de fabrication non verifiable. Contacte le support."};
  const credits = Number(profile.player?.credits || 0) + refund.credits;
  const premium = Number(profile.player?.premium || 0) + refund.premium;
  const materials = Object.fromEntries(Object.entries(refund.materials).map(([id, amount])=>[
    id, Math.max(0, Number(profile.cargoHold?.[id] || 0)) + amount
  ]));
  if(![credits, premium, ...Object.values(materials)].every(value=>Number.isSafeInteger(value) && value >= 0)){
    return {ok:false, reason:"Solde de remboursement invalide."};
  }
  profile.player = {...profile.player, credits, premium};
  profile.cargoHold = {...profile.cargoHold, ...materials};
  profile.craftingJob = null;
  appendProfileActivity(profile, {
    id:`craft-refund-${job.id || `${recipe.id}-${job.startedAt}`}`,
    type:"craft_refund", label:"Fabrication remboursee",
    detail:`${recipe.name} : ${reason} Ressources et paiement rembourses, chantier libere.`,
    data:{recipeId:recipe.id, source:refund.source, credits:refund.credits, premium:refund.premium}
  }, now);
  return {ok:true, action:"job-refund", recipe, job:null, output:null, refund, reason};
}
