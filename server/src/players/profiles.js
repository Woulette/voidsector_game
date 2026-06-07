import { loadProfileEntries, persistProfileEntries } from "../storage/profileStore.js";
import { completeServerRefineryShipment, completeServerRefineryUpgrades, tickServerRefineryProduction } from "../economy/refinery.js";
import { preserveProtectedProgression } from "./progression.js";
import { createDefaultProfile, ensureStarterRepairDrone } from "./profileDefaults.js";
import { createProfileActions } from "./profileActions.js";
import { createProfileMutations } from "./profileMutations.js";
import { preserveProtectedOwnership, sanitizeProfile } from "./profileSanitize.js";
import { createProfileWorldSession } from "./profileWorldSession.js";
import { claimCompletedServerQuests } from "../quests/quests.js";
import { getFirmDefinition, getFirmMapId, normalizeFirmId } from "../../../src/data/firms.js";

export { sanitizeProfile } from "./profileSanitize.js";

export function createProfileManager({cleanName, logger}){
  const profiles = new Map();

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
      for(const [key, profile] of entries) profiles.set(key, profile);
    }catch(error){
      logger?.warn?.("Unable to load profiles", {error:error?.message || String(error)});
    }
  }

  function persist(){
    try{
      persistProfileEntries([...profiles.entries()]).catch(error=>{
        logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
      });
    }catch(error){
      logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
    }
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
        persist();
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
      persist();
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
      profiles.set(profileKey(player.name), sanitizeProfile(legacyProfile));
      persist();
    }
    emitQuestClaims(socket, claimedQuests);
    socket.emit("profile:sync", legacyProfile);
  }

  function saveFromPayload({player, payload} = {}){
    if(!player) return null;
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(payload?.name || player.name);
    const incoming = sanitizeProfile(payload?.profile || {});
    const existing = profiles.get(key);
    const refineryChanged = existing ? advanceRefineryState(existing) : false;
    if(existing && Number(incoming.updatedAt || 0) < Number(existing.updatedAt || 0)){
      if(refineryChanged){
        profiles.set(key, sanitizeProfile(existing));
        persist();
      }
      return null;
    }
    if(existing?.player) incoming.player = preserveProtectedProgression({
      incomingPlayer:incoming.player,
      existingPlayer:existing.player
    });
    preserveProtectedOwnership(incoming, existing);
    const claimedQuests = autoClaimCompletedQuests(incoming);
    profiles.set(key, incoming);
    persist();
    return {profile:incoming, claimedQuests};
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
        persist();
      }
      return {key, profile:existing};
    }
    return {
      key,
      profile:createDefaultProfile()
    };
  }

  const profileKeyForPlayer = player=>player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);

  function setupProfileForPlayer({player, name, firmId} = {}){
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
    const pilotName = cleanName(name || profile.player?.name || player.account?.username || player.name || "NOVA-37");
    if(!pilotName) return {ok:false, reason:"Nom de pilote invalide."};
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
    persist();
    return {ok:true, profile:profiles.get(key), firm:getFirmDefinition(nextFirm)};
  }

  const {
    applyReward,
    spendForPlayer,
    updateProfileForPlayer
  } = createProfileMutations({profiles, persist, profileKeyForPlayer, getExistingProfile});

  const {
    addAmmoPurchase,
    addItemPurchase,
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
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
    syncForSocket,
    saveFromPayload,
    applyReward,
    spendForPlayer,
    updateProfileForPlayer,
    addAmmoPurchase,
    addItemPurchase,
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
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
    profileKey,
    accountProfileKey
  };
}
