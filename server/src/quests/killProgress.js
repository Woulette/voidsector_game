import { WORLD_MAPS } from "../world/definitions.js";

export function createKillQuestProgress({io, players, groups, profileManager, emitProfileSync, emitQuestClaims}){
  function getSameMapQuestRecipients(attacker, mapId){
    const attackerGroup = attacker.groupId ? groups?.get(attacker.groupId) : null;
    const ids = attackerGroup?.members?.length ? attackerGroup.members : [attacker.id];
    const recipients = ids
      .map(id=>players.get(id))
      .filter(player=>player && player.mapId === String(mapId) && player.connected !== false && player.clientMode === "game");
    return recipients.length ? recipients : [attacker];
  }

  function progressServerQuestsForKill({enemy, mapId, attackerId}){
    const attacker = players.get(attackerId);
    if(!attacker || !enemy) return;
    const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
    for(const player of getSameMapQuestRecipients(attacker, mapId)){
      const profileResult = profileManager.applyQuestAction({
        player,
        action:{kind:"kill", enemyKind:enemy.kind, zoneName:mapName}
      });
      if(!profileResult.ok) continue;
      if(profileResult.updates?.length){
        io.to(player.id).emit("quest:progress", {
          mapId:String(mapId),
          updates:profileResult.updates,
          at:Date.now()
        });
      }
      if(profileResult.claimedQuests?.length) emitQuestClaims?.(player, profileResult.claimedQuests, {auto:true});
      if(profileResult.updates?.length || profileResult.claimedQuests?.length) emitProfileSync?.(player, profileResult.profile);
    }
  }

  return {progressServerQuestsForKill};
}
