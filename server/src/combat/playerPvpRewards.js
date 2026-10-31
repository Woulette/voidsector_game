import { applyFriendlyKillPenalty, normalizeReputation } from "../../../src/shared/reputation.js";
import { appendProfileActivity } from "../players/activityLog.js";
import { updateRankScore } from "../players/rankProgression.js";
import { waitForProfileSave } from "../players/profilePersistenceResult.js";
import { getFirmHitOwner } from "../firms/firmHitOwnership.js";
import { buildPersonalFirmSeasonSnapshot, emitThrottledFirmRanking } from "../firms/firmBroadcasts.js";
import { playerFirm } from "./pvpDiscipline.js";

export function createPlayerPvpRewardManager({
  io, players, profileManager, firmWarManager, aggression,
  emitProfileSyncForPlayer, accountSocketsForPlayer, onProfileChanged = ()=>{}, onError = ()=>{}
}){
  const settledLives = new WeakMap();

  function emitPersonal(player, name, event){
    for(const accountPlayer of accountSocketsForPlayer(player)){
      if(accountPlayer.clientMode === "game") io.to(accountPlayer.id).emit(name, event);
    }
  }

  async function settleKill({attacker, target, now = Date.now()}){
    const generation = Number(target.combatLifeGeneration || 0);
    if(settledLives.get(target) === generation) return {ok:false, duplicate:true};
    settledLives.set(target, generation);
    const attackerProfile = profileManager.getProfileForPlayer(attacker);
    const targetProfile = profileManager.getProfileForPlayer(target);
    const kind = aggression.classifyKill(attacker, target, attackerProfile, targetProfile, now);
    const firmAttacker = getFirmHitOwner(target, players, now) || attacker;
    delete target.firmHitOwnerKey;
    delete target.firmHitOwnerLastAt;
    aggression.finishLife(target);
    try{
      if(kind === "friendly"){
        const result = profileManager.updateProfileForPlayer({player:attacker, update:profile=>{
          const penalty = applyFriendlyKillPenalty(profile.player, now);
          updateRankScore(profile);
          appendProfileActivity(profile, {
            type:"friendly_fire_penalty", severity:"danger", label:"Pilote allié détruit",
            detail:`${targetProfile?.player?.name || target.name || "Pilote"} : -${penalty.penalty} réputation.`,
            data:{targetKey:profileManager.profileKeyForPlayer(target), ...penalty}
          }, now);
          return {ok:true, ...penalty};
        }});
        if(!result.ok) return result;
        await waitForProfileSave(result);
        const profile = profileManager.getProfileForPlayer(attacker);
        emitProfileSyncForPlayer(attacker, profile);
        onProfileChanged(attacker, profile);
        emitPersonal(attacker, "pvp:penalty", {
          penalty:result.penalty, reputation:profile.player.reputation,
          resetsAt:result.resetsAt, targetName:targetProfile?.player?.name || target.name || "Pilote", at:now
        });
        return {ok:true, kind, penalty:result.penalty};
      }
      if(kind !== "enemy"){
        emitPersonal(attacker, "pvp:neutral", {kind, targetName:targetProfile?.player?.name || target.name || "Pilote", at:now});
        return {ok:true, kind};
      }

      const firmAttackerProfile = profileManager.getProfileForPlayer(firmAttacker);
      const sameRewardAccount = profileManager.profileKeyForPlayer(firmAttacker) === profileManager.profileKeyForPlayer(attacker);
      const firmId = playerFirm(firmAttacker, firmAttackerProfile);
      // A friendly first hit must never obtain enemy objectives through somebody else's final shot.
      const firmKill = firmId !== playerFirm(target, targetProfile)
        ? firmWarManager.recordPlayerKill({
          attacker:{key:profileManager.profileKeyForPlayer(firmAttacker), name:firmAttackerProfile?.player?.name || firmAttacker.name || "Pilote", firmId},
          targetKey:profileManager.profileKeyForPlayer(target)
        }) : {points:0};
      if(firmKill.snapshot) emitThrottledFirmRanking({io, profileManager, snapshot:firmKill.snapshot});
      const personalAttempt = sameRewardAccount && firmKill.count
        ? firmKill
        : firmWarManager.recordPvpRewardAttempt({playerKey:profileManager.profileKeyForPlayer(attacker), targetKey:profileManager.profileKeyForPlayer(target)});
      if(personalAttempt.exhausted){
        emitPersonal(attacker, "pvp:neutral", {kind:"repeat-limit", targetName:targetProfile?.player?.name || target.name || "Pilote", at:now});
        return {ok:true, kind:"repeat-limit"};
      }
      const targetLevel = Math.max(1, Math.floor(Number(targetProfile?.player?.level || target.state?.level || 1)));
      const reputation = Math.round(targetLevel * 1_000 * personalAttempt.reputationMultiplier);
      const result = profileManager.updateProfileForPlayer({player:attacker, update:profile=>{
        profile.player.reputation = normalizeReputation(normalizeReputation(profile.player.reputation) + reputation);
        profile.player.totalPlayerKills = Math.max(0, Number(profile.player.totalPlayerKills || 0)) + 1;
        updateRankScore(profile);
        return {ok:true, changed:true};
      }});
      if(!result.ok) return result;
      await waitForProfileSave(result);
      const profile = profileManager.getProfileForPlayer(attacker);
      emitProfileSyncForPlayer(attacker, profile);
      onProfileChanged(attacker, profile);
      const firmSnapshot = buildPersonalFirmSeasonSnapshot({
        firmWarManager, profileManager, playerKey:profileManager.profileKeyForPlayer(firmAttacker),
        profile:sameRewardAccount ? profile : firmAttackerProfile, player:firmAttacker
      });
      for(const accountPlayer of accountSocketsForPlayer(firmAttacker)){
        if(firmSnapshot) io.to(accountPlayer.id).emit("firm:snapshot", firmSnapshot);
      }
      emitPersonal(attacker, "player:reward", {
        rewardId:`pvp:${target.id}:${attacker.id}:${now}`, enemyId:`player:${target.id}`,
        enemyType:"Joueur", enemyName:targetProfile?.player?.name || target.name || "Pilote",
        enemyLevel:targetLevel, mapId:String(attacker.mapId ?? ""), share:1, killerId:attacker.id,
        credits:0, xp:0, premium:0, reputation, rankPoints:0,
        firmPoints:sameRewardAccount ? firmKill.points : 0,
        rewardAppliedByServer:true, at:now
      });
      return {ok:true, kind, reputation};
    }catch(error){
      onError(error);
      emitPersonal(attacker, "pvp:error", {message:"Résultat PvP non confirmé : sauvegarde indisponible.", at:now});
      return {ok:false, reason:"PVP_SAVE_FAILED"};
    }
  }
  return {settleKill};
}
