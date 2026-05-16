import { skills } from "../data/catalog.js";
import { canAfford, spend, store } from "./store.js";

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
  if(!skill) return {ok:false, reason:"Competence introuvable."};
  const level = getSkillLevel(id);
  if(level >= Number(skill.maxLevel || skill.levels.length || 0)) return {ok:false, reason:"Niveau maximum atteint."};
  const next = getSkillUpgradeData(id);
  if(!next) return {ok:false, reason:"Palier introuvable."};
  if(Number(store.state.player.skillPoints || 0) < Number(next.skillPoints || 0)) return {ok:false, reason:"Pas assez de points de competence."};
  if(!canAfford(next.priceType, next.price)) return {ok:false, reason: next.priceType === "premium" ? "Pas assez de NOVA." : "Pas assez de credits."};
  store.state.player.skillPoints -= Number(next.skillPoints || 0);
  spend(next.priceType, next.price);
  if(!store.state.skillLevels || typeof store.state.skillLevels !== "object") store.state.skillLevels = {};
  store.state.skillLevels[id] = level + 1;
  return {ok:true, level:level + 1, step:next, skill};
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

