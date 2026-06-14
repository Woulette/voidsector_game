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
  switchLocalProfileScope,
  appMode = "launcher",
  isGameRunning = ()=>false
}){
  function consume(events){
    return events?.length ? events.splice(0) : [];
  }

  function applyPurchaseEvents(reason){
    if(reason === "shop:ammo-bought"){
      let changed = false;
      if(!store.state.ammoInventory || typeof store.state.ammoInventory !== "object") store.state.ammoInventory = {};
      for(const event of consume(multiplayer.shopAmmoEvents)){
        const amount = Math.max(0, Math.round(Number(event.amount || 0)));
        if(event.id && amount > 0){
          const ammoId = String(event.id);
          store.state.ammoInventory[ammoId] = Math.max(0, Number(store.state.ammoInventory[ammoId] || 0)) + amount;
          const price = Math.max(0, Math.round(Number(event.price || 0)));
          const currency = event.priceType === "premium" ? "premium" : "credits";
          if(price > 0 && store.state.player) store.state.player[currency] = Math.max(0, Number(store.state.player[currency] || 0) - price);
          changed = true;
          showToast(`${event.name || "Munitions"} achetee cote serveur : +${amount.toLocaleString("fr-FR")}.`);
        }
      }
      if(changed){
        saveState();
        renderAll();
        window.dispatchEvent(new CustomEvent("voidsector:inventory-updated", {detail:{reason, type:"ammo"}}));
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
    if(reason === "inventory:item-sold"){
      for(const event of consume(multiplayer.inventorySaleEvents)){
        const itemName = event.item?.name || "Objet";
        const currency = event.priceType === "premium" ? "NOVA" : "credits";
        showToast(`${itemName} vendu : +${Number(event.amount || 0).toLocaleString("fr-FR")} ${currency}.`);
      }
      renderAll();
      window.dispatchEvent(new CustomEvent("voidsector:inventory-updated", {detail:{reason, type:"item-sale"}}));
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

  function applyQuestFailureProgress(){
    let changed = false;
    if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
    if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
    for(const event of consume(multiplayer.questFailureEvents)){
      for(const update of event.updates || []){
        const questId = update?.questId || update?.id;
        if(!questId || update.failType !== "hpLost") continue;
        const current = store.state.questFailProgress[questId] && typeof store.state.questFailProgress[questId] === "object"
          ? store.state.questFailProgress[questId]
          : {};
        store.state.questFailProgress[questId] = {
          ...current,
          hpLost:Math.max(0, Number(update.hpLost || 0))
        };
        changed = true;
      }
      for(const failed of event.failed || []){
        const questId = failed?.questId || failed?.id;
        if(!questId) continue;
        const quest = questCatalog.find(entry=>entry.id === questId);
        store.state.questProgress[questId] = Array.isArray(quest?.objectives) && quest.objectives.length > 1 ? {} : 0;
        store.state.questFailProgress[questId] = {};
        if(Array.isArray(store.state.activeQuestIds)){
          store.state.activeQuestIds = store.state.activeQuestIds.filter(id=>id !== questId);
        }
        if(store.state.activeQuestId === questId) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
        const reason = failed?.failType === "timeElapsed" ? "temps depasse" : "limite de vie depassee";
        showToast(`${failed.title || quest?.title || "Quete"} : ${reason}, quete annulee.`);
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
        "ship-cargo-refine":`Fusion serveur : +${event.outputAmount || 0} ${event.output?.name || event.recipe?.outputId || "materiau"}.`,
        "combat-boost-deposit":`${event.amount || 0} ${event.materialName || "materiau"} consomme(s) pour le perfectionnement ${event.target || ""}.`
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
    const combatOwnsQuestEvents = appMode === "game" && isGameRunning();
    if(applyPurchaseEvents(reason)) return;
    if(reason === "ship:active-equipped"){
      const serverEvent = multiplayer.shipEvents?.shift();
      if(serverEvent?.shipId){
          store.state.activeShip = serverEvent.shipId;
          store.state.selectedShip = serverEvent.shipId;
          if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
          if(!Array.isArray(store.state.actionSlotsByShip[serverEvent.shipId])){
            store.state.actionSlotsByShip[serverEvent.shipId] = Array(9).fill(null);
          }
          store.state.actionSlots = Array.from({length:9}, (_,index)=>store.state.actionSlotsByShip[serverEvent.shipId][index] || null);
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
    if(reason === "quest:progress") return combatOwnsQuestEvents ? undefined : applyQuestProgress();
    if(reason === "quest:fail-progress") return combatOwnsQuestEvents ? undefined : applyQuestFailureProgress();
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
