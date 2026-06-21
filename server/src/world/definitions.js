import { FIRMS, getFirmMapDisplayName, getFirmMapId, getFirmMapName } from "../../../src/data/firms.js";

const ASTRA_WORLD_MAPS = {
  "0":{id:"0", name:"Helion-01", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320, safeRadius:320, safeRect:{minX:-5000, minY:2500, maxX:-3500, maxY:3950}}, portals:[{x:4300, y:-3300, r:95, safeRadius:230}], seed:7, count:40, level:[1,4], enemyTypes:[["drone_pirate", .50], ["raider_astral", .50]]},
  "1":{id:"1", name:"Helion-02", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], closedPortals:[{x:4300, y:-3300, r:95, safeRadius:230}], seed:19, count:40, level:[5,9], enemyTypes:[["drone_pirate", 1], ["raider_astral", 1], ["chasseur_spectral", 1]], fixedEnemyCounts:{boss_drone_pirate:4, boss_raider_astral:4}},
  "2":{id:"2", name:"Helion-03", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], seed:31, count:50, level:[10,14], enemyTypes:[["raider_astral", 1], ["chasseur_spectral", 1], ["cuirasse_nebulaire", 1]], fixedEnemyCounts:{eclanite:4, boss_raider_astral:4}},
  "3":{id:"3", name:"Helion-04", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], seed:43, count:50, level:[15,19], enemyTypes:[["pondeuse_astrale", .56], ["cuirasse_nebulaire", .44]], fixedEnemyCounts:{cuirasse_ambre:6}},
  "4":{id:"4", name:"Helion-05", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320, safeRadius:440, label:"RELAIS HELION-05", hub:false, safeType:"relay"}, questStations:[{id:"quests", x:-4300, y:3300, interactionRadius:320}], portals:[{x:4300, y:-3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}, {x:0, y:-3300, r:95, safeRadius:230}], seed:59, count:50, level:[20,24], enemyTypes:[["eclanite", .60], ["cristanite", .32], ["astranite", .08]], fixedEnemyCounts:{eclanite:30, cristanite:16, astranite:4}},
  "20":{id:"20", name:"Nereid-01", width:10000, height:8000, spawn:{x:-4300, y:-3300, r:320, safeRadius:320}, portals:[{x:4300, y:3300, r:95, safeRadius:230}], seed:207, count:20, level:[1,4], enemyTypes:[["drone_pirate", .70], ["raider_astral", .30]]}
};

const RICKY_PORTAL_BY_FIRM = {
  astra:{portal:{x:4300, y:-3300}, npc:{x:4470, y:-3180}},
  cyan:{portal:{x:4300, y:3300}, npc:{x:4470, y:3180}},
  jaune:{portal:{x:-4300, y:3300}, npc:{x:-4470, y:3180}},
  verte:{portal:{x:-4300, y:-3300}, npc:{x:-4470, y:-3180}}
};

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function firmSeedOffset(firmId){
  return {astra:0, cyan:200, jaune:300, verte:400}[firmId] || 0;
}

function buildFirmWorldMaps(){
  const result = {};
  for(const firm of FIRMS){
    for(let num = 1; num <= 5; num += 1){
      const template = ASTRA_WORLD_MAPS[String(num - 1)];
      if(!template) continue;
      const map = clone(template);
      map.id = String(getFirmMapId(firm.id, num));
      map.name = getFirmMapName(firm.id, num);
      map.displayName = getFirmMapDisplayName(firm.id, num);
      map.firmId = firm.id;
      map.seed = Number(template.seed || 0) + firmSeedOffset(firm.id);
      if(num === 1){
        map.spawn = {
          ...(map.spawn || {}),
          x:Number(firm.spawn?.x ?? map.spawn?.x ?? 0),
          y:Number(firm.spawn?.y ?? map.spawn?.y ?? 0),
          r:Number(map.spawn?.r || 320),
          safeRadius:Number(map.spawn?.safeRadius || 320)
        };
        map.spawn.safeRect = {
          minX:map.spawn.x - 750,
          minY:map.spawn.y - 750,
          maxX:map.spawn.x + 750,
          maxY:map.spawn.y + 750
        };
      }
      if(num === 2){
        const ricky = RICKY_PORTAL_BY_FIRM[firm.id] || RICKY_PORTAL_BY_FIRM.astra;
        map.closedPortals = [{...ricky.portal, r:95, safeRadius:230}];
        map.questNpcs = [{
          id:`${firm.id}02_portal_mechanic`,
          name:"Ricky",
          npcImg:"assets/ships/npc/npc_saucer.png",
          x:ricky.npc.x,
          y:ricky.npc.y,
          radius:82,
          size:132,
          marker:"!",
          label:"RICKY",
          interactionRadius:260
        }];
      }
      result[map.id] = map;
    }
  }
  result["50"] = {
    id:"50",
    name:"CORE",
    displayName:"Noyau",
    width:10000,
    height:8000,
    spawn:{x:0, y:0, r:420, safeRadius:420, safeRect:{minX:-520, minY:-520, maxX:520, maxY:520}},
    portals:[
      {x:-4300, y:0, r:95, safeRadius:230},
      {x:0, y:-3300, r:95, safeRadius:230},
      {x:4300, y:0, r:95, safeRadius:230},
      {x:0, y:3300, r:95, safeRadius:230}
    ],
    seed:509,
    count:48,
    level:[25,34],
    enemyTypes:[["boss_chasseur_spectral", .50], ["boss_cuirasse_nebulaire", .50]]
  };
  return result;
}

export const WORLD_MAPS = buildFirmWorldMaps();
export const WORLD_ENEMY_TYPES = {
  drone_pirate:{
    kind:"drone_pirate",
    type:"Orbe sentinelle",
    baseLevel:1,
    img:"assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png",
    radius:26,
    width:92,
    height:92,
    hp:level=>800,
    shield:()=>0,
    speed:()=>190,
    attackRange:300,
    attackDamage:level=>34 + level * 4,
    attackCooldown:1250,
    projectileSpeed:680,
    reward:()=>({credits:800, xp:400, premium:1}),
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    shieldAbsorbRatio:.8
  },
  raider_astral:{
    kind:"raider_astral",
    type:"Vorak rusher",
    baseLevel:1,
    img:"assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png",
    radius:36,
    width:120,
    height:120,
    hp:level=>1450 + level * 170,
    shield:()=>0,
    speed:()=>220,
    attackRange:250,
    attackDamageMin:90,
    attackDamageMax:140,
    attackDamage:()=>115,
    attackCooldown:1350,
    projectileSpeed:640,
    reward:()=>({credits:1200, xp:500, premium:2}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    shieldAbsorbRatio:.8
  },
  chasseur_spectral:{
    kind:"chasseur_spectral",
    type:"Parasite astral",
    baseLevel:5,
    img:"assets/enemies/enemy_green_parasite.png",
    radius:34,
    width:86,
    height:86,
    hp:()=>3500,
    shield:()=>1500,
    speed:()=>200,
    attackRange:300,
    attackDamageMin:150,
    attackDamageMax:250,
    attackDamage:()=>200,
    attackCooldown:1550,
    projectileSpeed:620,
    reward:()=>({credits:4000, xp:1500, premium:4}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50, interval:2, duration:10},
    shieldAbsorbRatio:.8
  },
  pondeuse_astrale:{
    kind:"pondeuse_astrale",
    type:"Pondeuse astrale",
    baseLevel:15,
    img:"assets/enemies/generated/astra4_astral_brood.png",
    radius:54,
    width:132,
    height:132,
    hp:()=>45_000,
    shield:()=>30_000,
    speed:()=>230,
    attackRange:350,
    attackDamageMin:600,
    attackDamageMax:900,
    attackDamage:()=>750,
    attackCooldown:1000,
    projectileSpeed:620,
    reward:()=>({credits:60_000, xp:38_000, premium:50}),
    color:"rgba(132,204,22,.96)",
    particle:"rgba(192,132,252,.78)",
    onHitEffect:{type:"poison", damage:350, interval:2, duration:10},
    deathSpawn:{kind:"chasseur_spectral", count:3},
    shieldAbsorbRatio:.8
  },
  cuirasse_nebulaire:{
    kind:"cuirasse_nebulaire",
    type:"Traqueur abyssal",
    baseLevel:10,
    img:"assets/enemies/enemy_blue_spider.png",
    radius:46,
    width:106,
    height:106,
    hp:()=>8000,
    shield:()=>1600,
    speed:()=>150,
    attackRange:300,
    attackDamageMin:250,
    attackDamageMax:350,
    attackDamage:()=>300,
    attackCooldown:1700,
    projectileSpeed:590,
    reward:()=>({credits:12000, xp:5000, premium:8}),
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    shieldAbsorbRatio:.8
  },
  cuirasse_ambre:{
    kind:"cuirasse_ambre",
    type:"Cuirasse ambre",
    baseLevel:15,
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    radius:62,
    width:148,
    height:148,
    hp:()=>80000,
    shield:()=>50000,
    speed:()=>165,
    attackRange:350,
    attackDamageMin:1300,
    attackDamageMax:1500,
    attackDamage:()=>1500,
    attackCooldown:1650,
    projectileSpeed:610,
    reward:()=>({credits:100000, xp:50000, premium:60}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    shieldAbsorbRatio:.8
  },
  eclanite:{
    kind:"eclanite",
    type:"Eclanite",
    baseLevel:10,
    img:"assets/enemies/generated/void-crystals/eclanite.png",
    radius:35,
    width:82,
    height:82,
    hp:()=>40000,
    shield:()=>20000,
    speed:()=>270,
    attackRange:330,
    attackDamageMin:500,
    attackDamageMax:800,
    attackDamage:()=>650,
    useExactDamageRange:true,
    attackCooldown:1000,
    projectileSpeed:560,
    reward:()=>({credits:50000, xp:26000, premium:24}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    shieldAbsorbRatio:.8
  },
  cristanite:{
    kind:"cristanite",
    type:"Cristanite",
    baseLevel:20,
    img:"assets/enemies/generated/void-crystals/cristanite.png",
    radius:47,
    width:112,
    height:112,
    hp:()=>180000,
    shield:()=>140000,
    speed:()=>250,
    attackRange:350,
    attackDamageMin:1600,
    attackDamageMax:2500,
    attackDamage:()=>2050,
    useExactDamageRange:true,
    attackCooldown:1000,
    projectileSpeed:560,
    reward:()=>({credits:250000, xp:84000, premium:110}),
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    shieldAbsorbRatio:.8
  },
  astranite:{
    kind:"astranite",
    type:"Astranite",
    baseLevel:20,
    img:"assets/enemies/generated/void-crystals/astranite.png",
    radius:72,
    width:168,
    height:168,
    hp:()=>450000,
    shield:()=>400000,
    speed:()=>240,
    attackRange:360,
    attackDamageMin:3800,
    attackDamageMax:5600,
    attackDamage:()=>4700,
    useExactDamageRange:true,
    attackCooldown:1000,
    projectileSpeed:590,
    reward:()=>({credits:1000000, xp:350000, premium:400}),
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    deathEffect:{type:"slow", amount:200, duration:5, radius:150},
    deathSpawn:{kind:"cristanite", count:1},
    color:"rgba(192,38,211,.98)",
    particle:"rgba(232,121,249,.78)",
    shieldAbsorbRatio:.8
  },
  boss_drone_pirate:{
    kind:"boss_drone_pirate",
    type:"Boss Orbe sentinelle",
    baseLevel:1,
    statSourceKind:"drone_pirate",
    statMultiplier:2,
    rewardSourceKind:"drone_pirate",
    rewardMultiplier:2,
    img:"assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_05.png",
    radius:32,
    width:120,
    height:120,
    hp:()=>800 * 2,
    shield:()=>1600,
    speed:()=>190,
    attackRange:300,
    attackDamage:level=>(34 + level * 4) * 2,
    attackCooldown:1250,
    projectileSpeed:680,
    reward:()=>({credits:800 * 2, xp:400 * 2, premium:1 * 2}),
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    shieldAbsorbRatio:.8
  },
  boss_raider_astral:{
    kind:"boss_raider_astral",
    type:"Boss Vorak rusher",
    baseLevel:1,
    statSourceKind:"raider_astral",
    statMultiplier:2,
    rewardSourceKind:"raider_astral",
    rewardMultiplier:2,
    img:"assets/enemies/enemy_red_rusher.png",
    radius:42,
    width:104,
    height:104,
    hp:level=>(1450 + level * 170) * 2,
    shield:()=>2000,
    shieldGrowthPerLevel:.10,
    speed:()=>220,
    attackRange:250,
    attackDamageMin:90 * 2,
    attackDamageMax:140 * 2,
    attackDamage:()=>115 * 2,
    attackCooldown:1350,
    projectileSpeed:640,
    reward:()=>({credits:1200 * 2, xp:500 * 2, premium:2 * 2}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    shieldAbsorbRatio:.8
  },
  boss_chasseur_spectral:{
    kind:"boss_chasseur_spectral",
    type:"Boss Parasite astral",
    baseLevel:5,
    rewardSourceKind:"chasseur_spectral",
    rewardMultiplier:2,
    img:"assets/enemies/enemy_green_parasite.png",
    radius:42,
    width:104,
    height:104,
    hp:()=>3500 * 4,
    shield:()=>1500 * 4,
    speed:()=>200,
    attackRange:300,
    attackDamageMin:150 * 4,
    attackDamageMax:250 * 4,
    attackDamage:()=>200 * 4,
    attackCooldown:1550,
    projectileSpeed:620,
    reward:()=>({credits:4000 * 2, xp:1500 * 2, premium:4 * 2}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50 * 4, interval:2, duration:10},
    shieldAbsorbRatio:.8
  },
  boss_cuirasse_nebulaire:{
    kind:"boss_cuirasse_nebulaire",
    type:"Boss Traqueur abyssal",
    baseLevel:10,
    rewardSourceKind:"cuirasse_nebulaire",
    rewardMultiplier:2,
    img:"assets/enemies/enemy_blue_spider.png",
    radius:54,
    width:126,
    height:126,
    hp:()=>8000 * 4,
    shield:()=>2000 * 4,
    speed:()=>150,
    attackRange:300,
    attackDamageMin:250 * 4,
    attackDamageMax:350 * 4,
    attackDamage:()=>300 * 4,
    attackCooldown:1700,
    projectileSpeed:590,
    reward:()=>({credits:12000 * 2, xp:5000 * 2, premium:8 * 2}),
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    shieldAbsorbRatio:.8
  },
  boss_cuirasse_ambre:{
    kind:"boss_cuirasse_ambre",
    type:"Boss Cuirasse ambre",
    baseLevel:15,
    rewardSourceKind:"cuirasse_ambre",
    rewardMultiplier:2,
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    radius:70,
    width:164,
    height:164,
    hp:()=>80000 * 4,
    shield:()=>50000 * 4,
    speed:()=>165,
    attackRange:350,
    attackDamageMin:1300 * 4,
    attackDamageMax:1500 * 4,
    attackDamage:()=>1500 * 4,
    attackCooldown:1650,
    projectileSpeed:610,
    reward:()=>({credits:100000 * 2, xp:50000 * 2, premium:30 * 2}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    shieldAbsorbRatio:.8
  },
};

export const COOP_ENEMY_TYPES = {
  shared_orb:{
    kind:"shared_orb",
    type:"Sentinelle coop",
    img:"assets/enemies/enemy_cyan_orb.png",
    level:18,
    hp:160000,
    shield:80000,
    radius:44,
    width:88,
    height:88,
    color:"#38bdf8"
  },
  shared_rusher:{
    kind:"shared_rusher",
    type:"Rusher coop",
    img:"assets/enemies/enemy_red_rusher.png",
    level:20,
    hp:210000,
    shield:60000,
    radius:42,
    width:90,
    height:90,
    color:"#ef4444"
  },
  shared_crystal:{
    kind:"shared_crystal",
    type:"Cristal coop",
    img:"assets/enemies/enemy_purple_crystal.png",
    level:22,
    hp:260000,
    shield:140000,
    radius:48,
    width:96,
    height:96,
    color:"#a855f7"
  }
};

export const PORTAL_CONFIGS = {
  ricky:{id:"ricky", name:"Portail de Ricky", reward:{credits:2000000, xp:400000, premium:5000, ammoX4:0, ammoX6:0}},
  blue:{id:"blue", name:"Portail Bleu", reward:{credits:3000000, xp:400000, premium:20000, ammoX4:20000, ammoX6:0}},
  violet:{id:"violet", name:"Portail Violet", reward:{credits:0, xp:0, premium:35000, ammoX4:35000, ammoX6:0}},
  red:{id:"red", name:"Portail Rouge", reward:{credits:0, xp:0, premium:50000, ammoX4:50000, ammoX6:0}},
  emerald:{id:"emerald", name:"Portail Emeraude", reward:{credits:0, xp:0, premium:50000, ammoX4:25000, ammoX6:0}},
  void:{id:"void", name:"Portail du Neant", reward:{credits:0, xp:0, premium:60000, ammoX4:30000, ammoX6:0}},
  ancient:{id:"ancient", name:"Portail Ancestral", reward:{credits:0, xp:0, premium:100000, ammoX4:0, ammoX6:10000}}
};

export const LOOT_OWNER_TIMEOUT_MS = 15000;
export const GROUND_LOOT_TTL_MS = 60000;
export const PORTAL_DROP_RULES = [
  {id:"blue", name:"Portail Bleu", img:"assets/portal_pieces/portal_piece_blue.png", dropZones:["Helion-01", "Helion-02", "Helion-03"], dropChance:0.0033},
  {id:"violet", name:"Portail Violet", img:"assets/portals/portail_violet.svg", dropZones:["Helion-03", "Helion-04", "Helion-05"], dropChance:0.0033},
  {id:"red", name:"Portail Rouge", img:"assets/portals/portail_rouge.svg", dropZones:["Zone 21-30"], dropChance:0.0033},
  {id:"emerald", name:"Portail Emeraude", img:"assets/portals/portail_emeraude.svg", dropZones:["Zone 31-40"], dropChance:0.0033},
  {id:"void", name:"Portail du Neant", img:"assets/portals/portail_neant.svg", dropZones:["Zone 41-50"], dropChance:0.0033},
  {id:"ancient", name:"Portail Ancestral", img:"assets/portals/portail_ancestral.svg", dropZones:["Zone 51+"], dropChance:0.0033}
];
