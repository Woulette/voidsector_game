import { getCanonicalMapName, getFirmMapId, getFirmMapName } from "../../data/firms.js";

function finite(value, fallback = 0){
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function mapKey(value){ return value == null ? "" : String(value); }
function enemyId(enemy){ return String(enemy?.serverId ?? enemy?.id ?? ""); }
function distanceTo(player, point){
  return Math.hypot(finite(point.x) - finite(player.x), finite(point.y) - finite(player.y));
}

function basePortals(map){
  return Array.isArray(map?.portals) ? map.portals : map?.portal ? [map.portal] : [];
}

// Return the first existing, open portal of a shortest route. Never invent a
// direct exit from the current sector to a destination elsewhere in the graph.
export function findTutorialPortalRoute({currentMap, destinationMapId, maps = [], getPortals = basePortals, player = {}} = {}){
  const destinationId = mapKey(destinationMapId);
  if(!currentMap || mapKey(currentMap.id) === destinationId) return null;
  const byId = new Map(maps.map(map=>[mapKey(map.id), map]));
  byId.set(mapKey(currentMap.id), currentMap);
  const visited = new Set([mapKey(currentMap.id)]);
  const queue = [{map:currentMap, firstPortal:null, mapIds:[currentMap.id]}];
  for(let cursor = 0; cursor < queue.length; cursor += 1){
    const entry = queue[cursor];
    const exits = [...(getPortals(entry.map) || [])]
      .filter(portal=>!portal.closed && !portal.locked && byId.has(mapKey(portal.targetMap)));
    if(!entry.firstPortal) exits.sort((a,b)=>distanceTo(player,a) - distanceTo(player,b));
    for(const portal of exits){
      const nextId = mapKey(portal.targetMap);
      if(visited.has(nextId)) continue;
      const firstPortal = entry.firstPortal || portal;
      const mapIds = [...entry.mapIds, byId.get(nextId).id];
      if(nextId === destinationId) return {portal:firstPortal, mapIds};
      visited.add(nextId);
      queue.push({map:byId.get(nextId), firstPortal, mapIds});
    }
  }
  return null;
}

export function projectTutorialPoint(point, camera, viewport){
  const zoom = Math.max(0.01, finite(camera?.zoom, 1));
  const screenX = viewport.left + (finite(point?.x) - finite(camera?.x)) * zoom;
  const screenY = viewport.top + (finite(point?.y) - finite(camera?.y)) * zoom;
  return {
    screenX,
    screenY,
    onScreen:screenX >= viewport.left && screenX <= viewport.right
      && screenY >= viewport.top && screenY <= viewport.bottom
  };
}

export function createTutorialWorldGuidance({getState, maps = [], getStations = ()=>[], getPortals = basePortals, getViewport, enemyTypes = {}} = {}){
  let enemyLock = null;
  const frameListeners = new Set();

  function viewportBounds(){
    const rect = getViewport();
    const viewport = {
      left:finite(rect.left), top:finite(rect.top),
      right:finite(rect.right, finite(rect.left) + finite(rect.width)),
      bottom:finite(rect.bottom, finite(rect.top) + finite(rect.height))
    };
    viewport.width = Math.max(0, viewport.right - viewport.left);
    viewport.height = Math.max(0, viewport.bottom - viewport.top);
    return viewport;
  }

  // Reproject the chosen destination using the frame that was just drawn.
  // Route finding and target selection stay on the tutorial's slower tick.
  function getRenderSnapshot(snapshot){
    const state = getState();
    if(!snapshot?.target || !state?.running || !state.player || !state.camera
      || mapKey(snapshot.mapId) !== mapKey(state.currentMap?.id)) return null;
    const {player,camera} = state, target = snapshot.target;
    const point = target.type === "enemy"
      ? (state.enemies || []).find(enemy=>enemyId(enemy) === target.id
        && finite(enemy.hp) > 0 && !enemy.damageImmune && !enemy.untargetable)
      : target.type === "player" ? player : target;
    if(!point) return null;
    const viewport = viewportBounds();
    return {...snapshot,viewport,canvas:viewport,
      player:{...snapshot.player,x:finite(player.x),y:finite(player.y),...projectTutorialPoint(player,camera,viewport)},
      target:{...target,x:finite(point.x),y:finite(point.y),
        ...projectTutorialPoint(point,camera,viewport),distance:distanceTo(player,point)}
    };
  }

  function selectEnemy(target, state){
    const kinds = [...new Set((Array.isArray(target.kinds) ? target.kinds : []).map(String))].sort();
    if(Array.isArray(target.kinds) && !kinds.length){
      enemyLock = null;
      return null;
    }
    const key = JSON.stringify([mapKey(state.currentMap.id), target.objectiveId || target.objectiveKey || state.tutorialStep || "", kinds]);
    const useful = (state.enemies || []).filter(enemy=>finite(enemy.hp) > 0
      && !enemy.damageImmune && !enemy.untargetable
      && (!kinds.length || kinds.includes(String(enemy.kind || ""))));
    const previous = enemyLock?.key === key
      ? useful.find(enemy=>enemyId(enemy) === enemyLock.id)
      : null;
    const selected = previous || useful.reduce((nearest, enemy)=>!nearest || distanceTo(state.player, enemy) < distanceTo(state.player, nearest) ? enemy : nearest, null);
    enemyLock = selected ? {key, id:enemyId(selected)} : null;
    return selected;
  }

  function getTutorialSnapshot(target = {}){
    const state = getState();
    if(!state?.running || !state.player || !state.camera || !state.currentMap) return null;
    const {currentMap, player, camera} = state;
    const viewport = viewportBounds();
    const type = String(target.type || "player");
    const huntingMaps = type === "enemy" && Array.isArray(target.mapNumbers)
      ? [...new Set(target.mapNumbers.map(Number))]
        .filter(number=>Number.isSafeInteger(number) && number > 0)
        .map(number=>maps.find(map=>mapKey(map.id) === mapKey(getFirmMapId(state.firmId,number))
          && getCanonicalMapName(map.name) === getFirmMapName(state.firmId,number)))
        .filter(Boolean)
      : null;
    let destinationMap = currentMap;
    let route = null;
    if(huntingMaps){
      // Once a visit is recorded, any map permitted by the remaining hunt is
      // useful. Do not send the player back through a completed visit's portal.
      const currentAllowed = huntingMaps.find(map=>mapKey(map.id) === mapKey(currentMap.id));
      if(currentAllowed){
        destinationMap = currentAllowed;
      }else{
        const reachable = huntingMaps.map(map=>({map,route:findTutorialPortalRoute({
          currentMap,destinationMapId:map.id,maps,getPortals,player
        })})).find(choice=>choice.route);
        destinationMap = reachable?.map || huntingMaps[0] || currentMap;
        route = reachable?.route || null;
      }
    }else if(["hq", "station", "map2"].includes(type) || Number(target.mapNumber) > 0){
      const mapNumber = type === "map2" ? 2 : Math.max(1, Math.floor(finite(target.mapNumber, 1)));
      const destinationId = getFirmMapId(state.firmId, mapNumber);
      destinationMap = maps.find(map=>mapKey(map.id) === mapKey(destinationId))
        || {id:destinationId, name:getFirmMapName(state.firmId,mapNumber)};
    }
    const atDestinationMap = (!huntingMaps || huntingMaps.length > 0)
      && mapKey(currentMap.id) === mapKey(destinationMap.id);
    let point = null;
    const noUsefulEnemies = type === "enemy" && ((Array.isArray(target.kinds) && !target.kinds.length)
      || (huntingMaps && !huntingMaps.length));
    if(noUsefulEnemies){
      enemyLock = null;
    }else if(!atDestinationMap){
      route ||= findTutorialPortalRoute({currentMap, destinationMapId:destinationMap.id, maps, getPortals, player});
      point = route?.portal || null;
    }else if(type === "station"){
      point = getStations().find(station=>String(station.id) === String(target.id)) || null;
    }else if(type === "hq" || type === "map2"){
      point = currentMap.spawn || (type === "map2" ? player : null);
    }else if(type === "enemy"){
      point = selectEnemy(target,state);
    }else{
      point = player;
    }
    const snapshot = {
      mapId:currentMap.id,
      mapName:currentMap.name,
      homeMapName:getFirmMapName(state.firmId,1),
      destinationMapId:destinationMap.id,
      destinationMapName:destinationMap.name,
      atDestinationMap,
      player:{
        x:finite(player.x), y:finite(player.y),
        hp:finite(player.hp), maxHp:finite(player.maxHp),
        shield:finite(player.shield), maxShield:finite(player.maxShield),
        ...projectTutorialPoint(player,camera,viewport),
        repairBotActive:Boolean(player.repairBotActive)
      },
      target:null,
      viewport,
      canvas:viewport
    };
    if(!point) return snapshot;
    const distance = distanceTo(player, point);
    const nextMap = route ? maps.find(map=>mapKey(map.id) === mapKey(point.targetMap)) : null;
    const name = route ? `Portail vers ${nextMap?.name || destinationMap.name}`
      : type === "hq" ? `QG · ${destinationMap.name}`
      : type === "map2" ? destinationMap.name
      : point.name || point.title || enemyTypes[point.kind]?.name || point.label || (type === "player" ? "Votre vaisseau" : target.id || type);
    snapshot.target = {
      id:route ? String(point.id || `portal-${currentMap.id}-${point.targetMap}`) : String(point.serverId ?? point.id ?? type),
      name,
      type:route ? "portal" : type,
      kind:String(point.kind || point.id || type),
      x:finite(point.x), y:finite(point.y),
      ...projectTutorialPoint(point,camera,viewport),
      distance,
      destinationMapId:destinationMap.id,
      destinationMapName:destinationMap.name,
      destinationReached:atDestinationMap && (type === "map2" || (["hq", "station"].includes(type) && distance < (type === "hq" ? 520 : 300))),
      route:Boolean(route),
      routeMapIds:route?.mapIds || [],
      nextMapId:route ? point.targetMap : null
    };
    return snapshot;
  }

  return {getTutorialSnapshot,getRenderSnapshot,
    subscribeFrame(listener){
      frameListeners.add(listener);
      return ()=>frameListeners.delete(listener);
    },
    renderFrame(){ for(const listener of frameListeners) listener(); }
  };
}
