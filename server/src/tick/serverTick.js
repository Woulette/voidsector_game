import { getInstanceGroups } from "../portals/portalSessions.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { RICKY_PORTAL_MAP } from "../../../src/data/rickyPortal.js";
import { VESPER_PORTAL_MAP } from "../portals/vesperPortalState.js";
import { KHARON_PORTAL_MAP } from "../portals/kharonPortal.js";
import { ECLANITE_PORTAL_MAP } from "../portals/eclanitePortal.js";
import { NOX_PORTAL_MAP } from "../portals/noxPortal.js";
import { PRISMATIC_PORTAL_MAP } from "../portals/prismaticPortal.js";
import { ANCIENT_PORTAL_MAP } from "../portals/ancientPortal.js";

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
  updateTravel,
  updatePendingEnemyAttacks,
  updatePlayerLifecycles,
  updateStatusEffects,
  updateQuestTimers,
  updateRickyCompanions,
  getVesperNpcTargets,
  updateVesperEncounters,
  updateKharonEncounters,
  updateEclaniteEncounters,
  updateNoxEncounters,
  updatePrismaticEncounters,
  getPrecursorNpcTargets,
  updatePrecursorEncounters,
  updateShipAbilityEffects,
  updateWorldEnemy,
  logger = console,
  runtimeMetrics = null,
  now:readNow = ()=>Date.now(),
  performanceNow = ()=>performance.now(),
  setIntervalFn = setInterval,
  onError
}){
  let worldLastTick = readNow();
  let worldEmitT = 0;
  let instanceEmitT = 0;
  let questTimerT = 0;

  return setIntervalFn(()=>{
    const tickStartedAt = performanceNow();
    const now = readNow();
    const scheduledElapsedMs = Math.max(0, now - worldLastTick);
    try{
      const dt = Math.min(0.12, Math.max(0.001, (now - worldLastTick) / 1000));
      worldLastTick = now;
      worldEmitT += dt;
      instanceEmitT += dt;
      questTimerT += dt;
      updateTravel?.(dt, now);
      updatePlayerActivity?.(dt, now);
      const activePlayersByMap = new Map();
      for(const player of players.values()){
        if(!presence.isActiveForWorld(player, now)) continue;
        const mapId = String(player.mapId ?? "");
        if(!WORLD_MAPS[mapId]) continue;
        if(!activePlayersByMap.has(mapId)) activePlayersByMap.set(mapId, []);
        activePlayersByMap.get(mapId).push(player);
      }
      const activeMapIds = new Set(activePlayersByMap.keys());
      for(const mapId of activeMapIds){
        const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
        const mapState = getWorldMapState(mapConfig.id);
        const mapPlayers = activePlayersByMap.get(String(mapConfig.id)) || [];
        if(!mapPlayers.length) continue;
        for(const enemy of mapState.enemies) updateWorldEnemy(enemy, mapConfig, mapPlayers, dt, now);
      }
      if(worldEmitT >= 0.10){
        worldEmitT = 0;
        for(const mapId of activeMapIds) emitWorldEnemies(mapId, {volatile:true, delta:true});
      }
      for(const group of getInstanceGroups(groups)){
        const instance = group.instance;
        if(!instance?.enemies?.length || instance.completed) continue;
        const instanceRoom = `instance:${instance.id}`;
        const isRickyPortal = instance.type === "portal" && instance.portal?.id === "ricky";
        const isVesperPortal = instance.type === "portal" && instance.portal?.id === "violet";
        const isKharonPortal = instance.type === "portal" && instance.portal?.id === "red";
        const isEclanitePortal = instance.type === "portal" && instance.portal?.id === "emerald";
        const isNoxPortal = instance.type === "portal" && instance.portal?.id === "void";
        const isPrismaticPortal = instance.type === "portal" && instance.portal?.id === "prismatic";
        const isPrecursorPortal = instance.type === "portal" && instance.portal?.id === "ancient";
        const map = instance.type === "portal"
          ? {
              id:`portal-${instance.portal?.id || "blue"}`,
              room:instanceRoom,
              width:isRickyPortal
                ? RICKY_PORTAL_MAP.width
                : isVesperPortal
                  ? VESPER_PORTAL_MAP.width
                  : isKharonPortal
                    ? KHARON_PORTAL_MAP.width
                    : isEclanitePortal
                      ? ECLANITE_PORTAL_MAP.width
                      : isNoxPortal
                        ? NOX_PORTAL_MAP.width
                        : isPrismaticPortal
                          ? PRISMATIC_PORTAL_MAP.width
                        : isPrecursorPortal
                          ? ANCIENT_PORTAL_MAP.width
                        : 5200,
              height:isRickyPortal
                ? RICKY_PORTAL_MAP.height
                : isVesperPortal
                  ? VESPER_PORTAL_MAP.height
                  : isKharonPortal
                    ? KHARON_PORTAL_MAP.height
                    : isEclanitePortal
                      ? ECLANITE_PORTAL_MAP.height
                      : isNoxPortal
                        ? NOX_PORTAL_MAP.height
                        : isPrismaticPortal
                          ? PRISMATIC_PORTAL_MAP.height
                        : isPrecursorPortal
                          ? ANCIENT_PORTAL_MAP.height
                        : 3600,
              spawn:isRickyPortal
                ? {...RICKY_PORTAL_MAP.spawn, r:240}
                : isVesperPortal
                  ? {...VESPER_PORTAL_MAP.spawn, r:240}
                  : isKharonPortal
                    ? {...KHARON_PORTAL_MAP.spawn, r:240}
                    : isEclanitePortal
                      ? {...ECLANITE_PORTAL_MAP.spawn, r:240}
                      : isNoxPortal
                        ? {...NOX_PORTAL_MAP.spawn, r:240}
                        : isPrismaticPortal
                          ? {...PRISMATIC_PORTAL_MAP.spawn, r:240}
                        : isPrecursorPortal
                          ? {...ANCIENT_PORTAL_MAP.spawn, r:240}
                        : {x:0, y:0, r:240}
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
        if(hasInstancePlayers && isVesperPortal){
          instancePlayers.push(...(getVesperNpcTargets?.(instance, map.id) || []));
        }
        if(hasInstancePlayers && isPrecursorPortal){
          instancePlayers.push(...(getPrecursorNpcTargets?.(instance, map.id) || []));
        }
        if(!instancePlayers.length) continue;
        for(const enemy of instance.enemies){
          if(enemy.static || enemy.noxRuntimeControlled) continue;
          updateWorldEnemy(enemy, map, instancePlayers, dt, now);
        }
      }
      updateRickyCompanions?.(dt, now);
      updateVesperEncounters?.(dt, now);
      updateKharonEncounters?.(dt, now);
      updateEclaniteEncounters?.(dt, now);
      updateNoxEncounters?.(dt, now);
      updatePrismaticEncounters?.(dt, now);
      updatePrecursorEncounters?.(dt, now);
      updateShipAbilityEffects?.(now);
      if(instanceEmitT >= 0.10){
        instanceEmitT = 0;
        for(const group of getInstanceGroups(groups)) if(group.instance) emitInstance(group, {volatile:true, delta:true});
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
    }finally{
      runtimeMetrics?.recordTick?.({
        durationMs:Math.max(0, performanceNow() - tickStartedAt),
        lagMs:Math.max(0, scheduledElapsedMs - SERVER_TICK_INTERVAL_MS)
      });
    }
  }, SERVER_TICK_INTERVAL_MS);
}
