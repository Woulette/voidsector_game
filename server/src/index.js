import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { loginAccount, registerAccount } from "./auth/accounts.js";
import { createSession, getSessionAccount, revokeSessionByToken } from "./auth/sessions.js";
import { config } from "./config.js";
import { dbEnabled, initializeDatabase } from "./db/client.js";
import { logger } from "./logger.js";
import { createPresenceManager } from "./players/presence.js";
import { createProfileManager } from "./players/profiles.js";
import { applyProgressionReward } from "./players/progression.js";
import { createSocketRateLimiter } from "./socket/rateLimit.js";
import { getAmmoPurchase, getDroneFormationPurchase, getDronePurchase, getItemPurchase, getShipPurchase } from "./economy/shop.js";
import { resolveServerCombatFire } from "./combat/damage.js";

const PORT = config.port;

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
    origin:config.clientOrigin,
    methods:["GET", "POST"]
  }
});

const allowSocketEvent = createSocketRateLimiter({
  limits:config.socketRateLimits,
  onLimit:({socket, eventName, count, limit, windowMs})=>{
    logger.warn("Socket rate limit", {
      socketId:socket.id,
      eventName,
      count,
      limit,
      windowMs
    });
    socket.emit("rate:limited", {eventName, limit, windowMs});
  }
});

const players = new Map();
const groups = new Map();
const worldMaps = new Map();
const activeLootDrops = new Map();
let groupSeq = 1;
let instanceSeq = 1;
const PORTAL_WAVE_TOTAL = config.portalWaveTotal;
const WORLD_AI_REPATH_MS = 1000;
const WORLD_ENEMY_AGGRO_MULTIPLIER = 1.2;
const WORLD_ENEMY_TARGET_MEMORY_MS = 10000;

const WORLD_MAPS = {
  "0":{id:"0", name:"ASTRA-01", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320, safeRadius:320, safeRect:{minX:-5000, minY:2500, maxX:-3500, maxY:3950}}, portals:[{x:4300, y:-3300, r:95, safeRadius:230}], seed:7, count:40, level:[1,3], enemyTypes:[["drone_pirate", .50], ["raider_astral", .50]]},
  "1":{id:"1", name:"ASTRA-02", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], closedPortals:[{x:4300, y:-3300, r:95, safeRadius:230}], seed:19, count:40, level:[3,7], enemyTypes:[["drone_pirate", 1], ["raider_astral", 1], ["chasseur_spectral", 1]]},
  "2":{id:"2", name:"ASTRA-03", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], seed:31, count:50, level:[6,10], enemyTypes:[["chasseur_spectral", .56], ["cuirasse_nebulaire", .44]], fixedEnemyCounts:{cristal_du_neant:8}},
  "3":{id:"3", name:"ASTRA-04", width:10000, height:8000, portals:[{x:-4300, y:3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}], seed:43, count:50, level:[8,12], enemyTypes:[["chasseur_spectral", .56], ["cuirasse_nebulaire", .44]], fixedEnemyCounts:{cuirasse_ambre:6}},
  "4":{id:"4", name:"ASTRA-05", width:10000, height:8000, spawn:{x:-4300, y:3300, r:320, safeRadius:320}, portals:[{x:4300, y:-3300, r:95, safeRadius:230}, {x:-4300, y:-3300, r:95, safeRadius:230}, {x:4300, y:3300, r:95, safeRadius:230}, {x:0, y:-3300, r:95, safeRadius:230}], seed:59, count:30, level:[18,24], enemyTypes:[["boss_drone_pirate", .16], ["boss_raider_astral", .18], ["boss_chasseur_spectral", .20], ["boss_cuirasse_nebulaire", .20], ["boss_cristal_du_neant", .16], ["boss_cuirasse_ambre", .10]]},
  "20":{id:"20", name:"CYAN-01", width:10000, height:8000, spawn:{x:-4300, y:-3300, r:320, safeRadius:320}, portals:[{x:4300, y:3300, r:95, safeRadius:230}], seed:207, count:20, level:[1,3], enemyTypes:[["drone_pirate", .70], ["raider_astral", .30]]}
};
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
    projectileSpeed:680,
    reward:level=>({credits:900 + level * 120, xp:220 + level * 45, premium:1}),
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
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
    attackDamageMin:90,
    attackDamageMax:140,
    attackDamage:()=>115,
    attackCooldown:1350,
    projectileSpeed:640,
    reward:level=>({credits:1200 + level * 180, xp:360 + level * 70, premium:2}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
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
    attackDamageMin:150,
    attackDamageMax:250,
    attackDamage:()=>200,
    attackCooldown:1550,
    projectileSpeed:620,
    reward:level=>({credits:2800 + level * 260, xp:950 + level * 120, premium:3}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50, interval:2, duration:10},
    shieldAbsorbRatio:.8
  },
  cuirasse_nebulaire:{
    kind:"cuirasse_nebulaire",
    type:"Traqueur abyssal",
    img:"assets/enemies/enemy_blue_spider.png",
    radius:46,
    width:106,
    height:106,
    hp:()=>8000,
    shield:()=>2000,
    speed:()=>150,
    attackRange:350,
    attackDamageMin:250,
    attackDamageMax:350,
    attackDamage:()=>300,
    attackCooldown:1700,
    projectileSpeed:590,
    reward:level=>({credits:7000 + level * 320, xp:3000 + level * 150, premium:8}),
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    shieldAbsorbRatio:.8
  },
  cuirasse_ambre:{
    kind:"cuirasse_ambre",
    type:"Cuirasse ambre",
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
    reward:()=>({credits:100000, xp:20000, premium:30}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    shieldAbsorbRatio:.8
  },
  cristal_du_neant:{
    kind:"cristal_du_neant",
    type:"Cristal du neant",
    img:"assets/enemies/enemy_purple_crystal.png",
    radius:48,
    width:112,
    height:112,
    hp:()=>40000,
    shield:()=>20000,
    speed:()=>170,
    attackRange:400,
    attackDamageMin:800,
    attackDamageMax:1000,
    attackDamage:()=>900,
    attackCooldown:1850,
    projectileSpeed:560,
    reward:()=>({credits:60000, xp:12000, premium:20}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
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
    projectileSpeed:680,
    reward:()=>({credits:1200 * 4, xp:350 * 4, premium:2 * 4}),
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
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
    attackDamageMin:90 * 4,
    attackDamageMax:140 * 4,
    attackDamage:()=>115 * 4,
    attackCooldown:1350,
    projectileSpeed:640,
    reward:()=>({credits:1500 * 4, xp:500 * 4, premium:3 * 4}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
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
    attackDamageMin:150 * 4,
    attackDamageMax:250 * 4,
    attackDamage:()=>200 * 4,
    attackCooldown:1550,
    projectileSpeed:620,
    reward:()=>({credits:4000 * 4, xp:1700 * 4, premium:5 * 4}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50 * 4, interval:2, duration:10},
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
    attackDamageMin:250 * 4,
    attackDamageMax:350 * 4,
    attackDamage:()=>300 * 4,
    attackCooldown:1700,
    projectileSpeed:590,
    reward:()=>({credits:7000 * 4, xp:3000 * 4, premium:8 * 4}),
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
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
    attackDamageMin:1300 * 4,
    attackDamageMax:1500 * 4,
    attackDamage:()=>1500 * 4,
    attackCooldown:1650,
    projectileSpeed:610,
    reward:()=>({credits:100000 * 4, xp:20000 * 4, premium:30 * 4}),
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
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
    attackDamageMin:800 * 4,
    attackDamageMax:1000 * 4,
    attackDamage:()=>900 * 4,
    attackCooldown:1850,
    projectileSpeed:560,
    reward:()=>({credits:60000 * 4, xp:12000 * 4, premium:20 * 4}),
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
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

const profileManager = createProfileManager({cleanName, logger});

await initializeDatabase();
await profileManager.load();
logger.info(dbEnabled ? "PostgreSQL storage enabled." : "JSON storage enabled. Set DATABASE_URL to use PostgreSQL.");

function publicPlayer(player){
  return {
    id:player.id,
    name:player.name,
    accountId:player.accountId || null,
    groupId:player.groupId || null,
    state:player.state || null,
    connectedAt:player.connectedAt,
    connected:Boolean(player.connected !== false),
    disconnecting:Boolean(player.disconnecting),
    logoutPending:Boolean(player.logoutPending)
  };
}

function publicAuthPayload({account, session = null}){
  return {
    account,
    token:session?.token || null,
    expiresAt:session?.expiresAt || null
  };
}

function attachAccountToSocket(socket, account, session = null){
  const player = players.get(socket.id);
  if(!player || !account) return;
  player.accountId = account.id;
  player.account = account;
  player.name = cleanName(account.username || player.name);
  player.sessionExpiresAt = session?.expiresAt || player.sessionExpiresAt || null;
  emitPlayers();
}

function replaceGroupMemberId(oldId, nextId){
  for(const group of groups.values()){
    let changed = false;
    group.members = group.members.map(memberId=>{
      if(memberId !== oldId) return memberId;
      changed = true;
      return nextId;
    });
    group.members = [...new Set(group.members)];
    if(group.leaderId === oldId){
      group.leaderId = nextId;
      changed = true;
    }
    if(changed) emitGroup(group.id);
  }
}

function buildResumeSessionFromState(state, source = "live"){
  if(!state || Number(state.hp || 0) <= 0) return null;
  return {
    source,
    mapId:String(state.mapId ?? "0"),
    x:Number(state.x || 0),
    y:Number(state.y || 0),
    angle:Number(state.angle || 0),
    hp:Math.max(0, Number(state.hp || 0)),
    maxHp:Math.max(0, Number(state.maxHp || state.hp || 0)),
    shield:Math.max(0, Number(state.shield || 0)),
    maxShield:Math.max(0, Number(state.maxShield || state.shield || 0)),
    shipId:String(state.shipId || "unknown"),
    shipImg:String(state.shipImg || ""),
    updatedAt:Math.max(0, Number(state.updatedAt || Date.now()))
  };
}

function attachOrResumeAccountSocket(socket, account, session = null){
  const current = players.get(socket.id);
  if(!current || !account) return null;
  let resumeSession = null;
  const isGameClient = current.clientMode === "game";
  const existing = [...players.values()].find(player=>player.id !== socket.id && player.accountId === account.id && player.state);
  if(isGameClient && existing){
    resumeSession = buildResumeSessionFromState(existing.state, existing.connected === false ? "reconnect" : "takeover");
    const existingSocket = io.sockets.sockets.get(existing.id);
    const nextPlayer = {
      ...existing,
      id:socket.id,
      accountId:account.id,
      account,
      name:cleanName(account.username || existing.name),
      sessionExpiresAt:session?.expiresAt || existing.sessionExpiresAt || null,
      connected:true,
      disconnecting:false,
      logoutPending:null,
      gracefulLogout:false,
      removeAt:0,
      mapRoom:null,
      worldMapSent:false
    };
    if(existing.mapRoom) existingSocket?.leave(existing.mapRoom);
    players.delete(existing.id);
    players.set(socket.id, nextPlayer);
    replaceGroupMemberId(existing.id, socket.id);
    existingSocket?.disconnect(true);
    if(nextPlayer.mapId) setPlayerMap(socket, nextPlayer.mapId);
  }else{
    attachAccountToSocket(socket, account, session);
  }
  const player = players.get(socket.id);
  if(isGameClient && !resumeSession){
    resumeSession = buildResumeSessionFromState(profileManager.getWorldSessionForPlayer(player), "profile");
  }
  if(resumeSession){
    setPlayerMap(socket, resumeSession.mapId);
    socket.emit("player:resume", resumeSession);
  }
  return resumeSession;
}

function syncProfileForPlayer(socket){
  const player = players.get(socket.id);
  profileManager.syncForSocket(socket, player);
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
    particle:enemy.particle,
    projectileSpeed:enemy.projectileSpeed || 600,
    attackT:Math.max(0, Number(enemy.attackAnimUntil || 0) - Date.now()) / 1000,
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

function getWorldSafePortals(map){
  return [
    ...(Array.isArray(map?.portals) ? map.portals : []),
    ...(map?.portal ? [map.portal] : []),
    ...(Array.isArray(map?.closedPortals) ? map.closedPortals : [])
  ];
}

function isPointInWorldSafeArea(point, map, padding = 0){
  if(!point || !map) return false;
  const x = Number(point.x || 0);
  const y = Number(point.y || 0);
  const spawn = map.spawn;
  if(spawn){
    const rect = spawn.safeRect;
    if(rect){
      if(x >= Number(rect.minX) - padding
        && x <= Number(rect.maxX) + padding
        && y >= Number(rect.minY) - padding
        && y <= Number(rect.maxY) + padding){
        return true;
      }
    } else {
      const radius = Number(spawn.safeRadius || spawn.r || 320) + padding;
      if(Math.hypot(x - Number(spawn.x || 0), y - Number(spawn.y || 0)) <= radius) return true;
    }
  }
  for(const portal of getWorldSafePortals(map)){
    const radius = Number(portal.safeRadius || Math.max(330, Number(portal.r || 90) * 3.5)) * 1.95 + padding;
    if(Math.hypot(x - Number(portal.x || 0), y - Number(portal.y || 0)) <= radius) return true;
  }
  return false;
}

function findWorldSpawn(map, rnd){
  for(let tries = 0; tries < 120; tries++){
    const x = rnd() * map.width - map.width / 2;
    const y = rnd() * map.height - map.height / 2;
    if(isPointInWorldSafeArea({x, y}, map, 620)) continue;
    return {x, y};
  }
  return {x:0, y:0};
}

function createWorldEnemy(map, index, rnd = Math.random, forcedKind = null){
  const kind = forcedKind || pickWeighted(map.enemyTypes, rnd);
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
    attackDamageMin:base.attackDamageMin,
    attackDamageMax:base.attackDamageMax,
    attackCooldown:base.attackCooldown,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect:base.onHitEffect || null,
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
  const enemies = [];
  for(const [kind, count] of Object.entries(map.fixedEnemyCounts || {})){
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    for(let i = 0; i < safeCount; i++) enemies.push(createWorldEnemy(map, enemies.length + 1, rnd, kind));
  }
  const randomCount = Math.max(1, Number(map.count || 20)) - enemies.length;
  for(let i = 0; i < Math.max(0, randomCount); i++) enemies.push(createWorldEnemy(map, enemies.length + 1, rnd));
  const state = {
    id:map.id,
    enemies
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
  const mapName = WORLD_MAPS[nextMapId]?.name;
  if(mapName) progressProfileQuestAction(socket, {
    type:"visit_map",
    mapName,
    amount:1
  });
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
  const previousKind = map.enemies[index]?.kind || null;
  const rnd = seededRandom(Date.now() + index * 97 + Number(mapConfig.seed || 1));
  map.enemies[index] = createWorldEnemy(mapConfig, index + 1, rnd, previousKind);
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

const presence = createPresenceManager({
  io,
  players,
  emitPlayers,
  config,
  onPlayerRemove:player=>profileManager.saveWorldSession({player, state:player.state, force:true})
});

function isPlayerSafeOnMap(player, map){
  if(!player?.state) return false;
  return isPointInWorldSafeArea({x:player.state.x, y:player.state.y}, map);
}

function getPlayerFirmId(player, profile = null){
  return String(profile?.player?.firm || profile?.player?.company || profile?.player?.faction || player?.account?.firm || player?.firm || "astra").toLowerCase();
}

function getHomeMapForFirm(firmId){
  const targetName = `${String(firmId || "astra").toUpperCase()}-01`;
  return Object.values(WORLD_MAPS).find(map=>String(map.name || "").toUpperCase() === targetName) || WORLD_MAPS["0"];
}

function getConnectedGamePlayerForAccount(player){
  if(!player?.accountId) return player?.clientMode === "game" && player.connected !== false ? player : null;
  return [...players.values()].find(candidate=>
    candidate.accountId === player.accountId
    && candidate.clientMode === "game"
    && candidate.connected !== false
    && candidate.state
  ) || null;
}

function isStateAtFirmSpawn(state, firmId){
  const homeMap = getHomeMapForFirm(firmId);
  if(!state || !homeMap?.spawn) return false;
  if(String(state.mapId ?? "0") !== String(homeMap.id)) return false;
  const distance = Math.hypot(Number(state.x || 0) - homeMap.spawn.x, Number(state.y || 0) - homeMap.spawn.y);
  return distance <= (homeMap.spawn.r || 320) + 90;
}

function canChangeActiveShipAtFirmSpawn(player){
  if(!player) return {ok:false, reason:"Joueur introuvable."};
  const profile = profileManager.getProfileForPlayer(player);
  const firmId = getPlayerFirmId(player, profile);
  const gamePlayer = getConnectedGamePlayerForAccount(player);
  const homeMap = getHomeMapForFirm(firmId);
  if(!gamePlayer?.state){
    return {ok:true, firmId, homeMap:homeMap?.name || "ASTRA-01", homeMapId:String(homeMap?.id || "0"), source:"disconnected"};
  }
  if(isStateAtFirmSpawn(gamePlayer.state, firmId)){
    return {ok:true, firmId, homeMap:homeMap?.name || "ASTRA-01", homeMapId:String(homeMap?.id || "0"), source:"live-spawn", gamePlayerId:gamePlayer.id};
  }
  return {
    ok:false,
    reason:`Changement de vaisseau possible uniquement au spawn ${homeMap?.name || "ASTRA-01"}, ou une fois deconnecte du jeu.`
  };
}

function canChangeEquipmentAtFirmSpawn(player){
  const result = canChangeActiveShipAtFirmSpawn(player);
  if(result.ok) return result;
  return {
    ...result,
    reason:String(result.reason || "").replace("Changement de vaisseau", "Modification d'equipement")
  };
}

function buildFirmSpawnSession({shipId, firmId, state = null} = {}){
  const homeMap = getHomeMapForFirm(firmId);
  const spawn = homeMap?.spawn || WORLD_MAPS["0"].spawn;
  return {
    source:"ship-change",
    mapId:String(homeMap?.id || "0"),
    x:Number(spawn.x || 0),
    y:Number(spawn.y || 0),
    angle:Number(state?.angle || 0),
    hp:1,
    maxHp:1,
    shield:0,
    maxShield:0,
    shipId:String(shipId || state?.shipId || "unknown"),
    shipImg:String(state?.shipImg || ""),
    updatedAt:Date.now()
  };
}

function accountSocketsForPlayer(player){
  if(!player?.accountId) return [player].filter(Boolean);
  return [...players.values()].filter(candidate=>candidate.accountId === player.accountId);
}

function finishEquipmentChangeAtFirmSpawn(player, location, result, event){
  const liveGamePlayer = location?.gamePlayerId ? players.get(location.gamePlayerId) : null;
  const activeShip = String(result?.profile?.activeShip || liveGamePlayer?.state?.shipId || "");
  const spawnSession = buildFirmSpawnSession({
    shipId:activeShip,
    firmId:location?.firmId,
    state:liveGamePlayer?.state || profileManager.getWorldSessionForPlayer(player)
  });
  let profile = result?.profile || null;
  if(liveGamePlayer?.state){
    liveGamePlayer.state = {
      ...liveGamePlayer.state,
      ...spawnSession,
      shipId:activeShip,
      updatedAt:Date.now()
    };
    liveGamePlayer.mapId = spawnSession.mapId;
    const gameSocket = io.sockets.sockets.get(liveGamePlayer.id);
    if(gameSocket) setPlayerMap(gameSocket, spawnSession.mapId);
    profile = profileManager.saveWorldSession({player:liveGamePlayer, state:liveGamePlayer.state, force:true}) || profile;
  }else{
    profile = profileManager.saveWorldSession({player, state:spawnSession, force:true}) || profile;
  }
  for(const accountPlayer of accountSocketsForPlayer(player)){
    const accountSocket = io.sockets.sockets.get(accountPlayer.id);
    if(!accountSocket) continue;
    accountSocket.emit("equipment:updated", event);
    if(accountPlayer.clientMode === "game") accountSocket.emit("player:resume", spawnSession);
    if(profile) accountSocket.emit("profile:sync", profile);
  }
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
  presence.markCombat(target, "attaque ennemi");
  presence.applyDamageToPlayerState(target, amount);
  profileManager.saveWorldSession({player:target, state:target.state, force:Number(target.state?.hp || 0) <= 0});
  enemy.attackAnimUntil = Date.now() + 320;
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
    particle:enemy.particle || enemy.color || "rgba(248,113,113,.9)",
    projectileSpeed:enemy.projectileSpeed || 600,
    enemyKind:enemy.kind,
    attackStyle:enemy.attackStyle || getEnemyAiKind(enemy.kind),
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

function getEnemyAiKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

function emitWorldReward({enemy, mapId, attackerId}){
  const attacker = players.get(attackerId);
  if(!attacker || !enemy || enemy.rewardGranted) return;
  enemy.rewardGranted = true;
  enemy.rewardGrantedAt = Date.now();
  enemy.rewardGrantedBy = attackerId;
  const rewardId = `${enemy.id}:${attackerId}:${enemy.rewardGrantedAt}`;
  const attackerGroup = attacker.groupId ? groups.get(attacker.groupId) : null;
  const recipientIds = attackerGroup?.members?.length ? attackerGroup.members : [attackerId];
  const reward = enemy.reward || {credits:0, xp:0, premium:0};
  for(const playerId of recipientIds){
    const player = players.get(playerId);
    if(!player || player.mapId !== String(mapId)) continue;
    const share = player.id === attackerId ? 1 : 0.5;
    io.to(player.id).emit("player:reward", {
      rewardId,
      enemyId:enemy.id,
      enemyType:enemy.type,
      enemyLevel:enemy.level,
      mapId,
      share,
      killerId:attackerId,
      credits:Math.max(0, Math.round(Number(reward.credits || 0) * share)),
      xp:Math.max(0, Math.round(Number(reward.xp || 0) * share)),
      premium:Math.max(0, Math.round(Number(reward.premium || 0) * share)),
      rewardAppliedByServer:true,
      at:Date.now()
    });
    const profile = profileManager.applyReward({
      player,
      reward:{
        credits:Math.max(0, Math.round(Number(reward.credits || 0) * share)),
        xp:Math.max(0, Math.round(Number(reward.xp || 0) * share)),
        premium:Math.max(0, Math.round(Number(reward.premium || 0) * share))
      }
    });
    if(profile) io.to(player.id).emit("profile:sync", profile);
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
  if(!enemy || enemy.portalPieceDropRolled || !owner || String(owner.mapId) !== String(mapId)) return;
  enemy.portalPieceDropRolled = true;
  const drop = rollPortalPieceDrop(mapId);
  if(!drop) return;
  const x = Number(enemy.x || 0) + (Math.random() - .5) * 70;
  const y = Number(enemy.y || 0) + (Math.random() - .5) * 70;
  const id = `loot_${drop.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const expiresAt = Date.now() + GROUND_LOOT_TTL_MS;
  activeLootDrops.set(id, {
    id,
    ownerId:owner.id,
    kind:"portalPiece",
    portalId:drop.id,
    portalName:drop.name,
    mapId:String(mapId),
    x,
    y,
    expiresAt
  });
  io.to(owner.id).emit("loot:drop", {
    id,
    kind:"portalPiece",
    portalId:drop.id,
    portalName:drop.name,
    img:drop.img,
    mapId,
    x,
    y,
    expiresAt,
    serverControlled:true,
    at:Date.now()
  });
}

function pickupLoot(socket, payload){
  const player = players.get(socket.id);
  const id = String(payload?.id || "");
  const drop = activeLootDrops.get(id);
  if(!player || !drop){
    socket.emit("loot:error", {message:"Butin introuvable."});
    return;
  }
  if(drop.ownerId !== socket.id){
    socket.emit("loot:error", {message:"Ce butin ne t'appartient pas."});
    return;
  }
  if(Date.now() >= Number(drop.expiresAt || 0)){
    activeLootDrops.delete(id);
    socket.emit("loot:error", {message:"Butin expire."});
    return;
  }
  if(String(player.mapId || "") !== String(drop.mapId || "")){
    socket.emit("loot:error", {message:"Butin sur une autre map."});
    return;
  }
  const state = player.state;
  const distance = state ? Math.hypot(Number(state.x || 0) - Number(drop.x || 0), Number(state.y || 0) - Number(drop.y || 0)) : Infinity;
  if(distance > 220){
    socket.emit("loot:error", {message:"Trop loin du butin."});
    return;
  }
  activeLootDrops.delete(id);
  const result = profileManager.updateProfileForPlayer({
    player,
    update:profile=>{
      if(drop.kind === "portalPiece"){
        if(!profile.portalPieces || typeof profile.portalPieces !== "object") profile.portalPieces = {};
        profile.portalPieces[drop.portalId] = Math.max(0, Number(profile.portalPieces[drop.portalId] || 0)) + 1;
        return {ok:true};
      }
      if(drop.kind === "material"){
        if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
        profile.cargoHold[drop.materialId] = Math.max(0, Number(profile.cargoHold[drop.materialId] || 0)) + Math.max(1, Math.round(Number(drop.amount || 1)));
        return {ok:true};
      }
      if(drop.kind === "ammo"){
        if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
        profile.ammoInventory[drop.ammoId] = Math.max(0, Number(profile.ammoInventory[drop.ammoId] || 0)) + Math.max(1, Math.round(Number(drop.amount || 1)));
        return {ok:true};
      }
      if(drop.kind === "item"){
        if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
        const amount = Math.max(1, Math.min(20, Math.round(Number(drop.amount || 1))));
        let nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
        for(let i = 0; i < amount; i += 1){
          profile.inventoryItems.push({uid:`inv_${drop.itemId}_${nextUid}`, itemId:drop.itemId});
          nextUid += 1;
        }
        profile.nextInventoryUid = nextUid;
        return {ok:true};
      }
      return {ok:false, reason:"Type de butin invalide."};
    }
  });
  if(!result.ok){
    activeLootDrops.set(id, drop);
    socket.emit("loot:error", {message:result.reason || "Ramassage impossible."});
    return;
  }
  socket.emit("loot:picked", {
    id,
    kind:drop.kind,
    portalId:drop.portalId,
    portalName:drop.portalName,
    materialId:drop.materialId,
    ammoId:drop.ammoId,
    itemId:drop.itemId,
    name:drop.name,
    amount:drop.amount,
    at:Date.now()
  });
  if(result.profile) socket.emit("profile:sync", result.profile);
}

function progressServerQuestsForKill({enemy, mapId, attackerId}){
  const attacker = players.get(attackerId);
  if(!attacker || !enemy) return;
  const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
  const profileResult = profileManager.applyQuestAction({
    player:attacker,
    action:{kind:"kill", enemyKind:enemy.kind, zoneName:mapName}
  });
  if(profileResult.ok && profileResult.updates?.length){
    io.to(attacker.id).emit("quest:progress", {
      mapId:String(mapId),
      updates:profileResult.updates,
      at:Date.now()
    });
    if(profileResult.profile) io.to(attacker.id).emit("profile:sync", profileResult.profile);
  }
}

function progressProfileQuestAction(socket, action = {}){
  const player = players.get(socket.id);
  if(!player) return null;
  const result = profileManager.applyQuestAction({
    player,
    action:{kind:"progress", ...action}
  });
  if(!result.ok){
    socket.emit("quest:error", {message:result.reason || "Progression quete impossible."});
    return result;
  }
  if(result.updates?.length){
    socket.emit("quest:progress", {
      updates:result.updates,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  }
  return result;
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

function computeWorldEnemyDecision(enemy, map, mapPlayers, now){
  const spottedTarget = nearestPlayer(enemy, mapPlayers, map);
  let targetX = enemy.x;
  let targetY = enemy.y;
  let speed = Number(enemy.speed || 160);
  const aggroDistance = Math.max(780, Number(enemy.attackRange || 400) + 260) * WORLD_ENEMY_AGGRO_MULTIPLIER;
  let target = null;

  if(spottedTarget && spottedTarget.distance <= aggroDistance){
    target = spottedTarget;
    enemy.lockedPlayerId = target.player.id;
    enemy.lockedPlayerLastSeenAt = now;
  }else if(enemy.lockedPlayerId){
    const lockedPlayer = mapPlayers.find(player=>
      player.id === enemy.lockedPlayerId
      && player.state
      && !isPlayerSafeOnMap(player, map)
    );
    if(lockedPlayer){
      const dx = Number(lockedPlayer.state.x || 0) - enemy.x;
      const dy = Number(lockedPlayer.state.y || 0) - enemy.y;
      const distance = Math.hypot(dx, dy);
      if(distance <= aggroDistance){
        enemy.lockedPlayerLastSeenAt = now;
      }
      if(now - Number(enemy.lockedPlayerLastSeenAt || 0) <= WORLD_ENEMY_TARGET_MEMORY_MS){
        target = {player:lockedPlayer, dx, dy, distance};
      }else{
        enemy.lockedPlayerId = null;
        enemy.lockedPlayerLastSeenAt = 0;
      }
    }else{
      enemy.lockedPlayerId = null;
      enemy.lockedPlayerLastSeenAt = 0;
    }
  }

  if(target){
    const dirX = target.dx / Math.max(1, target.distance);
    const dirY = target.dy / Math.max(1, target.distance);
    const sideX = -dirY;
    const sideY = dirX;
    const aiKind = getEnemyAiKind(enemy.kind);
    const range = Number(enemy.attackRange || 360);
    if(aiKind === "drone_pirate"){
      const preferredDistance = Math.max(110, range - 45);
      const orbit = Math.sin(now / 1000 + Number(String(enemy.id).replace(/\D/g, "") || 0) * 0.77) * Math.min(180, range * .34);
      if(target.distance > range - 20){
        targetX = Number(target.player.state.x || enemy.x) - dirX * preferredDistance + sideX * orbit;
        targetY = Number(target.player.state.y || enemy.y) - dirY * preferredDistance + sideY * orbit;
      }else{
        const currentDistance = Math.max(120, Math.min(range - 35, target.distance || preferredDistance));
        targetX = Number(target.player.state.x || enemy.x) - dirX * currentDistance + sideX * orbit;
        targetY = Number(target.player.state.y || enemy.y) - dirY * currentDistance + sideY * orbit;
        speed *= .72;
      }
    }else if(aiKind === "raider_astral"){
      const contactDistance = Math.max(75, Number(enemy.radius || 32) + 46);
      if(target.distance > contactDistance){
        targetX = Number(target.player.state.x || enemy.x);
        targetY = Number(target.player.state.y || enemy.y);
        speed *= 1.04;
      }else{
        targetX = enemy.x - dirX * 58;
        targetY = enemy.y - dirY * 58;
      }
    }else if(aiKind === "chasseur_spectral"){
      const preferredDistance = range * .62;
      const side = Math.sin(now / 760 + Number(String(enemy.id).replace(/\D/g, "") || 0)) * 145;
      if(target.distance > preferredDistance + 45){
        targetX = Number(target.player.state.x || enemy.x) - dirX * preferredDistance + sideX * side;
        targetY = Number(target.player.state.y || enemy.y) - dirY * preferredDistance + sideY * side;
      }else if(target.distance < preferredDistance - 55){
        targetX = enemy.x - dirX * 170 + sideX * side * .45;
        targetY = enemy.y - dirY * 170 + sideY * side * .45;
      }else{
        targetX = enemy.x + sideX * side;
        targetY = enemy.y + sideY * side;
      }
    }else{
      const preferredDistance = Math.max(120, range * .72);
      if(target.distance > preferredDistance + 35){
        targetX = Number(target.player.state.x || enemy.x);
        targetY = Number(target.player.state.y || enemy.y);
      }else if(target.distance < Math.max(95, preferredDistance - 75)){
        targetX = enemy.x - target.dx;
        targetY = enemy.y - target.dy;
      }else{
        const side = Math.sin(now / 900 + Number(String(enemy.id).replace(/\D/g, "") || 0)) * 130;
        targetX = enemy.x + sideX * side;
        targetY = enemy.y + sideY * side;
        speed *= .55;
      }
    }
  }else{
    pickEnemyWanderTarget(enemy, map, now);
    targetX = enemy.wanderX;
    targetY = enemy.wanderY;
    enemy.lockedPlayerId = null;
    enemy.lockedPlayerLastSeenAt = 0;
  }

  return {
    targetX:clamp(targetX, -map.width / 2 + 70, map.width / 2 - 70),
    targetY:clamp(targetY, -map.height / 2 + 70, map.height / 2 - 70),
    speed,
    targetPlayerId:target?.player?.id || null,
    targetDistance:Number(target?.distance || Infinity)
  };
}

function updateWorldEnemy(enemy, map, mapPlayers, dt, now){
  if(enemy.hp <= 0){
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.moving = false;
    return;
  }
  enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
  if(!enemy.aiDecision || now >= Number(enemy.nextAiDecisionAt || 0)){
    enemy.aiDecision = computeWorldEnemyDecision(enemy, map, mapPlayers, now);
    const jitter = Number(String(enemy.id).replace(/\D/g, "") || 0) % 90;
    enemy.nextAiDecisionAt = now + WORLD_AI_REPATH_MS + jitter;
  }
  const decision = enemy.aiDecision || {targetX:enemy.x, targetY:enemy.y, speed:0, targetPlayerId:null, targetDistance:Infinity};
  const targetX = Number(decision.targetX || enemy.x);
  const targetY = Number(decision.targetY || enemy.y);
  const speed = Number(decision.speed || 0);
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = Math.hypot(dx, dy);
  if(distance > 8){
    const step = Math.min(distance, speed * dt);
    let nx = dx / distance;
    let ny = dy / distance;
    const currentSpeed = Math.hypot(Number(enemy.vx || 0), Number(enemy.vy || 0));
    if(currentSpeed > 1){
      const prevX = Number(enemy.vx || 0) / currentSpeed;
      const prevY = Number(enemy.vy || 0) / currentSpeed;
      const turnDot = prevX * nx + prevY * ny;
      if(turnDot < -0.25){
        nx = prevX * .72 + nx * .28;
        ny = prevY * .72 + ny * .28;
        const blendedLength = Math.hypot(nx, ny) || 1;
        nx /= blendedLength;
        ny /= blendedLength;
      }
    }
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

  const attackTarget = decision.targetPlayerId ? players.get(decision.targetPlayerId) : null;
  const attackDistance = attackTarget?.state
    ? Math.hypot(Number(attackTarget.state.x || 0) - enemy.x, Number(attackTarget.state.y || 0) - enemy.y)
    : Infinity;
  if(attackTarget?.state && attackDistance <= Number(enemy.attackRange || 360) && now >= Number(enemy.nextAttackAt || 0)){
    const amount = Math.max(1, Math.round(Number(enemy.attackDamage || 25) * (0.85 + Math.random() * 0.3)));
    enemy.nextAttackAt = now + Number(enemy.attackCooldown || 1400);
    emitEnemyAttack(enemy, map, attackTarget, amount);
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
  for(const [id, drop] of activeLootDrops.entries()){
    if(now >= Number(drop.expiresAt || 0)) activeLootDrops.delete(id);
  }
  presence.tick(now);
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
  if(!instance || instance.type !== "portal" || instance.rewardGranted) return;
  instance.rewardGranted = true;
  instance.rewardGrantedAt = Date.now();
  instance.completed = true;
  const portal = PORTAL_CONFIGS[instance.portal?.id] || PORTAL_CONFIGS.blue;
  const now = Date.now();
  for(const memberId of group.members || []){
    const player = players.get(memberId);
    if(!player) continue;
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        profile.player = applyProgressionReward(profile.player || {}, portal.reward || {});
        if(!profile.completedPortals || typeof profile.completedPortals !== "object") profile.completedPortals = {};
        profile.completedPortals[portal.id] = Math.max(0, Number(profile.completedPortals[portal.id] || 0)) + 1;
        if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
        if(Number(portal.reward?.ammoX4 || 0) > 0){
          profile.ammoInventory.ammo_x4 = Math.max(0, Number(profile.ammoInventory.ammo_x4 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX4 || 0)));
        }
        if(Number(portal.reward?.ammoX6 || 0) > 0){
          profile.ammoInventory.ammo_x6 = Math.max(0, Number(profile.ammoInventory.ammo_x6 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX6 || 0)));
        }
        return {ok:true};
      }
    });
    io.to(memberId).emit("portal:complete", {
      instanceId:instance.id,
      portal:{id:portal.id, name:portal.name},
      reward:portal.reward,
      rewardAppliedByServer:true,
      at:now
    });
    if(result.profile) io.to(memberId).emit("profile:sync", result.profile);
  }
  emitInstance(group);
}

function applyEnemyHit(socket, payload){
  const player = players.get(socket.id);
  let incoming = Math.max(0, Math.min(5000000, Number(payload?.amount || 0)));
  let combatResult = null;
  if(payload?.serverCalculated){
    incoming = 0;
  }
  presence.markCombat(player, "attaque joueur");

  const worldEnemy = findWorldEnemyForPlayer(player, String(payload?.enemyId || ""));
  if(worldEnemy){
    if(payload?.serverCalculated){
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>resolveServerCombatFire({player, profile, enemy:worldEnemy, payload})
      });
      if(!result.ok){
        socket.emit("combat:error", {message:result.reason || "Tir refuse."});
        return;
      }
      combatResult = result;
      incoming = result.damage || 0;
      socket.emit("combat:hit", {
        enemyId:worldEnemy.id,
        weaponClass:result.weaponClass,
        ammoId:result.ammoId,
        consumed:result.consumed,
        hit:result.hit,
        damage:incoming,
        at:Date.now()
      });
      if(result.profile) socket.emit("profile:sync", result.profile);
      if(incoming <= 0){
        emitWorldEnemies(player.mapId);
        return;
      }
    }else if(incoming <= 0) return;
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
  if(payload?.serverCalculated){
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>resolveServerCombatFire({player, profile, enemy, payload})
    });
    if(!result.ok){
      socket.emit("combat:error", {message:result.reason || "Tir refuse."});
      return;
    }
    combatResult = result;
    incoming = result.damage || 0;
    socket.emit("combat:hit", {
      enemyId:enemy.id,
      weaponClass:result.weaponClass,
      ammoId:result.ammoId,
      consumed:result.consumed,
      hit:result.hit,
      damage:incoming,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
    if(incoming <= 0){
      emitInstance(group);
      return;
    }
  }else if(incoming <= 0) return;
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
  function guard(eventName){
    return allowSocketEvent(socket, eventName);
  }

  players.set(socket.id, presence.createPlayer(socket.id));

  socket.emit("server:ready", {id:socket.id, port:PORT});
  setPlayerMap(socket, "0");
  emitPlayers();

  socket.on("auth:register", async payload=>{
    if(!guard("auth:register")) return;
    try{
      const account = await registerAccount(payload);
      const session = await createSession(account.id);
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Inscription impossible."});
    }
  });

  socket.on("auth:login", async payload=>{
    if(!guard("auth:login")) return;
    try{
      const account = await loginAccount(payload);
      const session = await createSession(account.id);
      attachOrResumeAccountSocket(socket, account, session);
      socket.emit("auth:success", publicAuthPayload({account, session}));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Connexion impossible."});
    }
  });

  socket.on("auth:session", async payload=>{
    if(!guard("auth:session")) return;
    try{
      const result = await getSessionAccount(payload?.token);
      if(!result?.account) throw new Error("Session expiree.");
      attachOrResumeAccountSocket(socket, result.account, result);
      socket.emit("auth:success", publicAuthPayload({
        account:result.account,
        session:{token:payload?.token, expiresAt:result.expiresAt}
      }));
      syncProfileForPlayer(socket);
    }catch(error){
      socket.emit("auth:error", {message:error?.message || "Session invalide."});
    }
  });

  socket.on("auth:logout", async payload=>{
    if(!guard("auth:logout")) return;
    if(payload?.token) await revokeSessionByToken(payload.token);
    const player = players.get(socket.id);
    if(player){
      player.accountId = null;
      player.account = null;
      player.sessionExpiresAt = null;
    }
    socket.emit("auth:logout");
    emitPlayers();
  });

  socket.on("player:hello", payload=>{
    if(!guard("player:hello")) return;
    const player = players.get(socket.id);
    if(!player) return;
    player.clientMode = payload?.clientMode === "game" ? "game" : "launcher";
    if(!player.accountId) player.name = cleanName(payload?.name);
    syncProfileForPlayer(socket);
    emitPlayers();
  });

  socket.on("profile:save", payload=>{
    if(!guard("profile:save")) return;
    const player = players.get(socket.id);
    const incoming = profileManager.saveFromPayload({player, payload});
    if(incoming) socket.emit("profile:saved", {updatedAt:incoming.updatedAt});
  });

  socket.on("quest:accept", payload=>{
    if(!guard("quest:accept")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"accept", questId:payload?.id}
    });
    if(!result.ok){
      socket.emit("quest:error", {message:result.reason || "Quete impossible."});
      return;
    }
    socket.emit("quest:accepted", {id:result.quest?.id, title:result.quest?.title, at:Date.now()});
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("quest:claim", payload=>{
    if(!guard("quest:claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"claim", questId:payload?.id}
    });
    if(!result.ok){
      socket.emit("quest:error", {message:result.reason || "Recompense impossible."});
      return;
    }
    socket.emit("quest:claimed", {id:result.quest?.id, title:result.quest?.title, at:Date.now()});
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("quest:progress", payload=>{
    if(!guard("quest:progress")) return;
    const type = String(payload?.type || "");
    if(![
      "refinery_module_upgrade_start",
      "refinery_material_upgrade_start",
      "space_caster_use",
      "quest_item_drop",
      "talk_npc",
      "visit_coordinates"
    ].includes(type)) return;
    progressProfileQuestAction(socket, {
      type,
      moduleId:String(payload?.moduleId || ""),
      materialId:String(payload?.materialId || ""),
      itemId:String(payload?.itemId || ""),
      npcId:String(payload?.npcId || ""),
      zoneName:String(payload?.zoneName || ""),
      x:Number(payload?.x || 0),
      y:Number(payload?.y || 0),
      targetLevel:Number(payload?.targetLevel || 0),
      amount:Number(payload?.amount || 1)
    });
  });

  socket.on("space-caster:run", payload=>{
    if(!guard("space-caster:run")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"space-caster", portalId:payload?.portalId, count:payload?.count}
    });
    if(!result.ok){
      socket.emit("space-caster:error", {message:result.reason || "Space Caster impossible."});
      return;
    }
    socket.emit("space-caster:result", {
      portal:result.portal,
      count:result.count,
      cost:result.cost,
      rewards:result.rewards,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:upgrade-start", payload=>{
    if(!guard("refinery:upgrade-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-upgrade-start", type:payload?.type, id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"upgrade-start",
      type:result.type,
      id:result.id,
      name:result.name,
      level:result.level,
      duration:result.duration,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:upgrade-rush", payload=>{
    if(!guard("refinery:upgrade-rush")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-upgrade-rush", type:payload?.type, id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Acceleration impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"upgrade-rush",
      type:result.type,
      id:result.id,
      name:result.name,
      level:result.level,
      cost:result.cost,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:production-toggle", payload=>{
    if(!guard("refinery:production-toggle")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-production-toggle", id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Production impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"production-toggle",
      id:result.id,
      enabled:result.enabled,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:job-start", payload=>{
    if(!guard("refinery:job-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-job-start", recipeId:payload?.recipeId}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Raffinage impossible."});
      return;
    }
    socket.emit("refinery:updated", {action:"job-start", recipe:result.recipe, at:Date.now()});
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:job-claim", ()=>{
    if(!guard("refinery:job-claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-job-claim"}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Recuperation impossible."});
      return;
    }
    socket.emit("refinery:updated", {action:"job-claim", recipe:result.recipe, at:Date.now()});
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:shipment-start", payload=>{
    if(!guard("refinery:shipment-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"refinery-shipment-start",
        materialId:payload?.materialId,
        amount:payload?.amount,
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Expedition impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"shipment-start",
      material:result.material,
      amount:result.amount,
      ship:result.ship,
      credits:result.credits,
      duration:result.duration,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:shipment-rush", ()=>{
    if(!guard("refinery:shipment-rush")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-shipment-rush"}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Acceleration expedition impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"shipment-rush",
      materialName:result.materialName,
      amount:result.amount,
      cost:result.cost,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("refinery:ship-cargo-refine", payload=>{
    if(!guard("refinery:ship-cargo-refine")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"ship-cargo-refine",
        recipeId:payload?.recipeId,
        amount:payload?.amount,
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Fusion impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"ship-cargo-refine",
      recipe:result.recipe,
      output:result.output,
      amount:result.amount,
      outputAmount:result.outputAmount,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("shop:buy-ammo", payload=>{
    if(!guard("shop:buy-ammo")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getAmmoPurchase(payload?.id, payload?.multiplier);
    if(!purchase){
      socket.emit("shop:error", {message:"Munition inconnue."});
      return;
    }
    const result = profileManager.addAmmoPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:ammo-bought", {
      id:purchase.id,
      name:purchase.name,
      amount:purchase.totalAmount,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      multiplier:purchase.multiplier,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("shop:buy-item", payload=>{
    if(!guard("shop:buy-item")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getItemPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Objet inconnu."});
      return;
    }
    const result = profileManager.addItemPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:item-bought", {
      id:purchase.id,
      name:purchase.name,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("shop:buy-ship", payload=>{
    if(!guard("shop:buy-ship")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getShipPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Vaisseau inconnu."});
      return;
    }
    const result = profileManager.addShipPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:ship-bought", {
      id:purchase.id,
      name:purchase.name,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("shop:buy-drone", payload=>{
    if(!guard("shop:buy-drone")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getDronePurchase({id:payload?.id || "combat_drone", ownedCount:payload?.ownedCount});
    if(!purchase){
      socket.emit("shop:error", {message:"Drone inconnu."});
      return;
    }
    if(purchase.locked){
      socket.emit("shop:error", {message:purchase.reason || "Drone indisponible."});
      return;
    }
    const result = profileManager.addDronePurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:drone-bought", {
      id:purchase.id,
      name:purchase.name,
      ownedCount:purchase.ownedCount,
      nextCount:purchase.nextCount,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("shop:buy-drone-formation", payload=>{
    if(!guard("shop:buy-drone-formation")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getDroneFormationPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Formation inconnue."});
      return;
    }
    const alreadyOwned = Boolean(payload?.owned);
    const result = profileManager.addDroneFormationPurchase({player, purchase, owned:alreadyOwned});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:drone-formation-bought", {
      id:purchase.id,
      name:purchase.name,
      owned:alreadyOwned,
      priceType:purchase.priceType,
      price:alreadyOwned ? 0 : purchase.totalPrice,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("ship:equip-active", payload=>{
    if(!guard("ship:equip-active")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeActiveShipAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("ship:equip-error", {message:location.reason || "Changement de vaisseau impossible."});
      return;
    }
    const liveGamePlayer = location.gamePlayerId ? players.get(location.gamePlayerId) : null;
    const spawnSession = buildFirmSpawnSession({
      shipId:String(payload?.shipId || ""),
      firmId:location.firmId,
      state:liveGamePlayer?.state || profileManager.getWorldSessionForPlayer(player)
    });
    const result = profileManager.setActiveShipForPlayer({
      player,
      shipId:String(payload?.shipId || ""),
      worldSession:spawnSession
    });
    if(!result.ok){
      socket.emit("ship:equip-error", {message:result.reason || "Changement de vaisseau impossible."});
      return;
    }
    if(liveGamePlayer?.state){
      liveGamePlayer.state = {
        ...liveGamePlayer.state,
        ...spawnSession,
        shipId:result.shipId,
        updatedAt:Date.now()
      };
      liveGamePlayer.mapId = spawnSession.mapId;
      const gameSocket = io.sockets.sockets.get(liveGamePlayer.id);
      if(gameSocket) setPlayerMap(gameSocket, spawnSession.mapId);
      profileManager.saveWorldSession({player:liveGamePlayer, state:liveGamePlayer.state, force:true});
    }
    const event = {
      shipId:result.shipId,
      homeMap:location.homeMap,
      mapId:spawnSession.mapId,
      x:spawnSession.x,
      y:spawnSession.y,
      source:location.source,
      at:Date.now()
    };
    for(const accountPlayer of accountSocketsForPlayer(player)){
      const accountSocket = io.sockets.sockets.get(accountPlayer.id);
      if(!accountSocket) continue;
      accountSocket.emit("ship:active-equipped", event);
      if(accountPlayer.clientMode === "game"){
        accountSocket.emit("player:resume", spawnSession);
      }
      if(result.profile) accountSocket.emit("profile:sync", result.profile);
    }
  });

  socket.on("equipment:equip", payload=>{
    if(!guard("equipment:equip")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"equip",
        type:String(payload?.type || ""),
        index:payload?.index,
        inventoryUid:String(payload?.inventoryUid || ""),
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Equipement impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"equip", target:result.target || null, item:result.item || null, at:Date.now()});
  });

  socket.on("equipment:unequip-slot", payload=>{
    if(!guard("equipment:unequip-slot")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"unequip-slot",
        type:String(payload?.type || ""),
        index:payload?.index,
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Retrait impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"unequip-slot", at:Date.now()});
  });

  socket.on("equipment:unequip-inventory", payload=>{
    if(!guard("equipment:unequip-inventory")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"unequip-inventory",
        inventoryUid:String(payload?.inventoryUid || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Retrait impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"unequip-inventory", at:Date.now()});
  });

  socket.on("equipment:drone-upgrade", payload=>{
    if(!guard("equipment:drone-upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"drone-upgrade",
        index:payload?.index,
        inventoryUid:String(payload?.inventoryUid || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"drone-upgrade", target:result.target || null, item:result.item || null, at:Date.now()});
  });

  socket.on("equipment:upgrade", payload=>{
    if(!guard("equipment:upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"equipment-upgrade",
        itemId:String(payload?.itemId || ""),
        materialSource:String(payload?.materialSource || ""),
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    socket.emit("equipment:updated", {
      action:"equipment-upgrade",
      item:result.item || null,
      level:result.level,
      cost:result.cost,
      materialSource:result.materialSource,
      at:Date.now()
    });
    if(result.profile) socket.emit("profile:sync", result.profile);
  });

  socket.on("player:state", payload=>{
    if(!guard("player:state")) return;
    const player = players.get(socket.id);
    if(!player) return;
    player.connected = true;
    player.disconnecting = false;
    player.removeAt = 0;
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
    profileManager.saveWorldSession({player, state:player.state});
    presence.syncMovementLogoutState(player);
    setPlayerMap(socket, nextMapId);
    socket.broadcast.emit("player:state", publicPlayer(player));
  });

  socket.on("player:laser", payload=>{
    if(!guard("player:laser")) return;
    presence.markCombat(players.get(socket.id), "tir joueur");
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

  socket.on("session:logout-request", ()=>{
    if(!guard("session:logout-request")) return;
    presence.startLogout(socket);
  });

  socket.on("group:create", ()=>{
    if(!guard("group:create")) return;
    createGroup(socket);
  });

  socket.on("group:invite", payload=>{
    if(!guard("group:invite")) return;
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
    if(!guard("group:accept")) return;
    acceptInvite(socket, String(payload?.groupId || ""));
  });

  socket.on("group:decline", payload=>{
    if(!guard("group:decline")) return;
    const group = groups.get(String(payload?.groupId || ""));
    if(!group) return;
    const leader = players.get(group.leaderId);
    if(leader) io.to(group.leaderId).emit("group:declined", {playerId:socket.id, playerName:players.get(socket.id)?.name || "Pilote"});
  });

  socket.on("group:leave", ()=>{
    if(!guard("group:leave")) return;
    leaveCurrentGroup(socket);
    socket.emit("group:update", null);
    emitPlayers();
  });

  socket.on("coop:start-test", ()=>{
    if(!guard("coop:start-test")) return;
    createCoopInstance(socket);
  });

  socket.on("portal:start", payload=>{
    if(!guard("portal:start")) return;
    startPortalInstance(socket, payload?.portalId);
  });

  socket.on("coop:enemy-hit", payload=>{
    if(!guard("coop:enemy-hit")) return;
    applyEnemyHit(socket, payload);
  });

  socket.on("combat:fire", payload=>{
    if(!guard("combat:fire")) return;
    applyEnemyHit(socket, {...payload, serverCalculated:true});
  });

  socket.on("loot:pickup", payload=>{
    if(!guard("loot:pickup")) return;
    pickupLoot(socket, payload);
  });

  socket.on("enemy:hit", payload=>{
    if(!guard("enemy:hit")) return;
    applyEnemyHit(socket, payload);
  });

  socket.on("disconnect", ()=>{
    const player = players.get(socket.id);
    if(player?.state) profileManager.saveWorldSession({player, state:player.state, force:true});
    presence.handleDisconnect(socket, {leaveCurrentGroup});
  });
});

httpServer.listen(PORT, ()=>{
  logger.info(`VoidSector realtime server listening on :${PORT}`);
});
