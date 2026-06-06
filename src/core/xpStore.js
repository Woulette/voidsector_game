import { skills } from "../data/catalog.js";
import { store } from "./store.js";

export const XP_CURVE_VERSION = 4;

const XP_FIXED_NEXT_BY_LEVEL = {
  1:3000,
  2:12000,
  3:35000,
  4:51000,
  5:80000,
  6:113000,
  7:169000,
  8:220000,
  9:314000,
  10:580000,
  11:984000,
  12:1432000,
  13:1899000
};
const XP_FIXED_LAST_LEVEL = 13;
const XP_TARGET_LEVEL = 49;
const XP_TARGET_NEXT = 2000000000;
const XP_GROWTH_AFTER_FIXED = Math.pow(XP_TARGET_NEXT / XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL], 1 / (XP_TARGET_LEVEL - XP_FIXED_LAST_LEVEL));

export function getSpentSkillPoints(state = store.state){
  return skills.reduce((total, skill)=>{
    const ranks = Array.isArray(state?.skillRanks?.[skill.id]) ? state.skillRanks[skill.id] : [];
    return total + skill.levels.reduce((sum, node, nodeIndex)=>{
      const nodeRanks = Array.isArray(node.ranks) ? node.ranks : [node];
      const rank = Math.max(0, Math.min(nodeRanks.length, Number(ranks[nodeIndex] || 0)));
      return sum + nodeRanks.slice(0, rank).reduce((rankSum, step)=>rankSum + Number(step.skillPoints || 0), 0);
    }, 0);
  }, 0);
}

export function syncSkillPoints(state = store.state){
  const earned = Math.max(0, Math.floor(Number(state?.player?.level || 0)));
  const spent = getSpentSkillPoints(state);
  state.player.skillPoints = Math.max(0, earned - spent);
  return state.player.skillPoints;
}

export function getXpNextForLevel(level = 1){
  const targetLevel = Math.max(1, Math.floor(Number(level || 1)));
  if(XP_FIXED_NEXT_BY_LEVEL[targetLevel]) return XP_FIXED_NEXT_BY_LEVEL[targetLevel];
  return Math.round(XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL] * Math.pow(XP_GROWTH_AFTER_FIXED, targetLevel - XP_FIXED_LAST_LEVEL));
}
