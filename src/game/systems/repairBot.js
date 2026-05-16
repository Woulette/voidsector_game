export function createRepairBotSystem({
  getPlayer,
  getParticles,
  pushDamageText,
  showToast
}){
  function getDelay(){
    const player = getPlayer();
    return Math.max(1, Number(player.extraBonus?.repairBotDelay || 15));
  }

  function getHealPerSecond(){
    const player = getPlayer();
    return Math.max(0.005, Number(player.extraBonus?.repairBotHealRate || 0.02));
  }

  function canActivate(){
    const player = getPlayer();
    if(!player.extraBonus?.repairBot) return {ok:false, reason:"Aucun Robot Réparateur équipé."};
    if(player.hp >= player.maxHp) return {ok:false, reason:"Ta coque est déjà au maximum."};
    const remain = Math.max(0, getDelay() - Number(player.secondsSinceDamage || 0));
    if(remain > 0) return {ok:false, reason:`Réparation bloquée : attente ${remain.toFixed(1).replace(".", ",")}s.`};
    return {ok:true, reason:"Prêt"};
  }

  function stop(silent = true){
    const player = getPlayer();
    const wasActive = !!player.repairBotActive;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    if(!silent && wasActive) showToast("Robot réparateur désactivé.");
  }

  function activate(manual = false){
    const player = getPlayer();
    const state = canActivate();
    if(!state.ok){
      if(manual) showToast(state.reason);
      return false;
    }
    if(player.repairBotActive) return true;
    player.repairBotActive = true;
    player.repairBotTickTimer = 0;
    showToast(manual ? "Robot réparateur activé." : "IA d'auto-réparation : robot activé.");
    return true;
  }

  function update(dt){
    const player = getPlayer();
    player.secondsSinceDamage = Math.min(999, Number(player.secondsSinceDamage || 0) + dt);
    if(!player.extraBonus?.repairBot){
      player.repairBotActive = false;
      return;
    }
    if(player.extraBonus?.repairBotAuto && !player.repairBotActive && player.hp < player.maxHp && player.secondsSinceDamage >= getDelay()){
      activate(false);
    }
    if(!player.repairBotActive) return;
    if(player.secondsSinceDamage < getDelay()){
      stop(true);
      return;
    }
    if(player.hp >= player.maxHp){
      player.hp = player.maxHp;
      stop(true);
      return;
    }
    player.repairBotTickTimer = Number(player.repairBotTickTimer || 0) + dt;
    while(player.repairBotTickTimer >= 1 && player.hp < player.maxHp){
      player.repairBotTickTimer -= 1;
      const healAmount = Math.max(1, Math.round(player.maxHp * getHealPerSecond()));
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      const healed = Math.round(player.hp - before);
      if(healed > 0){
        pushDamageText({
          x:player.x + 46,
          y:player.y - 74,
          value:`+${healed} HP`,
          color:"rgba(134,239,172,",
          shadowColor:"rgba(34,197,94,.85)"
        });
        getParticles().push({x:player.x, y:player.y - 18, life:.35, max:.35, size:20, color:"rgba(34,197,94,.55)"});
      }
    }
  }

  return {getDelay, getHealPerSecond, canActivate, stop, activate, update};
}
