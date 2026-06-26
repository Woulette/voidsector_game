export const MATERIAL_COMMERCE_PRICES = Object.freeze({
  cuivre_orbital:5,
  zinc_spatial:5,
  nickel_brut:5,
  titane_fissure:5,
  silice_conductrice:5,
  alliage_cuivre_zinc:100,
  plaque_nickel_titane:100,
  conducteur_renforce:2500,
  blindage_composite:2500,
  noyau_astra:10000
});

export const MATERIAL_COMMERCE_ORDER = Object.freeze([
  "cuivre_orbital",
  "zinc_spatial",
  "nickel_brut",
  "titane_fissure",
  "silice_conductrice",
  "alliage_cuivre_zinc",
  "plaque_nickel_titane",
  "conducteur_renforce",
  "blindage_composite",
  "noyau_astra"
]);

export function getMaterialCommerceUnitPrice(materialId){
  return Math.max(0, Math.round(Number(MATERIAL_COMMERCE_PRICES[String(materialId || "")] || 0)));
}

export function isMaterialCommerceSellable(materialId){
  return getMaterialCommerceUnitPrice(materialId) > 0;
}

export function getMaterialCommerceValue(materialId, amount = 0){
  const count = Math.max(0, Math.floor(Number(amount || 0)));
  return count * getMaterialCommerceUnitPrice(materialId);
}
