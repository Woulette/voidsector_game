import { ships } from "../../../src/data/catalog.js";

import { betaPacks, premiumShopPacks } from "../../../src/data/premium.js";
import { S1_BOOSTER_SHOP } from "../../../src/shared/firmBoosters.js";
import { getRequiredPortalForShip } from "../../../src/shared/progressionUnlocks.js";
import { normalizeServerActionRepeat } from "./actionBatch.js";
import { MAX_STANDARD_DRONES, MAX_TOTAL_DRONES } from "../../../src/shared/droneLimits.js";

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

export const SERVER_SHIP_SHOP = Object.fromEntries(ships.map(ship=>{
  const requirement = getRequiredPortalForShip(ship);
  return [
    ship.id,
    {
      id:ship.id,
      name:ship.name,
      priceType:ship.priceType || "credits",
      price:Number(ship.price || 0),
      allowedRoles:Array.isArray(ship.allowedRoles) ? ship.allowedRoles.map(String) : [],
      requiresCompletedPortal:requirement?.portalId || null,
      requiresCompletedPortalName:requirement?.portalName || ""
    }
  ];
}));

export const SERVER_DRONE_SHOP = {
  combat_drone:{id:"combat_drone", name:"Drone de Combat", priceType:"credits", basePrice:200000, maxOwned:MAX_TOTAL_DRONES, maxStandardOwned:MAX_STANDARD_DRONES}
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
    tier:pack.tier,
    days:Number(pack.days || 0),
    realPrice:pack.realPrice || ""
  }
]));

export const SERVER_BETA_PACK_SHOP = Object.fromEntries(betaPacks.map(pack=>[
  pack.id,
  {
    id:pack.id,
    name:pack.name,
    realPrice:pack.price || "",
    officialReward:pack.officialReward || "",
    allowedShipChoices:(pack.choices || []).map(choice=>String(choice.id || "")).filter(Boolean),
    launchEntitlements:pack.id === "beta_valkyrie"
      ? ["official_premium_week"]
      : pack.id === "beta_astralis"
        ? ["official_premium_month"]
        : pack.id === "beta_commander"
          ? ["official_premium_month", "official_thanks_pack_999"]
          : [],
    launchPremiumDays:pack.id === "beta_valkyrie" ? 7 : (pack.id === "beta_astralis" || pack.id === "beta_commander" ? 30 : 0),
        grants:pack.id === "beta_valkyrie"
      ? {
          ships:["valkyrie"],
          itemCounts:{laser_mk3:5, shield_omega:3},
          ammo:{ammo_x3:50000}
        }
      : pack.id === "beta_astralis"
        ? {
            ships:["razorion"],
            itemCounts:{laser_mk4:5, laser_mk3:3, shield_omega:5, reactor_ion:5},
            ammo:{ammo_x4:20000},
            premium:25000
          }
        : pack.id === "beta_commander"
          ? {
              ships:["astralis"],
              itemCounts:{laser_mk4:10, reactor_ion:10, shield_omega:10, extra_repair_bot:1},
              ammo:{ammo_x4:50000},
              premium:50000
            }
          : {}
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

export function getAmmoPurchase(id, multiplier = 1, repeat = 1){
  const ammo = SERVER_AMMO_SHOP[String(id || "")];
  if(!ammo) return null;
  const count = normalizeShopMultiplier(multiplier);
  const actionRepeat = normalizeServerActionRepeat(repeat);
  if(!actionRepeat) return null;
  return {
    ...ammo,
    multiplier:count,
    repeat:actionRepeat,
    totalPrice:Math.max(0, Math.round(Number(ammo.price || 0) * count * actionRepeat)),
    totalAmount:Math.max(0, Math.round(Number(ammo.amount || 0) * count * actionRepeat))
  };
}

export function getItemPurchase(id, multiplier = 1, repeat = 1){
  const item = SERVER_ITEM_SHOP[String(id || "")];
  if(!item) return null;
  const count = item.id === "teleportation_fluid" ? normalizeShopMultiplier(multiplier) : 1;
  const actionRepeat = normalizeServerActionRepeat(repeat);
  if(!actionRepeat) return null;
  const quantity = count * actionRepeat;
  return {
    ...item,
    multiplier:count,
    repeat:actionRepeat,
    quantity,
    totalPrice:Math.max(0, Math.round(Number(item.price || 0) * quantity))
  };
}

export function getBoosterPurchase(id, quantity = 1, repeat = 1){
  const booster = SERVER_BOOSTER_SHOP[String(id || "")];
  if(!booster) return null;
  const count = normalizeBoosterQuantity(quantity);
  const actionRepeat = normalizeServerActionRepeat(repeat);
  if(!actionRepeat) return null;
  const totalQuantity = count * actionRepeat;
  return {
    ...booster,
    quantity:totalQuantity,
    repeat:actionRepeat,
    totalPrice:Math.max(0, Math.round(Number(booster.price || 0) * totalQuantity)),
    totalDurationMs:Math.max(0, Number(booster.durationMs || 0) * totalQuantity)
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

export function getDronePurchase({id = "combat_drone", profile} = {}){
  const drone = typeof id === "string" && Object.hasOwn(SERVER_DRONE_SHOP, id) ? SERVER_DRONE_SHOP[id] : null;
  if(!drone) return null;
  const count = Number(profile?.ownedDroneCount);
  if(!profile || !Number.isSafeInteger(count) || count < 0) return {...drone, locked:true, reason:"Possession des drones invalide."};
  if(count >= drone.maxStandardOwned) return {...drone, locked:true, reason:`Limite de ${drone.maxStandardOwned} drones standards atteinte.`};
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
    locked:true,
    reason:"Les abonnements Premium sont disponibles uniquement en euros. Paiement à venir."
  };
}

export function getBetaPackPurchase(id, shipChoice = ""){
  const pack = SERVER_BETA_PACK_SHOP[String(id || "")];
  if(!pack) return null;
  const choices = Array.isArray(pack.allowedShipChoices) ? pack.allowedShipChoices : [];
  const cleanChoice = String(shipChoice || "");
  if(pack.grants?.chooseShip && !choices.includes(cleanChoice)){
    return {...pack, locked:true, reason:"Choisis un vaisseau beta valide."};
  }
  return {
    ...pack,
    shipChoice:pack.grants?.chooseShip ? cleanChoice : "",
    totalPrice:0,
    priceType:"real"
  };
}
