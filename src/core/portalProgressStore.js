import { portals, skills } from "../data/catalog.js";
import { getPortal } from "./catalogStore.js";
import { store } from "./store.js";
import { getXpNextForLevel, syncSkillPoints, XP_CURVE_VERSION } from "./xpStore.js";

export function getCompletedPortalCountForId(id){
  return Math.max(0, Number(store.state?.completedPortals?.[id] || 0));
}

export function hasCompletedPortal(id){
  return getCompletedPortalCountForId(id) > 0;
}

export function isEquipmentUpgradeUnlocked(){ return hasCompletedPortal("emerald"); }
export function isRecipeSystemUnlocked(){ return hasCompletedPortal("void"); }
export function isPrestigeUnlocked(){ return hasCompletedPortal("ancient"); }
export function getPlayerLevelCap(){ return isPrestigeUnlocked() ? 100 : 50; }

export function getShipRequiredCompletedPortal(ship){
  if(!ship) return null;
  return ship.requiresCompletedPortal || ship.requiresPortalCompletion || (ship.skillShip ? "violet" : null);
}

export function getShipPurchaseLockReason(ship){
  const portalId = getShipRequiredCompletedPortal(ship);
  if(!portalId || getCompletedPortalCountForId(portalId) > 0) return "";
  const portalName = getPortal(portalId)?.name || portalId;
  return `Pré requis : ${portalName} terminé`;
}

export function isShipPurchaseUnlocked(ship){
  return !getShipPurchaseLockReason(ship);
}

export function getPortalPieces(id){
  return Math.max(0, Number(store.state.portalPieces?.[id] || 0));
}

export function addPortalPiece(id, amount = 1){
  if(!store.state.portalPieces) store.state.portalPieces = {};
  store.state.portalPieces[id] = getPortalPieces(id) + Math.max(0, Number(amount || 0));
  return store.state.portalPieces[id];
}

export function isPortalUnlocked(id){
  return Array.isArray(store.state.unlockedPortals) && store.state.unlockedPortals.includes(id);
}

export function unlockPortal(id){
  if(!store.state.unlockedPortals) store.state.unlockedPortals = [];
  if(!store.state.unlockedPortals.includes(id)) store.state.unlockedPortals.push(id);
}

export function markPortalCompleted(id){
  if(!store.state.completedPortals || typeof store.state.completedPortals !== "object") store.state.completedPortals = {};
  store.state.completedPortals[id] = (store.state.completedPortals[id] || 0) + 1;
}

export function getCompletedPortalCount(){
  const completed = store.state.completedPortals || {};
  return Object.values(completed).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function hasMaxedFirstLoopSkills(state = store.state){
  return skills.every(skill=>{
    const ranks = Array.isArray(state?.skillRanks?.[skill.id]) ? state.skillRanks[skill.id] : [];
    return skill.levels.every((node, index)=>{
      const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
      return Math.max(0, Number(ranks[index] || 0)) >= maxRank;
    });
  });
}

export function getPrestigeStatus(){
  const levelOk = Number(store.state?.player?.level || 1) >= 50;
  const portalOk = isPrestigeUnlocked();
  const skillsOk = hasMaxedFirstLoopSkills();
  return {
    ok:levelOk && portalOk && skillsOk,
    levelOk,
    portalOk,
    skillsOk,
    reason:!portalOk ? "Portail Ancestral termine requis." : !levelOk ? "Niveau 50 requis." : !skillsOk ? "Toutes les competences de premiere boucle doivent etre au maximum." : ""
  };
}

export function performPrestige(){
  const status = getPrestigeStatus();
  if(!status.ok) return {ok:false, reason:status.reason};
  store.state.prestigeCount = Math.max(0, Number(store.state.prestigeCount || 0)) + 1;
  store.state.player.level = 1;
  store.state.player.xp = 0;
  store.state.player.xpNext = getXpNextForLevel(1);
  store.state.xpCurveVersion = XP_CURVE_VERSION;
  syncSkillPoints();
  return {ok:true, prestige:store.state.prestigeCount};
}
