import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { io } from "socket.io-client";
import { questCatalog } from "../../src/data/progression.js";
import { FIRMS, getFirmMapId } from "../../src/data/firms.js";
import { WORLD_MAPS } from "../src/world/definitions.js";

// LOAD_TEST_LOCAL_FIX: shared local defaults — see LOAD_TEST_LOCAL_FIXES.md
dotenv.config({
  path:path.join(path.dirname(fileURLToPath(import.meta.url)), "../loadtest.local.env"),
  override:false
});

const SERVER_URL = String(process.env.BOT_SERVER_URL || "http://127.0.0.1:3001").trim();
const LOAD_TEST_SECRET = String(process.env.LOAD_TEST_SECRET || "").trim();
const BOT_COUNT = clampInt(process.env.BOT_COUNT, 1, 500, 10);
const BOT_DURATION_SECONDS = clampInt(process.env.BOT_DURATION_SECONDS, 10, 86400, 120);
const BOT_RAMP_MS = clampInt(process.env.BOT_RAMP_MS, 0, 10000, 200);
const BOT_TICK_MS = clampInt(process.env.BOT_TICK_MS, 100, 1000, 200);
const BOT_MAP_CHANGE_SECONDS = clampInt(process.env.BOT_MAP_CHANGE_SECONDS, 15, 3600, 55);
const BOT_RESET_QUESTS = String(process.env.BOT_RESET_QUESTS || "true").toLowerCase() !== "false";
const BOT_MEASURE_BYTES = String(process.env.BOT_MEASURE_BYTES || "").toLowerCase() === "true";
const BOT_RUN_ID = cleanRunId(process.env.BOT_RUN_ID || "local");
const BOT_PASSWORD = String(process.env.BOT_PASSWORD || "VoidSectorLoad!2026");
const BOT_ACCOUNT_DOMAIN = "voidsector-load.test";
const WORLD_MAP_IDS = Object.keys(WORLD_MAPS).sort((a, b)=>Number(a) - Number(b));

if(LOAD_TEST_SECRET.length < 16){
  throw new Error("LOAD_TEST_SECRET must match the server and contain at least 16 characters.");
}

function clampInt(value, min, max, fallback){
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function cleanRunId(value){
  return String(value || "local")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "local";
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

function mapFirmId(map, index){
  return map?.firmId || FIRMS[index % FIRMS.length].id;
}

function mapNumber(map){
  const match = String(map?.name || "").match(/-(\d{2})$/);
  return match ? Number(match[1]) : 0;
}

function routeForFirm(firmId){
  return [
    String(getFirmMapId(firmId, 1)),
    String(getFirmMapId(firmId, 2)),
    String(getFirmMapId(firmId, 3)),
    String(getFirmMapId(firmId, 5)),
    "50",
    String(getFirmMapId(firmId, 5)),
    String(getFirmMapId(firmId, 4)),
    String(getFirmMapId(firmId, 2))
  ];
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
    this.mapId = WORLD_MAP_IDS[index % WORLD_MAP_IDS.length];
    this.map = WORLD_MAPS[this.mapId];
    this.firmId = mapFirmId(this.map, index);
    this.route = routeForFirm(this.firmId);
    this.routeIndex = Math.max(0, this.route.indexOf(this.mapId));
    this.name = `LoadBot-${BOT_RUN_ID}-${String(index + 1).padStart(3, "0")}`.slice(0, 24);
    this.email = `loadbot+${BOT_RUN_ID}-${String(index + 1).padStart(3, "0")}@${BOT_ACCOUNT_DOMAIN}`;
    this.clientId = `loadtest:${BOT_RUN_ID}:${index + 1}`;
    this.socket = null;
    this.profile = null;
    this.state = null;
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
    this.nextWanderAt = 0;
    this.nextPortalInstanceAt = Date.now() + jitter(90_000);
    this.wanderTarget = null;
    this.travel = null;
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
      this.socket.emit("auth:register", {
        email:this.email,
        username:this.name,
        password:BOT_PASSWORD
      });
    });
    this.socket.on("connect_error", ()=>this.metrics.inc("connectErrors"));
    this.socket.on("disconnect", ()=>this.metrics.inc("disconnects"));
    this.socket.on("auth:error", payload=>{
      const message = String(payload?.message || "");
      if(!this.loginFallbackSent && /deja utilise|déjà utilisé|identifiants/i.test(message)){
        this.loginFallbackSent = true;
        this.socket.emit("auth:login", {login:this.email, password:BOT_PASSWORD});
        return;
      }
      this.metrics.inc("authErrors");
    });
    this.socket.on("auth:success", ()=>{
      this.socket.emit("player:hello", {
        clientMode:"game",
        clientId:this.clientId,
        name:this.name,
        hasAuthToken:false
      });
    });
    this.socket.on("profile:sync", profile=>{
      this.profile = profile;
      if(!profile?.player?.firmSelected){
        if(!this.setupSent){
          this.setupSent = true;
          this.socket.emit("profile:setup", {name:this.name, firmId:this.firmId});
        }
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
      this.ready = true;
      this.metrics.inc("ready");
      this.startTick();
      this.scheduleQuestAcceptance();
      this.resolveReady(this);
      this.emit("ready", this);
    });
    this.socket.on("player:resume", session=>this.applySession(session));
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
      this.worldEnemies = new Map((payload?.enemies || []).map(enemy=>[enemy.id, enemy]));
    });
    this.socket.on("coop:enemies", payload=>{
      this.instanceEnemies = new Map((payload?.enemies || []).map(enemy=>[enemy.id, enemy]));
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
      this.worldEnemies.clear();
      this.metrics.inc("portalStarts");
      this.sendState();
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
    candidates.slice(0, 5).forEach((quest, index)=>{
      setTimeout(()=>this.socket.emit("quest:accept", {id:quest.id}), 450 * index + this.index % 10 * 20).unref?.();
    });
  }

  tick(){
    if(!this.ready || !this.state || this.dead || !this.socket.connected) return;
    const now = Date.now();
    const dt = Math.min(0.5, Math.max(0.05, (now - this.lastTickAt) / 1000));
    this.lastTickAt = now;

    if(this.shouldStartPortalInstance(now)){
      this.nextPortalInstanceAt = now + jitter(150_000);
      this.socket.emit("portal:start", {portalId:"blue"});
    }

    if(!this.inPortal && (this.travel || now >= this.nextMapChangeAt)){
      this.updateMapTravel(dt);
      this.sendState();
      return;
    }

    const questTarget = this.getQuestInteractionTarget();
    const lootTarget = this.closest([...this.loot.values()]);
    if(lootTarget && !this.inPortal){
      if(this.distanceTo(lootTarget) <= 115){
        this.socket.emit("loot:pickup", {id:lootTarget.id});
        this.loot.delete(lootTarget.id);
      }else{
        this.moveToward(lootTarget, dt);
      }
      this.sendState();
      return;
    }

    if(questTarget && !this.inPortal){
      if(this.distanceTo(questTarget.point) <= questTarget.radius){
        this.socket.emit("quest:progress", questTarget.payload);
        this.nextQuestAttemptAt = now + 20_000;
      }else{
        this.moveToward(questTarget.point, dt);
      }
      this.sendState();
      return;
    }

    const enemies = this.inPortal ? [...this.instanceEnemies.values()] : [...this.worldEnemies.values()];
    const target = this.closest(enemies.filter(enemy=>Number(enemy.hp || 0) > 0));
    if(target){
      const distance = this.distanceTo(target);
      if(distance > 485){
        this.moveToward(target, dt, 430);
        this.state.attackTargetId = "";
      }else{
        this.state.vx = 0;
        this.state.vy = 0;
        this.state.enginePower = 0;
        this.state.moveTarget = null;
        this.state.angle = Math.atan2(target.y - this.state.y, target.x - this.state.x) + Math.PI / 2;
        this.state.attackTargetId = target.id;
        this.state.attackAmmoId = "ammo_x1";
        this.state.attackWeaponClass = "laser";
        if(now >= this.nextFireAt){
          this.nextFireAt = now + jitter(1080, 0.08);
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
    }else{
      this.wander(dt, now);
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
    this.worldEnemies.clear();
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
    this.instanceEnemies.clear();
    this.mapId = this.state.mapId;
    this.map = home;
    this.routeIndex = 0;
    this.nextMapChangeAt = Date.now() + jitter(BOT_MAP_CHANGE_SECONDS * 1000);
    this.sendState();
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
    const speed = Math.max(100, Number(this.state.speed || 330));
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
    this.state.moveTarget = {x:Number(target.x || 0), y:Number(target.y || 0)};
  }

  sendState(){
    if(!this.state || !this.socket.connected) return;
    this.socket.emit("player:state", {
      x:Number(this.state.x || 0),
      y:Number(this.state.y || 0),
      angle:Number(this.state.angle || 0),
      hp:Number(this.state.hp || 0),
      maxHp:Number(this.state.maxHp || 35000),
      shield:Number(this.state.shield || 0),
      maxShield:Number(this.state.maxShield || 0),
      vx:Number(this.state.vx || 0),
      vy:Number(this.state.vy || 0),
      enginePower:Number(this.state.enginePower || 0),
      engineAngle:Number(this.state.engineAngle || this.state.angle || 0),
      mapId:String(this.state.mapId || this.mapId),
      shipId:"razorion",
      shipImg:"assets/ships/Razorion.png",
      level:30,
      radius:48,
      moveTarget:this.state.moveTarget || null,
      attackTargetId:String(this.state.attackTargetId || ""),
      attackAmmoId:String(this.state.attackAmmoId || ""),
      attackWeaponClass:String(this.state.attackWeaponClass || ""),
      repairBotActive:false
    });
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
  console.log(`Starting ${BOT_COUNT} MMO bots on ${SERVER_URL} for ${BOT_DURATION_SECONDS}s (run=${BOT_RUN_ID}).`);
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
  if(!readyBots.length) throw new Error("No bot reached the provisioned state.");
  console.log(`${readyBots.length}/${BOT_COUNT} bots provisioned. Creating groups.`);
  await setupGroups(readyBots);

  const summaryHandle = setInterval(()=>printSummary(metrics, bots), 10_000);
  const stop = ()=>{
    clearInterval(summaryHandle);
    for(const bot of bots) bot.stop();
    printSummary(metrics, bots, "FINAL");
  };
  process.once("SIGINT", ()=>{
    stop();
    process.exitCode = 130;
  });
  process.once("SIGTERM", stop);
  await wait(BOT_DURATION_SECONDS * 1000);
  stop();
}

main().catch(error=>{
  console.error(error);
  process.exitCode = 1;
});
