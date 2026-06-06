const SPACE_CASTER_REWARDS = [
  {kind:"piece", label:"Piece de portail", amount:1, weight:4},
  {kind:"ammo", id:"ammo_x2", label:"Munitions x2", amount:250, weight:23},
  {kind:"ammo", id:"ammo_x3", label:"Munitions x3", amount:100, weight:12},
  {kind:"ammo", id:"ammo_x4", label:"Munitions x4", amount:35, weight:5},
  {kind:"ammo", id:"rocket_r1", label:"Roquettes R-1", amount:12, weight:27},
  {kind:"ammo", id:"rocket_r2", label:"Roquettes R-2", amount:6, weight:14},
  {kind:"ammo", id:"rocket_r3", label:"Roquettes R-3", amount:2, weight:6},
  {kind:"ammo", id:"missile_m1", label:"Missiles MS-1", amount:5, weight:5},
  {kind:"ammo", id:"missile_m2", label:"Missiles MS-2", amount:2, weight:4}
];

export function createProgressionActions({
  multiplayer,
  store,
  ammoTypes,
  getPortal,
  getPortalPieces,
  isPortalUnlocked,
  canAfford,
  spend,
  addPortalPiece,
  addAmmo,
  unlockPortal,
  upgradeSkill,
  runServerSpaceCaster,
  progressServerQuest,
  recordQuestSpaceCasterUse,
  unlockServerPortal,
  upgradeServerSkill,
  saveAndSyncProfile,
  saveState,
  renderAll,
  showToast
}){
  function canDropPortalPiece(portal){
    const completed = Math.max(0, Number(store.state.completedPortals?.[portal.id] || 0));
    return completed > 0 || getPortalPieces(portal.id) < portal.piecesRequired;
  }

  function pickSpaceCasterReward(portal){
    const rewards = SPACE_CASTER_REWARDS.filter(reward=>reward.kind !== "piece" || canDropPortalPiece(portal));
    const total = rewards.reduce((sum, reward)=>sum + reward.weight, 0);
    let roll = Math.random() * total;
    for(const reward of rewards){
      roll -= reward.weight;
      if(roll <= 0) return reward;
    }
    return rewards[0];
  }

  function runSpaceCaster(id, count = 1){
    const portal = getPortal(id);
    if(!portal) return;
    const rollCount = [1, 10, 100].includes(Number(count)) ? Number(count) : 1;
    if(multiplayer.connected && runServerSpaceCaster({portalId:portal.id, count:rollCount})) return showToast("Space Caster envoye au serveur.");
    const cost = 100 * rollCount;
    if(!canAfford("premium", cost)) return showToast("Pas assez de NOVA pour lancer le Space Caster.");
    spend("premium", cost);
    store.state.selectedPortalCasterId = portal.id;
    const summary = new Map();
    for(let i = 0; i < rollCount; i++){
      const reward = pickSpaceCasterReward(portal);
      const label = reward.kind === "piece" ? `Piece ${portal.name}` : reward.label;
      const img = reward.kind === "piece" ? (portal.pieceImg || portal.img) : ammoTypes.find(ammo=>ammo.id === reward.id)?.img;
      if(reward.kind === "piece") addPortalPiece(portal.id, reward.amount);
      else addAmmo(reward.id, reward.amount);
      const current = summary.get(label) || {label, amount:0, img};
      current.amount += reward.amount;
      if(!current.img && img) current.img = img;
      summary.set(label, current);
    }
    const questCompleted = multiplayer.connected
      ? progressServerQuest({type:"space_caster_use", amount:rollCount}) && false
      : recordQuestSpaceCasterUse(rollCount);
    store.state.portalCasterResults = [...summary.values()];
    saveState();
    showToast(`Space Caster : ${rollCount} lancement(s).`);
    if(questCompleted) showToast("Quete terminee : retourne au relais pour reclamer la recompense.");
    renderAll();
  }

  function unlockPortalWithPieces(id){
    if(multiplayer.connected && unlockServerPortal({id, method:"pieces"})) return showToast("Deverrouillage du portail envoye au serveur.");
    const portal = getPortal(id);
    if(!portal) return;
    if(store.state.player.level < portal.requirement.level) return showToast(`Niveau ${portal.requirement.level} requis pour deverrouiller ${portal.name}.`);
    if(isPortalUnlocked(id)) return showToast(`${portal.name} est deja deverrouille.`);
    if(getPortalPieces(id) < portal.piecesRequired) return showToast(`Il faut ${portal.piecesRequired} pieces.`);
    store.state.portalPieces[id] = Math.max(0, getPortalPieces(id) - portal.piecesRequired);
    unlockPortal(id);
    showToast(`${portal.name} deverrouille avec des pieces.`);
    renderAll();
  }

  function unlockPortalWithNova(id){
    if(multiplayer.connected && unlockServerPortal({id, method:"nova"})) return showToast("Deverrouillage du portail envoye au serveur.");
    const portal = getPortal(id);
    if(!portal) return;
    if(store.state.player.level < portal.requirement.level) return showToast(`Niveau ${portal.requirement.level} requis pour deverrouiller ${portal.name}.`);
    if(isPortalUnlocked(id)) return showToast(`${portal.name} est deja deverrouille.`);
    if(!canAfford("premium", portal.novaCost)) return showToast("Pas assez de NOVA.");
    spend("premium", portal.novaCost);
    unlockPortal(id);
    showToast(`${portal.name} deverrouille avec ${portal.novaCost.toLocaleString("fr-FR")} NOVA.`);
    renderAll();
  }

  function unlockSkill(id){
    if(multiplayer.connected && upgradeServerSkill(id)) return showToast("Amelioration envoyee au serveur.");
    const result = upgradeSkill(id);
    if(!result?.ok) return showToast(result?.reason || "Impossible d'ameliorer cette competence.");
    showToast(`${result.skill.name} niveau ${result.level} atteint.`);
    saveAndSyncProfile();
    renderAll();
  }

  return {runSpaceCaster, unlockPortalWithPieces, unlockPortalWithNova, unlockSkill};
}
