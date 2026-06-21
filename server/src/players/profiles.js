import { loadProfileEntries as defaultLoadProfileEntries, persistProfileEntries as defaultPersistProfileEntries } from "../storage/profileStore.js";
import { completeServerRefineryShipment, completeServerRefineryUpgrades, tickServerRefineryProduction } from "../economy/refinery.js";
import { createDefaultProfile, ensureStarterRepairDrone } from "./profileDefaults.js";
import { createProfileActions } from "./profileActions.js";
import { createProfileMutations } from "./profileMutations.js";
import { sanitizeProfile } from "./profileSanitize.js";
import { createProfileWorldSession } from "./profileWorldSession.js";
import { claimCompletedServerQuests } from "../quests/quests.js";
import { getFirmDefinition, getFirmMapId, normalizeFirmId } from "../../../src/data/firms.js";
import { pilotNameKey, sanitizePilotName } from "./profileIdentity.js";
import { reservePilotIdentity as defaultReservePilotIdentity } from "../storage/pilotIdentityStore.js";

export { sanitizeProfile } from "./profileSanitize.js";

export function createProfileManager({
  cleanName,
  logger,
  loadProfileEntries = defaultLoadProfileEntries,
  persistProfileEntries = defaultPersistProfileEntries,
  reservePilotIdentity = defaultReservePilotIdentity
}){
  const profiles = new Map();
  const persistenceVersions = new Map();
  const deferredPersistenceTimers = new Map();
  let persistenceTail = Promise.resolve();
  let identityTail = Promise.resolve();

  function profileKey(name){
    return cleanName(name).toLowerCase();
  }

  function accountProfileKey(accountId){
    return `account:${String(accountId || "")}`;
  }

  async function load(){
    try{
      const entries = await loadProfileEntries(sanitizeProfile);
      profiles.clear();
      persistenceVersions.clear();
      for(const [key, profile] of entries){
        profiles.set(key, profile);
        persistenceVersions.set(key, Math.max(0, Number(profile?.updatedAt || 0)));
      }
    }catch(error){
      logger?.warn?.("Unable to load profiles", {error:error?.message || String(error)});
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
      const operation = persistenceTail
        .catch(()=>{})
        .then(()=>persistProfileEntries(entries));
      persistenceTail = operation;
      operation.catch(error=>{
        logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
      });
      return operation;
    }catch(error){
      logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
      return Promise.reject(error);
    }
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
      const refineryChanged = advanceRefineryState(accountProfile);
      const identityChanged = ensureProfileIdentity(accountProfile, player);
      player.name = accountProfile.player?.name || player.name;
      const claimedQuests = autoClaimCompletedQuests(accountProfile);
      if(refineryChanged || starterChanged || identityChanged || claimedQuests.length){
        if(starterChanged || identityChanged) accountProfile.updatedAt = Date.now();
        profiles.set(accountKey, sanitizeProfile(accountProfile));
        persist(accountKey);
      }
      emitQuestClaims(socket, claimedQuests);
      socket.emit("profile:sync", accountProfile);
      return;
    }
    if(accountKey){
      const next = sanitizeProfile({
        ...getExistingProfile(player).profile,
        updatedAt:Date.now()
      });
      ensureProfileIdentity(next, player);
      player.name = next.player?.name || player.name;
      next.updatedAt = Math.max(Number(next.updatedAt || 0), Date.now());
      const claimedQuests = autoClaimCompletedQuests(next);
      profiles.set(accountKey, next);
      persist(accountKey);
      emitQuestClaims(socket, claimedQuests);
      socket.emit("profile:sync", next);
      return;
    }
    const legacyProfile = profiles.get(profileKey(player.name));
    if(!legacyProfile) return;
    const starterChanged = ensureStarterRepairDrone(legacyProfile);
    const refineryChanged = advanceRefineryState(legacyProfile);
    const identityChanged = ensureProfileIdentity(legacyProfile, player);
    player.name = legacyProfile.player?.name || player.name;
    const claimedQuests = autoClaimCompletedQuests(legacyProfile);
    if(refineryChanged || starterChanged || identityChanged || claimedQuests.length){
      if(starterChanged || identityChanged) legacyProfile.updatedAt = Date.now();
      const legacyKey = profileKey(player.name);
      profiles.set(legacyKey, sanitizeProfile(legacyProfile));
      persist(legacyKey);
    }
    emitQuestClaims(socket, claimedQuests);
    socket.emit("profile:sync", legacyProfile);
  }

  function saveFromPayload({player, payload} = {}){
    if(!player) return null;
    if(!player.accountId){
      logger?.warn?.("Rejected unauthenticated profile save", {playerId:player.id || null});
      return null;
    }
    const key = accountProfileKey(player.accountId);
    const incoming = sanitizeProfile(payload?.profile || {});
    const existing = profiles.get(key);
    const refineryChanged = existing ? advanceRefineryState(existing) : false;
    if(existing && Number(incoming.updatedAt || 0) < Number(existing.updatedAt || 0)){
      if(refineryChanged){
        profiles.set(key, sanitizeProfile(existing));
        persist(key);
      }
      return null;
    }
    const base = existing ? sanitizeProfile(existing) : createDefaultProfile();
    const next = sanitizeProfile({
      ...base,
      actionSlots:incoming.actionSlots,
      actionSlotsByShip:incoming.actionSlotsByShip,
      lastLaserAmmoId:incoming.lastLaserAmmoId,
      updatedAt:Date.now()
    });
    ensureProfileIdentity(next, player);
    const claimedQuests = autoClaimCompletedQuests(next);
    profiles.set(key, next);
    persist(key);
    return {profile:next, claimedQuests};
  }

  function getExistingProfile(player){
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key);
    if(existing){
      const starterChanged = ensureStarterRepairDrone(existing);
      const refineryChanged = advanceRefineryState(existing);
      if(refineryChanged || starterChanged){
        if(starterChanged) existing.updatedAt = Date.now();
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
    if(currentFirm !== nextFirm){
      profile.activeQuestIds = [];
      profile.activeQuestId = null;
      profile.questProgress = {};
      profile.questFailProgress = {};
      const firm = getFirmDefinition(nextFirm);
      const homeMap = String(getFirmMapId(firm.id, 1));
      profile.worldSession = null;
      profile.shipWorldSessions = {};
      player.mapId = homeMap;
    }
    player.name = pilotName;
    if(player.account) player.account.firmId = nextFirm;
    profile.updatedAt = Date.now();
    ensureStarterRepairDrone(profile);
    profiles.set(key, sanitizeProfile(profile));
    persist(key);
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
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
    addPremiumPackPurchase,
    claimPremiumReward,
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
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
    addPremiumPackPurchase,
    claimPremiumReward,
    sellInventoryItem,
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    applyProgressionAction,
    getProfileForPlayer,
    getShipWorldSessionForPlayer,
    getWorldSessionForPlayer,
    saveWorldSession,
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
