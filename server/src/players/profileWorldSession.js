import { sanitizeProfile, sanitizeWorldSession } from "./profileSanitize.js";

export function createProfileWorldSession({profiles, persist, getExistingProfile}){
  function getWorldSessionForPlayer(player){
    if(!player) return null;
    const {profile} = getExistingProfile(player);
    return sanitizeWorldSession(profile.worldSession);
  }

  function getShipWorldSessionForPlayer(player, shipId){
    if(!player || !shipId) return null;
    const {profile} = getExistingProfile(player);
    return sanitizeWorldSession(profile.shipWorldSessions?.[String(shipId)]);
  }

  function getProfileForPlayer(player){
    if(!player) return null;
    const {profile} = getExistingProfile(player);
    return sanitizeProfile(profile);
  }

  function saveWorldSession({player, state, force = false} = {}){
    if(!player || !state) return null;
    const now = Date.now();
    if(!force && now - Number(player.lastWorldSessionPersistAt || 0) < 2000) return null;
    player.lastWorldSessionPersistAt = now;
    const {key, profile} = getExistingProfile(player);
    const session = sanitizeWorldSession({
      ...state,
      updatedAt:now
    });
    if(!session) return null;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:now,
      worldSession:session,
      shipWorldSessions:{
        ...(profile.shipWorldSessions || {}),
        [session.shipId]:session
      }
    });
    profiles.set(key, next);
    persist();
    return next;
  }

  return {
    getProfileForPlayer,
    getWorldSessionForPlayer,
    getShipWorldSessionForPlayer,
    saveWorldSession
  };
}
