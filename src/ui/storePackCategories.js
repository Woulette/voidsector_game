import { starterPacks } from "../data/premium.js?v=20261024-boutique3";

// Families describe the shop, while prices and rewards stay in the catalogue.
// A future family becomes selectable only when it has a real offer.
const packCategoryDefinitions = [
  {id:"all",label:"Tous",icon:"gift"},
  {id:"ships",label:"Vaisseaux",icon:"ship"},
  {id:"boosters",label:"Boosters",icon:"booster"},
  {id:"lasers",label:"Lasers",icon:"weapon"},
  {id:"resources",label:"Ressources",icon:"cargo"}
];

export function getStorePackCategoryId(pack){
  if(packCategoryDefinitions.some(category=>category.id !== "all" && category.id === pack?.category)) return pack.category;
  return pack?.contents?.some(item=>item.kind === "ship") ? "ships" : null;
}

export function getStorePackCategories(packs = starterPacks){
  return packCategoryDefinitions.map(category=>{
    const count = category.id === "all" ? packs.length : packs.filter(pack=>getStorePackCategoryId(pack) === category.id).length;
    return {...category,count,available:category.id === "all" || count > 0};
  });
}

export function isStorePackCategoryAvailable(value, packs = starterPacks){
  return getStorePackCategories(packs).some(category=>category.id === value && category.available);
}

export function normalizeStorePackCategory(value, packs = starterPacks){
  return isStorePackCategoryAvailable(value,packs) ? value : "all";
}

export function getStorePacksForCategory(value, packs = starterPacks){
  const category = normalizeStorePackCategory(value,packs);
  return category === "all" ? [...packs] : packs.filter(pack=>getStorePackCategoryId(pack) === category);
}
