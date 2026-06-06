import { WORLD_MAPS } from "../world/definitions.js";

export function startServerTick({
  cleanupExpiredLootDrops,
  emitInstance,
  emitWorldEnemies,
  getWorldMapState,
  groups,
  players,
  playersOnMap,
  presence,
  updateStatusEffects,
  updateQuestTimers,
  updateWorldEnemy
}){
  let worldLastTick = Date.now();
  let worldEmitT = 0;
  let instanceEmitT = 0;
  let questTimerT = 0;

  return setInterval(()=>{
    const now = Date.now();
    const dt = Math.min(0.12, Math.max(0.001, (now - worldLastTick) / 1000));
    worldLastTick = now;
    worldEmitT += dt;
    instanceEmitT += dt;
    questTimerT += dt;
    const activeMapIds = new Set([...players.values()]
      .filter(player=>presence.isActiveForWorld(player, now))
      .map(player=>player.mapId)
      .filter(mapId=>WORLD_MAPS[String(mapId)]));
    for(const mapId of activeMapIds){
      const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
      const mapState = getWorldMapState(mapConfig.id);
      const mapPlayers = playersOnMap(mapConfig.id);
      if(!mapPlayers.length) continue;
      for(const enemy of mapState.enemies) updateWorldEnemy(enemy, mapConfig, mapPlayers, dt, now);
    }
    if(worldEmitT >= 0.10){
      worldEmitT = 0;
      for(const mapId of activeMapIds) emitWorldEnemies(mapId);
    }
    for(const group of groups.values()){
      const instance = group.instance;
      if(!instance?.enemies?.length || instance.completed) continue;
      const map = instance.type === "portal"
        ? {id:`portal-${instance.portal?.id || "blue"}`, room:group.id, width:5200, height:3600, spawn:{x:0, y:0, r:240}}
        : {id:"coop-test", room:group.id, width:5200, height:3600, spawn:{x:instance.spawn?.x || 0, y:instance.spawn?.y || 0, r:260}};
      const instancePlayers = group.members.map(id=>players.get(id)).filter(player=>presence.isActiveForWorld(player, now));
      if(!instancePlayers.length) continue;
      for(const enemy of instance.enemies) updateWorldEnemy(enemy, map, instancePlayers, dt, now);
    }
    if(instanceEmitT >= 0.10){
      instanceEmitT = 0;
      for(const group of groups.values()) if(group.instance) emitInstance(group);
    }
    cleanupExpiredLootDrops(now);
    updateStatusEffects?.(now);
    if(questTimerT >= 1){
      questTimerT = 0;
      updateQuestTimers?.(now);
    }
    presence.tick(now);
  }, 50);
}
