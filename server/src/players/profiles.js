import { loadProfileEntries, persistProfileEntries } from "../storage/profileStore.js";
import { completeServerRefineryShipment, completeServerRefineryUpgrades, tickServerRefineryProduction } from "../economy/refinery.js";
import { preserveProtectedProgression } from "./progression.js";
import { createDefaultProfile, ensureStarterRepairDrone } from "./profileDefaults.js";
import { createProfileActions } from "./profileActions.js";
import { createProfileMutations } from "./profileMutations.js";
import { preserveProtectedOwnership, sanitizeProfile } from "./profileSanitize.js";
import { createProfileWorldSession } from "./profileWorldSession.js";
import { claimCompletedServerQuests } from "../quests/quests.js";

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

  function syncForSocket(socket, player){
    if(!player) return;
    const accountKey = player.accountId ? accountProfileKey(player.accountId) : null;
    const accountProfile = accountKey ? profiles.get(accountKey) : null;
    if(accountProfile){
      const starterChanged = ensureStarterRepairDrone(accountProfile);
      const refineryChanged = advanceRefineryState(accountProfile);
      const claimedQuests = autoClaimCompletedQuests(accountProfile);
      if(refineryChanged || starterChanged || claimedQuests.length){
        if(starterChanged) accountProfile.updatedAt = Date.now();
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
    const claimedQuests = autoClaimCompletedQuests(legacyProfile);
    if(refineryChanged || starterChanged || claimedQuests.length){
      if(starterChanged) legacyProfile.updatedAt = Date.now();
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
    profileKey,
    accountProfileKey
  };
}
