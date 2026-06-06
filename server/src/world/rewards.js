export function createWorldRewardManager({io, players, groups, profileManager}){
  function emitWorldReward({enemy, mapId, attackerId}){
    const attacker = players.get(attackerId);
    if(!attacker || !enemy || enemy.rewardGranted) return;
    enemy.rewardGranted = true;
    enemy.rewardGrantedAt = Date.now();
    enemy.rewardGrantedBy = attackerId;
    const rewardId = `${enemy.id}:${attackerId}:${enemy.rewardGrantedAt}`;
    const attackerGroup = attacker.groupId ? groups.get(attacker.groupId) : null;
    const recipientIds = attackerGroup?.members?.length ? attackerGroup.members : [attackerId];
    const reward = enemy.reward || {credits:0, xp:0, premium:0};
    for(const playerId of recipientIds){
      const player = players.get(playerId);
      if(!player || player.mapId !== String(mapId)) continue;
      const share = player.id === attackerId ? 1 : 0.5;
      io.to(player.id).emit("player:reward", {
        rewardId,
        enemyId:enemy.id,
        enemyType:enemy.type,
        enemyLevel:enemy.level,
        mapId,
        share,
        killerId:attackerId,
        credits:Math.max(0, Math.round(Number(reward.credits || 0) * share)),
        xp:Math.max(0, Math.round(Number(reward.xp || 0) * share)),
        premium:Math.max(0, Math.round(Number(reward.premium || 0) * share)),
        rewardAppliedByServer:true,
        at:Date.now()
      });
      const profile = profileManager.applyReward({
        player,
        reward:{
          credits:Math.max(0, Math.round(Number(reward.credits || 0) * share)),
          xp:Math.max(0, Math.round(Number(reward.xp || 0) * share)),
          premium:Math.max(0, Math.round(Number(reward.premium || 0) * share))
        }
      });
      if(profile) io.to(player.id).emit("profile:sync", profile);
    }
  }

  return {emitWorldReward};
}
