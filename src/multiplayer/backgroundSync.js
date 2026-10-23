const BACKGROUND_SYNC_POLICIES = Object.freeze({
  "social:sync":Object.freeze({
    minIntervalMs:250,
    inFlightMs:2500,
    cacheTtlMs:30000,
    crossTabMs:1500
  }),
  "firm:sync":Object.freeze({
    minIntervalMs:300,
    inFlightMs:2500,
    cacheTtlMs:8000,
    crossTabMs:1500
  }),
  "leaderboard:sync":Object.freeze({
    minIntervalMs:15 * 60 * 1000,
    inFlightMs:5000,
    cacheTtlMs:15 * 60 * 1000,
    crossTabMs:15 * 60 * 1000
  })
});

const BACKGROUND_SYNC_EVENTS = new Set(Object.keys(BACKGROUND_SYNC_POLICIES));
const CROSS_TAB_ELECTION_MS = 25;
const FIRM_SHOP_UPGRADE_DELAY_MS = 320;

function normalizePayload(eventName, payload){
  if(eventName === "firm:sync"){
    return {includeShop:Boolean(payload?.includeShop)};
  }
  return {};
}

function payloadCovers(eventName, available, requested){
  if(eventName === "firm:sync"){
    return Boolean(available?.includeShop) || !Boolean(requested?.includeShop);
  }
  return true;
}

function createEntry(){
  return {
    lastRequestedAt:0,
    lastReceivedAt:0,
    inFlightUntil:0,
    requestPayload:{},
    receivedPayload:{},
    suppressedCount:0,
    lastSuppressedAt:0,
    lastSuppressedReason:""
  };
}

function ensureBackgroundSyncState(multiplayer){
  if(!multiplayer.backgroundSync || typeof multiplayer.backgroundSync !== "object"){
    multiplayer.backgroundSync = {};
  }
  if(!multiplayer.backgroundSync.entries || typeof multiplayer.backgroundSync.entries !== "object"){
    multiplayer.backgroundSync.entries = {};
  }
  if(!Array.isArray(multiplayer.backgroundSync.limits)){
    multiplayer.backgroundSync.limits = [];
  }
  if(!("lastLimited" in multiplayer.backgroundSync)){
    multiplayer.backgroundSync.lastLimited = null;
  }
  return multiplayer.backgroundSync;
}

export function isBackgroundSyncEvent(eventName){
  return BACKGROUND_SYNC_EVENTS.has(String(eventName || ""));
}

export function getRateLimitToastMessage(kind, payload){
  const eventName = String(payload?.eventName || "");
  if(isBackgroundSyncEvent(eventName)) return "";
  if(eventName === "profile:setup"){
    return kind === "account:action-limited"
      ? "Choix de firme deja en cours, attends la reponse du serveur."
      : "Choix de firme deja envoye, attends quelques secondes.";
  }
  return kind === "account:action-limited"
    ? "Action envoyee trop vite, attends quelques secondes."
    : "Commande envoyee trop vite, attends quelques secondes.";
}

export function createBackgroundSyncCoordinator({
  multiplayer,
  now = ()=>Date.now(),
  logger = globalThis.console,
  storage = globalThis.localStorage,
  ownerId = `tab_${Math.random().toString(36).slice(2, 10)}`,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout
} = {}){
  if(!multiplayer || typeof multiplayer !== "object"){
    throw new TypeError("Un etat multijoueur est requis pour coordonner les synchronisations.");
  }
  const deferredRequests = new Map();
  const electionTimers = new Map();

  function state(){
    return ensureBackgroundSyncState(multiplayer);
  }

  function entryFor(eventName){
    const syncState = state();
    if(!syncState.entries[eventName]){
      syncState.entries[eventName] = createEntry();
    }
    return syncState.entries[eventName];
  }

  function suppress(entry, reason, at){
    entry.suppressedCount += 1;
    entry.lastSuppressedAt = at;
    entry.lastSuppressedReason = reason;
    return false;
  }

  function leaseKey(eventName){
    const accountId = String(multiplayer?.auth?.account?.id || "guest").slice(0, 80);
    const serverUrl = String(multiplayer?.serverUrl || "default").slice(0, 160);
    return `voidsector:bg-sync:${accountId}:${serverUrl}:${eventName}`;
  }

  function readLease(key){
    if(!storage?.getItem) return null;
    try{
      const lease = JSON.parse(storage.getItem(key) || "null");
      return lease && typeof lease === "object" ? lease : null;
    }catch{
      return null;
    }
  }

  function writeLease(key, lease){
    if(!storage?.setItem) return false;
    try{
      storage.setItem(key, JSON.stringify(lease));
      return true;
    }catch{
      return false;
    }
  }

  function removeOwnLease(key){
    if(!storage?.removeItem) return;
    try{
      if(readLease(key)?.ownerId === ownerId) storage.removeItem(key);
    }catch{}
  }

  function clearDeferred(eventName){
    const pending = deferredRequests.get(eventName);
    if(!pending) return;
    clearTimeoutFn?.(pending.timer);
    deferredRequests.delete(eventName);
  }

  function scheduleDeferred(eventName, options, delayMs){
    const requestedPayload = normalizePayload(eventName, options.payload);
    const pending = deferredRequests.get(eventName);
    if(pending && payloadCovers(eventName, pending.payload, requestedPayload)) return;
    clearDeferred(eventName);
    const timer = setTimeoutFn?.(()=>{
      deferredRequests.delete(eventName);
      request(eventName, options);
    }, Math.max(CROSS_TAB_ELECTION_MS, Number(delayMs || 0)));
    timer?.unref?.();
    deferredRequests.set(eventName, {timer, payload:requestedPayload});
  }

  function markRequested(entry, payload, at, policy){
    entry.lastRequestedAt = at;
    entry.inFlightUntil = at + policy.inFlightMs;
    entry.requestPayload = payload;
    entry.lastSuppressedReason = "";
  }

  function sendNow({entry, eventName, key, payload, normalizedPayload, policy, at, send, lease = null}){
    if(lease) writeLease(key, {...lease, sent:true, sentAt:at});
    let sent = false;
    try{
      sent = send(payload) !== false;
    }catch(error){
      logger?.warn?.(`[VoidSector] Echec de synchronisation de fond: ${eventName}`, error);
    }
    if(!sent){
      removeOwnLease(key);
      entry.inFlightUntil = 0;
      entry.lastRequestedAt = 0;
      entry.requestPayload = {};
      return false;
    }
    markRequested(entry, normalizedPayload, at, policy);
    return true;
  }

  function request(eventName, {
    payload = {},
    force = false,
    send
  } = {}){
    const cleanEventName = String(eventName || "");
    const policy = BACKGROUND_SYNC_POLICIES[cleanEventName];
    if(!policy || typeof send !== "function") return false;
    const at = Number(now()) || Date.now();
    const entry = entryFor(cleanEventName);
    const normalizedPayload = normalizePayload(cleanEventName, payload);
    const sharedLeaseKey = leaseKey(cleanEventName);

    if(!force){
      if(
        entry.inFlightUntil > at
        && payloadCovers(cleanEventName, entry.requestPayload, normalizedPayload)
      ){
        return suppress(entry, "in-flight", at);
      }
      if(
        entry.lastReceivedAt
        && at - entry.lastReceivedAt < policy.cacheTtlMs
        && payloadCovers(cleanEventName, entry.receivedPayload, normalizedPayload)
      ){
        return suppress(entry, "cache", at);
      }
      if(entry.lastRequestedAt && at - entry.lastRequestedAt < policy.minIntervalMs){
        return suppress(entry, "cooldown", at);
      }
      const sharedLease = readLease(sharedLeaseKey);
      const sharedLeaseAge = sharedLease ? at - Number(sharedLease.at || 0) : Number.POSITIVE_INFINITY;
      const sharedLeaseLifetime = sharedLease?.sent === true
        ? policy.crossTabMs
        : CROSS_TAB_ELECTION_MS * 4;
      if(
        sharedLease
        && sharedLease.ownerId !== ownerId
        && sharedLeaseAge < sharedLeaseLifetime
      ){
        const sharedPayload = normalizePayload(cleanEventName, sharedLease.payload);
        if(payloadCovers(cleanEventName, sharedPayload, normalizedPayload)){
          return suppress(entry, "cross-tab", at);
        }
        const canPreemptUnsentBase = cleanEventName === "firm:sync"
          && normalizedPayload.includeShop
          && !sharedPayload.includeShop
          && sharedLease.sent !== true
          && sharedLeaseAge <= CROSS_TAB_ELECTION_MS;
        const sentAt = Number(sharedLease.sentAt || sharedLease.at || at);
        const canUpgradeSentBase = cleanEventName === "firm:sync"
          && normalizedPayload.includeShop
          && !sharedPayload.includeShop
          && sharedLease.sent === true
          && at - sentAt >= FIRM_SHOP_UPGRADE_DELAY_MS;
        if(!canPreemptUnsentBase && !canUpgradeSentBase){
          const retryBaseAt = Number(sharedLease.sentAt || sharedLease.at || at);
          scheduleDeferred(cleanEventName, {payload, force:false, send}, retryBaseAt + FIRM_SHOP_UPGRADE_DELAY_MS - at);
          return suppress(entry, "cross-tab-upgrade", at);
        }
      }
    }

    clearDeferred(cleanEventName);
    const lease = {ownerId, at, payload:normalizedPayload, sent:force};
    const hasSharedLease = writeLease(sharedLeaseKey, lease);
    if(force || !hasSharedLease){
      return sendNow({
        entry,
        eventName:cleanEventName,
        key:sharedLeaseKey,
        payload,
        normalizedPayload,
        policy,
        at,
        send,
        lease:hasSharedLease ? lease : null
      });
    }

    markRequested(entry, normalizedPayload, at, policy);
    const previousElection = electionTimers.get(cleanEventName);
    if(previousElection) clearTimeoutFn?.(previousElection);
    const electionTimer = setTimeoutFn?.(()=>{
      electionTimers.delete(cleanEventName);
      const currentLease = readLease(sharedLeaseKey);
      if(
        currentLease?.ownerId !== ownerId
        || Number(currentLease?.at || 0) !== at
        || !payloadCovers(cleanEventName, currentLease?.payload, normalizedPayload)
      ){
        entry.inFlightUntil = 0;
        return;
      }
      const sentAt = Number(now()) || Date.now();
      sendNow({
        entry,
        eventName:cleanEventName,
        key:sharedLeaseKey,
        payload,
        normalizedPayload,
        policy,
        at:sentAt,
        send,
        lease:currentLease
      });
    }, CROSS_TAB_ELECTION_MS);
    electionTimer?.unref?.();
    electionTimers.set(cleanEventName, electionTimer);
    return true;
  }

  function markReceived(eventName, payload = {}){
    const cleanEventName = String(eventName || "");
    if(!isBackgroundSyncEvent(cleanEventName)) return false;
    const at = Number(now()) || Date.now();
    const entry = entryFor(cleanEventName);
    entry.lastReceivedAt = at;
    entry.inFlightUntil = 0;
    entry.receivedPayload = normalizePayload(cleanEventName, payload);
    const deferred = deferredRequests.get(cleanEventName);
    if(deferred && payloadCovers(cleanEventName, entry.receivedPayload, deferred.payload)){
      clearDeferred(cleanEventName);
    }
    return true;
  }

  function recordLimited(kind, payload = {}){
    const eventName = String(payload?.eventName || "");
    if(!isBackgroundSyncEvent(eventName)) return null;
    const at = Number(payload?.at || now()) || Date.now();
    const diagnostic = {
      kind:String(kind || "rate:limited"),
      eventName,
      retryAfterMs:Math.max(0, Number(payload?.retryAfterMs || 0)),
      limit:Math.max(0, Number(payload?.limit || 0)),
      windowMs:Math.max(0, Number(payload?.windowMs || 0)),
      at
    };
    const syncState = state();
    syncState.lastLimited = diagnostic;
    syncState.limits.push(diagnostic);
    if(syncState.limits.length > 20){
      syncState.limits.splice(0, syncState.limits.length - 20);
    }
    const entry = entryFor(eventName);
    entry.inFlightUntil = 0;
    logger?.warn?.(
      `[VoidSector] Synchronisation de fond limitee: ${eventName}`,
      diagnostic
    );
    return diagnostic;
  }

  function reset(){
    for(const eventName of deferredRequests.keys()) clearDeferred(eventName);
    for(const timer of electionTimers.values()) clearTimeoutFn?.(timer);
    electionTimers.clear();
    for(const eventName of BACKGROUND_SYNC_EVENTS) removeOwnLease(leaseKey(eventName));
    const syncState = state();
    syncState.entries = {};
    syncState.lastLimited = null;
    syncState.limits = [];
  }

  return {
    request,
    markReceived,
    recordLimited,
    reset
  };
}
