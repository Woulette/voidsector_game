import {
  FIRM_PVP_FULL_POINTS,
  FIRM_PVP_FULL_REWARD_LIMIT,
  FIRM_PVP_REDUCED_POINTS
} from "./firmRules.js";
import { addFirmContribution } from "./firmSeason.js";

function utcDayKey(now){
  return new Date(Number(now || Date.now())).toISOString().slice(0, 10);
}

export function addFirmPvpKill(state, {attacker, targetKey, now = Date.now()} = {}){
  const dayKey = utcDayKey(now);
  if(state.pvpDaily?.dayKey !== dayKey) state.pvpDaily = {dayKey, kills:{}};
  if(!state.pvpDaily.kills || typeof state.pvpDaily.kills !== "object") state.pvpDaily.kills = {};
  const pairKey = `${String(attacker?.key || "unknown")}::${String(targetKey || "unknown")}`;
  const count = Math.max(0, Math.floor(Number(state.pvpDaily.kills[pairKey] || 0))) + 1;
  state.pvpDaily.kills[pairKey] = count;
  const points = count <= FIRM_PVP_FULL_REWARD_LIMIT ? FIRM_PVP_FULL_POINTS : FIRM_PVP_REDUCED_POINTS;
  addFirmContribution(state, attacker, points);
  return {points, count, reduced:points === FIRM_PVP_REDUCED_POINTS};
}
