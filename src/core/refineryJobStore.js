import { refineryRecipes } from "../data/catalog.js";
import { addMaterial, consumeMaterial, getMaterialCount } from "./cargoStore.js";
import { getRawMaterial, store } from "./store.js";

export function getRefineryJob(){
  return store.state.refineryJob || null;
}

export function isRefineryComplete(){
  const job = getRefineryJob();
  return Boolean(job && Number(job.endsAt || 0) <= Date.now());
}

export function startRefineryJob(recipeId){
  if(getRefineryJob()) return {ok:false, reason:"Le raffineur est deja occupe."};
  const recipe = refineryRecipes.find(item=>item.id === recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  for(const [materialId, amount] of Object.entries(recipe.costs || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Materiaux insuffisants : ${getRawMaterial(materialId).name || materialId}.`};
  }
  for(const [materialId, amount] of Object.entries(recipe.costs || {})) consumeMaterial(materialId, amount);
  store.state.refineryJob = {
    recipeId:recipe.id,
    startedAt:Date.now(),
    endsAt:Date.now() + Number(recipe.durationMs || 0)
  };
  return {ok:true, recipe};
}

export function claimRefineryJob(){
  const job = getRefineryJob();
  if(!job) return {ok:false, reason:"Aucun raffinage en cours."};
  if(!isRefineryComplete()) return {ok:false, reason:"Raffinage non termine."};
  const recipe = refineryRecipes.find(item=>item.id === job.recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette invalide."};
  addMaterial(recipe.outputId, recipe.outputAmount || 1);
  store.state.refineryJob = null;
  return {ok:true, recipe};
}
