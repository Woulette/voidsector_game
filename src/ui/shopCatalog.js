import { ships } from "../data/ships.js";
import { ammoTypes, droneCatalog, droneFormations, equipment } from "../data/equipment.js";
import { premiumShopPacks } from "../data/premium.js?v=20261024-boutique3";
import { S1_BOOSTER_SHOP } from "../shared/firmBoosters.js";
import { canAccountRoleAccessShip } from "../data/ships.js";

export const SHOP_CATEGORIES = Object.freeze([
  {id:"vaisseau", label:"Vaisseaux", icon:"ship", title:"Vaisseaux"},
  {id:"canon", label:"Armes", icon:"weapon", title:"Armes"},
  {id:"munition", label:"Munitions", icon:"ammo", title:"Munitions"},
  {id:"generateur", label:"Générateurs", icon:"generator", title:"Générateurs"},
  {id:"drone", label:"Drones", icon:"drone", title:"Drones et formations"},
  {id:"extra", label:"Extras", icon:"extra", title:"Extras"},
  {id:"booster", label:"Boosters", icon:"booster", title:"Boosters"},
  {id:"premium", label:"Premium", icon:"premium", title:"Pass Premium"},
  {id:"owned", label:"Possédés", icon:"check", title:"Articles possédés"}
]);

export const shopProductKey = product=>`${product.kind}:${product.id}`;
export const normalizeShopSearch = value=>String(value || "").slice(0,120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function buildShopCatalog(role){
  return [
    ...ships.filter(ship=>canAccountRoleAccessShip(ship, role)).map(data=>({kind:"ship", category:"vaisseau", id:data.id, data})),
    ...equipment.filter(item=>item.shop !== false && (item.shopCategory || item.category) !== "module").map(data=>({kind:"item", category:data.shopCategory || data.category, id:data.id, data})),
    ...ammoTypes.filter(ammo=>ammo.shop !== false).map(data=>({kind:"ammo", category:"munition", id:data.id, data})),
    ...droneCatalog.map(data=>({kind:"drone", category:"drone", id:data.id, data})),
    ...droneFormations.map(data=>({kind:"droneFormation", category:"drone", id:data.id, data})),
    ...S1_BOOSTER_SHOP.map(data=>({kind:"booster", category:"booster", id:data.id, data})),
    ...premiumShopPacks.map(data=>({kind:"premiumPack", category:"premium", id:data.id, data}))
  ];
}

export function filterShopProducts(products, category, query = ""){
  const terms = normalizeShopSearch(query).match(/[a-z0-9]+/g) || [];
  return products.filter(product=>{
    if(category === "owned" ? !product.owned : product.category !== category) return false;
    const text = normalizeShopSearch(`${product.name} ${product.subtitle} ${product.rarity} ${product.searchTerms || ""}`);
    const words = text.match(/[a-z0-9]+/g) || [];
    return terms.every(term=>words.some(word=>word.startsWith(term)));
  });
}

export function paginateShopProducts(products, selectedKey, pageSize = 9){
  const size = Math.max(1,Math.floor(Number(pageSize) || 9));
  const selectedIndex = Math.max(0,products.findIndex(p=>p.key === selectedKey));
  const page = Math.floor(selectedIndex/size), start = page*size;
  return {items:products.slice(start,start+size),page,pages:Math.ceil(products.length/size),start,end:Math.min(start+size,products.length),
    previous:products[Math.max(0,start-size)]?.key || "",next:products[start+size]?.key || ""};
}
