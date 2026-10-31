import {
  isVesperPortal,
  normalizeVesperObjective,
  resolvePortalLives
} from "../data/vesperPortal.js?v=20260726-kharon1";
import {
  isKharonPortal,
  mergeKharonEffect,
  normalizeKharonObjective
} from "../data/kharonPortal.js?v=20260726-kharon1";
import {
  isIonisPortal,
  normalizeIonisObjective
} from "../data/ionisPortal.js?v=20260726-portals2530-1";
import {
  isEclanitePortal,
  normalizeEclaniteObjective
} from "../data/eclanitePortal.js?v=20260726-portals2530-1";

function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

function normalizePortalAlly(ally){
  return ally ? {...ally, receivedAt:performance.now()} : null;
}

function normalizePreparedPortal(portal){
  return portal ? {...portal, receivedAt:performance.now()} : null;
}

function normalizePortalObjective(payload, previous = null){
  const portal = payload?.portal || null;
  const objective = payload?.objective === undefined ? previous : payload.objective;
  if(isVesperPortal(portal) || String(objective?.kind || "") === "vesper"){
    const allies = Array.isArray(payload?.allies)
      ? payload.allies
      : Array.isArray(previous?.allies)
        ? previous.allies
        : [];
    return normalizeVesperObjective(objective, {
      allies,
      receivedAt:performance.now()
    });
  }
  if(isKharonPortal(portal) || String(objective?.kind || "") === "kharon"){
    const hasObjectiveHazards = objective
      && typeof objective === "object"
      && Object.hasOwn(objective, "hazards");
    const hazards = Array.isArray(payload?.hazards)
      ? payload.hazards
      : hasObjectiveHazards
        ? objective.hazards
        : Array.isArray(previous?.hazards)
          ? previous.hazards
          : [];
    const hasObjectiveBossEffects = objective
      && typeof objective === "object"
      && Object.hasOwn(objective, "bossEffects");
    const bossEffects = Array.isArray(payload?.bossEffects)
      ? payload.bossEffects
      : hasObjectiveBossEffects
        ? objective.bossEffects
        : Array.isArray(previous?.bossEffects)
          ? previous.bossEffects
          : [];
    return normalizeKharonObjective({
      ...(objective || {}),
      wave:Number(payload?.wave ?? objective?.wave ?? 0),
      waveTotal:Number(payload?.waveTotal ?? objective?.waveTotal ?? portal?.waves ?? 30)
    }, {
      hazards,
      bossEffects,
      receivedAt:Date.now(),
      serverAt:payload?.at || objective?.at
    });
  }
  if(isIonisPortal(portal) || String(objective?.kind || "") === "ionis"){
    return normalizeIonisObjective(objective, {
      wave:payload?.wave ?? objective?.wave,
      waveTotal:payload?.waveTotal ?? objective?.waveTotal ?? portal?.waves
    });
  }
  if(isEclanitePortal(portal) || String(objective?.kind || "") === "eclanite"){
    if(payload?.objective === undefined && String(previous?.kind || "") === "eclanite") return previous;
    const source = objective && typeof objective === "object" ? objective : {};
    const merged = {
      ...(previous && typeof previous === "object" ? previous : {}),
      ...source,
      breaches:{
        ...(previous?.breaches || {}),
        ...(source.breaches || {})
      }
    };
    return normalizeEclaniteObjective(merged, {
      receivedAt:Date.now(),
      serverAt:payload?.at ?? source.at ?? previous?.at
    });
  }
  return objective || null;
}

export function normalizePortalInstance(payload, completed = Boolean(payload?.completed), playerId = ""){
  const portal = payload?.portal || null;
  const waveTotal = Math.max(1, Number(payload?.waveTotal || portal?.waves || portal?.totalWaves || 30));
  const waveState = String(payload?.waveState || "");
  const hasAuthoritativeDelay = payload && Object.hasOwn(payload, "nextWaveDelayMs");
  const nextWaveAt = hasAuthoritativeDelay
    ? Date.now() + Math.max(0, Number(payload.nextWaveDelayMs || 0))
    : Math.max(0, Number(payload?.nextWaveAt || 0));
  return {
    instanceId:payload?.instanceId || null,
    portal,
    wave:Number(payload?.wave || 0),
    waveTotal,
    nextWaveAt,
    waveState,
    waitingForClear:Boolean(payload?.waitingForClear) || waveState === "clear_batch",
    waveBatchEnd:Math.max(0, Number(payload?.waveBatchEnd || 0)),
    completed:Boolean(completed),
    objective:payload?.objective || null,
    lives:resolvePortalLives(payload, playerId)
  };
}

export function installWorldSocketListeners({socket, multiplayer, replaceServerEnemies, emitChange, toast}){
  const applyKharonEffectEvent = event=>{
    const portal = event?.portal || multiplayer.portalInstance?.portal || null;
    if(!isKharonPortal(portal) && String(multiplayer.portalObjective?.kind || "") !== "kharon") return;
    multiplayer.portalObjective = mergeKharonEffect(multiplayer.portalObjective, event, {
      receivedAt:Date.now()
    });
    if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    emitChange("portal:kharon-effect", event);
  };
  socket.on("group:update", group=>{
    multiplayer.group = group || null;
    // Prepared dungeon portals are player/account-owned and arrive through the
    // dedicated portal:prepared event. A non-null legacy group snapshot can
    // restore it after a refresh, but a null field must not erase account state.
    if(group?.preparedPortal){
      multiplayer.preparedPortal = normalizePreparedPortal(group.preparedPortal);
    }
    if(group?.members?.length){
      const memberIds = new Set(group.members.map(member=>member.id));
      multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(invite=>!memberIds.has(invite.playerId));
    }
    emitChange("group:update", group);
  });
  socket.on("coop:enemies", payload=>{
    const previousInstance = multiplayer.portalInstance;
    const objective = normalizePortalObjective(payload, multiplayer.portalObjective);
    multiplayer.coopInstanceId = payload?.instanceId || null;
    multiplayer.coopSpawn = payload?.spawn || null;
    multiplayer.portalInstance = payload?.portal
      ? normalizePortalInstance(payload, Boolean(payload?.completed), multiplayer.playerId)
      : null;
    if(multiplayer.portalInstance){
      multiplayer.portalInstance.objective = objective;
      if(multiplayer.portalInstance.lives === null
        && previousInstance?.portal?.id === multiplayer.portalInstance.portal?.id){
        multiplayer.portalInstance.lives = previousInstance.lives;
      }
    }
    multiplayer.portalAlly = payload?.portal ? normalizePortalAlly(payload?.ally) : null;
    multiplayer.portalBeacons = payload?.portal ? Array.isArray(payload?.beacons) ? payload.beacons : [] : [];
    multiplayer.portalObjective = payload?.portal ? objective : null;
    replaceServerEnemies(payload, "coop");
    // Combat reads these snapshots directly. A global UI event here would rerender
    // authentication and utility panels ten times per second during an instance.
  });
  socket.on("portal:started", event=>{
    const objective = normalizePortalObjective(event, null);
    multiplayer.preparedPortal = null;
    multiplayer.portalInstance = normalizePortalInstance(event, false, multiplayer.playerId);
    multiplayer.portalInstance.objective = objective;
    multiplayer.portalAlly = null;
    multiplayer.portalBeacons = [];
    multiplayer.portalObjective = objective;
    multiplayer.rickyCinematicEvents = [];
    pushEvent(multiplayer.portalStartEvents, event, 10);
    emitChange();
  });
  socket.on("portal:prepared", event=>{
    multiplayer.preparedPortal = normalizePreparedPortal(event?.preparedPortal);
    if(multiplayer.preparedPortal){
      const name = multiplayer.preparedPortal.portal?.name || "Portail";
      const mapName = multiplayer.preparedPortal.mapName || "la map 1";
      toast(`${name} prepare sur ${mapName}.`);
    }
    emitChange("portal:prepared", event);
  });
  socket.on("portal:complete", event=>{
    pushEvent(multiplayer.portalCompleteEvents, event, 10);
    if(multiplayer.portalInstance) multiplayer.portalInstance.completed = true;
    const portal = event?.portal || multiplayer.portalInstance?.portal || null;
    if(isEclanitePortal(portal) || String(multiplayer.portalObjective?.kind || "") === "eclanite"){
      multiplayer.portalObjective = normalizeEclaniteObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"eclanite",
        phase:"complete",
        at:event?.at ?? event?.objective?.at ?? multiplayer.portalObjective?.at
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at ?? event?.objective?.at ?? multiplayer.portalObjective?.at
      });
      if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    }
    emitChange();
  });
  socket.on("portal:ricky-heal", event=>{
    if(event?.beacon){
      multiplayer.portalBeacons = [
        ...(Array.isArray(multiplayer.portalBeacons) ? multiplayer.portalBeacons.filter(beacon=>beacon.id !== event.beacon.id) : []),
        event.beacon
      ];
    }
    pushEvent(multiplayer.rickyHealEvents, event, 10);
    emitChange("portal:ricky-heal", event);
  });
  socket.on("portal:ricky-cinematic", event=>{
    pushEvent(multiplayer.rickyCinematicEvents, event, 5);
    emitChange("portal:ricky-cinematic", event);
  });
  socket.on("portal:kharon-effect", applyKharonEffectEvent);
  socket.on("portal:kharon-bomb", applyKharonEffectEvent);
  socket.on("npc:damage", event=>{
    pushEvent(multiplayer.npcDamageEvents, event, 30);
    emitChange("npc:damage", event);
  });
  socket.on("player:healed", event=>{
    pushEvent(multiplayer.playerHealEvents, event, 30);
    emitChange("player:healed", event);
  });
  socket.on("ship:ability-state", event=>{
    multiplayer.shipAbilityState = {...event, receivedAt:performance.now()};
    pushEvent(multiplayer.shipAbilityEvents, event, 10);
    emitChange("ship:ability-state", event);
  });
  socket.on("ship:ability-effect", event=>{
    pushEvent(multiplayer.shipAbilityEffectEvents, event, 20);
    emitChange("ship:ability-effect", event);
  });
  socket.on("ship:ability-error", payload=>{
    toast(payload?.message || "Compétence de vaisseau indisponible.");
    emitChange("ship:ability-error", payload);
  });
  socket.on("world:enemies", payload=>{
    if(multiplayer.coopInstanceId) return;
    multiplayer.coopSpawn = null;
    replaceServerEnemies(payload, "world");
    // Keep high-frequency world snapshots out of the general application event bus.
  });
  socket.on("group:invite", invite=>{
    if(!invite?.groupId) return;
    multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
    multiplayer.invites.push(invite);
    toast(`${invite.fromName || "Un joueur"} t'invite en groupe.`);
    emitChange("group:invite", invite);
    setTimeout(()=>{
      multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
      emitChange("group:invite-expired", invite);
    }, Math.max(0, Number(invite.expiresAt || Date.now() + 30000) - Date.now()));
  });
  socket.on("group:declined", payload=>{
    toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
  });
  socket.on("group:invite-sent", invite=>{
    multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== invite?.playerId);
    multiplayer.outgoingGroupInvites.push(invite);
    emitChange("group:invite-sent", invite);
    setTimeout(()=>{
      multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== invite?.playerId);
      emitChange("group:invite-expired", invite);
    }, Math.max(0, Number(invite?.expiresAt || Date.now() + 30000) - Date.now()));
  });
  socket.on("group:invite-resolved", payload=>{
    multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== payload?.playerId);
    if(payload?.accepted === false) toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
    emitChange("group:invite-resolved", payload);
  });
  socket.on("group:kicked", payload=>{
    multiplayer.group = null;
    toast(`${payload?.byName || "Le chef"} t'a retire du groupe.`);
    emitChange("group:kicked", payload);
  });
  socket.on("group:error", payload=>toast(payload?.message || "Action de groupe impossible."));
}
