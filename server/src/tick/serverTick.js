import { WORLD_MAPS } from "../world/definitions.js";
import { RICKY_PORTAL_MAP } from "../../../src/data/rickyPortal.js";

export const SERVER_TICK_INTERVAL_MS = 50;

export function startServerTick({
  cleanupExpiredLootDrops,
  emitInstance,
  emitWorldEnemies,
  getWorldMapState,
  groups,
  players,
  playersOnMap,
  presence,
  updatePlayerActivity,
  updatePendingEnemyAttacks,
  updatePlayerLifecycles,
  updateStatusEffects,
  updateQuestTimers,
  updateRickyCompanions,
  updateShipAbilityEffects,
  updateWorldEnemy,
  logger = console,
  now:readNow = ()=>Date.now(),
  setIntervalFn = setInterval,
  onError
}){
  let worldLastTick = readNow();
  let worldEmitT = 0;
  let instanceEmitT = 0;
  let questTimerT = 0;

  return setIntervalFn(()=>{
    try{
      const now = readNow();
      const dt = Math.min(0.12, Math.max(0.001, (now - worldLastTick) / 1000));
      worldLastTick = now;
      worldEmitT += dt;
      instanceEmitT += dt;
      questTimerT += dt;
      updatePlayerActivity?.(dt, now);
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
        const instanceRoom = `instance:${instance.id}`;
        const isRickyPortal = instance.type === "portal" && instance.portal?.id === "ricky";
        const map = instance.type === "portal"
          ? {
              id:`portal-${instance.portal?.id || "blue"}`,
              room:instanceRoom,
              width:isRickyPortal ? RICKY_PORTAL_MAP.width : 5200,
              height:isRickyPortal ? RICKY_PORTAL_MAP.height : 3600,
              spawn:isRickyPortal ? {...RICKY_PORTAL_MAP.spawn, r:240} : {x:0, y:0, r:240}
            }
          : {id:"coop-test", room:instanceRoom, width:5200, height:3600, spawn:{x:instance.spawn?.x || 0, y:instance.spawn?.y || 0, r:260}};
        const joinedMemberIds = instance.type === "portal" && Array.isArray(instance.joinedMemberIds)
          ? new Set(instance.joinedMemberIds.map(String))
          : null;
        const instancePlayers = group.members
          .map(id=>players.get(id))
          .filter(player=>presence.isActiveForWorld(player, now))
          .filter(player=>!joinedMemberIds || joinedMemberIds.has(String(player.id)))
          .filter(player=>String(player.state?.mapId || player.mapId || "") === map.id);
        const hasInstancePlayers = instancePlayers.length > 0;
        if(hasInstancePlayers && instance.type === "portal" && instance.portal?.id === "ricky" && instance.ally?.alive !== false && Number(instance.ally?.hp || 0) > 0){
          instancePlayers.push({
            id:"ricky_companion",
            npcTarget:true,
            connected:true,
            clientMode:"game",
            mapId:map.id,
            state:instance.ally
          });
        }
        if(!instancePlayers.length) continue;
        for(const enemy of instance.enemies){
          if(enemy.static) continue;
          updateWorldEnemy(enemy, map, instancePlayers, dt, now);
        }
      }
      updateRickyCompanions?.(dt, now);
      updateShipAbilityEffects?.(now);
      if(instanceEmitT >= 0.10){
        instanceEmitT = 0;
        for(const group of groups.values()) if(group.instance) emitInstance(group);
      }
      cleanupExpiredLootDrops(now);
      updatePendingEnemyAttacks?.(now);
      updateStatusEffects?.(now);
      updatePlayerLifecycles?.(dt, now);
      if(questTimerT >= 1){
        questTimerT = 0;
        updateQuestTimers?.(now);
      }
      presence.tick(now);
    }catch(error){
      const meta = {
        error:error?.stack || error?.message || String(error),
        at:readNow()
      };
      logger?.error?.("[serverTick] tick failed", meta);
      try{
        onError?.({source:"serverTick", ...meta});
      }catch(logError){
        logger?.warn?.("[serverTick] error log failed", {
          error:logError?.message || String(logError)
        });
      }
    }
  }, SERVER_TICK_INTERVAL_MS);
}
