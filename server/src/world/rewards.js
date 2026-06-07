import { calculateMonsterKillRankPoints } from "../../../src/data/ranks.js";

export function createWorldRewardManager({io, players, groups, profileManager, emitProfileSync, firmWarManager}){
  function getSameMapRewardRecipients(attacker, mapId){
    const attackerGroup = attacker.groupId ? groups.get(attacker.groupId) : null;
    const ids = attackerGroup?.members?.length ? attackerGroup.members : [attacker.id];
    const recipients = ids
      .map(id=>players.get(id))
      .filter(player=>player && player.mapId === String(mapId) && player.connected !== false && player.clientMode === "game");
    return recipients.length ? recipients : [attacker];
  }

  function emitWorldReward({enemy, mapId, attackerId}){
    const attacker = players.get(attackerId);
    if(!attacker || !enemy || enemy.rewardGranted) return;
    enemy.rewardGranted = true;
    enemy.rewardGrantedAt = Date.now();
    enemy.rewardGrantedBy = attackerId;
    const rewardId = `${enemy.id}:${attackerId}:${enemy.rewardGrantedAt}`;
    const recipients = getSameMapRewardRecipients(attacker, mapId);
    const share = recipients.length > 1 ? 1 / recipients.length : 1;
    const reward = enemy.reward || {credits:0, xp:0, premium:0};
    const firmPointRecipients = [];
    for(const player of recipients){
      const currentProfile = profileManager.getProfileForPlayer?.(player);
      const firmId = currentProfile?.player?.firmId || player.account?.firmId || "astra";
      const firmBonus = Math.max(0, Number(firmWarManager?.getRewardMultiplier?.(firmId) || 0));
      const multiplier = 1 + firmBonus;
      const credits = Math.max(0, Math.round(Number(reward.credits || 0) * share * multiplier));
      const xp = Math.max(0, Math.round(Number(reward.xp || 0) * share * multiplier));
      const premium = Math.max(0, Math.round(Number(reward.premium || 0) * share * multiplier));
      const rankPoints = calculateMonsterKillRankPoints(currentProfile?.player?.level || 1, enemy.level);
      const reputation = Math.max(0, Math.round(xp * 0.1));
      firmPointRecipients.push(firmId);
      io.to(player.id).emit("player:reward", {
        rewardId,
        enemyId:enemy.id,
        enemyType:enemy.type,
        enemyName:enemy.name || enemy.type || enemy.kind,
        enemyLevel:enemy.level,
        mapId,
        share,
        killerId:attackerId,
        credits,
        xp,
        premium,
        reputation,
        rankPoints,
        firmBonus,
        rewardAppliedByServer:true,
        at:Date.now()
      });
      const profile = profileManager.applyReward({
        player,
        reward:{
          credits,
          xp,
          premium,
          enemyKind:enemy.kind || enemy.type,
          enemyType:enemy.type,
          enemyLevel:enemy.level
        }
      });
      emitProfileSync?.(player, profile);
    }
    if(firmWarManager && firmPointRecipients.length){
      const snapshot = firmWarManager.addMonsterKillPoints(firmPointRecipients);
      io.emit?.("firm:ranking", snapshot);
    }
  }

  return {emitWorldReward};
}
