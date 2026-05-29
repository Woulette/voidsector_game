import http from "node:http";
import fs from "node:fs";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const PROFILE_STORE_URL = new URL("../data/profiles.json", import.meta.url);

const httpServer = http.createServer((req, res)=>{
  if(req.url === "/health"){
    res.writeHead(200, {"content-type":"application/json"});
    res.end(JSON.stringify({ok:true, service:"voidsector-realtime"}));
    return;
  }
  res.writeHead(200, {"content-type":"text/plain; charset=utf-8"});
  res.end("VoidSector realtime server");
});

const io = new Server(httpServer, {
  cors:{
    origin:CLIENT_ORIGIN,
    methods:["GET", "POST"]
  }
});

const players = new Map();
const groups = new Map();
const worldMaps = new Map();
const serverQuestProgress = new Map();
const profiles = new Map();
let groupSeq = 1;
let instanceSeq = 1;
const PORTAL_WAVE_TOTAL = 30;

const WORLD_MAPS = {
  "0":{id:"0", name:"ASTRA-01", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320}, seed:7, count:40, level:[1,3], enemyTypes:[["drone_pirate", .50], ["raider_astral", .50]]},
  "1":{id:"1", name:"ASTRA-02", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320}, seed:19, count:40, level:[3,7], enemyTypes:[["drone_pirate", .30], ["raider_astral", .46], ["chasseur_spectral", .24]]},
  "2":{id:"2", name:"ASTRA-03", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320}, seed:29, count:42, level:[7,10], enemyTypes:[["raider_astral", .36], ["chasseur_spectral", .64]]},
  "3":{id:"3", name:"ASTRA-04", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320}, seed:41, count:45, level:[10,14], enemyTypes:[["raider_astral", .24], ["chasseur_spectral", .76]]},
  "4":{id:"4", name:"ASTRA-05", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320}, seed:59, count:30, level:[18,24], enemyTypes:[["boss_drone_pirate", .16], ["boss_raider_astral", .18], ["boss_chasseur_spectral", .20], ["boss_cuirasse_nebulaire", .20], ["boss_cristal_du_neant", .16], ["boss_cuirasse_ambre", .10]]},
  "20":{id:"20", name:"CYAN-01", width:10000, height:8000, spawn:{x:-2250, y:1450, r:320}, seed:207, count:20, level:[1,3], enemyTypes:[["drone_pirate", .70], ["raider_astral", .30]]}
};
const SERVER_QUESTS = [
  ["quest_drone_cleanup", "drone_pirate", 6, "ASTRA-01"],
  ["quest_raider_patrol", "raider_astral", 4, "ASTRA-01"],
  ["quest_spectral_scan", "chasseur_spectral", 5, "ASTRA-02"],
  ["quest_daily_cleanup", "drone_pirate", 8, "ASTRA-01"],
  ["quest_weekly_assault", "chasseur_spectral", 15, "ASTRA-02"],
  ["quest_astra01_orb_easy_01", "drone_pirate", 10, "ASTRA-01"],
  ["quest_astra01_orb_easy_02", "drone_pirate", 18, "ASTRA-01"],
  ["quest_astra01_raider_easy_02", "raider_astral", 12, "ASTRA-01"],
  ["quest_astra02_orb_normal_01", "drone_pirate", 14, "ASTRA-02"],
  ["quest_astra02_raider_normal_01", "raider_astral", 16, "ASTRA-02"],
  ["quest_astra02_spectral_normal_01", "chasseur_spectral", 10, "ASTRA-02"],
  ["quest_astra02_spectral_daily_01", "chasseur_spectral", 16, "ASTRA-02"],
  ["quest_astra03_raider_normal_01", "raider_astral", 14, "ASTRA-03"],
  ["quest_astra03_spectral_normal_01", "chasseur_spectral", 18, "ASTRA-03"],
  ["quest_astra03_spectral_hard_01", "chasseur_spectral", 35, "ASTRA-03"],
  ["quest_astra04_spectral_hard_01", "chasseur_spectral", 22, "ASTRA-04"],
  ["quest_astra04_spectral_hard_02", "chasseur_spectral", 45, "ASTRA-04"],
  ["quest_astra05_boss_orb_01", "boss_drone_pirate", 5, "ASTRA-05"],
  ["quest_astra05_boss_raider_01", "boss_raider_astral", 5, "ASTRA-05"],
  ["quest_astra05_boss_spectral_01", "boss_chasseur_spectral", 5, "ASTRA-05"],
  ["quest_astra05_boss_nebular_01", "boss_cuirasse_nebulaire", 4, "ASTRA-05"],
  ["quest_astra05_boss_crystal_01", "boss_cristal_du_neant", 4, "ASTRA-05"],
  ["quest_astra05_boss_amber_01", "boss_cuirasse_ambre", 3, "ASTRA-05"],
  ["quest_astra05_boss_daily_01", "boss_drone_pirate", 10, "ASTRA-05"],
  ["quest_astra05_boss_daily_02", "boss_chasseur_spectral", 8, "ASTRA-05"],
  ["quest_astra05_boss_weekly_01", "boss_raider_astral", 25, "ASTRA-05"],
  ["quest_astra05_boss_weekly_02", "boss_cuirasse_ambre", 12, "ASTRA-05"],
  ["quest_cyan01_orb_easy_01", "drone_pirate", 8, "CYAN-01"],
  ["quest_cyan01_raider_easy_01", "raider_astral", 10, "CYAN-01"]
].map(([id, target, count, zone])=>({id, target, count, zone}));

const WORLD_ENEMY_TYPES = {
  drone_pirate:{
    kind:"drone_pirate",
    type:"Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
    radius:26,
    width:74,
    height:74,
    hp:level=>800,
    shield:()=>0,
    speed:()=>190,
    attackRange:500,
    attackDamage:level=>34 + level * 4,
    attackCooldown:1250,
    reward:level=>({credits:900 + level * 120, xp:220 + level * 45, premium:1}),
    color:"rgba(248,113,113,.95)",
    shieldAbsorbRatio:.8
  },
  raider_astral:{
    kind:"raider_astral",
    type:"Vorak rusher",
    img:"assets/enemies/enemy_red_rusher.png",
    radius:36,
    width:88,
    height:88,
    hp:level=>1450 + level * 170,
    shield:()=>0,
    speed:()=>220,
    attackRange:250,
    attackDamage:()=>115,
    attackCooldown:1350,
    reward:level=>({credits:1200 + level * 180, xp:360 + level * 70, premium:2}),
    color:"rgba(251,146,60,.95)",
    shieldAbsorbRatio:.8
  },
  chasseur_spectral:{
    kind:"chasseur_spectral",
    type:"Parasite astral",
    img:"assets/enemies/enemy_green_parasite.png",
    radius:34,
    width:86,
    height:86,
    hp:()=>3500,
    shield:()=>1500,
    speed:()=>200,
    attackRange:350,
    attackDamage:()=>200,
    attackCooldown:1550,
    reward:level=>({credits:2800 + level * 260, xp:950 + level * 120, premium:3}),
    color:"rgba(168,85,247,.95)",
    shieldAbsorbRatio:.8
  },
  boss_drone_pirate:{
    kind:"boss_drone_pirate",
    type:"Boss Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
    radius:32,
    width:88,
    height:88,
    hp:()=>800 * 4,
    shield:()=>0,
    speed:()=>190,
    attackRange:500,
    attackDamage:level=>(34 + level * 4) * 4,
    attackCooldown:1250,
    reward:()=>({credits:1200 * 4, xp:350 * 4, premium:2 * 4}),
    color:"rgba(248,113,113,.95)",
    shieldAbsorbRatio:.8
  },
  boss_raider_astral:{
    kind:"boss_raider_astral",
    type:"Boss Vorak rusher",
    img:"assets/enemies/enemy_red_rusher.png",
    radius:42,
    width:104,
    height:104,
    hp:level=>(1450 + level * 170) * 4,
    shield:()=>0,
    speed:()=>220,
    attackRange:250,
    attackDamage:()=>115 * 4,
    attackCooldown:1350,
    reward:()=>({credits:1500 * 4, xp:500 * 4, premium:3 * 4}),
    color:"rgba(251,146,60,.95)",
    shieldAbsorbRatio:.8
  },
  boss_chasseur_spectral:{
    kind:"boss_chasseur_spectral",
    type:"Boss Parasite astral",
    img:"assets/enemies/enemy_green_parasite.png",
    radius:42,
    width:104,
    height:104,
    hp:()=>3500 * 4,
    shield:()=>1500 * 4,
    speed:()=>200,
    attackRange:350,
    attackDamage:()=>200 * 4,
    attackCooldown:1550,
    reward:()=>({credits:4000 * 4, xp:1700 * 4, premium:5 * 4}),
    color:"rgba(168,85,247,.95)",
    shieldAbsorbRatio:.8
  },
  boss_cuirasse_nebulaire:{
    kind:"boss_cuirasse_nebulaire",
    type:"Boss Traqueur abyssal",
    img:"assets/enemies/enemy_blue_spider.png",
    radius:54,
    width:126,
    height:126,
    hp:()=>8000 * 4,
    shield:()=>2000 * 4,
    speed:()=>150,
    attackRange:350,
    attackDamage:()=>300 * 4,
    attackCooldown:1700,
    reward:()=>({credits:7000 * 4, xp:3000 * 4, premium:8 * 4}),
    color:"rgba(96,165,250,.95)",
    shieldAbsorbRatio:.8
  },
  boss_cuirasse_ambre:{
    kind:"boss_cuirasse_ambre",
    type:"Boss Cuirasse ambre",
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    radius:70,
    width:164,
    height:164,
    hp:()=>80000 * 4,
    shield:()=>50000 * 4,
    speed:()=>165,
    attackRange:350,
    attackDamage:()=>1500 * 4,
    attackCooldown:1650,
    reward:()=>({credits:100000 * 4, xp:20000 * 4, premium:30 * 4}),
    color:"rgba(251,146,60,.95)",
    shieldAbsorbRatio:.8
  },
  boss_cristal_du_neant:{
    kind:"boss_cristal_du_neant",
    type:"Boss Cristal du neant",
    img:"assets/enemies/enemy_purple_crystal.png",
    radius:56,
    width:128,
    height:128,
    hp:()=>40000 * 4,
    shield:()=>20000 * 4,
    speed:()=>170,
    attackRange:400,
    attackDamage:()=>900 * 4,
    attackCooldown:1850,
    reward:()=>({credits:60000 * 4, xp:12000 * 4, premium:20 * 4}),
    color:"rgba(168,85,247,.95)",
    shieldAbsorbRatio:.8
  }
};

const COOP_ENEMY_TYPES = {
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

const PORTAL_CONFIGS = {
  blue:{id:"blue", name:"Portail Bleu", reward:{credits:3000000, xp:400000, premium:20000, ammoX4:20000, ammoX6:0}},
  violet:{id:"violet", name:"Portail Violet", reward:{credits:0, xp:0, premium:35000, ammoX4:35000, ammoX6:0}},
  red:{id:"red", name:"Portail Rouge", reward:{credits:0, xp:0, premium:50000, ammoX4:50000, ammoX6:0}},
  emerald:{id:"emerald", name:"Portail Emeraude", reward:{credits:0, xp:0, premium:50000, ammoX4:25000, ammoX6:0}},
  void:{id:"void", name:"Portail du Neant", reward:{credits:0, xp:0, premium:60000, ammoX4:30000, ammoX6:0}},
  ancient:{id:"ancient", name:"Portail Ancestral", reward:{credits:0, xp:0, premium:100000, ammoX4:0, ammoX6:10000}}
};

const LOOT_OWNER_TIMEOUT_MS = 15000;
const GROUND_LOOT_TTL_MS = 60000;
const PORTAL_DROP_RULES = [
  {id:"blue", name:"Portail Bleu", img:"assets/portal_pieces/portal_piece_blue.png", dropZones:["ASTRA-01", "ASTRA-02", "ASTRA-03"], dropChance:0.0033},
  {id:"violet", name:"Portail Violet", img:"assets/portals/portail_violet.svg", dropZones:["ASTRA-03", "ASTRA-04", "ASTRA-05"], dropChance:0.0033},
  {id:"red", name:"Portail Rouge", img:"assets/portals/portail_rouge.svg", dropZones:["Zone 21-30"], dropChance:0.0033},
  {id:"emerald", name:"Portail Emeraude", img:"assets/portals/portail_emeraude.svg", dropZones:["Zone 31-40"], dropChance:0.0033},
  {id:"void", name:"Portail du Neant", img:"assets/portals/portail_neant.svg", dropZones:["Zone 41-50"], dropChance:0.0033},
  {id:"ancient", name:"Portail Ancestral", img:"assets/portals/portail_ancestral.svg", dropZones:["Zone 51+"], dropChance:0.0033}
];

function cleanName(value){
  return String(value || "Pilote").trim().replace(/\s+/g, " ").slice(0, 24) || "Pilote";
}

function profileKey(name){
  return cleanName(name).toLowerCase();
}

function sanitizeObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function sanitizeProfile(profile = {}){
  return {
    updatedAt:Math.max(0, Number(profile.updatedAt || Date.now())),
    player:sanitizeObject(profile.player),
    cargoHold:sanitizeObject(profile.cargoHold),
    skillRanks:sanitizeObject(profile.skillRanks),
    skillLevels:sanitizeObject(profile.skillLevels),
    completedPortals:sanitizeObject(profile.completedPortals),
    portalPieces:sanitizeObject(profile.portalPieces),
    refineryLevels:sanitizeObject(profile.refineryLevels),
    refineryModules:sanitizeObject(profile.refineryModules),
    refineryUpgradeJobs:sanitizeObject(profile.refineryUpgradeJobs),
    refineryShipmentJob:profile.refineryShipmentJob && typeof profile.refineryShipmentJob === "object" ? sanitizeObject(profile.refineryShipmentJob) : null,
    refineryJob:profile.refineryJob && typeof profile.refineryJob === "object" ? sanitizeObject(profile.refineryJob) : null,
    refineryProductionDisabled:sanitizeObject(profile.refineryProductionDisabled),
    refineryLastTick:Math.max(0, Number(profile.refineryLastTick || Date.now()))
  };
}

function loadProfiles(){
  try{
    if(!fs.existsSync(PROFILE_STORE_URL)) return;
    const raw = fs.readFileSync(PROFILE_STORE_URL, "utf8");
    const data = JSON.parse(raw || "{}");
    for(const [key, profile] of Object.entries(data || {})) profiles.set(key, sanitizeProfile(profile));
  }catch(error){
    console.warn("Unable to load profiles:", error?.message || error);
  }
}

function persistProfiles(){
  try{
    fs.mkdirSync(new URL("../data/", import.meta.url), {recursive:true});
    fs.writeFileSync(PROFILE_STORE_URL, JSON.stringify(Object.fromEntries(profiles), null, 2));
  }catch(error){
    console.warn("Unable to save profiles:", error?.message || error);
  }
}

loadProfiles();

function publicPlayer(player){
  return {
    id:player.id,
    name:player.name,
    groupId:player.groupId || null,
    state:player.state || null,
    connectedAt:player.connectedAt
  };
}

function publicGroup(group){
  if(!group) return null;
  return {
    id:group.id,
    leaderId:group.leaderId,
    members:group.members.map(id=>publicPlayer(players.get(id))).filter(Boolean)
  };
}

function publicEnemy(enemy){
  return {
    id:enemy.id,
    serverControlled:true,
    kind:enemy.kind,
    type:enemy.type,
    img:enemy.img,
    level:enemy.level,
    x:enemy.x,
    y:enemy.y,
    vx:enemy.vx || 0,
    vy:enemy.vy || 0,
    angle:enemy.angle || 0,
    hp:enemy.hp,
    maxHp:enemy.maxHp,
    shield:enemy.shield,
    maxShield:enemy.maxShield,
    radius:enemy.radius,
    width:enemy.width,
    height:enemy.height,
    speed:enemy.speed || 0,
    moving:Boolean(enemy.moving),
    color:enemy.color,
    recentHitTimer:enemy.recentHitTimer || 0
  };
}

function seededRandom(seed){
  let value = Math.max(1, Math.floor(Number(seed || 1))) % 2147483647;
  return ()=>{
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pickWeighted(entries, rnd){
  const total = entries.reduce((sum, entry)=>sum + Number(entry[1] || 0), 0) || 1;
  let roll = rnd() * total;
  for(const entry of entries){
    roll -= Number(entry[1] || 0);
    if(roll <= 0) return entry[0];
  }
  return entries[entries.length - 1]?.[0] || "drone_pirate";
}

function randomLevel(map, rnd){
  const min = Math.floor(Number(map.level?.[0] || 1));
  const max = Math.floor(Number(map.level?.[1] || min));
  return Math.floor(min + rnd() * (max - min + 1));
}

function findWorldSpawn(map, rnd){
  for(let tries = 0; tries < 120; tries++){
    const x = rnd() * map.width - map.width / 2;
    const y = rnd() * map.height - map.height / 2;
    if(map.spawn && Math.hypot(x - map.spawn.x, y - map.spawn.y) < (map.spawn.r || 320) + 620) continue;
    return {x, y};
  }
  return {x:0, y:0};
}

function createWorldEnemy(map, index, rnd = Math.random){
  const kind = pickWeighted(map.enemyTypes, rnd);
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const level = randomLevel(map, rnd);
  const {x, y} = findWorldSpawn(map, rnd);
  const hp = base.hp(level);
  const shield = base.shield(level);
  return {
    id:`W-${map.id}-E${index}`,
    serverControlled:true,
    worldMapId:map.id,
    kind:base.kind,
    type:base.type,
    img:base.img,
    level,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:rnd() * Math.PI * 2,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:base.radius,
    width:base.width,
    height:base.height,
    speed:base.speed(level),
    attackRange:base.attackRange,
    attackDamage:base.attackDamage(level),
    attackCooldown:base.attackCooldown,
    reward:base.reward(level),
    nextAttackAt:0,
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    recentHitTimer:0,
    vx:0,
    vy:0,
    moving:false,
    wanderT:0,
    wanderX:x,
    wanderY:y,
    respawning:false
  };
}

function getWorldMapState(mapId){
  const cleanMapId = String(mapId ?? "0");
  if(worldMaps.has(cleanMapId)) return worldMaps.get(cleanMapId);
  const map = WORLD_MAPS[cleanMapId] || WORLD_MAPS["0"];
  const rnd = seededRandom(10000 + Number(map.seed || 1));
  const state = {
    id:map.id,
    enemies:Array.from({length:Math.max(1, Number(map.count || 20))}, (_, index)=>createWorldEnemy(map, index + 1, rnd))
  };
  worldMaps.set(cleanMapId, state);
  return state;
}

function emitWorldEnemies(mapId){
  const map = getWorldMapState(mapId);
  io.to(`map:${map.id}`).emit("world:enemies", {
    mapId:map.id,
    enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
  });
}

function sendWorldEnemies(socket, mapId){
  const map = getWorldMapState(mapId);
  socket.emit("world:enemies", {
    mapId:map.id,
    enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
  });
}

function setPlayerMap(socket, mapId){
  const player = players.get(socket.id);
  if(!player) return;
  const requestedMapId = String(mapId ?? "0");
  const nextMapId = WORLD_MAPS[requestedMapId] || requestedMapId.startsWith("portal-") || requestedMapId === "coop-test" ? requestedMapId : "0";
  const nextRoom = `map:${nextMapId}`;
  if(player.mapRoom === nextRoom && player.worldMapSent) return;
  if(player.mapRoom && player.mapRoom !== nextRoom) socket.leave(player.mapRoom);
  player.mapId = nextMapId;
  player.mapRoom = nextRoom;
  player.worldMapSent = true;
  socket.join(player.mapRoom);
  if(WORLD_MAPS[nextMapId]) sendWorldEnemies(socket, nextMapId);
}

function findWorldEnemyForPlayer(player, enemyId){
  if(!player?.mapId || !enemyId) return null;
  if(!WORLD_MAPS[String(player.mapId)]) return null;
  const map = getWorldMapState(player.mapId);
  return map.enemies.find(enemy=>enemy.id === enemyId && enemy.hp > 0) || null;
}

function respawnWorldEnemy(mapId, enemyId){
  const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
  const map = getWorldMapState(mapConfig.id);
  const index = map.enemies.findIndex(enemy=>enemy.id === enemyId);
  if(index < 0) return;
  const rnd = seededRandom(Date.now() + index * 97 + Number(mapConfig.seed || 1));
  map.enemies[index] = createWorldEnemy(mapConfig, index + 1, rnd);
  emitWorldEnemies(mapConfig.id);
}

function applyDamageToEnemy(enemy, incoming){
  enemy.recentHitTimer = 4;
  if(enemy.maxShield > 0 && enemy.shield > 0){
    const shieldPart = incoming * Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? .8)));
    let hullPart = incoming - shieldPart;
    const absorbed = Math.min(enemy.shield, shieldPart);
    enemy.shield -= absorbed;
    hullPart += shieldPart - absorbed;
    if(hullPart > 0) enemy.hp -= hullPart;
  }else{
    enemy.hp -= incoming;
  }
  enemy.hp = Math.max(0, enemy.hp);
  enemy.shield = Math.max(0, enemy.shield);
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function playersOnMap(mapId){
  return [...players.values()].filter(player=>player.mapId === String(mapId) && player.state);
}

function isPlayerSafeOnMap(player, map){
  if(!player?.state || !map?.spawn) return false;
  return Math.hypot(Number(player.state.x || 0) - map.spawn.x, Number(player.state.y || 0) - map.spawn.y) <= (map.spawn.r || 320) + 90;
}

function nearestPlayer(enemy, candidates, map){
  let best = null;
  let bestDistance = Infinity;
  for(const player of candidates){
    if(isPlayerSafeOnMap(player, map)) continue;
    const dx = Number(player.state.x || 0) - enemy.x;
    const dy = Number(player.state.y || 0) - enemy.y;
    const distance = Math.hypot(dx, dy);
    if(distance < bestDistance){
      best = {player, dx, dy, distance};
      bestDistance = distance;
    }
  }
  return best;
}

function emitEnemyAttack(enemy, map, target, amount){
  const fromX = enemy.x;
  const fromY = enemy.y;
  const toX = Number(target.state.x || 0);
  const toY = Number(target.state.y || 0);
  io.to(map.room || `map:${map.id}`).emit("enemy:attack", {
    sourceId:enemy.id,
    enemyId:enemy.id,
    targetId:target.id,
    mapId:map.id,
    fromX,
    fromY,
    toX,
    toY,
    color:enemy.color || "rgba(248,113,113,.9)",
    life:.22
  });
  io.to(target.id).emit("player:damage", {
    enemyId:enemy.id,
    mapId:map.id,
    amount,
    fromX,
    fromY,
    toX,
    toY,
    at:Date.now()
  });
}

function emitWorldReward({enemy, mapId, attackerId}){
  const attacker = players.get(attackerId);
  if(!attacker) return;
  const attackerGroup = attacker.groupId ? groups.get(attacker.groupId) : null;
  const recipientIds = attackerGroup?.members?.length ? attackerGroup.members : [attackerId];
  const reward = enemy.reward || {credits:0, xp:0, premium:0};
  for(const playerId of recipientIds){
    const player = players.get(playerId);
    if(!player || player.mapId !== String(mapId)) continue;
    const share = player.id === attackerId ? 1 : 0.5;
    io.to(player.id).emit("player:reward", {
      enemyId:enemy.id,
      enemyType:enemy.type,
      mapId,
      share,
      killerId:attackerId,
      credits:Math.max(0, Math.round(Number(reward.credits || 0) * share)),
      xp:Math.max(0, Math.round(Number(reward.xp || 0) * share)),
      premium:Math.max(0, Math.round(Number(reward.premium || 0) * share)),
      at:Date.now()
    });
  }
}

function updateLootOwner(enemy, attackerId){
  if(!enemy || !attackerId) return;
  const now = Date.now();
  if(!enemy.lootOwnerId || enemy.lootOwnerId === attackerId || now - Number(enemy.lootOwnerAt || 0) >= LOOT_OWNER_TIMEOUT_MS){
    enemy.lootOwnerId = attackerId;
    enemy.lootOwnerAt = now;
  }
}

function rollPortalPieceDrop(mapId){
  const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
  for(const rule of PORTAL_DROP_RULES){
    if(!rule.dropChance || !(rule.dropZones || []).includes(mapName)) continue;
    if(Math.random() <= rule.dropChance) return rule;
  }
  return null;
}

function emitPrivatePortalPieceDrop({enemy, mapId, ownerId}){
  const owner = players.get(ownerId);
  if(!enemy || !owner || String(owner.mapId) !== String(mapId)) return;
  const drop = rollPortalPieceDrop(mapId);
  if(!drop) return;
  const x = Number(enemy.x || 0) + (Math.random() - .5) * 70;
  const y = Number(enemy.y || 0) + (Math.random() - .5) * 70;
  io.to(owner.id).emit("loot:drop", {
    id:`loot_${drop.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    kind:"portalPiece",
    portalId:drop.id,
    portalName:drop.name,
    img:drop.img,
    mapId,
    x,
    y,
    expiresAt:Date.now() + GROUND_LOOT_TTL_MS,
    at:Date.now()
  });
}

function getQuestOwnerForPlayer(player){
  const group = player?.groupId ? groups.get(player.groupId) : null;
  return group?.id ? `group:${group.id}` : `player:${player.id}`;
}

function getQuestRecipients(player, mapId){
  const group = player?.groupId ? groups.get(player.groupId) : null;
  const ids = group?.members?.length ? group.members : [player.id];
  return ids.filter(id=>{
    const member = players.get(id);
    return member && member.mapId === String(mapId);
  });
}

function progressServerQuestsForKill({enemy, mapId, attackerId}){
  const attacker = players.get(attackerId);
  if(!attacker || !enemy) return;
  const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
  const matching = SERVER_QUESTS.filter(quest=>quest.target === enemy.kind && quest.zone === mapName);
  if(!matching.length) return;
  const ownerId = getQuestOwnerForPlayer(attacker);
  const state = serverQuestProgress.get(ownerId) || {};
  const updates = [];
  for(const quest of matching){
    const previous = Math.max(0, Math.floor(Number(state[quest.id] || 0)));
    const next = Math.min(Number(quest.count || 0), previous + 1);
    state[quest.id] = next;
    updates.push({id:quest.id, progress:next, delta:Math.max(1, next - previous), target:quest.count, completed:next >= quest.count});
  }
  if(!updates.length) return;
  serverQuestProgress.set(ownerId, state);
  for(const playerId of getQuestRecipients(attacker, mapId)){
    io.to(playerId).emit("quest:progress", {
      mapId:String(mapId),
      ownerId,
      shared:ownerId.startsWith("group:"),
      updates,
      at:Date.now()
    });
  }
}

function pickEnemyWanderTarget(enemy, map, now){
  if(enemy.wanderT > now && Number.isFinite(enemy.wanderX) && Number.isFinite(enemy.wanderY)) return;
  const rnd = seededRandom(now + Number(enemy.id.replace(/\D/g, "") || 1) * 101);
  const radius = 180 + rnd() * 420;
  const angle = rnd() * Math.PI * 2;
  enemy.wanderX = clamp(enemy.homeX + Math.cos(angle) * radius, -map.width / 2 + 80, map.width / 2 - 80);
  enemy.wanderY = clamp(enemy.homeY + Math.sin(angle) * radius, -map.height / 2 + 80, map.height / 2 - 80);
  enemy.wanderT = now + 3500 + rnd() * 5500;
}

function updateWorldEnemy(enemy, map, mapPlayers, dt, now){
  if(enemy.hp <= 0){
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.moving = false;
    return;
  }
  enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
  const target = nearestPlayer(enemy, mapPlayers, map);
  let targetX = enemy.x;
  let targetY = enemy.y;
  let speed = Number(enemy.speed || 160);
  const aggroDistance = Math.max(780, Number(enemy.attackRange || 400) + 260);

  if(target && target.distance <= aggroDistance){
    const preferredDistance = Math.max(120, Number(enemy.attackRange || 360) * .72);
    if(target.distance > preferredDistance + 35){
      targetX = Number(target.player.state.x || enemy.x);
      targetY = Number(target.player.state.y || enemy.y);
    }else if(target.distance < Math.max(95, preferredDistance - 75)){
      targetX = enemy.x - target.dx;
      targetY = enemy.y - target.dy;
    }else{
      const side = Math.sin(now / 900 + Number(enemy.id.replace(/\D/g, "") || 0)) * 130;
      targetX = enemy.x + (-target.dy / Math.max(1, target.distance)) * side;
      targetY = enemy.y + (target.dx / Math.max(1, target.distance)) * side;
      speed *= .55;
    }
  }else{
    pickEnemyWanderTarget(enemy, map, now);
    targetX = enemy.wanderX;
    targetY = enemy.wanderY;
    speed *= .35;
  }

  targetX = clamp(targetX, -map.width / 2 + 70, map.width / 2 - 70);
  targetY = clamp(targetY, -map.height / 2 + 70, map.height / 2 - 70);
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = Math.hypot(dx, dy);
  if(distance > 8){
    const step = Math.min(distance, speed * dt);
    const nx = dx / distance;
    const ny = dy / distance;
    enemy.x += nx * step;
    enemy.y += ny * step;
    enemy.vx = nx * speed;
    enemy.vy = ny * speed;
    enemy.angle = Math.atan2(ny, nx) + Math.PI / 2;
    enemy.moving = true;
  }else{
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.moving = false;
  }

  if(target && target.distance <= Number(enemy.attackRange || 360) && now >= Number(enemy.nextAttackAt || 0)){
    const amount = Math.max(1, Math.round(Number(enemy.attackDamage || 25) * (0.85 + Math.random() * 0.3)));
    enemy.nextAttackAt = now + Number(enemy.attackCooldown || 1400);
    emitEnemyAttack(enemy, map, target.player, amount);
  }
}

let worldLastTick = Date.now();
let worldEmitT = 0;
let instanceEmitT = 0;

setInterval(()=>{
  const now = Date.now();
  const dt = Math.min(0.12, Math.max(0.001, (now - worldLastTick) / 1000));
  worldLastTick = now;
  worldEmitT += dt;
  instanceEmitT += dt;
  const activeMapIds = new Set([...players.values()].map(player=>player.mapId).filter(mapId=>WORLD_MAPS[String(mapId)]));
  for(const mapId of activeMapIds){
    const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
    const mapState = getWorldMapState(mapConfig.id);
    const mapPlayers = playersOnMap(mapConfig.id);
    if(!mapPlayers.length) continue;
    for(const enemy of mapState.enemies) updateWorldEnemy(enemy, mapConfig, mapPlayers, dt, now);
  }
  if(worldEmitT >= 0.10){
    worldEmitT = 0;
    for(const mapId of activeMapIds) emitWorldEnemies(mapId);
  }
  for(const group of groups.values()){
    const instance = group.instance;
    if(!instance?.enemies?.length || instance.completed) continue;
    const map = instance.type === "portal"
      ? {id:`portal-${instance.portal?.id || "blue"}`, room:group.id, width:5200, height:3600, spawn:{x:0, y:0, r:240}}
      : {id:"coop-test", room:group.id, width:5200, height:3600, spawn:{x:instance.spawn?.x || 0, y:instance.spawn?.y || 0, r:260}};
    const instancePlayers = group.members.map(id=>players.get(id)).filter(player=>player?.state);
    if(!instancePlayers.length) continue;
    for(const enemy of instance.enemies) updateWorldEnemy(enemy, map, instancePlayers, dt, now);
  }
  if(instanceEmitT >= 0.10){
    instanceEmitT = 0;
    for(const group of groups.values()) if(group.instance) emitInstance(group);
  }
}, 50);

function emitInstance(group){
  if(!group?.instance) return;
  io.to(group.id).emit("coop:enemies", {
    instanceId:group.instance.id,
    spawn:group.instance.spawn,
    portal:group.instance.portal || null,
    wave:group.instance.wave || 0,
    completed:Boolean(group.instance.completed),
    enemies:group.instance.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
  });
}

function emitPlayers(){
  io.emit("players:list", [...players.values()].map(publicPlayer));
}

function emitGroup(groupId){
  const group = groups.get(groupId);
  if(!group) return;
  const payload = publicGroup(group);
  for(const memberId of group.members){
    io.to(memberId).emit("group:update", payload);
  }
  emitInstance(group);
}

function leaveCurrentGroup(socket){
  const player = players.get(socket.id);
  if(!player?.groupId) return;
  const group = groups.get(player.groupId);
  if(!group){
    player.groupId = null;
    return;
  }
  group.members = group.members.filter(id=>id !== socket.id);
  player.groupId = null;
  socket.leave(group.id);
  if(group.members.length === 0){
    groups.delete(group.id);
    return;
  }
  if(group.leaderId === socket.id) group.leaderId = group.members[0];
  emitGroup(group.id);
}

function createGroup(socket){
  leaveCurrentGroup(socket);
  const player = players.get(socket.id);
  if(!player) return null;
  const group = {
    id:`G-${String(groupSeq++).padStart(4, "0")}`,
    leaderId:socket.id,
    members:[socket.id],
    createdAt:Date.now()
  };
  groups.set(group.id, group);
  player.groupId = group.id;
  socket.join(group.id);
  emitGroup(group.id);
  emitPlayers();
  return group;
}

function acceptInvite(socket, groupId){
  const group = groups.get(groupId);
  const player = players.get(socket.id);
  if(!group || !player) return;
  leaveCurrentGroup(socket);
  group.members.push(socket.id);
  player.groupId = group.id;
  socket.join(group.id);
  emitGroup(group.id);
  emitPlayers();
}

function createCoopInstance(socket){
  const player = players.get(socket.id);
  if(!player) return;
  let group = player.groupId ? groups.get(player.groupId) : null;
  if(!group) group = createGroup(socket);
  if(!group || group.leaderId !== socket.id) return;
  const originX = Number.isFinite(player.state?.x) ? player.state.x : 0;
  const originY = Number.isFinite(player.state?.y) ? player.state.y : 0;
  const layouts = [
    {kind:"shared_orb", x:-260, y:-260},
    {kind:"shared_rusher", x:0, y:-360},
    {kind:"shared_crystal", x:260, y:-260}
  ];
  group.instance = {
    id:`I-${String(instanceSeq++).padStart(4, "0")}`,
    spawn:{mapId:"coop-test", x:originX, y:originY},
    enemies:layouts.map((entry, index)=>{
      const base = COOP_ENEMY_TYPES[entry.kind];
      return {
        ...base,
        id:`${group.id}-E${index + 1}`,
        x:originX + entry.x,
        y:originY + entry.y,
        angle:Math.PI,
        hp:base.hp,
        maxHp:base.hp,
        shield:base.shield,
        maxShield:base.shield,
        shieldAbsorbRatio:.8
      };
    })
  };
  emitInstance(group);
}

function createPortalEnemy(kind, wave, index, x, y, boss = false){
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const level = Math.max(1, Math.round((boss ? 20 : 1) + wave * 0.75));
  const hp = Math.round(base.hp(level) * (boss ? 2.6 : 1 + wave * 0.035));
  const shield = Math.round(base.shield(level) * (boss ? 2.6 : 1 + wave * 0.025));
  return {
    id:`P-${wave}-${index}-${Date.now().toString(36)}`,
    serverControlled:true,
    kind:base.kind,
    type:boss ? `${base.type} Alpha` : base.type,
    img:base.img,
    level,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:Math.PI,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:Math.round(base.radius * (boss ? 1.2 : 1)),
    width:Math.round(base.width * (boss ? 1.22 : 1)),
    height:Math.round(base.height * (boss ? 1.22 : 1)),
    speed:base.speed(level),
    attackRange:base.attackRange,
    attackDamage:Math.round(base.attackDamage(level) * (boss ? 1.65 : 1)),
    attackCooldown:base.attackCooldown,
    reward:base.reward(level),
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0
  };
}

function buildServerPortalWave(wave){
  if(wave >= PORTAL_WAVE_TOTAL){
    return [createPortalEnemy("chasseur_spectral", wave, 1, 0, -1040, true)];
  }
  const batch = Math.ceil(wave / 5);
  const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
  const kinds = batch <= 2 ? ["drone_pirate", "raider_astral"] : batch <= 4 ? ["raider_astral", "chasseur_spectral"] : ["chasseur_spectral", "boss_cuirasse_nebulaire"];
  return Array.from({length:count}, (_, i)=>{
    const side = i % 3;
    const x = side === 0 ? -1480 + i * 80 : side === 1 ? 1480 - i * 75 : -480 + i * 105;
    const y = -1040 - (i % 4) * 96;
    return createPortalEnemy(kinds[i % kinds.length], wave, i + 1, x, y, false);
  });
}

function startPortalInstance(socket, portalId){
  const player = players.get(socket.id);
  if(!player) return;
  let group = player.groupId ? groups.get(player.groupId) : null;
  if(!group) group = createGroup(socket);
  if(!group || group.leaderId !== socket.id) return;
  const portal = PORTAL_CONFIGS[String(portalId || "blue")] || PORTAL_CONFIGS.blue;
  group.instance = {
    id:`P-${String(instanceSeq++).padStart(4, "0")}`,
    type:"portal",
    portal:{id:portal.id, name:portal.name, totalWaves:PORTAL_WAVE_TOTAL},
    spawn:{mapId:`portal-${portal.id}`, x:0, y:0},
    wave:1,
    completed:false,
    enemies:buildServerPortalWave(1)
  };
  io.to(group.id).emit("portal:started", {
    instanceId:group.instance.id,
    portal:group.instance.portal,
    spawn:group.instance.spawn,
    wave:group.instance.wave
  });
  emitInstance(group);
}

function emitPortalComplete(group){
  const instance = group?.instance;
  if(!instance || instance.type !== "portal" || instance.completed) return;
  instance.completed = true;
  const portal = PORTAL_CONFIGS[instance.portal?.id] || PORTAL_CONFIGS.blue;
  io.to(group.id).emit("portal:complete", {
    instanceId:instance.id,
    portal:{id:portal.id, name:portal.name},
    reward:portal.reward,
    at:Date.now()
  });
  emitInstance(group);
}

function applyEnemyHit(socket, payload){
  const player = players.get(socket.id);
  const incoming = Math.max(0, Math.min(5000000, Number(payload?.amount || 0)));
  if(incoming <= 0) return;

  const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
  if(worldEnemy){
    const mapId = player.mapId;
    const wasAlive = worldEnemy.hp > 0;
    updateLootOwner(worldEnemy, socket.id);
    applyDamageToEnemy(worldEnemy, incoming);
    if(wasAlive && worldEnemy.hp <= 0){
      emitWorldReward({enemy:worldEnemy, mapId, attackerId:socket.id});
      emitPrivatePortalPieceDrop({enemy:worldEnemy, mapId, ownerId:worldEnemy.lootOwnerId || socket.id});
      progressServerQuestsForKill({enemy:worldEnemy, mapId, attackerId:socket.id});
    }
    emitWorldEnemies(mapId);
    if(worldEnemy.hp <= 0 && !worldEnemy.respawning){
      worldEnemy.respawning = true;
      setTimeout(()=>respawnWorldEnemy(mapId, worldEnemy.id), 8000);
    }
    return;
  }

  const group = player?.groupId ? groups.get(player.groupId) : null;
  const instance = group?.instance;
  if(!instance) return;
  const enemy = instance.enemies.find(entry=>entry.id === payload?.enemyId && entry.hp > 0);
  if(!enemy) return;
  const wasAlive = enemy.hp > 0;
  applyDamageToEnemy(enemy, incoming);
  if(instance.type === "portal" && wasAlive && enemy.hp <= 0 && !instance.completed){
    const alive = instance.enemies.some(entry=>entry.hp > 0);
    if(!alive){
      if(instance.wave >= PORTAL_WAVE_TOTAL) emitPortalComplete(group);
      else{
        instance.wave += 1;
        instance.enemies = buildServerPortalWave(instance.wave);
      }
    }
  }
  emitInstance(group);
}

io.on("connection", socket=>{
  players.set(socket.id, {
    id:socket.id,
    name:"Pilote",
    groupId:null,
    mapId:"0",
    mapRoom:null,
    state:null,
    connectedAt:Date.now()
  });

  socket.emit("server:ready", {id:socket.id, port:PORT});
  setPlayerMap(socket, "0");
  emitPlayers();

  socket.on("player:hello", payload=>{
    const player = players.get(socket.id);
    if(!player) return;
    player.name = cleanName(payload?.name);
    const profile = profiles.get(profileKey(player.name));
    if(profile) socket.emit("profile:sync", profile);
    emitPlayers();
  });

  socket.on("profile:save", payload=>{
    const player = players.get(socket.id);
    if(!player) return;
    const key = profileKey(payload?.name || player.name);
    const incoming = sanitizeProfile(payload?.profile || {});
    const existing = profiles.get(key);
    if(!existing || Number(incoming.updatedAt || 0) >= Number(existing.updatedAt || 0)){
      profiles.set(key, incoming);
      persistProfiles();
      socket.emit("profile:saved", {updatedAt:incoming.updatedAt});
    }
  });

  socket.on("player:state", payload=>{
    const player = players.get(socket.id);
    if(!player) return;
    const nextMapId = String(payload?.mapId ?? player.mapId ?? "0");
    player.state = {
      x:Number(payload?.x || 0),
      y:Number(payload?.y || 0),
      angle:Number(payload?.angle || 0),
      hp:Number(payload?.hp || 0),
      maxHp:Number(payload?.maxHp || payload?.hp || 0),
      shield:Number(payload?.shield || 0),
      maxShield:Number(payload?.maxShield || payload?.shield || 0),
      vx:Number(payload?.vx || 0),
      vy:Number(payload?.vy || 0),
      enginePower:Number(payload?.enginePower || 0),
      engineAngle:Number(payload?.engineAngle || 0),
      mapId:nextMapId,
      shipId:String(payload?.shipId || "unknown"),
      shipImg:String(payload?.shipImg || ""),
      rankName:String(payload?.rankName || ""),
      rankAssetPath:String(payload?.rankAssetPath || ""),
      updatedAt:Date.now()
    };
    setPlayerMap(socket, nextMapId);
    socket.broadcast.emit("player:state", publicPlayer(player));
  });

  socket.on("player:laser", payload=>{
    socket.broadcast.emit("player:laser", {
      sourceId:socket.id,
      fromX:Number(payload?.fromX || 0),
      fromY:Number(payload?.fromY || 0),
      toX:Number(payload?.toX || 0),
      toY:Number(payload?.toY || 0),
      mapId:String(payload?.mapId ?? players.get(socket.id)?.mapId ?? "0"),
      color:String(payload?.color || "rgba(56,189,248,.9)").slice(0, 48),
      life:Math.max(0.05, Math.min(0.35, Number(payload?.life || 0.16))),
      createdAt:Date.now()
    });
  });

  socket.on("group:create", ()=>{
    createGroup(socket);
  });

  socket.on("group:invite", payload=>{
    const targetId = String(payload?.targetId || "");
    const target = players.get(targetId);
    const inviter = players.get(socket.id);
    if(!target || !inviter) return;
    let group = inviter.groupId ? groups.get(inviter.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group) return;
    io.to(targetId).emit("group:invite", {
      groupId:group.id,
      fromId:socket.id,
      fromName:inviter.name
    });
  });

  socket.on("group:accept", payload=>{
    acceptInvite(socket, String(payload?.groupId || ""));
  });

  socket.on("group:decline", payload=>{
    const group = groups.get(String(payload?.groupId || ""));
    if(!group) return;
    const leader = players.get(group.leaderId);
    if(leader) io.to(group.leaderId).emit("group:declined", {playerId:socket.id, playerName:players.get(socket.id)?.name || "Pilote"});
  });

  socket.on("group:leave", ()=>{
    leaveCurrentGroup(socket);
    socket.emit("group:update", null);
    emitPlayers();
  });

  socket.on("coop:start-test", ()=>{
    createCoopInstance(socket);
  });

  socket.on("portal:start", payload=>{
    startPortalInstance(socket, payload?.portalId);
  });

  socket.on("coop:enemy-hit", payload=>{
    applyEnemyHit(socket, payload);
  });

  socket.on("enemy:hit", payload=>{
    applyEnemyHit(socket, payload);
  });

  socket.on("disconnect", ()=>{
    leaveCurrentGroup(socket);
    const player = players.get(socket.id);
    if(player?.mapRoom) socket.leave(player.mapRoom);
    players.delete(socket.id);
    emitPlayers();
  });
});

httpServer.listen(PORT, ()=>{
  console.log(`VoidSector realtime server listening on :${PORT}`);
});
