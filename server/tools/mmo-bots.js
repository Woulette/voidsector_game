import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { io } from "socket.io-client";
import { questCatalog } from "../../src/data/progression.js";
import { ships } from "../../src/data/ships.js";
import { FIRMS, getFirmMapId, normalizeFirmId } from "../../src/data/firms.js";
import { replaceServerEnemies } from "../../src/multiplayer/socketState.js";
import { WORLD_MAPS } from "../src/world/definitions.js";

// LOAD_TEST_LOCAL_FIX: shared local defaults - see LOAD_TEST_LOCAL_FIXES.md
dotenv.config({
  path:path.join(path.dirname(fileURLToPath(import.meta.url)), "../loadtest.local.env"),
  override:false
});

const SERVER_URL = String(process.env.BOT_SERVER_URL || "http://127.0.0.1:3001").trim();
const AUTH_URL = String(process.env.BOT_AUTH_URL || process.env.PLATFORM_AUTH_BASE_URL || SERVER_URL).trim();
const LOAD_TEST_SECRET = String(process.env.LOAD_TEST_SECRET || "").trim();
const BOT_COUNT = clampInt(process.env.BOT_COUNT, 1, 500, 10);
const BOT_DURATION_SECONDS = clampInt(process.env.BOT_DURATION_SECONDS, 10, 86400, 120);
const BOT_RAMP_MS = clampInt(process.env.BOT_RAMP_MS, 0, 60000, 200);
const BOT_TICK_MS = clampInt(process.env.BOT_TICK_MS, 100, 1000, 200);
const BOT_MAP_CHANGE_SECONDS = clampInt(process.env.BOT_MAP_CHANGE_SECONDS, 15, 3600, 55);
const BOT_RESET_QUESTS = String(process.env.BOT_RESET_QUESTS || "true").toLowerCase() !== "false";
const BOT_MEASURE_BYTES = String(process.env.BOT_MEASURE_BYTES || "").toLowerCase() === "true";
const BOT_STAY_ONLINE = ["1", "true", "yes", "on"].includes(String(process.env.BOT_STAY_ONLINE || "").trim().toLowerCase());
const BOT_PROVISION_LOADTEST = String(process.env.BOT_PROVISION_LOADTEST || "true").toLowerCase() !== "false";
const BOT_PORTALS_ENABLED = String(process.env.BOT_PORTALS_ENABLED || "true").toLowerCase() !== "false";
const BOT_FIRM_ID = cleanFirmId(process.env.BOT_FIRM_ID || "");
const BOT_START_MAP_ID = cleanMapId(process.env.BOT_START_MAP_ID || "");
const BOT_ROUTE_MAP_IDS = cleanRouteMapIds(process.env.BOT_ROUTE_MAPS || "");
const BOT_MOVEMENT_SPEED_SCALE = clampNumber(process.env.BOT_MOVEMENT_SPEED_SCALE, 0.35, 1, 0.72);
const BOT_TRAFFIC_MODE = cleanTrafficMode(process.env.BOT_TRAFFIC_MODE || "realistic");
const BOT_IDLE_STATE_MS = clampInt(process.env.BOT_IDLE_STATE_MS, 1000, 30000, 5000);
const BOT_MOVING_STATE_MS = clampInt(process.env.BOT_MOVING_STATE_MS, BOT_TICK_MS, 2000, 300);
const BOT_STATE_POSITION_EPSILON = clampNumber(process.env.BOT_STATE_POSITION_EPSILON, 1, 120, 24);
const BOT_STATE_ANGLE_EPSILON = clampNumber(process.env.BOT_STATE_ANGLE_EPSILON, 0.005, 0.5, 0.05);
const BOT_RUN_ID = cleanRunId(process.env.BOT_RUN_ID || "local");
const BOT_PASSWORD = String(process.env.BOT_PASSWORD || "VoidSectorLoad!2026");
const BOT_ACCOUNT_DOMAIN = "voidsector-load.test";
const WORLD_MAP_IDS = Object.keys(WORLD_MAPS).sort((a, b)=>Number(a) - Number(b));
const IS_MAIN = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if(IS_MAIN && BOT_PROVISION_LOADTEST && LOAD_TEST_SECRET.length < 16){
  throw new Error("LOAD_TEST_SECRET must match the server and contain at least 16 characters.");
}

function clampInt(value, min, max, fallback){
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function clampNumber(value, min, max, fallback){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function cleanRunId(value){
  return String(value || "local")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "local";
}

function cleanFirmId(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  return normalizeFirmId(raw);
}

function cleanMapId(value){
  const raw = String(value || "").trim();
  return raw && WORLD_MAPS[raw] ? raw : "";
}

function cleanRouteMapIds(value){
  return String(value || "")
    .split(",")
    .map(entry=>cleanMapId(entry))
    .filter(Boolean);
}

function cleanTrafficMode(value){
  return String(value || "").trim().toLowerCase() === "stress" ? "stress" : "realistic";
}

function angleDelta(a, b){
  return Math.abs(Math.atan2(Math.sin(Number(a || 0) - Number(b || 0)), Math.cos(Number(a || 0) - Number(b || 0))));
}

function hasStateIdentityChange(previous, next){
  return String(previous?.mapId || "") !== String(next?.mapId || "")
    || String(previous?.shipId || "") !== String(next?.shipId || "")
    || String(previous?.attackTargetId || "") !== String(next?.attackTargetId || "")
    || String(previous?.attackAmmoId || "") !== String(next?.attackAmmoId || "")
    || String(previous?.attackWeaponClass || "") !== String(next?.attackWeaponClass || "")
    || Boolean(previous?.repairBotActive) !== Boolean(next?.repairBotActive);
}

export function shouldSendBotStateSnapshot({
  previous = null,
  next = null,
  lastSentAt = 0,
  now = Date.now(),
  force = false,
  mode = BOT_TRAFFIC_MODE,
  idleMs = BOT_IDLE_STATE_MS,
  movingMs = BOT_MOVING_STATE_MS,
  positionEpsilon = BOT_STATE_POSITION_EPSILON,
  angleEpsilon = BOT_STATE_ANGLE_EPSILON
} = {}){
  if(force || mode === "stress") return true;
  if(!previous || !next) return true;
  if(hasStateIdentityChange(previous, next)) return true;
  const elapsed = Math.max(0, Number(now || 0) - Number(lastSentAt || 0));
  const moved = Math.hypot(Number(next.x || 0) - Number(previous.x || 0), Number(next.y || 0) - Number(previous.y || 0));
  const turned = angleDelta(next.angle, previous.angle);
  const moving = Math.hypot(Number(next.vx || 0), Number(next.vy || 0)) > 4 || Number(next.enginePower || 0) > 0.05;
  if(moving) return elapsed >= movingMs && (moved >= positionEpsilon || turned >= angleEpsilon);
  return elapsed >= idleMs;
}

function createEnemyState(){
  return {
    serverEnemies:new Map(),
    serverEnemyDefinitions:new Map(),
    serverEnemyScopeKey:""
  };
}

function clearEnemyState(enemyState){
  enemyState?.serverEnemies?.clear?.();
  enemyState?.serverEnemyDefinitions?.clear?.();
  if(enemyState) enemyState.serverEnemyScopeKey = "";
}

function wait(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

function jitter(base, ratio = 0.2){
  return base * (1 - ratio + Math.random() * ratio * 2);
}

function payloadBytes(args){
  if(!BOT_MEASURE_BYTES) return 0;
  try{
    return Buffer.byteLength(JSON.stringify(args));
  }catch{
    return 0;
  }
}

async function platformAuthRequest(path, body){
  const response = await fetch(`${AUTH_URL.replace(/\/+$/, "")}${path}`, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(body || {})
  });
  const text = await response.text();
  let payload = null;
  try{
    payload = JSON.parse(text);
  }catch{
    const contentType = response.headers.get("content-type") || "unknown";
    throw new Error(`Invalid auth response (${response.status}, ${contentType}) from ${AUTH_URL}`);
  }
  if(!response.ok || payload?.ok === false){
    throw new Error(payload?.message || "Platform authentication failed");
  }
  return payload;
}

function mapFirmId(map, index){
  return map?.firmId || FIRMS[index % FIRMS.length].id;
}

function initialMapIdForBot(index){
  if(BOT_START_MAP_ID) return BOT_START_MAP_ID;
  if(BOT_FIRM_ID){
    const route = routeForFirm(BOT_FIRM_ID);
    return route[index % Math.max(1, route.length)];
  }
  return WORLD_MAP_IDS[index % WORLD_MAP_IDS.length];
}

function mapNumber(map){
  const match = String(map?.name || "").match(/-(\d{2})$/);
  return match ? Number(match[1]) : 0;
}

function routeMapsAreAdjacent(a, b){
  const from = WORLD_MAPS[String(a)];
  const to = WORLD_MAPS[String(b)];
  if(!from || !to) return false;
  if(String(from.id) === String(to.id)) return true;
  const fromNumber = mapNumber(from);
  const toNumber = mapNumber(to);
  if(String(from.id) === "50") return toNumber === 5;
  if(String(to.id) === "50") return fromNumber === 5;
  if(String(from.firmId || "") !== String(to.firmId || "")) return false;
  const pair = [fromNumber, toNumber].sort((x, y)=>x - y).join(":");
  return ["1:2", "2:3", "2:4", "3:4", "3:5", "4:5"].includes(pair);
}

function routeCycleIsValid(route){
  if(route.length <= 1) return true;
  return route.every((mapId, index)=>routeMapsAreAdjacent(mapId, route[(index + 1) % route.length]));
}

function normalizeRouteCycle(route){
  const clean = route.filter(mapId=>WORLD_MAPS[String(mapId)]);
  if(clean.length <= 2 || routeCycleIsValid(clean)) return clean;
  const returnLeg = clean.slice(1, -1).reverse();
  const closed = [...clean, ...returnLeg];
  if(routeCycleIsValid(closed)) return closed;
  return clean;
}

function routeForFirm(firmId){
  if(BOT_ROUTE_MAP_IDS.length) return normalizeRouteCycle(BOT_ROUTE_MAP_IDS);
  return normalizeRouteCycle([
    String(getFirmMapId(firmId, 1)),
    String(getFirmMapId(firmId, 2)),
    String(getFirmMapId(firmId, 3)),
    String(getFirmMapId(firmId, 5)),
    "50",
    String(getFirmMapId(firmId, 5)),
    String(getFirmMapId(firmId, 4)),
    String(getFirmMapId(firmId, 2))
  ]);
}

const SPECIAL_TWO_FOUR_POINTS = {
  astra:{2:{x:4300, y:3300}, 4:{x:-4300, y:3300}},
  cyan:{2:{x:4300, y:-3300}, 4:{x:-4300, y:-3300}},
  jaune:{2:{x:-4300, y:-3300}, 4:{x:-4300, y:3300}},
  verte:{2:{x:-4300, y:3300}, 4:{x:4300, y:3300}}
};

function transitionPoint(map, otherMap, firmId){
  const number = mapNumber(map);
  const otherNumber = mapNumber(otherMap);
  if((number === 2 && otherNumber === 4) || (number === 4 && otherNumber === 2)){
    return SPECIAL_TWO_FOUR_POINTS[firmId]?.[number] || map.portals?.[0] || map.spawn || {x:0, y:0};
  }
  return map.portals?.[0] || map.spawn || {x:0, y:0};
}

function randomWorldPoint(map, seed){
  if(map.spawn && seed % 4 === 0) return {x:map.spawn.x, y:map.spawn.y};
  const width = Math.max(1000, Number(map.width || 10000) - 1200);
  const height = Math.max(1000, Number(map.height || 8000) - 1200);
  const angle = seed * 2.399963229728653;
  return {
    x:Math.cos(angle) * width * 0.34,
    y:Math.sin(angle) * height * 0.34
  };
}

function questObjectives(quest){
  return (Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective]).filter(Boolean);
}

function activeObjective(profile){
  for(const questId of profile?.activeQuestIds || []){
    const quest = questCatalog.find(entry=>entry.id === questId);
    if(!quest) continue;
    for(const objective of questObjectives(quest)){
      if(["visit_coordinates", "talk_npc", "mission_control"].includes(objective.type)){
        return {quest, objective};
      }
    }
  }
  return null;
}

const BOT_PERSONALITIES = [
  {name:"hunter", fight:0.82, quest:0.45, roam:0.42, map:0.45, afk:0.08, portal:0.18, loot:0.82, caution:0.28},
  {name:"quester", fight:0.48, quest:0.86, roam:0.48, map:0.38, afk:0.12, portal:0.10, loot:0.70, caution:0.38},
  {name:"explorer", fight:0.36, quest:0.42, roam:0.88, map:0.78, afk:0.10, portal:0.08, loot:0.54, caution:0.46},
  {name:"casual", fight:0.44, quest:0.54, roam:0.62, map:0.34, afk:0.28, portal:0.06, loot:0.58, caution:0.56},
  {name:"sentinel", fight:0.30, quest:0.34, roam:0.36, map:0.20, afk:0.38, portal:0.04, loot:0.40, caution:0.70}
];

function randomBetween(min, max){
  return min + Math.random() * Math.max(0, max - min);
}

function chance(value){
  return Math.random() < Math.max(0, Math.min(1, Number(value || 0)));
}

function createPersonality(index){
  const base = BOT_PERSONALITIES[index % BOT_PERSONALITIES.length];
  return {
    ...base,
    fight:Math.max(0.08, Math.min(0.95, base.fight + randomBetween(-0.08, 0.08))),
    quest:Math.max(0.08, Math.min(0.95, base.quest + randomBetween(-0.1, 0.1))),
    roam:Math.max(0.08, Math.min(0.95, base.roam + randomBetween(-0.1, 0.1))),
    map:Math.max(0.04, Math.min(0.9, base.map + randomBetween(-0.08, 0.08))),
    afk:Math.max(0.02, Math.min(0.6, base.afk + randomBetween(-0.05, 0.05))),
    portal:Math.max(0.02, Math.min(0.35, base.portal + randomBetween(-0.04, 0.04))),
    loot:Math.max(0.08, Math.min(0.95, base.loot + randomBetween(-0.08, 0.08))),
    caution:Math.max(0.12, Math.min(0.85, base.caution + randomBetween(-0.08, 0.08))),
    fireDelay:randomBetween(920, 1500),
    wanderMs:randomBetween(7000, 22000),
    decisionMs:randomBetween(4500, 14000)
  };
}

class Metrics {
  constructor(){
    this.startedAt = Date.now();
    this.counters = new Map();
    this.inboundEvents = new Map();
    this.outboundEvents = new Map();
    this.inboundBytes = 0;
    this.outboundBytes = 0;
  }

  inc(name, amount = 1){
    this.counters.set(name, Number(this.counters.get(name) || 0) + amount);
  }

  event(target, name, args){
    target.set(name, Number(target.get(name) || 0) + 1);
    return payloadBytes(args);
  }

  inbound(name, args){
    this.inboundBytes += this.event(this.inboundEvents, name, args);
  }

  outbound(name, args){
    this.outboundBytes += this.event(this.outboundEvents, name, args);
  }

  summary(bots){
    const ready = bots.filter(bot=>bot.ready).length;
    const connected = bots.filter(bot=>bot.socket?.connected).length;
    const grouped = bots.filter(bot=>bot.groupId).length;
    const maps = new Set(bots.map(bot=>bot.state?.mapId).filter(Boolean)).size;
    const seconds = Math.max(1, (Date.now() - this.startedAt) / 1000);
    return {
      ready,
      connected,
      grouped,
      maps,
      afk:bots.filter(bot=>bot.behavior === "afk").length,
      resting:bots.filter(bot=>bot.behavior === "rest").length,
      hunting:bots.filter(bot=>bot.behavior === "hunt").length,
      questing:bots.filter(bot=>bot.behavior === "quest").length,
      wandering:bots.filter(bot=>bot.behavior === "wander").length,
      fires:this.counters.get("fires") || 0,
      hits:this.counters.get("hits") || 0,
      rewards:this.counters.get("rewards") || 0,
      mapTransfers:this.counters.get("mapTransfers") || 0,
      questsAccepted:this.counters.get("questsAccepted") || 0,
      questsClaimed:this.counters.get("questsClaimed") || 0,
      deaths:this.counters.get("deaths") || 0,
      respawns:this.counters.get("respawns") || 0,
      lootPicked:this.counters.get("lootPicked") || 0,
      corrections:this.counters.get("corrections") || 0,
      stateSent:this.counters.get("stateSent") || 0,
      stateSkipped:this.counters.get("stateSkipped") || 0,
      rateLimited:this.counters.get("rateLimited") || 0,
      inboundEvents:Math.round([...this.inboundEvents.values()].reduce((sum, value)=>sum + value, 0) / seconds),
      outboundEvents:Math.round([...this.outboundEvents.values()].reduce((sum, value)=>sum + value, 0) / seconds),
      inboundMiB:Number((this.inboundBytes / 1024 / 1024).toFixed(2)),
      outboundMiB:Number((this.outboundBytes / 1024 / 1024).toFixed(2))
    };
  }
}

class MmoBot extends EventEmitter {
  constructor(index, metrics, runtime){
    super();
    this.index = index;
    this.metrics = metrics;
    this.runtime = runtime;
    this.mapId = initialMapIdForBot(index);
    this.map = WORLD_MAPS[this.mapId];
    this.firmId = BOT_FIRM_ID || mapFirmId(this.map, index);
    this.personality = createPersonality(index);
    this.route = routeForFirm(this.firmId);
    this.routeIndex = Math.max(0, this.route.indexOf(this.mapId));
    this.name = `LoadBot-${BOT_RUN_ID}-${String(index + 1).padStart(3, "0")}`.slice(0, 24);
    this.email = `loadbot+${BOT_RUN_ID}-${String(index + 1).padStart(3, "0")}@${BOT_ACCOUNT_DOMAIN}`;
    this.clientId = `loadtest:${BOT_RUN_ID}:${index + 1}`;
    this.socket = null;
    this.profile = null;
    this.state = null;
    this.worldEnemyState = createEnemyState();
    this.instanceEnemyState = createEnemyState();
    this.worldEnemies = new Map();
    this.instanceEnemies = new Map();
    this.loot = new Map();
    this.groupId = null;
    this.groupLeaderId = null;
    this.ready = false;
    this.dead = false;
    this.inPortal = false;
    this.portalCompleted = false;
    this.setupSent = false;
    this.provisionSent = false;
    this.loginFallbackSent = false;
    this.nextFireAt = 0;
    this.nextMapChangeAt = Date.now() + jitter(BOT_MAP_CHANGE_SECONDS * 1000);
    this.nextQuestAttemptAt = 0;
    this.nextQuestScheduleAt = Date.now() + jitter(20_000);
    this.nextWanderAt = 0;
    this.nextPortalInstanceAt = Date.now() + jitter(90_000);
    this.nextHumanDecisionAt = Date.now() + jitter(3500);
    this.nextActivityAt = Date.now() + jitter(60_000);
    this.nextHelloAt = 0;
    this.nextClaimAttemptAt = Date.now() + jitter(35_000);
    this.afkUntil = 0;
    this.restUntil = 0;
    this.repairActiveUntil = 0;
    this.behavior = "spawn";
    this.wanderTarget = null;
    this.travel = null;
    this.lastStateSnapshot = null;
    this.lastStateSentAt = 0;
    this.lastTickAt = Date.now();
    this.tickHandle = null;
    this.readyPromise = new Promise((resolve, reject)=>{
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  start(){
    this.socket = io(SERVER_URL, {
      transports:["websocket"],
      reconnection:true,
      reconnectionAttempts:20,
      reconnectionDelay:500,
      timeout:15_000
    });
    this.socket.onAny((event, ...args)=>this.metrics.inbound(event, args));
    this.socket.onAnyOutgoing((event, ...args)=>this.metrics.outbound(event, args));
    this.installListeners();
    setTimeout(()=>{
      if(!this.ready) this.rejectReady(new Error(`${this.name}: initialization timeout`));
    }, 60_000).unref?.();
    return this.readyPromise;
  }

  installListeners(){
    this.socket.on("connect", ()=>{
      this.metrics.inc("connections");
      this.authenticate()
        .then(token=>this.socket.emit("auth:session", {token}))
        .catch(error=>{
          this.metrics.inc("authErrors");
          this.rejectReady(new Error(`${this.name}: ${error?.message || "auth failed"}`));
        });
    });
    this.socket.on("connect_error", ()=>this.metrics.inc("connectErrors"));
    this.socket.on("disconnect", ()=>this.metrics.inc("disconnects"));
    this.socket.on("auth:error", ()=>{
      this.metrics.inc("authErrors");
    });
    this.socket.on("auth:success", ()=>{
      this.ensureGameMode(true);
    });
    this.socket.on("profile:sync", profile=>{
      this.profile = profile;
      this.syncProfileRoute(profile);
      if(!profile?.player?.firmSelected){
        if(!this.setupSent){
          this.setupSent = true;
          this.socket.emit("profile:setup", {name:this.name, firmId:this.firmId});
        }
        return;
      }
      if(!BOT_PROVISION_LOADTEST){
        if(!this.state) this.applySession(this.createNormalSession(profile));
        this.markReady("normal-profile");
        return;
      }
      if(!this.provisionSent){
        this.provisionSent = true;
        const point = randomWorldPoint(this.map, this.index + 1);
        this.socket.emit("loadtest:provision", {
          secret:LOAD_TEST_SECRET,
          mapId:this.mapId,
          x:point.x,
          y:point.y,
          resetQuests:BOT_RESET_QUESTS
        });
      }
    });
    this.socket.on("profile:setup-complete", ()=>{
      this.metrics.inc("profileSetupComplete");
      if(!BOT_PROVISION_LOADTEST && this.profile?.player?.firmSelected){
        if(!this.state) this.applySession(this.createNormalSession(this.profile));
        this.markReady("normal-setup");
      }
    });
    this.socket.on("profile:setup-error", payload=>{
      const message = String(payload?.message || "profile setup failed");
      this.metrics.inc("profileSetupErrors");
      this.rejectReady(new Error(`${this.name}: ${message}`));
    });
    this.socket.on("loadtest:error", payload=>{
      const message = String(payload?.message || "provision failed");
      if(/refus/i.test(message) && this.runtime && !this.runtime.provisionRefused){
        this.runtime.provisionRefused = true;
        this.runtime.provisionRefusedMessage = message;
        this.emit("provision-refused", message);
      }
      this.rejectReady(new Error(`${this.name}: ${message}`));
    });
    this.socket.on("loadtest:provisioned", ()=>{
      this.markReady("loadtest-provisioned");
    });
    this.socket.on("player:resume", session=>{
      this.applySession(session);
      if(!BOT_PROVISION_LOADTEST && this.profile?.player?.firmSelected) this.markReady("normal-session");
    });
    this.socket.on("player:state-correction", session=>{
      this.metrics.inc("corrections");
      this.applySession(session);
    });
    this.socket.on("player:damage", event=>{
      if(!this.state) return;
      this.state.hp = Number(event.hp ?? this.state.hp);
      this.state.maxHp = Number(event.maxHp ?? this.state.maxHp);
      this.state.shield = Number(event.shield ?? this.state.shield);
      this.state.maxShield = Number(event.maxShield ?? this.state.maxShield);
    });
    this.socket.on("player:death", event=>{
      this.dead = true;
      this.metrics.inc("deaths");
      const choice = event?.choices?.includes("portal-resume") ? "portal-resume" : "spawn";
      setTimeout(()=>this.socket.emit("player:respawn", {choice}), jitter(1500)).unref?.();
    });
    this.socket.on("player:respawned", event=>{
      this.dead = false;
      this.inPortal = String(event?.session?.mapId || "").startsWith("portal-");
      this.metrics.inc("respawns");
      this.applySession(event?.session);
    });
    this.socket.on("world:enemies", payload=>{
      if(String(payload?.mapId) !== String(this.state?.mapId || this.mapId)) return;
      replaceServerEnemies(this.worldEnemyState, payload, "world");
      this.worldEnemies = this.worldEnemyState.serverEnemies;
    });
    this.socket.on("coop:enemies", payload=>{
      replaceServerEnemies(this.instanceEnemyState, payload, "coop");
      this.instanceEnemies = this.instanceEnemyState.serverEnemies;
      if(payload?.completed && !this.portalCompleted){
        this.portalCompleted = true;
        setTimeout(()=>this.leaveCompletedPortal(), 1800 + this.index % 4 * 250).unref?.();
      }
    });
    this.socket.on("combat:hit", event=>{
      if(event?.hit) this.metrics.inc("hits");
      const target = this.worldEnemies.get(event?.enemyId) || this.instanceEnemies.get(event?.enemyId);
      if(target && Number(event?.damage || 0) > 0){
        target.hp = Math.max(0, Number(target.hp || 0) - Number(event.damage || 0));
      }
    });
    this.socket.on("player:reward", ()=>this.metrics.inc("rewards"));
    this.socket.on("loot:drop", drop=>{
      if(drop?.id) this.loot.set(drop.id, drop);
    });
    this.socket.on("loot:picked", event=>{
      this.loot.delete(event?.id);
      this.metrics.inc("lootPicked");
    });
    this.socket.on("group:invite", invite=>{
      if(invite?.groupId) this.socket.emit("group:accept", {groupId:invite.groupId});
    });
    this.socket.on("group:update", group=>{
      this.groupId = group?.id || null;
      this.groupLeaderId = group?.leaderId || null;
      if(group?.id) this.metrics.inc("groupUpdates");
    });
    this.socket.on("portal:started", event=>{
      this.inPortal = true;
      this.portalCompleted = false;
      const spawn = event?.spawn || {x:0, y:0};
      if(!this.state) return;
      this.state.mapId = String(spawn.mapId || `portal-${event?.portal?.id || "blue"}`);
      this.state.x = Number(spawn.x || 0);
      this.state.y = Number(spawn.y || 0);
      this.state.moveTarget = null;
      clearEnemyState(this.worldEnemyState);
      this.worldEnemies = this.worldEnemyState.serverEnemies;
      clearEnemyState(this.instanceEnemyState);
      this.instanceEnemies = this.instanceEnemyState.serverEnemies;
      this.metrics.inc("portalStarts");
      this.sendState({force:true});
    });
    this.socket.on("quest:accepted", ()=>{
      this.metrics.inc("questsAccepted");
      this.nextQuestAttemptAt = Date.now() + 30_000;
    });
    this.socket.on("quest:claimed", ()=>this.metrics.inc("questsClaimed"));
    this.socket.on("quest:error", ()=>this.metrics.inc("questErrors"));
    this.socket.on("rate:limited", ()=>this.metrics.inc("rateLimited"));
    this.socket.on("account:action-limited", ()=>this.metrics.inc("rateLimited"));
  }

  applySession(session){
    if(!session) return;
    this.state = {
      ...(this.state || {}),
      ...session,
      moveTarget:null,
      attackTargetId:"",
      attackAmmoId:"",
      attackWeaponClass:""
    };
    this.mapId = String(this.state.mapId || this.mapId);
    if(WORLD_MAPS[this.mapId]) this.map = WORLD_MAPS[this.mapId];
    if(this.route[this.routeIndex] !== this.mapId){
      const routeIndex = this.route.indexOf(this.mapId);
      if(routeIndex >= 0) this.routeIndex = routeIndex;
    }
  }

  syncProfileRoute(profile){
    if(BOT_FIRM_ID && !profile?.player?.firmSelected) return;
    const firmId = String(profile?.player?.firmId || "").trim();
    if(!firmId || firmId === this.firmId) return;
    this.firmId = firmId;
    this.route = routeForFirm(this.firmId);
    this.routeIndex = Math.max(0, this.route.indexOf(this.mapId));
  }

  createNormalSession(profile){
    const existing = profile?.worldSession && typeof profile.worldSession === "object" ? profile.worldSession : null;
    if(existing?.mapId) return existing;
    const firmId = String(profile?.player?.firmId || this.firmId || "astra");
    const mapId = String(getFirmMapId(firmId, 1) ?? this.mapId ?? "0");
    const map = WORLD_MAPS[mapId] || this.map || WORLD_MAPS["0"];
    const spawn = map?.spawn || {x:0, y:0};
    const shipId = String(profile?.activeShip || profile?.selectedShip || profile?.ownedShips?.[0] || "orion");
    const ship = ships.find(entry=>entry.id === shipId) || ships.find(entry=>entry.id === "orion");
    const maxHp = Math.max(1, Number(ship?.stats?.vie || 5000));
    return {
      source:"normal-bot",
      mapId,
      x:Number(spawn.x || 0),
      y:Number(spawn.y || 0),
      angle:0,
      hp:maxHp,
      maxHp,
      shield:0,
      maxShield:0,
      shipId,
      shipImg:ship?.combatImg || ship?.img || "",
      updatedAt:Date.now()
    };
  }

  markReady(reason = "ready"){
    if(this.ready || !this.state) return;
    this.ready = true;
    this.metrics.inc("ready");
    this.metrics.inc(`ready:${reason}`);
    this.startTick();
    this.scheduleQuestAcceptance();
    this.resolveReady(this);
    this.emit("ready", this);
  }

  async authenticate(){
    try{
      const payload = await platformAuthRequest("/platform/auth/register", {
        email:this.email,
        username:this.name,
        password:BOT_PASSWORD
      });
      return payload.token;
    }catch(error){
      const message = String(error?.message || "");
      if(!/deja utilise|deja utilise|identifiants/i.test(message)) throw error;
      const payload = await platformAuthRequest("/platform/auth/login", {
        login:this.email,
        password:BOT_PASSWORD
      });
      return payload.token;
    }
  }

  startTick(){
    if(this.tickHandle) return;
    this.lastTickAt = Date.now();
    this.tickHandle = setInterval(()=>this.tick(), BOT_TICK_MS);
  }

  stop(){
    if(this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
    this.socket?.disconnect();
  }

  scheduleQuestAcceptance(){
    this.nextQuestScheduleAt = Date.now() + randomBetween(65_000, 160_000);
    if(!chance(this.personality.quest)) return;
    const candidates = questCatalog
      .filter(quest=>quest.firmId === this.firmId)
      .filter(quest=>!quest.rare && ["normal", "daily"].includes(quest.category || "normal"))
      .filter(quest=>Number(quest.requiredLevel || 1) <= 30)
      .filter(quest=>questObjectives(quest).some(objective=>
        ["kill", "visit_map", "visit_coordinates", "talk_npc", "mission_control", "equipped_ship_lasers"].includes(objective.type)
      ));
    candidates.sort((a, b)=>{
      const aMap = questObjectives(a).some(objective=>
        String(objective.zone || objective.map || "").toUpperCase() === String(this.map?.name || "").toUpperCase()
      );
      const bMap = questObjectives(b).some(objective=>
        String(objective.zone || objective.map || "").toUpperCase() === String(this.map?.name || "").toUpperCase()
      );
      return Number(bMap) - Number(aMap) || Number(a.requiredLevel || 1) - Number(b.requiredLevel || 1);
    });
    const activeCount = Array.isArray(this.profile?.activeQuestIds) ? this.profile.activeQuestIds.length : 0;
    const limit = Math.max(1, Math.min(4, Math.round(1 + this.personality.quest * 3) - activeCount));
    candidates
      .filter(quest=>!(this.profile?.activeQuestIds || []).includes(quest.id))
      .slice(0, limit)
      .forEach((quest, index)=>{
        const delay = randomBetween(800, 6500) + index * randomBetween(900, 2400);
        setTimeout(()=>this.socket?.emit("quest:accept", {id:quest.id}), delay).unref?.();
      });
  }

  tryClaimQuestRewards(now){
    if(now < this.nextClaimAttemptAt || !Array.isArray(this.profile?.activeQuestIds)) return;
    this.nextClaimAttemptAt = now + randomBetween(25_000, 85_000);
    if(!chance(0.45 + this.personality.quest * 0.35)) return;
    for(const questId of this.profile.activeQuestIds.slice(0, 3)){
      setTimeout(()=>this.socket?.emit("quest:claim", {id:questId}), randomBetween(300, 2400)).unref?.();
    }
  }

  sendActivity(now, reason = "bot-human-ai"){
    if(now < this.nextActivityAt || !this.socket?.connected) return;
    this.socket.emit("player:activity", {kind:reason, at:now});
    this.nextActivityAt = now + randomBetween(70_000, 210_000);
  }

  ensureGameMode(force = false){
    const now = Date.now();
    if(!force && now < this.nextHelloAt) return;
    if(!this.socket?.connected) return;
    this.socket.emit("player:hello", {
      clientMode:"game",
      clientId:this.clientId,
      name:this.name,
      hasAuthToken:false
    });
    this.nextHelloAt = now + 30_000;
  }

  chooseHumanBehavior(now){
    if(now < this.nextHumanDecisionAt) return;
    this.nextHumanDecisionAt = now + this.personality.decisionMs * randomBetween(0.65, 1.75);
    if(chance(this.personality.afk)){
      this.behavior = "afk";
      this.afkUntil = now + randomBetween(18_000, 120_000);
      this.wanderTarget = null;
      return;
    }
    if(this.healthRatio() < this.personality.caution){
      this.behavior = "rest";
      this.restUntil = now + randomBetween(8000, 30_000);
      this.wanderTarget = null;
      return;
    }
    const roll = Math.random();
    if(roll < this.personality.quest) this.behavior = "quest";
    else if(roll < this.personality.quest + this.personality.fight) this.behavior = "hunt";
    else if(roll < this.personality.quest + this.personality.fight + this.personality.map) this.behavior = "travel";
    else this.behavior = "wander";
  }

  idleInPlace(){
    if(!this.state) return;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.enginePower = 0;
    this.state.moveTarget = null;
    this.state.attackTargetId = "";
    this.state.attackAmmoId = "";
    this.state.attackWeaponClass = "";
  }

  healthRatio(){
    if(!this.state) return 1;
    const maxHp = Math.max(1, Number(this.state.maxHp || 1));
    const hp = Math.max(0, Number(this.state.hp || maxHp));
    return hp / maxHp;
  }

  shouldRest(now){
    if(this.healthRatio() < this.personality.caution * 0.72){
      this.restUntil = Math.max(this.restUntil, now + randomBetween(12_000, 36_000));
      this.behavior = "rest";
      return true;
    }
    return now < this.restUntil;
  }

  restOrRepair(dt, now){
    const map = WORLD_MAPS[String(this.state?.mapId || "")];
    const spawn = map?.spawn || null;
    if(spawn && this.distanceTo(spawn) > 360 && chance(0.75)){
      this.moveToward(spawn, dt, 220);
    }else{
      this.idleInPlace();
    }
    if(this.healthRatio() < 0.92){
      this.repairActiveUntil = now + 1800;
    }
    if(this.healthRatio() > 0.82 && now >= this.restUntil){
      this.behavior = "wander";
      this.nextHumanDecisionAt = now + randomBetween(1500, 5500);
    }
  }

  maybeRescheduleQuests(now){
    if(now >= this.nextQuestScheduleAt) this.scheduleQuestAcceptance();
  }

  maybeStartPortal(now){
    if(!BOT_PORTALS_ENABLED) return false;
    if(this.inPortal || this.groupLeaderId !== this.socket.id || now < this.nextPortalInstanceAt) return false;
    this.nextPortalInstanceAt = now + jitter(150_000);
    const groupNumber = Math.floor(this.index / 4);
    if(groupNumber % 4 !== 0 || !chance(this.personality.portal)) return false;
    this.socket.emit("portal:start", {portalId:"blue"});
    return true;
  }

  shouldTravel(now){
    if(this.travel) return true;
    if(now < this.nextMapChangeAt) return false;
    if(this.behavior === "travel") return chance(0.88);
    return chance(this.personality.map * 0.55);
  }

  chooseTarget(enemies){
    const viable = enemies
      .filter(enemy=>Number(enemy.hp || 0) > 0)
      .filter(enemy=>this.distanceTo(enemy) < (this.behavior === "hunt" ? 2200 : 1250));
    return this.closest(viable);
  }

  shouldFightTarget(target){
    if(!target || this.behavior === "afk" || this.behavior === "rest") return false;
    if(this.healthRatio() < this.personality.caution) return false;
    if(this.behavior === "hunt") return chance(this.personality.fight);
    if(this.behavior === "quest") return chance(this.personality.fight * 0.45);
    return chance(this.personality.fight * 0.32);
  }

  maybePickLoot(lootTarget){
    return lootTarget && !this.inPortal && chance(this.personality.loot);
  }

  attackOrApproachTarget(target, dt, now){
    const distance = this.distanceTo(target);
    if(distance > 485){
      this.moveToward(target, dt, 430);
      this.state.attackTargetId = "";
      return;
    }
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.enginePower = 0;
    this.state.moveTarget = null;
    this.state.angle = Math.atan2(target.y - this.state.y, target.x - this.state.x) + Math.PI / 2;
    this.state.attackTargetId = target.id;
    this.state.attackAmmoId = "ammo_x1";
    this.state.attackWeaponClass = "laser";
    if(now >= this.nextFireAt){
      this.nextFireAt = now + jitter(this.personality.fireDelay, 0.16);
      this.socket.emit("combat:fire", {
        enemyId:target.id,
        weaponClass:"laser",
        ammoId:"ammo_x1",
        count:1,
        clientAimX:Number(target.x || 0),
        clientAimY:Number(target.y || 0),
        targetRadius:Number(target.radius || 40)
      });
      this.metrics.inc("fires");
    }
  }

  maybeMoveToQuestTarget(questTarget, dt, now){
    if(!questTarget || this.inPortal || this.behavior !== "quest") return false;
    if(this.distanceTo(questTarget.point) <= questTarget.radius){
      this.socket.emit("quest:progress", questTarget.payload);
      this.nextQuestAttemptAt = now + randomBetween(18_000, 45_000);
    }else{
      this.moveToward(questTarget.point, dt);
    }
    return true;
  }

  maybeMoveToLoot(lootTarget, dt){
    if(!this.maybePickLoot(lootTarget)) return false;
    if(this.distanceTo(lootTarget) <= 115){
      this.socket.emit("loot:pickup", {id:lootTarget.id});
      this.loot.delete(lootTarget.id);
    }else{
      this.moveToward(lootTarget, dt);
    }
    return true;
  }

  humanWander(dt, now){
    if(this.behavior === "afk"){
      if(now < this.afkUntil){
        this.idleInPlace();
        return;
      }
      this.behavior = "wander";
    }
    this.wander(dt, now);
  }

  tick(){
    if(!this.ready || !this.state || this.dead || !this.socket.connected) return;
    const now = Date.now();
    const dt = Math.min(0.5, Math.max(0.05, (now - this.lastTickAt) / 1000));
    this.lastTickAt = now;

    this.ensureGameMode();
    this.sendActivity(now, this.behavior === "afk" ? "afk-idle" : "bot-human-ai");
    this.chooseHumanBehavior(now);
    this.maybeRescheduleQuests(now);
    this.tryClaimQuestRewards(now);

    if(this.maybeStartPortal(now)){
      this.sendState();
      return;
    }

    if(this.behavior === "afk" && now < this.afkUntil){
      this.idleInPlace();
      this.sendState();
      return;
    }

    if(this.shouldRest(now)){
      this.restOrRepair(dt, now);
      this.sendState();
      return;
    }

    if(!this.inPortal && this.shouldTravel(now)){
      this.updateMapTravel(dt);
      this.sendState();
      return;
    }

    const questTarget = this.getQuestInteractionTarget();
    const lootTarget = this.closest([...this.loot.values()]);
    if(this.maybeMoveToLoot(lootTarget, dt)){
      this.sendState();
      return;
    }

    if(this.maybeMoveToQuestTarget(questTarget, dt, now)){
      this.sendState();
      return;
    }

    const enemies = this.inPortal ? [...this.instanceEnemies.values()] : [...this.worldEnemies.values()];
    const target = this.chooseTarget(enemies);
    if(this.shouldFightTarget(target)){
      this.attackOrApproachTarget(target, dt, now);
    }else{
      this.humanWander(dt, now);
    }
    this.sendState();
  }

  shouldStartPortalInstance(now){
    if(this.inPortal || this.groupLeaderId !== this.socket.id || now < this.nextPortalInstanceAt) return false;
    const groupNumber = Math.floor(this.index / 4);
    return groupNumber % 4 === 0;
  }

  getQuestInteractionTarget(){
    if(Date.now() < this.nextQuestAttemptAt) return null;
    const active = activeObjective(this.profile);
    const objective = active?.objective;
    if(!objective || !WORLD_MAPS[String(this.state?.mapId || "")]) return null;
    const map = WORLD_MAPS[String(this.state.mapId)];
    const zone = String(objective.zone || objective.map || "");
    if(zone && zone !== map.name) return null;
    if(objective.type === "visit_coordinates"){
      const scale = Number(objective.scale || 1);
      return {
        point:{x:Number(objective.x || 0) * scale, y:Number(objective.y || 0) * scale},
        radius:Math.max(60, Number(objective.tolerance || 8) * scale),
        payload:{type:"visit_coordinates"}
      };
    }
    if(objective.type === "talk_npc"){
      const npc = (map.questNpcs || []).find(entry=>String(entry.id) === String(objective.npcId));
      if(!npc) return null;
      return {
        point:npc,
        radius:Math.max(100, Number(npc.interactionRadius || 220) - 30),
        payload:{type:"talk_npc", npcId:npc.id}
      };
    }
    if(objective.type === "mission_control" && map.spawn){
      const sideX = Number(map.spawn.x || 0) > 0 ? -1 : 1;
      const sideY = Number(map.spawn.y || 0) > 0 ? -1 : 1;
      return {
        point:{x:Number(map.spawn.x || 0) + sideX * 600, y:Number(map.spawn.y || 0) + sideY * 300},
        radius:250,
        payload:{type:"mission_control"}
      };
    }
    return null;
  }

  updateMapTravel(dt){
    if(!this.travel){
      const nextIndex = (this.routeIndex + 1) % this.route.length;
      const nextMapId = this.route[nextIndex];
      const currentMap = WORLD_MAPS[String(this.state.mapId)];
      const nextMap = WORLD_MAPS[nextMapId];
      if(!currentMap || !nextMap){
        this.nextMapChangeAt = Date.now() + jitter(BOT_MAP_CHANGE_SECONDS * 1000);
        return;
      }
      this.travel = {
        nextIndex,
        nextMapId,
        source:transitionPoint(currentMap, nextMap, this.firmId),
        destination:transitionPoint(nextMap, currentMap, this.firmId)
      };
    }
    if(this.distanceTo(this.travel.source) > 150){
      this.moveToward(this.travel.source, dt);
      return;
    }
    this.state.mapId = this.travel.nextMapId;
    this.state.x = Number(this.travel.destination.x || 0);
    this.state.y = Number(this.travel.destination.y || 0);
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.enginePower = 0;
    this.state.moveTarget = null;
    this.state.attackTargetId = "";
    this.mapId = this.travel.nextMapId;
    this.map = WORLD_MAPS[this.mapId];
    this.routeIndex = this.travel.nextIndex;
    this.travel = null;
    clearEnemyState(this.worldEnemyState);
    this.worldEnemies = this.worldEnemyState.serverEnemies;
    this.nextMapChangeAt = Date.now() + jitter(BOT_MAP_CHANGE_SECONDS * 1000);
    this.metrics.inc("mapTransfers");
  }

  leaveCompletedPortal(){
    if(!this.state || !this.inPortal) return;
    const home = WORLD_MAPS[String(getFirmMapId(this.firmId, 1))];
    const spawn = home?.spawn || {x:0, y:0};
    this.state.mapId = String(home?.id || "0");
    this.state.x = Number(spawn.x || 0);
    this.state.y = Number(spawn.y || 0);
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.enginePower = 0;
    this.state.moveTarget = null;
    this.state.attackTargetId = "";
    this.inPortal = false;
    this.portalCompleted = false;
    clearEnemyState(this.instanceEnemyState);
    this.instanceEnemies = this.instanceEnemyState.serverEnemies;
    this.mapId = this.state.mapId;
    this.map = home;
    this.routeIndex = 0;
    this.nextMapChangeAt = Date.now() + jitter(BOT_MAP_CHANGE_SECONDS * 1000);
    this.sendState({force:true});
  }

  wander(dt, now){
    const map = WORLD_MAPS[String(this.state.mapId)];
    if(!map) return;
    if(!this.wanderTarget || now >= this.nextWanderAt || this.distanceTo(this.wanderTarget) < 80){
      this.wanderTarget = {
        x:(Math.random() - 0.5) * (Number(map.width || 10000) - 900),
        y:(Math.random() - 0.5) * (Number(map.height || 8000) - 900)
      };
      this.nextWanderAt = now + jitter(12_000);
    }
    this.moveToward(this.wanderTarget, dt);
  }

  closest(entries){
    let best = null;
    let bestDistance = Infinity;
    for(const entry of entries){
      const distance = this.distanceTo(entry);
      if(distance >= bestDistance) continue;
      best = entry;
      bestDistance = distance;
    }
    return best;
  }

  distanceTo(target){
    if(!this.state || !target) return Infinity;
    return Math.hypot(Number(target.x || 0) - Number(this.state.x || 0), Number(target.y || 0) - Number(this.state.y || 0));
  }

  moveToward(target, dt, stopDistance = 0){
    const dx = Number(target.x || 0) - Number(this.state.x || 0);
    const dy = Number(target.y || 0) - Number(this.state.y || 0);
    const distance = Math.hypot(dx, dy);
    if(distance <= Math.max(5, stopDistance)){
      this.state.vx = 0;
      this.state.vy = 0;
      this.state.enginePower = 0;
      this.state.moveTarget = null;
      return;
    }
    const speed = Math.max(80, Number(this.state.speed || 330) * BOT_MOVEMENT_SPEED_SCALE);
    const step = Math.min(speed * dt, distance - stopDistance);
    const nx = dx / distance;
    const ny = dy / distance;
    this.state.x += nx * step;
    this.state.y += ny * step;
    this.state.vx = nx * speed;
    this.state.vy = ny * speed;
    this.state.angle = Math.atan2(ny, nx) + Math.PI / 2;
    this.state.engineAngle = this.state.angle;
    this.state.enginePower = 1;
    this.state.moveTarget = null;
  }

  buildStatePayload(now = Date.now()){
    return {
      x:Number(this.state.x || 0),
      y:Number(this.state.y || 0),
      angle:Number(this.state.angle || 0),
      vx:Number(this.state.vx || 0),
      vy:Number(this.state.vy || 0),
      enginePower:Number(this.state.enginePower || 0),
      engineAngle:Number(this.state.engineAngle || this.state.angle || 0),
      mapId:String(this.state.mapId || this.mapId),
      shipId:String(this.state.shipId || "razorion"),
      shipImg:String(this.state.shipImg || "assets/ships/Razorion.png"),
      level:Math.max(1, Math.floor(Number(this.state.level || 30))),
      radius:48,
      moveTarget:null,
      attackTargetId:String(this.state.attackTargetId || ""),
      attackAmmoId:String(this.state.attackAmmoId || ""),
      attackWeaponClass:String(this.state.attackWeaponClass || ""),
      repairBotActive:now < Number(this.repairActiveUntil || 0)
    };
  }

  sendState(options = {}){
    if(!this.state || !this.socket.connected) return false;
    const now = Date.now();
    const payload = this.buildStatePayload(now);
    const shouldSend = shouldSendBotStateSnapshot({
      previous:this.lastStateSnapshot,
      next:payload,
      lastSentAt:this.lastStateSentAt,
      now,
      force:Boolean(options.force)
    });
    if(!shouldSend){
      this.metrics.inc("stateSkipped");
      return false;
    }
    this.socket.emit("player:state", payload);
    this.lastStateSnapshot = {...payload};
    this.lastStateSentAt = now;
    this.metrics.inc("stateSent");
    return true;
  }
}

async function setupGroups(bots){
  const groups = [];
  for(let index = 0; index < bots.length; index += 4) groups.push(bots.slice(index, index + 4));
  await Promise.all(groups.map(async group=>{
    const leader = group[0];
    leader.socket.emit("group:create");
    await wait(350);
    for(const member of group.slice(1)){
      leader.socket.emit("group:invite", {targetId:member.socket.id});
      await wait(650);
    }
  }));
}

function printSummary(metrics, bots, label = "RUN"){
  const summary = metrics.summary(bots);
  console.log(`[${label}] ${JSON.stringify(summary)}`);
}

function stopAllBots(bots){
  for(const bot of bots) bot.stop();
}

function printProvisionRefusedHelp(message){
  console.error(`[loadtest] Serveur refuse le provisionnement (${message}).`);
  console.error("[loadtest] Lance le serveur avec: npm run loadtest:server");
  console.error("[loadtest] Verifie loadtest.local.env (voir LOAD_TEST_LOCAL_FIXES.md).");
}

async function main(){
  console.log(`Starting ${BOT_COUNT} MMO bots on ${SERVER_URL} ${BOT_STAY_ONLINE ? "until stopped" : `for ${BOT_DURATION_SECONDS}s`} (run=${BOT_RUN_ID}).`);
  if(AUTH_URL !== SERVER_URL) console.log(`Using ${AUTH_URL} for platform authentication.`);
  if(!BOT_PROVISION_LOADTEST) console.log("Using normal account profiles; load-test provisioning is disabled for this run.");
  const metrics = new Metrics();
  const runtime = {provisionRefused:false, provisionRefusedMessage:""};
  const bots = [];
  for(let index = 0; index < BOT_COUNT; index += 1){
    if(runtime.provisionRefused) break;
    const bot = new MmoBot(index, metrics, runtime);
    bot.once("provision-refused", message=>printProvisionRefusedHelp(message));
    bots.push(bot);
    bot.start().catch(error=>{
      metrics.inc("startupErrors");
      console.error(error.message);
    });
    if(BOT_RAMP_MS > 0) await wait(BOT_RAMP_MS);
  }

  const readinessDeadline = Date.now() + 70_000;
  while(
    Date.now() < readinessDeadline
    && !runtime.provisionRefused
    && bots.filter(bot=>bot.ready).length < bots.length
  ) await wait(500);

  if(runtime.provisionRefused){
    stopAllBots(bots);
    throw new Error("Load test blocked by server safeguards.");
  }

  const readyBots = bots.filter(bot=>bot.ready);
  if(!readyBots.length) throw new Error("No bot reached the ready state.");
  console.log(`${readyBots.length}/${BOT_COUNT} bots ready. Creating groups.`);
  await setupGroups(readyBots);

  const summaryHandle = setInterval(()=>printSummary(metrics, bots), 10_000);
  let stopped = false;
  let resolveStopped = null;
  const stoppedPromise = new Promise(resolve=>{ resolveStopped = resolve; });
  const stop = ()=>{
    if(stopped) return;
    stopped = true;
    clearInterval(summaryHandle);
    for(const bot of bots) bot.stop();
    printSummary(metrics, bots, "FINAL");
    resolveStopped?.();
  };
  process.once("SIGINT", ()=>{
    stop();
    process.exitCode = 130;
  });
  process.once("SIGTERM", stop);
  if(BOT_STAY_ONLINE) await stoppedPromise;
  else{
    await wait(BOT_DURATION_SECONDS * 1000);
    stop();
  }
}

if(IS_MAIN){
  main().catch(error=>{
    console.error(error);
    process.exitCode = 1;
  });
}
