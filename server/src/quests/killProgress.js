import { WORLD_MAPS } from "../world/definitions.js";

export function createKillQuestProgress({io, players, profileManager}){
  function progressServerQuestsForKill({enemy, mapId, attackerId}){
    const attacker = players.get(attackerId);
    if(!attacker || !enemy) return;
    const mapName = WORLD_MAPS[String(mapId)]?.name || String(mapId);
    const profileResult = profileManager.applyQuestAction({
      player:attacker,
      action:{kind:"kill", enemyKind:enemy.kind, zoneName:mapName}
    });
    if(profileResult.ok && profileResult.updates?.length){
      io.to(attacker.id).emit("quest:progress", {
        mapId:String(mapId),
        updates:profileResult.updates,
        at:Date.now()
      });
      if(profileResult.profile) io.to(attacker.id).emit("profile:sync", profileResult.profile);
    }
  }

  return {progressServerQuestsForKill};
}
