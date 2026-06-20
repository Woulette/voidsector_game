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
        hideGrid:false,
        background:["#02040b", "#090d1b", "#03050d"],
        nebulae:[
          {x:-1900, y:-900, r:1500, p:.08, color:"rgba(34,211,238,.12)", mid:"rgba(37,99,235,.05)", edge:"rgba(0,0,0,0)"},
          {x:2100, y:400, r:1700, p:.06, color:"rgba(236,72,153,.10)", mid:"rgba(88,28,135,.05)", edge:"rgba(0,0,0,0)"}
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
