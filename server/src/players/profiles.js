import { loadProfileEntries, persistProfileEntries } from "../storage/profileStore.js";
import { applyDronePermanentUpgrade, applyEquipmentUpgrade, equipInventoryUid, unequipInventoryUid, unequipSlot } from "../economy/equipment.js";
import { claimServerRefineryJob, completeServerRefineryShipment, completeServerRefineryUpgrades, refineServerShipCargoRecipe, rushServerRefineryShipment, rushServerRefineryUpgrade, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, tickServerRefineryProduction, toggleServerRefineryProduction } from "../economy/refinery.js";
import { runServerSpaceCaster } from "../economy/spaceCaster.js";
import { applyProgressionReward, normalizeProgressionPlayer, preserveProtectedProgression, spendCurrency } from "./progression.js";
import { acceptServerQuest, claimServerQuest, progressServerQuestAction, progressServerQuestKill } from "../quests/quests.js";

function sanitizeObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function sanitizeWorldSession(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return null;
  const mapId = String(value.mapId ?? "0");
  const x = Number(value.x);
  const y = Number(value.y);
  if(!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    mapId,
    x,
    y,
    angle:Number(value.angle || 0),
    hp:Math.max(0, Number(value.hp || 0)),
    maxHp:Math.max(0, Number(value.maxHp || value.hp || 0)),
    shield:Math.max(0, Number(value.shield || 0)),
    maxShield:Math.max(0, Number(value.maxShield || value.shield || 0)),
    shipId:String(value.shipId || "unknown"),
    shipImg:String(value.shipImg || ""),
    updatedAt:Math.max(0, Number(value.updatedAt || Date.now()))
  };
}

export function sanitizeProfile(profile = {}){
  return {
    updatedAt:Math.max(0, Number(profile.updatedAt || Date.now())),
    player:normalizeProgressionPlayer(sanitizeObject(profile.player)),
    activeShip:typeof profile.activeShip === "string" ? profile.activeShip : null,
    selectedShip:typeof profile.selectedShip === "string" ? profile.selectedShip : null,
    ownedShips:Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : undefined,
    inventoryItems:Array.isArray(profile.inventoryItems)
      ? profile.inventoryItems.filter(entry=>entry?.uid && entry?.itemId).map(entry=>({uid:String(entry.uid), itemId:String(entry.itemId)}))
      : undefined,
    nextInventoryUid:Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1))),
    ammoInventory:sanitizeObject(profile.ammoInventory),
    shipLoadouts:sanitizeObject(profile.shipLoadouts),
    ownedDroneCount:Math.max(0, Math.floor(Number(profile.ownedDroneCount || 0))),
    droneLoadout:Array.isArray(profile.droneLoadout) ? profile.droneLoadout.map(value=>value === null ? null : String(value)) : undefined,
    dronePermanentUpgrades:sanitizeObject(profile.dronePermanentUpgrades),
    equipmentUpgrades:sanitizeObject(profile.equipmentUpgrades),
    ownedDroneFormations:Array.isArray(profile.ownedDroneFormations) ? profile.ownedDroneFormations.map(String) : undefined,
    activeDroneFormation:typeof profile.activeDroneFormation === "string" ? profile.activeDroneFormation : null,
    cargoHold:sanitizeObject(profile.cargoHold),
    shipCargo:sanitizeObject(profile.shipCargo),
    skillRanks:sanitizeObject(profile.skillRanks),
    skillLevels:sanitizeObject(profile.skillLevels),
    completedPortals:sanitizeObject(profile.completedPortals),
    portalPieces:sanitizeObject(profile.portalPieces),
    refineryLevels:sanitizeObject(profile.refineryLevels),
    refineryModules:sanitizeObject(profile.refineryModules),
    refineryUpgradeJobs:sanitizeObject(profile.refineryUpgradeJobs),
    refineryShipmentJob:profile.refineryShipmentJob && typeof profile.refineryShipmentJob === "object" ? sanitizeObject(profile.refineryShipmentJob) : null,
    refineryJob:profile.refineryJob && typeof profile.refineryJob === "object" ? sanitizeObject(profile.refineryJob) : null,
    refineryProductionDisabled:sanitizeObject(profile.refineryProductionDisabled),
    refineryLastTick:Math.max(0, Number(profile.refineryLastTick || Date.now())),
    activeQuestIds:Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds.map(String).slice(0, 5) : [],
    activeQuestId:typeof profile.activeQuestId === "string" ? profile.activeQuestId : null,
    questProgress:sanitizeObject(profile.questProgress),
    questFailProgress:sanitizeObject(profile.questFailProgress),
    completedQuestClaims:sanitizeObject(profile.completedQuestClaims),
    worldSession:sanitizeWorldSession(profile.worldSession)
  };
}

export function createProfileManager({cleanName, logger}){
  const profiles = new Map();

  function profileKey(name){
    return cleanName(name).toLowerCase();
  }

  function accountProfileKey(accountId){
    return `account:${String(accountId || "")}`;
  }

  async function load(){
    try{
      const entries = await loadProfileEntries(sanitizeProfile);
      profiles.clear();
      for(const [key, profile] of entries) profiles.set(key, profile);
    }catch(error){
      logger?.warn?.("Unable to load profiles", {error:error?.message || String(error)});
    }
  }

  function persist(){
    try{
      persistProfileEntries([...profiles.entries()]).catch(error=>{
        logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
      });
    }catch(error){
      logger?.warn?.("Unable to save profiles", {error:error?.message || String(error)});
    }
  }

  function advanceRefineryState(profile, now = Date.now()){
    if(!profile) return false;
    const changed = Boolean(
      tickServerRefineryProduction(profile, now)
      || completeServerRefineryUpgrades(profile, now)
      || completeServerRefineryShipment(profile, now)
    );
    if(changed) profile.updatedAt = now;
    return changed;
  }

  function syncForSocket(socket, player){
    if(!player) return;
    const accountKey = player.accountId ? accountProfileKey(player.accountId) : null;
    const accountProfile = accountKey ? profiles.get(accountKey) : null;
    if(accountProfile){
      if(advanceRefineryState(accountProfile)){
        profiles.set(accountKey, sanitizeProfile(accountProfile));
        persist();
      }
      socket.emit("profile:sync", accountProfile);
      return;
    }
    if(accountKey){
      const next = sanitizeProfile({
        ...getExistingProfile(player).profile,
        updatedAt:Date.now()
      });
      next.updatedAt = Math.max(Number(next.updatedAt || 0), Date.now());
      profiles.set(accountKey, next);
      persist();
      socket.emit("profile:sync", next);
      return;
    }
    const legacyProfile = profiles.get(profileKey(player.name));
    if(!legacyProfile) return;
    if(advanceRefineryState(legacyProfile)){
      profiles.set(profileKey(player.name), sanitizeProfile(legacyProfile));
      persist();
    }
    socket.emit("profile:sync", legacyProfile);
  }

  function saveFromPayload({player, payload} = {}){
    if(!player) return null;
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(payload?.name || player.name);
    const incoming = sanitizeProfile(payload?.profile || {});
    const existing = profiles.get(key);
    const refineryChanged = existing ? advanceRefineryState(existing) : false;
    if(existing && Number(incoming.updatedAt || 0) < Number(existing.updatedAt || 0)){
      if(refineryChanged){
        profiles.set(key, sanitizeProfile(existing));
        persist();
      }
      return null;
    }
    if(existing?.player) incoming.player = preserveProtectedProgression({
      incomingPlayer:incoming.player,
      existingPlayer:existing.player
    });
    preserveProtectedOwnership(incoming, existing);
    profiles.set(key, incoming);
    persist();
    return incoming;
  }

  function applyReward({player, reward} = {}){
    if(!player) return null;
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key) || sanitizeProfile({updatedAt:Date.now(), player:{}});
    const next = sanitizeProfile({
      ...existing,
      updatedAt:Date.now(),
      player:applyProgressionReward(existing.player || {}, reward || {})
    });
    profiles.set(key, next);
    persist();
    return next;
  }

  function spendForPlayer({player, priceType, amount} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key) || sanitizeProfile({updatedAt:Date.now(), player:{}});
    const result = spendCurrency(existing.player || {}, priceType, amount);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...existing,
      updatedAt:Date.now(),
      player:result.player
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function updateProfileForPlayer({player, update} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const result = typeof update === "function" ? update(profile) : {ok:true};
    if(result && result.ok === false) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...(result || {ok:true}), ok:true, profile:next};
  }

  function preserveProtectedOwnership(incoming, existing){
    if(!existing) return incoming;
    for(const field of [
      "ownedShips",
      "activeShip",
      "selectedShip",
      "inventoryItems",
      "nextInventoryUid",
      "ammoInventory",
      "shipLoadouts",
      "ownedDroneCount",
      "droneLoadout",
      "dronePermanentUpgrades",
      "equipmentUpgrades",
      "ownedDroneFormations",
      "activeDroneFormation",
      "activeQuestIds",
      "activeQuestId",
      "questProgress",
      "questFailProgress",
      "completedQuestClaims",
      "worldSession",
      "cargoHold",
      "shipCargo",
      "portalPieces",
      "refineryLevels",
      "refineryModules",
      "refineryUpgradeJobs",
      "refineryShipmentJob",
      "refineryJob",
      "refineryProductionDisabled",
      "refineryLastTick"
    ]){
      if(hasProtectedOwnershipValue(existing, field)) incoming[field] = sanitizeObjectOrArray(existing[field]);
    }
    return incoming;
  }

  function hasProtectedOwnershipValue(profile, field){
    if(!profile || !Object.hasOwn(profile, field) || profile[field] === undefined) return false;
    const value = profile[field];
    if(field === "nextInventoryUid"){
      return Number(value || 0) > 1 || (Array.isArray(profile.inventoryItems) && profile.inventoryItems.length > 0);
    }
    if(field === "ownedDroneCount") return Number(value || 0) > 0;
    if(Array.isArray(value)) return value.length > 0;
    if(value && typeof value === "object") return Object.keys(value).length > 0;
    return typeof value === "string" && value.length > 0;
  }

  function sanitizeObjectOrArray(value){
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function getExistingProfile(player){
    const key = player.accountId ? accountProfileKey(player.accountId) : profileKey(player.name);
    const existing = profiles.get(key);
    if(existing){
      if(advanceRefineryState(existing)){
        profiles.set(key, sanitizeProfile(existing));
        persist();
      }
      return {key, profile:existing};
    }
    return {
      key,
      profile:sanitizeProfile({
        updatedAt:Date.now(),
        player:{},
        ownedShips:["orion", "test_runner"],
        inventoryItems:[{uid:"inv_laser_mk1_1", itemId:"laser_mk1"}],
        nextInventoryUid:2,
        ammoInventory:{ammo_x1:2500, missile_m1:30, missile_m2:30},
        shipLoadouts:{orion:{lasers:["inv_laser_mk1_1"], generators:[], extras:[]}},
        ownedDroneCount:0,
        droneLoadout:[],
        dronePermanentUpgrades:{},
        equipmentUpgrades:{},
        ownedDroneFormations:["base"],
        activeDroneFormation:"base",
        shipCargo:{},
        activeQuestIds:[],
        activeQuestId:null,
        questProgress:{},
        questFailProgress:{},
        completedQuestClaims:{}
      })
    };
  }

  function spendAndUpdate({player, priceType, amount, update} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const result = spendCurrency(profile.player || {}, priceType, amount);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now(),
      player:result.player
    });
    if(typeof update === "function") update(next);
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function addAmmoPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
        profile.ammoInventory[purchase.id] = Math.max(0, Number(profile.ammoInventory[purchase.id] || 0)) + Math.max(0, Number(purchase.totalAmount || 0));
      }
    });
  }

  function addItemPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
        const nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
        profile.inventoryItems.push({uid:`inv_${purchase.id}_${nextUid}`, itemId:purchase.id});
        profile.nextInventoryUid = nextUid + 1;
      }
    });
  }

  function addShipPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.ownedShips)) profile.ownedShips = ["orion", "test_runner"];
        if(!profile.ownedShips.includes(purchase.id)) profile.ownedShips.push(purchase.id);
        if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
        if(!profile.shipLoadouts[purchase.id]) profile.shipLoadouts[purchase.id] = {lasers:[], generators:[], extras:[]};
      }
    });
  }

  function addDronePurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        profile.ownedDroneCount = Math.max(Number(profile.ownedDroneCount || 0), Number(purchase.nextCount || 0));
        if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
        while(profile.droneLoadout.length < profile.ownedDroneCount) profile.droneLoadout.push(null);
        if(profile.droneLoadout.length > profile.ownedDroneCount) profile.droneLoadout.length = profile.ownedDroneCount;
      }
    });
  }

  function addDroneFormationPurchase({player, purchase, owned = false} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:owned ? 0 : purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.ownedDroneFormations)) profile.ownedDroneFormations = ["base"];
        if(!profile.ownedDroneFormations.includes(purchase.id)) profile.ownedDroneFormations.push(purchase.id);
        profile.activeDroneFormation = purchase.id;
      }
    });
  }

  function applyEquipmentAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    if(action?.kind === "equip"){
      result = equipInventoryUid(profile, action);
    }else if(action?.kind === "unequip-slot"){
      result = unequipSlot(profile, action);
    }else if(action?.kind === "unequip-inventory"){
      result = unequipInventoryUid(profile, String(action.inventoryUid || ""))
        ? {ok:true}
        : {ok:false, reason:"Objet deja retire."};
    }else if(action?.kind === "drone-upgrade"){
      result = applyDronePermanentUpgrade(profile, action);
    }else if(action?.kind === "equipment-upgrade"){
      result = applyEquipmentUpgrade(profile, action);
    }else{
      result = {ok:false, reason:"Action equipement invalide."};
    }
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function setActiveShipForPlayer({player, shipId, worldSession = null} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const cleanShipId = String(shipId || "");
    const {key, profile} = getExistingProfile(player);
    if(!cleanShipId) return {ok:false, reason:"Vaisseau invalide."};
    if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.map(String).includes(cleanShipId)){
      return {ok:false, reason:"Vaisseau non possede."};
    }
    const next = sanitizeProfile({
      ...profile,
      activeShip:cleanShipId,
      selectedShip:cleanShipId,
      ...(worldSession ? {worldSession} : {}),
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {ok:true, shipId:cleanShipId, profile:next};
  }

  function applyQuestAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    if(action?.kind === "accept"){
      result = acceptServerQuest(profile, action.questId);
    }else if(action?.kind === "claim"){
      result = claimServerQuest(profile, action.questId);
    }else if(action?.kind === "kill"){
      result = progressServerQuestKill(profile, {
        kind:action.enemyKind,
        zoneName:action.zoneName
      });
    }else if(action?.kind === "progress"){
      result = progressServerQuestAction(profile, action);
    }else{
      result = {ok:false, reason:"Action quete invalide."};
    }
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function applyEconomyAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    completeServerRefineryUpgrades(profile);
    completeServerRefineryShipment(profile);
    let result = null;
    if(action?.kind === "space-caster"){
      result = runServerSpaceCaster(profile, action);
      if(result.ok) progressServerQuestAction(profile, {type:"space_caster_use", amount:result.count});
    }else if(action?.kind === "refinery-upgrade-start"){
      result = startServerRefineryUpgrade(profile, action);
      if(result.ok){
        progressServerQuestAction(profile, {
          type:result.type === "module" ? "refinery_module_upgrade_start" : "refinery_material_upgrade_start",
          moduleId:result.type === "module" ? result.id : "",
          materialId:result.type === "material" ? result.id : "",
          targetLevel:result.level
        });
      }
    }else if(action?.kind === "refinery-upgrade-rush"){
      result = rushServerRefineryUpgrade(profile, action);
    }else if(action?.kind === "refinery-production-toggle"){
      result = toggleServerRefineryProduction(profile, action.id);
    }else if(action?.kind === "refinery-job-start"){
      result = startServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-job-claim"){
      result = claimServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-shipment-start"){
      result = startServerRefineryShipment(profile, action);
    }else if(action?.kind === "refinery-shipment-rush"){
      result = rushServerRefineryShipment(profile, action);
    }else if(action?.kind === "ship-cargo-refine"){
      result = refineServerShipCargoRecipe(profile, action);
    }else{
      result = {ok:false, reason:"Action economie invalide."};
    }
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }

  function getWorldSessionForPlayer(player){
    if(!player) return null;
    const {profile} = getExistingProfile(player);
    return sanitizeWorldSession(profile.worldSession);
  }

  function getProfileForPlayer(player){
    if(!player) return null;
    const {profile} = getExistingProfile(player);
    return sanitizeProfile(profile);
  }

  function saveWorldSession({player, state, force = false} = {}){
    if(!player || !state) return null;
    const now = Date.now();
    if(!force && now - Number(player.lastWorldSessionPersistAt || 0) < 2000) return null;
    player.lastWorldSessionPersistAt = now;
    const {key, profile} = getExistingProfile(player);
    const session = sanitizeWorldSession({
      ...state,
      updatedAt:now
    });
    if(!session) return null;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Number(profile.updatedAt || 0) || now,
      worldSession:session
    });
    profiles.set(key, next);
    persist();
    return next;
  }

  return {
    load,
    syncForSocket,
    saveFromPayload,
    applyReward,
    spendForPlayer,
    updateProfileForPlayer,
    addAmmoPurchase,
    addItemPurchase,
    addShipPurchase,
    addDronePurchase,
    addDroneFormationPurchase,
    applyEquipmentAction,
    setActiveShipForPlayer,
    applyQuestAction,
    applyEconomyAction,
    getProfileForPlayer,
    getWorldSessionForPlayer,
    saveWorldSession,
    profileKey,
    accountProfileKey
  };
}
