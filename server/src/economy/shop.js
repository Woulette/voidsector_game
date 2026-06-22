import { ships } from "../../../src/data/catalog.js";

import { premiumShopPacks } from "../../../src/data/premium.js";
import { S1_BOOSTER_SHOP } from "../../../src/shared/firmBoosters.js";

export const SERVER_AMMO_SHOP = {
  ammo_x1:{id:"ammo_x1", name:"Munition M-1", priceType:"credits", price:10000, amount:1000},
  ammo_x2:{id:"ammo_x2", name:"Munition M-2", priceType:"credits", price:50000, amount:1000},
  ammo_x3:{id:"ammo_x3", name:"Munition M-3", priceType:"premium", price:300, amount:1000},
  ammo_x4:{id:"ammo_x4", name:"Munition M-4", priceType:"premium", price:800, amount:1000},
  rocket_r1:{id:"rocket_r1", name:"Roquette R-1", priceType:"credits", price:100, amount:1},
  rocket_r2:{id:"rocket_r2", name:"Roquette R-2", priceType:"credits", price:500, amount:1},
  rocket_r3:{id:"rocket_r3", name:"Roquette R-3", priceType:"premium", price:2, amount:1},
  missile_m1:{id:"missile_m1", name:"Missile R-1", priceType:"credits", price:1000, amount:1},
  missile_m2:{id:"missile_m2", name:"Missile R-2", priceType:"premium", price:3, amount:1}
};

export const SERVER_ITEM_SHOP = {
  laser_mk1:{id:"laser_mk1", name:"Canon Laser MK-I", priceType:"credits", price:25000},
  laser_mk2:{id:"laser_mk2", name:"Canon Laser MK-II", priceType:"credits", price:250000},
  laser_mk3:{id:"laser_mk3", name:"Canon Laser MK-III", priceType:"premium", price:5000},
  shield_gen:{id:"shield_gen", name:"Generateur A I", priceType:"credits", price:150000},
  shield_omega:{id:"shield_omega", name:"Generateur A II", priceType:"premium", price:2500},
  engine_ion:{id:"engine_ion", name:"Generateur de Vitesse MK-I", priceType:"credits", price:125000},
  reactor_ion:{id:"reactor_ion", name:"Generateur de Vitesse MK-II", priceType:"premium", price:2000},
  launcher_missile_mk1:{id:"launcher_missile_mk1", name:"Lance Missile MK-I", priceType:"credits", price:500000},
  launcher_rocket_mk1:{id:"launcher_rocket_mk1", name:"Lance Roquette MK-I", priceType:"credits", price:150000},
  extra_auto_rocket:{id:"extra_auto_rocket", name:"Puce Roquette Auto", priceType:"premium", price:25000},
  extra_auto_missile:{id:"extra_auto_missile", name:"Puce Missile Auto", priceType:"premium", price:30000},
  extra_rocket_accelerator:{id:"extra_rocket_accelerator", name:"Puce Accelerateur Roquettes", priceType:"premium", price:35000},
  extra_repair_starter:{id:"extra_repair_starter", name:"Drone de Reparation Bleu", priceType:"credits", price:100000},
  extra_repair_yellow:{id:"extra_repair_yellow", name:"Drone de Reparation Jaune", priceType:"credits", price:850000},
  extra_repair_bot:{id:"extra_repair_bot", name:"Drone de Reparation Rouge", priceType:"premium", price:7000},
  extra_repair_auto:{id:"extra_repair_auto", name:"IA d'Auto-Reparation", priceType:"premium", price:20000},
  teleportation_fluid:{id:"teleportation_fluid", name:"Fluide de Teleportation", priceType:"premium", price:100}
};

export const SERVER_SHIP_SHOP = Object.fromEntries(ships.map(ship=>[
  ship.id,
  {
    id:ship.id,
    name:ship.name,
    priceType:ship.priceType || "credits",
    price:Number(ship.price || 0),
    requiresCompletedPortal:ship.requiresCompletedPortal || ship.requiresPortalCompletion || (ship.skillShip ? "violet" : null)
  }
]));

export const SERVER_DRONE_SHOP = {
  combat_drone:{id:"combat_drone", name:"Drone de Combat", priceType:"credits", basePrice:200000, maxOwned:10}
};

export const SERVER_DRONE_FORMATION_SHOP = {
  base:{id:"base", name:"Formation Base", priceType:"credits", price:0},
  cuirasse:{id:"cuirasse", name:"Formation Cuirasse", priceType:"premium", price:50000},
  tir:{id:"tir", name:"Formation Tir", priceType:"premium", price:50000},
  vitesse:{id:"vitesse", name:"Formation Vitesse", priceType:"premium", price:50000}
};

export const SERVER_PREMIUM_PACK_SHOP = Object.fromEntries(premiumShopPacks.map(pack=>[
  pack.id,
  {
    id:pack.id,
    name:pack.name,
    priceType:pack.priceType,
    price:Number(pack.price || 0),
    days:Number(pack.days || 0),
    realPrice:pack.realPrice || ""
  }
]));

export const SERVER_BOOSTER_SHOP = Object.fromEntries(S1_BOOSTER_SHOP.map(booster=>[
  booster.id,
  {
    id:booster.id,
    type:booster.type,
    name:booster.name,
    priceType:booster.priceType,
    price:Number(booster.price || 0),
    durationMs:Number(booster.durationMs || 0),
    percent:Number(booster.percent || 0)
  }
]));

export function normalizeShopMultiplier(value){
  const count = Number(value || 1);
  return [1, 10, 100, 1000].includes(count) ? count : 1;
}

export function normalizeBoosterQuantity(value){
  const count = Number(value || 1);
  return [1, 10, 50, 100].includes(count) ? count : 1;
}

export function getAmmoPurchase(id, multiplier = 1){
  const ammo = SERVER_AMMO_SHOP[String(id || "")];
  if(!ammo) return null;
  const count = normalizeShopMultiplier(multiplier);
  return {
    ...ammo,
    multiplier:count,
    totalPrice:Math.max(0, Math.round(Number(ammo.price || 0) * count)),
    totalAmount:Math.max(0, Math.round(Number(ammo.amount || 0) * count))
  };
}

export function getItemPurchase(id, multiplier = 1){
  const item = SERVER_ITEM_SHOP[String(id || "")];
  if(!item) return null;
  const count = item.id === "teleportation_fluid" ? normalizeShopMultiplier(multiplier) : 1;
  return {
    ...item,
    multiplier:count,
    quantity:count,
    totalPrice:Math.max(0, Math.round(Number(item.price || 0) * count))
  };
}

export function getBoosterPurchase(id, quantity = 1){
  const booster = SERVER_BOOSTER_SHOP[String(id || "")];
  if(!booster) return null;
  const count = normalizeBoosterQuantity(quantity);
  return {
    ...booster,
    quantity:count,
    totalPrice:Math.max(0, Math.round(Number(booster.price || 0) * count)),
    totalDurationMs:Math.max(0, Number(booster.durationMs || 0) * count)
  };
}

export function getShipPurchase(id){
  const ship = SERVER_SHIP_SHOP[String(id || "")];
  if(!ship) return null;
  return {
    ...ship,
    totalPrice:Math.max(0, Math.round(Number(ship.price || 0)))
  };
}

export function getDronePurchase({id = "combat_drone", ownedCount = 0} = {}){
  const drone = SERVER_DRONE_SHOP[String(id || "combat_drone")];
  if(!drone) return null;
  const count = Math.max(0, Math.floor(Number(ownedCount || 0)));
  if(count >= Number(drone.maxOwned || 0)) return {...drone, locked:true, reason:"Nombre maximum de drones atteint."};
  const price = Math.max(0, Math.round(Number(drone.basePrice || 0) * Math.pow(2, count)));
  return {
    ...drone,
    ownedCount:count,
    nextCount:count + 1,
    totalPrice:price
  };
}

export function getDroneFormationPurchase(id){
  const formation = SERVER_DRONE_FORMATION_SHOP[String(id || "")];
  if(!formation) return null;
  return {
    ...formation,
    totalPrice:Math.max(0, Math.round(Number(formation.price || 0)))
  };
}

export function getPremiumPackPurchase(id){
  const pack = SERVER_PREMIUM_PACK_SHOP[String(id || "")];
  if(!pack) return null;
  return {
    ...pack,
    totalPrice:Math.max(0, Math.round(Number(pack.price || 0)))
  };
}
