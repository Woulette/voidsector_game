import "dotenv/config";
import "./loadtestEnv.js";
import http from "node:http";
import { Server } from "socket.io";
import { createAdminAuditStore } from "./admin/adminAudit.js";
import { createAdminManager } from "./admin/adminManager.js";
import { loginAccount, registerAccount } from "./auth/accounts.js";
import { createPlatformAuthHttpHandler } from "./auth/platformHttpApi.js";
import { createPlatformAuthClient } from "./auth/platformAuthClient.js";
import { createSocketSessionManager } from "./auth/socketSession.js";
import { createSession, getSessionAccount, revokeSessionByToken, revokeSessionsForAccount } from "./auth/sessions.js";
import { resolveServerCombatFire } from "./combat/damage.js";
import { getPlayerPvpBlockReason } from "./combat/playerPvp.js";
import { createShipAbilityEffectManager } from "./combat/shipAbilityEffects.js";
import { activateServerShipAbility, applyServerShipLifeSteal } from "./combat/shipAbilities.js";
import { config } from "./config.js";
import { checkDatabaseConnection, closeDatabase, dbEnabled, initializeDatabase } from "./db/client.js";
import { createGroupManager } from "./groups/groups.js";
import { createFirmWarManager } from "./firms/firmWar.js";
import { buildPersonalFirmSeasonSnapshot, emitThrottledFirmRanking } from "./firms/firmBroadcasts.js";
import { getFirmHitOwner, markFirmHitOwner } from "./firms/firmHitOwnership.js";
import { logger } from "./logger.js";
import { normalizeFirmId } from "../../src/data/firms.js";
import { createEquipmentLocationManager } from "./players/equipmentLocation.js";
import { createPlayerLifecycleManager } from "./players/playerLifecycle.js";
import { canSharePlayerState } from "./players/visibility.js";
import { createPresenceManager } from "./players/presence.js";
import { createProfileManager } from "./players/profiles.js";
import { sanitizePilotName } from "./players/profileIdentity.js";
import { waitForProfileSave } from "./players/profilePersistenceResult.js";
import { updateRankScore } from "./players/rankProgression.js";
import { createPortalInstanceManager } from "./portals/instances.js";
import { createKillQuestProgress } from "./quests/killProgress.js";
import { createGracefulShutdown } from "./lifecycle/gracefulShutdown.js";
import { installProcessErrorHandlers } from "./lifecycle/processErrorHandlers.js";
import { buildSafeHealthStatus } from "./monitoring/health.js";
import { buildAccountActionLimitWarning, buildAuthRequiredWarning, buildSocketRateLimitWarning } from "./monitoring/runtimeWarnings.js";
import { createServerErrorLog } from "./monitoring/serverErrorLog.js";
import { createAccountActionLocks } from "./security/accountActionLocks.js";
import { createGameplayAccountGuard } from "./security/gameplayAccountGuard.js";
import { pauseServerQuestTimers, resumeServerQuestTimers } from "./quests/questFailures.js";
import { createSocketRateLimiter } from "./socket/rateLimit.js";
import { createEnemyHitHandler } from "./combat/enemyHits.js";
import { updateAccountModeration } from "./storage/authStore.js";
import { registerAdminHandlers } from "./socket/adminHandlers.js";
import { registerAuthHandlers } from "./socket/authHandlers.js";
import { registerChatHandlers } from "./socket/chatHandlers.js";
import { registerCombatHandlers } from "./socket/combatHandlers.js";
import { registerDisconnectHandlers } from "./socket/disconnectHandlers.js";
import { registerEconomyHandlers } from "./socket/economyHandlers.js";
import { registerEquipmentHandlers } from "./socket/equipmentHandlers.js";
import { registerFirmHandlers } from "./socket/firmHandlers.js";
import { registerGroupHandlers } from "./socket/groupHandlers.js";
import { registerLoadTestHandlers } from "./socket/loadTestHandlers.js";
import { registerPlayerHandlers } from "./socket/playerHandlers.js";
import { registerProgressionHandlers } from "./socket/progressionHandlers.js";
import { registerQuestHandlers } from "./socket/questHandlers.js";
import { registerSocialHandlers } from "./socket/socialHandlers.js";
import { installSafeSocketHandlers } from "./socket/safeSocketHandler.js";
import { createSocialManager } from "./social/social.js";
import { startServerTick } from "./tick/serverTick.js";
import { createWorldAiManager } from "./world/ai.js";
import { createEnemyAttackManager } from "./world/enemyAttacks.js";
import { createWorldLootManager } from "./world/loot.js";
import { createPlayerActivityManager } from "./world/playerActivity.js";
import { createWorldRewardManager } from "./world/rewards.js";
import { createWorldStatusEffectManager } from "./world/statusEffects.js";
import { WORLD_MAPS } from "./world/definitions.js";
import { isPointInFriendlyWorldSafeArea, publicEnemy, publicEnemyDelta } from "./world/spawn.js";
import { createWorldStateManager } from "./world/state.js";

const PORT = config.port;
const players = new Map();
const serverErrorLog = createServerErrorLog();

function recordRuntimeSignal(entry){
  try{
    serverErrorLog.record(entry);
  }catch(error){
    logger.warn("Unable to record server runtime signal", {
      source:entry?.source || "server",
      eventName:entry?.eventName || "",
      error:error?.message || String(error)
    });
  }
}

const platformAuthHttpHandler = createPlatformAuthHttpHandler({
  allowedOrigin:config.clientOrigin,
  registerAccount,
  loginAccount,
  createSession,
  getSessionAccount,
  revokeSessionByToken,
  revokeSessionsForAccount,
  logger,
  onError:error=>serverErrorLog.record(error)
});
const platformAuthProvider = createPlatformAuthClient({
  baseUrl:config.platformAuthApiUrl
});

const httpServer = http.createServer(async (req, res)=>{
  if(await platformAuthHttpHandler(req, res)) return;
  if(req.url === "/health"){
    const health = await buildSafeHealthStatus({
      players,
      databaseEnabled:dbEnabled,
      checkDatabase:checkDatabaseConnection,
      maxConcurrentGamePlayers:config.maxConcurrentGamePlayers,
      logger,
      onError:error=>serverErrorLog.record(error)
    });
    res.writeHead(health.statusCode, {"content-type":"application/json"});
    res.end(JSON.stringify(health.body));
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
    recordRuntimeSignal(buildSocketRateLimitWarning({
      socket,
      eventName,
      count,
      limit,
      windowMs,
      players
    }));
    socket.emit("rate:limited", {eventName, limit, windowMs});
  }
});

const requireGameplayAccount = createGameplayAccountGuard({
  players,
  logger,
  onReject:({socket, eventName, at})=>recordRuntimeSignal(buildAuthRequiredWarning({
    socket,
    eventName,
    players,
    now:()=>at
  }))
});

const allowAccountAction = createAccountActionLocks({
  rules:config.accountActionLocks,
  players,
  logger,
  onLimit:({socket, eventName, accountKey, count, limit, windowMs, retryAfterMs})=>{
    recordRuntimeSignal(buildAccountActionLimitWarning({
      socket,
      eventName,
      accountKey,
      count,
      limit,
      windowMs,
      retryAfterMs,
      players
    }));
    socket.emit("account:action-limited", {eventName, retryAfterMs, at:Date.now()});
  }
});


function cleanName(value){
  return sanitizePilotName(value, "Pilote");
}

function publicAccountRole(role){
  const clean = String(role || "player").toLowerCase();
  return ["moderator", "admin", "owner"].includes(clean) ? clean : "player";
}

const profileManager = createProfileManager({
  cleanName,
  logger,
  onError:error=>serverErrorLog.record(error)
});
const firmWarManager = createFirmWarManager({logger});
const adminAuditStore = createAdminAuditStore({logger});

await initializeDatabase();
await profileManager.load();
await firmWarManager.load();
logger.info(dbEnabled ? "PostgreSQL storage enabled." : "JSON storage enabled. Set DATABASE_URL to use PostgreSQL.");

function publicPlayer(player, options = {}){
  const profile = profileManager.getProfileForPlayer(player);
  const includeState = options?.includeState !== false;
  return {
    id:player.id,
    name:player.name,
    accountId:player.accountId || null,
    role:publicAccountRole(player.account?.role),
    firmId:profile?.player?.firmId || player.account?.firmId || "astra",
    groupId:player.groupId || null,
    state:includeState ? player.state || null : null,
    connectedAt:player.connectedAt,
    connected:Boolean(player.connected !== false),
    disconnecting:Boolean(player.disconnecting),
    afk:Boolean(player.afk),
    logoutPending:Boolean(player.logoutPending)
  };
}

function isPlayerSafeOnMap(player, map){
  if(!player?.state) return false;
  const profile = profileManager.getProfileForPlayer(player);
  return isPointInFriendlyWorldSafeArea(
    {x:player.state.x, y:player.state.y},
    map,
    profile?.player?.firmId || player?.account?.firmId || "astra"
  );
}

let removeDisconnectedPlayerFromGroup = ()=>{};
let playerGroups = new Map();
const presence = createPresenceManager({
  io,
  players,
  emitPlayers,
  config,
  onPlayerRemove:player=>{
    profileManager.saveWorldSession({player, state:player.state, force:true});
    removeDisconnectedPlayerFromGroup(player.id);
  },
  getProfileForPlayer:player=>profileManager.getProfileForPlayer(player)
});

async function progressProfileQuestAction(socket, action = {}){
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
  try{
    await waitForProfileSave(result);
  }catch{
    socket.emit("quest:error", {message:"Sauvegarde temporairement indisponible. Reessaie.", at:Date.now()});
    return result;
  }
  if(result.updates?.length){
    socket.emit("quest:progress", {
      updates:result.updates,
      at:Date.now()
    });
  }
  if(result.claimedQuests?.length) emitQuestClaimsForPlayer(player, result.claimedQuests, {auto:true});
  if(result.updates?.length || result.claimedQuests?.length){
    emitProfileSyncForPlayer(player, result.profile);
  }
  emitTutorialUpdateForPlayer(player, result, {source:"quest:progress"});
  return result;
}

const {
  emitWorldEnemies,
  findWorldEnemyForPlayer,
  getWorldMapState,
  playersOnMap,
  removeWorldEnemy,
  respawnWorldEnemy,
  spawnWorldEnemyChildren,
  setPlayerMap
} = createWorldStateManager({
  io,
  players,
  presence,
  progressProfileQuestAction,
  getGroups:()=>playerGroups
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

function emitProfileSyncForPlayer(player, profile){
  if(!player || !profile) return;
  for(const accountPlayer of accountSocketsForPlayer(player)){
    const accountSocket = io.sockets.sockets.get(accountPlayer.id);
    accountSocket?.emit("profile:sync", profile);
  }
}

function emitTutorialUpdateForPlayer(player, result, extra = {}){
  if(!player || !result?.tutorialChanged || !result.profile?.tutorial) return;
  const payload = {
    tutorial:result.profile.tutorial,
    recovered:true,
    ...extra,
    at:Date.now()
  };
  for(const accountPlayer of accountSocketsForPlayer(player)){
    const accountSocket = io.sockets.sockets.get(accountPlayer.id);
    accountSocket?.emit("tutorial:updated", payload);
  }
}

function emitQuestClaimsForPlayer(player, claimedQuests = [], extra = {}){
  if(!player || !Array.isArray(claimedQuests) || !claimedQuests.length) return;
  const at = Date.now();
  for(const accountPlayer of accountSocketsForPlayer(player)){
    const accountSocket = io.sockets.sockets.get(accountPlayer.id);
    if(!accountSocket) continue;
    for(const claim of claimedQuests){
      accountSocket.emit("quest:claimed", {
        id:claim.quest?.id,
        title:claim.quest?.title,
        reward:claim.reward || {},
        ...extra,
        at
      });
    }
  }
}

function setQuestTimersConnected(player, connected, now = Date.now()){
  if(!player || player.clientMode !== "game") return null;
  if(!connected){
    const hasOtherConnectedGameSocket = accountSocketsForPlayer(player).some(candidate=>
      candidate.id !== player.id
      && candidate.clientMode === "game"
      && candidate.connected !== false
    );
    if(hasOtherConnectedGameSocket) return null;
  }
  const result = profileManager.updateProfileForPlayer({
    player,
    update:profile=>({
      ok:true,
      changed:connected ? resumeServerQuestTimers(profile, now) : pauseServerQuestTimers(profile, now)
    })
  });
  if(!result?.changed) return null;
  emitProfileSyncForPlayer(player, result.profile);
  return result.profile;
}

const {
  applyEnemyDeathEffect,
  applyEnemyOnHitEffect,
  syncPlayerStatusEffects,
  updateStatusEffects
} = createWorldStatusEffectManager({
  io,
  players,
  presence,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer
});

const {
  launchEnemyAttack,
  updatePendingEnemyAttacks
} = createEnemyAttackManager({
  io,
  players,
  presence,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  applyEnemyOnHitEffect
});

const {updateWorldEnemy} = createWorldAiManager({
  players,
  presence,
  launchEnemyAttack,
  isPlayerSafeOnMap
});

const {
  cleanupExpiredLootDrops,
  emitPrivatePortalAnchorKeyDrop,
  emitPrivateQuestItemDrop,
  emitPrivatePortalPieceDrop,
  emitPrivateResourceDrops,
  pickupLoot,
  updateLootOwner
} = createWorldLootManager({
  io,
  players,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  getGroups:()=>playerGroups
});

function emitPlayers(){
  const candidates = [...players.values()].filter(player=>Boolean(player.accountId));
  for(const recipient of candidates){
    io.to(recipient.id).emit("players:list", candidates.map(candidate=>
      publicPlayer(candidate, {includeState:canSharePlayerState(recipient, candidate)})
    ));
  }
}

const {
  acceptInvite,
  createCoopInstance,
  createGroup,
  declineInvite,
  emitGroup,
  emitInstance,
  groups,
  invitePlayer,
  kickMember,
  promoteLeader,
  leaveCurrentGroup,
  removePlayerFromGroup,
  replaceGroupMemberId,
  resetGroupInstance
} = createGroupManager({
  io,
  players,
  publicPlayer,
  publicEnemy,
  publicEnemyDelta,
  emitPlayers
});
playerGroups = groups;
removeDisconnectedPlayerFromGroup = removePlayerFromGroup;

const {
  respawnPlayer,
  syncPlayerLifecycle,
  updatePlayerLifecycles
} = createPlayerLifecycleManager({
  io,
  players,
  groups,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  presence,
  setPlayerMap,
  logger
});

const socialManager = createSocialManager({io, players, profileManager});
const adminManager = createAdminManager({
  io,
  players,
  groups,
  profileManager,
  auditStore:adminAuditStore,
  serverErrorLog,
  resetGroupInstance,
  revokeSessionsForAccount,
  updateAccountModeration,
  logger
});

const {
  attachOrResumeAccountSocket,
  publicAuthPayload,
  syncProfileForPlayer
} = createSocketSessionManager({
  io,
  players,
  profileManager,
  cleanName,
  emitPlayers,
  replaceGroupMemberId,
  resumeQuestTimers:player=>setQuestTimersConnected(player, true),
  setPlayerMap,
  syncPlayerLifecycle,
  syncPlayerStatusEffects,
  maxConcurrentGamePlayers:config.maxConcurrentGamePlayers
});

const {emitWorldReward} = createWorldRewardManager({
  io,
  players,
  groups,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  firmWarManager
});

const {progressServerQuestsForKill} = createKillQuestProgress({
  io,
  players,
  groups,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  emitQuestClaims:emitQuestClaimsForPlayer
});

const {
  activateRickyLever,
  activateRickyHealBeacon,
  buildServerPortalWave,
  emitPortalComplete,
  handlePortalEnemyDeath,
  portalWaveTotal,
  preparePortalInstance,
  startPortalInstance,
  updateRickyCompanions
} = createPortalInstanceManager({
  io,
  players,
  groups,
  profileManager,
  emitProfileSync:emitProfileSyncForPlayer,
  emitQuestClaims:emitQuestClaimsForPlayer,
  firmWarManager,
  createGroup,
  emitInstance,
  resetGroupInstance,
  setPlayerMap,
  portalWaveTotal:config.portalWaveTotal
});

const {applyEnemyHit, applyEnemyHitForPlayer} = createEnemyHitHandler({
  buildServerPortalWave,
  emitInstance,
  emitPortalComplete,
  handlePortalEnemyDeath,
  emitPrivatePortalAnchorKeyDrop,
  emitPrivatePortalPieceDrop,
  emitPrivateQuestItemDrop,
  emitPrivateResourceDrops,
  emitWorldEnemies,
  emitWorldReward,
  findWorldEnemyForPlayer,
  groups,
  io,
  players,
  presence,
  profileManager,
  firmWarManager,
  emitProfileSync:emitProfileSyncForPlayer,
  applyEnemyDeathEffect,
  progressServerQuestsForKill,
  removeWorldEnemy,
  respawnWorldEnemy,
  spawnWorldEnemyChildren,
  updateLootOwner,
  portalWaveTotal
});

const {startShipAbilityEffect, updateShipAbilityEffects} = createShipAbilityEffectManager({
  io,
  players,
  groups,
  profileManager,
  emitWorldEnemies,
  emitWorldReward,
  emitInstance,
  getWorldMapState,
  removeWorldEnemy,
  respawnWorldEnemy,
  spawnWorldEnemyChildren,
  updateLootOwner,
  emitPrivateQuestItemDrop,
  emitPrivatePortalPieceDrop,
  emitPrivatePortalAnchorKeyDrop,
  emitPrivateResourceDrops,
  applyEnemyDeathEffect,
  progressServerQuestsForKill,
  handlePortalEnemyDeath
});

const {updatePlayerActivity} = createPlayerActivityManager({
  io,
  players,
  presence,
  profileManager,
  publicPlayer,
  applyEnemyHitForPlayer
});

function applyPlayerHit(socket, payload){
  const attacker = players.get(socket.id);
  const target = players.get(String(payload?.targetPlayerId || ""));
  const emitMiss = (reason = "")=>{
    socket.emit("combat:hit", {
      enemyId:`player:${String(payload?.targetPlayerId || "")}`,
      weaponClass:String(payload?.weaponClass || ""),
      ammoId:String(payload?.ammoId || ""),
      consumed:0,
      hit:false,
      damage:0,
      mapId:String(attacker?.mapId ?? ""),
      x:Number(target?.state?.x ?? payload?.clientAimX ?? 0),
      y:Number(target?.state?.y ?? payload?.clientAimY ?? 0),
      radius:Number(target?.state?.radius ?? payload?.targetRadius ?? 48),
      reason,
      at:Date.now()
    });
  };
  if(!attacker?.state || !target?.state || !presence.isActiveForWorld(target)){
    emitMiss("Cible joueur introuvable.");
    return;
  }
  if(attacker.id === target.id){
    emitMiss("Auto-ciblage refuse.");
    return;
  }
  if(String(attacker.mapId ?? "") !== String(target.mapId ?? "")){
    emitMiss("Cible hors carte.");
    return;
  }
  if(attacker.mapRoom && target.mapRoom && attacker.mapRoom !== target.mapRoom){
    emitMiss("Cible hors instance.");
    return;
  }
  const attackerProfile = profileManager.getProfileForPlayer(attacker);
  const targetProfile = profileManager.getProfileForPlayer(target);
  const attackerLevel = Math.max(1, Math.floor(Number(attackerProfile?.player?.level || attacker.state.level || 1)));
  const targetLevel = Math.max(1, Math.floor(Number(targetProfile?.player?.level || target.state.level || 1)));
  const pvpBlockReason = getPlayerPvpBlockReason({
    sameGroup:Boolean(attacker.groupId && attacker.groupId === target.groupId),
    attackerLevel,
    targetLevel
  });
  if(pvpBlockReason){
    emitMiss(pvpBlockReason);
    return;
  }
  const map = WORLD_MAPS[String(attacker.mapId)] || null;
  if(isPlayerSafeOnMap(attacker, map) || isPlayerSafeOnMap(target, map)){
    emitMiss("Zone non-agression active.");
    return;
  }
  if(Number(attacker.state.hp || 0) <= 0 || Number(target.state.hp || 0) <= 0){
    emitMiss("Vaisseau deja detruit.");
    return;
  }

  presence.markCombat(attacker, "attaque joueur");
  presence.markCombat(target, "attaque joueur");
  const virtualTarget = {
    id:`player:${target.id}`,
    x:Number(target.state.x || 0),
    y:Number(target.state.y || 0),
    radius:Number(target.state.radius || 48)
  };
  const result = (profileManager.updateCombatProfileForPlayer || profileManager.updateProfileForPlayer)({
    player:attacker,
    update:profile=>resolveServerCombatFire({
      player:attacker,
      profile,
      enemy:virtualTarget,
      payload,
      firmDamageBonus:Math.max(0, Number(firmWarManager.getActiveBoosters(
        profile?.player?.firmId || "astra",
        profile,
        attacker,
        profileManager.profileKeyForPlayer(attacker)
      )?.damage || 0))
    })
  });
  if(!result.ok){
    emitMiss(result.reason || "Tir joueur non valide.");
    return;
  }
  const incoming = Math.max(0, Math.round(Number(result.damage || 0)));
  io.to(attacker.mapRoom || `map:${String(attacker.mapId ?? "")}`).emit("combat:hit", {
    enemyId:`player:${target.id}`,
    attackerId:attacker.id,
    targetPlayerId:target.id,
    weaponClass:result.weaponClass,
    ammoId:result.ammoId,
    consumed:result.consumed,
    ammoRemaining:result.ammoRemaining,
    hit:result.hit,
    damage:incoming,
    missileHits:result.missileHits || 0,
    missileMisses:result.missileMisses || 0,
    doubleStrike:result.doubleStrike || null,
    mapId:String(attacker.mapId ?? ""),
    fromX:Number(attacker.state.x || 0),
    fromY:Number(attacker.state.y || 0),
    x:Number(target.state.x || 0),
    y:Number(target.state.y || 0),
    radius:Number(target.state.radius || 48),
    at:Date.now()
  });
  if(incoming <= 0) return;

  const hpBefore = Math.max(0, Number(target.state.hp || 0));
  const durabilityBefore = hpBefore + Math.max(0, Number(target.state.shield || 0));
  markFirmHitOwner(target, attacker);
  presence.applyDamageToPlayerState(target, incoming);
  const hpAfter = Math.max(0, Number(target.state.hp || 0));
  const durabilityAfter = hpAfter + Math.max(0, Number(target.state.shield || 0));
  const lifeSteal = applyServerShipLifeSteal({
    player:attacker,
    profile:result.profile,
    damageDealt:durabilityBefore - durabilityAfter,
    weaponClass:result.weaponClass
  });
  if(lifeSteal.healed > 0){
    profileManager.saveWorldSession({player:attacker, state:attacker.state, force:false});
    io.to(attacker.id).emit("player:healed", {
      targetId:attacker.id,
      sourceId:lifeSteal.status?.abilityId || "absorbing_fire",
      amount:lifeSteal.healed,
      hp:Number(attacker.state.hp || 0),
      maxHp:Number(attacker.state.maxHp || 0),
      mapId:String(attacker.mapId ?? ""),
      x:Number(attacker.state.x || 0),
      y:Number(attacker.state.y || 0),
      fromX:Number(target.state.x || 0),
      fromY:Number(target.state.y || 0),
      weaponClass:String(result.weaponClass || ""),
      at:Date.now()
    });
  }
  profileManager.saveWorldSession({player:target, state:target.state, force:hpAfter <= 0});
  io.to(target.id).emit("player:damage", {
    enemyId:`player:${attacker.id}`,
    sourcePlayerId:attacker.id,
    sourceName:attackerProfile?.player?.name || attacker.name || "Pilote",
    mapId:attacker.mapId,
    amount:incoming,
    hp:Number(target.state.hp || 0),
    maxHp:Number(target.state.maxHp || 0),
    shield:Number(target.state.shield || 0),
    maxShield:Number(target.state.maxShield || 0),
    fromX:Number(attacker.state.x || 0),
    fromY:Number(attacker.state.y || 0),
    toX:Number(target.state.x || 0),
    toY:Number(target.state.y || 0),
    at:Date.now()
  });
  if(hpBefore > 0 && hpAfter <= 0){
    const firmAttacker = getFirmHitOwner(target, players) || attacker;
    delete target.firmHitOwnerKey;
    delete target.firmHitOwnerLastAt;
    const firmAttackerProfile = profileManager.getProfileForPlayer(firmAttacker);
    const firmAttackerFirm = normalizeFirmId(firmAttackerProfile?.player?.firmId || firmAttacker.account?.firmId || "astra");
    const firmKill = firmWarManager.recordPlayerKill({
      attacker:{
        key:profileManager.profileKeyForPlayer(firmAttacker),
        name:firmAttackerProfile?.player?.name || firmAttacker.name || "Pilote",
        firmId:firmAttackerFirm
      },
      targetKey:profileManager.profileKeyForPlayer(target)
    });
    emitThrottledFirmRanking({io, profileManager, snapshot:firmKill.snapshot});
    const reputation = Math.max(0, targetLevel * 1000);
    const pvpReward = profileManager.updateProfileForPlayer({
      player:attacker,
      update:profile=>{
        if(!profile.player || typeof profile.player !== "object") profile.player = {};
        profile.player.reputation = Math.max(0, Number(profile.player.reputation || 0)) + reputation;
        profile.player.totalPlayerKills = Math.max(0, Number(profile.player.totalPlayerKills || 0)) + 1;
        updateRankScore(profile);
        return {ok:true, changed:true};
      }
    });
    if(pvpReward.ok){
      emitProfileSyncForPlayer(attacker, pvpReward.profile);
      const firmSnapshot = buildPersonalFirmSeasonSnapshot({
        firmWarManager,
        profileManager,
        playerKey:profileManager.profileKeyForPlayer(firmAttacker),
        profile:firmAttackerProfile,
        player:firmAttacker
      });
      for(const accountPlayer of accountSocketsForPlayer(firmAttacker)){
        if(firmSnapshot) io.to(accountPlayer.id).emit("firm:snapshot", firmSnapshot);
      }
      const rewardEvent = {
        rewardId:`pvp:${target.id}:${attacker.id}:${Date.now()}`,
        enemyId:`player:${target.id}`,
        enemyType:"Joueur",
        enemyName:targetProfile?.player?.name || target.name || "Pilote",
        enemyLevel:targetLevel,
        mapId:String(attacker.mapId ?? ""),
        share:1,
        killerId:attacker.id,
        credits:0,
        xp:0,
        premium:0,
        reputation,
        rankPoints:0,
        firmPoints:firmAttacker.id === attacker.id ? firmKill.points : 0,
        rewardAppliedByServer:true,
        at:Date.now()
      };
      for(const accountPlayer of accountSocketsForPlayer(attacker)){
        if(accountPlayer.clientMode === "game") io.to(accountPlayer.id).emit("player:reward", rewardEvent);
      }
    }
  }
  emitPlayers();
}

function activatePlayerShipAbility(socket, abilityId = ""){
  const player = players.get(socket.id);
  if(!player?.state){
    socket.emit("ship:ability-error", {message:"Vaisseau actif introuvable.", at:Date.now()});
    return;
  }
  const result = profileManager.updateProfileForPlayer({
    player,
    update:profile=>activateServerShipAbility({player, profile, abilityId})
  });
  if(!result.ok){
    if(result.status) socket.emit("ship:ability-state", result.status);
    socket.emit("ship:ability-error", {message:result.reason || "Compétence indisponible.", at:Date.now()});
    return;
  }
  socket.emit("ship:ability-state", {...result.status, at:Date.now()});
  startShipAbilityEffect({player, status:result.status});
  emitProfileSyncForPlayer(player, result.profile);
}

function updateQuestTimers(now){
  const processedProfiles = new Set();
  for(const player of players.values()){
    if(player.clientMode !== "game" || player.connected === false) continue;
    const profileKey = player.accountId ? `account:${player.accountId}` : `guest:${player.name}`;
    if(processedProfiles.has(profileKey)) continue;
    processedProfiles.add(profileKey);
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"timer-check", now}
    });
    if(!result?.changed) continue;
    if(result.failed?.length){
      for(const accountPlayer of accountSocketsForPlayer(player)){
        const accountSocket = io.sockets.sockets.get(accountPlayer.id);
        accountSocket?.emit("quest:fail-progress", {
          updates:[],
          failed:result.failed,
          at:now
        });
      }
    }
    emitProfileSyncForPlayer(player, result.profile);
  }
}

const serverTick = startServerTick({
  cleanupExpiredLootDrops,
  emitInstance,
  emitWorldEnemies,
  getWorldMapState,
  groups,
  players,
  playersOnMap,
  presence,
  updatePlayerActivity,
  updatePendingEnemyAttacks,
  updatePlayerLifecycles,
  updateStatusEffects,
  updateQuestTimers,
  updateRickyCompanions,
  updateShipAbilityEffects,
  updateWorldEnemy,
  logger,
  onError:error=>serverErrorLog.record(error)
});

io.on("connection", socket=>{
  installSafeSocketHandlers(socket, {
    logger,
    getPlayer:currentSocket=>players.get(currentSocket.id),
    onError:error=>serverErrorLog.record(error)
  });

  function guard(eventName){
    if(!allowSocketEvent(socket, eventName)) return false;
    if(!requireGameplayAccount(socket, eventName)) return false;
    return allowAccountAction(socket, eventName);
  }

  players.set(socket.id, presence.createPlayer(socket.id));

  socket.emit("server:ready", {id:socket.id, port:PORT});
  emitPlayers();

  const socketContext = {
    guard,
    players,
    profileManager,
    emitProfileSync:emitProfileSyncForPlayer,
    emitTutorialUpdate:emitTutorialUpdateForPlayer,
    emitQuestClaims:emitQuestClaimsForPlayer,
    progressProfileQuestAction
  };
  registerAdminHandlers(socket, {
    ...socketContext,
    adminManager
  });
  registerAuthHandlers(socket, {
    ...socketContext,
    attachOrResumeAccountSocket,
    emitPlayers,
    authProvider:platformAuthProvider,
    logger,
    onError:error=>serverErrorLog.record(error),
    publicAuthPayload,
    syncProfileForPlayer
  });
  registerPlayerHandlers(socket, {
    ...socketContext,
    firmWarManager,
    buildFirmSpawnSession,
    cleanName,
    emitPlayers,
    groups,
    io,
    logger,
    presence,
    publicPlayer,
    replaceGroupMemberId,
    respawnPlayer,
    resumeQuestTimers:player=>setQuestTimersConnected(player, true),
    syncPlayerLifecycle,
    syncPlayerStatusEffects,
    maxConcurrentGamePlayers:config.maxConcurrentGamePlayers,
    setPlayerMap,
    syncProfileForPlayer
  });
  registerLoadTestHandlers(socket, {
    ...socketContext,
    emitPlayers,
    setPlayerMap
  });
  registerQuestHandlers(socket, socketContext);
  registerChatHandlers(socket, {
    ...socketContext,
    io
  });
  registerProgressionHandlers(socket, socketContext);
  registerSocialHandlers(socket, {
    ...socketContext,
    socialManager
  });
  registerFirmHandlers(socket, {
    ...socketContext,
    firmWarManager
  });
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
    declineInvite,
    emitPlayers,
    invitePlayer,
    kickMember,
    leaveCurrentGroup,
    promoteLeader,
    preparePortalInstance,
    startPortalInstance,
    activateRickyLever,
    activateRickyHealBeacon
  });
  registerCombatHandlers(socket, {
    ...socketContext,
    applyEnemyHit,
    applyPlayerHit,
    activateShipAbility:abilityId=>activatePlayerShipAbility(socket, abilityId),
    pickupLoot
  });
  registerDisconnectHandlers(socket, {
    ...socketContext,
    leaveCurrentGroup,
    pauseQuestTimers:player=>setQuestTimersConnected(player, false),
    presence,
    releaseSocketRateLimits:allowSocketEvent.releaseSocket
  });
});

httpServer.listen(PORT, ()=>{
  logger.info(`VoidSector realtime server listening on :${PORT}`);
});

const shutdown = createGracefulShutdown({
  io,
  tickHandle:serverTick,
  players,
  profileManager,
  closeDatabase,
  logger
});

installProcessErrorHandlers({
  logger,
  onError:error=>serverErrorLog.record(error),
  shutdown
});

for(const signal of ["SIGINT", "SIGTERM"]){
  process.once(signal, ()=>{
    shutdown(signal).catch(error=>{
      logger.error("Graceful shutdown failed.", {
        signal,
        error:error?.message || String(error)
      });
      process.exitCode = 1;
    });
  });
}
