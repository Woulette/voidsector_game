import { getCraftRecipe } from "../../../src/data/craftingRecipes.js";
import { rawMaterialCatalog } from "../../../src/data/progression.js";

const materialIds = new Set(rawMaterialCatalog.map(material=>material.id));
const validAmount = value=>typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function sanitizeCraftingCosts(value){
  if(!value || value.version !== 1 || !validAmount(value.credits) || !validAmount(value.premium)) return null;
  if(!["all", "credits", "premium"].includes(value.paymentType)) return null;
  if(value.paymentType === "credits" && value.premium !== 0) return null;
  if(value.paymentType === "premium" && value.credits !== 0) return null;
  if(!value.materials || typeof value.materials !== "object" || Array.isArray(value.materials)) return null;
  const materials = {};
  for(const [id, amount] of Object.entries(value.materials)){
    if(!materialIds.has(id) || !validAmount(amount)) return null;
    if(amount > 0) materials[id] = amount;
  }
  return {version:1, paymentType:value.paymentType, credits:value.credits, premium:value.premium, materials};
}

export function sanitizeCraftingJob(value, recipe = getCraftRecipe(value?.recipeId)){
  if(!value || typeof value !== "object" || Array.isArray(value) || !recipe) return null;
  const startedAt = Math.max(0, Number(value.startedAt || Date.now()));
  const durationMs = Math.max(1, Number(value.durationMs || recipe.durationMs || 60_000));
  const endsAt = Math.max(startedAt, Number(value.endsAt || value.finishAt || startedAt + durationMs));
  const job = {recipeId:recipe.id, startedAt, endsAt, durationMs};
  if(value.id) job.id = String(value.id).slice(0, 80);
  // Distinguish an invalid receipt from a historical job without a receipt.
  if(Object.hasOwn(value, "paidCosts")) job.paidCosts = sanitizeCraftingCosts(value.paidCosts);
  return job;
}
