import { isMmoConnected } from "../../app/mmoGate.js";

export function createCombatQuestProgressSystem({
  multiplayer,
  getPlayer,
  getCurrentMap,
  progressServerQuest
}){
  let coordinateCheckTimer = 0;

  function recordMapVisit(){
    return false;
  }

  function recordDeath(){
    return false;
  }

  function recordHpLoss(){
    return false;
  }

  function update(dt){
    if(!isMmoConnected(multiplayer)) return;
    coordinateCheckTimer -= dt;
    const player = getPlayer();
    const currentMap = getCurrentMap();
    if(coordinateCheckTimer > 0 || !player || !currentMap) return;
    coordinateCheckTimer = 1;
    progressServerQuest({type:"visit_coordinates", x:player.x, y:player.y, zoneName:currentMap.name});
  }

  return {recordMapVisit, recordDeath, recordHpLoss, update};
}
