import { skills } from "../data/catalog.js";
import { XP_CURVE_VERSION, getXpNextForLevel } from "../data/xpCurve.js";
import { store } from "./store.js";

export { XP_CURVE_VERSION, getXpNextForLevel };

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
