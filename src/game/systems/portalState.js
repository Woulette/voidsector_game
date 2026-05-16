import { ENEMY_TYPES, PORTAL_WAVE_TOTAL } from "../combatData.js";
import { makeAsteroids, makeDust, makeStars, seededRandom } from "./mapState.js";

export function createPortalMap(portal){
  return {
    id:`portal-${portal.id}`,
    name:portal.name.toUpperCase(),
    width:3600,
    height:2600,
    spawn:{x:0,y:920,r:220,label:"ZONE D'ENTRÉE"},
    portal:null
  };
}

function makePortalEnemy(kind, wave, x, y, id, boss=false){
  const base = ENEMY_TYPES[kind] || ENEMY_TYPES.drone_pirate;
  const level = boss ? 20 + wave : Math.max(1, Math.round(1 + wave * 0.65));
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
    attackRange:450,
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
    list.push(makePortalEnemy("cuirasse_nebulaire", wave, 0, -760, nextEnemySeq++, true));
  }else{
    const batch = Math.ceil(wave / 5);
    const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
    const kinds = batch <= 2 ? ["drone_pirate","raider_astral"] : batch <= 4 ? ["raider_astral","chasseur_spectral"] : ["chasseur_spectral","cuirasse_nebulaire"];
    for(let i=0;i<count;i++){
      const kind = kinds[i % kinds.length];
      const side = i % 3;
      const x = side === 0 ? -1180 + i*70 : side === 1 ? 1180 - i*65 : -380 + i*92;
      const y = -760 - (i%4)*88;
      list.push(makePortalEnemy(kind, wave, x, y, nextEnemySeq++, false));
    }
  }
  return {enemies:list, nextEnemySeq};
}

export function buildPortalEnvironment(portalId, map){
  const rnd = seededRandom(8000 + portalId.length * 37);
  const asteroidMap = {width:map.width, height:map.height, spawn:map.spawn, portal:{x:9999,y:9999,r:0}};
  return {
    asteroids:makeAsteroids(asteroidMap, rnd).slice(0, 18),
    stars:makeStars(rnd),
    dust:makeDust(rnd),
    nebulae:[
      {x:-720,y:-360,r:920,c:"rgba(168,85,247,.13)",p:.20},
      {x:860,y:-540,r:780,c:"rgba(56,189,248,.10)",p:.18},
      {x:0,y:940,r:620,c:"rgba(251,146,60,.08)",p:.12}
    ]
  };
}
