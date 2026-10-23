import { portals, skills } from "../data/catalog.js?v=20260726-kharon1";
import { getPortal } from "./catalogStore.js?v=20260726-kharon1";
import { store } from "./store.js?v=20260726-kharon1";
import { getXpNextForLevel, syncSkillPoints, XP_CURVE_VERSION } from "./xpStore.js?v=20260726-kharon1";
import {
  getRequiredPortalForShip,
  getShipProgressionLockReason,
  hasCompletedAllProgressionPortals,
  PROGRESSION_UNLOCKS
} from "../shared/progressionUnlocks.js?v=20260726-kharon1";
import { getShipRoleLockReason } from "../data/ships.js?v=20260726-imperial2";

export function getCompletedPortalCountForId(id){
  return Math.max(0, Number(store.state?.completedPortals?.[id] || 0));
}

export function hasCompletedPortal(id){
  return getCompletedPortalCountForId(id) > 0;
}

export function isEquipmentUpgradeUnlocked(){ return hasCompletedPortal(PROGRESSION_UNLOCKS.equipmentUpgrades.portalId); }
export function isRecipeSystemUnlocked(){ return hasCompletedPortal(PROGRESSION_UNLOCKS.eliteLaserRecipes.portalId); }
export function isPrestigeUnlocked(){ return hasCompletedAllProgressionPortals(store.state); }
export function getPlayerLevelCap(){ return Number(store.state?.prestigeCount || 0) > 0 ? 100 : 50; }

export function getShipRequiredCompletedPortal(ship){
  return getRequiredPortalForShip(ship)?.portalId || null;
}

export function getShipPurchaseLockReason(ship, accountRole = "player"){
  const roleLockReason = getShipRoleLockReason(ship, accountRole);
  if(roleLockReason) return roleLockReason;
  const lockReason = getShipProgressionLockReason(store.state, ship);
  if(!lockReason) return "";
  const portalId = getShipRequiredCompletedPortal(ship);
  const portalName = getPortal(portalId)?.name;
  return `Pré requis : ${portalName ? `${portalName} terminé` : lockReason}`;
}

export function isShipPurchaseUnlocked(ship, accountRole = "player"){
  return !getShipPurchaseLockReason(ship, accountRole);
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
  const ascended = Number(store.state?.prestigeCount || 0) > 0;
  const levelOk = Number(store.state?.player?.level || 1) >= 50;
  const portalOk = isPrestigeUnlocked();
  const skillsOk = hasMaxedFirstLoopSkills();
  return {
    ok:!ascended && levelOk && portalOk,
    ascended,
    levelOk,
    portalOk,
    skillsOk,
    reason:ascended ? "Ascension deja accomplie." : !portalOk ? "Les 9 portails de progression doivent etre termines." : !levelOk ? "Niveau 50 requis." : ""
  };
}

export function performPrestige(){
  const status = getPrestigeStatus();
  if(!status.ok) return {ok:false, reason:status.reason};
  store.state.prestigeCount = 1;
  store.state.player.level = 1;
  store.state.player.xp = 0;
  store.state.player.xpNext = getXpNextForLevel(1);
  store.state.xpCurveVersion = XP_CURVE_VERSION;
  syncSkillPoints();
  return {ok:true, prestige:store.state.prestigeCount};
}
