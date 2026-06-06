import { applyProgressionReward, spendCurrency } from "./progression.js";
import { sanitizeProfile } from "./profileSanitize.js";

export function createProfileMutations({profiles, persist, profileKeyForPlayer, getExistingProfile}){
  function applyReward({player, reward} = {}){
    if(!player) return null;
    const key = profileKeyForPlayer(player);
    const existing = profiles.get(key) || sanitizeProfile({updatedAt:Date.now(), player:{}});
    const next = sanitizeProfile({
      ...existing,
      updatedAt:Date.now(),
      player:applyProgressionReward(existing.player || {}, reward || {})
    });
    profiles.set(key, next);
    persist();
    return next;
  }

  function spendForPlayer({player, priceType, amount} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const key = profileKeyForPlayer(player);
    const existing = profiles.get(key) || sanitizeProfile({updatedAt:Date.now(), player:{}});
    const result = spendCurrency(existing.player || {}, priceType, amount);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...existing,
      updatedAt:Date.now(),
      player:result.player
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function updateProfileForPlayer({player, update} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const result = typeof update === "function" ? update(profile) : {ok:true};
    if(result && result.ok === false) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...(result || {ok:true}), ok:true, profile:next};
  }

  return {
    applyReward,
    spendForPlayer,
    updateProfileForPlayer
  };
}
