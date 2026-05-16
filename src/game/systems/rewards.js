export function createRewardSystem({
  store,
  portals,
  enemyTypes,
  rawDropTable,
  getCurrentMap,
  getGameMode,
  getAllRawMaterials,
  getSkillBonus,
  registerKill,
  recordQuestKill,
  addXP,
  addPortalPiece,
  spawnCargoBox,
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
      if(Math.random() <= portal.dropChance){
        addPortalPiece(portal.id, 1);
        showToast(`Pièce de ${portal.name} trouvée !`);
        return portal;
      }
    }
    return null;
  }

  function materialDropsFromLoot(loot){
    const rawMaterials = getAllRawMaterials();
    return Object.entries(loot?.materials || {})
      .map(([id, amount])=>{
        const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
        if(safeAmount <= 0) return null;
        const material = rawMaterials.find(item=>item.id === id);
        return {id, amount:safeAmount, label:`${safeAmount} ${material?.short || id}`};
      })
      .filter(Boolean);
  }

  function rollMaterials(loot){
    const fixedMaterials = materialDropsFromLoot(loot);
    if(fixedMaterials.length) return fixedMaterials;
    const materials = [];
    const rawMaterials = getAllRawMaterials();
    for(const drop of rawDropTable){
      if(Math.random() > drop.chance) continue;
      const amount = Math.floor(drop.min + Math.random() * (drop.max - drop.min + 1));
      if(amount > 0){
        const material = rawMaterials.find(item=>item.id === drop.id);
        materials.push({id:drop.id, amount, label:`${amount} ${material?.short || drop.id}`});
      }
    }
    return materials;
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
    const lootBonus = getSkillBonus().loot || 0;
    const loot = enemy.loot || enemyTypes[enemy.kind]?.loot || enemyTypes.drone_pirate.loot;
    const credits = Math.round(loot.credits * (1 + lootBonus / 100) * (1 + enemy.level * .06));
    const xp = Math.round(loot.xp * (1 + enemy.level * .08));
    const premium = Math.max(Number(loot.premium || 0), Number(loot.premium || 0));
    store.state.player.credits += credits;
    store.state.player.premium += premium;
    if(addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de compétence.`);

    const pieceDrop = rollPortalPiece();
    const materials = rollMaterials(loot);
    if(materials.length) spawnCargoBox(enemy, materials);
    if(questCompleted) showToast("Quête terminée : retourne au relais pour réclamer la récompense.");

    pushLootNotice({credits, xp, premium, piece:pieceDrop ? `+1 pièce ${pieceDrop.name}` : null});
    spawnRewardParticles(enemy);
    saveState();
  }

  function showCargoLoot(materialLabels){
    pushLootNotice({credits:0, xp:0, premium:0, materials:materialLabels});
  }

  return {
    reset,
    tick,
    rewardEnemy,
    showCargoLoot,
    getLootNotices:()=>lootNotices.slice()
  };
}
