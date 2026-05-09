import { ammoTypes, defaultState, droneCatalog, equipment, portals, questCatalog, rawMaterialCatalog, refineryRecipes, ships, skills } from "../data/catalog.js";
import { clone, fmt } from "./utils.js";
import { normalizeSlotKeybinds } from "./keybinds.js";



export const RANK_TABLE = [
  {id:"none", name:"Aucun grade", score:0},
  {id:"soldat2", name:"Soldat 2e classe", score:250},
  {id:"soldat1", name:"Soldat 1re classe", score:650},
  {id:"caporal", name:"Caporal", score:1400},
  {id:"caporal_chef", name:"Caporal-chef", score:2600},
  {id:"sergent", name:"Sergent", score:4300},
  {id:"sergent_chef", name:"Sergent-chef", score:6500},
  {id:"adjudant", name:"Adjudant", score:9300},
  {id:"adjudant_chef", name:"Adjudant-chef", score:12800},
  {id:"major", name:"Major", score:17000},
  {id:"aspirant", name:"Aspirant", score:22100},
  {id:"sous_lieutenant", name:"Sous-lieutenant", score:28200},
  {id:"lieutenant", name:"Lieutenant", score:35600},
  {id:"capitaine", name:"Capitaine", score:44500},
  {id:"commandant", name:"Commandant", score:55200},
  {id:"lieutenant_colonel", name:"Lieutenant-colonel", score:68000},
  {id:"colonel", name:"Colonel", score:83500},
  {id:"general", name:"Général", score:102000}
];

export const RANK_POINT_RULES = [
  {id:"xp", label:"Expérience totale gagnée", source:"XP gagnée sur les monstres, vagues et récompenses de portail", rate:"1 point de classement par XP", multiplier:1},
  {id:"kill", label:"Monstres détruits", source:"Chaque mob tué en zone ou en portail", rate:"55 points de classement par kill", multiplier:55},
  {id:"level", label:"Niveaux pilote", source:"Progression du niveau du commandant", rate:"120 points par niveau gagné après le niveau 1", multiplier:120},
  {id:"portal", label:"Portails terminés", source:"Nettoyage complet des 30 vagues d'un portail", rate:"2 500 points par portail terminé", multiplier:2500}
];

export function getRankById(id){
  return RANK_TABLE.find(rank=>rank.id === id) || RANK_TABLE[0];
}

export function getRankAssetPath(rankLike){
  const id = typeof rankLike === "string" ? rankLike : rankLike?.id;
  return `assets/ranks/${getRankById(id).id}.svg`;
}

export const LOCAL_LEADERBOARD_PREVIEW = [
  {id:"vex09", pilot:"VEX-09", level:34, kills:1260, portals:12, points:186000},
  {id:"orion5", pilot:"ORION-5", level:29, kills:940, portals:8, points:127500},
  {id:"kira77", pilot:"KIRA-77", level:24, kills:610, portals:5, points:74200},
  {id:"raven13", pilot:"RAVEN-13", level:18, kills:350, portals:2, points:38600},
  {id:"nova21", pilot:"NOVA-21", level:14, kills:210, portals:1, points:21400},
  {id:"atlas02", pilot:"ATLAS-02", level:10, kills:86, portals:0, points:9650}
];

export const store = {
  state:null,
  shopFilter:"vaisseau",
  currentView:"hangar",
  hangarDetailOpen:false,
  hangarTab:"vaisseau",
  selectedInventoryUid:null,
  selectedShopProduct:null
};

export function getShip(id){ return ships.find(s=>s.id===id) || ships[0]; }
export function getItem(id){ return equipment.find(i=>i.id===id); }
export function getAmmo(id){ return ammoTypes.find(a=>a.id===id) || null; }
export function getDroneCatalog(id="combat_drone"){ return droneCatalog.find(d=>d.id===id) || droneCatalog[0]; }
export function isWeapon(id){ return getItem(id)?.category === "canon"; }
export function isGenerator(id){ return getItem(id)?.category === "generateur"; }
export function getInventoryItem(uid){ return store.state.inventoryItems.find(entry=>entry.uid === uid) || null; }
export function getItemFromInventoryUid(uid){ return getItem(getInventoryItem(uid)?.itemId); }
export function priceLabel(type, price){ return type === "premium" ? `${fmt(price)} NOVA` : `${fmt(price)} CR`; }
export function canAfford(type, price){ return type === "premium" ? store.state.player.premium >= price : store.state.player.credits >= price; }
export function spend(type, price){ if(type === "premium") store.state.player.premium -= price; else store.state.player.credits -= price; }
export function getPortal(id){ return portals.find(p=>p.id===id) || null; }
export function getQuest(id){ return questCatalog.find(q=>q.id === id) || null; }
export function getAllQuests(){ return questCatalog.slice(); }
export function getRawMaterial(id){ return rawMaterialCatalog.find(item=>item.id === id) || null; }
export function getAllRawMaterials(){ return rawMaterialCatalog.slice(); }
export function getRefineryRecipe(id){ return refineryRecipes.find(recipe=>recipe.id === id) || null; }
export function getRefineryRecipes(){ return refineryRecipes.slice(); }
export function getPortalPieces(id){ return Math.max(0, Number(store.state.portalPieces?.[id] || 0)); }
export function addPortalPiece(id, amount=1){
  if(!store.state.portalPieces) store.state.portalPieces = {};
  store.state.portalPieces[id] = getPortalPieces(id) + Math.max(0, Number(amount || 0));
  return store.state.portalPieces[id];
}
export function isPortalUnlocked(id){ return Array.isArray(store.state.unlockedPortals) && store.state.unlockedPortals.includes(id); }
export function unlockPortal(id){
  if(!store.state.unlockedPortals) store.state.unlockedPortals = [];
  if(!store.state.unlockedPortals.includes(id)) store.state.unlockedPortals.push(id);
}
export function markPortalCompleted(id){
  if(!store.state.completedPortals || typeof store.state.completedPortals !== "object") store.state.completedPortals = {};
  store.state.completedPortals[id] = (store.state.completedPortals[id] || 0) + 1;
}
export function getCompletedPortalCount(){
  const completed = store.state?.completedPortals || {};
  return Object.values(completed).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function getMaterialCount(id){
  return Math.max(0, Number(store.state?.cargoHold?.[id] || 0));
}

export function addMaterial(id, amount=1){
  if(!getRawMaterial(id)) return 0;
  if(!store.state.cargoHold) store.state.cargoHold = {};
  store.state.cargoHold[id] = getMaterialCount(id) + Math.max(0, Number(amount || 0));
  return store.state.cargoHold[id];
}

export function consumeMaterial(id, amount=1){
  const need = Math.max(0, Number(amount || 0));
  if(getMaterialCount(id) < need) return false;
  store.state.cargoHold[id] -= need;
  return true;
}

export function getCargoUsed(){
  return rawMaterialCatalog.reduce((sum, item)=>sum + getMaterialCount(item.id), 0);
}

export function getRefineryJob(){
  return store.state?.refineryJob || null;
}

export function isRefineryComplete(){
  const job = getRefineryJob();
  return Boolean(job && Number(job.endsAt || 0) <= Date.now());
}

export function startRefineryJob(recipeId){
  if(getRefineryJob()) return {ok:false, reason:"Le raffineur est déjà occupé."};
  const recipe = getRefineryRecipe(recipeId);
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  for(const [materialId, amount] of Object.entries(recipe.costs || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Matériaux insuffisants : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  for(const [materialId, amount] of Object.entries(recipe.costs || {})) consumeMaterial(materialId, amount);
  store.state.refineryJob = {recipeId:recipe.id, startedAt:Date.now(), endsAt:Date.now() + Number(recipe.durationMs || 0)};
  return {ok:true, recipe};
}

export function claimRefineryJob(){
  const job = getRefineryJob();
  if(!job) return {ok:false, reason:"Aucun raffinage en cours."};
  if(!isRefineryComplete()) return {ok:false, reason:"Raffinage non terminé."};
  const recipe = getRefineryRecipe(job.recipeId);
  if(!recipe) return {ok:false, reason:"Recette invalide."};
  addMaterial(recipe.outputId, recipe.outputAmount || 1);
  store.state.refineryJob = null;
  return {ok:true, recipe};
}

export function getEquipmentUpgradeLevel(itemId){
  return Math.max(0, Number(store.state?.equipmentUpgrades?.[itemId] || 0));
}

export function getEquipmentUpgradeCost(itemLike){
  const item = typeof itemLike === "string" ? getItem(itemLike) : itemLike;
  const level = getEquipmentUpgradeLevel(item?.id);
  if(item?.category === "canon") return {materialId:"alliage", amount:1 + level};
  if(item?.category === "generateur") return {materialId:"noyau", amount:1 + level};
  return null;
}

export function upgradeEquipment(itemId){
  const item = getItem(itemId);
  if(!item || !["canon","generateur"].includes(item.category)) return {ok:false, reason:"Équipement non améliorable."};
  const current = getEquipmentUpgradeLevel(itemId);
  if(current >= 10) return {ok:false, reason:"Niveau maximum atteint."};
  const cost = getEquipmentUpgradeCost(item);
  if(!cost || getMaterialCount(cost.materialId) < cost.amount) return {ok:false, reason:"Matériaux raffinés insuffisants."};
  if(!store.state.equipmentUpgrades) store.state.equipmentUpgrades = {};
  consumeMaterial(cost.materialId, cost.amount);
  store.state.equipmentUpgrades[itemId] = current + 1;
  return {ok:true, level:current + 1, cost};
}

export function getSkillDefinition(id){
  return skills.find(skill=>skill.id === id) || null;
}

export function getSkillLevel(id){
  return Math.max(0, Number(store.state?.skillLevels?.[id] || 0));
}

export function getSkillUpgradeData(id){
  const skill = getSkillDefinition(id);
  if(!skill) return null;
  const level = getSkillLevel(id);
  return skill.levels?.[level] || null;
}

export function upgradeSkill(id){
  const skill = getSkillDefinition(id);
  if(!skill) return {ok:false, reason:"Compétence introuvable."};
  const level = getSkillLevel(id);
  if(level >= Number(skill.maxLevel || skill.levels?.length || 0)) return {ok:false, reason:"Niveau maximum atteint."};
  const next = getSkillUpgradeData(id);
  if(!next) return {ok:false, reason:"Palier introuvable."};
  if(Number(store.state.player.skillPoints || 0) < Number(next.skillPoints || 0)) return {ok:false, reason:"Pas assez de points de compétence."};
  if(!canAfford(next.priceType, next.price)) return {ok:false, reason: next.priceType === "premium" ? "Pas assez de NOVA." : "Pas assez de crédits."};
  store.state.player.skillPoints -= Number(next.skillPoints || 0);
  spend(next.priceType, next.price);
  if(!store.state.skillLevels || typeof store.state.skillLevels !== "object") store.state.skillLevels = {};
  store.state.skillLevels[id] = level + 1;
  return {ok:true, level:level + 1, step:next, skill};
}

export function getActiveQuest(){
  return getQuest(store.state?.activeQuestId) || null;
}

export function getQuestProgress(id){
  return Math.max(0, Number(store.state?.questProgress?.[id] || 0));
}

export function canClaimQuest(id){
  const quest = getQuest(id);
  if(!quest) return false;
  return getQuestProgress(id) >= Math.max(0, Number(quest.objective?.count || 0));
}

export function acceptQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quête introuvable."};
  if(store.state?.completedQuestClaims?.[id]) return {ok:false, reason:"Quête déjà terminée."};
  store.state.activeQuestId = id;
  if(!store.state.questProgress) store.state.questProgress = {};
  if(!store.state.questProgress[id]) store.state.questProgress[id] = 0;
  return {ok:true, quest};
}

export function recordQuestKill(kind, zoneName){
  const quest = getActiveQuest();
  if(!quest || quest.objective?.type !== "kill") return false;
  if(quest.objective?.target && quest.objective.target !== kind) return false;
  if(quest.objective?.zone && quest.objective.zone !== zoneName) return false;
  if(!store.state.questProgress) store.state.questProgress = {};
  const next = Math.min(Number(quest.objective?.count || 0), getQuestProgress(quest.id) + 1);
  store.state.questProgress[quest.id] = next;
  return next >= Number(quest.objective?.count || 0);
}

export function claimQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quête introuvable."};
  if(!canClaimQuest(id)) return {ok:false, reason:"Objectif non rempli."};
  store.state.player.credits += Number(quest.rewards?.credits || 0);
  addXP(Number(quest.rewards?.xp || 0));
  for(const [materialId, amount] of Object.entries(quest.rewards?.materials || {})) addMaterial(materialId, amount);
  if(!store.state.completedQuestClaims || typeof store.state.completedQuestClaims !== "object") store.state.completedQuestClaims = {};
  store.state.completedQuestClaims[id] = true;
  if(store.state.activeQuestId === id) store.state.activeQuestId = null;
  return {ok:true, quest};
}

export function getRankForScore(score){
  let current = RANK_TABLE[0];
  for(const rank of RANK_TABLE){
    if(Number(score || 0) >= rank.score) current = rank;
    else break;
  }
  return current;
}

export function getRankScore(){
  const player = store.state?.player || {};
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const portalClears = getCompletedPortalCount();
  return totalXp + totalKills * 55 + levelBonus * 120 + portalClears * 2500;
}

export function getRankBreakdown(){
  const player = store.state?.player || {};
  const totalXp = Math.max(0, Number(player.totalXp || 0));
  const totalKills = Math.max(0, Number(player.totalKills || 0));
  const levelBonus = Math.max(0, Number(player.level || 1) - 1);
  const portalClears = getCompletedPortalCount();
  return [
    {id:"xp", label:"XP totale gagnée", source:"Monstres, vagues et récompenses de portail", amount:totalXp, rate:1, formula:`${totalXp} × 1`, points:totalXp},
    {id:"kill", label:"Monstres détruits", source:"Chaque ennemi tué", amount:totalKills, rate:55, formula:`${totalKills} × 55`, points:totalKills * 55},
    {id:"level", label:"Niveaux gagnés", source:"Chaque niveau après le niveau 1", amount:levelBonus, rate:120, formula:`${levelBonus} × 120`, points:levelBonus * 120},
    {id:"portal", label:"Portails terminés", source:"30 vagues nettoyées + boss tué", amount:portalClears, rate:2500, formula:`${portalClears} × 2500`, points:portalClears * 2500}
  ];
}

export function getCurrentRank(){
  return getRankForScore(getRankScore());
}

export function getNextRank(){
  const current = getCurrentRank();
  return RANK_TABLE.find(rank=>rank.score > current.score) || null;
}

export function getRankProgress(){
  const current = getCurrentRank();
  const next = getNextRank();
  const score = getRankScore();
  if(!next) return {score,current,next,progress:100,remaining:0};
  const span = Math.max(1, next.score - current.score);
  return {score,current,next,progress:Math.max(0, Math.min(100, (score - current.score) / span * 100)),remaining:Math.max(0, next.score - score)};
}

export function getLeaderboardRows(){
  const player = store.state?.player || {};
  const selfPoints = getRankScore();
  const self = {
    id:"player",
    pilot:player.name || "NOVA-37",
    level:Number(player.level || 1),
    kills:Number(player.totalKills || 0),
    portals:getCompletedPortalCount(),
    points:selfPoints,
    isPlayer:true
  };
  const rows = [self, ...LOCAL_LEADERBOARD_PREVIEW].map(row=>{
    const rank = row.rankId ? getRankById(row.rankId) : getRankForScore(row.points);
    return {
      ...row,
      rankId:rank.id,
      grade:row.grade || rank.name
    };
  });
  return rows
    .sort((a,b)=>b.points - a.points || b.level - a.level || a.pilot.localeCompare(b.pilot))
    .map((row,index)=>({...row, position:index+1}));
}

export function registerKill(kind){
  const player = store.state.player;
  player.totalKills = Math.max(0, Number(player.totalKills || 0)) + 1;
  if(!store.state.killStats || typeof store.state.killStats !== "object") store.state.killStats = {};
  store.state.killStats[kind || "unknown"] = Math.max(0, Number(store.state.killStats[kind || "unknown"] || 0)) + 1;
  player.rankScore = getRankScore();
}

export function getRequiredLevel(entity){ return Math.max(0, Number(entity?.unlockLevel ?? 1)); }
export function isUnlockedForPlayer(entity){ return store.state.player.level >= getRequiredLevel(entity); }
export function getWeaponAverageDamage(item){
  if(!item?.weapon) return 0;
  const upgradeBonus = getEquipmentUpgradeLevel(item.id) * 10;
  const min = Number(item.weapon.minDamage ?? item.weapon.damage ?? 0);
  const max = Number(item.weapon.maxDamage ?? item.weapon.damage ?? min);
  return (min + max) / 2 + upgradeBonus;
}

export function getAmmoCount(id){
  return Math.max(0, Number(store.state.ammoInventory?.[id] || 0));
}

export function addAmmo(id, amount){
  if(!getAmmo(id)) return 0;
  if(!store.state.ammoInventory) store.state.ammoInventory = {};
  store.state.ammoInventory[id] = getAmmoCount(id) + Math.max(0, Number(amount || 0));
  return store.state.ammoInventory[id];
}

export function consumeAmmo(id, amount){
  const need = Math.max(0, Number(amount || 0));
  if(getAmmoCount(id) < need) return false;
  store.state.ammoInventory[id] -= need;
  return true;
}

export function setActionSlot(index, ammoId){
  if(!store.state.actionSlots) store.state.actionSlots = Array(9).fill(null);
  if(index < 0 || index >= 9) return false;
  store.state.actionSlots[index] = ammoId && getAmmo(ammoId) ? ammoId : null;
  return true;
}

export function makeEmptyLoadout(shipId){
  const ship = getShip(shipId);
  return {lasers:Array(ship.stats.maxLasers).fill(null), generators:Array(ship.stats.maxGenerators).fill(null), extras:Array(3).fill(null)};
}

export function cleanLoadout(shipId, raw){
  const ship = getShip(shipId);
  const lasers = Array.from({length:ship.stats.maxLasers}, (_,i)=>{
    const uid = raw?.lasers?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "canon" ? uid : null;
  });
  const generators = Array.from({length:ship.stats.maxGenerators}, (_,i)=>{
    const uid = raw?.generators?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "generateur" ? uid : null;
  });
  const extras = Array.from({length:3}, (_,i)=>{
    const uid = raw?.extras?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "extra" ? uid : null;
  });
  return {lasers, generators, extras};
}

export function cleanDroneLoadout(raw){
  const max = getDroneCatalog().maxOwned || 8;
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({length:Math.min(max, source.length)}, (_,i)=>{
    const uid = source[i] ?? null;
    const item = getItemFromInventoryUid(uid);
    return uid && item && ["canon","generateur"].includes(item.category) ? uid : null;
  });
}

export function addInventoryItem(itemId){
  const item = getItem(itemId);
  if(!item) return null;
  const uid = `inv_${itemId}_${store.state.nextInventoryUid || 1}`;
  store.state.nextInventoryUid = (store.state.nextInventoryUid || 1) + 1;
  const entry = {uid, itemId};
  store.state.inventoryItems.push(entry);
  return entry;
}

export function getInventoryCount(itemId){
  return store.state.inventoryItems.filter(entry=>entry.itemId === itemId).length;
}

export function getDronePurchasePrice(index = store.state.ownedDroneCount){
  const drone = getDroneCatalog();
  return drone.basePrice * Math.pow(2, Math.max(0, Number(index || 0)));
}

export function getDroneLoadout(){
  const owned = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(store.state.ownedDroneCount || 0)));
  store.state.droneLoadout = cleanDroneLoadout(store.state.droneLoadout || []);
  while(store.state.droneLoadout.length < owned) store.state.droneLoadout.push(null);
  store.state.droneLoadout = store.state.droneLoadout.slice(0, owned);
  return store.state.droneLoadout;
}

export function findEquippedSlot(uid){
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const loadout = getLoadout(shipId);
    const laserIndex = loadout?.lasers?.indexOf(uid) ?? -1;
    if(laserIndex >= 0) return {location:"ship", shipId, type:"laser", index:laserIndex};
    const generatorIndex = loadout?.generators?.indexOf(uid) ?? -1;
    if(generatorIndex >= 0) return {location:"ship", shipId, type:"generator", index:generatorIndex};
    const extraIndex = loadout?.extras?.indexOf(uid) ?? -1;
    if(extraIndex >= 0) return {location:"ship", shipId, type:"extra", index:extraIndex};
  }
  const drones = getDroneLoadout();
  const droneIndex = drones.indexOf(uid);
  if(droneIndex >= 0){
    const item = getItemFromInventoryUid(uid);
    return {location:"drone", type:item?.category === "canon" ? "laser" : "generator", index:droneIndex};
  }
  return null;
}

export function unequipInventoryItem(uid){
  const equipped = findEquippedSlot(uid);
  if(!equipped) return false;
  if(equipped.location === "drone"){
    getDroneLoadout()[equipped.index] = null;
    return true;
  }
  const loadout = getLoadout(equipped.shipId);
  if(equipped.type === "laser") loadout.lasers[equipped.index] = null;
  else if(equipped.type === "generator") loadout.generators[equipped.index] = null;
  else if(equipped.type === "extra") loadout.extras[equipped.index] = null;
  return true;
}

export function getInventoryByCategory(category){
  return store.state.inventoryItems
    .map(entry=>({...entry, item:getItem(entry.itemId), equipped:findEquippedSlot(entry.uid)}))
    .filter(entry=>entry.item?.category === category);
}

export function getLoadout(shipId = store.state.activeShip){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId] || makeEmptyLoadout(shipId));
  return store.state.shipLoadouts[shipId];
}

export function ensureShipLoadout(shipId){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  if(!store.state.shipLoadouts[shipId]) store.state.shipLoadouts[shipId] = makeEmptyLoadout(shipId);
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId]);
  return store.state.shipLoadouts[shipId];
}

export function normalizeState(saved){
  const base = clone(defaultState);
  const merged = {...base, ...(saved || {})};
  merged.player = {...base.player, ...(saved?.player || {})};
  merged.player.totalXp = Math.max(0, Number(merged.player.totalXp || 0));
  merged.player.totalKills = Math.max(0, Number(merged.player.totalKills || 0));
  merged.ownedShips = Array.isArray(saved?.ownedShips) ? saved.ownedShips.filter(id=>ships.some(s=>s.id===id)) : base.ownedShips;
  merged.ownedItems = Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)) : base.ownedItems;
  merged.inventoryItems = Array.isArray(saved?.inventoryItems)
    ? saved.inventoryItems.filter(entry=>entry?.uid && equipment.some(i=>i.id===entry.itemId))
    : (Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)).map((itemId,index)=>({uid:`inv_${itemId}_${index+1}`, itemId})) : clone(base.inventoryItems));
  if(!merged.inventoryItems.some(entry=>entry.itemId === "laser_mk1")) merged.inventoryItems.unshift({uid:"inv_laser_mk1_1", itemId:"laser_mk1"});
  merged.inventoryItems = dedupeInventoryUids(merged.inventoryItems);
  merged.nextInventoryUid = Math.max(
    Number(saved?.nextInventoryUid || base.nextInventoryUid || 1),
    getNextInventoryUid(merged.inventoryItems)
  );
  merged.unlockedSkills = Array.isArray(saved?.unlockedSkills) ? saved.unlockedSkills.filter(id=>skills.some(s=>s.id===id)) : base.unlockedSkills;
  merged.skillLevels = {...(base.skillLevels || {})};
  if(saved?.skillLevels && typeof saved.skillLevels === "object"){
    for(const skill of skills){
      merged.skillLevels[skill.id] = Math.max(0, Math.min(Number(skill.maxLevel || skill.levels?.length || 0), Number(saved.skillLevels[skill.id] || 0)));
    }
  }
  // Migration légère de l'ancien système (liste de compétences débloquées) vers les nouvelles branches.
  if((!saved?.skillLevels || typeof saved.skillLevels !== "object") && Array.isArray(saved?.unlockedSkills) && saved.unlockedSkills.length){
    const legacyCount = saved.unlockedSkills.length;
    if(legacyCount >= 1) merged.skillLevels.damage = Math.min(1, skills.find(s=>s.id === "damage")?.maxLevel || 1);
    if(legacyCount >= 2) merged.skillLevels.shield = Math.min(1, skills.find(s=>s.id === "shield")?.maxLevel || 1);
    if(legacyCount >= 3) merged.skillLevels.utility = Math.min(1, skills.find(s=>s.id === "utility")?.maxLevel || 1);
  }
  merged.ammoInventory = {...base.ammoInventory};
  if(saved?.ammoInventory && typeof saved.ammoInventory === "object"){
    for(const ammo of ammoTypes) merged.ammoInventory[ammo.id] = Math.max(0, Number(saved.ammoInventory[ammo.id] || 0));
  }
  merged.actionSlots = Array.from({length:9}, (_,i)=>{
    const value = Array.isArray(saved?.actionSlots) ? saved.actionSlots[i] : base.actionSlots[i];
    return value && ammoTypes.some(a=>a.id === value) ? value : null;
  });
  merged.slotKeybinds = normalizeSlotKeybinds(saved?.slotKeybinds || base.slotKeybinds);
  merged.portalPieces = {...(base.portalPieces || {})};
  if(saved?.portalPieces && typeof saved.portalPieces === "object") for(const key of Object.keys(base.portalPieces || {})) merged.portalPieces[key] = Math.max(0, Number(saved.portalPieces[key] || 0));
  merged.unlockedPortals = Array.isArray(saved?.unlockedPortals) ? saved.unlockedPortals.filter(id=>portals.some(p=>p.id === id)) : clone(base.unlockedPortals || []);
  merged.completedPortals = saved?.completedPortals && typeof saved.completedPortals === "object" ? {...saved.completedPortals} : {...(base.completedPortals || {})};
  merged.killStats = saved?.killStats && typeof saved.killStats === "object" ? {...saved.killStats} : {};
  merged.cargoHold = {...(base.cargoHold || {})};
  if(saved?.cargoHold && typeof saved.cargoHold === "object"){
    for(const mat of rawMaterialCatalog) merged.cargoHold[mat.id] = Math.max(0, Number(saved.cargoHold[mat.id] || 0));
  }
  merged.refineryJob = saved?.refineryJob && typeof saved.refineryJob === "object" ? {...saved.refineryJob} : base.refineryJob;
  merged.equipmentUpgrades = saved?.equipmentUpgrades && typeof saved.equipmentUpgrades === "object" ? {...saved.equipmentUpgrades} : {...(base.equipmentUpgrades || {})};
  merged.activeQuestId = getQuest(saved?.activeQuestId)?.id || base.activeQuestId;
  merged.questProgress = saved?.questProgress && typeof saved.questProgress === "object" ? {...saved.questProgress} : {...(base.questProgress || {})};
  merged.completedQuestClaims = saved?.completedQuestClaims && typeof saved.completedQuestClaims === "object" ? {...saved.completedQuestClaims} : {...(base.completedQuestClaims || {})};
  merged.ownedDroneCount = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(saved?.ownedDroneCount ?? base.ownedDroneCount ?? 0)));
  merged.droneLoadout = cleanDroneLoadout(saved?.droneLoadout || base.droneLoadout || []);
  while(merged.droneLoadout.length < merged.ownedDroneCount) merged.droneLoadout.push(null);
  if(!merged.ownedShips.includes("eclaireur")) merged.ownedShips.unshift("eclaireur");
  if(!merged.ownedItems.includes("laser_mk1")) merged.ownedItems.unshift("laser_mk1");
  if(merged.activeShip !== null && (!ships.some(s=>s.id===merged.activeShip) || !merged.ownedShips.includes(merged.activeShip))) merged.activeShip = "eclaireur";
  if(!ships.some(s=>s.id===merged.selectedShip) || !merged.ownedShips.includes(merged.selectedShip)) merged.selectedShip = merged.activeShip;
  if(!merged.selectedShip) merged.selectedShip = "eclaireur";
  merged.shipLoadouts = saved?.shipLoadouts && typeof saved.shipLoadouts === "object" ? saved.shipLoadouts : clone(base.shipLoadouts);
  if(Object.keys(merged.shipLoadouts).length === 0 && Array.isArray(saved?.slots)){
    merged.shipLoadouts[merged.activeShip] = {
      lasers: saved.slots.filter(id=>id && equipment.find(i=>i.id===id)?.category === "canon"),
      generators: [],
      extras: []
    };
  }
  store.state = merged;
  migrateLoadoutItemIds();
  for(const shipId of merged.ownedShips) ensureShipLoadout(shipId);
  getDroneLoadout();
  merged.player.rankScore = getRankScore();
  return merged;
}

function dedupeInventoryUids(items){
  const used = new Set();
  let next = 1;
  return items.map(entry=>{
    let uid = typeof entry.uid === "string" && entry.uid ? entry.uid : "";
    if(!uid || used.has(uid)){
      do{
        uid = `inv_${entry.itemId}_${next++}`;
      }while(used.has(uid));
    }
    used.add(uid);
    return {...entry, uid};
  });
}

function getNextInventoryUid(items){
  const maxSuffix = items.reduce((max, entry)=>{
    const match = String(entry.uid || "").match(/_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Math.max(items.length + 1, maxSuffix + 1);
}

function migrateLoadoutItemIds(){
  const used = new Set();
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const raw = store.state.shipLoadouts[shipId] || {};
    for(const part of ["lasers", "generators", "extras"]){
      raw[part] = (raw[part] || []).map(value=>{
        if(!value) return null;
        if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
        const item = getItem(value);
        if(!item) return null;
        let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
        if(!entry) entry = addInventoryItem(value);
        used.add(entry.uid);
        return entry.uid;
      });
    }
  }
  store.state.droneLoadout = (store.state.droneLoadout || []).map(value=>{
    if(!value) return null;
    if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
    const item = getItem(value);
    if(!item || !["canon","generateur"].includes(item.category)) return null;
    let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
    if(!entry) entry = addInventoryItem(value);
    used.add(entry.uid);
    return entry.uid;
  });
}

export function loadState(){
  try{
    const raw = localStorage.getItem("voidsector-prototype-state");
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return normalizeState(null);
  }
}

export function saveState(){
  if(store.state?.player) store.state.player.rankScore = getRankScore();
  localStorage.setItem("voidsector-prototype-state", JSON.stringify(store.state));
}

export function getSkillBonus(){
  const bonus = {};
  for(const skill of skills){
    const level = getSkillLevel(skill.id);
    for(let i=0;i<level;i++){
      const stats = skill.levels?.[i]?.stats || {};
      for(const [k,v] of Object.entries(stats)) bonus[k] = (bonus[k] || 0) + v;
    }
  }
  return bonus;
}

export function getEquippedGenerators(shipId = store.state.activeShip){
  return getLoadout(shipId).generators.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedExtras(shipId = store.state.activeShip){
  return getLoadout(shipId).extras.map(getItemFromInventoryUid).filter(Boolean);
}

export function getExtraBonus(shipId = store.state.activeShip){
  const skill = getSkillBonus();
  const bonus = {
    autoRocket:false,
    rocketCooldownMultiplier:1,
    rocketDamageBonus:0,
    repairBot:false,
    repairBotAuto:false,
    repairBotHealRate:0.02,
    repairBotDelay:Math.max(6, 15 - Math.max(0, Number(skill.repairBotDelayReduction || 0)))
  };
  for(const item of getEquippedExtras(shipId)){
    const effect = item.effect || {};
    if(effect.autoRocket) bonus.autoRocket = true;
    if(effect.rocketCooldownMultiplier) bonus.rocketCooldownMultiplier *= effect.rocketCooldownMultiplier;
    if(effect.rocketDamageBonus) bonus.rocketDamageBonus += effect.rocketDamageBonus;
    if(effect.repairBot) bonus.repairBot = true;
    if(effect.repairBotAuto) bonus.repairBotAuto = true;
    if(effect.repairBotHealRate) bonus.repairBotHealRate = Math.max(bonus.repairBotHealRate, effect.repairBotHealRate);
    if(effect.repairBotDelay) bonus.repairBotDelay = Math.max(1, Math.min(bonus.repairBotDelay, effect.repairBotDelay));
  }
  bonus.rocketCooldownMultiplier = Math.max(0.25, bonus.rocketCooldownMultiplier);
  return bonus;
}

export function getRealSpeedFromStat(vitesse){
  return Math.round(120 + Number(vitesse || 0) * 2.15);
}

export function getEquippedLasers(shipId = store.state.activeShip){
  return getLoadout(shipId).lasers.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneItems(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneLasers(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "canon");
}

export function getEquippedDroneGenerators(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "generateur");
}

export function getShipCombatStats(shipId = store.state.activeShip){
  const ship = getShip(shipId);
  const skill = getSkillBonus();
  const generators = [...getEquippedGenerators(shipId), ...getEquippedDroneGenerators()];
  const shieldFromGenerators = generators.reduce((sum, item)=>sum + (item.stats.bouclier || 0) + (item.stats.bouclier ? getEquipmentUpgradeLevel(item.id) * 30 : 0), 0);
  const regen = generators.reduce((sum, item)=>sum + (item.stats.regen || 0) + (item.stats.regen ? getEquipmentUpgradeLevel(item.id) : 0), 0);
  const generatorSpeed = generators.reduce((sum, item)=>sum + (item.stats.vitesse || 0) + (item.stats.vitesse ? getEquipmentUpgradeLevel(item.id) * 2 : 0), 0);
  const vitesse = ship.stats.vitesse + (skill.vitesse || 0) + generatorSpeed;
  return {
    vie: ship.stats.vie + (skill.vie || 0),
    vitesse,
    vitesseReelle:getRealSpeedFromStat(vitesse),
    cargo: ship.stats.cargo + (skill.cargo || 0),
    maxLasers: ship.stats.maxLasers,
    maxGenerators: ship.stats.maxGenerators,
    maxExtras:3,
    droneCount: getDroneLoadout().length,
    bouclier: shieldFromGenerators > 0 ? shieldFromGenerators + (skill.shieldBonus || 0) : 0,
    regen: regen + (skill.regen || 0),
    weaponDamage: skill.weaponDamage || 0,
    weaponDamagePercent: skill.weaponDamagePercent || 0,
    shieldAbsorbRatio: Math.max(0, Math.min(0.9, 0.5 + Number(skill.shieldAbsorbBonus || 0))),
    extraBonus:getExtraBonus(shipId)
  };
}

export function getPowerScore(shipId = store.state.activeShip){
  const stats = getShipCombatStats(shipId);
  const lasers = [...getEquippedLasers(shipId), ...getEquippedDroneLasers()].reduce((sum, item)=>sum + getWeaponAverageDamage(item), 0);
  const gen = [...getEquippedGenerators(shipId), ...getEquippedDroneGenerators()].reduce((sum, item)=>sum + Math.round((item.stats.bouclier || 0)/4) + Math.round((item.stats.vitesse || 0)*2), 0);
  return Math.round(stats.vie/4 + stats.vitesse + stats.cargo/2 + lasers + gen + (getSkillBonus().power || 0));
}

export function addXP(amount){
  const gain = Math.max(0, Number(amount || 0));
  store.state.player.xp += gain;
  store.state.player.totalXp = Math.max(0, Number(store.state.player.totalXp || 0)) + gain;
  let leveled = false;
  while(store.state.player.xp >= store.state.player.xpNext){
    store.state.player.xp -= store.state.player.xpNext;
    store.state.player.level += 1;
    store.state.player.skillPoints += 1;
    store.state.player.xpNext = Math.round(store.state.player.xpNext * 1.35 + 50);
    leveled = true;
  }
  store.state.player.rankScore = getRankScore();
  return leveled;
}
