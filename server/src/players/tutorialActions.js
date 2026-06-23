import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import {
  TUTORIAL_QUEST_IDS,
  TUTORIAL_STEPS,
  createTutorialState,
  getNextTutorialStep,
  hasTutorialQuestActivity,
  sanitizeTutorialState
} from "../../../src/shared/tutorial.js";

export const TUTORIAL_REWARD_ITEM_ID = "laser_mk3";

function tutorialStepIndex(step){
  return TUTORIAL_STEPS.indexOf(step);
}

function questStarted(profile, questId){
  return Array.isArray(profile?.activeQuestIds) && profile.activeQuestIds.includes(questId);
}

function questCompleted(profile, questId){
  return Boolean(profile?.completedQuestClaims?.[questId]);
}

export function reconcileTutorialProgress(profile){
  const tutorial = sanitizeTutorialState(profile?.tutorial, {missingStatus:"abandoned"});
  if(tutorial.status !== "active") return false;
  const [passQuest, storageQuest, raiderQuest, yellowQuest] = TUTORIAL_QUEST_IDS;
  let recoveredStep = "";

  if(questCompleted(profile, yellowQuest)) recoveredStep = "game_tutorial_complete";
  else if(questStarted(profile, yellowQuest)) recoveredStep = "game_reach_map_2";
  else if(questCompleted(profile, raiderQuest)) recoveredStep = "game_return_hq_2";
  else if(questStarted(profile, raiderQuest)) recoveredStep = "game_hunt_raiders";
  else if(questCompleted(profile, storageQuest)) recoveredStep = "game_open_quests_3";
  else if(questStarted(profile, storageQuest)) recoveredStep = "launcher_open_refinery";
  else if(questCompleted(profile, passQuest)) recoveredStep = "game_return_hq_1";
  else if(questStarted(profile, passQuest)) recoveredStep = "game_hunt_pass";

  if(!recoveredStep || tutorialStepIndex(recoveredStep) <= tutorialStepIndex(tutorial.step)) return false;
  profile.tutorial = {...tutorial, step:recoveredStep, updatedAt:Date.now()};
  return true;
}

export function abandonTutorialAfterOutsideQuestAction(profile){
  const tutorial = sanitizeTutorialState(profile?.tutorial, {missingStatus:"abandoned"});
  if(tutorial.status === "active") return reconcileTutorialProgress(profile);
  if(!["pending", "paused"].includes(tutorial.status)) return false;
  if(!hasTutorialQuestActivity(profile)) return false;
  profile.tutorial = {...tutorial, status:"abandoned", updatedAt:Date.now()};
  return true;
}

export function applyTutorialAction(profile, action = {}){
  if(!profile || typeof profile !== "object") return {ok:false, reason:"Profil introuvable."};
  const now = Date.now();
  const tutorial = sanitizeTutorialState(profile.tutorial, {missingStatus:"abandoned"});
  const kind = String(action.kind || "");

  if(kind === "start"){
    if(tutorial.status === "completed") return {ok:false, reason:"Tutoriel deja termine."};
    if(tutorial.status === "abandoned") return {ok:false, reason:"Tutoriel indisponible pour ce profil."};
    if(tutorial.status === "pending" && hasTutorialQuestActivity(profile)){
      profile.tutorial = {...tutorial, status:"abandoned", updatedAt:now};
      return {ok:true, tutorial:profile.tutorial, abandoned:true};
    }
    profile.tutorial = {...tutorial, status:"active", updatedAt:now};
    reconcileTutorialProgress(profile);
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "pause"){
    if(tutorial.status !== "active") return {ok:false, reason:"Tutoriel non actif."};
    profile.tutorial = {...tutorial, status:"paused", updatedAt:now};
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "abandon"){
    if(["completed", "abandoned"].includes(tutorial.status)) return {ok:true, tutorial};
    profile.tutorial = {...tutorial, status:"abandoned", updatedAt:now};
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "advance"){
    if(tutorial.status !== "active") return {ok:false, reason:"Tutoriel en pause."};
    const expectedCurrent = String(action.currentStep || "");
    if(reconcileTutorialProgress(profile)) return {ok:true, tutorial:profile.tutorial, recovered:true};
    const current = sanitizeTutorialState(profile.tutorial, {missingStatus:"abandoned"});
    if(expectedCurrent && expectedCurrent !== current.step) return {ok:true, tutorial:current, recovered:true};
    const nextStep = getNextTutorialStep(current.step);
    if(!nextStep) return {ok:false, reason:"Derniere etape atteinte."};
    profile.tutorial = {...current, step:nextStep, updatedAt:now};
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "claim-reward"){
    if(tutorial.status !== "active" || tutorial.step !== "game_open_gift"){
      return {ok:false, reason:"Cadeau de tutoriel indisponible."};
    }
    if(!TUTORIAL_QUEST_IDS.every(id=>profile.completedQuestClaims?.[id])){
      return {ok:false, reason:"Termine les quatre missions du tutoriel avant d'ouvrir le cadeau."};
    }
    if(!tutorial.rewardClaimed) addInventoryItemAmount(profile, TUTORIAL_REWARD_ITEM_ID, 1);
    profile.tutorial = {
      ...tutorial,
      status:"completed",
      rewardClaimed:true,
      updatedAt:now,
      completedAt:now
    };
    return {ok:true, tutorial:profile.tutorial, rewardItemId:TUTORIAL_REWARD_ITEM_ID};
  }

  return {ok:false, reason:"Action de tutoriel invalide."};
}

export function resetTutorialForNewFirm(profile){
  profile.tutorial = createTutorialState("pending");
  return profile.tutorial;
}
