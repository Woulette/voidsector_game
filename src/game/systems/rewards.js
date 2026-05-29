export function createRewardSystem({
  store,
  portals,
  enemyTypes,
  getCurrentMap,
  getGameMode,
  getSkillBonus,
  registerKill,
  recordQuestKill,
  addXP,
  spawnPortalPieceDrop,
  getSelectedEnemy,
  clearSelectedEnemy,
  getParticles,
  saveState,
  showToast,
  onLootChanged
}){
  const LOOT_NOTICE_DURATION = 5;
  const MAX_LOOT_NOTICES = 5;
  let lootNotices = [];

  function reset(){
    lootNotices = [];
  }

  function tick(dt){
    lootNotices = lootNotices
      .map(notice=>({...notice, remaining:Math.max(0, notice.remaining - dt)}))
      .filter(notice=>notice.remaining > 0);
    return lootNotices.length;
  }

  function notifyLootChanged(){
    onLootChanged?.(lootNotices);
  }

  function pushLootNotice(loot){
    lootNotices.unshift({id:`loot_${Date.now()}_${Math.random().toString(16).slice(2)}`, loot, remaining:LOOT_NOTICE_DURATION, duration:LOOT_NOTICE_DURATION});
    lootNotices = lootNotices.slice(0, MAX_LOOT_NOTICES);
    notifyLootChanged();
  }

  function rollPortalPiece(){
    if(getGameMode() !== "open") return null;
    const currentMap = getCurrentMap();
    for(const portal of portals){
      if(!portal.dropChance || !(portal.dropZones || []).includes(currentMap.name)) continue;
      if(Math.random() <= portal.dropChance) return portal;
    }
    return null;
  }

  function spawnRewardParticles(enemy){
    const particles = getParticles();
    for(let i = 0; i < 16; i++){
      particles.push({
        x:enemy.x,
        y:enemy.y,
        life:.5 + Math.random() * .35,
        max:.75,
        size:4 + Math.random() * 11,
        color:i % 2 ? "rgba(56,189,248,.9)" : "rgba(239,68,68,.75)",
        vx:(Math.random() - .5) * 180,
        vy:(Math.random() - .5) * 180
      });
    }
  }

  function rewardEnemy(enemy){
    if(getSelectedEnemy()?.id === enemy.id) clearSelectedEnemy();
    registerKill(enemy.kind);
    const currentMap = getCurrentMap();
    const questCompleted = recordQuestKill(enemy.kind, currentMap.name);
    const loot = enemy.loot || enemyTypes[enemy.kind]?.loot || enemyTypes.drone_pirate.loot;
    const skillBonus = getSkillBonus?.() || {};
    const credits = Math.round(Number(loot.credits || 0) * Number(skillBonus.lootMultiplier || 1));
    const xp = Math.round(Number(loot.xp || 0));
    const premium = Math.round(Number(loot.premium || 0) * Number(skillBonus.novaMultiplier || 1));
    store.state.player.credits += credits;
    store.state.player.premium += premium;
    if(addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de competence.`);

    const pieceDrop = rollPortalPiece();
    if(pieceDrop) spawnPortalPieceDrop?.(enemy, pieceDrop);
    if(questCompleted) showToast("Quete terminee : retourne au relais pour reclamer la recompense.");

    pushLootNotice({credits, xp, premium, piece:pieceDrop ? `Piece ${pieceDrop.name} au sol` : null});
    spawnRewardParticles(enemy);
    saveState();
  }

  function showCargoLoot(materialLabels){
    pushLootNotice({credits:0, xp:0, premium:0, materials:materialLabels});
  }

  function showLootNotice(loot){
    pushLootNotice(loot || {});
  }

  return {
    reset,
    tick,
    rewardEnemy,
    showCargoLoot,
    showLootNotice,
    getLootNotices:()=>lootNotices.slice()
  };
}
