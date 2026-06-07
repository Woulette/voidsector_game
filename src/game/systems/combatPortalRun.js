import { addAmmo, addInventoryItem, addXP, markPortalCompleted, saveState, store } from "../../core/store.js";
import { fmt } from "../../core/utils.js";
import { portals } from "../../data/catalog.js";
import { getFirmHomeMapName, normalizeFirmId } from "../../data/firms.js";
import { PORTAL_WAVE_TOTAL, SAFE_ZONE_DELAY } from "../combatData.js";
import { buildPortalEnvironment, buildPortalWave, createPortalMap } from "./portalState.js";

export function createCombatPortalRunSystem({
  mapList,
  getState,
  setState,
  cargo,
  beams,
  rewards,
  panels,
  clampPlayerToMap,
  showToast,
  updateHud,
  portalWaveDelay,
  portalStartingLives
}){
  function getPortalBatchEnd(startWave){
    if(startWave >= 27) return PORTAL_WAVE_TOTAL;
    return Math.min(PORTAL_WAVE_TOTAL, startWave + 1);
  }

  function getPlayerFirmId(){
    return normalizeFirmId(store.state.player?.firmId || store.state.player?.firm || store.state.player?.company || store.state.player?.faction || "astra");
  }

  function getHomeMapForPlayer(){
    const targetName = getFirmHomeMapName(getPlayerFirmId());
    return mapList.find(map=>String(map.name || "").toUpperCase() === targetName) || mapList[0];
  }

  function getCompletionRewards(portal, completedCount = 0){
    const base = {credits:0, xp:0, premium:0, ammoX4:0, ammoX6:0, itemId:null, itemName:null, itemDrops:[], unlocks:[]};
    if(portal?.id === "blue"){
      const dropsMk4 = completedCount <= 0 || Math.random() < 0.5;
      return {...base, credits:3000000, xp:400000, premium:20000, ammoX4:20000, itemId:dropsMk4 ? "laser_mk4" : null, itemName:dropsMk4 ? "Laser MK-IV" : null};
    }
    if(portal?.id === "violet") return {...base, premium:35000, ammoX4:35000, unlocks:["Acces vaisseaux a competence"]};
    if(portal?.id === "red") return {...base, premium:50000, ammoX4:50000, itemDrops:Math.random() < 0.5 ? [{id:"drone_overdrive_chip", name:"Noyau Overdrive Drone"}] : []};
    if(portal?.id === "emerald") return {...base, premium:50000, ammoX4:25000, itemDrops:Math.random() < 0.33 ? [{id:"laser_mk4", name:"Laser MK-IV"}] : [], unlocks:["Acces ameliorations"]};
    if(portal?.id === "void"){
      return {
        ...base,
        premium:60000,
        ammoX4:30000,
        itemDrops:[
          ...(Math.random() < 0.33 ? [{id:"laser_mk4", name:"Laser MK-IV"}] : []),
          ...(Math.random() < 0.33 ? [{id:"drone_overdrive_chip", name:"Noyau Overdrive Drone"}] : [])
        ],
        unlocks:["Acces recettes"]
      };
    }
    if(portal?.id === "ancient"){
      const dropsDrone = completedCount <= 0 || Math.random() < 0.5;
      return {...base, premium:100000, ammoX6:10000, itemDrops:dropsDrone ? [{id:"ancestral_drone_core", name:"Noyau de Drone Ancestral"}] : [], unlocks:["Acces prestige", "Cap niveau 100", "Laser ancestral craftable"]};
    }
    return base;
  }

  function spawnExit(){
    const {currentMap, gameMode} = getState();
    if(!currentMap || gameMode !== "portal") return;
    const homeMap = getHomeMapForPlayer();
    currentMap.portal = {
      x:0,
      y:0,
      r:110,
      safeRadius:270,
      activationRadius:320,
      targetMap:homeMap.id,
      targetX:homeMap.spawn?.x ?? 0,
      targetY:homeMap.spawn?.y ?? 0,
      label:`SORTIE ${homeMap.name}`
    };
  }

  function spawnWave(wave){
    const {missileSalvos, enemySeq} = getState();
    const batchEnd = getPortalBatchEnd(wave);
    let nextEnemySeq = enemySeq;
    const spawned = [];
    for(let currentWave = wave; currentWave <= batchEnd; currentWave++){
      const built = buildPortalWave(currentWave, nextEnemySeq);
      nextEnemySeq = built.nextEnemySeq;
      spawned.push(...built.enemies);
    }
    missileSalvos.clear();
    beams.clear();
    cargo.setCargoBoxes([]);
    cargo.clearPending();
    setState({
      enemySeq:nextEnemySeq,
      portalWave:batchEnd,
      portalDelay:portalWaveDelay,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[],
      enemies:getState().enemies.concat(spawned)
    });
    showToast(wave < PORTAL_WAVE_TOTAL ? `Portail : vague ${wave}/${PORTAL_WAVE_TOTAL}` : "Vague 30/30 · Boss !");
    updateHud();
  }

  function completeRun(){
    const {portalCompleted, activePortal} = getState();
    if(portalCompleted || !activePortal) return;
    setState({portalCompleted:true});
    const previousCompletions = Math.max(0, Number(store.state.completedPortals?.[activePortal.id] || 0));
    const completionRewards = getCompletionRewards(activePortal, previousCompletions);
    markPortalCompleted(activePortal.id);
    if(store.state.portalRuns) delete store.state.portalRuns[activePortal.id];
    store.state.player.credits += completionRewards.credits;
    store.state.player.premium += completionRewards.premium;
    addAmmo("ammo_x4", completionRewards.ammoX4);
    addAmmo("ammo_x6", completionRewards.ammoX6);
    if(completionRewards.itemId) addInventoryItem(completionRewards.itemId);
    for(const drop of completionRewards.itemDrops || []) addInventoryItem(drop.id);
    if(addXP(completionRewards.xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de compétence.`);
    spawnExit();
    rewards.showLootNotice({
      message:"Vous avez gagne",
      credits:completionRewards.credits,
      xp:completionRewards.xp,
      premium:completionRewards.premium,
      ammo:[
        ...(completionRewards.ammoX4 ? [`+${fmt(completionRewards.ammoX4)} munitions x4`] : []),
        ...(completionRewards.ammoX6 ? [`+${fmt(completionRewards.ammoX6)} munitions x6`] : [])
      ],
      items:[
        ...(completionRewards.itemName ? [`+1 ${completionRewards.itemName}`] : []),
        ...(completionRewards.itemDrops || []).map(drop=>`+1 ${drop.name}`),
        ...(completionRewards.unlocks || [])
      ]
    });
    showToast(`${activePortal.name} termine : portail de sortie ouvert.`);
    saveState();
    updateHud();
  }

  function loadArena(portalId){
    const portal = portals.find(p=>p.id === portalId) || portals[0];
    const savedRun = store.state.portalRuns?.[portal.id];
    const currentMap = createPortalMap(portal);
    const environment = buildPortalEnvironment(portalId, currentMap);
    const {player, missileSalvos} = getState();
    if(!store.state.portalRuns) store.state.portalRuns = {};
    const portalLives = savedRun?.lives > 0 ? Math.min(portalStartingLives, Math.round(savedRun.lives)) : portalStartingLives;
    store.state.portalRuns[portal.id] = {lives:portalLives, status:"active"};
    cargo.clear();
    player.x = currentMap.spawn.x;
    player.y = currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    player.safeZoneLock = SAFE_ZONE_DELAY;
    missileSalvos.clear();
    beams.clear();
    setState({
      gameMode:"portal",
      activePortal:portal,
      portalWave:0,
      portalDelay:.35,
      portalCompleted:false,
      portalLives,
      currentMap,
      enemies:[],
      asteroids:environment.asteroids,
      stars:environment.stars,
      dust:environment.dust,
      nebulae:environment.nebulae,
      moveTarget:null,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[],
      particles:[],
      damageTexts:[],
      teleportLock:1.2
    });
    clampPlayerToMap();
    saveState();
    panels.closeSpawnPanel();
    showToast(`Acces a ${portal.name}. 30 vagues detectees.`);
    updateHud();
  }

  return {
    getPortalBatchEnd,
    getHomeMapForPlayer,
    getCompletionRewards,
    spawnExit,
    spawnWave,
    completeRun,
    loadArena
  };
}
