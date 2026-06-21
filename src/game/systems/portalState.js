import { ENEMY_TYPES, PORTAL_WAVE_TOTAL } from "../combatData.js";
import { RICKY_PORTAL_MAP } from "../../data/rickyPortal.js";
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
