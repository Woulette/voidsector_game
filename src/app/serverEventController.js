export function createServerEventController({
  multiplayer,
  store,
  questCatalog,
  getItem,
  getShip,
  getDroneFormation,
  ensureShipLoadout,
  saveState,
  renderAll,
  renderTop,
  renderProfile,
  showToast,
  accountProfileScope,
  switchLocalProfileScope
}){
  function consume(events){
    return events?.length ? events.splice(0) : [];
  }

  function applyPurchaseEvents(reason){
    if(reason === "shop:ammo-bought"){
      for(const event of consume(multiplayer.shopAmmoEvents)){
        const amount = Math.max(0, Math.round(Number(event.amount || 0)));
        if(event.id && amount > 0) showToast(`${event.name || "Munitions"} achetee cote serveur : +${amount.toLocaleString("fr-FR")}.`);
      }
      return true;
    }
    if(reason === "shop:item-bought"){
      for(const event of consume(multiplayer.shopItemEvents)){
        const item = getItem(event.id);
        if(item) showToast(`${item.name} achete cote serveur. Un exemplaire a ete ajoute a l'inventaire.`);
      }
      return true;
    }
    if(reason === "shop:ship-bought"){
      for(const event of consume(multiplayer.shopShipEvents)){
        const ship = getShip(event.id);
        if(ship) showToast(`${ship.name} achete cote serveur. Il est disponible dans ton hangar.`);
      }
      return true;
    }
    if(reason === "shop:drone-bought"){
      for(const event of consume(multiplayer.shopDroneEvents)){
        const nextCount = Math.max(0, Math.round(Number(event.nextCount || 0)));
        if(nextCount > 0){
          store.hangarTab = "drone";
          showToast(`Drone ${nextCount} achete cote serveur.`);
        }
      }
      renderAll();
      return true;
    }
    if(reason === "shop:drone-formation-bought"){
      for(const event of consume(multiplayer.shopDroneFormationEvents)){
        const formation = getDroneFormation(event.id);
        if(formation) showToast(`${formation.name} ${event.owned ? "activee" : "achetee"} cote serveur.`);
      }
      return true;
    }
    return false;
  }

  function applyQuestProgress(){
    let changed = false;
    if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
    for(const event of consume(multiplayer.questProgressEvents)){
      for(const update of event.updates || []){
        const questId = update?.questId || update?.id;
        if(!questId) continue;
        const value = Math.max(0, Number(update.objectiveProgress ?? update.progress ?? 0));
        const quest = questCatalog.find(entry=>entry.id === questId);
        const objectiveCount = Array.isArray(quest?.objectives) ? quest.objectives.length : quest?.objective ? 1 : 0;
        if(objectiveCount <= 1) store.state.questProgress[questId] = value;
        else if(update.objectiveKey){
          const current = store.state.questProgress[questId];
          store.state.questProgress[questId] = current && typeof current === "object" ? current : {};
          store.state.questProgress[questId][update.objectiveKey] = value;
        }else store.state.questProgress[questId] = Math.max(Number(store.state.questProgress[questId] || 0), value);
        changed = true;
      }
    }
    if(changed){
      saveState();
      renderAll();
    }
  }

  function applyRefineryEvents(){
    for(const event of consume(multiplayer.refineryEvents)){
      const messages = {
        "upgrade-start":`${event.name || "Amelioration"} niveau ${event.level} lance cote serveur.`,
        "upgrade-rush":`${event.name || "Amelioration"} niveau ${event.level} termine cote serveur pour ${event.cost} NOVA.`,
        "production-toggle":`Production ${event.enabled ? "activee" : "coupee"} cote serveur.`,
        "job-start":`Raffinage lance cote serveur : ${event.recipe?.name || "recette"}.`,
        "job-claim":`Raffinage recupere cote serveur : ${event.recipe?.name || "recette"}.`,
        "shipment-start":`${event.amount || 0} ${event.material?.name || "materiau"} envoyes vers ${event.ship?.name || "vaisseau"} cote serveur.`,
        "shipment-rush":`Expedition terminee cote serveur : +${event.amount || 0} ${event.materialName || "materiau"} pour ${event.cost || 0} NOVA.`,
        "ship-cargo-refine":`Fusion serveur : +${event.outputAmount || 0} ${event.output?.name || event.recipe?.outputId || "materiau"}.`
      };
      if(messages[event.action]) showToast(messages[event.action]);
    }
    renderAll();
  }

  function applySpaceCasterEvents(){
    for(const event of consume(multiplayer.spaceCasterEvents)){
      store.state.portalCasterResults = Array.isArray(event.rewards) ? event.rewards.map(reward=>({label:reward.label, amount:reward.amount, img:reward.img})) : [];
      showToast(`Space Caster serveur : ${event.count || 1} lancement(s).`);
    }
    renderAll();
  }

  function handleChange(event){
    const reason = String(event.detail?.reason || "");
    if(applyPurchaseEvents(reason)) return;
    if(reason === "ship:active-equipped"){
      const serverEvent = multiplayer.shipEvents?.shift();
      if(serverEvent?.shipId){
        store.state.activeShip = serverEvent.shipId;
        store.state.selectedShip = serverEvent.shipId;
        ensureShipLoadout(serverEvent.shipId);
        saveState();
        showToast(`Vaisseau equipe au spawn ${serverEvent.homeMap || "de firme"}.`);
        renderAll();
      }
      return;
    }
    if(reason === "equipment:updated"){
      const serverEvent = multiplayer.equipmentEvents?.shift();
      if(serverEvent?.action === "drone-upgrade") showToast("Amelioration drone validee par le serveur.");
      else if(serverEvent?.action === "equipment-upgrade") showToast(`Amelioration equipement validee par le serveur : niveau ${serverEvent.level || "?"}.`);
      else showToast("Equipement valide par le serveur.");
      return;
    }
    if(reason === "quest:progress") return applyQuestProgress();
    if(reason === "refinery:updated") return applyRefineryEvents();
    if(reason === "space-caster:result") return applySpaceCasterEvents();
    if(reason === "auth:success") switchLocalProfileScope(accountProfileScope(event.detail?.payload?.account || multiplayer.auth.account));
    else if(reason === "auth:logout") switchLocalProfileScope("guest");
    if(!reason.startsWith("auth:") || store.currentView !== "hangar") return;
    renderTop();
    if(store.hangarTab === "profile") renderProfile();
  }

  return {handleChange};
}
