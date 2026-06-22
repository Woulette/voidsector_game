import { sanitizeProfile, sanitizeWorldSession } from "./profileSanitize.js";
import { consumeConnectedBoosterTime } from "../../../src/shared/firmBoosters.js";

export const WORLD_SESSION_SAVE_INTERVAL_MS = 15_000;

export function createProfileWorldSession({profiles, persist, getExistingProfile}){
  function accountServerPlaytime(profile, player, now){
    const previous = Number(player.lastPlaytimeAccountedAt || 0);
    const activeUntil = player.connected === false
      ? Math.min(now, Math.max(0, Number(player.disconnectedAt || previous)))
      : now;
    player.lastPlaytimeAccountedAt = now;
    if(player.clientMode !== "game" || !previous || activeUntil <= previous) return;
    if(!profile.player || typeof profile.player !== "object") profile.player = {};
    const elapsedMs = activeUntil - previous;
    profile.player.totalPlaySeconds = Math.max(0, Number(profile.player.totalPlaySeconds || 0)) + elapsedMs / 1000;
    profile.boosters = consumeConnectedBoosterTime(profile.boosters, elapsedMs);
  }

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

  function saveWorldSession({player, state, force = false, now = Date.now()} = {}){
    if(!player || !state) return null;
    const lastPersistAt = Number(player.lastWorldSessionPersistAt || 0);
    if(!force && lastPersistAt > 0 && now - lastPersistAt < WORLD_SESSION_SAVE_INTERVAL_MS) return null;
    player.lastWorldSessionPersistAt = now;
    const {key, profile} = getExistingProfile(player);
    accountServerPlaytime(profile, player, now);
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
    persist(key);
    return next;
  }

  return {
    getProfileForPlayer,
    getWorldSessionForPlayer,
    getShipWorldSessionForPlayer,
    saveWorldSession
  };
}
