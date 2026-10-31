import { ENEMY_TYPES, PORTAL_WAVE_TOTAL } from "../combatData.js";
import { RICKY_PORTAL_MAP } from "../../data/rickyPortal.js";
import {
  VESPER_CAGE_DESTROYED_ASSET,
  VESPER_CAGE_INTACT_ASSET,
  VESPER_DRONE_ASSET,
  VESPER_PORTAL_ID,
  VESPER_PORTAL_MAP
} from "../../data/vesperPortal.js?v=20260726-kharon1";
import {
  KHARON_BOSS_ASSETS,
  KHARON_PORTAL_ID,
  KHARON_PORTAL_MAP
} from "../../data/kharonPortal.js?v=20260726-kharon1";
import {
  ECLANITE_BOSS_ASSETS,
  ECLANITE_CORE_ASSET,
  ECLANITE_PORTAL_ID,
  ECLANITE_PORTAL_MAP
} from "../../data/eclanitePortal.js?v=20260726-portals2530-1";
import { makeAsteroids, makeDust, makeStars, seededRandom } from "./mapState.js";

export function createPortalMap(portal){
  if(portal?.id === "ricky"){
    return {
      id:"portal-ricky",
      name:"BRECHE DE RICKY",
      width:RICKY_PORTAL_MAP.width,
      height:RICKY_PORTAL_MAP.height,
      spawn:{...RICKY_PORTAL_MAP.spawn, r:240, kind:"portal", label:"POINT D'INSERTION"},
      closedPortals:[{
        x:RICKY_PORTAL_MAP.spawn.x,
        y:RICKY_PORTAL_MAP.spawn.y,
        r:95,
        safeRadius:230,
        label:"PORTAIL FERME",
        damaged:true,
        closed:true
      }],
      portal:null,
      rickyPortal:true,
      enemyAssets:[
        "assets/enemies/deadly/deadly_01_emerald.webp",
        "assets/enemies/deadly/deadly_02_amber.webp",
        "assets/enemies/deadly/deadly_03_cyan.webp",
        "assets/enemies/deadly/deadly_04_magenta.webp",
        "assets/enemies/deadly/deadly_05_blue.webp",
        "assets/enemies/deadly/deadly_06_boss.webp"
      ],
      parallaxScene:{
        enabled:true,
        hideGrid:true,
        tileAlpha:0,
        background:["#080313", "#19072d", "#03010b"],
        nebulae:[
          {x:-1680, y:-720, r:1420, p:.055, color:"rgba(88,28,135,.16)", mid:"rgba(67,56,202,.055)", edge:"rgba(0,0,0,0)"},
          {x:1840, y:260, r:1580, p:.070, color:"rgba(147,51,234,.15)", mid:"rgba(76,29,149,.060)", edge:"rgba(0,0,0,0)"},
          {x:240, y:920, r:920, p:.10, color:"rgba(192,38,211,.085)", mid:"rgba(109,40,217,.035)", edge:"rgba(0,0,0,0)"}
        ],
        backdrops:[
          {src:"assets/maps/decor/deadly/deadly_cosmic_creature.png", x:420, y:240, w:1250, h:625, p:.025, alpha:.11},
          {src:"assets/maps/decor/deadly/deadly_cracked_moon.png", x:-680, y:-280, w:520, h:520, p:.045, alpha:.58}
        ],
        dustSpecks:[
          {x:-120, y:-160, w:1900, h:680, count:150, p:.09, sizeMin:.20, sizeMax:.78, alphaMin:.010, alphaMax:.048, colors:["216,180,254", "196,181,253", "244,114,182"]},
          {x:540, y:420, w:1550, h:560, count:96, p:.16, sizeMin:.18, sizeMax:.66, alphaMin:.008, alphaMax:.036, colors:["192,132,252", "167,139,250", "232,121,249"]}
        ],
        lightClouds:[
          {x:-520, y:-120, r:760, p:.045, seed:711, alpha:.125, blobs:13, filaments:0, rotation:.18, squeeze:.46, core:"rgba(168,85,247,.125)", mid:"rgba(88,28,135,.054)", edge:"rgba(20,4,32,.014)"},
          {x:520, y:300, r:680, p:.060, seed:712, alpha:.110, blobs:11, filaments:0, rotation:-.30, squeeze:.54, core:"rgba(192,132,252,.110)", mid:"rgba(109,40,217,.048)", edge:"rgba(18,4,32,.012)"},
          {x:1080, y:-460, r:500, p:.080, seed:713, alpha:.082, blobs:9, filaments:0, rotation:.42, squeeze:.48, core:"rgba(217,70,239,.082)", mid:"rgba(126,34,206,.036)", edge:"rgba(20,3,30,.010)"}
        ],
        images:[
          {src:"assets/maps/decor/deadly/deadly_wreck_scout.png", x:-620, y:420, w:330, h:220, p:.18, alpha:.86, rotation:.14},
          {src:"assets/maps/decor/deadly/deadly_wreck_crescent.png", x:760, y:-380, w:420, h:280, p:.26, alpha:.82, rotation:-.10}
        ],
        foregroundClouds:[
          {x:-1540, y:1180, r:430, p:.48, seed:731, alpha:.090, blobs:14, filaments:0, scale:.66, squeeze:.48, core:"rgba(168,85,247,.090)", mid:"rgba(88,28,135,.042)", edge:"rgba(14,3,24,.011)"},
          {x:1480, y:-860, r:390, p:.52, seed:732, alpha:.082, blobs:13, filaments:0, scale:.62, squeeze:.52, core:"rgba(217,70,239,.082)", mid:"rgba(126,34,206,.038)", edge:"rgba(16,3,26,.010)"}
        ],
        glowSpots:[
          {x:-100, y:-120, r:1150, p:.10, seed:741, alpha:.18, speed:1800, core:"rgba(255,255,255,.64)", hot:"rgba(103,232,249,.28)", mid:"rgba(37,99,235,.09)"}
        ],
        starLights:[
          {x:-100, y:-120, r:980, p:.10, seed:742, alpha:.40, coreAlpha:.58, speed:1650, coreRadius:.050, colors:{core:"255,255,255", hot:"224,242,254", mid:"103,232,249", haze:"37,99,235"}}
        ],
        asteroidFields:[
          {x:-380, y:-760, w:4700, h:1650, count:64, p:.11, angle:-.06, alpha:.40, sizeMin:2, sizeMax:9, sizePower:1.7, craters:0, tint:"slate", shadeMin:24, shadeMax:58},
          {x:760, y:520, w:3300, h:1500, count:42, p:.22, angle:.12, alpha:.56, sizeMin:5, sizeMax:17, sizePower:1.9, craters:1, tint:"slate", shadeMin:22, shadeMax:52},
          {x:-900, y:620, w:2600, h:1300, count:20, p:.32, angle:-.14, alpha:.72, sizeMin:10, sizeMax:25, sizePower:2.1, craters:2, tint:"slate", shadeMin:20, shadeMax:48}
        ]
      }
    };
  }
  if(portal?.id === VESPER_PORTAL_ID){
    return {
      id:"portal-violet",
      name:"LA FAILLE DE VESPER",
      width:VESPER_PORTAL_MAP.width,
      height:VESPER_PORTAL_MAP.height,
      spawn:{...VESPER_PORTAL_MAP.spawn, r:240, kind:"portal", label:"POINT D'INSERTION"},
      portal:null,
      vesperPortal:true,
      enemyAssets:[
        VESPER_DRONE_ASSET,
        VESPER_CAGE_INTACT_ASSET,
        VESPER_CAGE_DESTROYED_ASSET
      ],
      parallaxScene:{
        enabled:true,
        hideGrid:false,
        tileAlpha:.05,
        background:["#09020e", "#210716", "#050108"],
        nebulae:[
          {x:-2200, y:-1200, r:1780, p:.05, color:"rgba(190,24,93,.16)", mid:"rgba(88,28,135,.07)", edge:"rgba(0,0,0,0)"},
          {x:2150, y:1100, r:1680, p:.07, color:"rgba(220,38,38,.12)", mid:"rgba(126,34,206,.06)", edge:"rgba(0,0,0,0)"},
          {x:0, y:0, r:1100, p:.11, color:"rgba(239,68,68,.055)", mid:"rgba(192,38,211,.03)", edge:"rgba(0,0,0,0)"}
        ],
        dustSpecks:[
          {x:-2800, y:-1850, w:5600, h:3700, count:170, p:.10, sizeMin:.18, sizeMax:.72, alphaMin:.012, alphaMax:.050, colors:["254,202,202", "244,114,182", "216,180,254"]},
          {x:-2400, y:-1500, w:4800, h:3000, count:95, p:.20, sizeMin:.20, sizeMax:.88, alphaMin:.010, alphaMax:.042, colors:["248,113,113", "192,132,252", "251,113,133"]}
        ],
        glowSpots:[
          {x:0, y:0, r:900, p:.10, seed:815, alpha:.13, speed:1900, core:"rgba(255,255,255,.50)", hot:"rgba(251,113,133,.22)", mid:"rgba(126,34,206,.08)"}
        ],
        asteroidFields:[
          {x:-2800, y:-2050, w:5600, h:900, count:34, p:.13, angle:.04, alpha:.34, sizeMin:3, sizeMax:11, sizePower:1.8, craters:1, tint:"slate", shadeMin:20, shadeMax:50},
          {x:-2800, y:1200, w:5600, h:900, count:28, p:.24, angle:-.08, alpha:.48, sizeMin:5, sizeMax:18, sizePower:1.9, craters:1, tint:"slate", shadeMin:18, shadeMax:46}
        ]
      }
    };
  }
  if(portal?.id === KHARON_PORTAL_ID){
    return {
      id:"portal-red",
      name:"LA FORGE DE KHARON",
      width:KHARON_PORTAL_MAP.width,
      height:KHARON_PORTAL_MAP.height,
      spawn:{...KHARON_PORTAL_MAP.spawn, r:240, kind:"portal", label:"POINT D'INSERTION"},
      portal:null,
      kharonPortal:true,
      enemyAssets:Object.values(KHARON_BOSS_ASSETS),
      parallaxScene:{
        enabled:true,
        hideGrid:false,
        tileAlpha:.055,
        background:["#120503", "#310b05", "#080101"],
        nebulae:[
          {x:-1800, y:-800, r:1500, p:.05, color:"rgba(234,88,12,.16)", mid:"rgba(127,29,29,.075)", edge:"rgba(0,0,0,0)"},
          {x:1850, y:700, r:1460, p:.07, color:"rgba(220,38,38,.13)", mid:"rgba(124,45,18,.06)", edge:"rgba(0,0,0,0)"},
          {x:0, y:0, r:920, p:.12, color:"rgba(251,146,60,.06)", mid:"rgba(153,27,27,.035)", edge:"rgba(0,0,0,0)"}
        ],
        dustSpecks:[
          {x:-2400, y:-1600, w:4800, h:3200, count:145, p:.11, sizeMin:.18, sizeMax:.76, alphaMin:.012, alphaMax:.052, colors:["254,215,170", "248,113,113", "253,186,116"]},
          {x:-2100, y:-1350, w:4200, h:2700, count:86, p:.21, sizeMin:.20, sizeMax:.90, alphaMin:.010, alphaMax:.044, colors:["251,146,60", "239,68,68", "254,202,202"]}
        ],
        glowSpots:[
          {x:0, y:0, r:820, p:.10, seed:905, alpha:.15, speed:1600, core:"rgba(255,255,255,.52)", hot:"rgba(251,146,60,.25)", mid:"rgba(153,27,27,.09)"}
        ],
        asteroidFields:[
          {x:-2450, y:-1700, w:4900, h:760, count:30, p:.13, angle:.06, alpha:.38, sizeMin:3, sizeMax:12, sizePower:1.8, craters:1, tint:"slate", shadeMin:18, shadeMax:46},
          {x:-2450, y:980, w:4900, h:760, count:26, p:.24, angle:-.07, alpha:.50, sizeMin:5, sizeMax:18, sizePower:1.9, craters:1, tint:"slate", shadeMin:17, shadeMax:43}
        ]
      }
    };
  }
  if(portal?.id === ECLANITE_PORTAL_ID){
    return {
      id:"portal-emerald",
      name:"LA RUCHE D'ECLANITE",
      width:ECLANITE_PORTAL_MAP.width,
      height:ECLANITE_PORTAL_MAP.height,
      spawn:{...ECLANITE_PORTAL_MAP.spawn, r:240, kind:"portal", label:"POINT D'INSERTION"},
      portal:null,
      eclanitePortal:true,
      enemyAssets:[ECLANITE_CORE_ASSET, ...Object.values(ECLANITE_BOSS_ASSETS)],
      parallaxScene:{
        enabled:true,
        hideGrid:false,
        tileAlpha:.045,
        background:["#02110d", "#071f1c", "#02050b"],
        nebulae:[
          {x:-1500, y:900, r:1450, p:.05, color:"rgba(16,185,129,.16)", mid:"rgba(5,150,105,.07)", edge:"rgba(0,0,0,0)"},
          {x:1550, y:760, r:1380, p:.07, color:"rgba(239,68,68,.11)", mid:"rgba(127,29,29,.055)", edge:"rgba(0,0,0,0)"},
          {x:0, y:-980, r:1700, p:.09, color:"rgba(59,130,246,.13)", mid:"rgba(30,64,175,.055)", edge:"rgba(0,0,0,0)"}
        ],
        dustSpecks:[
          {x:-2500, y:-1700, w:5000, h:3400, count:170, p:.10, sizeMin:.18, sizeMax:.78, alphaMin:.012, alphaMax:.052, colors:["134,239,172", "248,113,113", "147,197,253"]}
        ],
        glowSpots:[
          {x:-1300, y:820, r:720, p:.10, seed:1031, alpha:.12, speed:1700, core:"rgba(255,255,255,.48)", hot:"rgba(74,222,128,.24)", mid:"rgba(5,150,105,.08)"},
          {x:1300, y:820, r:720, p:.12, seed:1032, alpha:.11, speed:1800, core:"rgba(255,255,255,.45)", hot:"rgba(248,113,113,.22)", mid:"rgba(127,29,29,.07)"},
          {x:0, y:-900, r:880, p:.14, seed:1033, alpha:.13, speed:1900, core:"rgba(255,255,255,.50)", hot:"rgba(96,165,250,.24)", mid:"rgba(30,64,175,.08)"}
        ],
        asteroidFields:[
          {x:-2520, y:-1720, w:5040, h:500, count:22, p:.15, angle:.04, alpha:.36, sizeMin:3, sizeMax:12, sizePower:1.8, craters:1, tint:"slate", shadeMin:18, shadeMax:46},
          {x:-2520, y:1220, w:5040, h:470, count:20, p:.25, angle:-.05, alpha:.44, sizeMin:4, sizeMax:16, sizePower:1.9, craters:1, tint:"slate", shadeMin:17, shadeMax:43}
        ]
      }
    };
  }
  return {
    id:`portal-${portal.id}`,
    name:portal.name.toUpperCase(),
    width:5200,
    height:3600,
    spawn:{x:0,y:0,r:240,kind:"portal",label:"COEUR DU PORTAIL"},
    portal:null
  };
}

function makePortalEnemy(kind, wave, x, y, id, boss=false){
  const base = ENEMY_TYPES[kind] || ENEMY_TYPES.drone_pirate;
  const level = Array.isArray(base.levelRange)
    ? Math.floor(base.levelRange[0] + Math.random() * (base.levelRange[1] - base.levelRange[0] + 1))
    : (boss ? 20 + wave : Math.max(1, Math.round(1 + wave * 0.65)));
  const maxHp = base.maxHp(level) * (boss ? 2.2 : 1);
  const maxShield = (base.maxShield?.(level) || 0) * (boss ? 2.2 : 1);
  return {
    id,
    x,y,homeX:x,homeY:y,
    hp:maxHp,maxHp,
    shield:maxShield,maxShield,
    level,
    kind,
    type: boss ? `${base.name} Alpha` : base.name,
    img:base.img,
    width: boss ? Math.round(base.width * 1.22) : base.width,
    height: boss ? Math.round(base.height * 1.22) : base.height,
    speed: base.speed(level) * (boss ? 0.9 : 1),
    radius: boss ? Math.round(base.radius * 1.18) : base.radius,
    attackRange:base.attackRange,
    shieldAbsorbRatio:base.shieldAbsorbRatio ?? 0.8,
    attackDamage: Math.round(base.attackDamage(level) * (boss ? 1.5 : 1)),
    attackDamageMin: base.attackDamageMin ? Math.round(base.attackDamageMin * (boss ? 1.5 : 1)) : undefined,
    attackDamageMax: base.attackDamageMax ? Math.round(base.attackDamageMax * (boss ? 1.5 : 1)) : undefined,
    attackCooldown: boss ? Math.max(0.9, base.attackCooldown * 0.82) : base.attackCooldown,
    projectileSpeed: base.projectileSpeed,
    color:base.color,
    particle:base.particle,
    onHitEffect:base.onHitEffect,
    loot: boss ? {credits:base.loot.credits*2, xp:base.loot.xp*2, premium:base.loot.premium} : base.loot,
    aggro:true,
    angle:0,
    hitT:0.6 + Math.random() * 0.5
  };
}

export function buildPortalWave(wave, startEnemySeq=1){
  const list = [];
  let nextEnemySeq = startEnemySeq;
  if(wave >= PORTAL_WAVE_TOTAL){
    list.push(makePortalEnemy("cuirasse_nebulaire", wave, 0, -1040, nextEnemySeq++, true));
  }else{
    const batch = Math.ceil(wave / 5);
    const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
    const kinds = batch <= 2 ? ["drone_pirate","raider_astral"] : batch <= 4 ? ["raider_astral","chasseur_spectral"] : ["chasseur_spectral","cuirasse_nebulaire"];
    for(let i=0;i<count;i++){
      const kind = kinds[i % kinds.length];
      const side = i % 3;
      const x = side === 0 ? -1480 + i*80 : side === 1 ? 1480 - i*75 : -480 + i*105;
      const y = -1040 - (i%4)*96;
      list.push(makePortalEnemy(kind, wave, x, y, nextEnemySeq++, false));
    }
  }
  return {enemies:list, nextEnemySeq};
}

export function buildPortalEnvironment(portalId, map){
  const rnd = seededRandom(8000 + portalId.length * 37);
  const asteroidMap = {width:map.width, height:map.height, spawn:map.spawn, portal:{x:9999,y:9999,r:0}};
  return {
    asteroids:makeAsteroids(asteroidMap, rnd).slice(0, portalId === "ricky" ? 42 : 24),
    stars:makeStars(rnd),
    dust:makeDust(rnd),
    nebulae:portalId === "ricky" ? [
      {x:-2100,y:-900,r:1500,c:"rgba(34,211,238,.10)",p:.16},
      {x:2200,y:500,r:1700,c:"rgba(236,72,153,.08)",p:.13},
      {x:0,y:2600,r:1200,c:"rgba(250,204,21,.05)",p:.10}
    ] : [
      {x:-920,y:-520,r:1120,c:"rgba(168,85,247,.13)",p:.20},
      {x:1120,y:-700,r:960,c:"rgba(56,189,248,.10)",p:.18},
      {x:0,y:1180,r:760,c:"rgba(251,146,60,.08)",p:.12}
    ]
  };
}
