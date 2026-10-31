import {
  FIRM_PVP_FULL_POINTS,
  FIRM_PVP_FULL_REWARD_LIMIT,
  FIRM_PVP_DAILY_REWARD_LIMIT,
  FIRM_PVP_REDUCED_POINTS
} from "./firmRules.js";
import { addFirmContribution } from "./firmSeason.js";

function utcDayKey(now){
  return new Date(Number(now || Date.now())).toISOString().slice(0, 10);
}

export function recordPvpRewardAttempt(state, {playerKey, targetKey, now = Date.now()} = {}){
  const dayKey = utcDayKey(now);
  if(state.pvpDaily?.dayKey !== dayKey) state.pvpDaily = {dayKey, kills:{}};
  if(!state.pvpDaily.kills || typeof state.pvpDaily.kills !== "object") state.pvpDaily.kills = {};
  const pairKey = `${String(playerKey || "unknown")}::${String(targetKey || "unknown")}`;
  const count = Math.max(0, Math.floor(Number(state.pvpDaily.kills[pairKey] || 0))) + 1;
  state.pvpDaily.kills[pairKey] = count;
  const points = count <= FIRM_PVP_FULL_REWARD_LIMIT ? FIRM_PVP_FULL_POINTS
    : count <= FIRM_PVP_DAILY_REWARD_LIMIT ? FIRM_PVP_REDUCED_POINTS : 0;
  return {points, count, reduced:points === FIRM_PVP_REDUCED_POINTS, exhausted:points === 0, reputationMultiplier:points / FIRM_PVP_FULL_POINTS};
}

export function addFirmPvpKill(state, {attacker, targetKey, now = Date.now()} = {}){
  const result = recordPvpRewardAttempt(state, {playerKey:attacker?.key, targetKey, now});
  if(result.points > 0) addFirmContribution(state, attacker, result.points);
  return result;
}
