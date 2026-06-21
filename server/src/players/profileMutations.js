import { applyProgressionReward, spendCurrency } from "./progression.js";
import { applyServerReputationFromXp, registerServerMonsterKill, updateRankScore } from "./rankProgression.js";
import { sanitizeProfile } from "./profileSanitize.js";
import { appendProfileActivity } from "./activityLog.js";

export function createProfileMutations({profiles, persist, persistDeferred, profileKeyForPlayer, getExistingProfile}){
  function applyRewardChanges(profile, reward = {}){
    profile.updatedAt = Date.now();
    profile.player = applyProgressionReward(profile.player || {}, reward);
    if(reward?.enemyKind || reward?.enemyType){
      registerServerMonsterKill(profile, {
        kind:reward.enemyKind || reward.enemyType
      });
      const enemyLabel = String(reward.enemyName || reward.enemyKind || reward.enemyType || "Monstre");
      appendProfileActivity(profile, {
        type:"monster_kill",
        label:"Mob tue",
        detail:`${enemyLabel} niv. ${Math.max(1, Number(reward.enemyLevel || 1))} - +${Math.max(0, Math.round(Number(reward.xp || 0)))} XP, +${Math.max(0, Math.round(Number(reward.credits || 0)))} credits, +${Math.max(0, Math.round(Number(reward.premium || 0)))} NOVA.`,
        data:{
          enemyKind:reward.enemyKind || reward.enemyType || "",
          enemyLevel:Math.max(1, Number(reward.enemyLevel || 1)),
          xp:Math.max(0, Math.round(Number(reward.xp || 0))),
          credits:Math.max(0, Math.round(Number(reward.credits || 0))),
          premium:Math.max(0, Math.round(Number(reward.premium || 0)))
        }
      });
    }
    applyServerReputationFromXp(profile, reward?.xp);
    updateRankScore(profile);
    return profile;
  }

  function applyReward({player, reward} = {}){
    if(!player) return null;
    const key = profileKeyForPlayer(player);
    const existing = profiles.get(key) || sanitizeProfile({updatedAt:Date.now(), player:{}});
    const draft = applyRewardChanges({
      ...existing,
      player:{...(existing.player || {})},
      killStats:{...(existing.killStats || {})},
      rankKillStats:{...(existing.rankKillStats || {})},
      activityLog:[...(existing.activityLog || [])]
    }, reward);
    const next = sanitizeProfile(draft);
    profiles.set(key, next);
    persist(key);
    return next;
  }

  function applyCombatReward({player, reward} = {}){
    if(!player) return null;
    const {key, profile} = getExistingProfile(player);
    applyRewardChanges(profile, reward);
    profiles.set(key, profile);
    if(typeof persistDeferred === "function") persistDeferred(key, 500);
    else persist(key);
    return profile;
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
    persist(key);
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
    persist(key);
    return {...(result || {ok:true}), ok:true, profile:next};
  }

  function updateCombatProfileForPlayer({player, update} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const result = typeof update === "function" ? update(profile) : {ok:true};
    if(result && result.ok === false) return result;
    profile.updatedAt = Date.now();
    profiles.set(key, profile);
    if(typeof persistDeferred === "function") persistDeferred(key, 500);
    else persist(key);
    return {...(result || {ok:true}), ok:true, profile};
  }

  return {
    applyReward,
    applyCombatReward,
    spendForPlayer,
    updateProfileForPlayer,
    updateCombatProfileForPlayer
  };
}
