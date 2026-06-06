export function createCombatMultiplayerSyncSystem({
  multiplayer,
  getState,
  setState,
  actions,
  beams,
  hasServerControlledEnemies,
  syncServerControlledEnemies,
  showToast
}){
  function syncCoopInstanceSpawn(){
    if(multiplayer.portalInstance?.portal) return;
    const spawn = multiplayer.coopSpawn;
    if(!spawn || spawn.applied || !hasServerControlledEnemies(multiplayer)) return;
    const {player, missileSalvos} = getState();
    player.x = Number(spawn.x || player.x);
    player.y = Number(spawn.y || player.y);
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    missileSalvos.clear();
    beams.clear();
    multiplayer.coopSpawn = {...spawn, applied:true};
    setState({
      moveTarget:null,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[]
    });
    showToast("Instance coop test synchronisee.");
  }

  function syncEnemies(){
    syncCoopInstanceSpawn();
    const {enemies, selectedEnemy} = getState();
    const synced = syncServerControlledEnemies({
      enemies,
      multiplayerState:multiplayer,
      selectedEnemy,
      onSelectionLost:()=>{
        actions.setActiveLaserSlot(null);
        actions.updateGameActionBar();
      }
    });
    setState({enemies:synced.enemies, selectedEnemy:synced.selectedEnemy});
  }

  return {syncEnemies};
}
