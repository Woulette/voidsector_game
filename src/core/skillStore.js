import { skills } from "../data/catalog.js";
import { canAfford, spend, store, syncSkillPoints } from "./store.js";

const MATERIAL_LABELS = {
  alliage_cuivre_zinc:"Alliage",
  plaque_nickel_titane:"Plaque",
  catalyseur_quantique:"Catalyseur",
  conducteur_renforce:"Conducteur",
  blindage_composite:"Blindage",
  noyau_astra:"Noyau"
};

const SKILL_PORTAL_REQUIREMENTS = [
  {portalId:"blue", label:"Portail Bleu"},
  {portalId:"violet", label:"Portail Violet"},
  {portalId:"red", label:"Portail Rouge"},
  {portalId:"emerald", label:"Portail Émeraude"},
  {portalId:"void", label:"Portail du Néant"}
];

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

export function skillCostLabel(step){
  const cost = getSkillCostEntries(step);
  const parts = [];
  if(cost.credits > 0) parts.push(`${cost.credits.toLocaleString("fr-FR")} CR`);
  if(cost.premium > 0) parts.push(`${cost.premium.toLocaleString("fr-FR")} NOVA`);
  for(const [id, amount] of Object.entries(cost.materials)){
    if(amount > 0) parts.push(`${amount.toLocaleString("fr-FR")} ${MATERIAL_LABELS[id] || id}`);
  }
  return parts.length ? parts.join(" + ") : "0 CR";
}

export function canAffordSkillCost(step){
  const cost = getSkillCostEntries(step);
  if(cost.credits > 0 && Number(store.state.player.credits || 0) < cost.credits) return false;
  if(cost.premium > 0 && Number(store.state.player.premium || 0) < cost.premium) return false;
  return Object.entries(cost.materials).every(([id, amount])=>Number(store.state.cargoHold?.[id] || 0) >= amount);
}

function spendSkillCost(step){
  const cost = getSkillCostEntries(step);
  if(cost.credits > 0) spend("credits", cost.credits);
  if(cost.premium > 0) spend("premium", cost.premium);
  for(const [id, amount] of Object.entries(cost.materials)){
    if(!store.state.cargoHold) store.state.cargoHold = {};
    store.state.cargoHold[id] = Math.max(0, Number(store.state.cargoHold[id] || 0) - amount);
  }
}

export function getSkillDefinition(id){
  return skills.find(skill=>skill.id === id) || null;
}

export function getSkillLevel(id){
  const skill = getSkillDefinition(id);
  if(!skill) return 0;
  const ranks = getSkillRanks(id);
  return skill.levels.reduce((completed, node, index)=>completed + (ranks[index] >= getNodeMaxRank(node) ? 1 : 0), 0);
}

export function getNodeMaxRank(node){
  return Array.isArray(node?.ranks) ? node.ranks.length : 1;
}

export function getSkillRanks(id){
  const skill = getSkillDefinition(id);
  const saved = Array.isArray(store.state?.skillRanks?.[id]) ? store.state.skillRanks[id] : [];
  return Array.from({length:skill?.levels?.length || 0}, (_,index)=>{
    const maxRank = getNodeMaxRank(skill.levels[index]);
    return Math.max(0, Math.min(maxRank, Number(saved[index] || 0)));
  });
}

export function getSkillProgress(id){
  const skill = getSkillDefinition(id);
  if(!skill) return {nodeIndex:0, rank:0, maxRank:0, completedNodes:0, maxNodes:0, totalRanks:0, completedRanks:0};
  const ranks = getSkillRanks(id);
  const nodeIndex = ranks.findIndex((rank, index)=>rank < getNodeMaxRank(skill.levels[index]));
  const activeIndex = nodeIndex >= 0 ? nodeIndex : skill.levels.length - 1;
  const completedNodes = ranks.reduce((sum, rank, index)=>sum + (rank >= getNodeMaxRank(skill.levels[index]) ? 1 : 0), 0);
  const totalRanks = skill.levels.reduce((sum, node)=>sum + getNodeMaxRank(node), 0);
  const completedRanks = ranks.reduce((sum, rank)=>sum + rank, 0);
  return {
    nodeIndex:activeIndex,
    rank:ranks[activeIndex] || 0,
    maxRank:getNodeMaxRank(skill.levels[activeIndex]),
    completedNodes,
    maxNodes:skill.levels.length,
    totalRanks,
    completedRanks,
    ranks
  };
}

export function isSkillNodeUnlocked(nodeIndex){
  return !getSkillNodeLockReason(nodeIndex);
}

export function getSkillNodePortalRequirement(nodeIndex){
  const index = Math.max(0, Number(nodeIndex || 0));
  return SKILL_PORTAL_REQUIREMENTS[index] || null;
}

export function hasCompletedSkillNodePortal(nodeIndex){
  const requirement = getSkillNodePortalRequirement(nodeIndex);
  if(!requirement) return true;
  return Math.max(0, Number(store.state?.completedPortals?.[requirement.portalId] || 0)) > 0;
}

function hasCompletedPreviousSkillNode(nodeIndex){
  const index = Math.max(0, Number(nodeIndex || 0));
  if(index <= 0) return true;
  return skills.every(skill=>{
    const previousNode = skill.levels?.[index - 1];
    if(!previousNode) return true;
    const ranks = getSkillRanks(skill.id);
    return Number(ranks[index - 1] || 0) >= getNodeMaxRank(previousNode);
  });
}

export function getSkillNodeLockReason(nodeIndex){
  const requirement = getSkillNodePortalRequirement(nodeIndex);
  if(requirement && !hasCompletedSkillNodePortal(nodeIndex)) return `Pré requis : ${requirement.label}`;
  if(!hasCompletedPreviousSkillNode(nodeIndex)) return "Pré requis : rangs précédents 3/3";
  return "";
}

export function getSkillUpgradeData(id){
  const skill = getSkillDefinition(id);
  if(!skill) return null;
  const progress = getSkillProgress(id);
  const node = skill.levels?.[progress.nodeIndex];
  if(!node || progress.completedNodes >= skill.levels.length) return null;
  const rank = Array.isArray(node.ranks) ? node.ranks[progress.rank] : node;
  return rank ? {...rank, node, nodeIndex:progress.nodeIndex, rankIndex:progress.rank} : null;
}

export function upgradeSkill(id){
  const skill = getSkillDefinition(id);
  if(!skill) return {ok:false, reason:"Competence introuvable."};
  const progress = getSkillProgress(id);
  if(progress.completedNodes >= Number(skill.maxLevel || skill.levels.length || 0)) return {ok:false, reason:"Branche terminee."};
  const next = getSkillUpgradeData(id);
  if(!next) return {ok:false, reason:"Rang introuvable."};
  const lockReason = getSkillNodeLockReason(next.nodeIndex);
  if(lockReason) return {ok:false, reason:lockReason};
  if(Number(store.state.player.skillPoints || 0) < Number(next.skillPoints || 0)) return {ok:false, reason:"Pas assez de points de competence."};
  if(!canAffordSkillCost(next)) return {ok:false, reason:"Ressources insuffisantes."};
  store.state.player.skillPoints -= Number(next.skillPoints || 0);
  spendSkillCost(next);
  if(!store.state.skillRanks || typeof store.state.skillRanks !== "object") store.state.skillRanks = {};
  const ranks = getSkillRanks(id);
  ranks[next.nodeIndex] = Math.min(getNodeMaxRank(next.node), ranks[next.nodeIndex] + 1);
  store.state.skillRanks[id] = ranks;
  if(!store.state.skillLevels || typeof store.state.skillLevels !== "object") store.state.skillLevels = {};
  store.state.skillLevels[id] = ranks.reduce((sum, rank, index)=>sum + (rank >= getNodeMaxRank(skill.levels[index]) ? 1 : 0), 0);
  syncSkillPoints();
  return {ok:true, level:getSkillLevel(id), step:next, skill, nodeIndex:next.nodeIndex, rank:ranks[next.nodeIndex]};
}

export function getSkillBonus(){
  const bonus = {};
  for(const skill of skills){
    const ranks = getSkillRanks(skill.id);
    for(let i=0;i<skill.levels.length;i++){
      const rank = ranks[i] || 0;
      if(rank <= 0) continue;
      const node = skill.levels[i];
      const activeRank = Array.isArray(node.ranks) ? node.ranks[Math.min(rank, node.ranks.length) - 1] : node;
      const stats = activeRank?.stats || {};
      for(const [k,v] of Object.entries(stats)){
        if(k.endsWith("Multiplier")) bonus[k] = (bonus[k] || 1) * Number(v || 1);
        else bonus[k] = (bonus[k] || 0) + Number(v || 0);
      }
    }
  }
  return bonus;
}

