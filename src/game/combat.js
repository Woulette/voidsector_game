import { ammoTypes, equipment, portals, ships } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import { keyCodeToLabel, slotIndexFromEvent } from "../core/keybinds.js";
import {
  addAmmo,
  addInventoryItem,
  addMaterial,
  addPortalPiece,
  addXP,
  acceptQuest,
  canAfford,
  claimQuest,
  claimRefineryJob,
  consumeAmmo,
  getActiveQuest,
  getAllQuests,
  getAllRawMaterials,
  getAmmo,
  getAmmoCount,
  getCurrentRank,
  getDroneLoadout,
  getEquippedDroneLasers,
  getEquippedExtras,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getEquippedLasers,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getRequiredLevel,
  getRankAssetPath,
  getQuestProgress,
  getRefineryJob,
  getRefineryRecipes,
  getShip,
  getShipCombatStats,
  getSkillBonus,
  isUnlockedForPlayer,
  isRefineryComplete,
  markPortalCompleted,
  recordQuestKill,
  registerKill,
  saveState,
  setActionSlot,
  startRefineryJob,
  spend,
  store,
  upgradeEquipment
} from "../core/store.js";

const MAPS = [
  {
    id:0,
    name:"ASTRA-01",
    width:5200,
    height:3600,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-2250,y:1450,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:{x:2260,y:-1420,r:95,safeRadius:230,targetMap:1,targetX:2550,targetY:-1500,label:"VERS ASTRA-02"},
    enemyCount:18,
    enemyLevel:[1,3],
    enemySeed:7,
    bg:"assets/maps/astra01_bg.jpg",
    enemyTypes:[
      {id:"drone_pirate", weight:.70},
      {id:"raider_astral", weight:.30}
    ]
  },
  {
    id:1,
    name:"ASTRA-02",
    width:6000,
    height:4200,
    spawn:{x:-2650,y:1750,r:260,label:"ZONE DE SPAWN", safeRadius:260, decorRadius:340},
    portal:{x:2550,y:-1500,r:95,safeRadius:230,targetMap:0,targetX:2260,targetY:-1420,label:"VERS ASTRA-01"},
    enemyCount:30,
    enemyLevel:[3,7],
    enemySeed:19,
    bg:"assets/maps/astra02_bg.jpg",
    // Trois familles de vaisseaux ennemis sur ASTRA-02.
    enemyTypes:[
      {id:"raider_astral", weight:.46},
      {id:"chasseur_spectral", weight:.34},
      {id:"cuirasse_nebulaire", weight:.20}
    ]
  }
];

const ENEMY_TYPES = {
  drone_pirate:{
    name:"Drone pirate",
    img:"assets/enemies/drone_pirate.png",
    maxHp:(level)=>1000 + level*120,
    speed:(level)=>78 + level*4,
    radius:26,
    width:74,
    height:74,
    attackRange:450,
    attackDamage:(level)=>34 + level*4,
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:{credits:800,xp:80,premium:1}
  },
  raider_astral:{
    name:"Raider astral",
    img:"assets/enemies/raider_astral.png",
    maxHp:(level)=>1450 + level*170,
    speed:(level)=>62 + level*3,
    radius:36,
    width:88,
    height:88,
    attackRange:450,
    attackDamage:(level)=>52 + level*5,
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{credits:800,xp:80,premium:1}
  },
  chasseur_spectral:{
    name:"Chasseur spectral",
    img:"assets/enemies/chasseur_spectral.png",
    maxHp:(level)=>2200 + level*220,
    speed:(level)=>72 + level*3,
    radius:34,
    width:86,
    height:86,
    attackRange:450,
    attackDamage:(level)=>78 + Math.round(level*6),
    attackCooldown:1.28,
    projectileSpeed:720,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    loot:{credits:2400,xp:220,premium:3}
  },
  cuirasse_nebulaire:{
    name:"Cuirassé nébulaire",
    img:"assets/enemies/cuirasse_nebulaire.png",
    maxHp:(level)=>3200 + level*260,
    speed:(level)=>46 + level*2,
    radius:46,
    width:106,
    height:106,
    attackRange:450,
    attackDamage:(level)=>118 + Math.round(level*8),
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    loot:{credits:6000,xp:700,premium:8}
  }
};

const RADAR_RANGE = 950;
const AGGRO_RANGE = 760;
const LEASH_RANGE = 1280;
const PLAYER_COLLISION_RADIUS = 38;
const PLAYER_HIT_CHANCE = 0.92;
const SAFE_ZONE_DELAY = 15;
const RAW_DROP_TABLE = [
  {id:"ferraille", min:1, max:3, chance:0.95},
  {id:"cristal", min:1, max:2, chance:0.42},
  {id:"plasma", min:1, max:2, chance:0.26}
];
const ENEMY_HIT_CHANCE = {
  drone_pirate:0.86,
  raider_astral:0.89,
  chasseur_spectral:0.91,
  cuirasse_nebulaire:0.93
};

const PORTAL_WAVE_TOTAL = 30;

export function createCombatGame({renderAll, showToast}){
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const cache = {};
  const mapStates = new Map();

  let running = false;
  let last = 0;
  let hudT = 0;
  let enemySeq = 1;
  let currentMap = MAPS[0];
  let teleportLock = 0;
  let lootTimer = 0;
  let lastLoot = null;
  let player, camera, keys, mouse, bullets, enemies, particles, damageTexts, stars, dust, nebulae, asteroids, moveTarget, selectedEnemy;
  let activeLaserSlot, ammoCooldowns, combatPanelTab;
  let gameMode, activePortal, portalWave, portalDelay, portalCompleted;
  let spawnPanelMode = null;

  function preload(){
    const enemySprites = Object.values(ENEMY_TYPES).map(type=>type.img);
    const mapImages = MAPS.map(map=>map.bg).filter(Boolean);
    const rankImages = ["none","soldat2","soldat1","caporal","caporal_chef","sergent","sergent_chef","adjudant","adjudant_chef","major","aspirant","sous_lieutenant","lieutenant","capitaine","commandant","lieutenant_colonel","colonel","general"].map(id=>`assets/ranks/${id}.svg`);
    const misc = ["assets/equipment/drone_orbital.svg", ...rankImages];
    [...ships.map(s=>s.img), ...equipment.map(i=>i.img), ...enemySprites, ...mapImages, ...misc].forEach(src=>{
      if(cache[src]) return;
      const img = new Image();
      img.src = src;
      cache[src] = img;
    });
  }

  function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

  function seededRandom(seed){
    let value = seed % 2147483647;
    return ()=>{
      value = value * 16807 % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function chooseEnemyType(map, rnd){
    const list = map.enemyTypes?.length ? map.enemyTypes : [{id:"drone_pirate", weight:1}];
    const total = list.reduce((sum, entry)=>sum + entry.weight, 0) || 1;
    let roll = rnd() * total;
    for(const entry of list){
      roll -= entry.weight;
      if(roll <= 0) return ENEMY_TYPES[entry.id] || ENEMY_TYPES.drone_pirate;
    }
    return ENEMY_TYPES[list[list.length-1].id] || ENEMY_TYPES.drone_pirate;
  }

  function buildMapState(map){
    const rnd = seededRandom(1000 + map.enemySeed);
    const generatedEnemies = [];
    for(let i=0;i<map.enemyCount;i++){
      let x, y, tries = 0;
      do{
        x = rnd()*map.width - map.width/2;
        y = rnd()*map.height - map.height/2;
        tries++;
      }while((Math.hypot(x-map.spawn.x,y-map.spawn.y) < map.spawn.r + 520 || Math.hypot(x-map.portal.x,y-map.portal.y) < 360) && tries < 80);
      const level = Math.floor(map.enemyLevel[0] + rnd()*(map.enemyLevel[1]-map.enemyLevel[0]+1));
      const enemyType = chooseEnemyType(map, rnd);
      const maxHp = enemyType.maxHp(level);
      generatedEnemies.push({
        id:enemySeq++,
        x,y,homeX:x,homeY:y,
        hp:maxHp,maxHp,level,
        kind:Object.keys(ENEMY_TYPES).find(key=>ENEMY_TYPES[key] === enemyType) || "drone_pirate",
        type:enemyType.name,
        img:enemyType.img,
        width:enemyType.width,
        height:enemyType.height,
        speed:enemyType.speed(level),
        radius:enemyType.radius,
        attackRange:enemyType.attackRange,
        attackDamage:enemyType.attackDamage(level),
        attackCooldown:enemyType.attackCooldown,
        projectileSpeed:enemyType.projectileSpeed,
        color:enemyType.color,
        particle:enemyType.particle,
        loot:enemyType.loot,
        aggro:false,
        angle:0,
        hitT:rnd()*.75
      });
    }
    return {
      enemies:generatedEnemies,
      asteroids:makeAsteroids(map, rnd),
      stars:makeStars(rnd),
      dust:makeDust(rnd)
    };
  }

  function getMapState(map){
    if(!mapStates.has(map.id)) mapStates.set(map.id, buildMapState(map));
    return mapStates.get(map.id);
  }

  function makeStars(rnd){
    const result = [];
    for(let layer=0; layer<3; layer++){
      const count = [240,180,95][layer];
      for(let i=0;i<count;i++){
        result.push({
          x:rnd()*9000-4500,
          y:rnd()*9000-4500,
          s:rnd()*[1.2,1.8,2.8][layer]+0.35,
          a:rnd()*[.35,.55,.85][layer]+.15,
          p:[.18,.42,.78][layer]
        });
      }
    }
    return result;
  }

  function makeDust(rnd){
    return Array.from({length:120},()=>({x:rnd()*7000-3500,y:rnd()*7000-3500,len:20+rnd()*70,a:.05+rnd()*.16,p:.9}));
  }

  function makeAsteroids(map, rnd){
    return Array.from({length:38},()=>({
      x:rnd()*map.width-map.width/2,
      y:rnd()*map.height-map.height/2,
      r:14+rnd()*48,
      rot:rnd()*Math.PI,
      shade:rnd(),
      verts:Array.from({length:9},(_,i)=>.72 + Math.sin(i*2.17+rnd()*6.28)*.18 + rnd()*.08)
    })).filter(a=>Math.hypot(a.x-map.spawn.x,a.y-map.spawn.y) > map.spawn.r + 140);
  }

  function getSafeAreas(map = currentMap){
    const zones = [];
    if(map?.spawn) zones.push({id:"spawn", label:map.spawn.label || "Zone de spawn", x:map.spawn.x, y:map.spawn.y, r:map.spawn.safeRadius || map.spawn.r || 260, type:"spawn"});
    if(map?.portal) zones.push({id:"portal", label:"Zone portail", x:map.portal.x, y:map.portal.y, r:map.portal.safeRadius || Math.max(180, (map.portal.r || 90) * 2.2), type:"portal"});
    return zones;
  }

  function getCurrentSafeArea(){
    return getSafeAreas().find(zone=>Math.hypot(player.x-zone.x, player.y-zone.y) <= zone.r) || null;
  }

  function isSafeModeActive(){
    if(gameMode !== "open") return false;
    return !!getCurrentSafeArea() && (player.safeZoneLock || 0) <= 0;
  }

  function markCombatActivity(reason = "combat"){
    player.safeZoneLock = SAFE_ZONE_DELAY;
    if(reason === "outgoing") player.lastAggression = performance.now();
  }

  function getSpawnStations(){
    if(gameMode !== "open" || !currentMap?.spawn) return [];
    return [
      {id:"quests", x:currentMap.spawn.x - 128, y:currentMap.spawn.y - 86, radius:48, title:"RELAIS DE QUÊTES", subtitle:"Recevoir et rendre des missions"},
      {id:"refinery", x:currentMap.spawn.x + 132, y:currentMap.spawn.y - 90, radius:52, title:"RAFFINEUR", subtitle:"Fusionner et améliorer l’équipement"}
    ];
  }

  function getStationAt(world){
    return getSpawnStations().find(station=>Math.hypot(world.x-station.x, world.y-station.y) <= station.radius + 18) || null;
  }

  function closeSpawnPanel(){
    spawnPanelMode = null;
    document.getElementById("spawnInteractionPanel")?.classList.add("hidden");
  }

  function formatDuration(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function loadMap(mapId, x, y){
    gameMode = "open";
    activePortal = null;
    portalWave = 0;
    portalDelay = 0;
    portalCompleted = false;
    currentMap = MAPS.find(m=>m.id === mapId) || MAPS[0];
    const mapState = getMapState(currentMap);
    enemies = mapState.enemies;
    asteroids = mapState.asteroids;
    stars = mapState.stars;
    dust = mapState.dust;
    nebulae = currentMap.id === 0 ? [
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
    clampPlayerToMap();
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = 0;
    closeSpawnPanel();
    showToast(`Entrée dans ${currentMap.name}.`);
    updateHud();
  }

  function createPortalMap(portal){
    return {
      id:`portal-${portal.id}`,
      name:portal.name.toUpperCase(),
      width:3600,
      height:2600,
      spawn:{x:0,y:920,r:220,label:"ZONE D'ENTRÉE"},
      portal:null
    };
  }

  function makePortalEnemy(kind, wave, x, y, boss=false){
    const base = ENEMY_TYPES[kind] || ENEMY_TYPES.drone_pirate;
    const level = boss ? 20 + wave : Math.max(1, Math.round(1 + wave * 0.65));
    const maxHp = base.maxHp(level) * (boss ? 2.2 : 1);
    return {
      id:enemySeq++,
      x,y,homeX:x,homeY:y,
      hp:maxHp,maxHp,level,
      kind,
      type: boss ? `${base.name} Alpha` : base.name,
      img:base.img,
      width: boss ? Math.round(base.width * 1.22) : base.width,
      height: boss ? Math.round(base.height * 1.22) : base.height,
      speed: base.speed(level) * (boss ? 0.9 : 1),
      radius: boss ? Math.round(base.radius * 1.18) : base.radius,
      attackRange:450,
      attackDamage: Math.round(base.attackDamage(level) * (boss ? 1.5 : 1)),
      attackCooldown: boss ? Math.max(0.9, base.attackCooldown * 0.82) : base.attackCooldown,
      projectileSpeed: base.projectileSpeed,
      color:base.color,
      particle:base.particle,
      loot: boss ? {credits:base.loot.credits*2, xp:base.loot.xp*2, premium:base.loot.premium} : base.loot,
      aggro:true,
      angle:0,
      hitT:0.6 + Math.random() * 0.5
    };
  }

  function spawnPortalWave(wave){
    portalWave = wave;
    portalDelay = 0;
    selectedEnemy = null;
    bullets = [];
    const list = [];
    if(wave >= PORTAL_WAVE_TOTAL){
      list.push(makePortalEnemy("cuirasse_nebulaire", wave, 0, -760, true));
    }else{
      const batch = Math.ceil(wave / 5);
      const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
      const kinds = batch <= 2 ? ["drone_pirate","raider_astral"] : batch <= 4 ? ["raider_astral","chasseur_spectral"] : ["chasseur_spectral","cuirasse_nebulaire"];
      for(let i=0;i<count;i++){
        const kind = kinds[i % kinds.length];
        const side = i % 3;
        const x = side === 0 ? -1180 + i*70 : side === 1 ? 1180 - i*65 : -380 + i*92;
        const y = -760 - (i%4)*88;
        list.push(makePortalEnemy(kind, wave, x, y, false));
      }
    }
    enemies = list;
    showToast(wave < PORTAL_WAVE_TOTAL ? `Portail : vague ${wave}/${PORTAL_WAVE_TOTAL}` : "Vague 30/30 · Boss !");
    updateHud();
  }

  function completePortalRun(){
    if(portalCompleted || !activePortal) return;
    portalCompleted = true;
    markPortalCompleted(activePortal.id);
    store.state.player.premium += 20000;
    addAmmo("ammo_x4", 20000);
    addInventoryItem("laser_mk4");
    showToast(`${activePortal.name} terminé : +20 000 NOVA, +20 000 munitions x4, +1 Laser MK-IV.`);
    saveState();
    updateHud();
  }

  function loadPortalArena(portalId){
    const portal = portals.find(p=>p.id === portalId) || portals[0];
    gameMode = "portal";
    activePortal = portal;
    portalWave = 0;
    portalDelay = 0.35;
    portalCompleted = false;
    currentMap = createPortalMap(portal);
    const rnd = seededRandom(8000 + portalId.length * 37);
    enemies = [];
    asteroids = makeAsteroids({width:currentMap.width,height:currentMap.height,spawn:currentMap.spawn,portal:{x:9999,y:9999,r:0}}, rnd).slice(0, 18);
    stars = makeStars(rnd);
    dust = makeDust(rnd);
    nebulae = [
      {x:-720,y:-360,r:920,c:"rgba(168,85,247,.13)",p:.20},
      {x:860,y:-540,r:780,c:"rgba(56,189,248,.10)",p:.18},
      {x:0,y:940,r:620,c:"rgba(251,146,60,.08)",p:.12}
    ];
    player.x = currentMap.spawn.x;
    player.y = currentMap.spawn.y;
    clampPlayerToMap();
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = SAFE_ZONE_DELAY;
    closeSpawnPanel();
    showToast(`Accès à ${portal.name}. 30 vagues détectées.`);
    updateHud();
  }

  function start(entry="open"){
    preload(); resize();
    running = true;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
    const stats = getShipCombatStats(store.state.activeShip);
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    player = {
      x:0,y:0,angle:0,
      hp:stats.vie,maxHp:stats.vie,
      shield:stats.bouclier,maxShield:stats.bouclier,regen:stats.regen,
      speed:stats.vitesseReelle,
      displayedSpeed:stats.vitesseReelle,
      damageBonus:stats.weaponDamage,
      damageMultiplier:1 + Number(stats.weaponDamagePercent || 0),
      shieldAbsorbRatio:Math.max(0, Math.min(0.9, Number(stats.shieldAbsorbRatio ?? 0.5))),
      extraBonus:stats.extraBonus || {autoRocket:false, rocketCooldownMultiplier:1, rocketDamageBonus:0, repairBot:false, repairBotAuto:false, repairBotHealRate:0.02, repairBotDelay:15},
      radar:RADAR_RANGE,
      droneOrbit:0,
      secondsSinceDamage:999,
      repairBotActive:false,
      safeZoneLock:0,
      lastAggression:0
    };
    camera = {x:-canvas.width/2,y:-canvas.height/2};
    keys = {}; mouse = {x:canvas.width/2,y:canvas.height/2};
    bullets = []; particles = []; damageTexts = []; selectedEnemy = null; moveTarget = null;
    activeLaserSlot = store.state.actionSlots.findIndex(id=>{
      const ammo = getAmmo(id);
      return ammo && ammo.weaponClass !== "rocket" && getAmmoCount(id) > 0;
    });
    if(activeLaserSlot < 0) activeLaserSlot = null;
    ammoCooldowns = {};
    combatPanelTab = "ammo";
    hudT = 0; lastLoot = null; lootTimer = 0;
    if(typeof entry === "string" && entry.startsWith("portal:")) loadPortalArena(entry.split(":")[1] || "blue");
    else loadMap(0, MAPS[0].spawn.x, MAPS[0].spawn.y);
    renderGameActionBar();
    renderCombatQuickPanel();
    updateHud();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function stop(save=true){
    if(!running) return;
    running = false;
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("combatQuickPanel").classList.add("hidden");
    closeSpawnPanel();
    if(save){
      saveState();
      renderAll();
      showToast("Retour hangar.");
    }
  }

  function worldFromScreen(sx, sy){ return {x: sx + camera.x, y: sy + camera.y}; }

  function inputDir(){
    let dx=0,dy=0;
    if(keys["z"]||keys["w"]||keys["arrowup"]) dy-=1;
    if(keys["s"]||keys["arrowdown"]) dy+=1;
    if(keys["q"]||keys["a"]||keys["arrowleft"]) dx-=1;
    if(keys["d"]||keys["arrowright"]) dx+=1;
    const len = Math.hypot(dx,dy) || 1;
    return {x:dx/len,y:dy/len,active:dx!==0||dy!==0};
  }

  function clampPlayerToMap(){
    const halfW = currentMap.width/2;
    const halfH = currentMap.height/2;
    player.x = Math.max(-halfW + 65, Math.min(halfW - 65, player.x));
    player.y = Math.max(-halfH + 65, Math.min(halfH - 65, player.y));
  }

  function findEnemyAt(world){
    let best = null, bestD = Infinity;
    for(const e of enemies){
      const d = Math.hypot(world.x-e.x, world.y-e.y);
      if(d < e.radius + 28 && d < bestD){ best = e; bestD = d; }
    }
    return best;
  }

  function validSelectedEnemy(){
    if(!selectedEnemy) return null;
    const live = enemies.find(e=>e.id === selectedEnemy.id && e.hp > 0);
    if(!live) selectedEnemy = null; else selectedEnemy = live;
    return selectedEnemy;
  }

  function rollBetween(min, max){
    const lo = Number(min ?? 0);
    const hi = Number(max ?? lo);
    return lo + Math.random() * Math.max(0, hi - lo);
  }

  function describeAmmo(ammo){
    if(!ammo) return "Aucune";
    return ammo.weaponClass === "rocket" ? `${ammo.name} (${ammo.damageMin}-${ammo.damageMax})` : `${ammo.name} (x${ammo.multiplier})`;
  }

  function getCombatAmmo(index){ return getAmmo(store.state.actionSlots?.[index]); }

  function getAmmoCooldown(ammoId){
    return Math.max(0, ammoCooldowns?.[ammoId] || 0);
  }

  function setAmmoCooldown(ammo, seconds){
    if(!ammo) return;
    ammoCooldowns[ammo.id] = Math.max(getAmmoCooldown(ammo.id), seconds || ammo.cooldown || 1);
  }

  function getEffectiveAmmoCooldown(ammo){
    if(!ammo) return 1;
    if(ammo.weaponClass === "rocket") return Math.max(.5, (ammo.cooldown || 5) * (player.extraBonus?.rocketCooldownMultiplier || 1));
    return ammo.cooldown || 1;
  }

  function getRocketDamageMultiplier(){
    return 1 + Math.max(0, player.extraBonus?.rocketDamageBonus || 0);
  }

  function getRepairBotDelay(){
    return Math.max(1, Number(player.extraBonus?.repairBotDelay || 15));
  }

  function getRepairBotHealPerSecond(){
    return Math.max(0.005, Number(player.extraBonus?.repairBotHealRate || 0.02));
  }

  function canRepairBotActivate(){
    if(!player.extraBonus?.repairBot) return {ok:false, reason:"Aucun Robot Réparateur équipé."};
    if(player.hp >= player.maxHp) return {ok:false, reason:"Ta coque est déjà au maximum."};
    const remain = Math.max(0, getRepairBotDelay() - Number(player.secondsSinceDamage || 0));
    if(remain > 0) return {ok:false, reason:`Réparation bloquée : attente ${remain.toFixed(1).replace('.', ',')}s.`};
    return {ok:true, reason:"Prêt"};
  }

  function stopRepairBot(silent = true){
    const wasActive = !!player.repairBotActive;
    player.repairBotActive = false;
    if(!silent && wasActive) showToast("Robot réparateur désactivé.");
  }

  function activateRepairBot(manual = false){
    const state = canRepairBotActivate();
    if(!state.ok){
      if(manual) showToast(state.reason);
      return false;
    }
    if(player.repairBotActive) return true;
    player.repairBotActive = true;
    showToast(manual ? "Robot réparateur activé." : "IA d’auto-réparation : robot activé.");
    return true;
  }

  function updateRepairBot(dt){
    player.secondsSinceDamage = Math.min(999, Number(player.secondsSinceDamage || 0) + dt);
    if(!player.extraBonus?.repairBot){
      player.repairBotActive = false;
      return;
    }
    if(player.extraBonus?.repairBotAuto && !player.repairBotActive && player.hp < player.maxHp && player.secondsSinceDamage >= getRepairBotDelay()){
      activateRepairBot(false);
    }
    if(!player.repairBotActive) return;
    if(player.secondsSinceDamage < getRepairBotDelay()){
      stopRepairBot(true);
      return;
    }
    if(player.hp >= player.maxHp){
      player.hp = player.maxHp;
      stopRepairBot(true);
      return;
    }
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * getRepairBotHealPerSecond() * dt);
  }

  function selectActionSlot(index){
    const ammo = getCombatAmmo(index);
    if(!ammo) return showToast(`Slot ${index+1} vide.`);
    if(getAmmoCount(ammo.id) <= 0) return showToast(`${ammo.name} : stock vide.`);

    if(ammo.weaponClass === "rocket"){
      fireManualRocket(index, ammo);
      return;
    }

    activeLaserSlot = index;
    showToast(`Laser actif : slot ${index+1} · ${describeAmmo(ammo)}.`);
    updateGameActionBar();
  }

  function getLaserVolley(){
    const shipLasers = getEquippedLasers(store.state.activeShip).filter(item=>item?.weapon);
    const droneLasers = getEquippedDroneLasers().filter(item=>item?.weapon);
    const lasers = [...shipLasers, ...droneLasers];
    const bonus = player.damageBonus || 0;
    const multiplier = Math.max(0.1, Number(player.damageMultiplier || 1));
    return {
      lasers,
      shipCount:shipLasers.length,
      droneCount:droneLasers.length,
      count:lasers.length,
      range:lasers.reduce((max, item)=>Math.max(max, item.weapon.range || 0), 0),
      speed:lasers.reduce((max, item)=>Math.max(max, item.weapon.speed || 0), 0) || 900,
      rollDamage(){
        const raw = lasers.reduce((sum, item)=>sum + rollBetween(item.weapon.minDamage ?? item.weapon.damage, item.weapon.maxDamage ?? item.weapon.damage) + bonus, 0);
        return raw * multiplier;
      }
    };
  }


  function getEnemyHitChance(enemy){
    return ENEMY_HIT_CHANCE[enemy?.kind] || 0.88;
  }

  function getBulletTarget(bullet){
    if(bullet.owner === "enemy") return {x:player.x, y:player.y, entity:player};
    const enemy = enemies.find(e=>e.id === bullet.targetId && e.hp > 0);
    return enemy ? {x:enemy.x, y:enemy.y, entity:enemy} : null;
  }

  function pushDamageText({x, y, value, color, shadowColor}){
    damageTexts.push({x, y, value, life:.92, max:.92, color, shadowColor});
  }

  function resolveBulletImpact(bullet){
    const target = getBulletTarget(bullet);
    if(!target) return;
    particles.push({x:bullet.x, y:bullet.y, life:.22, max:.22, size:12, color:bullet.particle || "rgba(125,211,252,.8)"});
    const hitChance = bullet.hitChance ?? (bullet.owner === "enemy" ? 0.88 : PLAYER_HIT_CHANCE);
    const hit = Math.random() <= hitChance;

    if(bullet.owner === "enemy"){
      if(hit){
        const dealt = Math.round(bullet.damage);
        damagePlayer(dealt);
        pushDamageText({x:player.x, y:player.y-58, value:dealt, color:"rgba(248,113,113,", shadowColor:"rgba(248,113,113,.78)"});
      }else{
        pushDamageText({x:player.x, y:player.y-58, value:"MISS", color:"rgba(226,232,240,", shadowColor:"rgba(148,163,184,.78)"});
      }
      return;
    }

    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0) return;
    if(hit){
      const dealt = Math.round(bullet.damage);
      enemy.hp -= dealt;
      enemy.aggro = true;
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
      if(enemy.hp <= 0) rewardEnemy(enemy);
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function shootAt(enemy, ammo, slotIndex){
    if(!enemy || !ammo) return false;
    const dx = enemy.x - player.x, dy = enemy.y - player.y;
    const dist = Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);

    if(ammo.weaponClass === "rocket"){
      if(dist > (ammo.range || 800)) return false;
      if(!consumeAmmo(ammo.id, 1)){
        showToast(`${ammo.name} épuisée.`);
        updateGameActionBar();
        renderCombatQuickPanel();
        return false;
      }
      markCombatActivity("outgoing");
      enemy.aggro = true;
      const startX = player.x + Math.cos(a)*48;
      const startY = player.y + Math.sin(a)*48;
      bullets.push({
        owner:"player",
        fromX:startX,
        fromY:startY,
        x:startX,
        y:startY,
        damage:rollBetween(ammo.damageMin, ammo.damageMax) * getRocketDamageMultiplier(),
        travelTime:Math.max(.14, Math.min(1.25, dist/(ammo.speed || 620) + .08)),
        elapsed:0,
        r:10,
        color:ammo.color,
        particle:ammo.particle,
        slotIndex,
        targetId:enemy.id,
        hitChance:PLAYER_HIT_CHANCE
      });
      particles.push({x:startX,y:startY,life:.24,max:.24,size:26,color:ammo.particle});
      saveState();
      updateGameActionBar();
      renderCombatQuickPanel();
      return true;
    }

    const volley = getLaserVolley();
    if(volley.count <= 0) return false;
    if(dist > volley.range) return false;
    if(!consumeAmmo(ammo.id, volley.count)){
      showToast(`${ammo.name} insuffisante : il faut ${volley.count} munition(s) par tir.`);
      if(activeLaserSlot === slotIndex) activeLaserSlot = null;
      updateGameActionBar();
      renderCombatQuickPanel();
      return false;
    }
    markCombatActivity("outgoing");
    enemy.aggro = true;
    const damage = volley.rollDamage() * (ammo.multiplier || 1);
    const startX = player.x + Math.cos(a)*45;
    const startY = player.y + Math.sin(a)*45;
    bullets.push({
      owner:"player",
      fromX:startX,
      fromY:startY,
      x:startX,
      y:startY,
      damage,
      travelTime:Math.max(.09, Math.min(1.1, dist/volley.speed + .04)),
      elapsed:0,
      r:5 + Math.min(5, volley.count),
      color:ammo.color,
      particle:ammo.particle,
      slotIndex,
      targetId:enemy.id,
      hitChance:PLAYER_HIT_CHANCE
    });
    particles.push({x:startX,y:startY,life:.18,max:.18,size:18 + volley.count*2,color:ammo.particle});
    saveState();
    updateGameActionBar();
    renderCombatQuickPanel();
    return true;
  }

  function fireManualRocket(index, ammo){
    const enemy = validSelectedEnemy();
    if(!enemy) return showToast("Sélectionne une cible avant de lancer une roquette.");
    if(getAmmoCooldown(ammo.id) > 0) return;
    const fired = shootAt(enemy, ammo, index);
    if(fired) setAmmoCooldown(ammo, getEffectiveAmmoCooldown(ammo));
  }

  function respawnPlayer(){
    player.hp = player.maxHp;
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.x = currentMap.spawn.x;
    player.y = currentMap.spawn.y;
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.6;
    showToast("Vaisseau détruit. Respawn au spawn.");
    updateHud();
  }

  function damagePlayer(amount){
    const incoming = Math.max(0, Number(amount || 0));
    if(incoming > 0){
      markCombatActivity("incoming");
      player.secondsSinceDamage = 0;
      player.repairBotActive = false;
    }
    const absorbRatio = player.shield > 0 ? Math.max(0, Math.min(0.9, Number(player.shieldAbsorbRatio ?? 0.5))) : 0;
    let shieldPart = incoming * absorbRatio;
    let hullPart = incoming - shieldPart;
    if(player.shield > 0){
      const absorbed = Math.min(player.shield, shieldPart);
      player.shield -= absorbed;
      shieldPart -= absorbed;
      hullPart += shieldPart;
    }else{
      hullPart = incoming;
    }
    if(hullPart > 0) player.hp -= hullPart;
    if(player.hp <= 0){ respawnPlayer(); }
  }

  function rewardEnemy(enemy){
    if(selectedEnemy && selectedEnemy.id === enemy.id) selectedEnemy = null;
    registerKill(enemy.kind);
    const questCompleted = recordQuestKill(enemy.kind, currentMap.name);
    const lootBonus = getSkillBonus().loot || 0;
    const loot = enemy.loot || ENEMY_TYPES[enemy.kind]?.loot || ENEMY_TYPES.drone_pirate.loot;
    const credits = Math.round(loot.credits * (1 + lootBonus/100) * (1 + enemy.level*.06));
    const xp = Math.round(loot.xp * (1 + enemy.level*.08));
    const premium = Math.max(Number(loot.premium || 0), Number(loot.premium || 0));
    store.state.player.credits += credits;
    store.state.player.premium += premium;
    if(addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de compétence.`);
    let pieceDrop = null;
    if(gameMode === "open"){
      for(const portal of portals){
        if(!portal.dropChance || !(portal.dropZones || []).includes(currentMap.name)) continue;
        if(Math.random() <= portal.dropChance){
          addPortalPiece(portal.id, 1);
          pieceDrop = portal;
          showToast(`Pièce de ${portal.name} trouvée !`);
          break;
        }
      }
    }
    const materials = [];
    for(const drop of RAW_DROP_TABLE){
      if(Math.random() > drop.chance) continue;
      const amount = Math.floor(drop.min + Math.random() * (drop.max - drop.min + 1));
      if(amount > 0){
        addMaterial(drop.id, amount);
        materials.push(`${amount} ${getAllRawMaterials().find(item=>item.id === drop.id)?.short || drop.id}`);
      }
    }
    if(questCompleted) showToast("Quête terminée : retourne au relais pour réclamer la récompense.");
    lastLoot = {credits,xp,premium,piece:pieceDrop ? `+1 pièce ${pieceDrop.name}` : null, materials};
    lootTimer = 3.2;
    for(let i=0;i<16;i++) particles.push({x:enemy.x,y:enemy.y,life:.5+Math.random()*.35,max:.75,size:4+Math.random()*11,color:i%2?"rgba(56,189,248,.9)":"rgba(239,68,68,.75)",vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180});
    saveState();
    updateLootPopup();
  }

  function fireAutomaticRocket(enemy){
    if(!player.extraBonus?.autoRocket || !enemy) return;
    const index = store.state.actionSlots.findIndex(id=>{
      const ammo = getAmmo(id);
      return ammo && ammo.weaponClass === "rocket" && getAmmoCount(ammo.id) > 0 && getAmmoCooldown(ammo.id) <= 0;
    });
    if(index < 0) return;
    const ammo = getCombatAmmo(index);
    const fired = shootAt(enemy, ammo, index);
    if(fired) setAmmoCooldown(ammo, getEffectiveAmmoCooldown(ammo));
  }

  function updateWeapons(dt){
    for(const id of Object.keys(ammoCooldowns || {})) ammoCooldowns[id] = Math.max(0, ammoCooldowns[id] - dt);
    const enemy = validSelectedEnemy();
    if(!enemy) return;

    fireAutomaticRocket(enemy);

    if(activeLaserSlot === null) return;
    const ammo = getCombatAmmo(activeLaserSlot);
    if(!ammo || ammo.weaponClass === "rocket") return;
    if(getLaserVolley().count <= 0) return;
    if(getAmmoCooldown(ammo.id) <= 0){
      const fired = shootAt(enemy, ammo, activeLaserSlot);
      if(fired) setAmmoCooldown(ammo, getEffectiveAmmoCooldown(ammo));
    }
  }

  function update(dt){
    teleportLock = Math.max(0, teleportLock - dt);
    lootTimer = Math.max(0, lootTimer - dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    if(lootTimer <= 0) updateLootPopup();

    if(isSafeModeActive()){
      bullets = bullets.filter(bullet=>bullet.owner !== "enemy");
      for(const enemy of enemies) enemy.aggro = false;
    }

    const dir = inputDir();
    if(dir.active){
      moveTarget = null;
      player.x += dir.x*player.speed*dt;
      player.y += dir.y*player.speed*dt;
    }else if(moveTarget){
      const dx = moveTarget.x-player.x, dy = moveTarget.y-player.y, d = Math.hypot(dx,dy);
      if(d < 8) moveTarget = null;
      else { player.x += dx/d*player.speed*dt; player.y += dy/d*player.speed*dt; }
    }
    clampPlayerToMap();

    if(gameMode === "portal"){
      if(!portalCompleted && enemies.length === 0){
        if(portalWave === 0 || portalWave < PORTAL_WAVE_TOTAL){
          portalDelay -= dt;
          if(portalDelay <= 0) spawnPortalWave(portalWave + 1);
        }else completePortalRun();
      }
    }else if(currentMap.portal){
      const portalD = Math.hypot(player.x-currentMap.portal.x, player.y-currentMap.portal.y);
      if(teleportLock <= 0 && portalD < currentMap.portal.r){
        loadMap(currentMap.portal.targetMap, currentMap.portal.targetX, currentMap.portal.targetY);
      }
    }

    const enemy = validSelectedEnemy();
    if(enemy) player.angle = Math.atan2(enemy.y-player.y, enemy.x-player.x)+Math.PI/2;
    else { const mw = worldFromScreen(mouse.x,mouse.y); player.angle = Math.atan2(mw.y-player.y,mw.x-player.x)+Math.PI/2; }

    updateEnemies(dt);
    updateWeapons(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateRepairBot(dt);

    if(player.maxShield > 0) player.shield = Math.min(player.maxShield, player.shield + (player.regen || 0)*dt);
    camera.x += (player.x-canvas.width/2-camera.x)*.12;
    camera.y += (player.y-canvas.height/2-camera.y)*.12;
    hudT -= dt; if(hudT <= 0){ updateHud(); updateGameActionBar(); if(!document.getElementById("combatQuickPanel")?.classList.contains("hidden")) renderCombatQuickPanel(); if(spawnPanelMode) renderSpawnInteractionPanel(spawnPanelMode); hudT = .10; }
  }

  function updateEnemies(dt){
    const safeMode = isSafeModeActive();
    for(const e of enemies){
      const dx = player.x-e.x, dy = player.y-e.y, d = Math.hypot(dx,dy) || 1;
      const range = e.attackRange || 600;
      if(safeMode) e.aggro = false;
      else if(!e.aggro && d < Math.max(AGGRO_RANGE, range + 120)) e.aggro = true;
      let returningHome = false;
      if(e.aggro && d > LEASH_RANGE){
        returningHome = true;
        const homeD = Math.hypot(e.x-e.homeX, e.y-e.homeY);
        if(homeD < 30){ e.aggro = false; returningHome = false; }
      }
      let tx = e.homeX, ty = e.homeY, speed = e.speed*.35;
      if(e.aggro && !returningHome){
        const preferredDistance = range * .72;
        if(d > preferredDistance){ tx = player.x; ty = player.y; speed = e.speed; }
        else if(d < Math.max(120, e.radius + PLAYER_COLLISION_RADIUS + 40)){ tx = e.x - dx; ty = e.y - dy; speed = e.speed*.75; }
        else { tx = e.x; ty = e.y; speed = 0; }
      }
      const ex = tx-e.x, ey = ty-e.y, ed = Math.hypot(ex,ey) || 1;
      if(speed > 0 && ed > 12){ e.x += ex/ed*speed*dt; e.y += ey/ed*speed*dt; }
      e.angle = Math.atan2(dy,dx)+Math.PI/2;
      e.hitT -= dt;
      if(!safeMode && e.aggro && d <= range && e.hitT <= 0){
        fireEnemyBullet(e, dx, dy, d);
        e.hitT = e.attackCooldown || 1.4;
      }
    }
  }

  function fireEnemyBullet(enemy, dx, dy, dist){
    const d = dist || Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);
    const speed = enemy.projectileSpeed || 600;
    const startX = enemy.x + Math.cos(a)*(enemy.radius+14);
    const startY = enemy.y + Math.sin(a)*(enemy.radius+14);
    bullets.push({
      owner:"enemy",
      fromX:startX,
      fromY:startY,
      x:startX,
      y:startY,
      damage:enemy.attackDamage || 10,
      travelTime:Math.max(.11, Math.min(1.15, d/speed + .06)),
      elapsed:0,
      r:5,
      color:enemy.color || "rgba(248,113,113,.95)",
      particle:enemy.particle || "rgba(252,165,165,.75)",
      sourceId:enemy.id,
      hitChance:getEnemyHitChance(enemy)
    });
    particles.push({x:startX,y:startY,life:.16,max:.16,size:16,color:enemy.particle || "rgba(252,165,165,.72)"});
  }

  function updateBullets(dt){
    for(const b of bullets){
      b.elapsed += dt;
      const target = getBulletTarget(b);
      if(!target){
        b.done = true;
        continue;
      }
      const progress = Math.min(1, b.elapsed / Math.max(.001, b.travelTime || .1));
      b.x = b.fromX + (target.x - b.fromX) * progress;
      b.y = b.fromY + (target.y - b.fromY) * progress;
      if(progress >= 1){
        resolveBulletImpact(b);
        b.done = true;
      }
    }
    bullets = bullets.filter(b=>!b.done);
    enemies = enemies.filter(e=>e.hp>0);
    getMapState(currentMap).enemies = enemies;
  }

  function updateParticles(dt){
    for(const p of particles){ p.life -= dt; p.x += (p.vx||0)*dt; p.y += (p.vy||0)*dt; }
    particles = particles.filter(p=>p.life>0);
    for(const t of damageTexts){ t.life -= dt; t.y -= 38*dt; }
    damageTexts = damageTexts.filter(t=>t.life>0);
  }

  function drawBackground(){
    const w = canvas.width, h = canvas.height;
    const bg = ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,"#01040b"); bg.addColorStop(.55,"#07182b"); bg.addColorStop(1,"#01040b");
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

    const bgImg = currentMap?.bg ? cache[currentMap.bg] : null;
    if(bgImg && bgImg.complete){
      const worldX = -currentMap.width/2;
      const worldY = -currentMap.height/2;
      ctx.save();
      ctx.globalAlpha = .7;
      ctx.drawImage(bgImg, worldX - camera.x, worldY - camera.y, currentMap.width, currentMap.height);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    for(const n of nebulae){
      const sx = n.x - camera.x*n.p + w/2, sy = n.y - camera.y*n.p + h/2;
      const g = ctx.createRadialGradient(sx,sy,0,sx,sy,n.r);
      g.addColorStop(0,n.c); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    }
    ctx.save();
    for(const s of stars){
      const span = 9000;
      let sx = (s.x - camera.x*s.p) % span;
      let sy = (s.y - camera.y*s.p) % span;
      if(sx < -span/2) sx += span; if(sx > span/2) sx -= span;
      if(sy < -span/2) sy += span; if(sy > span/2) sy -= span;
      sx += w/2; sy += h/2;
      if(sx < -10 || sx > w+10 || sy < -10 || sy > h+10) continue;
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath(); ctx.arc(sx,sy,s.s,0,Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(125,211,252,.10)";
    for(const d of dust){
      const sx = d.x - camera.x*d.p + w/2, sy = d.y - camera.y*d.p + h/2;
      if(sx < -100 || sx > w+100 || sy < -100 || sy > h+100) continue;
      ctx.globalAlpha = d.a; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+d.len, sy+d.len*.18); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  function drawGrid(){
    ctx.save(); ctx.translate(-camera.x,-camera.y);
    const size = 120, startX = Math.floor((camera.x-50)/size)*size, endX = camera.x+canvas.width+50, startY = Math.floor((camera.y-50)/size)*size, endY = camera.y+canvas.height+50;
    ctx.strokeStyle = "rgba(56,189,248,.065)"; ctx.lineWidth = 1;
    for(let x=startX;x<endX;x+=size){ ctx.beginPath(); ctx.moveTo(x,startY); ctx.lineTo(x,endY); ctx.stroke(); }
    for(let y=startY;y<endY;y+=size){ ctx.beginPath(); ctx.moveTo(startX,y); ctx.lineTo(endX,y); ctx.stroke(); }
    drawMapBounds();
    ctx.restore();
  }

  function drawMapBounds(){
    const x = -currentMap.width/2, y = -currentMap.height/2;
    ctx.strokeStyle = "rgba(56,189,248,.45)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x,y,currentMap.width,currentMap.height);
  }

  function drawSpawnStations(){
    for(const station of getSpawnStations()){
      const glow = 6 + Math.sin(performance.now()/220 + station.x*0.002) * 4;
      ctx.save();
      ctx.translate(station.x, station.y);
      ctx.fillStyle = station.id === "quests" ? "rgba(14,165,233,.22)" : "rgba(251,191,36,.18)";
      ctx.strokeStyle = station.id === "quests" ? "rgba(56,189,248,.92)" : "rgba(250,204,21,.92)";
      ctx.shadowColor = station.id === "quests" ? "rgba(56,189,248,.75)" : "rgba(250,204,21,.65)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-38,-28,76,56,14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(226,232,240,.95)";
      ctx.font = "700 18px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.fillText(station.id === "quests" ? "Q" : "R", 0, 7);
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.beginPath();
      ctx.arc(0, 0, station.radius + glow, 0, Math.PI*2);
      ctx.stroke();
      ctx.font = "700 12px Rajdhani, Arial";
      ctx.fillText(station.title, 0, 48);
      ctx.restore();
    }
  }

  function drawWorldMarkers(){
    ctx.save(); ctx.translate(-camera.x,-camera.y);
    const spawn = currentMap.spawn;
    const pulse = Math.sin(performance.now()/240)*8;
    const safeReady = isSafeModeActive();
    const ring = spawn.safeRadius || spawn.r;
    const decor = spawn.decorRadius || ring + 90;
    const spawnGrad = ctx.createRadialGradient(spawn.x, spawn.y, 18, spawn.x, spawn.y, decor + 20);
    spawnGrad.addColorStop(0, "rgba(8,145,178,.22)");
    spawnGrad.addColorStop(.45, "rgba(16,185,129,.13)");
    spawnGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spawnGrad;
    ctx.beginPath(); ctx.arc(spawn.x,spawn.y,decor,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle = safeReady ? "rgba(86,255,79,.82)" : "rgba(250,204,21,.88)";
    ctx.fillStyle = safeReady ? "rgba(86,255,79,.09)" : "rgba(250,204,21,.07)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(spawn.x,spawn.y,ring+pulse,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(125,211,252,.16)";
    ctx.beginPath(); ctx.arc(spawn.x,spawn.y,decor,0,Math.PI*2); ctx.stroke();

    ctx.strokeStyle = "rgba(125,211,252,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(spawn.x-92, spawn.y-32, 184, 64);
    ctx.strokeRect(spawn.x-42, spawn.y-118, 84, 236);
    ctx.fillStyle = "rgba(2,132,199,.10)";
    ctx.fillRect(spawn.x-88, spawn.y-28, 176, 56);

    ctx.fillStyle = "rgba(187,247,208,.95)";
    ctx.font = "700 18px Rajdhani, Arial";
    ctx.fillText(`${spawn.label}${safeReady ? " · SAFE" : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`}`, spawn.x-ring+24, spawn.y-ring-18);
    drawSpawnStations();

    const portal = currentMap.portal;
    if(portal){
      const safeR = portal.safeRadius || Math.max(180, portal.r * 2.2);
      const r = portal.r + Math.sin(performance.now()/160)*8;
      const grad = ctx.createRadialGradient(portal.x,portal.y,4,portal.x,portal.y,safeR);
      grad.addColorStop(0,"rgba(168,85,247,.95)");
      grad.addColorStop(.35,"rgba(56,189,248,.28)");
      grad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(portal.x,portal.y,safeR,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(196,181,253,.26)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(portal.x,portal.y,safeR,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(168,85,247,.9)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(portal.x,portal.y,portal.r,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = "#e9d5ff";
      ctx.font = "700 16px Rajdhani, Arial";
      ctx.fillText(`${portal.label} · ZONE SAFE`, portal.x-92, portal.y-safeR-16);
    }
    ctx.restore();
  }

  function drawAsteroids(){
    ctx.save(); ctx.translate(-camera.x,-camera.y);
    for(const a of asteroids){
      if(a.x < camera.x-100 || a.x > camera.x+canvas.width+100 || a.y < camera.y-100 || a.y > camera.y+canvas.height+100) continue;
      ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.rot);
      ctx.fillStyle = a.shade>.5 ? "rgba(84,104,122,.38)" : "rgba(48,67,85,.45)";
      ctx.strokeStyle = "rgba(125,211,252,.10)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0;i<9;i++){
        const ang = i/9*Math.PI*2, rr = a.r*a.verts[i], x = Math.cos(ang)*rr, y = Math.sin(ang)*rr;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  function drawImageRot(img,x,y,w,h,angle){
    ctx.save(); ctx.translate(x-camera.x,y-camera.y); ctx.rotate(angle);
    if(img && img.complete) ctx.drawImage(img,-w/2,-h/2,w,h);
    else { ctx.fillStyle="#38bdf8"; ctx.beginPath(); ctx.moveTo(0,-h/2); ctx.lineTo(w/2,h/2); ctx.lineTo(0,h/3); ctx.lineTo(-w/2,h/2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  function draw(){
    drawBackground(); drawGrid(); drawWorldMarkers(); drawAsteroids();
    ctx.save(); ctx.translate(-camera.x,-camera.y);
    if(moveTarget){
      ctx.strokeStyle="rgba(86,255,79,.55)"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(moveTarget.x,moveTarget.y,22+Math.sin(performance.now()/120)*4,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(moveTarget.x-34,moveTarget.y); ctx.lineTo(moveTarget.x+34,moveTarget.y); ctx.moveTo(moveTarget.x,moveTarget.y-34); ctx.lineTo(moveTarget.x,moveTarget.y+34); ctx.stroke();
    }
    for(const b of bullets){ ctx.fillStyle=b.color||"rgba(125,211,252,.95)"; ctx.shadowColor=b.color||"#38bdf8"; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    for(const p of particles){ const a = Math.max(0,p.life/p.max); ctx.fillStyle = p.color.replace(/,[\d.]+\)$/g, `,${a})`); ctx.beginPath(); ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2); ctx.fill(); }
    ctx.restore();

    for(const e of enemies){
      drawImageRot(cache[e.img] || cache["assets/ships/intercepteur.png"],e.x,e.y,e.width || 72,e.height || 72,e.angle);
      const sx=e.x-camera.x, sy=e.y-camera.y;
      if(selectedEnemy && selectedEnemy.id === e.id){ ctx.save(); ctx.strokeStyle="rgba(86,255,79,.9)"; ctx.shadowColor="#56ff4f"; ctx.shadowBlur=18; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,sy,e.radius+12+Math.sin(performance.now()/120)*3,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle="rgba(239,68,68,.25)"; ctx.fillRect(sx-32,sy-45,64,5); ctx.fillStyle="rgba(239,68,68,.9)"; ctx.fillRect(sx-32,sy-45,64*(e.hp/e.maxHp),5);
      ctx.fillStyle="#fecaca"; ctx.font="700 11px Rajdhani, Arial"; ctx.fillText(`NIV ${e.level}`, sx-18, sy-50);
    }
    const ship = getShip(store.state.activeShip);
    drawImageRot(cache[ship.img],player.x,player.y,96,96,player.angle);
    drawPlayerDrones();
    const px=player.x-camera.x, py=player.y-camera.y;
    const rank = getCurrentRank();
    const rankImg = cache[getRankAssetPath(rank)];
    if(rankImg) ctx.drawImage(rankImg, px-94, py+34, 30, 30);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 14px Rajdhani, Arial";
    ctx.fillStyle = "#e2e8f0";
    ctx.shadowColor = "rgba(15,23,42,.95)";
    ctx.shadowBlur = 8;
    ctx.fillText(store.state.player.name || "PILOTE", px, py+42);
    ctx.restore();
    ctx.fillStyle="rgba(2,6,17,.8)"; ctx.fillRect(px-48,py+48,96,6); ctx.fillStyle="#22c55e"; ctx.fillRect(px-48,py+48,96*(player.hp/player.maxHp),6);
    if(player.maxShield > 0){ ctx.fillStyle="rgba(2,6,17,.8)"; ctx.fillRect(px-48,py+58,96,5); ctx.fillStyle="#38bdf8"; ctx.fillRect(px-48,py+58,96*(player.shield/player.maxShield),5); }
    drawDamageTexts();
    drawMiniMap();
  }

  function drawPlayerDrones(){
    const drones = getDroneLoadout();
    if(!drones.length) return;
    const img = cache["assets/equipment/drone_orbital.svg"];
    const time = performance.now()/850;
    drones.forEach((uid,index)=>{
      const orbit = 74 + (index % 2) * 16;
      const angle = time + index * (Math.PI * 2 / Math.max(1, drones.length));
      const x = player.x + Math.cos(angle) * orbit;
      const y = player.y + Math.sin(angle) * (orbit * 0.7);
      const module = getItemFromInventoryUid(uid);
      drawImageRot(img, x, y, 34, 34, -angle * 1.2);
      if(module){
        ctx.save();
        ctx.translate(x-camera.x, y-camera.y);
        ctx.fillStyle = module.category === "canon" ? "rgba(56,189,248,.95)" : "rgba(34,197,94,.95)";
        ctx.beginPath(); ctx.arc(0, 18, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawDamageTexts(){
    ctx.save();
    ctx.font = "900 18px Rajdhani, Arial";
    ctx.textAlign = "center";
    for(const t of damageTexts){
      const a = Math.max(0,t.life/t.max);
      ctx.fillStyle = t.color ? `${t.color}${a})` : `rgba(255,230,140,${a})`;
      ctx.shadowColor = t.shadowColor || (t.color ? "rgba(248,113,113,.8)" : "rgba(250,204,21,.8)");
      ctx.shadowBlur = 10;
      const label = typeof t.value === "string" ? t.value : `-${t.value}`;
      ctx.fillText(label, t.x-camera.x, t.y-camera.y);
    }
    ctx.restore();
  }

  function drawMiniMap(){
    const w = 184, h = 150;
    const x = canvas.width - w - 18, y = 92;
    const sx = w/currentMap.width, sy = h/currentMap.height;
    const mapX = wx => x + (wx + currentMap.width/2)*sx;
    const mapY = wy => y + (wy + currentMap.height/2)*sy;
    ctx.save();
    ctx.fillStyle = "rgba(3,12,24,.86)";
    ctx.strokeStyle = "rgba(56,189,248,.36)";
    ctx.lineWidth = 1;
    ctx.fillRect(x,y,w,h);
    ctx.strokeRect(x,y,w,h);
    ctx.fillStyle = "#8ee7ff";
    ctx.font = "700 11px Rajdhani, Arial";
    ctx.fillText(currentMap.name, x+9, y+15);

    ctx.strokeStyle = "rgba(56,189,248,.16)";
    for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+i*w/4,y); ctx.lineTo(x+i*w/4,y+h); ctx.stroke(); }
    for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(x,y+i*h/3); ctx.lineTo(x+w,y+i*h/3); ctx.stroke(); }

    ctx.fillStyle = "rgba(86,255,79,.55)";
    ctx.beginPath(); ctx.arc(mapX(currentMap.spawn.x),mapY(currentMap.spawn.y),5,0,Math.PI*2); ctx.fill();
    if(currentMap.portal){
      ctx.fillStyle = "rgba(168,85,247,.95)";
      ctx.beginPath(); ctx.arc(mapX(currentMap.portal.x),mapY(currentMap.portal.y),5,0,Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(56,189,248,.25)";
    ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),Math.max(5,player.radar*sx),0,Math.PI*2); ctx.stroke();
    for(const e of enemies){
      if(Math.hypot(e.x-player.x,e.y-player.y) > player.radar) continue;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(mapX(e.x)-2,mapY(e.y)-2,4,4);
    }
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function loop(t){
    if(!running) return;
    const dt = Math.min(.033,(t-last)/1000 || .016);
    last = t; update(dt); draw(); requestAnimationFrame(loop);
  }

  function updateHud(){
    const enemy = validSelectedEnemy();
    const rank = getCurrentRank();
    const repairState = canRepairBotActivate();
    const safeArea = getCurrentSafeArea();
    const safeLabel = safeArea ? ((player.safeZoneLock || 0) <= 0 ? ` · SAFE ${safeArea.type === "portal" ? "PORTAIL" : "SPAWN"}` : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`) : "";
    document.getElementById("gameZoneName").textContent = gameMode === "portal" ? `PORTAIL : ${activePortal?.name || currentMap.name}${portalWave ? ` · VAGUE ${Math.min(portalWave, PORTAL_WAVE_TOTAL)}/${PORTAL_WAVE_TOTAL}` : " · PRÉPARATION"}` : `ZONE : ${currentMap.name}${safeLabel}`;
    document.getElementById("gamePlayerName").textContent = store.state.player.name || "PILOTE";
    document.getElementById("gameRankHud").innerHTML = `<img class="rank-icon" src="${getRankAssetPath(rank)}" alt="${rank.name}"><span>${rank.name}</span>`;
    document.getElementById("gameLevel").textContent = store.state.player.level;
    document.getElementById("gameHp").textContent = `${Math.max(0,Math.round(player.hp))}/${Math.round(player.maxHp)}`;
    document.getElementById("gameShield").textContent = `${Math.round(player.shield)}/${Math.round(player.maxShield)}`;
    document.getElementById("gameSpeed").textContent = player.displayedSpeed;
    document.getElementById("gameRepairHud").textContent = !player.extraBonus?.repairBot ? "Robot : non équipé" : player.repairBotActive ? "Robot : actif" : repairState.ok ? (player.extraBonus?.repairBotAuto ? "Robot : prêt (auto)" : "Robot : prêt") : `Robot : ${repairState.reason}`;
    document.getElementById("gameCreditsHud").textContent = fmt(store.state.player.credits);
    document.getElementById("gamePremiumHud").textContent = fmt(store.state.player.premium);
    updateTargetPanel(enemy);
  }

  function updateTargetPanel(enemy){
    const panel = document.getElementById("gameTargetPanel");
    if(!enemy){ panel.classList.add("hidden"); panel.innerHTML = ""; return; }
    panel.classList.remove("hidden");
    panel.innerHTML = `
      <h3>${enemy.type}</h3>
      <div class="target-row"><span>Niveau</span><b>${enemy.level}</b></div>
      <div class="target-row"><span>PV</span><b>${Math.max(0,Math.ceil(enemy.hp))}/${enemy.maxHp}</b></div>
      <div class="target-row"><span>Portée</span><b>${enemy.attackRange || 600}</b></div>
      <div class="target-bar"><span style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></span></div>
    `;
  }

  function updateLootPopup(){
    const el = document.getElementById("lootPopup");
    if(!lastLoot || lootTimer <= 0){ el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    el.innerHTML = `<strong>Butin récupéré</strong><span>+${fmt(lastLoot.credits)} CR</span><span>+${fmt(lastLoot.xp)} XP</span><span>+${fmt(lastLoot.premium)} NOVA</span>${lastLoot.piece ? `<span>${lastLoot.piece}</span>` : ""}${lastLoot.materials?.length ? `<span>Soute : ${lastLoot.materials.join(" · ")}</span>` : ""}`;
  }

  function actionSlotCaption(ammo){
    if(!ammo) return "VIDE";
    return ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax}` : `x${ammo.multiplier}`;
  }

  function actionSlotHint(ammo){
    if(!ammo) return "+";
    return ammo.weaponClass === "rocket" ? "ROQ" : ammo.short;
  }

  function renderGameActionBar(){
    const el = document.getElementById("gameActionBar");
    const slots = Array.from({length:9}, (_,i)=>store.state.actionSlots?.[i] || null);
    el.innerHTML = slots.map((id,index)=>{
      const ammo = getAmmo(id);
      const count = ammo ? getAmmoCount(ammo.id) : 0;
      return `<div class="action-slot ammo-slot ${ammo ? "" : "empty"}" data-action-index="${index}"><span class="key">${keyCodeToLabel(store.state.slotKeybinds?.[index])}</span><div class="cooldown" data-action-cooldown="${index}" style="height:0%"></div>${ammo ? `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${actionSlotHint(ammo)}</div><span class="slot-count">${fmt(count)}</span><span class="slot-name">${actionSlotCaption(ammo)}</span>` : `<span class="no-item">+</span><span class="slot-name">VIDE</span>`}</div>`;
    }).join("");
    updateGameActionBar();
  }

  function updateGameActionBar(){
    const slots = document.querySelectorAll(".action-slot");
    slots.forEach((el,index)=>{
      const ammo = getCombatAmmo(index);
      el.classList.toggle("active", activeLaserSlot === index);
      el.classList.toggle("empty", !ammo);
      const cd = el.querySelector(".cooldown");
      if(cd && ammo) cd.style.height = `${Math.min(100,getAmmoCooldown(ammo.id)/getEffectiveAmmoCooldown(ammo)*100)}%`;
      const count = el.querySelector(".slot-count");
      if(count && ammo) count.textContent = fmt(getAmmoCount(ammo.id));
    });
  }

  function renderCombatQuickPanel(){
    const panel = document.getElementById("combatQuickPanel");
    const content = document.getElementById("combatPanelContent");
    if(!panel || !content) return;
    panel.querySelectorAll("[data-combat-panel-tab]").forEach(btn=>btn.classList.toggle("active", btn.dataset.combatPanelTab === combatPanelTab));
    if(combatPanelTab === "skills"){
      content.innerHTML = `<div class="combat-empty">Les compétences de vaisseau seront branchées ici.</div>`;
      return;
    }
    if(combatPanelTab === "extras"){
      const extras = getEquippedExtras(store.state.activeShip);
      if(!extras.length){
        content.innerHTML = `<div class="combat-empty">Aucun extra équipé sur le vaisseau.</div>`;
        return;
      }
      const repairState = canRepairBotActivate();
      content.innerHTML = `<div class="combat-panel-grid">${extras.map(item=>{
        const effect = item.effect || {};
        if(effect.repairBot){
          const status = player.repairBotActive ? "Actif" : repairState.ok ? "Prêt à réparer" : repairState.reason;
          const buttonLabel = player.repairBotActive ? "En cours" : "Activer";
          const disabled = player.repairBotActive || !repairState.ok;
          return `<article class="combat-pick-card ${disabled ? "disabled" : ""}">
            <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
            <div><strong>${item.name}</strong><span>${item.stats?.extra || "Répare la coque"}</span><small>${status}</small></div>
            <button class="blue-button small" data-combat-extra-use="${item.id}" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
          </article>`;
        }
        if(effect.repairBotAuto){
          const status = player.extraBonus?.repairBot ? `Surveille le Robot Réparateur · délai ${getRepairBotDelay()}s` : "Équipe aussi le Robot Réparateur pour l'utiliser.";
          return `<article class="combat-pick-card">
            <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
            <div><strong>${item.name}</strong><span>${item.stats?.extra || "Activation automatique"}</span><small>${status}</small></div>
            <button class="blue-button small" type="button" disabled>Passif</button>
          </article>`;
        }
        return `<article class="combat-pick-card">
          <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
          <div><strong>${item.name}</strong><span>${item.stats?.extra || "Bonus passif"}</span><small>Effet passif actif.</small></div>
          <button class="blue-button small" type="button" disabled>Passif</button>
        </article>`;
      }).join("")}</div>`;
      return;
    }
    if(combatPanelTab === "shop"){
      content.innerHTML = `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
        const unlocked = isUnlockedForPlayer(ammo);
        const subtitle = ammo.weaponClass === "rocket"
          ? `${ammo.damageMin}-${ammo.damageMax} · ${ammo.range} portée · 1 roquette / tir`
          : `x${ammo.multiplier} dégâts lasers · ${ammo.cooldown.toFixed(2)}s`;
        return `<article class="combat-pick-card ${unlocked ? "" : "disabled"}">
          <div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>
          <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>Pack ${fmt(ammo.amount)} · ${fmt(ammo.price)} ${ammo.priceType === "premium" ? "NOVA" : "CR"}</small>${unlocked ? "" : `<small>🔒 Niveau ${getRequiredLevel(ammo)} requis</small>`}</div>
          <button class="blue-button small" data-combat-buy-ammo="${ammo.id}" ${( !unlocked || !canAfford(ammo.priceType, ammo.price)) ? "disabled" : ""}>${unlocked ? "Acheter" : `NIV ${getRequiredLevel(ammo)}`}</button>
        </article>`;
      }).join("")}</div>`;
      return;
    }
    content.innerHTML = `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
      const count = getAmmoCount(ammo.id);
      const unlocked = isUnlockedForPlayer(ammo);
      const subtitle = ammo.weaponClass === "rocket"
        ? `Stock ${fmt(count)} · 1 roquette / tir · ${ammo.cooldown.toFixed(0)}s`
        : `Stock ${fmt(count)} · ${getLaserVolley().count || 1} conso / salve`;
      return `<button class="combat-pick-card ${(count && unlocked) ? "" : "disabled"}" draggable="${(count && unlocked) ? "true" : "false"}" data-combat-ammo-id="${ammo.id}" type="button">
        <div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>
        <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>${ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax} dégâts · ${ammo.range} portée` : `Glisse dans un slot 1-9 · dégâts lasers x${ammo.multiplier}`}</small>${unlocked ? "" : `<small>🔒 Niveau ${getRequiredLevel(ammo)} requis</small>`}</div>
      </button>`;
    }).join("")}</div>`;
  }

  function renderSpawnInteractionPanel(mode = spawnPanelMode){
    const panel = document.getElementById("spawnInteractionPanel");
    const title = document.getElementById("spawnPanelTitle");
    const content = document.getElementById("spawnPanelContent");
    if(!panel || !title || !content){
      spawnPanelMode = null;
      return;
    }
    spawnPanelMode = mode;
    if(!mode){
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    if(mode === "quests"){
      const activeQuest = getActiveQuest();
      const quests = getAllQuests();
      title.textContent = "RELAIS DE QUÊTES";
      content.innerHTML = `
        <div class="spawn-panel-section">
          <div class="spawn-panel-note">Clique une mission pour l’accepter. Une seule quête active à la fois.</div>
          <div class="spawn-list">${quests.map(quest=>{
            const progress = getQuestProgress(quest.id);
            const target = Number(quest.objective?.count || 0);
            const completed = !!store.state.completedQuestClaims?.[quest.id];
            const claimable = !completed && progress >= target;
            const active = activeQuest?.id === quest.id;
            return `<article class="spawn-card ${active ? "active" : ""}">
              <div class="spawn-card-head"><strong>${quest.title}</strong><span>${quest.objective?.zone || "Toutes zones"}</span></div>
              <p>${quest.desc}</p>
              <div class="spawn-progress"><span style="width:${target ? Math.min(100, progress/target*100) : 0}%"></span></div>
              <div class="spawn-meta"><small>Progression ${progress}/${target}</small><small>Récompenses : ${fmt(quest.rewards?.credits || 0)} CR · ${fmt(quest.rewards?.xp || 0)} XP</small></div>
              <div class="spawn-meta"><small>Matériaux : ${Object.entries(quest.rewards?.materials || {}).map(([id, amount])=>`${amount} ${id.toUpperCase()}`).join(" · ") || "—"}</small></div>
              <div class="spawn-actions">
                ${completed ? `<button class="blue-button small" type="button" disabled>Terminée</button>` : claimable ? `<button class="blue-button small" data-claim-quest="${quest.id}" type="button">Réclamer</button>` : `<button class="blue-button small" data-accept-quest="${quest.id}" type="button" ${active ? "disabled" : ""}>${active ? "Active" : "Accepter"}</button>`}
              </div>
            </article>`;
          }).join("")}</div>
        </div>`;
      return;
    }

    const job = getRefineryJob();
    const recipes = getRefineryRecipes();
    const materials = getAllRawMaterials();
    const upgradeables = [...new Set((store.state.inventoryItems || []).map(entry=>entry.itemId))]
      .map(id=>getItem(id))
      .filter(item=>item && ["canon","generateur"].includes(item.category));

    title.textContent = "RAFFINEUR & ATELIER";
    content.innerHTML = `
      <div class="spawn-panel-grid-two">
        <section class="spawn-panel-section">
          <h4>Soute</h4>
          <div class="spawn-list compact">${materials.map(material=>`<div class="spawn-mini-row"><span>${material.name}</span><b>${fmt(getMaterialCount(material.id))}</b></div>`).join("")}</div>
        </section>
        <section class="spawn-panel-section">
          <h4>Raffinage</h4>
          ${job ? (()=>{
            const recipe = recipes.find(entry=>entry.id === job.recipeId);
            const complete = isRefineryComplete();
            return `<article class="spawn-card active"><div class="spawn-card-head"><strong>${recipe?.name || "Raffinage"}</strong><span>${complete ? "Terminé" : formatDuration(Number(job.endsAt || 0) - Date.now())}</span></div><p>${recipe?.desc || ""}</p><div class="spawn-actions">${complete ? `<button class="blue-button small" data-claim-refinery type="button">Récupérer</button>` : `<button class="blue-button small" type="button" disabled>En cours</button>`}</div></article>`;
          })() : recipes.map(recipe=>`<article class="spawn-card"><div class="spawn-card-head"><strong>${recipe.name}</strong><span>${formatDuration(recipe.durationMs)}</span></div><p>${recipe.desc}</p><div class="spawn-meta"><small>Coût : ${Object.entries(recipe.costs || {}).map(([id, amount])=>`${amount} ${id.toUpperCase()}`).join(" · ")}</small><small>Résultat : +${recipe.outputAmount} ${recipe.outputId.toUpperCase()}</small></div><div class="spawn-actions"><button class="blue-button small" data-start-refinery="${recipe.id}" type="button">Lancer</button></div></article>`).join("")}
        </section>
      </div>
      <section class="spawn-panel-section">
        <h4>Atelier d’amélioration</h4>
        <div class="spawn-list">${upgradeables.length ? upgradeables.map(item=>{
          const level = getEquipmentUpgradeLevel(item.id);
          const cost = getEquipmentUpgradeCost(item);
          return `<article class="spawn-card"><div class="spawn-card-head"><strong>${item.short || item.name}</strong><span>+${level}</span></div><p>${item.category === "canon" ? "Améliore les dégâts de l’arme." : "Améliore bouclier, régénération ou vitesse selon le module."}</p><div class="spawn-meta"><small>Coût : ${cost ? `${cost.amount} ${cost.materialId.toUpperCase()}` : "—"}</small></div><div class="spawn-actions"><button class="blue-button small" data-upgrade-item="${item.id}" type="button" ${!cost || getMaterialCount(cost.materialId) < cost.amount ? "disabled" : ""}>Améliorer</button></div></article>`;
        }).join("") : `<div class="spawn-panel-note">Aucun canon ou générateur dans l’inventaire.</div>`}</div>
      </section>`;
  }

  function buyCombatAmmo(id){
    const ammo = getAmmo(id);
    if(!ammo) return;
    if(!isUnlockedForPlayer(ammo)) return showToast(`Niveau ${getRequiredLevel(ammo)} requis.`);
    if(!canAfford(ammo.priceType, ammo.price)) return showToast("Fonds insuffisants.");
    spend(ammo.priceType, ammo.price);
    addAmmo(ammo.id, ammo.amount);
    saveState();
    updateHud();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} achetée : +${ammo.amount}.`);
  }

  function assignAmmoToActionSlot(index, ammoId){
    const ammo = getAmmo(ammoId);
    if(!ammo) return;
    if(!isUnlockedForPlayer(ammo)) return showToast(`Niveau ${getRequiredLevel(ammo)} requis.`);
    setActionSlot(index, ammo.id);
    if(ammo.weaponClass !== "rocket" && activeLaserSlot === null) activeLaserSlot = index;
    if(ammo.weaponClass === "rocket" && activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} placée en slot ${index+1}.`);
  }

  window.addEventListener("resize", ()=>{ if(running) resize(); });
  window.addEventListener("beforeunload", ()=>{ try{ saveState(); }catch(e){} });
  window.addEventListener("keydown", e=>{
    if(!running) return;
    const slotIndex = slotIndexFromEvent(e, store.state.slotKeybinds);
    if(slotIndex >= 0){ e.preventDefault(); selectActionSlot(slotIndex); return; }
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener("keyup", e=>{ if(running) keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener("contextmenu", e=>e.preventDefault());
  canvas.addEventListener("mousemove", e=>{ const r = canvas.getBoundingClientRect(); if(mouse){ mouse.x = e.clientX-r.left; mouse.y = e.clientY-r.top; } });
  canvas.addEventListener("mousedown", e=>{
    if(!running) return;
    const r = canvas.getBoundingClientRect(); mouse.x = e.clientX-r.left; mouse.y = e.clientY-r.top;
    const world = worldFromScreen(mouse.x,mouse.y);
    if(e.button === 0){
      const station = getStationAt(world);
      if(station && Math.hypot(world.x-currentMap.spawn.x, world.y-currentMap.spawn.y) <= (currentMap.spawn.safeRadius || currentMap.spawn.r || 260)){
        renderSpawnInteractionPanel(station.id);
        return;
      }
      const enemy = findEnemyAt(world);
      selectedEnemy = enemy || null;
      if(enemy) enemy.aggro = true;
      if(!enemy && spawnPanelMode) closeSpawnPanel();
      updateHud();
    }
    if(e.button === 2) moveTarget = world;
  });

  document.getElementById("gameActionBar").addEventListener("click", e=>{
    if(!running) return;
    const slot = e.target.closest("[data-action-index]");
    if(slot) selectActionSlot(Number(slot.dataset.actionIndex));
  });

  document.getElementById("gameActionBar").addEventListener("dragover", e=>{
    if(e.target.closest("[data-action-index]")) e.preventDefault();
  });

  document.getElementById("gameActionBar").addEventListener("drop", e=>{
    if(!running) return;
    const slot = e.target.closest("[data-action-index]");
    if(!slot) return;
    e.preventDefault();
    const ammoId = e.dataTransfer.getData("application/x-voidsector-ammo") || e.dataTransfer.getData("text/plain");
    assignAmmoToActionSlot(Number(slot.dataset.actionIndex), ammoId);
  });

  document.getElementById("combatQuickMenuBtn").addEventListener("click", ()=>{
    if(!running) return;
    document.getElementById("combatQuickPanel").classList.toggle("hidden");
    renderCombatQuickPanel();
  });

  document.getElementById("combatQuickPanel").addEventListener("click", e=>{
    const tab = e.target.closest("[data-combat-panel-tab]");
    if(tab){ combatPanelTab = tab.dataset.combatPanelTab; renderCombatQuickPanel(); return; }
    const buy = e.target.closest("[data-combat-buy-ammo]");
    if(buy){ buyCombatAmmo(buy.dataset.combatBuyAmmo); return; }
    const extraUse = e.target.closest("[data-combat-extra-use]");
    if(extraUse){ activateRepairBot(true); renderCombatQuickPanel(); updateHud(); return; }
    const ammo = e.target.closest("[data-combat-ammo-id]");
    if(ammo){
      const first = store.state.actionSlots.findIndex(id=>!id);
      assignAmmoToActionSlot(first >= 0 ? first : 0, ammo.dataset.combatAmmoId);
    }
  });

  document.getElementById("combatQuickPanel").addEventListener("dragstart", e=>{
    const ammo = e.target.closest("[data-combat-ammo-id]");
    if(!ammo) return;
    e.dataTransfer.setData("application/x-voidsector-ammo", ammo.dataset.combatAmmoId);
    e.dataTransfer.setData("text/plain", ammo.dataset.combatAmmoId);
    e.dataTransfer.effectAllowed = "copy";
  });

  document.getElementById("spawnPanelClose")?.addEventListener("click", closeSpawnPanel);

  document.getElementById("spawnInteractionPanel")?.addEventListener("click", e=>{
    const acceptBtn = e.target.closest("[data-accept-quest]");
    if(acceptBtn){
      const result = acceptQuest(acceptBtn.dataset.acceptQuest);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Quête acceptée : ${result.quest.title}`); }
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const claimBtn = e.target.closest("[data-claim-quest]");
    if(claimBtn){
      const result = claimQuest(claimBtn.dataset.claimQuest);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Récompense reçue : ${result.quest.title}`); }
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const startRefBtn = e.target.closest("[data-start-refinery]");
    if(startRefBtn){
      const result = startRefineryJob(startRefBtn.dataset.startRefinery);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Raffinage lancé : ${result.recipe.name}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const claimRefBtn = e.target.closest("[data-claim-refinery]");
    if(claimRefBtn){
      const result = claimRefineryJob();
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Raffinage terminé : +${result.recipe.outputAmount} ${result.recipe.outputId.toUpperCase()}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const upgradeBtn = e.target.closest("[data-upgrade-item]");
    if(upgradeBtn){
      const result = upgradeEquipment(upgradeBtn.dataset.upgradeItem);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Amélioration appliquée : ${upgradeBtn.dataset.upgradeItem} +${result.level}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
    }
  });

  return {start, stop, get running(){return running;}};
}
