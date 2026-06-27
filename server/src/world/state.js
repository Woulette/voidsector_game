import { WORLD_MAPS } from "./definitions.js";
import { createWorldEnemy, publicEnemy, publicEnemyDelta, seededRandom } from "./spawn.js";
import { getPlayerMapRoom } from "../players/visibility.js";

export function createWorldStateManager({io, players, presence, progressProfileQuestAction, getGroups}){
  const worldMaps = new Map();

  function getWorldMapState(mapId){
    const cleanMapId = String(mapId ?? "0");
    if(worldMaps.has(cleanMapId)) return worldMaps.get(cleanMapId);
    const map = WORLD_MAPS[cleanMapId] || WORLD_MAPS["0"];
    const rnd = seededRandom(10000 + Number(map.seed || 1));
    const enemies = [];
    for(const [kind, count] of Object.entries(map.fixedEnemyCounts || {})){
      const safeCount = Math.max(0, Math.floor(Number(count) || 0));
      for(let i = 0; i < safeCount; i++) enemies.push(createWorldEnemy(map, enemies.length + 1, rnd, kind));
    }
    const randomCount = Math.max(1, Number(map.count || 20)) - enemies.length;
    for(let i = 0; i < Math.max(0, randomCount); i++) enemies.push(createWorldEnemy(map, enemies.length + 1, rnd));
    const state = {
      id:map.id,
      enemies,
      nextEnemySeq:enemies.length + 1
    };
    worldMaps.set(cleanMapId, state);
    return state;
  }

  function emitWorldEnemies(mapId, options = {}){
    const map = getWorldMapState(mapId);
    const channel = io.to(`map:${map.id}`);
    const emitter = options.volatile && channel.volatile ? channel.volatile : channel;
    const useDelta = Boolean(options.delta);
    emitter.emit("world:enemies", {
      mapId:map.id,
      delta:useDelta,
      enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(useDelta ? publicEnemyDelta : publicEnemy)
    });
  }

  function sendWorldEnemies(socket, mapId){
    const map = getWorldMapState(mapId);
    socket.emit("world:enemies", {
      mapId:map.id,
      full:true,
      enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
    });
  }

  function setPlayerMap(socket, mapId){
    const player = players.get(socket.id);
    if(!player) return;
    const requestedMapId = String(mapId ?? "0");
    const nextMapId = WORLD_MAPS[requestedMapId] || requestedMapId.startsWith("portal-") || requestedMapId === "coop-test" ? requestedMapId : "0";
    const nextRoom = getPlayerMapRoom(player, nextMapId, getGroups?.());
    if(player.mapRoom === nextRoom && player.worldMapSent) return;
    if(player.mapRoom && player.mapRoom !== nextRoom) socket.leave(player.mapRoom);
    player.mapId = nextMapId;
    player.mapRoom = nextRoom;
    player.worldMapSent = true;
    socket.join(player.mapRoom);
    if(WORLD_MAPS[nextMapId]) sendWorldEnemies(socket, nextMapId);
    const mapName = WORLD_MAPS[nextMapId]?.name;
    if(mapName) progressProfileQuestAction(socket, {
      type:"visit_map",
      mapName,
      amount:1
    });
  }

  function findWorldEnemyForPlayer(player, enemyId){
    if(!player?.mapId || !enemyId) return null;
    if(!WORLD_MAPS[String(player.mapId)]) return null;
    const map = getWorldMapState(player.mapId);
    return map.enemies.find(enemy=>enemy.id === enemyId && enemy.hp > 0) || null;
  }

  function respawnWorldEnemy(mapId, enemyId){
    const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
    const map = getWorldMapState(mapConfig.id);
    const index = map.enemies.findIndex(enemy=>enemy.id === enemyId);
    if(index < 0) return;
    const previousKind = map.enemies[index]?.kind || null;
    const rnd = seededRandom(Date.now() + index * 97 + Number(mapConfig.seed || 1));
    map.enemies[index] = createWorldEnemy(mapConfig, index + 1, rnd, previousKind);
    emitWorldEnemies(mapConfig.id);
  }

  function removeWorldEnemy(mapId, enemyId){
    const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
    const map = getWorldMapState(mapConfig.id);
    const index = map.enemies.findIndex(enemy=>enemy.id === enemyId);
    if(index < 0) return false;
    map.enemies.splice(index, 1);
    emitWorldEnemies(mapConfig.id);
    return true;
  }

  function spawnWorldEnemyChildren(mapId, parentEnemy){
    const deathSpawn = parentEnemy?.deathSpawn;
    if(!deathSpawn?.kind || Number(deathSpawn.count || 0) <= 0) return [];
    const mapConfig = WORLD_MAPS[String(mapId)] || WORLD_MAPS["0"];
    const map = getWorldMapState(mapConfig.id);
    const count = Math.max(0, Math.floor(Number(deathSpawn.count || 0)));
    const rnd = seededRandom(Date.now() + Number(mapConfig.seed || 1) + map.nextEnemySeq * 131);
    const children = [];
    for(let index = 0; index < count; index += 1){
      const angle = Math.PI * 2 * index / count + rnd() * .35;
      const distance = 95 + rnd() * 55;
      const child = createWorldEnemy(
        mapConfig,
        map.nextEnemySeq++,
        rnd,
        deathSpawn.kind,
        {
          level:parentEnemy.level,
          x:Math.max(-mapConfig.width / 2 + 70, Math.min(mapConfig.width / 2 - 70, Number(parentEnemy.x || 0) + Math.cos(angle) * distance)),
          y:Math.max(-mapConfig.height / 2 + 70, Math.min(mapConfig.height / 2 - 70, Number(parentEnemy.y || 0) + Math.sin(angle) * distance)),
          temporarySpawn:true,
          spawnedBy:parentEnemy.id
        }
      );
      child.lockedPlayerId = parentEnemy.lockedPlayerId || null;
      child.lockedPlayerLastSeenAt = parentEnemy.lockedPlayerLastSeenAt || 0;
      map.enemies.push(child);
      children.push(child);
    }
    emitWorldEnemies(mapConfig.id);
    return children;
  }

  function playersOnMap(mapId){
    return [...players.values()].filter(player=>player.mapId === String(mapId) && presence.isActiveForWorld(player));
  }

  return {
    emitWorldEnemies,
    findWorldEnemyForPlayer,
    getWorldMapState,
    playersOnMap,
    removeWorldEnemy,
    respawnWorldEnemy,
    spawnWorldEnemyChildren,
    setPlayerMap
  };
}
