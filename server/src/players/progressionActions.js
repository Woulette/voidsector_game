import { skills } from "../../../src/data/catalog.js";
import { getNovaDiscountedPrice } from "../../../src/data/premium.js";
import { getServerPortalDefinition } from "../portals/portalDefinitions.js";
import { getProgressionLevelCap, getXpNextForLevel, normalizeProgressionPlayer } from "./progression.js";
import { getMissingProgressionPortalIds, PROGRESSION_PORTAL_NAMES } from "../../../src/shared/progressionUnlocks.js";

const SKILL_ACCESS_PORTAL_REQUIREMENT = Object.freeze({
  portalId:"blue",
  label:"Le Seuil d'Azuron"
});

function getSkillCostEntries(step){
  const costs = step?.costs;
  if(costs && typeof costs === "object"){
    return {
      credits:Math.max(0, Number(costs.credits || 0)),
      premium:Math.max(0, Number(costs.premium || 0)),
      materials:Object.fromEntries(Object.entries(costs.materials || {}).map(([id, amount])=>[id, Math.max(0, Number(amount || 0))]))
    };
  }
  return {
    credits:step?.priceType === "credits" ? Math.max(0, Number(step.price || 0)) : 0,
    premium:step?.priceType === "premium" ? Math.max(0, Number(step.price || 0)) : 0,
    materials:{}
  };
}

function getSkillDefinition(id){
  return skills.find(skill=>skill.id === id) || null;
}

function getNodeMaxRank(node){
  return Array.isArray(node?.ranks) ? node.ranks.length : 1;
}

function ensureSkillState(profile){
  if(!profile.player || typeof profile.player !== "object") profile.player = {};
  profile.player = normalizeProgressionPlayer(profile.player, getProgressionLevelCap(profile.prestigeCount));
  if(!profile.skillRanks || typeof profile.skillRanks !== "object" || Array.isArray(profile.skillRanks)) profile.skillRanks = {};
  if(!profile.skillLevels || typeof profile.skillLevels !== "object" || Array.isArray(profile.skillLevels)) profile.skillLevels = {};
  if(!profile.cargoHold || typeof profile.cargoHold !== "object" || Array.isArray(profile.cargoHold)) profile.cargoHold = {};
  if(!profile.completedPortals || typeof profile.completedPortals !== "object" || Array.isArray(profile.completedPortals)) profile.completedPortals = {};
}

function getSkillRanks(profile, id){
  const skill = getSkillDefinition(id);
  const saved = Array.isArray(profile?.skillRanks?.[id]) ? profile.skillRanks[id] : [];
  return Array.from({length:skill?.levels?.length || 0}, (_, index)=>{
    const maxRank = getNodeMaxRank(skill.levels[index]);
    return Math.max(0, Math.min(maxRank, Number(saved[index] || 0)));
  });
}

function getSkillProgress(profile, id){
  const skill = getSkillDefinition(id);
  if(!skill) return null;
  const ranks = getSkillRanks(profile, id);
  const nodeIndex = ranks.findIndex((rank, index)=>rank < getNodeMaxRank(skill.levels[index]));
  const activeIndex = nodeIndex >= 0 ? nodeIndex : skill.levels.length - 1;
  const completedNodes = ranks.reduce((sum, rank, index)=>sum + (rank >= getNodeMaxRank(skill.levels[index]) ? 1 : 0), 0);
  return {
    nodeIndex:activeIndex,
    rank:ranks[activeIndex] || 0,
    completedNodes,
    ranks
  };
}

function hasCompletedPreviousSkillNode(profile, nodeIndex){
  const index = Math.max(0, Number(nodeIndex || 0));
  if(index <= 0) return true;
  return skills.every(skill=>{
    const previousNode = skill.levels?.[index - 1];
    if(!previousNode) return true;
    const ranks = getSkillRanks(profile, skill.id);
    return Number(ranks[index - 1] || 0) >= getNodeMaxRank(previousNode);
  });
}

function getSkillNodeLockReason(profile, nodeIndex){
  const requirement = Number.isFinite(Number(nodeIndex)) ? SKILL_ACCESS_PORTAL_REQUIREMENT : null;
  if(requirement && Math.max(0, Number(profile?.completedPortals?.[requirement.portalId] || 0)) <= 0){
    return `Pre requis : ${requirement.label}`;
  }
  if(!hasCompletedPreviousSkillNode(profile, nodeIndex)) return "Pre requis : rangs precedents 3/3";
  return "";
}

function getSpentSkillPoints(profile){
  let spent = 0;
  for(const skill of skills){
    const ranks = getSkillRanks(profile, skill.id);
    for(let nodeIndex = 0; nodeIndex < skill.levels.length; nodeIndex++){
      const node = skill.levels[nodeIndex];
      for(let rankIndex = 0; rankIndex < Number(ranks[nodeIndex] || 0); rankIndex++){
        const step = Array.isArray(node.ranks) ? node.ranks[rankIndex] : node;
        spent += Math.max(0, Number(step?.skillPoints || 0));
      }
    }
  }
  return spent;
}

function syncSkillPoints(profile){
  profile.player = normalizeProgressionPlayer(profile.player || {}, getProgressionLevelCap(profile.prestigeCount));
  profile.player.skillPoints = Math.max(0, Math.floor(Number(profile.player.level || 1)) - getSpentSkillPoints(profile));
}

function hasSkillResources(profile, cost){
  if(Number(profile.player.credits || 0) < cost.credits) return false;
  if(Number(profile.player.premium || 0) < getNovaDiscountedPrice(cost.premium, profile.player)) return false;
  return Object.entries(cost.materials).every(([id, amount])=>Number(profile.cargoHold?.[id] || 0) >= amount);
}

function spendSkillResources(profile, cost){
  profile.player.credits = Math.max(0, Number(profile.player.credits || 0) - cost.credits);
  profile.player.premium = Math.max(0, Number(profile.player.premium || 0) - getNovaDiscountedPrice(cost.premium, profile.player));
  for(const [id, amount] of Object.entries(cost.materials)){
    profile.cargoHold[id] = Math.max(0, Number(profile.cargoHold[id] || 0) - amount);
  }
}

function updateSkillLevel(profile, skill, ranks){
  profile.skillLevels[skill.id] = ranks.reduce((sum, rank, index)=>sum + (rank >= getNodeMaxRank(skill.levels[index]) ? 1 : 0), 0);
}

export function upgradeServerSkill(profile, id){
  ensureSkillState(profile);
  syncSkillPoints(profile);
  const skill = getSkillDefinition(String(id || ""));
  if(!skill) return {ok:false, reason:"Competence introuvable."};
  const progress = getSkillProgress(profile, skill.id);
  if(!progress || progress.completedNodes >= Number(skill.maxLevel || skill.levels.length || 0)){
    return {ok:false, reason:"Branche terminee."};
  }
  const node = skill.levels?.[progress.nodeIndex];
  const step = Array.isArray(node?.ranks) ? node.ranks[progress.rank] : node;
  if(!step) return {ok:false, reason:"Rang introuvable."};
  const lockReason = getSkillNodeLockReason(profile, progress.nodeIndex);
  if(lockReason) return {ok:false, reason:lockReason};
  const skillPoints = Math.max(0, Number(step.skillPoints || 0));
  if(Number(profile.player.skillPoints || 0) < skillPoints) return {ok:false, reason:"Pas assez de points de competence."};
  const cost = getSkillCostEntries(step);
  if(!hasSkillResources(profile, cost)) return {ok:false, reason:"Ressources insuffisantes."};
  spendSkillResources(profile, cost);
  const ranks = progress.ranks;
  ranks[progress.nodeIndex] = Math.min(getNodeMaxRank(node), Number(ranks[progress.nodeIndex] || 0) + 1);
  profile.skillRanks[skill.id] = ranks;
  updateSkillLevel(profile, skill, ranks);
  syncSkillPoints(profile);
  return {ok:true, skill:{id:skill.id, name:skill.name}, level:profile.skillLevels[skill.id], nodeIndex:progress.nodeIndex, rank:ranks[progress.nodeIndex]};
}

export function unlockServerPortal(profile, {id, method = "pieces"} = {}){
  if(!profile.player || typeof profile.player !== "object") profile.player = {};
  profile.player = normalizeProgressionPlayer(profile.player, getProgressionLevelCap(profile.prestigeCount));
  if(!Array.isArray(profile.unlockedPortals)) profile.unlockedPortals = [];
  if(!profile.portalPieces || typeof profile.portalPieces !== "object" || Array.isArray(profile.portalPieces)) profile.portalPieces = {};
  const portal = getServerPortalDefinition(id);
  if(!portal) return {ok:false, reason:"Portail introuvable."};
  if(Number(profile.player.level || 1) < Number(portal.requirement?.level || 1)){
    return {ok:false, reason:`Niveau ${portal.requirement.level} requis.`};
  }
  if(profile.unlockedPortals.includes(portal.id)) return {ok:false, reason:"Portail deja deverrouille."};
  const pieceUnit = portal.pieceUnit || "pièces";
  if(method === "nova") return {ok:false, reason:`Ce portail se déverrouille uniquement avec des ${pieceUnit}.`};
  const required = Math.max(0, Number(portal.piecesRequired || 0));
  if(Number(profile.portalPieces[portal.id] || 0) < required) return {ok:false, reason:`Il faut ${required} ${pieceUnit}.`};
  profile.portalPieces[portal.id] = Math.max(0, Number(profile.portalPieces[portal.id] || 0) - required);
  profile.unlockedPortals.push(portal.id);
  return {ok:true, portal:{id:portal.id, name:portal.name}, method:"pieces"};
}

export function performServerPrestige(profile){
  ensureSkillState(profile);
  if(Math.max(0, Number(profile.prestigeCount || 0)) >= 1){
    return {ok:false, reason:"Ascension deja accomplie."};
  }
  const levelOk = Number(profile.player.level || 1) >= 50;
  const missingPortalIds = getMissingProgressionPortalIds(profile);
  if(missingPortalIds.length){
    const missingNames = missingPortalIds.map(portalId=>PROGRESSION_PORTAL_NAMES[portalId] || portalId);
    return {ok:false, reason:`Les 9 portails de progression doivent être terminés. Manquants : ${missingNames.join(", ")}.`};
  }
  if(!levelOk) return {ok:false, reason:"Niveau 50 requis."};
  profile.prestigeCount = 1;
  profile.player.level = 1;
  profile.player.xp = 0;
  profile.player.xpNext = getXpNextForLevel(1);
  syncSkillPoints(profile);
  return {ok:true, prestige:profile.prestigeCount};
}
