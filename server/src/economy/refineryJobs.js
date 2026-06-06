import { refineryRecipes } from "../../../src/data/catalog.js";
import { addMaterial, consumeMaterial, getMaterialCount, getRawMaterial } from "./refineryProfile.js";

export function startServerRefineryJob(profile, {recipeId, now = Date.now()} = {}){
  if(profile.refineryJob) return {ok:false, reason:"Le raffineur est deja occupe."};
  const recipe = refineryRecipes.find(item=>item.id === recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  for(const [materialId, amount] of Object.entries(recipe.costs || {})){
    if(getMaterialCount(profile, materialId) < amount) return {ok:false, reason:`Materiaux insuffisants : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  for(const [materialId, amount] of Object.entries(recipe.costs || {})) consumeMaterial(profile, materialId, amount);
  profile.refineryJob = {
    recipeId:recipe.id,
    startedAt:now,
    endsAt:now + Number(recipe.durationMs || 0)
  };
  return {ok:true, recipe:{id:recipe.id, name:recipe.name, outputId:recipe.outputId, outputAmount:recipe.outputAmount}};
}

export function claimServerRefineryJob(profile, {now = Date.now()} = {}){
  const job = profile.refineryJob;
  if(!job) return {ok:false, reason:"Aucun raffinage en cours."};
  if(Number(job.endsAt || 0) > now) return {ok:false, reason:"Raffinage non termine."};
  const recipe = refineryRecipes.find(item=>item.id === job.recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette invalide."};
  addMaterial(profile, recipe.outputId, recipe.outputAmount || 1);
  profile.refineryJob = null;
  return {ok:true, recipe:{id:recipe.id, name:recipe.name, outputId:recipe.outputId, outputAmount:recipe.outputAmount}};
}
