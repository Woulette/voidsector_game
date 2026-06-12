import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRMS, getFirmDefinition, normalizeFirmId } from "../../../src/data/firms.js";
import { dbEnabled, query } from "../db/client.js";

export const FIRM_SEASON_MS = 14 * 24 * 60 * 60 * 1000;
export const FIRM_REWARD_MS = 7 * 24 * 60 * 60 * 1000;
export const FIRM_RANK_BONUSES = [0.25, 0.15, 0.10, 0.05];

const DEFAULT_FILE = fileURLToPath(new URL("../../data/firmWar.json", import.meta.url));

function emptyPoints(){
  return Object.fromEntries(FIRMS.map(firm=>[firm.id, 0]));
}

function sanitizePoints(points = {}){
  const next = emptyPoints();
  for(const firm of FIRMS) next[firm.id] = Math.max(0, Math.floor(Number(points[firm.id] || 0)));
  return next;
}

function sortRanking(points){
  return FIRMS
    .map(firm=>({firm, points:Math.max(0, Math.floor(Number(points?.[firm.id] || 0)))}))
    .sort((a, b)=>b.points - a.points || a.firm.label.localeCompare(b.firm.label, "fr"));
}

function sanitizeRewards(rewards = {}, now = Date.now()){
  const next = {};
  for(const firm of FIRMS){
    const reward = rewards[firm.id] || {};
    const endsAt = Number(reward.endsAt || 0);
    if(endsAt > now){
      next[firm.id] = {
        rank:Math.max(1, Math.floor(Number(reward.rank || 4))),
        multiplier:Math.max(0, Number(reward.multiplier || 0)),
        endsAt
      };
    }
  }
  return next;
}

function buildInitialState(now = Date.now()){
  return {
    seasonStartedAt:now,
    seasonEndsAt:now + FIRM_SEASON_MS,
    points:emptyPoints(),
    rewards:{},
    lastClosedSeason:null
  };
}

export function createFirmWarManager({
  file = DEFAULT_FILE,
  logger = console,
  now = ()=>Date.now(),
  database = dbEnabled ? {query} : null
} = {}){
  let state = buildInitialState(now());
  let savePending = false;
  let loaded = false;

  async function persist(){
    try{
      if(database){
        await database.query(`
          INSERT INTO firm_war_state (id, state_json, updated_at)
          VALUES ('global', $1::jsonb, $2)
          ON CONFLICT (id) DO UPDATE SET
            state_json = EXCLUDED.state_json,
            updated_at = EXCLUDED.updated_at
        `, [JSON.stringify(state), Number(now())]);
        return;
      }
      await mkdir(dirname(file), {recursive:true});
      await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    }catch(error){
      logger?.warn?.("Firm war save failed", {error:error?.message || String(error)});
    }
  }

  function scheduleSave(){
    if(savePending) return;
    savePending = true;
    setTimeout(async ()=>{
      savePending = false;
      await persist();
    }, 50).unref?.();
  }

  function closeSeason(currentTime = now()){
    const ranking = sortRanking(state.points);
    const rewards = {};
    ranking.forEach((entry, index)=>{
      rewards[entry.firm.id] = {
        rank:index + 1,
        multiplier:FIRM_RANK_BONUSES[index] || 0,
        endsAt:currentTime + FIRM_REWARD_MS
      };
    });
    state.lastClosedSeason = {
      closedAt:currentTime,
      ranking:ranking.map((entry, index)=>({
        firmId:entry.firm.id,
        rank:index + 1,
        points:entry.points,
        rewardMultiplier:rewards[entry.firm.id]?.multiplier || 0
      }))
    };
    state.rewards = rewards;
    state.seasonStartedAt = currentTime;
    state.seasonEndsAt = currentTime + FIRM_SEASON_MS;
    state.points = emptyPoints();
  }

  function ensureSeason(currentTime = now()){
    state.points = sanitizePoints(state.points);
    state.rewards = sanitizeRewards(state.rewards, currentTime);
    if(!Number.isFinite(Number(state.seasonStartedAt))) state.seasonStartedAt = currentTime;
    if(!Number.isFinite(Number(state.seasonEndsAt)) || Number(state.seasonEndsAt) <= currentTime){
      closeSeason(currentTime);
      scheduleSave();
    }
    return state;
  }

  async function load(){
    if(loaded) return state;
    loaded = true;
    try{
      let parsed;
      if(database){
        const result = await database.query("SELECT state_json FROM firm_war_state WHERE id = 'global'");
        parsed = result.rows[0]?.state_json;
        if(!parsed){
          try{
            parsed = JSON.parse(await readFile(file, "utf8"));
          }catch(error){
            if(error?.code !== "ENOENT") throw error;
          }
        }
      }else{
        parsed = JSON.parse(await readFile(file, "utf8"));
      }
      parsed ||= buildInitialState(now());
      state = {
        ...buildInitialState(now()),
        ...parsed,
        points:sanitizePoints(parsed.points),
        rewards:sanitizeRewards(parsed.rewards, now())
      };
    }catch(error){
      if(error?.code !== "ENOENT") logger?.warn?.("Firm war load failed", {error:error?.message || String(error)});
      state = buildInitialState(now());
    }
    ensureSeason(now());
    await persist();
    return state;
  }

  function addFirmPoints(firmId, amount = 1){
    ensureSeason(now());
    const id = normalizeFirmId(firmId);
    const value = Math.max(0, Math.floor(Number(amount || 0)));
    if(!value) return snapshot();
    state.points[id] = Math.max(0, Math.floor(Number(state.points[id] || 0))) + value;
    scheduleSave();
    return snapshot();
  }

  function addMonsterKillPoints(firmIds = []){
    ensureSeason(now());
    let changed = false;
    for(const firmId of Array.isArray(firmIds) ? firmIds : [firmIds]){
      const id = normalizeFirmId(firmId);
      state.points[id] = Math.max(0, Math.floor(Number(state.points[id] || 0))) + 1;
      changed = true;
    }
    if(changed) scheduleSave();
    return snapshot();
  }

  function addPlayerKillPoints(firmId){
    return addFirmPoints(firmId, 100);
  }

  function getRewardMultiplier(firmId){
    ensureSeason(now());
    return Math.max(0, Number(state.rewards[normalizeFirmId(firmId)]?.multiplier || 0));
  }

  function snapshot(){
    const currentTime = now();
    ensureSeason(currentTime);
    const rewardRanks = state.rewards || {};
    return {
      generatedAt:currentTime,
      seasonStartedAt:state.seasonStartedAt,
      seasonEndsAt:state.seasonEndsAt,
      rewardEndsAt:Math.max(0, ...Object.values(rewardRanks).map(reward=>Number(reward.endsAt || 0))),
      firms:sortRanking(state.points).map((entry, index)=>{
        const reward = rewardRanks[entry.firm.id] || {};
        return {
          id:entry.firm.id,
          label:getFirmDefinition(entry.firm.id).label,
          color:entry.firm.color,
          homeMapName:entry.firm.homeMapName,
          rank:index + 1,
          points:entry.points,
          rewardRank:reward.rank || null,
          rewardMultiplier:Number(reward.multiplier || 0),
          rewardEndsAt:Number(reward.endsAt || 0)
        };
      }),
      lastClosedSeason:state.lastClosedSeason
    };
  }

  return {
    addFirmPoints,
    addMonsterKillPoints,
    addPlayerKillPoints,
    getRewardMultiplier,
    load,
    snapshot
  };
}
