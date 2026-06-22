import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFirmId } from "../../../src/data/firms.js";
import { dbEnabled, query } from "../db/client.js";
import { addFirmPvpKill } from "./firmPvp.js";
import { buildFirmSeasonObjectiveSnapshot, claimFirmSeasonObjectiveReward, recordFirmSeasonObjectiveProgress } from "./firmObjectives.js";
import {
  acceptFirmDailyQuest,
  buildFirmQuestSnapshot,
  buildFirmSeasonalQuestSnapshot,
  claimFirmQuestReward,
  ensureFirmDailyQuests,
  ensureFirmSeasonalQuests,
  recordFirmQuestProgress
} from "./firmQuests.js";
import {
  FIRM_COLLECTIVE_MIN_CONTRIBUTION,
  FIRM_REWARD_MS,
  FIRM_SEASON_MS,
  FIRM_SHOP_CATALOG,
  getFirmShopPrice,
  getFirmIndividualReward
} from "./firmRules.js";
import {
  addFirmContribution,
  buildFirmPublicRanking,
  buildIndividualPublicRanking,
  closeFirmSeason,
  sortIndividualRanking
} from "./firmSeason.js";
import { buildInitialFirmState, sanitizeFirmState } from "./firmState.js";
import {
  buildCombinedBoosterSnapshot,
  getActiveFirmBoosterValues,
  getActivePlayerBoosterValues,
  mergeBoosterValues
} from "../../../src/shared/firmBoosters.js";

export { FIRM_COLLECTIVE_MIN_CONTRIBUTION, FIRM_REWARD_MS, FIRM_SEASON_MS };

const DEFAULT_FILE = fileURLToPath(new URL("../../data/firmWar.json", import.meta.url));

function contributorFrom(value, fallbackFirmId = "astra"){
  if(value && typeof value === "object"){
    return {
      key:String(value.key || ""),
      name:String(value.name || "Pilote").trim().slice(0, 24) || "Pilote",
      firmId:normalizeFirmId(value.firmId || fallbackFirmId)
    };
  }
  return {key:"", name:"Pilote", firmId:normalizeFirmId(value || fallbackFirmId)};
}

function activeRewards(rewards = {}, now = Date.now()){
  return Object.fromEntries(Object.entries(rewards || {}).filter(([, reward])=>Number(reward?.endsAt || 0) > now));
}

function seasonRewardForPlayer(rewards = {}, playerKey = "", preferredFirmId = "astra"){
  const key = String(playerKey || "");
  if(!key) return {};
  const preferred = rewards[normalizeFirmId(preferredFirmId)] || null;
  if(preferred?.eligiblePlayers?.[key] === true) return preferred;
  return Object.values(rewards).find(reward=>reward?.eligiblePlayers?.[key] === true) || {};
}

export function createFirmWarManager({
  file = DEFAULT_FILE,
  logger = console,
  now = ()=>Date.now(),
  database = dbEnabled ? {query} : null
} = {}){
  let state = buildInitialFirmState(now());
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

  function ensureSeason(currentTime = now()){
    state = sanitizeFirmState(state, currentTime);
    state.rewards = activeRewards(state.rewards, currentTime);
    let changed = false;
    if(Number(state.seasonEndsAt || 0) <= currentTime){
      closeFirmSeason(state, currentTime);
      changed = true;
    }
    const beforeQuestCount = Object.keys(state.dailyQuests || {}).length + Object.keys(state.seasonalQuests || {}).length;
    ensureFirmDailyQuests(state, currentTime);
    ensureFirmSeasonalQuests(state, currentTime);
    if(Object.keys(state.dailyQuests || {}).length + Object.keys(state.seasonalQuests || {}).length !== beforeQuestCount) changed = true;
    if(changed) scheduleSave();
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
      state = sanitizeFirmState(parsed || buildInitialFirmState(now()), now());
    }catch(error){
      if(error?.code !== "ENOENT") logger?.warn?.("Firm war load failed", {error:error?.message || String(error)});
      state = buildInitialFirmState(now());
    }
    ensureSeason(now());
    await persist();
    return state;
  }

  function addFirmPoints(firmId, amount = 1, contributor = null){
    ensureSeason(now());
    const cleanContributor = contributorFrom(contributor || firmId, firmId);
    const value = Math.max(0, Math.floor(Number(amount || 0)));
    if(!value) return snapshot();
    if(cleanContributor.key) addFirmContribution(state, cleanContributor, value);
    else state.points[cleanContributor.firmId] = Math.max(0, Number(state.points[cleanContributor.firmId] || 0)) + value;
    scheduleSave();
    return snapshot();
  }

  function addMonsterKillPoints(contributors = [], {enemyKind = ""} = {}){
    ensureSeason(now());
    const values = Array.isArray(contributors) ? contributors : [contributors];
    let changed = false;
    for(const value of values){
      const contributor = contributorFrom(value);
      const awardFirmPoint = value?.awardFirmPoint !== false;
      if(awardFirmPoint){
        addFirmContribution(state, contributor, 1);
        changed = true;
      }
      const questUpdates = recordFirmQuestProgress(state, {contributor, type:"monster", target:enemyKind, amount:1, now:now()});
      const objectiveUpdates = recordFirmSeasonObjectiveProgress(state, {contributor, type:"monster", target:enemyKind, amount:1, now:now()});
      if(questUpdates.length || objectiveUpdates.length) changed = true;
    }
    if(changed) scheduleSave();
    return snapshot();
  }

  function addPlayerKillPoints(firmId){
    return addFirmPoints(firmId, 100);
  }

  function recordPlayerKill({attacker, targetKey} = {}){
    ensureSeason(now());
    const contributor = contributorFrom(attacker);
    const result = addFirmPvpKill(state, {attacker:contributor, targetKey, now:now()});
    recordFirmQuestProgress(state, {contributor, type:"pvp", target:"player", amount:1, now:now()});
    recordFirmSeasonObjectiveProgress(state, {contributor, type:"pvp", target:"player", amount:1, now:now()});
    scheduleSave();
    return {...result, snapshot:snapshot()};
  }

  function recordPortalCompletion(contributors = []){
    ensureSeason(now());
    const values = Array.isArray(contributors) ? contributors : [contributors];
    const updates = [];
    const objectiveUpdates = [];
    for(const value of values){
      const contributor = contributorFrom(value);
      updates.push(...recordFirmQuestProgress(state, {contributor, type:"portal", target:"portal", amount:1, now:now()}));
      objectiveUpdates.push(...recordFirmSeasonObjectiveProgress(state, {contributor, type:"portal", target:"portal", amount:1, now:now()}));
    }
    if(updates.length || objectiveUpdates.length) scheduleSave();
    return {updates, objectiveUpdates, snapshot:snapshot()};
  }

  function acceptDailyQuest({questId, contributor} = {}){
    ensureSeason(now());
    const result = acceptFirmDailyQuest(state, {questId, contributor:contributorFrom(contributor), now:now()});
    if(result.ok) scheduleSave();
    return result;
  }

  function claimQuestReward({questId, contributor} = {}){
    ensureSeason(now());
    const result = claimFirmQuestReward(state, {questId, contributor:contributorFrom(contributor), now:now()});
    if(result.ok) scheduleSave();
    return result;
  }

  function claimSeasonObjectiveReward({objectiveId, contributor, claimedRewardIds = []} = {}){
    ensureSeason(now());
    const result = claimFirmSeasonObjectiveReward(state, {
      objectiveId,
      contributor:contributorFrom(contributor),
      claimedRewardIds,
      now:now()
    });
    if(result.ok) scheduleSave();
    return result;
  }

  function getActiveBoosters(firmId, profile = null, player = null, playerKey = ""){
    ensureSeason(now());
    const currentTime = now();
    const connectedElapsedMs = player?.clientMode === "game" && player?.connected !== false
      ? Math.max(0, currentTime - Number(player?.lastPlaytimeAccountedAt || currentTime))
      : 0;
    return mergeBoosterValues(
      getActivePlayerBoosterValues(profile?.boosters, currentTime, connectedElapsedMs),
      getActiveFirmBoosterValues(seasonRewardForPlayer(state.rewards, playerKey, firmId), currentTime)
    );
  }

  function getPendingRewards(playerKey){
    ensureSeason(now());
    return JSON.parse(JSON.stringify(state.pendingRewards[String(playerKey || "")] || []));
  }

  function consumePendingRewards(playerKey){
    ensureSeason(now());
    const key = String(playerKey || "");
    const entries = getPendingRewards(key);
    if(entries.length){
      delete state.pendingRewards[key];
      scheduleSave();
    }
    return entries;
  }

  function snapshot({playerKey = "", profile = null, player = null, includeShop = false} = {}){
    const currentTime = now();
    ensureSeason(currentTime);
    const individualRanking = sortIndividualRanking(state.contributions);
    const own = state.contributions[String(playerKey || "")] || null;
    const ownRank = own ? individualRanking.findIndex(entry=>entry.key === own.key) + 1 : 0;
    const ownReward = ownRank > 0 ? getFirmIndividualReward(ownRank, individualRanking.length) : null;
    const personalFirmId = normalizeFirmId(profile?.player?.firmId || own?.firmId || "astra");
    const hasPersonalContext = Boolean(String(playerKey || ""));
    const personalBoosterReward = seasonRewardForPlayer(state.rewards, playerKey, personalFirmId);
    return {
      generatedAt:currentTime,
      seasonStartedAt:state.seasonStartedAt,
      seasonEndsAt:state.seasonEndsAt,
      rewardEndsAt:Math.max(0, ...Object.values(state.rewards || {}).map(reward=>Number(reward.endsAt || 0))),
      collectiveMinimumContribution:FIRM_COLLECTIVE_MIN_CONTRIBUTION,
      firms:buildFirmPublicRanking(state, currentTime),
      individualRanking:buildIndividualPublicRanking(state),
      individualPlayerCount:individualRanking.length,
      dailyQuests:buildFirmQuestSnapshot(state, playerKey, profile?.player?.firmId || own?.firmId || "astra", currentTime),
      seasonalQuests:buildFirmSeasonalQuestSnapshot(state, playerKey, profile?.player?.firmId || own?.firmId || "astra", currentTime),
      seasonObjectives:buildFirmSeasonObjectiveSnapshot(
        state,
        playerKey,
        profile?.player?.firmId || own?.firmId || "astra",
        (profile?.firmRewardHistory || []).map(entry=>entry?.id)
      ),
      ...(hasPersonalContext ? {personal:{
        key:String(playerKey || ""),
        firmId:personalFirmId,
        contribution:Math.max(0, Number(own?.points || 0)),
        rank:ownRank || null,
        rewardLabel:ownReward?.label || "Non classé",
        expectedReward:ownReward?.reward || null,
        collectiveEligible:Math.max(0, Number(own?.points || 0)) >= FIRM_COLLECTIVE_MIN_CONTRIBUTION,
        pendingRewards:getPendingRewards(playerKey),
        boosters:buildCombinedBoosterSnapshot({
          playerBoosters:profile?.boosters,
          seasonReward:personalBoosterReward,
          now:currentTime,
          connectedElapsedMs:player?.clientMode === "game" && player?.connected !== false
            ? Math.max(0, currentTime - Number(player?.lastPlaytimeAccountedAt || currentTime))
            : 0
        }),
        ...(includeShop ? {
          firmatons:Math.max(0, Number(profile?.firmatons || 0)),
          boxes:JSON.parse(JSON.stringify(profile?.firmBoxes || {})),
          rewardHistory:JSON.parse(JSON.stringify(profile?.firmRewardHistory || [])).slice(-20).reverse(),
          reputation:Math.max(0, Number(profile?.player?.reputation || 0))
        } : {})
      }} : {}),
      ...(includeShop ? {shop:FIRM_SHOP_CATALOG.map(item=>{
        const reputation = Math.max(0, Number(profile?.player?.reputation || 0));
        return {
          ...item,
          basePrice:item.price,
          price:getFirmShopPrice(item, reputation),
          locked:reputation < item.reputationRequired
        };
      })} : {}),
      lastClosedSeason:state.lastClosedSeason
    };
  }

  return {
    addFirmPoints,
    addMonsterKillPoints,
    addPlayerKillPoints,
    acceptDailyQuest,
    claimQuestReward,
    claimSeasonObjectiveReward,
    consumePendingRewards,
    getPendingRewards,
    getActiveBoosters,
    load,
    recordPlayerKill,
    recordPortalCompletion,
    snapshot
  };
}
