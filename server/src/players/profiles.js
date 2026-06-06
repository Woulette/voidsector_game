import { loadProfileEntries, persistProfileEntries } from "../storage/profileStore.js";
import { completeServerRefineryShipment, completeServerRefineryUpgrades, tickServerRefineryProduction } from "../economy/refinery.js";
import { preserveProtectedProgression } from "./progression.js";
import { createDefaultProfile, ensureStarterRepairDrone } from "./profileDefaults.js";
import { createProfileActions } from "./profileActions.js";
import { createProfileMutations } from "./profileMutations.js";
import { preserveProtectedOwnership, sanitizeProfile } from "./profileSanitize.js";
import { createProfileWorldSession } from "./profileWorldSession.js";

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

  function syncForSocket(socket, player){
    if(!player) return;
    const accountKey = player.accountId ? accountProfileKey(player.accountId) : null;
    const accountProfile = accountKey ? profiles.get(accountKey) : null;
    if(accountProfile){
      if(advanceRefineryState(accountProfile)){
        profiles.set(accountKey, sanitizeProfile(accountProfile));
        persist();
      }
      socket.emit("profile:sync", accountProfile);
      return;
    }
    if(accountKey){
      const next = sanitizeProfile({
        ...getExistingProfile(player).profile,
        updatedAt:Date.now()
      });
      next.updatedAt = Math.max(Number(next.updatedAt || 0), Date.now());
      profiles.set(accountKey, next);
      persist();
      socket.emit("profile:sync", next);
      return;
    }
    const legacyProfile = profiles.get(profileKey(player.name));
    if(!legacyProfile) return;
    if(advanceRefineryState(legacyProfile)){
      profiles.set(profileKey(player.name), sanitizeProfile(legacyProfile));
      persist();
    }
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
    profiles.set(key, incoming);
    persist();
    return incoming;
  }

  function getExistingProfile(player){
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key);
    if(existing){
      const starterChanged = ensureStarterRepairDrone(existing);
      if(advanceRefineryState(existing) || starterChanged){
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
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    applyProgressionAction
  } = createProfileActions({profiles, persist, getExistingProfile});

  const {
    getProfileForPlayer,
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
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    applyProgressionAction,
    getProfileForPlayer,
    getWorldSessionForPlayer,
    saveWorldSession,
    profileKey,
    accountProfileKey
  };
}
