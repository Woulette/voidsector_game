import { ENEMY_TYPES } from "../combatData.js";

export function seededRandom(seed){
  let value = seed % 2147483647;
  return ()=>{
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function chooseEnemyType(map, rnd){
  const list = map.enemyTypes?.length ? map.enemyTypes : [{id:"drone_pirate", weight:1}];
  const total = list.reduce((sum, entry)=>sum + entry.weight, 0) || 1;
  let roll = rnd() * total;
  for(const entry of list){
    roll -= entry.weight;
    if(roll <= 0) return ENEMY_TYPES[entry.id] || ENEMY_TYPES.drone_pirate;
  }
  return ENEMY_TYPES[list[list.length-1].id] || ENEMY_TYPES.drone_pirate;
}

export function makeStars(rnd){
  const result = [];
  for(let layer=0; layer<3; layer++){
    const count = [320,220,120][layer];
    for(let i=0;i<count;i++){
      result.push({
        x:rnd()*9000-4500,
        y:rnd()*9000-4500,
        s:rnd()*[1.2,1.8,2.8][layer]+0.35,
        a:rnd()*[.35,.55,.85][layer]+.15,
        p:[.18,.42,.78][layer]
      });
    }
  }
  return result;
}

export function makeDust(rnd){
  return Array.from({length:70},()=>({x:rnd()*7000-3500,y:rnd()*7000-3500,len:20+rnd()*70,a:.05+rnd()*.16,p:.9}));
}

export function makeAsteroids(map, rnd){
  return Array.from({length:80},()=>({
    x:rnd()*map.width-map.width/2,
    y:rnd()*map.height-map.height/2,
    r:.55+rnd()*1.65,
    rot:rnd()*Math.PI,
    shade:rnd(),
    a:.26+rnd()*.54,
    len:10+rnd()*28,
    tint:rnd()
  })).filter(a=>Math.hypot(a.x-map.spawn.x,a.y-map.spawn.y) > map.spawn.r + 140);
}

export function buildMapState(map, startEnemySeq=1){
  const rnd = seededRandom(1000 + map.enemySeed);
  const generatedEnemies = [];
  let nextEnemySeq = startEnemySeq;
  for(let i=0;i<map.enemyCount;i++){
    let x, y, tries = 0;
    do{
      x = rnd()*map.width - map.width/2;
      y = rnd()*map.height - map.height/2;
      tries++;
    }while((Math.hypot(x-map.spawn.x,y-map.spawn.y) < map.spawn.r + 520 || Math.hypot(x-map.portal.x,y-map.portal.y) < 360) && tries < 80);
    const level = Math.floor(map.enemyLevel[0] + rnd()*(map.enemyLevel[1]-map.enemyLevel[0]+1));
    const enemyType = chooseEnemyType(map, rnd);
    const maxHp = enemyType.maxHp(level);
    generatedEnemies.push({
      id:nextEnemySeq++,
      x,y,homeX:x,homeY:y,
      hp:maxHp,maxHp,level,
      kind:Object.keys(ENEMY_TYPES).find(key=>ENEMY_TYPES[key] === enemyType) || "drone_pirate",
      type:enemyType.name,
      img:enemyType.img,
      width:enemyType.width,
      height:enemyType.height,
      speed:enemyType.speed(level),
      radius:enemyType.radius,
      attackRange:enemyType.attackRange,
      attackDamage:enemyType.attackDamage(level),
      attackCooldown:enemyType.attackCooldown,
      projectileSpeed:enemyType.projectileSpeed,
      color:enemyType.color,
      particle:enemyType.particle,
      loot:enemyType.loot,
      aggro:false,
      angle:0,
      hitT:rnd()*.75
    });
  }
  return {
    nextEnemySeq,
    state:{
      enemies:generatedEnemies,
      asteroids:makeAsteroids(map, rnd),
      stars:makeStars(rnd),
      dust:makeDust(rnd)
    }
  };
}
