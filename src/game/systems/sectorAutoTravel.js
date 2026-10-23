const ACTIVE_STATUSES = new Set(["traveling", "transferring"]);
const TERMINAL_STATUSES = new Set(["arrived", "cancelled"]);
const START_TIMEOUT_MS = 10000;
const STATE_TIMEOUT_MS = 15000;

function mapKey(value){
  return value == null ? "" : String(value);
}

function finitePoint(value){
  if(!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
  return {x:Number(value.x), y:Number(value.y)};
}

function copyState(value){
  return {...value, routeMapIds:[...value.routeMapIds],
    moveTarget:value.moveTarget ? {...value.moveTarget} : null,
    transition:value.transition ? {...value.transition, portal:{...value.transition.portal}} : null};
}

function normalizeTransition(value, nextMapId, previous){
  if(!value || nextMapId == null || mapKey(nextMapId) === "") return null;
  const duration = Number(value.durationMs) / 1000;
  const elapsed = Number(value.elapsedMs) / 1000;
  if(!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(elapsed)) return null;
  const cleanupDone = previous?.cleanupDone === true
    && previous.startedAt === value.startedAt && previous.completeAt === value.completeAt;
  return {...value, duration, elapsed:Math.max(0, Math.min(duration, elapsed)), portal:{targetMap:nextMapId},
    ...(cleanupDone ? {cleanupDone:true} : {})};
}

// Navigation intent and smooth client prediction only. The server owns the
// route, movement, portal timer and arrival; no local portal jump is performed.
export function createSectorAutoTravel({
  getState,
  isConnected,
  hasPremium,
  requestStart,
  requestCancel,
  applySession,
  setMovement,
  onChange = ()=>{},
  showToast = ()=>{},
  now = Date.now,
  createRequestId = null
}){
  let requestSequence = 0;
  let receivedAt = 0;
  let lastServerAt = Number.NEGATIVE_INFINITY;
  let shipId = "";
  let state = {active:false, pending:false, status:"idle", id:"", requestId:"",
    targetMapId:"", routeMapIds:[], index:0, currentMapId:"", nextMapId:null,
    moveTarget:null, transition:null, reason:"", revision:0};

  function notify(){ onChange(copyState(state)); }

  function worldUnavailableReason(world){
    if(!isConnected()) return "disconnected";
    if(!world?.running) return "stopped";
    if(!world.player || world.player.isDead || Number(world.player.hp) <= 0) return "death";
    if(!hasPremium()) return "premium-expired";
    if(world.gameMode !== "open" || world.portalTransition || world.portgunChannel) return "interrupted";
    return "";
  }

  function stopPrediction(){ setMovement(null, {status:state.status, travelId:state.id}); }

  function cancel(reason = "manual"){
    if(!state.active) return false;
    const payload = {requestId:state.requestId, ...(state.id ? {journeyId:state.id} : {})};
    // Invalidate locally before the transport call: even a synchronous queued
    // state callback must not reinstate a cancelled destination.
    state = {...state, active:false, pending:false, status:"cancelled", reason,
      moveTarget:null, transition:null};
    stopPrediction();
    notify();
    requestCancel(payload);
    return true;
  }

  function start(targetMapId){
    const targetId = mapKey(targetMapId);
    const world = getState();
    const unavailable = worldUnavailableReason(world);
    if(unavailable){
      showToast(unavailable === "premium-expired" ? "Abonnement Premium requis pour le voyage automatique."
        : unavailable === "disconnected" ? "Connexion au serveur requise pour voyager."
        : "Voyage automatique indisponible actuellement.");
      return false;
    }
    if(!targetId || targetId === mapKey(world.currentMap?.id)) return false;
    if(state.active) cancel("replaced");
    requestSequence += 1;
    const requestId = String(createRequestId?.() || `sector-travel-${now()}-${requestSequence}`);
    shipId = String(world.player.shipId || "");
    receivedAt = now();
    lastServerAt = Number.NEGATIVE_INFINITY;
    state = {active:true, pending:true, status:"requesting", id:"", requestId,
      targetMapId:targetId, routeMapIds:[], index:0, currentMapId:mapKey(world.currentMap?.id),
      nextMapId:null, moveTarget:null, transition:null, reason:"", revision:0};
    stopPrediction();
    notify();
    if(requestStart({targetMapId:targetId, requestId}) === false){
      applyServerError({requestId, code:"disconnected", message:"Connexion au serveur indisponible."});
      return false;
    }
    return true;
  }

  function matchesRequest(event){
    return state.active && mapKey(event?.requestId) === state.requestId
      && (!state.id || mapKey(event?.id) === state.id);
  }

  function applyServerState(event){
    if(!matchesRequest(event)) return false;
    const status = String(event.status || "");
    if(!ACTIVE_STATUSES.has(status) && !TERMINAL_STATUSES.has(status)) return false;
    const at = Number(event.at);
    const revision = Number(event.revision);
    const hasRevision = Number.isSafeInteger(revision) && revision > 0;
    if(!Number.isFinite(at) || (hasRevision ? revision <= state.revision : at < lastServerAt)) return false;
    const route = Array.isArray(event.route) ? event.route.map(mapKey) : [];
    const index = Number(event.index);
    const currentMapId = mapKey(event.currentMapId);
    const nextMapId = event.nextMapId == null ? null : mapKey(event.nextMapId);
    const point = finitePoint(event.moveTarget);
    const sessionPoint = finitePoint(event.session);
    if(!mapKey(event.id) || mapKey(event.targetMapId) !== state.targetMapId
      || !route.length || route.length > 64 || route.some(id=>!id)
      || route[route.length - 1] !== state.targetMapId
      || !Number.isSafeInteger(index) || index < 0 || index >= route.length
      || route[index] !== currentMapId || mapKey(event.session?.mapId) !== currentMapId
      || !sessionPoint || (status === "traveling" && !point)
      || (ACTIVE_STATUSES.has(status) && nextMapId !== route[index + 1])
      || (status === "arrived" && currentMapId !== state.targetMapId)){
      cancel("invalid-state");
      return false;
    }
    const world = getState();
    const unavailable = worldUnavailableReason(world);
    if(unavailable){ cancel(unavailable); return false; }
    const session = {...event.session,
      source:mapKey(world.currentMap?.id) === currentMapId ? "state-correction" : "auto-travel"};
    if(applySession(session) === false){ cancel("session-rejected"); return false; }
    lastServerAt = at;
    receivedAt = now();
    const active = ACTIVE_STATUSES.has(status);
    state = {...state, active, pending:false, status, id:mapKey(event.id), routeMapIds:route,
      index, currentMapId, nextMapId, moveTarget:active && status === "traveling" ? point : null,
      transition:status === "transferring" ? normalizeTransition(event.transition, nextMapId, state.transition) : null,
      reason:String(event.reason || ""), revision:hasRevision ? revision : state.revision};
    setMovement(state.moveTarget ? {...state.moveTarget} : null,
      {status, travelId:state.id, transition:state.transition});
    notify();
    if(status === "arrived") showToast(event.message || "Destination atteinte.");
    else if(status === "cancelled" && event.message) showToast(event.message);
    return true;
  }

  function applyServerError(event){
    if(!state.active || mapKey(event?.requestId) !== state.requestId) return false;
    state = {...state, active:false, pending:false, status:"error", reason:String(event.code || "rejected"),
      moveTarget:null, transition:null};
    stopPrediction();
    notify();
    showToast(event.message || "Voyage automatique impossible.");
    return true;
  }

  function update(dt = 0){
    if(!state.active) return;
    const world = getState();
    const unavailable = worldUnavailableReason(world);
    if(unavailable){ cancel(unavailable); return; }
    if(String(world.player.shipId || "") !== shipId){ cancel("ship-changed"); return; }
    if(mapKey(world.currentMap?.id) !== state.currentMapId){ cancel("map-changed"); return; }
    if(now() - receivedAt > (state.pending ? START_TIMEOUT_MS : STATE_TIMEOUT_MS)){
      cancel("timeout");
      showToast("Voyage interrompu : confirmation du serveur manquante.");
      return;
    }
    if(state.transition){
      const step = Number(dt);
      if(Number.isFinite(step) && step > 0){
        state.transition.elapsed = Math.min(state.transition.duration, state.transition.elapsed + step);
      }
    }
    setMovement(state.moveTarget ? {...state.moveTarget} : null,
      {status:state.status, travelId:state.id, transition:state.transition});
  }

  return {start, cancel, update, applyServerState, applyServerError, getState:()=>copyState(state),
    getTransition:()=>state.active && state.status === "transferring" ? state.transition : null};
}
