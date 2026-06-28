export const TUTORIAL_QUEST_IDS = Object.freeze([
  "quest_drone_cleanup",
  "quest_spectral_scan",
  "quest_raider_patrol",
  "quest_lv1_comprehension_acquisition"
]);

const TUTORIAL_EXPECTED_QUEST_BY_STEP = Object.freeze({
  game_open_quests_1:TUTORIAL_QUEST_IDS[0],
  game_select_pass:TUTORIAL_QUEST_IDS[0],
  game_accept_pass:TUTORIAL_QUEST_IDS[0],
  game_open_quests_2:TUTORIAL_QUEST_IDS[1],
  game_select_storage:TUTORIAL_QUEST_IDS[1],
  game_accept_storage:TUTORIAL_QUEST_IDS[1],
  game_open_quests_3:TUTORIAL_QUEST_IDS[2],
  game_select_raiders:TUTORIAL_QUEST_IDS[2],
  game_accept_raiders:TUTORIAL_QUEST_IDS[2],
  game_open_quests_4:TUTORIAL_QUEST_IDS[3],
  game_yellow_explain:TUTORIAL_QUEST_IDS[3],
  game_accept_yellow:TUTORIAL_QUEST_IDS[3]
});

export function getTutorialExpectedQuestId(tutorialOrStep = ""){
  const step = typeof tutorialOrStep === "string" ? tutorialOrStep : tutorialOrStep?.step;
  return TUTORIAL_EXPECTED_QUEST_BY_STEP[String(step || "")] || "";
}

export function canAcceptQuestDuringTutorial(tutorial, questId){
  if(tutorial?.status !== "active") return true;
  const expectedQuestId = getTutorialExpectedQuestId(tutorial);
  return Boolean(expectedQuestId && String(questId || "") === expectedQuestId);
}

export const TUTORIAL_STEPS = Object.freeze([
  "launcher_orion",
  "launcher_ship_gift",
  "launcher_inventory",
  "launcher_unequip_all",
  "launcher_depart",
  "game_base_intro",
  "game_quest_camera",
  "game_open_quests_1",
  "game_select_pass",
  "game_accept_pass",
  "game_hunt_pass",
  "game_repair_drone_intro",
  "game_use_repair_drone",
  "game_return_hq_1",
  "launcher_open_shop",
  "launcher_select_velox",
  "launcher_buy_velox",
  "launcher_open_weapons",
  "launcher_select_laser",
  "launcher_buy_laser",
  "launcher_open_hangar",
  "launcher_open_orion",
  "launcher_unequip_orion",
  "launcher_open_velox",
  "launcher_equip_velox",
  "launcher_equip_three_lasers",
  "launcher_depart_velox",
  "game_open_quests_2",
  "game_select_storage",
  "game_accept_storage",
  "launcher_open_refinery",
  "launcher_upgrade_storage",
  "launcher_launch_storage_upgrade",
  "game_open_quests_3",
  "game_select_raiders",
  "game_accept_raiders",
  "game_hunt_raiders",
  "game_return_hq_2",
  "game_open_quests_4",
  "game_yellow_explain",
  "game_accept_yellow",
  "game_reach_map_2",
  "game_hunt_yellow",
  "game_tutorial_complete",
  "game_open_gift"
]);

export function createTutorialState(status = "pending"){
  return {
    status,
    step:TUTORIAL_STEPS[0],
    rewardClaimed:false,
    updatedAt:Date.now(),
    completedAt:0
  };
}

export function sanitizeTutorialState(value, {missingStatus = "abandoned"} = {}){
  if(!value || typeof value !== "object") return createTutorialState(missingStatus);
  const allowedStatuses = new Set(["pending", "active", "paused", "completed", "abandoned"]);
  const status = allowedStatuses.has(value.status) ? value.status : missingStatus;
  const step = TUTORIAL_STEPS.includes(value.step) ? value.step : TUTORIAL_STEPS[0];
  return {
    status,
    step,
    rewardClaimed:Boolean(value.rewardClaimed),
    updatedAt:Math.max(0, Number(value.updatedAt || Date.now())),
    completedAt:Math.max(0, Number(value.completedAt || 0))
  };
}

export function getNextTutorialStep(step){
  const index = TUTORIAL_STEPS.indexOf(step);
  return index >= 0 && index < TUTORIAL_STEPS.length - 1 ? TUTORIAL_STEPS[index + 1] : null;
}

export function hasTutorialQuestActivity(profile = {}){
  const active = new Set(Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds.map(String) : []);
  return TUTORIAL_QUEST_IDS.some(id=>
    active.has(id)
    || Boolean(profile.completedQuestClaims?.[id])
    || Number(profile.questProgress?.[id] || 0) > 0
  );
}
