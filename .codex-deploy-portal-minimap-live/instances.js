import { applyProgressionReward, getProgressionLevelCap } from "../players/progression.js";
import { applyServerReputationFromXp, updateRankScore } from "../players/rankProgression.js";
import { buildPersonalFirmSeasonSnapshot, emitThrottledFirmRanking } from "../firms/firmBroadcasts.js";
import { consumeInventoryItemAmount, getInventoryItemCount } from "../economy/inventoryStacks.js";
import { PORTAL_CONFIGS } from "../world/definitions.js";
import { normalizeFirmId } from "../../../src/data/firms.js";
import { RICKY_PORTAL_MAP } from "../../../src/data/rickyPortal.js";
import { buildServerPortalWave as buildPortalWave } from "./portalWaves.js";
import {
  AZURON_TOTAL_WAVES,
  buildAzuronPortalWave,
  createAzuronWaveRuntime,
  grantAzuronLaserReward
} from "./azuronPortal.js";
import {
  AZURON_PORTAL_ID,
  getPortalContentLock,
  getServerPortalDefinition,
  VESPER_PORTAL_ID
} from "./portalDefinitions.js";
import { grantPortalBonusReward } from "./portalRewards.js";
import {
  getPreparedPortalPlacement,
  isPlayerAtPreparedPortal,
  PREPARED_PORTAL_INTERACTION_RADIUS,
  PREPARED_PORTAL_RADIUS,
  PREPARED_PORTAL_SAFE_RADIUS,
  publicPreparedPortal
} from "./portalPreparation.js";
import {
  createRickyAlly,
  createRickyObjective,
  getRickyPortalQuestId,
  isRickyPortalInstance,
  RICKY_MAX_GROUP_MEMBERS,
  RICKY_PORTAL_DEFINITION,
  RICKY_PORTAL_ID,
  RICKY_PORTAL_KEY_ITEM_ID,
  RICKY_PORTAL_KEY_REQUIRED_MESSAGE
} from "./rickyPortalState.js";
import { createRickyPortalRuntime } from "./rickyPortalRuntime.js";
import {
  createVesperPortalState,
  isVesperPortalInstance,
  publicVesperAllies,
  publicVesperObjective
} from "./vesperPortalState.js";
import { createVesperPortalRuntime } from "./vesperPortalRuntime.js";
import {
  buildKharonPortalWave,
  createKharonObjective,
  createKharonPortalRuntime,
  KHARON_PORTAL_ID,
  KHARON_PORTAL_MAP,
  KHARON_TOTAL_WAVES,
  publicKharonObjective
} from "./kharonPortal.js";

function getPortalDefinition(portalId){
  const id = String(portalId ?? "").trim();
  if(!id) return null;
  if(id === RICKY_PORTAL_ID) return RICKY_PORTAL_DEFINITION;
  return getServerPortalDefinition(id);
}

export function createPortalInstanceManager({
  io,
  players,
  groups,
  profileManager,
  presence,
  emitProfileSync,
  emitQuestClaims,
  createGroup,
  emitInstance,
  resetGroupInstance,
  firmWarManager,
  setPlayerMap,
  portalWaveTotal,
  random = Math.random,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = ()=>Date.now()
}){
  let instanceSeq = 1;

  function buildServerPortalWave(wave, portalId = ""){
    if(String(portalId) === AZURON_PORTAL_ID) return buildAzuronPortalWave(wave, now());
    if(String(portalId) === KHARON_PORTAL_ID) return buildKharonPortalWave(wave, now());
    return buildPortalWave(wave, portalWaveTotal);
  }

  function getPortalTotalWaves(portal){
    if(String(portal?.id || "") === AZURON_PORTAL_ID) return AZURON_TOTAL_WAVES;
    if(String(portal?.id || "") === VESPER_PORTAL_ID) return 0;
    if(String(portal?.id || "") === KHARON_PORTAL_ID) return KHARON_TOTAL_WAVES;
    return Math.max(1, Number(portal?.totalWaves || portalWaveTotal || 1));
  }

  function getInstanceMapId(instance){
    return `portal-${instance?.portal?.id || "blue"}`;
  }

  function getJoinedMemberIds(instance){
    if(!Array.isArray(instance.joinedMemberIds)) instance.joinedMemberIds = Object.keys(instance.playerLives || {});
    return instance.joinedMemberIds;
  }

  const rickyRuntime = createRickyPortalRuntime({
    io,
    players,
    groups,
    profileManager,
    firmWarManager,
    emitProfileSync,
    emitInstance,
    setPlayerMap,
    resetGroupInstance,
    emitPortalComplete,
    getInstanceMapId,
    getJoinedMemberIds
  });
  const azuronRuntime = createAzuronWaveRuntime({
    emitInstance,
    emitPortalComplete,
    setTimeoutFn,
    clearTimeoutFn,
    now
  });
  const vesperRuntime = createVesperPortalRuntime({
    io,
    players,
    groups,
    emitInstance,
    emitPortalComplete,
    random
  });
  const kharonRuntime = createKharonPortalRuntime({
    io,
    players,
    groups,
    profileManager,
    presence,
    emitProfileSync,
    emitInstance,
    emitPortalComplete,
    setTimeoutFn,
    clearTimeoutFn,
    now,
    random
  });

  function validateRickyAccess(profile, portalDefinition){
    const questId = getRickyPortalQuestId(profile);
    if(!questId || !profile?.completedQuestClaims?.[questId]){
      return {ok:false, reason:"Ricky n'a pas encore stabilise ce portail."};
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      return {ok:false, reason:`Niveau ${portalDefinition.requirement.level} requis.`};
    }
    if(getInventoryItemCount(profile, RICKY_PORTAL_KEY_ITEM_ID) < 1){
      return {ok:false, reason:RICKY_PORTAL_KEY_REQUIRED_MESSAGE};
    }
    return {ok:true};
  }

  function consumeRickyPortalKey(player, profile, portalDefinition){
    const access = validateRickyAccess(profile, portalDefinition);
    if(!access.ok) return access;
    const keyResult = profileManager.updateProfileForPlayer({
      player,
      update:draft=>{
        const draftAccess = validateRickyAccess(draft, portalDefinition);
        if(!draftAccess.ok) return draftAccess;
        if(!consumeInventoryItemAmount(draft, RICKY_PORTAL_KEY_ITEM_ID, 1)){
          return {ok:false, reason:RICKY_PORTAL_KEY_REQUIRED_MESSAGE};
        }
        return {ok:true};
      }
    });
    if(!keyResult.ok) return keyResult;
    emitProfileSync?.(player, keyResult.profile);
    return {ok:true, profile:keyResult.profile || profile};
  }

  function emitPortalStart(socket, group){
    const instance = group?.instance;
    if(!instance) return;
    socket.emit("portal:started", {
      instanceId:instance.id,
      portal:instance.portal,
      spawn:instance.spawn,
      wave:instance.wave,
      waveTotal:Number(instance.portal?.totalWaves || 0),
      nextWaveAt:Number(instance.nextWaveAt || 0),
      nextWaveDelayMs:Math.max(0, Number(instance.nextWaveAt || 0) - Number(now())),
      waveState:String(instance.waveState || ""),
      playerLives:{...(instance.playerLives || {})},
      allies:publicVesperAllies(instance),
      objective:publicVesperObjective(instance) || publicKharonObjective(instance, now()) || instance.objective || null
    });
  }

  function getPortalOwnerAccountId(player){
    return String(player?.accountId || player?.account?.id || "");
  }

  function isSamePortalOwner(left, right){
    if(!left || !right) return false;
    const leftAccountId = getPortalOwnerAccountId(left);
    const rightAccountId = getPortalOwnerAccountId(right);
    if(leftAccountId && rightAccountId) return leftAccountId === rightAccountId;
    return String(left.id || "") === String(right.id || "");
  }

  function getPreparedPortalOwner(player){
    if(!player) return null;
    for(const candidate of players.values()){
      if(!isSamePortalOwner(player, candidate) || !candidate.preparedPortal) continue;
      return candidate;
    }
    return player.preparedPortal ? player : null;
  }

  function instanceBelongsToPlayer(instance, player){
    if(!instance || instance.type !== "portal" || !player) return false;
    const accountId = getPortalOwnerAccountId(player);
    if(accountId && String(instance.ownerAccountId || "") === accountId) return true;
    if(String(instance.ownerPlayerId || "") === String(player.id || "")) return true;
    const ownerIds = new Set(
      [...players.values()]
        .filter(candidate=>isSamePortalOwner(player, candidate))
        .map(candidate=>String(candidate.id || ""))
    );
    return (Array.isArray(instance.joinedMemberIds) ? instance.joinedMemberIds : [])
      .some(memberId=>ownerIds.has(String(memberId || "")));
  }

  function findActivePortalForPlayer(player){
    for(const group of groups.values()){
      const instance = group?.instance;
      if(instance?.type !== "portal" || instance.completed) continue;
      if(instanceBelongsToPlayer(instance, player)) return {group, instance};
    }
    return null;
  }

  function emitToPortalOwner(player, event, payload){
    if(!player) return;
    const emittedIds = new Set();
    for(const candidate of players.values()){
      if(!isSamePortalOwner(player, candidate)) continue;
      const candidateId = String(candidate.id || "");
      if(!candidateId || emittedIds.has(candidateId)) continue;
      emittedIds.add(candidateId);
      io.to(candidateId).emit(event, payload);
    }
    if(!emittedIds.has(String(player.id || ""))){
      io.to(player.id).emit(event, payload);
    }
  }

  function emitPreparedPortal(player, preparedPortal = player?.preparedPortal || null){
    if(!player?.id) return null;
    const payload = {
      preparedPortal:publicPreparedPortal(preparedPortal),
      at:Date.now()
    };
    emitToPortalOwner(player, "portal:prepared", payload);
    return payload;
  }

  function clearPreparedPortal(player, reason = "cleared"){
    const preparedOwner = getPreparedPortalOwner(player);
    if(!preparedOwner?.preparedPortal) return;
    preparedOwner.preparedPortal = null;
    emitToPortalOwner(player, "portal:prepared", {
      preparedPortal:null,
      cleared:true,
      reason,
      at:Date.now()
    });
  }

  function validatePortalDefinitionForPlayer({socket, player, profile, portalDefinition, requireUnlocked = true} = {}){
    if(!portalDefinition){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return false;
    }
    if(requireUnlocked && !profile?.unlockedPortals?.includes(portalDefinition.id)){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return false;
    }
    if(Number(profile?.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
      return false;
    }
    if(player?.deathState || Number(player?.state?.hp || 0) <= 0) return false;
    return true;
  }

  function rejectPendingPortalContent(socket, portalDefinition){
    const lock = getPortalContentLock(portalDefinition?.id);
    if(!lock) return false;
    socket.emit("portal:error", lock);
    return true;
  }

  function getSocketById(playerId){
    return io?.sockets?.sockets?.get?.(String(playerId || "")) || null;
  }

  function findLiveGameSessionForAccount(player){
    const accountId = String(player?.accountId || "");
    if(!accountId) return null;
    for(const candidate of players.values()){
      if(candidate.id === player.id) continue;
      if(String(candidate.accountId || "") !== accountId) continue;
      if(candidate.connected === false || candidate.clientMode !== "game" || !candidate.state) continue;
      const candidateSocket = getSocketById(candidate.id);
      if(candidateSocket) return {player:candidate, socket:candidateSocket};
    }
    return null;
  }

  function resolvePortalPreparationSession(socket){
    const originPlayer = players.get(socket.id);
    if(!originPlayer) return null;
    if(originPlayer.clientMode === "game" && originPlayer.state){
      return {originPlayer, player:originPlayer, socket, redirected:false};
    }
    const liveGameSession = findLiveGameSessionForAccount(originPlayer);
    if(liveGameSession){
      return {
        originPlayer,
        player:liveGameSession.player,
        socket:liveGameSession.socket,
        redirected:true
      };
    }
    return {originPlayer, player:originPlayer, socket, redirected:false};
  }

  function createReplySocket(originSocket, targetSocket){
    if(!targetSocket || targetSocket.id === originSocket.id) return originSocket;
    return {
      id:targetSocket.id,
      emit(event, payload){
        originSocket.emit(event, payload);
        targetSocket.emit(event, payload);
      }
    };
  }

  function preparePortalInstance(socket, portalId){
    const session = resolvePortalPreparationSession(socket);
    const player = session?.player || null;
    const targetSocket = session?.socket || socket;
    const replySocket = createReplySocket(socket, targetSocket);
    if(!player) return;
    if(!player.state){
      socket.emit("portal:error", {message:"Entre en jeu avec ton vaisseau avant de preparer un portail."});
      return;
    }
    if(player.deathState || Number(player.state?.hp || 0) <= 0){
      socket.emit("portal:error", {message:"Vaisseau detruit : impossible de preparer un portail."});
      return;
    }
    if(findActivePortalForPlayer(player)){
      replySocket.emit("portal:error", {
        code:"PORTAL_ALREADY_ACTIVE",
        message:"Un portail est deja actif pour ce compte. Termine-le avant d'en invoquer un autre."
      });
      return;
    }
    const existingPreparedOwner = getPreparedPortalOwner(player);
    if(existingPreparedOwner?.preparedPortal){
      emitPreparedPortal(existingPreparedOwner, existingPreparedOwner.preparedPortal);
      replySocket.emit("portal:error", {
        code:"PORTAL_ALREADY_INVOKED",
        message:"Un portail est deja invoque sur ta map 1. Termine-le avant d'en invoquer un autre."
      });
      return;
    }
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(targetSocket);
    if(!group) return;
    if(group.leaderId !== targetSocket.id){
      replySocket.emit("portal:error", {message:"Seul le chef de groupe peut preparer ce portail."});
      return;
    }
    if(group.instance?.type === "portal" && !group.instance.completed){
      replySocket.emit("portal:error", {message:"Un portail est deja actif pour ce groupe."});
      return;
    }
    const profile = profileManager.getProfileForPlayer?.(player);
    const portalDefinition = getPortalDefinition(portalId);
    if(!portalDefinition || portalDefinition.id === RICKY_PORTAL_ID){
      replySocket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    if(!validatePortalDefinitionForPlayer({socket:replySocket, player, profile, portalDefinition})) return;
    if(rejectPendingPortalContent(replySocket, portalDefinition)) return;
    const portal = PORTAL_CONFIGS[portalDefinition.id] || PORTAL_CONFIGS.blue;
    const totalWaves = getPortalTotalWaves(portal);
    const firmId = normalizeFirmId(profile?.player?.firmId || player.account?.firmId || "astra");
    const placement = getPreparedPortalPlacement(firmId);
    const preparedPortal = {
      id:`prepared-${portal.id}-${Date.now().toString(36)}`,
      portalId:portal.id,
      portal:{id:portal.id, name:portal.name, totalWaves},
      ...placement,
      r:PREPARED_PORTAL_RADIUS,
      safeRadius:PREPARED_PORTAL_SAFE_RADIUS,
      activationRadius:PREPARED_PORTAL_INTERACTION_RADIUS,
      preparedBy:player.id,
      ownerPlayerId:player.id,
      ownerAccountId:getPortalOwnerAccountId(player),
      preparedAt:Date.now()
    };
    player.preparedPortal = preparedPortal;
    emitPreparedPortal(player, preparedPortal);
  }

  function joinRickyPortalInstance(socket, group, portalDefinition, profile){
    const player = players.get(socket.id);
    const instance = group?.instance;
    if(!player || !isRickyPortalInstance(instance) || instance.completed) return false;
    if(group.members.length > RICKY_MAX_GROUP_MEMBERS){
      socket.emit("portal:error", {message:`Portail limite a ${RICKY_MAX_GROUP_MEMBERS} joueurs.`});
      return false;
    }
    const joined = getJoinedMemberIds(instance);
    if(instance.abandonedMemberIds?.includes(player.id)){
      socket.emit("portal:error", {message:"Cette tentative de portail a deja ete abandonnee."});
      return false;
    }
    if(joined.includes(player.id)){
      emitPortalStart(socket, group);
      emitInstance(group);
      return true;
    }
    const keyResult = consumeRickyPortalKey(player, profile, portalDefinition);
    if(!keyResult.ok){
      socket.emit("portal:error", {message:keyResult.reason || RICKY_PORTAL_KEY_REQUIRED_MESSAGE});
      return false;
    }
    joined.push(player.id);
    if(!instance.playerLives || typeof instance.playerLives !== "object") instance.playerLives = {};
    instance.playerLives[player.id] = Math.max(1, Number(instance.playerLives[player.id] || 3));
    if(Array.isArray(instance.abandonedMemberIds)){
      instance.abandonedMemberIds = instance.abandonedMemberIds.filter(memberId=>memberId !== player.id);
    }
    emitPortalStart(socket, group);
    emitInstance(group);
    return true;
  }

  function startPortalInstance(socket, portalId){
    const player = players.get(socket.id);
    if(!player || player.deathState || Number(player.state?.hp || 0) <= 0) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group || group.leaderId !== socket.id) return;
    if(group.instance?.type === "portal" && !group.instance.completed){
      socket.emit("portal:error", {message:"Un portail est deja actif pour ce groupe."});
      return;
    }
    let profile = profileManager.getProfileForPlayer?.(player);
    const portalDefinition = getPortalDefinition(portalId);
    if(!portalDefinition){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    const isRickyPortal = portalDefinition.id === RICKY_PORTAL_ID;
    if(!isRickyPortal && !profile?.unlockedPortals?.includes(portalDefinition.id)){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    if(isRickyPortal){
      const questId = getRickyPortalQuestId(profile);
      if(!questId || !profile?.completedQuestClaims?.[questId]){
        socket.emit("portal:error", {message:"Ricky n'a pas encore stabilise ce portail."});
        return;
      }
      if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
        socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
        return;
      }
      if(getInventoryItemCount(profile, RICKY_PORTAL_KEY_ITEM_ID) < 1){
        socket.emit("portal:error", {message:RICKY_PORTAL_KEY_REQUIRED_MESSAGE});
        return;
      }
      const keyResult = profileManager.updateProfileForPlayer({
        player,
        update:draft=>{
          const draftQuestId = getRickyPortalQuestId(draft);
          if(!draftQuestId || !draft?.completedQuestClaims?.[draftQuestId]){
            return {ok:false, reason:"Ricky n'a pas encore stabilise ce portail."};
          }
          if(!consumeInventoryItemAmount(draft, RICKY_PORTAL_KEY_ITEM_ID, 1)){
            return {ok:false, reason:RICKY_PORTAL_KEY_REQUIRED_MESSAGE};
          }
          return {ok:true};
        }
      });
      if(!keyResult.ok){
        socket.emit("portal:error", {message:keyResult.reason || RICKY_PORTAL_KEY_REQUIRED_MESSAGE});
        return;
      }
      profile = keyResult.profile || profile;
      emitProfileSync?.(player, profile);
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
      return;
    }
    if(!isRickyPortal && rejectPendingPortalContent(socket, portalDefinition)) return;
    const portal = PORTAL_CONFIGS[portalDefinition.id] || PORTAL_CONFIGS.blue;
    const totalWaves = getPortalTotalWaves(portal);
    const isAzuronPortal = portal.id === AZURON_PORTAL_ID;
    const isVesperPortal = portal.id === VESPER_PORTAL_ID;
    const isKharonPortal = portal.id === KHARON_PORTAL_ID;
    const vesperState = isVesperPortal ? createVesperPortalState(now()) : null;
    group.instance = {
      id:`P-${String(instanceSeq++).padStart(4, "0")}`,
      type:"portal",
      portal:{id:portal.id, name:portal.name, totalWaves},
      spawn:{
        mapId:`portal-${portal.id}`,
        ...(isRickyPortal
          ? RICKY_PORTAL_MAP.spawn
          : vesperState?.spawn || (isKharonPortal ? KHARON_PORTAL_MAP.spawn : {x:0, y:0}))
      },
      wave:isRickyPortal || isAzuronPortal || isVesperPortal || isKharonPortal ? 0 : 1,
      completed:false,
      playerLives:Object.fromEntries(group.members.map(memberId=>[memberId, 3])),
      abandonedMemberIds:[],
      enemies:vesperState?.enemies || (isRickyPortal || isAzuronPortal || isKharonPortal ? [] : buildServerPortalWave(1, portal.id)),
      ...(isKharonPortal ? {objective:createKharonObjective()} : {}),
      ...(vesperState ? {
        allies:vesperState.allies,
        objective:vesperState.objective
      } : {}),
      ...(isRickyPortal ? {
        ally:createRickyAlly(RICKY_PORTAL_MAP.spawn),
        beacons:[],
        objective:createRickyObjective()
      } : {})
    };
    if(isAzuronPortal) azuronRuntime.start(group);
    if(isKharonPortal) kharonRuntime.start(group);
    io.to(group.id).emit("portal:started", {
      instanceId:group.instance.id,
      portal:group.instance.portal,
      spawn:group.instance.spawn,
      wave:group.instance.wave,
      waveTotal:Number(group.instance.portal?.totalWaves || 0),
      nextWaveAt:Number(group.instance.nextWaveAt || 0),
      nextWaveDelayMs:Math.max(0, Number(group.instance.nextWaveAt || 0) - Number(now())),
      waveState:String(group.instance.waveState || ""),
      playerLives:{...(group.instance.playerLives || {})},
      allies:publicVesperAllies(group.instance),
      objective:publicVesperObjective(group.instance) || publicKharonObjective(group.instance, now()) || group.instance.objective || null
    });
    emitInstance(group);
  }

  function startRickyAwarePortalInstance(socket, portalId){
    const player = players.get(socket.id);
    if(!player || player.deathState || Number(player.state?.hp || 0) <= 0) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group) return;
    let profile = profileManager.getProfileForPlayer?.(player);
    const portalDefinition = getPortalDefinition(portalId);
    if(!portalDefinition){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    const isRickyPortal = portalDefinition.id === RICKY_PORTAL_ID;
    const ownedActivePortal = findActivePortalForPlayer(player);
    if(ownedActivePortal && ownedActivePortal.group !== group){
      socket.emit("portal:error", {
        code:"PORTAL_ALREADY_ACTIVE",
        message:"Un portail est deja actif pour ce compte. Termine-le avant d'en invoquer un autre."
      });
      return;
    }
    if(group.instance?.type === "portal" && !group.instance.completed){
      if(isRickyPortal && group.instance.portal?.id === RICKY_PORTAL_ID){
        joinRickyPortalInstance(socket, group, portalDefinition, profile);
        return;
      }
      socket.emit("portal:error", {message:"Un portail est deja actif pour ce groupe."});
      return;
    }
    if(group.leaderId !== socket.id){
      socket.emit("portal:error", {message:"Seul le chef de groupe peut lancer ce portail."});
      return;
    }
    if(isRickyPortal && group.members.length > RICKY_MAX_GROUP_MEMBERS){
      socket.emit("portal:error", {message:`Portail limite a ${RICKY_MAX_GROUP_MEMBERS} joueurs.`});
      return;
    }
    if(!isRickyPortal && !profile?.unlockedPortals?.includes(portalDefinition.id)){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    if(isRickyPortal){
      const keyResult = consumeRickyPortalKey(player, profile, portalDefinition);
      if(!keyResult.ok){
        socket.emit("portal:error", {message:keyResult.reason || RICKY_PORTAL_KEY_REQUIRED_MESSAGE});
        return;
      }
      profile = keyResult.profile || profile;
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
      return;
    }
    if(!isRickyPortal && rejectPendingPortalContent(socket, portalDefinition)) return;
    if(!isRickyPortal){
      const preparedPortal = getPreparedPortalOwner(player)?.preparedPortal || null;
      if(!preparedPortal || String(preparedPortal.portalId || "") !== String(portalDefinition.id || "")){
        socket.emit("portal:error", {message:"Prepare ce portail depuis l'ecran Portails avant d'entrer."});
        return;
      }
      if(!isPlayerAtPreparedPortal(player, preparedPortal)){
        socket.emit("portal:error", {message:`Approche du portail prepare sur ${preparedPortal.mapName || "la map 1"} puis appuie sur J.`});
        return;
      }
    }
    const portal = PORTAL_CONFIGS[portalDefinition.id] || PORTAL_CONFIGS.blue;
    const totalWaves = getPortalTotalWaves(portal);
    const isAzuronPortal = portal.id === AZURON_PORTAL_ID;
    const isVesperPortal = portal.id === VESPER_PORTAL_ID;
    const isKharonPortal = portal.id === KHARON_PORTAL_ID;
    const vesperState = isVesperPortal ? createVesperPortalState(now()) : null;
    const joinedMemberIds = [socket.id];
    group.instance = {
      id:`P-${String(instanceSeq++).padStart(4, "0")}`,
      type:"portal",
      portal:{id:portal.id, name:portal.name, totalWaves},
      ...(!isRickyPortal ? {
        privateOwner:true,
        ownerPlayerId:player.id,
        ownerAccountId:getPortalOwnerAccountId(player)
      } : {}),
      spawn:{
        mapId:`portal-${portal.id}`,
        ...(isRickyPortal
          ? RICKY_PORTAL_MAP.spawn
          : vesperState?.spawn || (isKharonPortal ? KHARON_PORTAL_MAP.spawn : {x:0, y:0}))
      },
      wave:isRickyPortal || isAzuronPortal || isVesperPortal || isKharonPortal ? 0 : 1,
      completed:false,
      playerLives:Object.fromEntries(joinedMemberIds.map(memberId=>[memberId, 3])),
      joinedMemberIds,
      abandonedMemberIds:[],
      enemies:vesperState?.enemies || (isRickyPortal || isAzuronPortal || isKharonPortal ? [] : buildServerPortalWave(1, portal.id)),
      ...(isKharonPortal ? {objective:createKharonObjective()} : {}),
      ...(vesperState ? {
        allies:vesperState.allies,
        objective:vesperState.objective
      } : {}),
      ...(isRickyPortal ? {
        ally:createRickyAlly(RICKY_PORTAL_MAP.spawn),
        beacons:[],
        objective:createRickyObjective()
      } : {})
    };
    if(isAzuronPortal) azuronRuntime.start(group);
    if(isKharonPortal) kharonRuntime.start(group);
    if(!isRickyPortal) clearPreparedPortal(player, "started");
    if(isRickyPortal) emitPortalStart(socket, group);
    else emitToPortalOwner(player, "portal:started", {
      instanceId:group.instance.id,
      portal:group.instance.portal,
      spawn:group.instance.spawn,
      wave:group.instance.wave,
      waveTotal:Number(group.instance.portal?.totalWaves || 0),
      nextWaveAt:Number(group.instance.nextWaveAt || 0),
      nextWaveDelayMs:Math.max(0, Number(group.instance.nextWaveAt || 0) - Number(now())),
      waveState:String(group.instance.waveState || ""),
      playerLives:{...(group.instance.playerLives || {})},
      allies:publicVesperAllies(group.instance),
      objective:publicVesperObjective(group.instance) || publicKharonObjective(group.instance, now()) || group.instance.objective || null
    });
    emitInstance(group);
  }

  function progressPortalCompletionQuest(player, portalId){
    const result = profileManager.applyQuestAction?.({
      player,
      action:{kind:"progress", type:"portal_complete", portalId}
    });
    if(!result?.ok) return result;
    if(result.updates?.length){
      io.to(player.id).emit("quest:progress", {
        updates:result.updates,
        at:Date.now()
      });
    }
    if(result.claimedQuests?.length) emitQuestClaims?.(player, result.claimedQuests, {auto:true});
    return result;
  }

  function emitPortalComplete(group){
    const instance = group?.instance;
    if(!instance || instance.type !== "portal" || instance.rewardGranted) return;
    instance.rewardGranted = true;
    instance.rewardGrantedAt = Date.now();
    instance.completed = true;
    azuronRuntime.cancel(instance);
    kharonRuntime.cancel(instance);
    const portal = PORTAL_CONFIGS[instance.portal?.id] || PORTAL_CONFIGS.blue;
    const now = Date.now();
    if(isRickyPortalInstance(instance) && instance.objective){
      instance.objective.stage="complete";
      instance.objective.completedAt=now;
      instance.objective.exitAt=now + RICKY_PORTAL_MAP.exitDelaySeconds * 1000;
    }
    const firmContributors = [];
    const personalFirmSnapshots = [];
    const completionMemberIds = Array.isArray(instance.joinedMemberIds)
      ? getJoinedMemberIds(instance)
      : group.members || [];
    for(const memberId of completionMemberIds){
      if(instance.abandonedMemberIds?.includes(memberId)) continue;
      const player = players.get(memberId);
      if(!player) continue;
      const currentProfile = profileManager.getProfileForPlayer?.(player);
      const playerKey = profileManager.profileKeyForPlayer?.(player) || "";
      firmContributors.push({
        key:playerKey,
        name:currentProfile?.player?.name || player.name || "Pilote",
        firmId:currentProfile?.player?.firmId || player.account?.firmId || "astra"
      });
      let portalBonusReward = null;
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>{
          profile.player = applyProgressionReward(
            profile.player || {},
            portal.reward || {},
            getProgressionLevelCap(profile.prestigeCount)
          );
          if(!profile.completedPortals || typeof profile.completedPortals !== "object") profile.completedPortals = {};
          if(portal.id === AZURON_PORTAL_ID){
            portalBonusReward = grantAzuronLaserReward(profile, {random});
          }else{
            portalBonusReward = grantPortalBonusReward(profile, portal.id, {random});
          }
          profile.completedPortals[portal.id] = Math.max(0, Number(profile.completedPortals[portal.id] || 0)) + 1;
          if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
          if(Number(portal.reward?.ammoX4 || 0) > 0){
            profile.ammoInventory.ammo_x4 = Math.max(0, Number(profile.ammoInventory.ammo_x4 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX4 || 0)));
          }
          if(Number(portal.reward?.ammoX6 || 0) > 0){
            profile.ammoInventory.ammo_x6 = Math.max(0, Number(profile.ammoInventory.ammo_x6 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX6 || 0)));
          }
          applyServerReputationFromXp(profile, portal.reward?.xp);
          updateRankScore(profile);
          return {ok:true};
        }
      });
      if(result?.ok === false) portalBonusReward = null;
      const rewardPayload = portalBonusReward
        ? {
            ...portal.reward,
            bonusDrop:portalBonusReward,
            ...(portalBonusReward.itemId ? {itemDrop:portalBonusReward} : {})
          }
        : portal.reward;
      io.to(memberId).emit("portal:complete", {
        instanceId:instance.id,
        portal:{id:portal.id, name:portal.name},
        reward:rewardPayload,
        rewardItemId:portalBonusReward?.awarded && portalBonusReward?.itemId
          ? portalBonusReward.itemId
          : null,
        firstClear:Boolean(portalBonusReward?.firstClear),
        rewardAppliedByServer:true,
        at:now
      });
      const questResult = progressPortalCompletionQuest(player, portal.id);
      const finalProfile = questResult?.profile || result.profile || currentProfile;
      emitProfileSync?.(player, finalProfile);
      personalFirmSnapshots.push({player, playerKey, profile:finalProfile});
    }
    if(firmWarManager && firmContributors.length){
      const result = firmWarManager.recordPortalCompletion(firmContributors);
      emitThrottledFirmRanking({io, profileManager, snapshot:result.snapshot});
      for(const entry of personalFirmSnapshots){
        if(!entry.playerKey) continue;
        const personalSnapshot = buildPersonalFirmSeasonSnapshot({
          firmWarManager,
          profileManager,
          playerKey:entry.playerKey,
          profile:entry.profile,
          player:entry.player
        });
        if(personalSnapshot) io.to(entry.player.id).emit("firm:snapshot", personalSnapshot);
      }
    }
    emitInstance(group);
  }

  function handlePortalEnemyDeath(group, enemy, killerId){
    const instance = group?.instance;
    if(!instance || instance.completed || Number(enemy?.hp || 0) > 0) return;
    if(isRickyPortalInstance(instance)){
      rickyRuntime.handleRickyEnemyDeath(group, enemy, killerId);
      return;
    }
    if(instance.portal?.id === AZURON_PORTAL_ID){
      azuronRuntime.handleEnemyDeath(group);
      return;
    }
    if(isVesperPortalInstance(instance)){
      vesperRuntime.handleVesperEnemyDeath(group, enemy, killerId);
      return;
    }
    if(instance.portal?.id === KHARON_PORTAL_ID){
      kharonRuntime.handleEnemyDeath(group);
      return;
    }
    const alive = instance.enemies.some(entry=>entry.hp > 0);
    if(alive) return;
    const totalWaves = Math.max(1, Number(instance.portal?.totalWaves || portalWaveTotal || 1));
    if(instance.wave >= totalWaves) emitPortalComplete(group);
    else{
      instance.wave += 1;
      instance.enemies = buildServerPortalWave(instance.wave, instance.portal?.id);
    }
  }

  return {
    buildServerPortalWave,
    emitPortalComplete,
    handlePortalEnemyDeath,
    portalWaveTotal,
    activateRickyLever:rickyRuntime.activateRickyLever,
    activateRickyHealBeacon:rickyRuntime.activateRickyHealBeacon,
    updateRickyCompanions:rickyRuntime.updateRickyCompanions,
    getVesperNpcTargets:vesperRuntime.getVesperNpcTargets,
    updateVesperEncounters:vesperRuntime.updateVesperEncounters,
    updateKharonEncounters:kharonRuntime.updateKharonEncounters,
    preparePortalInstance,
    startPortalInstance:startRickyAwarePortalInstance
  };
}
