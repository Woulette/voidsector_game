function uniqueAssetPaths(paths){
  return [...new Set(paths.filter(Boolean))];
}

const runtimeAssetStates = new WeakMap();
export const RUNTIME_COMBAT_ASSET_LIMIT = 48;

function preloadAsset(cache, src){
  if(!src || cache[src]) return cache[src] || null;
  if(typeof Image !== "function") return null;
  const img = new Image();
  img.src = src;
  cache[src] = img;
  return img;
}

export function getCachedCombatImage(cache, src, {maxAssets = RUNTIME_COMBAT_ASSET_LIMIT} = {}){
  if(!cache || !src) return null;
  let state = runtimeAssetStates.get(cache);
  if(!state){
    state = new Map();
    runtimeAssetStates.set(cache, state);
  }
  if(state.has(src)){
    const tracked = state.get(src);
    state.delete(src);
    if(cache[src]){
      state.set(src, cache[src]);
      return cache[src];
    }
    state.set(src, tracked);
  }else if(cache[src]){
    return cache[src];
  }
  const img = preloadAsset(cache, src);
  if(!img) return null;
  state.delete(src);
  state.set(src, img);
  const limit = Math.max(1, Math.floor(Number(maxAssets) || 1));
  while(state.size > limit){
    const [evictedSrc, evictedImg] = state.entries().next().value;
    state.delete(evictedSrc);
    if(cache[evictedSrc] === evictedImg) delete cache[evictedSrc];
  }
  return img;
}

export function getCombatMapAssetPaths(map){
  if(!map) return [];
  const tileMap = map.tileMap;
  const mapTiles = [];
  if(tileMap){
    const prefix = tileMap.prefix || "tile";
    const ext = tileMap.ext || "webp";
    for(let row = 0; row < tileMap.rows; row++){
      for(let col = 0; col < tileMap.cols; col++){
        mapTiles.push(`${tileMap.path}/${prefix}_${col}_${row}.${ext}`);
      }
    }
  }
  return uniqueAssetPaths([
    map.bg,
    ...(map.parallaxScene?.backdrops?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.images?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.tiles?.map(layer=>layer.src) || []),
    ...(map.questNpcs?.map(npc=>npc.npcImg) || []),
    ...(map.enemyAssets || []),
    ...mapTiles
  ]);
}

export function preloadCombatAssets({cache, ships = [], ranks = [], getRankAssetPath = ()=>null}){
  const rankImages = ranks.map(rank=>getRankAssetPath(rank));
  const spawnAssets = [
    "assets/spawn/spawn_dock.png",
    "assets/spawn/spawn_quest_relay.png",
    "assets/spawn/spawn_refinery.png"
  ];
  const misc = [
    "assets/drones/drone_test_sprite.webp",
    "assets/equipment/rocket_projectile.png",
    "assets/firms/astra.svg",
    "assets/firms/cyan.svg",
    "assets/firms/jaune.svg",
    "assets/firms/verte.svg",
    "assets/materials/cargo_box.svg",
    "assets/ships/npc/npc_saucer.png",
    ...spawnAssets,
    ...rankImages
  ];
  uniqueAssetPaths([
    ...ships.flatMap(ship=>[ship.img, ship.combatImg]),
    ...misc
  ]).forEach(src=>preloadAsset(cache, src));
}

export function createCombatMapAssetCache({cache, maxMaps = 3} = {}){
  const retainedMaps = new Map();
  const managedSources = new Set();
  let activeMapKey = null;
  let previousActiveMapKey = null;

  function getMapKey(map){
    return String(map?.id ?? map?.name ?? "");
  }

  function isSourceRetained(src){
    for(const entry of retainedMaps.values()){
      if(entry.paths.includes(src)) return true;
    }
    return false;
  }

  function releaseEntry(entry){
    for(const src of entry.paths){
      if(!managedSources.has(src) || isSourceRetained(src)) continue;
      delete cache[src];
      managedSources.delete(src);
    }
  }

  function trim(){
    const limit = Math.max(1, Math.floor(Number(maxMaps) || 1));
    while(retainedMaps.size > limit){
      const keys = [...retainedMaps.keys()];
      const evictedKey = keys.find(key=>key !== activeMapKey && key !== previousActiveMapKey)
        ?? keys.find(key=>key !== activeMapKey);
      if(evictedKey == null) break;
      const entry = retainedMaps.get(evictedKey);
      retainedMaps.delete(evictedKey);
      releaseEntry(entry);
    }
  }

  function retain(map, {active = false} = {}){
    const key = getMapKey(map);
    if(!key) return [];
    const existing = retainedMaps.get(key);
    const entry = existing || {map, paths:getCombatMapAssetPaths(map)};
    if(existing) retainedMaps.delete(key);
    retainedMaps.set(key, entry);
    if(active && key !== activeMapKey){
      previousActiveMapKey = activeMapKey;
      activeMapKey = key;
    }
    entry.paths.forEach(src=>{
      if(!cache[src]) managedSources.add(src);
      preloadAsset(cache, src);
    });
    trim();
    return entry.paths;
  }

  function clear(){
    const entries = [...retainedMaps.values()];
    retainedMaps.clear();
    activeMapKey = null;
    previousActiveMapKey = null;
    entries.forEach(releaseEntry);
  }

  return {
    activate:map=>retain(map, {active:true}),
    preload:map=>retain(map),
    clear,
    getRetainedMapKeys:()=>[...retainedMaps.keys()]
  };
}
