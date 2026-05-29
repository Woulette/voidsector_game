export function createPlayerLifecycle({
  getPlayer,
  getCurrentMap,
  markCombatActivity,
  clearMovement,
  clearSelection,
  clearCombatEffects,
  setTeleportLock,
  updateHud,
  showToast,
  pushDamageText,
  onDeath
}){
  function respawn({x, y, map, hpRatio = 0.2, message = "Vaisseau detruit. Respawn."} = {}){
    const player = getPlayer();
    const currentMap = map || getCurrentMap();
    player.hp = Math.max(1, Math.round(player.maxHp * hpRatio));
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    player.x = x ?? currentMap.spawn.x;
    player.y = y ?? currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    clearMovement();
    clearSelection();
    clearCombatEffects();
    setTeleportLock(1.6);
    showToast(message);
    updateHud();
  }

  function damage(amount){
    const player = getPlayer();
    const incoming = Math.max(0, Number(amount || 0));
    const hpBeforeDamage = Number(player.hp || 0);
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
    const hpLost = Math.max(0, hpBeforeDamage - Number(player.hp || 0));
    if(incoming > 0 && player.hp > 0 && Number(player.damageToHpChance || 0) > 0 && Math.random() <= Number(player.damageToHpChance || 0)){
      const healed = Math.max(1, Math.round(incoming * 0.5));
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + healed);
      const gained = Math.round(player.hp - before);
      if(gained > 0){
        pushDamageText?.({
          x:player.x + 34,
          y:player.y - 82,
          value:`+${gained} HP`,
          color:"rgba(134,239,172,",
          shadowColor:"rgba(34,197,94,.85)"
        });
      }
    }
    if(player.hp <= 0) onDeath?.();
    return hpLost;
  }

  return {respawn, damage};
}

