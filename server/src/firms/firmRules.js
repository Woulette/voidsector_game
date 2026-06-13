import { ELITE_CRAFT_RESOURCES, MYTHIC_CRAFT_RESOURCES, RARE_CRAFT_RESOURCES, VERY_RARE_CRAFT_RESOURCES } from "../../../src/data/resources.js";

export const FIRM_SEASON_MS = 30 * 24 * 60 * 60 * 1000;
export const FIRM_REWARD_MS = 7 * 24 * 60 * 60 * 1000;
export const FIRM_COLLECTIVE_MIN_CONTRIBUTION = 10_000;
export const FIRM_PVP_FULL_REWARD_LIMIT = 5;
export const FIRM_PVP_FULL_POINTS = 100;
export const FIRM_PVP_REDUCED_POINTS = 5;
export const FIRM_RANK_BONUSES = [0.25, 0.15, 0.10, 0.05];
export const FIRM_REPUTATION_TIERS = [
  {reputation:10_000, discount:0, label:"Commun"},
  {reputation:75_000, discount:0.05, label:"Rare"},
  {reputation:300_000, discount:0.10, label:"Tres rare"},
  {reputation:900_000, discount:0.15, label:"Elite"},
  {reputation:2_000_000, discount:0.20, label:"Mythique"}
];

export const FIRM_RARITIES = {
  common:{id:"common", label:"Commune", lower:null},
  rare:{id:"rare", label:"Rare", lower:"common"},
  veryRare:{id:"veryRare", label:"Tres rare", lower:"rare"},
  elite:{id:"elite", label:"Elite", lower:"veryRare"},
  mythic:{id:"mythic", label:"Mythique", lower:"elite"}
};

const FIRM_TARGET_ALIASES = {
  drone_pirate:["drone_pirate", "sentinel_orb", "shared_orb"],
  sentinel_orb:["sentinel_orb", "drone_pirate", "shared_orb"]
};

export function firmTargetMatches(expected, actual){
  const cleanExpected = String(expected || "");
  const cleanActual = String(actual || "");
  if(cleanExpected === "*") return true;
  if(cleanExpected === cleanActual) return true;
  const aliases = FIRM_TARGET_ALIASES[cleanExpected] || [];
  return aliases.includes(cleanActual);
}

function shopOffer(id, kind, rarity, stage, label, description, price, reputationRequired, asset, reward = null){
  return {id, kind, rarity, stage, label, description, price, reputationRequired, asset, ...(reward ? {reward} : {})};
}

const FIRM_SHOP_RESOURCE_CONFIG = {
  rare:{
    chestId:"box_rare",
    chestLabel:"Coffre rare",
    chestDesc:"Un coffre de ressources rares.",
    chestPrice:150,
    chestAsset:"assets/firm/chests/chest_rare.svg",
    reputation:[75_000, 125_000, 200_000],
    prices:[80, 80, 110, 110, 110, 150, 150, 150]
  },
  veryRare:{
    chestId:"box_veryRare",
    chestLabel:"Coffre tres rare",
    chestDesc:"Un coffre de ressources tres rares.",
    chestPrice:300,
    chestAsset:"assets/firm/chests/chest_veryRare.svg",
    reputation:[300_000, 450_000, 650_000],
    prices:[180, 180, 260, 260, 260, 380, 380, 380]
  },
  elite:{
    chestId:"box_elite",
    chestLabel:"Coffre elite",
    chestDesc:"Un coffre de ressources elite.",
    chestPrice:600,
    chestAsset:"assets/firm/chests/chest_elite.svg",
    reputation:[900_000, 1_200_000, 1_600_000],
    prices:[350, 350, 500, 500, 500, 750, 750, 750]
  },
  mythic:{
    chestId:"box_mythic",
    chestLabel:"Coffre mythique",
    chestDesc:"Un coffre de ressources mythiques.",
    chestPrice:1_000,
    chestAsset:"assets/firm/chests/chest_mythic.svg",
    reputation:[2_000_000, 3_000_000, 5_000_000],
    prices:[800, 800, 1_200, 1_200, 1_200, 1_800, 1_800, 1_800]
  }
};

function resourceShopStage(index){
  if(index < 2) return 1;
  if(index < 5) return 2;
  return 3;
}

function buildFirmResourceShop(rarity, resources){
  const config = FIRM_SHOP_RESOURCE_CONFIG[rarity];
  const offers = [
    shopOffer(config.chestId, "box", rarity, 1, config.chestLabel, config.chestDesc, config.chestPrice, config.reputation[0], config.chestAsset)
  ];
  resources.forEach((resource, index)=>{
    const stage = resourceShopStage(index);
    const lowerName = `${resource.name.charAt(0).toLowerCase()}${resource.name.slice(1)}`;
    offers.push(shopOffer(
      `${rarity}_${resource.id}`,
      "material",
      rarity,
      stage,
      resource.name,
      `1 ${lowerName}.`,
      config.prices[index],
      config.reputation[stage - 1],
      resource.img,
      {materials:{[resource.id]:1}}
    ));
  });
  return offers;
}

export const FIRM_SHOP_CATALOG = [
  shopOffer("box_common", "box", "common", 1, "Coffre commun", "Un coffre de ressources communes.", 20, 10_000, "assets/firm/chests/chest_common.svg"),
  shopOffer("common_copper_cables", "material", "common", 1, "Câbles de cuivre", "1 câble conducteur pour assemblages légers.", 25, 10_000, "assets/resources/common/copper_cables.webp", {materials:{cables_cuivre:1}}),
  shopOffer("common_steel_plates", "material", "common", 1, "Plaques d'acier", "1 plaque structurelle pour coques et modules.", 25, 10_000, "assets/resources/common/steel_plates.webp", {materials:{plaques_acier:1}}),
  shopOffer("common_insulating_polymer", "material", "common", 2, "Polymère isolant", "1 unité de polymère protecteur.", 35, 25_000, "assets/resources/common/insulating_polymer.webp", {materials:{polymere_isolant:1}}),
  shopOffer("common_printed_circuits", "material", "common", 2, "Circuits imprimés", "1 circuit pour systèmes embarqués.", 35, 25_000, "assets/resources/common/printed_circuits.webp", {materials:{circuits_imprimes:1}}),
  shopOffer("common_ceramic_capacitors", "material", "common", 2, "Condensateurs céramiques", "1 condensateur pour générateurs et lasers.", 35, 25_000, "assets/resources/common/ceramic_capacitors.webp", {materials:{condensateurs_ceramiques:1}}),
  shopOffer("common_optical_lenses", "material", "common", 3, "Lentilles optiques", "1 lentille de focalisation laser.", 55, 50_000, "assets/resources/common/optical_lenses.webp", {materials:{lentilles_optiques:1}}),
  shopOffer("common_propellant_powder", "material", "common", 3, "Poudre propulsive", "1 charge pour munitions et roquettes.", 55, 50_000, "assets/resources/common/propellant_powder.webp", {materials:{poudre_propulsive:1}}),
  shopOffer("common_pressurized_tanks", "material", "common", 3, "Réservoirs pressurisés", "1 réservoir compact pour systèmes auxiliaires.", 55, 50_000, "assets/resources/common/pressurized_tanks.webp", {materials:{reservoirs_pressurises:1}}),

  ...buildFirmResourceShop("rare", RARE_CRAFT_RESOURCES),
  ...buildFirmResourceShop("veryRare", VERY_RARE_CRAFT_RESOURCES),
  ...buildFirmResourceShop("elite", ELITE_CRAFT_RESOURCES),
  ...buildFirmResourceShop("mythic", MYTHIC_CRAFT_RESOURCES)
];

export const FIRM_COLLECTIVE_REWARDS = {
  1:{boxes:{mythic:3}},
  2:{boxes:{mythic:1, elite:2}},
  3:{boxes:{elite:3}},
  4:{boxes:{elite:1, veryRare:5}}
};

const TOP_REWARDS = [
  {premium:200_000, ammo:{ammo_x6:30_000}, firmatons:2_000},
  {premium:175_000, ammo:{ammo_x6:25_000}, firmatons:1_750},
  {premium:150_000, ammo:{ammo_x6:20_000}, firmatons:1_500},
  {premium:100_000, ammo:{ammo_x6:10_000}, firmatons:1_000},
  {premium:75_000, ammo:{ammo_x4:50_000}, firmatons:850},
  {premium:70_000, ammo:{ammo_x4:45_000}, firmatons:800},
  {premium:65_000, ammo:{ammo_x4:40_000}, firmatons:750},
  {premium:60_000, ammo:{ammo_x4:35_000}, firmatons:700},
  {premium:55_000, ammo:{ammo_x4:30_000}, firmatons:600},
  {premium:50_000, ammo:{ammo_x4:25_000}, firmatons:500}
];

const PERCENT_REWARDS = [
  {percent:10, reward:{premium:25_000, ammo:{ammo_x4:10_000}, firmatons:400}},
  {percent:20, reward:{premium:15_000, ammo:{ammo_x4:5_000}, firmatons:350}},
  {percent:30, reward:{premium:10_000, firmatons:250}},
  {percent:50, reward:{premium:5_000, firmatons:200}},
  {percent:80, reward:{premium:2_000, firmatons:150}}
];

export const FIRM_DAILY_QUEST_DEFINITIONS = [
  {
    id:"orbs",
    label:"Purge des Orbes",
    type:"monster",
    target:"drone_pirate",
    targetLabel:"Orbes",
    startHourUtc:6,
    goal:5_000,
    firmPoints:25_000,
    baseFirmatons:50,
    claimFirmatons:5
  },
  {
    id:"vorak",
    label:"Traque des Vorak Rushers",
    type:"monster",
    target:"raider_astral",
    targetLabel:"Vorak Rushers",
    startHourUtc:12,
    goal:5_000,
    firmPoints:25_000,
    baseFirmatons:50,
    claimFirmatons:5
  },
  {
    id:"portals",
    label:"Offensive dimensionnelle",
    type:"portal",
    target:"portal",
    targetLabel:"Portails termines",
    startHourUtc:18,
    goal:100,
    firmPoints:25_000,
    baseFirmatons:50,
    claimFirmatons:5
  }
];

export const FIRM_SEASONAL_QUEST_DEFINITIONS = [
  {
    id:"season-monsters",
    label:"Domination spatiale",
    type:"monster",
    target:"*",
    targetLabel:"Monstres elimines",
    goal:300_000,
    firmPoints:150_000,
    claimFirmatons:5,
    participantReward:{firmatons:1_000, boxes:{rare:1}}
  },
  {
    id:"season-portals",
    label:"Maitrise dimensionnelle",
    type:"portal",
    target:"*",
    targetLabel:"Portails termines",
    goal:2_000,
    firmPoints:200_000,
    claimFirmatons:5,
    participantReward:{firmatons:1_000, boxes:{veryRare:1}}
  },
  {
    id:"season-pvp",
    label:"Suprematie inter-firmes",
    type:"pvp",
    target:"*",
    targetLabel:"Pilotes ennemis vaincus",
    goal:10_000,
    firmPoints:250_000,
    claimFirmatons:5,
    participantReward:{firmatons:1_000, boxes:{elite:1}}
  }
];

export const FIRM_PERSONAL_SEASON_OBJECTIVES = [
  {
    id:"season-solo-monsters-100",
    label:"Chasseur de saison",
    description:"Eliminer 100 monstres pendant la saison.",
    type:"monster",
    target:"*",
    targetLabel:"Monstres elimines",
    goal:100,
    firmPoints:250,
    reward:{firmatons:25, ammo:{ammo_x2:1_000}}
  },
  {
    id:"season-solo-orbs-50",
    label:"Nettoyeur d'orbes",
    description:"Eliminer 50 Orbes sentinelles.",
    type:"monster",
    target:"drone_pirate",
    targetLabel:"Orbes",
    goal:50,
    firmPoints:150,
    reward:{firmatons:15, ammo:{ammo_x2:750}}
  },
  {
    id:"season-solo-vorak-50",
    label:"Briseur de Vorak",
    description:"Eliminer 50 Vorak Rushers.",
    type:"monster",
    target:"raider_astral",
    targetLabel:"Vorak Rushers",
    goal:50,
    firmPoints:150,
    reward:{firmatons:15, ammo:{ammo_x2:750}}
  },
  {
    id:"season-solo-portals-10",
    label:"Operateur de portails",
    description:"Terminer 10 portails pendant la saison.",
    type:"portal",
    target:"portal",
    targetLabel:"Portails termines",
    goal:10,
    firmPoints:500,
    reward:{firmatons:50, ammo:{ammo_x3:1_000}}
  },
  {
    id:"season-solo-pvp-5",
    label:"Duelliste inter-firmes",
    description:"Vaincre 5 pilotes ennemis pendant la saison.",
    type:"pvp",
    target:"player",
    targetLabel:"Pilotes ennemis vaincus",
    goal:5,
    firmPoints:750,
    reward:{firmatons:75, ammo:{ammo_x4:1_000}}
  }
];

export const FIRM_BOX_REWARD_TABLES = {
  common:[
    {kind:"premium", label:"1 000 NOVA", amount:1_000},
    {kind:"material", label:"1 ressource commune", id:"cables_cuivre", amount:1},
    {kind:"ammo", label:"10 000 munitions x2", id:"ammo_x2", amount:10_000},
    {kind:"ammo", label:"250 missiles tiers 1", id:"missile_m1", amount:250},
    {kind:"ammo", label:"100 roquettes tiers 1", id:"rocket_r1", amount:100}
  ],
  rare:[
    {kind:"premium", label:"5 000 NOVA", amount:5_000},
    {kind:"material", label:"1 ressource rare", id:"bobine_supraconductrice", amount:1},
    {kind:"ammo", label:"15 000 munitions x3", id:"ammo_x3", amount:15_000},
    {kind:"ammo", label:"500 missiles tiers 2", id:"missile_m2", amount:500},
    {kind:"ammo", label:"250 roquettes tiers 2", id:"rocket_r2", amount:250}
  ],
  veryRare:[
    {kind:"premium", label:"10 000 NOVA", amount:10_000},
    {kind:"material", label:"1 ressource tres rare", id:"micro_heatpipe_quantique", amount:1},
    {kind:"ammo", label:"25 000 munitions x4", id:"ammo_x4", amount:25_000},
    {kind:"ammo", label:"1 000 missiles tiers 2", id:"missile_m2", amount:1_000},
    {kind:"ammo", label:"500 roquettes tiers 3", id:"rocket_r3", amount:500}
  ],
  elite:[
    {kind:"premium", label:"20 000 NOVA", amount:20_000},
    {kind:"material", label:"1 ressource elite", id:"noyau_fusion_miniature", amount:1},
    {kind:"ammo", label:"50 000 munitions x4", id:"ammo_x4", amount:50_000},
    {kind:"ammo", label:"1 500 missiles haut niveau", id:"missile_m2", amount:1_500},
    {kind:"ammo", label:"750 roquettes tiers 3", id:"rocket_r3", amount:750}
  ],
  mythic:[
    {kind:"premium", label:"50 000 NOVA", amount:50_000},
    {kind:"material", label:"1 ressource mythique", id:"fragment_noyau_stellaire", amount:1},
    {kind:"ammo", label:"25 000 munitions x6", id:"ammo_x6", amount:25_000},
    {kind:"ammo", label:"2 000 missiles haut niveau", id:"missile_m2", amount:2_000},
    {kind:"ammo", label:"1 000 roquettes haut niveau", id:"rocket_r3", amount:1_000}
  ]
};

export function cloneFirmReward(reward = {}){
  return JSON.parse(JSON.stringify(reward || {}));
}

export function getFirmShopItem(id){
  return FIRM_SHOP_CATALOG.find(item=>item.id === String(id || "")) || null;
}

export function getFirmShopPrice(itemOrId, reputation = 0){
  const item = typeof itemOrId === "string" ? getFirmShopItem(itemOrId) : itemOrId;
  if(!item) return 0;
  const cleanReputation = Math.max(0, Number(reputation || 0));
  const tier = [...FIRM_REPUTATION_TIERS].reverse().find(entry=>cleanReputation >= entry.reputation);
  return Math.max(1, Math.round(Number(item.price || 0) * (1 - Number(tier?.discount || 0))));
}

export function getFirmCollectiveReward(rank){
  return cloneFirmReward(FIRM_COLLECTIVE_REWARDS[Math.max(1, Math.min(4, Number(rank || 4)))] || {});
}

export function getFirmIndividualReward(rank, totalPlayers){
  const cleanRank = Math.max(1, Math.floor(Number(rank || 1)));
  const total = Math.max(1, Math.floor(Number(totalPlayers || 1)));
  if(cleanRank <= TOP_REWARDS.length){
    return {label:`Top ${cleanRank}`, reward:cloneFirmReward(TOP_REWARDS[cleanRank - 1])};
  }
  const percentile = cleanRank / total * 100;
  const tier = PERCENT_REWARDS.find(entry=>percentile <= entry.percent);
  if(tier) return {label:`Top ${tier.percent}%`, reward:cloneFirmReward(tier.reward)};
  return {label:"Joueur classe", reward:{firmatons:100}};
}

export function getFirmQuestFirmPoints(basePoints, elapsedMs){
  const elapsed = Math.max(0, Number(elapsedMs || 0));
  const base = Math.max(0, Math.floor(Number(basePoints || 0)));
  if(elapsed < 6 * 60 * 60 * 1000) return base;
  if(elapsed < 12 * 60 * 60 * 1000) return Math.round(base * 0.75);
  if(elapsed < 24 * 60 * 60 * 1000) return Math.round(base * 0.5);
  return 0;
}

export function getFirmQuestPersonalReward(rank, totalPlayers, baseFirmatons = 50){
  const cleanRank = Math.max(1, Math.floor(Number(rank || 1)));
  const total = Math.max(1, Math.floor(Number(totalPlayers || 1)));
  const base = Math.max(0, Math.floor(Number(baseFirmatons || 0)));
  if(cleanRank <= 10) return {label:`Top ${cleanRank}`, firmatons:base, bonus:{boxes:{common:1}}};
  const percentile = cleanRank / total * 100;
  if(percentile <= 20) return {label:"Top 20%", firmatons:base};
  if(percentile <= 40) return {label:"Top 40%", firmatons:Math.round(base * 0.75)};
  if(percentile <= 60) return {label:"Top 60%", firmatons:Math.round(base * 0.5)};
  if(percentile <= 80) return {label:"Top 80%", firmatons:Math.round(base * 0.25)};
  if(percentile <= 99) return {label:"Top 99%", firmatons:Math.max(1, Math.round(base * 0.1))};
  return {label:"Hors classement", firmatons:0};
}

export function rollFirmBoxReward(boxRarity, random = Math.random){
  const rarity = FIRM_RARITIES[boxRarity] || FIRM_RARITIES.common;
  const tableRarity = rarity.lower && Number(random()) >= 0.33 ? rarity.lower : rarity.id;
  const table = FIRM_BOX_REWARD_TABLES[tableRarity] || FIRM_BOX_REWARD_TABLES.common;
  const index = Math.min(table.length - 1, Math.floor(Math.max(0, Number(random())) * table.length));
  return {boxRarity:rarity.id, rewardRarity:tableRarity, reward:cloneFirmReward(table[index])};
}
