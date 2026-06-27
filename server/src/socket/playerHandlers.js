import { validatePlayerState } from "../players/playerStateValidation.js";
import { buildGlobalLeaderboardSnapshotFromManager } from "../players/leaderboard.js";
import { consumeInventoryItemAmount } from "../economy/inventoryStacks.js";
import { checkGameCapacity, publicGameCapacity } from "../players/playerCapacity.js";
import { applyTutorialAction } from "../players/tutorialActions.js";
import {
  PORTGUN_FLUID_ITEM_ID,
  cancelPendingPortgunTeleport,
  getRandomPortgunDestination,
  hasPortgunTeleportMoved,
  validatePortgunTeleport
} from "../players/portgunTeleport.js";

const LEADERBOARD_BROADCAST_INTERVAL_MS = 15 * 60 * 1000;
let lastLeaderboardBroadcastAt = 0;

export function registerPlayerHandlers(socket, context){
  const {
    cleanName,
    buildFirmSpawnSession,
    emitProfileSync,
    emitPlayers,
    groups,
    guard,
    io,
    logger,
    players,
    presence,
    profileManager,
    firmWarManager,
    publicPlayer,
    replaceGroupMemberId,
    respawnPlayer,
    resumeQuestTimers,
    setPlayerMap,
    syncPlayerLifecycle,
    syncPlayerStatusEffects,
    syncProfileForPlayer,
    maxConcurrentGamePlayers = 0
  } = context;

  function cleanClientId(value){
    return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80);
  }

  function isLocalDebugSocket(){
    if(String(process.env.NODE_ENV || "").toLowerCase() === "production") return false;
    const address = String(socket.handshake?.address || socket.conn?.remoteAddress || "");
    return address === "::1" || address === "127.0.0.1" || address.endsWith(":127.0.0.1");
  }

  function getCurrentProfileKey(){
    const player = players.get(socket.id);
    return profileManager.profileKeyForPlayer?.(player) || "";
  }

  function emitLeaderboard(target = socket, currentKey = getCurrentProfileKey()){
    target?.emit?.("leaderboard:ranking", buildGlobalLeaderboardSnapshotFromManager(profileManager, {currentKey}));
  }

  function broadcastLeaderboard(){
    const now = Date.now();
    if(lastLeaderboardBroadcastAt && now - lastLeaderboardBroadcastAt < LEADERBOARD_BROADCAST_INTERVAL_MS) return;
    lastLeaderboardBroadcastAt = now;
    io?.emit?.("leaderboard:ranking", buildGlobalLeaderboardSnapshotFromManager(profileManager));
  }

  function emitPortgunError(message, extra = {}){
    socket.emit("portgun:error", {message, ...extra, at:Date.now()});
  }

  function cancelPendingPortgun(player, reason = "cancelled", message = "Teleportation annulee."){
    return cancelPendingPortgunTeleport(player, {io, reason, message});
  }

  function completePendingPortgun(playerId, teleportId){
    const player = players.get(playerId);
    if(!player?.pendingPortgunTeleport || player.pendingPortgunTeleport.id !== teleportId) return;
    const pending = player.pendingPortgunTeleport;
    const targetSocket = io?.sockets?.sockets?.get(player.id);
    if(!targetSocket){
      player.pendingPortgunTeleport = null;
      return;
    }
    if(!player.state || Number(player.state.hp ?? 1) <= 0 || player.state.isDead){
      cancelPendingPortgun(player, "dead", "Teleportation annulee : vaisseau detruit.");
      return;
    }
    if(hasPortgunTeleportMoved(pending, player.state)){
      cancelPendingPortgun(player, "moved", "Teleportation annulee : ton vaisseau a bouge.");
      return;
    }

    let validation = null;
    const profileResult = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        validation = validatePortgunTeleport({
          player,
          profile,
          targetMapId:pending.targetMapId,
          now:Date.now(),
          allowPending:true
        });
        if(!validation.ok) return validation;
        if(!consumeInventoryItemAmount(profile, PORTGUN_FLUID_ITEM_ID, 1)){
          return {ok:false, reason:"Il faut 1 fluide de teleportation."};
        }
        return {ok:true};
      }
    });
    if(!profileResult.ok || !validation?.ok){
      cancelPendingPortgun(player, "invalid", profileResult.reason || validation?.reason || "Teleportation refusee.");
      return;
    }

    const destination = getRandomPortgunDestination(validation.map);
    const now = Date.now();
    player.pendingPortgunTeleport = null;
    player.state = {
      ...player.state,
      mapId:String(validation.map.id),
      x:destination.x,
      y:destination.y,
      vx:0,
      vy:0,
      enginePower:0,
      moveTarget:null,
      updatedAt:now,
      source:"portgun"
    };
    player.mapId = String(validation.map.id);
    setPlayerMap(targetSocket, player.state.mapId);
    const savedProfile = profileManager.saveWorldSession({player, state:player.state, force:true}) || profileResult.profile;
    emitProfileSync?.(player, savedProfile);
    targetSocket.emit("portgun:complete", {
      targetMapId:String(validation.map.id),
      targetMapName:validation.map.displayName || validation.map.name,
      consumedItemId:PORTGUN_FLUID_ITEM_ID,
      session:{...player.state},
      message:`Teleportation vers ${validation.map.displayName || validation.map.name} effectuee.`,
      at:now
    });
    emitPlayers();
  }

  function takeoverGuestSocket(player, clientId){
    if(!player || player.accountId || !clientId) return player;
    const existing = [...players.values()].find(candidate=>
      candidate.id !== player.id
      && !candidate.accountId
      && candidate.clientId === clientId
    );
    if(!existing) return player;
    const existingSocket = context.io?.sockets?.sockets?.get(existing.id);
    const nextPlayer = {
      ...existing,
      id:player.id,
      name:player.name,
      clientId,
      clientMode:player.clientMode,
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
    players.set(player.id, nextPlayer);
    if(nextPlayer.groupId) socket.join(nextPlayer.groupId);
    replaceGroupMemberId?.(existing.id, player.id);
    existingSocket?.disconnect(true);
    if(nextPlayer.mapId) setPlayerMap(socket, nextPlayer.mapId);
    return nextPlayer;
  }

  socket.on("player:hello", payload=>{
    if(!guard("player:hello")) return;
    let player = players.get(socket.id);
    if(!player) return;
    const requestedClientMode = payload?.clientMode === "game" ? "game" : "launcher";
    if(requestedClientMode === "game" && player.accountId){
      const capacity = checkGameCapacity({
        players,
        accountId:player.accountId,
        socketId:player.id,
        maxConcurrentGamePlayers
      });
      if(!capacity.ok){
        player.clientMode = "launcher";
        socket.emit("server:full", publicGameCapacity(capacity));
        socket.emit("auth:error", {message:capacity.message});
        emitLeaderboard();
        emitPlayers();
        return;
      }
    }
    player.clientMode = requestedClientMode;
    player.clientId = cleanClientId(payload?.clientId);
    if(!player.accountId) player.name = cleanName(payload?.name);
    player = takeoverGuestSocket(player, player.clientId);
    if(player.clientMode === "game") presence.markActivity?.(player, "connexion", Date.now());
    const waitingForAuthProfile = Boolean(payload?.hasAuthToken && !player.accountId);
    if(!player.accountId){
      if(player.clientMode === "game" && !waitingForAuthProfile){
        socket.emit("auth:required", {
          eventName:"player:hello",
          message:"Connecte un compte MMO avant d'entrer en jeu.",
          at:Date.now()
        });
      }
      emitLeaderboard();
      return;
    }
    syncProfileForPlayer(socket);
    if(player.clientMode === "game"){
      resumeQuestTimers?.(player);
      syncPlayerStatusEffects?.(player);
      syncPlayerLifecycle?.(player);
    }
    emitLeaderboard();
    emitPlayers();
  });

  socket.on("leaderboard:sync", ()=>{
    if(!guard("leaderboard:sync")) return;
    emitLeaderboard();
  });

  socket.on("profile:save", payload=>{
    if(!guard("profile:save")) return;
    const player = players.get(socket.id);
    const saveResult = profileManager.saveFromPayload({player, payload});
    const incoming = saveResult?.profile || saveResult;
    if(incoming){
      if(saveResult?.claimedQuests?.length){
        for(const claim of saveResult.claimedQuests){
          socket.emit("quest:claimed", {
            id:claim.quest?.id,
            title:claim.quest?.title,
            reward:claim.reward || {},
            auto:true,
            at:Date.now()
          });
        }
      }
      socket.emit("profile:saved", {updatedAt:incoming.updatedAt});
      emitProfileSync?.(player, incoming);
      broadcastLeaderboard();
    }
  });

  socket.on("profile:setup", async payload=>{
    if(!guard("profile:setup")) return;
    const player = players.get(socket.id);
    if(!player?.accountId){
      socket.emit("profile:setup-error", {message:"Connecte ton compte avant de choisir ta firme."});
      return;
    }
    let result = null;
    try{
      result = await profileManager.setupProfileForPlayer({
        player,
        name:payload?.name,
        firmId:payload?.firmId
      });
    }catch(error){
      logger?.warn?.("Profile setup failed", {
        playerId:player.id,
        accountId:player.accountId,
        error:error?.message || String(error)
      });
      socket.emit("profile:setup-error", {message:"Configuration du profil temporairement indisponible."});
      return;
    }
    if(!result.ok){
      socket.emit("profile:setup-error", {message:result.reason || "Configuration du profil impossible."});
      return;
    }
    if(result.firmChanged){
      const accountPlayers = [...players.values()].filter(candidate=>candidate.accountId === player.accountId);
      let syncedProfile = result.profile;
      for(const accountPlayer of accountPlayers){
        accountPlayer.account = accountPlayer.account ? {...accountPlayer.account, firmId:result.firm?.id} : accountPlayer.account;
        accountPlayer.mapId = String(result.firm?.baseMapId ?? "0");
        if(accountPlayer.clientMode !== "game") continue;
        const spawnSession = {
          ...buildFirmSpawnSession({
            shipId:result.profile?.activeShip,
            firmId:result.firm?.id,
            state:accountPlayer.state
          }),
          source:"firm-change"
        };
        accountPlayer.state = {...spawnSession};
        accountPlayer.mapId = spawnSession.mapId;
        const accountSocket = context.io?.sockets?.sockets?.get(accountPlayer.id);
        if(accountSocket){
          setPlayerMap(accountSocket, spawnSession.mapId);
          accountSocket.emit("player:resume", spawnSession);
        }
        syncedProfile = profileManager.saveWorldSession({
          player:accountPlayer,
          state:accountPlayer.state,
          force:true
        }) || syncedProfile;
      }
      result.profile = syncedProfile;
    }
    socket.emit("profile:setup-complete", {
      name:result.profile?.player?.name,
      firmId:result.profile?.player?.firmId,
      firmLabel:result.firm?.label,
      homeMap:result.firm?.homeMapName,
      at:Date.now()
    });
    emitProfileSync?.(player, result.profile);
    broadcastLeaderboard();
    emitPlayers();
  });

  socket.on("tutorial:update", payload=>{
    if(!guard("tutorial:update")) return;
    const player = players.get(socket.id);
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>applyTutorialAction(profile, {
        kind:payload?.kind,
        currentStep:payload?.currentStep
      })
    });
    if(!result?.ok){
      socket.emit("tutorial:error", {message:result?.reason || "Mise a jour du tutoriel impossible."});
      if(result?.changed && result?.profile) emitProfileSync?.(player, result.profile);
      return;
    }
    socket.emit("tutorial:updated", {
      tutorial:result.profile?.tutorial,
      rewardItemId:result.rewardItemId || null,
      at:Date.now()
    });
    emitProfileSync?.(player, result.profile);
  });

  socket.on("profile:debug-reset-firm", ()=>{
    if(!guard("profile:debug-reset-firm")) return;
    const player = players.get(socket.id);
    if(!isLocalDebugSocket()){
      socket.emit("profile:setup-error", {message:"Commande debug firme refusee hors serveur local."});
      return;
    }
    if(!player?.accountId){
      socket.emit("profile:setup-error", {message:"Connecte un compte avant de reinitialiser la firme."});
      return;
    }
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        profile.player = {...profile.player, firmSelected:false};
        profile.worldSession = null;
        profile.shipWorldSessions = {};
        return {ok:true};
      }
    });
    if(!result.ok){
      socket.emit("profile:setup-error", {message:result.reason || "Reinitialisation firme impossible."});
      return;
    }
    player.state = null;
    socket.emit("profile:debug-firm-reset", {firmId:result.profile?.player?.firmId, at:Date.now()});
    emitProfileSync?.(player, result.profile);
    broadcastLeaderboard();
  });

  socket.on("player:state", payload=>{
    if(!guard("player:state")) return;
    const player = players.get(socket.id);
    if(!player) return;
    player.connected = true;
    player.disconnecting = false;
    player.removeAt = 0;
    if(player.shipSwitchLockUntil && Date.now() < Number(player.shipSwitchLockUntil || 0)){
      return;
    }
    player.shipSwitchLockUntil = 0;
    const now = Date.now();
    const previousState = player.state || null;
    const backgroundSnapshot = payload?.pageHidden === true && previousState;
    const validationPayload = backgroundSnapshot
      ? {
          ...payload,
          x:previousState.x,
          y:previousState.y,
          hp:previousState.hp,
          maxHp:previousState.maxHp,
          shield:previousState.shield,
          maxShield:previousState.maxShield,
          mapId:previousState.mapId,
          moveTarget:previousState.moveTarget || payload?.moveTarget || null,
          attackTargetId:previousState.attackTargetId || payload?.attackTargetId || "",
          attackAmmoId:previousState.attackAmmoId || payload?.attackAmmoId || "",
          attackWeaponClass:previousState.attackWeaponClass || payload?.attackWeaponClass || "",
          repairBotActive:payload?.repairBotActive ?? previousState.repairBotActive ?? false
        }
      : payload;
    if(backgroundSnapshot){
      if(!Number.isFinite(Number(player.lastClientStateAt))) player.lastClientStateAt = Number(previousState.updatedAt || now);
    }else{
      player.lastClientStateAt = now;
    }
    const profile = profileManager.getProfileForPlayer(player);
    const validation = validatePlayerState({
      player,
      payload:validationPayload,
      profile,
      groups,
      firmBoosters:firmWarManager?.getActiveBoosters?.(
        profile?.player?.firmId || player.account?.firmId || "astra",
        profile,
        player,
        profileManager.profileKeyForPlayer?.(player) || ""
      ) || {},
      now
    });
    player.state = validation.state;
    const moved = !previousState
      || Math.hypot(
        Number(validation.state.x || 0) - Number(previousState.x || 0),
        Number(validation.state.y || 0) - Number(previousState.y || 0)
      ) >= 1
      || Math.hypot(Number(validation.state.vx || 0), Number(validation.state.vy || 0)) > 1;
    if(!backgroundSnapshot && moved) presence.markActivity?.(player, "deplacement", now);
    if(player.pendingPortgunTeleport && hasPortgunTeleportMoved(player.pendingPortgunTeleport, player.state)){
      cancelPendingPortgun(player, "moved", "Teleportation annulee : ton vaisseau a bouge.");
    }
    const nextMapId = validation.state.mapId;
    const mapChanged = previousState
      ? String(validation.state.mapId ?? "") !== String(previousState.mapId ?? "")
      : String(validation.state.mapId ?? "") !== String(player.mapId ?? "");
    if(validation.corrected){
      logger?.warn?.("Player state corrected", {
        playerId:player.id,
        accountId:player.accountId || null,
        reason:validation.reason,
        details:validation.correctionDetails || []
      });
      socket.emit("player:state-correction", {...validation.state, source:"state-correction"});
    }
    profileManager.saveWorldSession({player, state:player.state, force:mapChanged});
    presence.syncMovementLogoutState(player);
    setPlayerMap(socket, nextMapId);
    const visibilityRooms = [...new Set([player.mapRoom, player.groupId].filter(Boolean))];
    if(visibilityRooms.length) socket.to(visibilityRooms).emit("player:state", publicPlayer(player));
  });

  socket.on("player:activity", payload=>{
    if(!guard("player:activity")) return;
    const player = players.get(socket.id);
    if(!player || player.clientMode !== "game") return;
    presence.markActivity?.(player, String(payload?.kind || "action"), Date.now());
  });

  socket.on("portgun:teleport", payload=>{
    if(!guard("portgun:teleport")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const now = Date.now();
    const profile = profileManager.getProfileForPlayer(player);
    const validation = validatePortgunTeleport({
      player,
      profile,
      targetMapId:payload?.mapId,
      now
    });
    if(!validation.ok){
      emitPortgunError(validation.reason || "Teleportation impossible.", {
        requirement:validation.requirement,
        level:validation.level
      });
      return;
    }
    const teleportId = `portgun_${now}_${Math.random().toString(36).slice(2, 8)}`;
    player.pendingPortgunTeleport = {
      id:teleportId,
      targetMapId:String(validation.map.id),
      startMapId:String(player.state.mapId || player.mapId || "0"),
      startX:Number(player.state.x || 0),
      startY:Number(player.state.y || 0),
      startedAt:now,
      completeAt:now + validation.durationMs
    };
    socket.emit("portgun:started", {
      id:teleportId,
      targetMapId:String(validation.map.id),
      targetMapName:validation.map.displayName || validation.map.name,
      durationMs:validation.durationMs,
      completeAt:player.pendingPortgunTeleport.completeAt,
      at:now
    });
    setTimeout(()=>completePendingPortgun(socket.id, teleportId), validation.durationMs);
  });

  socket.on("player:laser", payload=>{
    if(!guard("player:laser")) return;
    const player = players.get(socket.id);
    presence.markCombat(player, "tir joueur");
    const kind = ["laser", "rocket", "missile"].includes(payload?.kind) ? payload.kind : "laser";
    const starts = (Array.isArray(payload?.starts) ? payload.starts : [{
      x:payload?.fromX,
      y:payload?.fromY,
      curveSide:payload?.curveSide,
      curveStrength:payload?.curveStrength
    }]).slice(0, 12).map(start=>({
      x:Number(start?.x || 0),
      y:Number(start?.y || 0),
      curveSide:Math.max(-1, Math.min(1, Number(start?.curveSide || 0))),
      curveStrength:Math.max(0, Math.min(160, Number(start?.curveStrength || 0)))
    }));
    socket.to(player?.mapRoom || `map:${String(player?.mapId ?? "0")}`).emit("player:laser", {
      sourceId:socket.id,
      kind,
      ammoId:String(payload?.ammoId || "ammo_x1").slice(0, 40),
      targetId:String(payload?.targetId || "").slice(0, 100),
      starts,
      fromX:Number(starts[0]?.x || payload?.fromX || 0),
      fromY:Number(starts[0]?.y || payload?.fromY || 0),
      toX:Number(payload?.toX || 0),
      toY:Number(payload?.toY || 0),
      blueLaser:payload?.blueLaser === true,
      travelTime:Math.max(.1, Math.min(2, Number(payload?.travelTime || .2))),
      mapId:String(player?.mapId ?? payload?.mapId ?? "0"),
      color:String(payload?.color || "rgba(56,189,248,.9)").slice(0, 48),
      life:Math.max(0.05, Math.min(0.35, Number(payload?.life || 0.16))),
      createdAt:Date.now()
    });
  });

  socket.on("session:logout-request", ()=>{
    if(!guard("session:logout-request")) return;
    presence.startLogout(socket);
  });

  socket.on("player:respawn", payload=>{
    if(!guard("player:respawn")) return;
    respawnPlayer?.(socket, payload?.choice);
  });
}
