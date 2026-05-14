export function createPlayerLifecycle({
  getPlayer,
  getCurrentMap,
  markCombatActivity,
  clearMovement,
  clearSelection,
  clearCombatEffects,
  setTeleportLock,
  updateHud,
  showToast
}){
  function respawn(){
    const player = getPlayer();
    const currentMap = getCurrentMap();
    player.hp = player.maxHp;
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    player.x = currentMap.spawn.x;
    player.y = currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    clearMovement();
    clearSelection();
    clearCombatEffects();
    setTeleportLock(1.6);
    showToast("Vaisseau détruit. Respawn au spawn.");
    updateHud();
  }

  function damage(amount){
    const player = getPlayer();
    const incoming = Math.max(0, Number(amount || 0));
    if(incoming > 0){
      markCombatActivity("incoming");
      player.secondsSinceDamage = 0;
      player.repairBotActive = false;
      player.repairBotTickTimer = 0;
    }
    const absorbRatio = player.shield > 0 ? Math.max(0, Math.min(0.9, Number(player.shieldAbsorbRatio ?? 0.5))) : 0;
    let shieldPart = incoming * absorbRatio;
    let hullPart = incoming - shieldPart;
    if(player.shield > 0){
      const absorbed = Math.min(player.shield, shieldPart);
      player.shield -= absorbed;
      shieldPart -= absorbed;
      hullPart += shieldPart;
    }else{
      hullPart = incoming;
    }
    if(hullPart > 0) player.hp -= hullPart;
    if(player.hp <= 0) respawn();
  }

  return {respawn, damage};
}
