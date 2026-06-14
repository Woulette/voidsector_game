import { getClosedMapPortals, getMapPortals, SAFE_ZONE_DELAY } from "../combatData.js";
import { getFirmIdFromMapName, normalizeFirmId } from "../../data/firms.js";
import { makeGroundMaterialPreview } from "./groundMaterials.js";
import { buildMapState } from "./mapState.js";

export function createCombatWorldStateSystem({
  store,
  mapList,
  getState,
  setState,
  getAllRawMaterials,
  cargo,
  beams,
  panels,
  saveState,
  showToast,
  updateHud,
  clampPlayerToMap,
  isMultiplayerConnected = ()=>false
}){
  const mapStates = new Map();

  function isFriendlyFirmMap(map = getState().currentMap){
    const mapFirmId = getFirmIdFromMapName(map?.name);
    if(!mapFirmId) return true;
    return mapFirmId === normalizeFirmId(store?.state?.player?.firmId || "astra");
  }

  function getMapState(map){
    const {enemySeq} = getState();
    if(!mapStates.has(map.id)){
      const built = buildMapState(map, enemySeq);
      setState({enemySeq:built.nextEnemySeq});
      mapStates.set(map.id, built.state);
    }
    return mapStates.get(map.id);
  }

  function getSafeAreas(map = getState().currentMap){
    if(getState().gameMode === "portal") return [];
    if(!isFriendlyFirmMap(map)) return [];
    const completedQuestClaims = store?.state?.completedQuestClaims || {};
    const questProgress = store?.state?.questProgress || {};
    const zones = [];
    if(map?.spawn && map.spawn.kind !== "portal"){
      const rect = map.spawn.safeRect;
      zones.push(rect
        ? {id:"spawn", label:map.spawn.label || "Zone de spawn", type:"spawn", shape:"rect", minX:rect.minX, minY:rect.minY, maxX:rect.maxX, maxY:rect.maxY}
        : {id:"spawn", label:map.spawn.label || "Zone de spawn", x:map.spawn.x, y:map.spawn.y, r:map.spawn.safeRadius || map.spawn.r || 260, type:"spawn", shape:"circle"});
    }
    getMapPortals(map, {completedQuestClaims, questProgress}).forEach((portal, index)=>{
      zones.push({id:`portal-${index}`, label:portal.label || "Zone portail", x:portal.x, y:portal.y, r:(portal.safeRadius || Math.max(330, (portal.r || 90) * 3.5)) * 1.95, type:"portal"});
    });
    getClosedMapPortals(map, {completedQuestClaims, questProgress}).forEach((portal, index)=>{
      zones.push({id:`closed-portal-${index}`, label:portal.label || "Zone portail", x:portal.x, y:portal.y, r:(portal.safeRadius || Math.max(330, (portal.r || 90) * 3.5)) * 1.95, type:"portal"});
    });
    return zones;
  }

  function getNearestPortal(point = getState().player, map = getState().currentMap){
    const portals = getMapPortals(map, {
      completedQuestClaims:store?.state?.completedQuestClaims || {},
      questProgress:store?.state?.questProgress || {}
    });
    if(!point || !portals.length) return null;
    return portals.reduce((nearest, portal)=>{
      const distance = Math.hypot(point.x - portal.x, point.y - portal.y);
      return !nearest || distance < nearest.distance ? {portal, distance} : nearest;
    }, null)?.portal || null;
  }

  function getCurrentSafeArea(){
    const {player} = getState();
    return getSafeAreas().find(zone=>{
      if(zone.shape === "rect"){
        return player.x >= zone.minX && player.x <= zone.maxX && player.y >= zone.minY && player.y <= zone.maxY;
      }
      return Math.hypot(player.x-zone.x, player.y-zone.y) <= zone.r;
    }) || null;
  }

  function isPointInSafeArea(point, map = getState().currentMap){
    if(!point) return false;
    return getSafeAreas(map).some(zone=>{
      if(zone.shape === "rect"){
        return point.x >= zone.minX && point.x <= zone.maxX && point.y >= zone.minY && point.y <= zone.maxY;
      }
      return Math.hypot(point.x-zone.x, point.y-zone.y) <= zone.r;
    });
  }

  function isSafeModeActive(){
    const {gameMode, player} = getState();
    if(gameMode !== "open") return false;
    return !!getCurrentSafeArea() && (player.safeZoneLock || 0) <= 0;
  }

  function getSpawnStations(){
    const {gameMode, currentMap} = getState();
    if(gameMode !== "open" || !currentMap?.spawn || currentMap.spawn.kind === "portal") return [];
    if(!isFriendlyFirmMap(currentMap)) return [];
    const spawn = currentMap.spawn;
    if(spawn.hub === false) return [];
    const sideX = spawn.x > 0 ? -1 : 1;
    const sideY = spawn.y > 0 ? -1 : 1;
    const stationY = spawn.y + sideY * 300;
    const questX = spawn.x + sideX * 600;
    const refineryX = spawn.x - sideX * 600;
    return [
      {
        id:"quests",
        x:questX,
        y:stationY,
        radius:96,
        marker:{x:questX, y:stationY - 180, radius:54, text:"!"},
        asset:"assets/spawn/spawn_quest_relay.png",
        assetWidth:266,
        assetHeight:266,
        title:"RELAIS DE QUETES",
        subtitle:"Recevoir et rendre des missions"
      },
      {
        id:"refinery",
        x:refineryX,
        y:stationY,
        radius:102,
        marker:{x:refineryX, y:stationY - 188, radius:54, text:"R"},
        asset:"assets/spawn/spawn_refinery.png",
        assetWidth:282,
        assetHeight:282,
        title:"RAFFINEUR",
        subtitle:"Fusionner et ameliorer l'equipement"
      }
    ];
  }

  function getStationAt(world){
    return getSpawnStations().find(station=>{
      if(Math.hypot(world.x-station.x, world.y-station.y) <= station.radius + 28) return true;
      const marker = station.marker;
      return marker && Math.hypot(world.x-marker.x, world.y-marker.y) <= marker.radius + 26;
    }) || null;
  }

  function loadMap(mapId, x, y, options = {}){
    const currentMap = mapList.find(m=>m.id === mapId) || mapList[0];
    const mapState = getMapState(currentMap);
    const {player, missileSalvos} = getState();
    cargo.clear();
    cargo.setGroundMaterials(makeGroundMaterialPreview(currentMap, getAllRawMaterials()));
    const nebulae = currentMap.id === 0 ? [
      {x:-1500,y:-820,r:980,c:"rgba(56,189,248,.11)",p:.22},
      {x:880,y:-260,r:760,c:"rgba(34,197,94,.06)",p:.18},
      {x:420,y:980,r:680,c:"rgba(14,165,233,.08)",p:.24}
    ] : [
      {x:-1250,y:-720,r:980,c:"rgba(168,85,247,.12)",p:.24},
      {x:1250,y:-120,r:820,c:"rgba(239,68,68,.09)",p:.27},
      {x:540,y:1080,r:760,c:"rgba(251,146,60,.08)",p:.2}
    ];
    player.x = x ?? currentMap.spawn.x;
    player.y = y ?? currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    player.radiationTimer = 30;
    missileSalvos.clear();
    beams.clear();
    setState({
      portalTransition:null,
      gameMode:"open",
      activePortal:null,
      portalWave:0,
      portalDelay:0,
      portalCompleted:false,
      portalObjective:null,
      portalCinematic:null,
      currentMap,
      enemies:mapState.enemies,
      asteroids:mapState.asteroids,
      stars:mapState.stars,
      dust:mapState.dust,
      nebulae,
      moveTarget:null,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[],
      particles:[],
      damageTexts:[],
      teleportLock:1.2,
      radiationWarned:false
    });
    clampPlayerToMap();
    player.safeZoneLock = options.safeNow || isPointInSafeArea(player, currentMap) ? 0 : SAFE_ZONE_DELAY;
    panels.closeSpawnPanel();
    saveState();
    showToast(`Entree dans ${currentMap.displayName || currentMap.name}.`);
    updateHud();
  }

  function isPlayerOutsideMap(){
    const {currentMap, gameMode, player} = getState();
    if(!currentMap || gameMode !== "open") return false;
    const halfW = currentMap.width / 2;
    const halfH = currentMap.height / 2;
    return player.x < -halfW || player.x > halfW || player.y < -halfH || player.y > halfH;
  }

  function updateRadiation(dt, handlePlayerDeath){
    if(isMultiplayerConnected()) return;
    const {gameMode, player, radiationWarned} = getState();
    if(gameMode !== "open" || !isPlayerOutsideMap()){
      player.radiationTimer = 30;
      setState({radiationWarned:false});
      return;
    }
    player.radiationTimer = Math.max(0, Number(player.radiationTimer ?? 30) - dt);
    if(!radiationWarned){
      setState({radiationWarned:true});
      showToast("Zone irradiee : retourne dans la carte ou ton vaisseau sera detruit.");
    }
    if(player.radiationTimer <= 0){
      showToast("Vaisseau detruit par la zone irradiee.");
      player.radiationTimer = 30;
      setState({radiationWarned:false});
      handlePlayerDeath();
    }
  }

  return {
    getMapState,
    getSafeAreas,
    getNearestPortal,
    getCurrentSafeArea,
    isSafeModeActive,
    getSpawnStations,
    getStationAt,
    loadMap,
    isPlayerOutsideMap,
    updateRadiation
  };
}
