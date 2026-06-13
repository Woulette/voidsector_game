import { FIRMS, normalizeFirmId } from "../../../src/data/firms.js";
import {
  FIRM_DAILY_QUEST_DEFINITIONS,
  FIRM_SEASONAL_QUEST_DEFINITIONS,
  firmTargetMatches,
  getFirmQuestFirmPoints
} from "./firmRules.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DEFAULT_CLAIM_FIRMATONS = 5;
const LOCKED_DAILY_QUEST_COUNT = 3;

function questStartAt(definition, dayOffset, now){
  const date = new Date(Number(now || Date.now()));
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Number(definition.startHourUtc || 0), 0, 0, 0);
  return date.getTime();
}

function weekStartAt(now){
  const date = new Date(Number(now || Date.now()));
  const dayFromMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayFromMonday);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function localDateKey(time){
  const date = new Date(Number(time || Date.now()));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyFirmQuestProgress(){
  return Object.fromEntries(FIRMS.map(firm=>[firm.id, {
    progress:0,
    completedAt:0,
    firmPointsAwarded:0,
    contributions:{},
    claimed:{}
  }]));
}

function normalizeQuestProgress(value = {}){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    progress:Math.max(0, Math.floor(Number(source.progress || 0))),
    completedAt:Math.max(0, Number(source.completedAt || 0)),
    firmPointsAwarded:Math.max(0, Math.floor(Number(source.firmPointsAwarded || 0))),
    contributions:source.contributions && typeof source.contributions === "object" && !Array.isArray(source.contributions) ? source.contributions : {},
    claimed:source.claimed && typeof source.claimed === "object" && !Array.isArray(source.claimed) ? source.claimed : {}
  };
}

function ensureQuestFirms(quest){
  if(!quest || typeof quest !== "object") return quest;
  if(!quest.firms || typeof quest.firms !== "object" || Array.isArray(quest.firms)) quest.firms = {};
  for(const firm of FIRMS) quest.firms[firm.id] = normalizeQuestProgress(quest.firms[firm.id]);
  quest.claimFirmatons = Math.max(0, Math.floor(Number(quest.claimFirmatons ?? DEFAULT_CLAIM_FIRMATONS)));
  quest.firmPoints = Math.max(0, Math.floor(Number(quest.firmPoints || 0)));
  quest.goal = Math.max(1, Math.floor(Number(quest.goal || 1)));
  return quest;
}

function buildQuest(definition, startedAt, {endsAt = startedAt + DAY_MS, kind = "daily"} = {}){
  return {
    id:kind === "daily"
      ? `daily-${definition.id}-${localDateKey(startedAt)}`
      : `weekly-${definition.id}-${localDateKey(startedAt)}`,
    kind,
    definitionId:definition.id,
    label:definition.label,
    type:definition.type,
    target:definition.target,
    targetLabel:definition.targetLabel,
    goal:definition.goal,
    firmPoints:definition.firmPoints,
    baseFirmatons:definition.baseFirmatons,
    claimFirmatons:Math.max(0, Math.floor(Number(definition.claimFirmatons ?? DEFAULT_CLAIM_FIRMATONS))),
    participantReward:definition.participantReward ? JSON.parse(JSON.stringify(definition.participantReward)) : null,
    startedAt,
    endsAt,
    firms:emptyFirmQuestProgress()
  };
}

function syncQuestTimingAndDefinition(existing, expected){
  if(!existing || !expected) return expected;
  existing.kind = expected.kind;
  existing.definitionId = expected.definitionId;
  existing.label = expected.label;
  existing.type = expected.type;
  existing.target = expected.target;
  existing.targetLabel = expected.targetLabel;
  existing.goal = expected.goal;
  existing.firmPoints = expected.firmPoints;
  existing.baseFirmatons = expected.baseFirmatons;
  existing.claimFirmatons = expected.claimFirmatons;
  existing.participantReward = expected.participantReward;
  existing.startedAt = expected.startedAt;
  existing.endsAt = expected.endsAt;
  return ensureQuestFirms(existing);
}

export function ensureFirmDailyQuests(state, now = Date.now()){
  if(!state.dailyQuests || typeof state.dailyQuests !== "object" || Array.isArray(state.dailyQuests)) state.dailyQuests = {};
  const expectedIds = new Set();
  for(const dayOffset of [-1, 0]){
    for(const definition of FIRM_DAILY_QUEST_DEFINITIONS){
      const startedAt = questStartAt(definition, dayOffset, now);
      if(startedAt > now || startedAt + DAY_MS <= now) continue;
      const quest = buildQuest(definition, startedAt, {kind:"daily"});
      expectedIds.add(quest.id);
      if(!state.dailyQuests[quest.id]) state.dailyQuests[quest.id] = quest;
      else syncQuestTimingAndDefinition(state.dailyQuests[quest.id], quest);
    }
  }
  for(const [id, quest] of Object.entries(state.dailyQuests)){
    if(!expectedIds.has(id) || Number(quest?.endsAt || 0) <= now) delete state.dailyQuests[id];
    else ensureQuestFirms(quest);
  }
  return state.dailyQuests;
}

export function ensureFirmSeasonalQuests(state, now = Date.now()){
  if(!state.seasonalQuests || typeof state.seasonalQuests !== "object" || Array.isArray(state.seasonalQuests)) state.seasonalQuests = {};
  const expectedIds = new Set();
  const startedAt = weekStartAt(now);
  for(const definition of FIRM_SEASONAL_QUEST_DEFINITIONS){
    const quest = buildQuest(definition, startedAt, {
      endsAt:startedAt + WEEK_MS,
      kind:"weekly"
    });
    expectedIds.add(quest.id);
    if(!state.seasonalQuests[quest.id]) state.seasonalQuests[quest.id] = quest;
    else syncQuestTimingAndDefinition(state.seasonalQuests[quest.id], quest);
    ensureQuestFirms(state.seasonalQuests[quest.id]);
  }
  for(const id of Object.keys(state.seasonalQuests)){
    if(!expectedIds.has(id)) delete state.seasonalQuests[id];
  }
  return state.seasonalQuests;
}

function allFirmQuests(state){
  return [
    ...Object.values(state.dailyQuests || {}),
    ...Object.values(state.seasonalQuests || {})
  ].map(ensureQuestFirms);
}

function activeDailyQuestList(state, now){
  return Object.values(state.dailyQuests || {})
    .map(ensureQuestFirms)
    .filter(quest=>Number(quest.startedAt || 0) <= now && Number(quest.endsAt || 0) > now)
    .sort((a, b)=>Number(a.startedAt || 0) - Number(b.startedAt || 0));
}

function lockedDailyQuestList(now, count = LOCKED_DAILY_QUEST_COUNT){
  const quests = [];
  for(let dayOffset = 0; dayOffset <= 3 && quests.length < count + FIRM_DAILY_QUEST_DEFINITIONS.length; dayOffset += 1){
    for(const definition of FIRM_DAILY_QUEST_DEFINITIONS){
      const startedAt = questStartAt(definition, dayOffset, now);
      if(startedAt <= now) continue;
      quests.push({
        ...buildQuest(definition, startedAt, {kind:"daily"}),
        locked:true,
        virtual:true
      });
    }
  }
  return quests
    .sort((a, b)=>Number(a.startedAt || 0) - Number(b.startedAt || 0))
    .slice(0, count)
    .map(ensureQuestFirms);
}

function sortQuestContributors(contributions = {}){
  return Object.values(contributions || {})
    .filter(entry=>entry && Number(entry.amount || 0) > 0)
    .sort((a, b)=>Number(b.amount || 0) - Number(a.amount || 0) || String(a.name || "").localeCompare(String(b.name || ""), "fr"))
    .map((entry, index)=>({...entry, rank:index + 1}));
}

function completeFirmQuest(state, quest, firmId, currentTime){
  ensureQuestFirms(quest);
  const firmProgress = quest.firms[firmId];
  if(firmProgress.completedAt) return null;
  firmProgress.completedAt = currentTime;
  firmProgress.progress = Math.max(quest.goal, Number(firmProgress.progress || 0));
  firmProgress.firmPointsAwarded = quest.kind === "weekly" || quest.kind === "seasonal"
    ? Math.max(0, Math.floor(Number(quest.firmPoints || 0)))
    : getFirmQuestFirmPoints(quest.firmPoints, currentTime - quest.startedAt);
  state.points[firmId] = Math.max(0, Number(state.points?.[firmId] || 0)) + firmProgress.firmPointsAwarded;
  const contributors = sortQuestContributors(firmProgress.contributions);
  return {questId:quest.id, firmId, firmPoints:firmProgress.firmPointsAwarded, contributors:contributors.length};
}

export function recordFirmQuestProgress(state, {contributor, type, target, amount = 1, now = Date.now()} = {}){
  ensureFirmDailyQuests(state, now);
  ensureFirmSeasonalQuests(state, now);
  const firmId = normalizeFirmId(contributor?.firmId || "astra");
  const value = Math.max(0, Math.floor(Number(amount || 0)));
  if(!value) return [];
  const updates = [];
  for(const quest of allFirmQuests(state)){
    if(now < Number(quest.startedAt || 0) || now >= Number(quest.endsAt || 0)) continue;
    if(quest.type !== type || !firmTargetMatches(quest.target, target)) continue;
    const progress = quest.firms?.[firmId];
    if(!progress || progress.completedAt) continue;
    const key = String(contributor?.key || "");
    progress.progress = Math.min(quest.goal, Math.max(0, Number(progress.progress || 0)) + value);
    if(key){
      const current = progress.contributions[key] || {};
      progress.contributions[key] = {
        key,
        name:String(contributor?.name || current.name || "Pilote").slice(0, 24),
        amount:Math.max(0, Number(current.amount || 0)) + value
      };
    }
    const completed = progress.progress >= quest.goal ? completeFirmQuest(state, quest, firmId, now) : null;
    updates.push({questId:quest.id, firmId, progress:progress.progress, goal:quest.goal, completed});
  }
  return updates;
}

export function acceptFirmDailyQuest(state, {questId, contributor, now = Date.now()} = {}){
  ensureFirmDailyQuests(state, now);
  ensureFirmSeasonalQuests(state, now);
  const cleanQuestId = String(questId || "");
  const quest = state.dailyQuests?.[cleanQuestId] || state.seasonalQuests?.[cleanQuestId];
  if(!quest || now < Number(quest.startedAt || 0) || now >= Number(quest.endsAt || 0)) return {ok:false, reason:"Quete de firme indisponible."};
  const firmId = normalizeFirmId(contributor?.firmId || "astra");
  const progress = quest.firms?.[firmId];
  const key = String(contributor?.key || "");
  if(!progress || !key) return {ok:false, reason:"Profil de firme introuvable."};
  return {ok:true, questId:quest.id, firmId};
}

export function claimFirmQuestReward(state, {questId, contributor, now = Date.now()} = {}){
  ensureFirmDailyQuests(state, now);
  ensureFirmSeasonalQuests(state, now);
  const cleanQuestId = String(questId || "");
  const quest = state.dailyQuests?.[cleanQuestId] || state.seasonalQuests?.[cleanQuestId];
  if(!quest || now < Number(quest.startedAt || 0) || now >= Number(quest.endsAt || 0)){
    return {ok:false, reason:"Quete de firme indisponible."};
  }
  ensureQuestFirms(quest);
  const firmId = normalizeFirmId(contributor?.firmId || "astra");
  const progress = quest.firms?.[firmId];
  const key = String(contributor?.key || "");
  if(!progress || !key) return {ok:false, reason:"Profil de firme introuvable."};
  if(!progress.completedAt) return {ok:false, reason:"Cette quete de firme n'est pas terminee."};
  if(progress.claimed?.[key]) return {ok:false, reason:"Recompense de quete deja recuperee."};
  const reward = {firmatons:Math.max(0, Math.floor(Number(quest.claimFirmatons ?? DEFAULT_CLAIM_FIRMATONS)))};
  progress.claimed[key] = {
    key,
    name:String(contributor?.name || "Pilote").slice(0, 24),
    claimedAt:now
  };
  return {
    ok:true,
    questId:quest.id,
    firmId,
    label:`Prime de firme - ${quest.label}`,
    reward,
    claimedAt:now
  };
}

function buildQuestSnapshot(quests, playerKey, playerFirmId, now){
  const firmId = normalizeFirmId(playerFirmId || "astra");
  const values = Array.isArray(quests) ? quests : Object.values(quests || {});
  return values
    .map(ensureQuestFirms)
    .filter(quest=>Number(quest.endsAt || 0) > now)
    .sort((a, b)=>Number(a.startedAt || 0) - Number(b.startedAt || 0))
    .map(quest=>{
      const own = quest.firms?.[firmId] || {progress:0, contributions:{}};
      const contributors = sortQuestContributors(own.contributions);
      const player = contributors.find(entry=>entry.key === String(playerKey || "")) || null;
      const locked = Boolean(quest.locked) || Number(quest.startedAt || 0) > now;
      const completed = Boolean(own.completedAt);
      const claimed = Boolean(String(playerKey || "") && own.claimed?.[String(playerKey || "")]);
      const currentFirmPoints = quest.kind === "weekly" || quest.kind === "seasonal"
        ? Math.max(0, Math.floor(Number(quest.firmPoints || 0)))
        : getFirmQuestFirmPoints(quest.firmPoints, now - Number(quest.startedAt || 0));
      return {
        id:quest.id,
        definitionId:quest.definitionId || "",
        kind:quest.kind || "daily",
        label:quest.label,
        type:quest.type,
        target:quest.target,
        targetLabel:quest.targetLabel,
        goal:quest.goal,
        firmPoints:Math.max(0, Math.floor(Number(quest.firmPoints || 0))),
        currentFirmPoints,
        claimFirmatons:Math.max(0, Math.floor(Number(quest.claimFirmatons ?? DEFAULT_CLAIM_FIRMATONS))),
        startedAt:quest.startedAt,
        endsAt:quest.endsAt,
        locked,
        opensAt:Number(quest.startedAt || 0),
        claimable:Boolean(!locked && completed && !claimed && String(playerKey || "")),
        claimed,
        firms:Object.fromEntries(FIRMS.map(firm=>[firm.id, {
          progress:Math.max(0, Number(quest.firms?.[firm.id]?.progress || 0)),
          completedAt:Math.max(0, Number(quest.firms?.[firm.id]?.completedAt || 0)),
          firmPointsAwarded:Math.max(0, Number(quest.firms?.[firm.id]?.firmPointsAwarded || 0))
        }])),
        player:player ? {
          rank:player.rank,
          contribution:player.amount,
          rewardLabel:`Top ${player.rank}`,
          firmatons:0,
          expectedReward:null
        } : {rank:null, contribution:0, rewardLabel:"Non classe", firmatons:0, expectedReward:null},
        accepted:true,
        leaders:contributors.slice(0, 10).map(entry=>({name:entry.name, rank:entry.rank, contribution:entry.amount}))
      };
    });
}

export function buildFirmQuestSnapshot(state, playerKey, playerFirmId, now = Date.now()){
  ensureFirmDailyQuests(state, now);
  return buildQuestSnapshot([
    ...activeDailyQuestList(state, now),
    ...lockedDailyQuestList(now)
  ], playerKey, playerFirmId, now);
}

export function buildFirmSeasonalQuestSnapshot(state, playerKey, playerFirmId, now = Date.now()){
  ensureFirmSeasonalQuests(state, now);
  return buildQuestSnapshot(state.seasonalQuests, playerKey, playerFirmId, now);
}
