import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createSocketSessionManager } from "./auth/socketSession.js";
import { config } from "./config.js";
import { dbEnabled, initializeDatabase } from "./db/client.js";
import { createGroupManager } from "./groups/groups.js";
import { logger } from "./logger.js";
import { createEquipmentLocationManager } from "./players/equipmentLocation.js";
import { createPresenceManager } from "./players/presence.js";
import { createProfileManager } from "./players/profiles.js";
import { createPortalInstanceManager } from "./portals/instances.js";
import { createKillQuestProgress } from "./quests/killProgress.js";
import { createSocketRateLimiter } from "./socket/rateLimit.js";
import { createEnemyHitHandler } from "./combat/enemyHits.js";
import { registerAuthHandlers } from "./socket/authHandlers.js";
import { registerCombatHandlers } from "./socket/combatHandlers.js";
import { registerDisconnectHandlers } from "./socket/disconnectHandlers.js";
import { registerEconomyHandlers } from "./socket/economyHandlers.js";
import { registerEquipmentHandlers } from "./socket/equipmentHandlers.js";
import { registerGroupHandlers } from "./socket/groupHandlers.js";
import { registerPlayerHandlers } from "./socket/playerHandlers.js";
import { registerProgressionHandlers } from "./socket/progressionHandlers.js";
import { registerQuestHandlers } from "./socket/questHandlers.js";
import { startServerTick } from "./tick/serverTick.js";
import { createWorldAiManager } from "./world/ai.js";
import { createWorldLootManager } from "./world/loot.js";
import { createWorldRewardManager } from "./world/rewards.js";
import { isPointInWorldSafeArea, publicEnemy } from "./world/spawn.js";
import { createWorldStateManager } from "./world/state.js";

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

function isPlayerSafeOnMap(player, map){
  if(!player?.state) return false;
  return isPointInWorldSafeArea({x:player.state.x, y:player.state.y}, map);
}

const presence = createPresenceManager({
  io,
  players,
  emitPlayers,
  config,
  onPlayerRemove:player=>profileManager.saveWorldSession({player, state:player.state, force:true})
});

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

const {
  emitWorldEnemies,
  findWorldEnemyForPlayer,
  getWorldMapState,
  playersOnMap,
  respawnWorldEnemy,
  setPlayerMap
} = createWorldStateManager({
  io,
  players,
  progressProfileQuestAction
});

const {
  accountSocketsForPlayer,
  buildFirmSpawnSession,
  canChangeActiveShipAtFirmSpawn,
  canChangeEquipmentAtFirmSpawn,
  finishEquipmentChangeAtFirmSpawn
} = createEquipmentLocationManager({
  io,
  players,
  profileManager,
  setPlayerMap
});

const {updateWorldEnemy} = createWorldAiManager({
  io,
  players,
  presence,
  profileManager,
  isPlayerSafeOnMap
});

const {
  cleanupExpiredLootDrops,
  emitPrivatePortalPieceDrop,
  pickupLoot,
  updateLootOwner
} = createWorldLootManager({
  io,
  players,
  profileManager
});

function emitPlayers(){
  io.emit("players:list", [...players.values()].map(publicPlayer));
}

const {
  acceptInvite,
  createCoopInstance,
  createGroup,
  emitGroup,
  emitInstance,
  groups,
  leaveCurrentGroup
} = createGroupManager({
  io,
  players,
  publicPlayer,
  publicEnemy,
  emitPlayers
});

const {
  attachOrResumeAccountSocket,
  publicAuthPayload,
  syncProfileForPlayer
} = createSocketSessionManager({
  io,
  players,
  groups,
  profileManager,
  cleanName,
  emitPlayers,
  emitGroup,
  setPlayerMap
});

const {emitWorldReward} = createWorldRewardManager({
  io,
  players,
  groups,
  profileManager
});

const {progressServerQuestsForKill} = createKillQuestProgress({
  io,
  players,
  profileManager
});

const {
  buildServerPortalWave,
  emitPortalComplete,
  portalWaveTotal,
  startPortalInstance
} = createPortalInstanceManager({
  io,
  players,
  groups,
  profileManager,
  createGroup,
  emitInstance,
  portalWaveTotal:config.portalWaveTotal
});

const {applyEnemyHit} = createEnemyHitHandler({
  buildServerPortalWave,
  emitInstance,
  emitPortalComplete,
  emitPrivatePortalPieceDrop,
  emitWorldEnemies,
  emitWorldReward,
  findWorldEnemyForPlayer,
  groups,
  players,
  presence,
  profileManager,
  progressServerQuestsForKill,
  respawnWorldEnemy,
  updateLootOwner,
  portalWaveTotal
});

startServerTick({
  cleanupExpiredLootDrops,
  emitInstance,
  emitWorldEnemies,
  getWorldMapState,
  groups,
  players,
  playersOnMap,
  presence,
  updateWorldEnemy
});

io.on("connection", socket=>{
  function guard(eventName){
    return allowSocketEvent(socket, eventName);
  }

  players.set(socket.id, presence.createPlayer(socket.id));

  socket.emit("server:ready", {id:socket.id, port:PORT});
  setPlayerMap(socket, "0");
  emitPlayers();

  const socketContext = {
    guard,
    players,
    profileManager,
    progressProfileQuestAction
  };
  registerAuthHandlers(socket, {
    ...socketContext,
    attachOrResumeAccountSocket,
    emitPlayers,
    publicAuthPayload,
    syncProfileForPlayer
  });
  registerPlayerHandlers(socket, {
    ...socketContext,
    cleanName,
    emitPlayers,
    presence,
    publicPlayer,
    setPlayerMap,
    syncProfileForPlayer
  });
  registerQuestHandlers(socket, socketContext);
  registerProgressionHandlers(socket, socketContext);
  registerEconomyHandlers(socket, socketContext);
  registerEquipmentHandlers(socket, {
    ...socketContext,
    io,
    accountSocketsForPlayer,
    buildFirmSpawnSession,
    canChangeActiveShipAtFirmSpawn,
    canChangeEquipmentAtFirmSpawn,
    finishEquipmentChangeAtFirmSpawn,
    setPlayerMap
  });
  registerGroupHandlers(socket, {
    ...socketContext,
    io,
    groups,
    acceptInvite,
    createCoopInstance,
    createGroup,
    emitPlayers,
    leaveCurrentGroup,
    startPortalInstance
  });
  registerCombatHandlers(socket, {
    ...socketContext,
    applyEnemyHit,
    pickupLoot
  });
  registerDisconnectHandlers(socket, {
    ...socketContext,
    leaveCurrentGroup,
    presence
  });
});

httpServer.listen(PORT, ()=>{
  logger.info(`VoidSector realtime server listening on :${PORT}`);
});
