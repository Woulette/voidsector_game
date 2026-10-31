import { loadProfileEntries as defaultLoadProfileEntries, persistProfileEntries as defaultPersistProfileEntries } from "../storage/profileStore.js";
import { completeServerRefineryShipment, completeServerRefineryUpgrades, tickServerRefineryProduction } from "../economy/refinery.js";
import { createDefaultProfile, ensureStarterRepairDrone, ensureStarterShipSelection } from "./profileDefaults.js";
import { createProfileActions } from "./profileActions.js";
import { createProfileMutations } from "./profileMutations.js";
import { sanitizeProfile } from "./profileSanitize.js";
import { createProfileWorldSession } from "./profileWorldSession.js";
import { cloneProfileSnapshot, restoreProfileSnapshot } from "./profilePersistenceResult.js";
import { claimCompletedServerQuests } from "../quests/quests.js";
import { getFirmDefinition, getFirmMapId, normalizeFirmId } from "../../../src/data/firms.js";
import { pilotNameKey, sanitizePilotName } from "./profileIdentity.js";
import { reconcileTutorialProgress, resetTutorialForNewFirm } from "./tutorialActions.js";
import { reservePilotIdentity as defaultReservePilotIdentity } from "../storage/pilotIdentityStore.js";
import { refundRedundantCraftingJob } from "../economy/craftingRecovery.js";
import { persistRetiredShipRecoveries, recoverRetiredShipProfile } from "./retiredShips.js";

export { sanitizeProfile } from "./profileSanitize.js";

export function createProfileManager({
  cleanName,
  logger,
  loadProfileEntries = defaultLoadProfileEntries,
  persistProfileEntries = defaultPersistProfileEntries,
  reservePilotIdentity = defaultReservePilotIdentity,
  onError,
  resolveRankAssignment = null
}){
  const profiles = new Map();
  const persistenceVersions = new Map();
  const deferredPersistenceTimers = new Map();
  const pendingPersistence = new Map();
  const persistenceByKey = new Map();
  const readOnlyProfileSnapshots = new WeakMap();
  let persistenceTail = Promise.resolve();
  let nextPersistenceId = 1;
  let maxPersistencePending = 0;
  let lastPersistenceDurationMs = 0;
  let identityTail = Promise.resolve();

  function errorText(error){
    return error?.stack || error?.message || String(error);
  }

  function accountIdFromProfileKeys(profileKeys = []){
    const accountKey = profileKeys.find(key=>String(key || "").startsWith("account:"));
    return accountKey ? String(accountKey).slice("account:".length) : "";
  }

  function recordProfileError(eventName, error, meta = {}){
    try{
      const profileKeys = Array.isArray(meta.profileKeys) ? meta.profileKeys : [];
      onError?.({
        source:"profile",
        eventName,
        ...meta,
        accountId:meta.accountId || accountIdFromProfileKeys(profileKeys),
        error:errorText(error),
        at:Date.now()
      });
    }catch(logError){
      logger?.warn?.("Unable to record profile error", {error:logError?.message || String(logError)});
    }
  }

  function profileKey(name){
    return cleanName(name).toLowerCase();
  }

  function accountProfileKey(accountId){
    return `account:${String(accountId || "")}`;
  }

  async function load(){
    try{
      const repairedProfiles = new WeakSet();
      const retiredProfiles = new WeakSet();
      const entries = await loadProfileEntries(rawProfile=>{
        const retired = recoverRetiredShipProfile(rawProfile);
        const profile = sanitizeProfile(retired.profile);
        if(retired.changed) retiredProfiles.add(profile);
        if(Number(rawProfile?.questCatalogRevision || 0) < profile.questCatalogRevision
          && Array.isArray(rawProfile?.activeQuestIds)
          && rawProfile.activeQuestIds.some(id=>!profile.activeQuestIds.includes(id))){
          repairedProfiles.add(profile);
        }
        return profile;
      });
      await persistRetiredShipRecoveries(entries, retiredProfiles, persistProfileEntries);
      profiles.clear();
      persistenceVersions.clear();
      for(const [key, profile] of entries){
        profiles.set(key, profile);
        persistenceVersions.set(key, Math.max(0, Number(profile?.updatedAt || 0)));
      }
      // Persist repairs even for offline accounts. A failed financial repair
      // restores the unpaid snapshot so it can be retried without double gain.
      for(const [key, profile] of entries){
        const previous = profile.craftingJob ? cloneProfileSnapshot(profile) : null;
        const recovery = refundRedundantCraftingJob(profile);
        if(!repairedProfiles.has(profile) && !recovery.ok) continue;
        try{
          await persist(key);
        }catch(error){
          if(recovery.ok && previous) profiles.set(key, previous);
          throw error;
        }
      }
    }catch(error){
      logger?.warn?.("Unable to load profiles", {error:error?.message || String(error)});
      recordProfileError("profiles:load", error);
      if(error?.retiredShipRecovery) throw error;
    }
  }

  function persist(key = null){
    try{
      const keys = key === null ? [...profiles.keys()] : [String(key || "")];
      for(const entryKey of keys){
        const timer = deferredPersistenceTimers.get(entryKey);
        if(timer) clearTimeout(timer);
        deferredPersistenceTimers.delete(entryKey);
      }
      const entries = keys.map(entryKey=>{
        const profile = profiles.get(entryKey);
        if(!profile) return null;
        const previousVersion = Math.max(0, Number(persistenceVersions.get(entryKey) || 0));
        profile.updatedAt = Math.max(
          previousVersion + 1,
          Math.max(0, Number(profile.updatedAt || 0))
        );
        persistenceVersions.set(entryKey, profile.updatedAt);
        return [entryKey, JSON.parse(JSON.stringify(profile))];
      }).filter(Boolean);
      if(!entries.length) return Promise.resolve();
      const persistenceId = nextPersistenceId++;
      const enqueuedAt = Date.now();
      pendingPersistence.set(persistenceId, enqueuedAt);
      maxPersistencePending = Math.max(maxPersistencePending, pendingPersistence.size);
      const operation = persistenceTail
        .catch(()=>{})
        .then(()=>persistProfileEntries(entries));
      persistenceTail = operation;
      for(const entryKey of keys) persistenceByKey.set(entryKey, operation);
      const completePersistence = ()=>{
        pendingPersistence.delete(persistenceId);
        lastPersistenceDurationMs = Math.max(0, Date.now() - enqueuedAt);
        for(const entryKey of keys){
          if(persistenceByKey.get(entryKey) === operation) persistenceByKey.delete(entryKey);
        }
      };
      operation.then(completePersistence, completePersistence);
      operation.catch(error=>{
        logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
        recordProfileError("profiles:persist", error, {profileKeys:keys});
      });
      return operation;
    }catch(error){
      logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
      recordProfileError("profiles:persist", error, {profileKeys:key === null ? ["*"] : [String(key || "")]});
      return Promise.reject(error);
    }
  }

  function getPersistenceMetrics(){
    const queuedAt = [...pendingPersistence.values()];
    const oldestQueuedAt = queuedAt.length ? Math.min(...queuedAt) : 0;
    return {
      pending:pendingPersistence.size,
      maxPending:maxPersistencePending,
      oldestAgeMs:oldestQueuedAt ? Math.max(0, Date.now() - oldestQueuedAt) : 0,
      lastDurationMs:lastPersistenceDurationMs
    };
  }

  function persistDeferred(key, delayMs = 500){
    const cleanKey = String(key || "");
    if(!cleanKey || deferredPersistenceTimers.has(cleanKey)) return;
    const timer = setTimeout(()=>{
      deferredPersistenceTimers.delete(cleanKey);
      persist(cleanKey);
    }, Math.max(0, Number(delayMs || 0)));
    timer.unref?.();
    deferredPersistenceTimers.set(cleanKey, timer);
  }

  async function flushPersistence(){
    const pendingKeys = [...deferredPersistenceTimers.keys()];
    for(const key of pendingKeys){
      clearTimeout(deferredPersistenceTimers.get(key));
      deferredPersistenceTimers.delete(key);
      persist(key);
    }
    await persistenceTail;
  }

  function advanceRefineryState(profile, now = Date.now()){
    if(!profile) return false;
    const changed = Boolean(
      tickServerRefineryProduction(profile, now)
      || completeServerRefineryUpgrades(profile, now)
      || completeServerRefineryShipment(profile, now)
    );
    if(changed) profile.updatedAt = now;
    return changed;
  }

  function autoClaimCompletedQuests(profile, now = Date.now()){
    if(!profile) return [];
    const claimed = claimCompletedServerQuests(profile).claimed || [];
    if(claimed.length) profile.updatedAt = now;
    return claimed;
  }

  function emitQuestClaims(socket, claimedQuests = []){
    if(!socket || !Array.isArray(claimedQuests) || !claimedQuests.length) return;
    const at = Date.now();
    for(const claim of claimedQuests){
      socket.emit("quest:claimed", {
        id:claim.quest?.id,
        title:claim.quest?.title,
        reward:claim.reward || {},
        auto:true,
        at
      });
    }
  }

  function sameClientPreferenceFields(left = {}, right = {}){
    return JSON.stringify(left.actionSlots ?? null) === JSON.stringify(right.actionSlots ?? null)
      && JSON.stringify(left.actionSlotsByShip ?? null) === JSON.stringify(right.actionSlotsByShip ?? null)
      && JSON.stringify(left.lastLaserAmmoId ?? null) === JSON.stringify(right.lastLaserAmmoId ?? null);
  }

  function clientPreferenceUpdatedAt(profile = {}){
    return Math.max(0, Number(profile.actionSlotsUpdatedAt || 0));
  }

  function ensureProfileIdentity(profile, player){
    if(!profile) return false;
    let changed = false;
    const currentName = cleanName(profile.player?.name || "");
    const fallbackName = cleanName(player?.account?.username || player?.name || "NOVA-37");
    if(!profile.player || typeof profile.player !== "object") profile.player = {};
    if(!currentName || currentName === "NOVA-37"){
      profile.player.name = fallbackName || "NOVA-37";
      changed = true;
    }else profile.player.name = currentName;
    const nextFirm = normalizeFirmId(profile.player.firmId || player?.account?.firmId || "astra");
    if(profile.player.firmId !== nextFirm){
      profile.player.firmId = nextFirm;
      changed = true;
    }
    profile.player.firmSelected = Boolean(profile.player.firmSelected);
    return changed;
  }

  function syncForSocket(socket, player){
    if(!player) return;
    const accountKey = player.accountId ? accountProfileKey(player.accountId) : null;
    const accountProfile = accountKey ? profiles.get(accountKey) : null;
    if(accountProfile){
      const starterChanged = ensureStarterRepairDrone(accountProfile);
      const starterShipChanged = ensureStarterShipSelection(accountProfile);
      const refineryChanged = advanceRefineryState(accountProfile);
      const identityChanged = ensureProfileIdentity(accountProfile, player);
      player.name = accountProfile.player?.name || player.name;
      const claimedQuests = autoClaimCompletedQuests(accountProfile);
      const tutorialChanged = reconcileTutorialProgress(accountProfile);
      if(refineryChanged || starterChanged || starterShipChanged || identityChanged || claimedQuests.length || tutorialChanged){
        if(starterChanged || starterShipChanged || identityChanged) accountProfile.updatedAt = Date.now();
        profiles.set(accountKey, sanitizeProfile(accountProfile));
        persist(accountKey);
      }
      emitQuestClaims(socket, claimedQuests);
      socket.emit("profile:sync", accountProfile);
      if(tutorialChanged) socket.emit("tutorial:updated", {tutorial:accountProfile.tutorial, recovered:true, source:"profile:sync", at:Date.now()});
      return;
    }
    if(accountKey){
      const next = sanitizeProfile({
        ...getExistingProfile(player).profile,
        updatedAt:Date.now()
      });
      const starterChanged = ensureStarterRepairDrone(next);
      const starterShipChanged = ensureStarterShipSelection(next);
      ensureProfileIdentity(next, player);
      player.name = next.player?.name || player.name;
      if(starterChanged || starterShipChanged) next.updatedAt = Date.now();
      next.updatedAt = Math.max(Number(next.updatedAt || 0), Date.now());
      const claimedQuests = autoClaimCompletedQuests(next);
      const tutorialChanged = reconcileTutorialProgress(next);
      profiles.set(accountKey, next);
      persist(accountKey);
      emitQuestClaims(socket, claimedQuests);
      socket.emit("profile:sync", next);
      if(tutorialChanged) socket.emit("tutorial:updated", {tutorial:next.tutorial, recovered:true, source:"profile:sync", at:Date.now()});
      return;
    }
    const legacyProfile = profiles.get(profileKey(player.name));
    if(!legacyProfile) return;
    const starterChanged = ensureStarterRepairDrone(legacyProfile);
    const starterShipChanged = ensureStarterShipSelection(legacyProfile);
    const refineryChanged = advanceRefineryState(legacyProfile);
    const identityChanged = ensureProfileIdentity(legacyProfile, player);
    player.name = legacyProfile.player?.name || player.name;
    const claimedQuests = autoClaimCompletedQuests(legacyProfile);
    const tutorialChanged = reconcileTutorialProgress(legacyProfile);
    if(refineryChanged || starterChanged || starterShipChanged || identityChanged || claimedQuests.length || tutorialChanged){
      if(starterChanged || starterShipChanged || identityChanged) legacyProfile.updatedAt = Date.now();
      const legacyKey = profileKey(player.name);
      profiles.set(legacyKey, sanitizeProfile(legacyProfile));
      persist(legacyKey);
    }
    emitQuestClaims(socket, claimedQuests);
    socket.emit("profile:sync", legacyProfile);
    if(tutorialChanged) socket.emit("tutorial:updated", {tutorial:legacyProfile.tutorial, recovered:true, source:"profile:sync", at:Date.now()});
  }

  function saveFromPayload({player, payload} = {}){
    if(!player) return null;
    if(!player.accountId){
      logger?.warn?.("Rejected unauthenticated profile save", {playerId:player.id || null});
      return null;
    }
    const key = accountProfileKey(player.accountId);
    const rawProfile = payload?.profile && typeof payload.profile === "object" ? payload.profile : {};
    const incomingHasPreferenceTimestamp = Object.hasOwn(rawProfile, "actionSlotsUpdatedAt");
    const incoming = sanitizeProfile(rawProfile);
    const existing = profiles.get(key);
    const previousSnapshot = existing ? sanitizeProfile(existing) : null;
    const refineryChanged = existing ? advanceRefineryState(existing) : false;
    const incomingPreferenceUpdatedAt = clientPreferenceUpdatedAt(incoming);
    const existingPreferenceUpdatedAt = existing ? clientPreferenceUpdatedAt(existing) : 0;
    const preferencesMatch = existing ? sameClientPreferenceFields(existing, incoming) : false;
    const hasStaleClientPreferences = existing && incomingPreferenceUpdatedAt < existingPreferenceUpdatedAt;
    const hasDivergentSameVersionPreferences = existing
      && incomingPreferenceUpdatedAt === existingPreferenceUpdatedAt
      && !preferencesMatch;
    if(hasStaleClientPreferences || hasDivergentSameVersionPreferences){
      let persistence = persistenceByKey.get(key) || Promise.resolve();
      if(refineryChanged){
        profiles.set(key, sanitizeProfile(existing));
        persistence = persist(key);
      }
      const canonical = sanitizeProfile(existing);
      return {
        profile:canonical,
        claimedQuests:[],
        conflict:true,
        status:"conflict",
        reason:hasStaleClientPreferences ? "stale-preferences" : "divergent-preferences",
        acknowledgedAt:Math.max(0, Number(incoming.updatedAt || 0)),
        serverUpdatedAt:Math.max(0, Number(canonical.updatedAt || 0)),
        actionSlotsUpdatedAt:existingPreferenceUpdatedAt,
        persistence
      };
    }
    const base = existing ? sanitizeProfile(existing) : createDefaultProfile();
    const starterChanged = ensureStarterRepairDrone(base);
    const starterShipChanged = ensureStarterShipSelection(base);
    const next = sanitizeProfile({
      ...base,
      actionSlots:incoming.actionSlots,
      actionSlotsByShip:incoming.actionSlotsByShip,
      actionSlotsUpdatedAt:Math.max(incomingPreferenceUpdatedAt, existingPreferenceUpdatedAt),
      lastLaserAmmoId:incoming.lastLaserAmmoId,
      updatedAt:Date.now()
    });
    const identityChanged = ensureProfileIdentity(next, player);
    const claimedQuests = autoClaimCompletedQuests(next);
    const preferencesChanged = !sameClientPreferenceFields(base, next);
    const preferenceTimestampChanged = incomingHasPreferenceTimestamp && Number(next.actionSlotsUpdatedAt || 0) > Number(base.actionSlotsUpdatedAt || 0);
    if(!refineryChanged && !starterChanged && !starterShipChanged && !identityChanged && !claimedQuests.length && !preferencesChanged && !preferenceTimestampChanged){
      return {
        profile:base,
        claimedQuests:[],
        unchanged:true,
        status:"unchanged",
        acknowledgedAt:Math.max(0, Number(incoming.updatedAt || 0)),
        serverUpdatedAt:Math.max(0, Number(base.updatedAt || 0)),
        actionSlotsUpdatedAt:existingPreferenceUpdatedAt,
        persistence:persistenceByKey.get(key) || Promise.resolve()
      };
    }
    if(starterChanged || starterShipChanged) next.updatedAt = Date.now();
    profiles.set(key, next);
    const persistence = persist(key).catch(error=>{
      if(profiles.get(key) === next){
        if(previousSnapshot) profiles.set(key, previousSnapshot);
        else profiles.delete(key);
      }
      throw error;
    });
    persistenceByKey.set(key, persistence);
    const clearTrackedPersistence = ()=>{
      if(persistenceByKey.get(key) === persistence) persistenceByKey.delete(key);
    };
    persistence.then(clearTrackedPersistence, clearTrackedPersistence);
    return {
      profile:next,
      claimedQuests,
      status:"saved",
      acknowledgedAt:Math.max(0, Number(incoming.updatedAt || 0)),
      serverUpdatedAt:Math.max(0, Number(next.updatedAt || 0)),
      actionSlotsUpdatedAt:Math.max(0, Number(next.actionSlotsUpdatedAt || 0)),
      persistence
    };
  }

  function getExistingProfile(player, {advanceRefinery = true} = {}){
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key);
    if(existing){
      const starterChanged = ensureStarterRepairDrone(existing);
      const starterShipChanged = ensureStarterShipSelection(existing);
      const refineryChanged = advanceRefinery ? advanceRefineryState(existing) : false;
      if(refineryChanged || starterChanged || starterShipChanged){
        if(starterChanged || starterShipChanged) existing.updatedAt = Date.now();
        profiles.set(key, sanitizeProfile(existing));
        persist(key);
      }
      return {key, profile:existing};
    }
    return {
      key,
      profile:createDefaultProfile()
    };
  }

  function getProfileSnapshotForPlayer(player, {advanceRefinery = false} = {}){
    if(!player) return null;
    const {profile} = getExistingProfile(player, {advanceRefinery});
    const cached = readOnlyProfileSnapshots.get(profile);
    if(cached) return cached;
    const snapshot = sanitizeProfile(profile);
    readOnlyProfileSnapshots.set(profile, snapshot);
    return snapshot;
  }

  const profileKeyForPlayer = player=>player?.accountId ? accountProfileKey(player.accountId) : profileKey(player?.name || "Pilote");

  function findProfileEntryByPilotName(name){
    const target = cleanName(name).toLowerCase();
    if(!target) return null;
    for(const [key, profile] of profiles.entries()){
      if(cleanName(profile?.player?.name || "").toLowerCase() === target) return {key, profile};
    }
    return null;
  }

  function getProfileEntry(key){
    const profile = profiles.get(String(key || ""));
    return profile ? {key:String(key), profile} : null;
  }

  function updateProfileByKey(key, update){
    const cleanKey = String(key || "");
    const existing = profiles.get(cleanKey);
    if(!existing || typeof update !== "function") return null;
    const draft = sanitizeProfile(existing);
    const result = update(draft);
    if(result === false) return null;
    draft.updatedAt = Date.now();
    const next = sanitizeProfile(draft);
    profiles.set(cleanKey, next);
    persist(cleanKey);
    return next;
  }

  function listProfileEntries(){
    return [...profiles.entries()].map(([key, profile])=>({key, profile}));
  }

  async function setupProfileInternal({player, name, firmId} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const key = profileKeyForPlayer(player);
    const existing = getExistingProfile(player).profile;
    const previous = cloneProfileSnapshot(existing);
    const profile = sanitizeProfile(existing);
    ensureProfileIdentity(profile, player);
    const currentFirm = normalizeFirmId(profile.player?.firmId || "astra");
    const nextFirm = normalizeFirmId(firmId || currentFirm);
    if(profile.player?.firmSelected && currentFirm !== nextFirm){
      return {ok:false, reason:"Firme deja selectionnee pour ce compte."};
    }
    const pilotName = sanitizePilotName(
      name || profile.player?.name || player.account?.username || player.name || "NOVA-37",
      ""
    );
    if(!pilotName) return {ok:false, reason:"Nom de pilote invalide."};
    const targetNameKey = pilotNameKey(pilotName);
    const duplicate = [...profiles.entries()].find(([entryKey, entryProfile])=>
      entryKey !== key
      && entryProfile?.player?.firmSelected
      && pilotNameKey(entryProfile?.player?.name) === targetNameKey
    );
    if(duplicate) return {ok:false, reason:"Nom de pilote deja utilise."};
    const reservation = await reservePilotIdentity({
      accountId:player.accountId,
      pilotName
    });
    if(!reservation?.ok){
      return {ok:false, reason:reservation?.reason || "Nom de pilote deja utilise."};
    }
    profile.player = {
      ...profile.player,
      name:pilotName,
      firmId:nextFirm,
      firmSelected:true
    };
    let homeMap = null;
    if(currentFirm !== nextFirm){
      profile.activeQuestIds = [];
      profile.activeQuestId = null;
      profile.questProgress = {};
      profile.questFailProgress = {};
      resetTutorialForNewFirm(profile);
      const firm = getFirmDefinition(nextFirm);
      homeMap = String(getFirmMapId(firm.id, 1));
      profile.worldSession = null;
      profile.shipWorldSessions = {};
    }
    profile.updatedAt = Date.now();
    ensureStarterRepairDrone(profile);
    ensureStarterShipSelection(profile);
    const next = sanitizeProfile(profile);
    profiles.set(key, next);
    try{
      await persist(key);
    }catch(error){
      restoreProfileSnapshot(profiles, key, previous);
      throw error;
    }
    player.name = pilotName;
    player.firmId = nextFirm;
    if(player.account) player.account.firmId = nextFirm;
    if(homeMap !== null) player.mapId = homeMap;
    return {ok:true, profile:profiles.get(key), firm:getFirmDefinition(nextFirm), firmChanged:currentFirm !== nextFirm};
  }

  function setupProfileForPlayer(input = {}){
    const operation = identityTail
      .catch(()=>{})
      .then(()=>setupProfileInternal(input));
    identityTail = operation;
    return operation;
  }

  const {
    applyReward,
    applyCombatReward,
    spendForPlayer,
    updateProfileForPlayer,
    updateCombatProfileForPlayer
  } = createProfileMutations({profiles, persist, persistDeferred, profileKeyForPlayer, getExistingProfile});

  const {
    addAmmoPurchase,
    addItemPurchase,
    addBoosterPurchase,
    grantBooster,
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
    addPremiumPackPurchase,
    addBetaPackPurchase,
    claimPremiumReward,
    claimBetaReward,
    sellInventoryItem,
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    applyProgressionAction
  } = createProfileActions({profiles, persist, getExistingProfile});

  const {
    getProfileForPlayer,
    getShipWorldSessionForPlayer,
    getWorldSessionForPlayer,
    saveWorldSession
  } = createProfileWorldSession({profiles, persist, getExistingProfile});

  return {
    load,
    getRankAssignmentForKey:(key, profile)=>resolveRankAssignment?.(key, profile) || null,
    flushPersistence,
    syncForSocket,
    saveFromPayload,
    applyReward,
    applyCombatReward,
    spendForPlayer,
    updateProfileForPlayer,
    updateCombatProfileForPlayer,
    addAmmoPurchase,
    addItemPurchase,
    addBoosterPurchase,
    grantBooster,
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
    addPremiumPackPurchase,
    addBetaPackPurchase,
    claimPremiumReward,
    claimBetaReward,
    sellInventoryItem,
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    applyProgressionAction,
    getProfileForPlayer,
    getProfileSnapshotForPlayer,
    getShipWorldSessionForPlayer,
    getWorldSessionForPlayer,
    saveWorldSession,
    getPersistenceMetrics,
    setupProfileForPlayer,
    findProfileEntryByPilotName,
    getProfileEntry,
    updateProfileByKey,
    listProfileEntries,
    profileKeyForPlayer,
    profileKey,
    accountProfileKey
  };
}
