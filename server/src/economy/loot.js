import {ammoTypes, equipment} from "../../../src/data/equipment.js";
import {rawMaterialCatalog} from "../../../src/data/progression.js";

const MATERIAL_BY_MAP = {
  "0":["cuivre_orbital", "zinc_spatial", "nickel_brut"],
  "1":["cuivre_orbital", "zinc_spatial", "nickel_brut", "titane_fissure"],
  "2":["nickel_brut", "titane_fissure", "silice_conductrice"],
  "3":["titane_fissure", "silice_conductrice"],
  "4":["titane_fissure", "silice_conductrice", "noyau_astra"],
  "20":["cuivre_orbital", "zinc_spatial"]
};

const AMMO_DROP_TABLE = [
  {id:"ammo_x2", amount:75, weight:32},
  {id:"rocket_r1", amount:5, weight:12},
  {id:"missile_m1", amount:3, weight:8},
  {id:"ammo_x3", amount:30, weight:4}
];

const RARE_ITEM_DROP_TABLE = [
  {id:"laser_mk2", weight:8},
  {id:"shield_gen", weight:7},
  {id:"engine_ion", weight:7},
  {id:"launcher_rocket_mk1", weight:4},
  {id:"launcher_missile_mk1", weight:2}
];

function pickWeighted(entries){
  const total = entries.reduce((sum, entry)=>sum + Number(entry.weight || 0), 0) || 1;
  let roll = Math.random() * total;
  for(const entry of entries){
    roll -= Number(entry.weight || 0);
    if(roll <= 0) return entry;
  }
  return entries[entries.length - 1] || null;
}

function materialById(id){
  return rawMaterialCatalog.find(material=>material.id === id) || null;
}

function ammoById(id){
  return ammoTypes.find(ammo=>ammo.id === id) || null;
}

function itemById(id){
  return equipment.find(item=>item.id === id) || null;
}

export function rollServerLootDrops({enemy, mapId} = {}){
  const drops = [];
  const level = Math.max(1, Number(enemy?.level || 1));
  const isBoss = String(enemy?.kind || "").startsWith("boss_");
  const materialChance = isBoss ? 0.9 : 0.35;
  const ammoChance = isBoss ? 0.55 : 0.18;
  const itemChance = isBoss ? 0.08 : 0.008;

  if(Math.random() <= materialChance){
    const pool = MATERIAL_BY_MAP[String(mapId)] || MATERIAL_BY_MAP["0"];
    const material = materialById(pool[Math.floor(Math.random() * pool.length)]);
    if(material){
      drops.push({
        kind:"material",
        materialId:material.id,
        name:material.name,
        label:material.short || material.name,
        img:material.img,
        amount:Math.max(1, Math.round((isBoss ? 8 : 2) + level * (isBoss ? 1.5 : 0.35)))
      });
    }
  }

  if(Math.random() <= ammoChance){
    const pick = pickWeighted(AMMO_DROP_TABLE);
    const ammo = pick ? ammoById(pick.id) : null;
    if(ammo){
      drops.push({
        kind:"ammo",
        ammoId:ammo.id,
        name:ammo.name,
        label:ammo.short || ammo.name,
        img:ammo.img,
        amount:Math.max(1, Math.round(Number(pick.amount || 1) * (isBoss ? 4 : 1)))
      });
    }
  }

  if(Math.random() <= itemChance){
    const pick = pickWeighted(RARE_ITEM_DROP_TABLE);
    const item = pick ? itemById(pick.id) : null;
    if(item){
      drops.push({
        kind:"item",
        itemId:item.id,
        name:item.name,
        label:item.short || item.name,
        img:item.img,
        amount:1
      });
    }
  }

  return drops;
}
