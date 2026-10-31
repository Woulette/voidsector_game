import { RICKY_SHOT_VISUAL_FIELDS } from "../data/rickyVisuals.js?v=20261024-ricky-visuals1";
import { isWavePortal } from "../data/wavePortalTiers.js";
import {
  isVesperPortal,
  normalizeVesperObjective,
  resolvePortalLives
} from "../data/vesperPortal.js?v=20260726-nox1";
import {
  isKharonPortal,
  mergeKharonEffect,
  normalizeKharonObjective
} from "../data/kharonPortal.js?v=20260726-nox1";
import {
  isIonisPortal,
  normalizeIonisObjective
} from "../data/ionisPortal.js?v=20260726-nox1";
import {
  isEclanitePortal,
  normalizeEclaniteObjective
} from "../data/eclanitePortal.js?v=20260726-nox1";
import {
  isNoxPortal,
  normalizeNoxObjective
} from "../data/noxPortal.js?v=20260726-nox1";
import {
  isPrismaticPortal,
  normalizePrismaticObjective
} from "../data/prismaticPortal.js?v=20260726-prismatic1";
import {
  isAncientPortal,
  normalizeAncientObjective
} from "../data/ancientPortal.js?v=20260726-ancient1";

function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

function normalizePortalAlly(ally, previous = null){
  if(!ally) return null;
  const visual = previous?.id === ally.id
    ? Object.fromEntries(RICKY_SHOT_VISUAL_FIELDS.filter(key=>Number.isFinite(previous[key])).map(key=>[key,previous[key]]))
    : {};
  return {...ally, ...visual, receivedAt:performance.now()};
}

function normalizePreparedPortal(portal){
  return portal ? {...portal, receivedAt:performance.now()} : null;
}

function mergePortalObjectiveList(previous, incoming){
  const prior = Array.isArray(previous) ? previous : [];
  if(!Array.isArray(incoming)) return prior;
  if(incoming.length === 0) return [];
  const merged = prior.map(item=>{
    const id = String(item?.id || "");
    const next = incoming.find(candidate=>String(candidate?.id || "") === id);
    return next ? {...item, ...next} : item;
  });
  for(const item of incoming){
    const id = String(item?.id || "");
    if(!merged.some(candidate=>String(candidate?.id || "") === id)) merged.push(item);
  }
  return merged;
}

function normalizePortalObjective(payload, previous = null){
  const portal = payload?.portal || null;
  const objective = payload?.objective === undefined ? previous : payload.objective;
  if(isWavePortal(portal) && objective?.kind === "azuron") return objective;
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
  if(isNoxPortal(portal) || String(objective?.kind || "") === "nox"){
    if(payload?.objective === undefined && String(previous?.kind || "") === "nox") return previous;
    const source = objective && typeof objective === "object" ? objective : {};
    const prior = previous && typeof previous === "object" ? previous : {};
    const merged = {
      ...prior,
      ...source,
      shield:{...(prior.shield || {}), ...(source.shield || {})},
      core:{...(prior.core || {}), ...(source.core || {})},
      boss:source.boss === null
        ? null
        : {...(prior.boss || {}), ...(source.boss || {})},
      defenses:Array.isArray(source.defenses) ? source.defenses : prior.defenses,
      drones:Array.isArray(source.drones) ? source.drones : prior.drones,
      recentEffects:Array.isArray(source.recentEffects) ? source.recentEffects : prior.recentEffects,
      attackEvents:Array.isArray(source.attackEvents) ? source.attackEvents : prior.attackEvents,
      wave:payload?.wave ?? source.wave ?? prior.wave,
      waveTotal:payload?.waveTotal ?? source.waveTotal ?? prior.waveTotal,
      waveState:payload?.waveState ?? source.waveState ?? prior.waveState,
      batchEnd:payload?.batchEnd ?? payload?.waveBatchEnd ?? source.batchEnd ?? source.waveBatchEnd ?? prior.batchEnd,
      nextWaveAt:payload?.nextWaveAt ?? source.nextWaveAt ?? prior.nextWaveAt,
      nextWaveDelayMs:payload?.nextWaveDelayMs ?? source.nextWaveDelayMs ?? prior.nextWaveDelayMs
    };
    return normalizeNoxObjective(merged, {
      receivedAt:Date.now(),
      serverAt:payload?.at ?? source.at ?? prior.at
    });
  }
  if(isPrismaticPortal(portal) || String(objective?.kind || "") === "prismatic"){
    if(payload?.objective === undefined && String(previous?.kind || "") === "prismatic") return previous;
    const source = objective && typeof objective === "object" ? objective : {};
    const prior = previous && typeof previous === "object" ? previous : {};
    const merged = {
      ...prior,
      ...source,
      planets:mergePortalObjectiveList(prior.planets, source.planets),
      rift:{...(prior.rift || {}), ...(source.rift || {})},
      bosses:mergePortalObjectiveList(prior.bosses, source.bosses),
      effects:Array.isArray(source.effects) ? source.effects : prior.effects
    };
    return normalizePrismaticObjective(merged, {
      receivedAt:Date.now(),
      serverAt:payload?.at ?? source.at ?? prior.at
    });
  }
  if(isAncientPortal(portal) || String(objective?.kind || "") === "precursors"){
    if(payload?.objective === undefined && String(previous?.kind || "") === "precursors") return previous;
    const source = objective && typeof objective === "object" ? objective : {};
    const prior = previous && typeof previous === "object" ? previous : {};
    const merged = {
      ...prior,
      ...source,
      rooms:mergePortalObjectiveList(prior.rooms, source.rooms),
      beacon:{...(prior.beacon || {}), ...(source.beacon || {})},
      rift:{...(prior.rift || {}), ...(source.rift || {})},
      talisman:{...(prior.talisman || {}), ...(source.talisman || {})},
      god:{...(prior.god || {}), ...(source.god || {})},
      allies:Array.isArray(source.allies) ? source.allies : prior.allies,
      bombs:Array.isArray(source.bombs) ? source.bombs : prior.bombs,
      effects:Array.isArray(source.effects) ? source.effects : prior.effects
    };
    return normalizeAncientObjective(merged, {
      receivedAt:Date.now(),
      serverAt:payload?.at ?? source.at ?? prior.at
    });
  }
  return objective || null;
}

export function normalizePortalInstance(payload, completed = Boolean(payload?.completed), playerId = ""){
  const portal = payload?.portal || null;
  const nonWavePortal = isPrismaticPortal(portal)
    || isAncientPortal(portal)
    || ["prismatic", "precursors"].includes(String(payload?.objective?.kind || ""));
  const waveTotal = nonWavePortal
    ? Math.max(0, Number(payload?.waveTotal ?? portal?.waves ?? portal?.totalWaves ?? 0))
    : Math.max(1, Number(payload?.waveTotal || portal?.waves || portal?.totalWaves || 30));
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
  const applyPrismaticEffectEvent = event=>{
    const portal = event?.portal || multiplayer.portalInstance?.portal || null;
    if(!isPrismaticPortal(portal) && String(multiplayer.portalObjective?.kind || "") !== "prismatic") return;
    const rawEffect = event?.effect && typeof event.effect === "object"
      ? {...event.effect, at:event.effect.at ?? event.at}
      : event;
    const effectId = String(rawEffect?.id || "");
    const effectSignature = [
      rawEffect?.type || rawEffect?.kind || "",
      rawEffect?.at || event?.at || "",
      rawEffect?.targetId || "",
      rawEffect?.targetBossId || ""
    ].join(":");
    const previous = multiplayer.portalObjective?.kind === "prismatic"
      ? multiplayer.portalObjective
      : normalizePrismaticObjective({kind:"prismatic"});
    const effects = [
      ...(Array.isArray(previous.effects)
        ? previous.effects.filter(effect=>{
            const id = String(effect?.id || "");
            const signature = [
              effect?.type || "",
              effect?.at || "",
              effect?.targetId || "",
              effect?.targetBossId || ""
            ].join(":");
            return !(effectId && id === effectId) && signature !== effectSignature;
          })
        : []),
      rawEffect
    ].slice(-30);
    multiplayer.portalObjective = normalizePrismaticObjective({
      ...previous,
      kind:"prismatic",
      effects
    }, {
      receivedAt:Date.now(),
      serverAt:event?.at ?? rawEffect?.at
    });
    if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    emitChange("portal:prismatic-effect", event);
  };
  const applyPrecursorEffectEvent = event=>{
    const portal = event?.portal || multiplayer.portalInstance?.portal || null;
    if(!isAncientPortal(portal) && String(multiplayer.portalObjective?.kind || "") !== "precursors") return;
    const previous = multiplayer.portalObjective?.kind === "precursors"
      ? multiplayer.portalObjective
      : normalizeAncientObjective({kind:"precursors"});
    const effectId = String(event?.id || "");
    const effects = [
      ...(Array.isArray(previous.effects)
        ? previous.effects.filter(effect=>!effectId || String(effect?.id || "") !== effectId)
        : []),
      event
    ].slice(-20);
    multiplayer.portalObjective = normalizeAncientObjective({
      ...previous,
      kind:"precursors",
      effects
    }, {
      receivedAt:Date.now(),
      serverAt:event?.at
    });
    if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    emitChange("portal:precursor-effect", event);
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
    multiplayer.portalAlly = payload?.portal ? normalizePortalAlly(payload?.ally, multiplayer.portalAlly) : null;
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
  socket.on("portal:azuron-transfer",event=>emitChange("portal:azuron-transfer",event));
  socket.on("portal:paused", event=>{
    if(!isWavePortal(event?.portal)) return;
    multiplayer.coopInstanceId=null;multiplayer.coopSpawn=null;
    multiplayer.portalInstance=null;multiplayer.portalObjective=null;multiplayer.portalAlly=null;
    multiplayer.portalBeacons=[];multiplayer.portalStartEvents=[];multiplayer.portalCompleteEvents=[];
    replaceServerEnemies({enemies:[],full:true,portal:null},"coop");
    emitChange("portal:paused",event);
    toast(event.completed ? "Portail termine." : `Portail en pause : reprise a la vague ${event.nextWave}.`);
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
    else if(isNoxPortal(portal) || String(multiplayer.portalObjective?.kind || "") === "nox"){
      multiplayer.portalObjective = normalizeNoxObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"nox",
        waveState:"complete",
        completedAt:event?.completedAt || event?.at || Date.now()
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at || event?.objective?.at
      });
      if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    }
    else if(isPrismaticPortal(portal) || String(multiplayer.portalObjective?.kind || "") === "prismatic"){
      multiplayer.portalObjective = normalizePrismaticObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"prismatic",
        stage:"complete",
        completedAt:event?.completedAt || event?.at || Date.now()
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at || event?.objective?.at
      });
      if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    }
    else if(isAncientPortal(portal) || String(multiplayer.portalObjective?.kind || "") === "precursors"){
      multiplayer.portalObjective = normalizeAncientObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"precursors",
        phase:"epilogue",
        stage:"complete",
        completedAt:event?.completedAt || event?.at || Date.now()
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at || event?.objective?.at
      });
      if(multiplayer.portalInstance) multiplayer.portalInstance.objective = multiplayer.portalObjective;
    }
    emitChange();
  });
  socket.on("portal:failed", event=>{
    const portal = event?.portal || multiplayer.portalInstance?.portal || null;
    const noxFailure = isNoxPortal(portal) || String(multiplayer.portalObjective?.kind || "") === "nox";
    const precursorFailure = isAncientPortal(portal) || String(multiplayer.portalObjective?.kind || "") === "precursors";
    if(noxFailure){
      multiplayer.portalObjective = normalizeNoxObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"nox",
        waveState:"failed",
        failedAt:event?.failedAt || event?.at || Date.now()
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at || event?.objective?.at
      });
    }
    else if(precursorFailure){
      multiplayer.portalObjective = normalizeAncientObjective({
        ...(multiplayer.portalObjective || {}),
        ...(event?.objective || {}),
        kind:"precursors",
        phase:"failed",
        stage:"failed",
        failedAt:event?.failedAt || event?.at || Date.now()
      }, {
        receivedAt:Date.now(),
        serverAt:event?.at || event?.objective?.at
      });
    }
    multiplayer.coopInstanceId = null;
    multiplayer.coopSpawn = null;
    multiplayer.portalInstance = null;
    multiplayer.portalAlly = null;
    multiplayer.portalBeacons = [];
    replaceServerEnemies({instanceId:null, enemies:[]}, "coop");
    toast(
      noxFailure
        ? "Noyau d\u00e9truit \u2014 portail ferm\u00e9"
        : precursorFailure
          ? (event?.message || "Temps écoulé — les anges sont perdus.")
          : (event?.message || "Portail ferm\u00e9.")
    );
    const payload = {...(event || {}), objective:multiplayer.portalObjective};
    multiplayer.portalObjective = null;
    emitChange("portal:failed", payload);
  });
  socket.on("portal:ricky-heal", event=>{
    if(event?.beacon && multiplayer.portalAlly) multiplayer.portalAlly.clientSpellAt = performance.now();
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
  socket.on("portal:prismatic-effect", applyPrismaticEffectEvent);
  socket.on("portal:precursor-effect", applyPrecursorEffectEvent);
  socket.on("portal:precursor-interact", event=>{
    if(!event?.ok && event?.reason) toast(event.reason);
    else if(event?.ok && event?.action === "beacon") toast("Le talisman ouvre la faille vers le paradis.");
    else if(event?.ok && event?.action === "rift") toast("Passage vers le paradis.");
    else if(event?.ok && event?.action === "god") toast("Le Sanctuaire des Précurseurs est sauvé.");
    emitChange("portal:precursor-interact", event);
  });
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
