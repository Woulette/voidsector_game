export function createCombatQuestProgressSystem({
  multiplayer,
  getPlayer,
  getCurrentMap,
  progressServerQuest,
  recordQuestCoordinateVisit,
  recordQuestDeath,
  recordQuestHpLoss,
  recordQuestMapVisit,
  recordQuestTimeElapsed,
  saveState,
  getSpawnPanelMode,
  renderSpawnInteractionPanel,
  showToast
}){
  let coordinateCheckTimer = 0;

  function refreshQuestPanel(){
    const panelMode = getSpawnPanelMode?.();
    if(panelMode) renderSpawnInteractionPanel?.(panelMode);
  }

  function handleFailures(failedQuests, reason){
    if(!failedQuests.length) return;
    saveState();
    failedQuests.forEach(quest=>showToast(`${quest.title} : ${reason}, progression remise a zero.`));
    refreshQuestPanel();
  }

  function recordMapVisit(mapName){
    if(multiplayer.connected || !recordQuestMapVisit(mapName)) return false;
    saveState();
    refreshQuestPanel();
    return true;
  }

  function recordDeath(){
    handleFailures(recordQuestDeath(), "mort du pilote");
  }

  function recordHpLoss(amount){
    handleFailures(recordQuestHpLoss(amount), "limite de vie depassee");
  }

  function update(dt){
    handleFailures(recordQuestTimeElapsed(dt), "temps depasse");
    coordinateCheckTimer -= dt;
    const player = getPlayer();
    const currentMap = getCurrentMap();
    if(coordinateCheckTimer > 0 || !player || !currentMap) return;
    coordinateCheckTimer = multiplayer.connected ? 1 : .25;
    const progressed = multiplayer.connected
      ? progressServerQuest({type:"visit_coordinates", x:player.x, y:player.y, zoneName:currentMap.name})
      : recordQuestCoordinateVisit({x:player.x, y:player.y}, currentMap.name);
    if(progressed && !multiplayer.connected){
      saveState();
      refreshQuestPanel();
    }
  }

  return {recordMapVisit, recordDeath, recordHpLoss, update};
}
