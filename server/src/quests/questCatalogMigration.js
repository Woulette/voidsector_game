import { questCatalog } from "../../../src/data/progression.js";
import { QUEST_CATALOG_REVISION, REVISED_QUEST_SOURCE_IDS } from "../../../src/shared/quests/catalogRevision.js";
import { appendProfileActivity } from "../players/activityLog.js";

const revisedSources = new Set(REVISED_QUEST_SOURCE_IDS);
const revisedQuestIds = new Set(questCatalog
  .filter(quest=>revisedSources.has(quest.sourceQuestId || quest.id))
  .map(quest=>quest.id));

export function questCatalogRevision(value){
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

// Old counters refer to different enemies. Close only those attempts once,
// retaining permanent claims so changing the catalogue cannot replay rewards.
export function migrateQuestCatalog(profile, {now = Date.now()} = {}){
  const result = {changed:false, clearedQuestIds:[], clearedActiveQuestIds:[]};
  if(!profile || questCatalogRevision(profile.questCatalogRevision) >= QUEST_CATALOG_REVISION) return result;
  const activeIds = Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds : [];
  const claims = profile.completedQuestClaims || {};
  for(const id of revisedQuestIds){
    if(claims[id]) continue;
    const active = activeIds.includes(id);
    const hasProgress = Object.hasOwn(profile.questProgress || {}, id);
    const hasFailure = Object.hasOwn(profile.questFailProgress || {}, id);
    if(!active && !hasProgress && !hasFailure) continue;
    result.clearedQuestIds.push(id);
    if(active) result.clearedActiveQuestIds.push(id);
    if(hasProgress) delete profile.questProgress[id];
    if(hasFailure) delete profile.questFailProgress[id];
  }
  const removed = new Set(result.clearedActiveQuestIds);
  profile.activeQuestIds = activeIds.filter(id=>!removed.has(id));
  if(removed.has(profile.activeQuestId)) profile.activeQuestId = profile.activeQuestIds[0] || null;
  profile.questCatalogRevision = QUEST_CATALOG_REVISION;
  result.changed = true;
  if(removed.size){
    appendProfileActivity(profile, {
      id:`quest-catalog-revision-${QUEST_CATALOG_REVISION}`,
      type:"quest",
      label:"Contrats corrigés",
      detail:`${removed.size} ancien(s) contrat(s) impossible(s) retiré(s) du journal. Les versions corrigées sont disponibles au relais.`,
      data:{revision:QUEST_CATALOG_REVISION, cleared:removed.size}
    }, now);
  }
  return result;
}
