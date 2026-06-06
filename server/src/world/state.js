import { WORLD_MAPS } from "./definitions.js";
import { createWorldEnemy, publicEnemy, seededRandom } from "./spawn.js";

export function createWorldStateManager({io, players, presence, progressProfileQuestAction}){
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
      enemies
    };
    worldMaps.set(cleanMapId, state);
    return state;
  }

  function emitWorldEnemies(mapId){
    const map = getWorldMapState(mapId);
    io.to(`map:${map.id}`).emit("world:enemies", {
      mapId:map.id,
      enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
    });
  }

  function sendWorldEnemies(socket, mapId){
    const map = getWorldMapState(mapId);
    socket.emit("world:enemies", {
      mapId:map.id,
      enemies:map.enemies.filter(enemy=>enemy.hp > 0).map(publicEnemy)
    });
  }

  function setPlayerMap(socket, mapId){
    const player = players.get(socket.id);
    if(!player) return;
    const requestedMapId = String(mapId ?? "0");
    const nextMapId = WORLD_MAPS[requestedMapId] || requestedMapId.startsWith("portal-") || requestedMapId === "coop-test" ? requestedMapId : "0";
    const nextRoom = `map:${nextMapId}`;
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

  function playersOnMap(mapId){
    return [...players.values()].filter(player=>player.mapId === String(mapId) && presence.isActiveForWorld(player));
  }

  return {
    emitWorldEnemies,
    findWorldEnemyForPlayer,
    getWorldMapState,
    playersOnMap,
    respawnWorldEnemy,
    setPlayerMap
  };
}
