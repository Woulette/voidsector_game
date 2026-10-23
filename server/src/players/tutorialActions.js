import { addInventoryItemAmount, getInventoryItemCount } from "../economy/inventoryStacks.js";
import {
  TUTORIAL_STEPS,
  createTutorialState,
  getNextTutorialStep,
  getTutorialQuestIds,
  sanitizeTutorialState
} from "../../../src/shared/tutorial.js";
import { validateTutorialStep } from "./tutorialValidation.js";
import { getMissingTutorialRocketTrainingStep } from "./tutorialRocketTraining.js";

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

function updateTutorial(profile, tutorial, changes){
  profile.tutorial = {...tutorial, ...changes, revision:tutorial.revision + 1, updatedAt:Date.now()};
  return profile.tutorial;
}

function checkExpectedState(tutorial, action){
  if(!action.currentStep || !Number.isSafeInteger(action.revision) || action.revision < 0){
    return {ok:false, code:"TUTORIAL_SYNC_REQUIRED", reason:"Synchronise le tutoriel avant de continuer."};
  }
  if(action.currentStep !== tutorial.step || action.revision !== tutorial.revision){
    return {ok:true, tutorial, recovered:true};
  }
  return null;
}

function firstMissingTutorialMilestone(profile){
  const [passQuest, storageQuest, raiderQuest, yellowQuest] = getTutorialQuestIds(profile?.player?.firmId);
  if(!questCompleted(profile, passQuest)) return questStarted(profile, passQuest) ? "game_hunt_pass" : "game_open_quests_1";
  if(!profile.ownedShips?.includes("velox")) return "launcher_open_shop";
  if(getInventoryItemCount(profile,"laser_mk1") < 2) return "launcher_open_weapons";
  if(!questCompleted(profile, storageQuest)) return questStarted(profile, storageQuest) ? "launcher_open_refinery" : "game_open_quests_2";
  const trainingStepIndex = tutorialStepIndex(profile?.tutorial?.step);
  const inRocketTraining = trainingStepIndex >= tutorialStepIndex("game_open_quick_shop")
    && trainingStepIndex <= tutorialStepIndex("game_bind_rockets");
  if(inRocketTraining || (!questCompleted(profile, raiderQuest) && questStarted(profile, raiderQuest))
    || (trainingStepIndex <= tutorialStepIndex("game_bind_rockets") && questCompleted(profile, raiderQuest))){
    return getMissingTutorialRocketTrainingStep(profile);
  }
  if(!questCompleted(profile, raiderQuest)) return "game_open_quests_3";
  if(!questCompleted(profile, yellowQuest)) return questStarted(profile, yellowQuest) ? "game_reach_map_2" : "game_open_quests_4";
  return "game_tutorial_complete";
}

function reviewLegacyTutorialProgress(profile, tutorial){
  if(!tutorial.needsReview) return false;
  const firstMissing = firstMissingTutorialMilestone(profile);
  const step = tutorialStepIndex(tutorial.step) > tutorialStepIndex(firstMissing) ? firstMissing : tutorial.step;
  updateTutorial(profile, tutorial, {needsReview:false,step});
  return true;
}

export function reconcileTutorialProgress(profile){
  const tutorial = sanitizeTutorialState(profile?.tutorial, {missingStatus:"abandoned"});
  if(tutorial.status !== "active") return false;
  if(reviewLegacyTutorialProgress(profile,tutorial)) return true;
  const [passQuest, storageQuest, raiderQuest, yellowQuest] = getTutorialQuestIds(profile?.player?.firmId);
  const passCompleted = questCompleted(profile, passQuest);
  const storageCompleted = questCompleted(profile, storageQuest);
  const raiderCompleted = questCompleted(profile, raiderQuest);
  let recoveredStep = "";

  if(passCompleted && storageCompleted && raiderCompleted && questCompleted(profile, yellowQuest)) recoveredStep = "game_tutorial_complete";
  else if(passCompleted && storageCompleted && raiderCompleted && questStarted(profile, yellowQuest)) recoveredStep = "game_reach_map_2";
  else if(passCompleted && storageCompleted && questCompleted(profile, raiderQuest)) recoveredStep = "game_return_hq_2";
  else if(passCompleted && storageCompleted && questStarted(profile, raiderQuest)) recoveredStep = "game_hunt_raiders";
  else if(passCompleted && questCompleted(profile, storageQuest)) recoveredStep = "game_open_quests_3";
  else if(passCompleted && questStarted(profile, storageQuest)) recoveredStep = "launcher_open_refinery";
  else if(passCompleted) recoveredStep = "game_repair_drone_intro";
  else if(questStarted(profile, passQuest)) recoveredStep = "game_hunt_pass";

  const firstMissing = firstMissingTutorialMilestone(profile);
  if(recoveredStep && tutorialStepIndex(recoveredStep) > tutorialStepIndex(firstMissing)) recoveredStep = firstMissing;
  if(!recoveredStep || tutorialStepIndex(recoveredStep) <= tutorialStepIndex(tutorial.step)) return false;
  updateTutorial(profile, tutorial, {step:recoveredStep});
  return true;
}

export function abandonTutorialAfterOutsideQuestAction(profile){
  const tutorial = sanitizeTutorialState(profile?.tutorial, {missingStatus:"abandoned"});
  if(tutorial.status === "active") return reconcileTutorialProgress(profile);
  // Ordinary play and reconnections never imply a permanent abandonment.
  return false;
}

export function applyTutorialAction(profile, action = {}, context = {}){
  if(!profile || typeof profile !== "object") return {ok:false, reason:"Profil introuvable."};
  const now = Date.now();
  const tutorial = sanitizeTutorialState(profile.tutorial, {missingStatus:"abandoned"});
  const kind = String(action.kind || "");

  if(tutorial.status === "active" && tutorial.needsReview && ["advance", "claim-reward"].includes(kind)){
    reconcileTutorialProgress(profile);
    return {ok:true,tutorial:profile.tutorial,recovered:true};
  }

  if(kind === "start"){
    if(tutorial.status === "completed") return {ok:false, reason:"Tutoriel deja termine."};
    if(tutorial.status === "abandoned") return {ok:false, reason:"Tutoriel indisponible pour ce profil."};
    if(tutorial.status !== "active") updateTutorial(profile, tutorial, {status:"active"});
    reconcileTutorialProgress(profile);
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "pause"){
    if(tutorial.status !== "active") return {ok:false, reason:"Tutoriel non actif."};
    updateTutorial(profile, tutorial, {status:"paused"});
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "abandon"){
    if(["completed", "abandoned"].includes(tutorial.status)) return {ok:true, tutorial};
    updateTutorial(profile, tutorial, {status:"abandoned"});
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "advance"){
    if(tutorial.status !== "active") return {ok:false, reason:"Tutoriel en pause."};
    const expected = checkExpectedState(tutorial, action);
    if(expected) return expected;
    if(reconcileTutorialProgress(profile)) return {ok:true, tutorial:profile.tutorial, recovered:true};
    const current = sanitizeTutorialState(profile.tutorial, {missingStatus:"abandoned"});
    const validation = validateTutorialStep(profile, current.step, context);
    if(!validation.ok) return validation;
    const nextStep = getNextTutorialStep(current.step);
    if(!nextStep) return {ok:false, reason:"Derniere etape atteinte."};
    updateTutorial(profile, current, {step:nextStep});
    return {ok:true, tutorial:profile.tutorial};
  }

  if(kind === "claim-reward"){
    if(tutorial.status !== "active" || tutorial.step !== "game_open_gift"){
      return {ok:false, reason:"Cadeau de tutoriel indisponible."};
    }
    const expected = checkExpectedState(tutorial, action);
    if(expected) return expected;
    if(!getTutorialQuestIds(profile.player?.firmId).every(id=>questCompleted(profile, id))){
      return {ok:false, reason:"Termine les quatre missions du tutoriel avant d'ouvrir le cadeau."};
    }
    if(!tutorial.rewardClaimed) addInventoryItemAmount(profile, TUTORIAL_REWARD_ITEM_ID, 1);
    updateTutorial(profile, tutorial, {
      status:"completed",
      rewardClaimed:true,
      completedAt:now
    });
    return {ok:true, tutorial:profile.tutorial, rewardItemId:TUTORIAL_REWARD_ITEM_ID};
  }

  return {ok:false, reason:"Action de tutoriel invalide."};
}

export function resetTutorialForNewFirm(profile){
  const tutorial = sanitizeTutorialState(profile.tutorial);
  if(["abandoned", "completed"].includes(tutorial.status)) return tutorial;
  profile.tutorial = {...createTutorialState("pending"), revision:tutorial.revision + 1};
  return profile.tutorial;
}
