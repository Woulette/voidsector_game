export function createServerEventController({
  multiplayer,
  store,
  getItem,
  getShip,
  getDroneFormation,
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
      for(const event of consume(multiplayer.shopAmmoEvents)){
        const amount = Math.max(0, Math.round(Number(event.amount || 0)));
        if(event.id && amount > 0) showToast(`${event.name || "Munitions"} achetee cote serveur : +${amount.toLocaleString("fr-FR")}.`);
      }
      return true;
    }
    if(reason === "shop:item-bought"){
      for(const event of consume(multiplayer.shopItemEvents)){
        const item = getItem(event.id);
        const quantity = Math.max(1, Math.round(Number(event.quantity || 1)));
        if(item) showToast(`${item.name} achete cote serveur : +${quantity.toLocaleString("fr-FR")}.`);
      }
      renderAll();
      return true;
    }
    if(reason === "shop:booster-bought"){
      for(const event of consume(multiplayer.shopBoosterEvents)){
        const hours = Math.round(Number(event.durationMs || 0) / 3_600_000);
        showToast(`${event.name || "Booster"} x${event.quantity || 1} activé : +${hours} h.`);
      }
      renderAll();
      return true;
    }
    if(reason === "shop:premium-pack-bought"){
      for(const event of consume(multiplayer.shopPremiumPackEvents)){
        showToast(`${event.name || "Pass premium"} active cote serveur. Premium restant : ${event.remaining || "actif"}.`);
      }
      renderAll();
      return true;
    }
    if(reason === "premium:reward-claimed"){
      for(const event of consume(multiplayer.premiumRewardEvents)){
        const day = Number(event.day || 0);
        showToast(`Recompense premium jour ${day || "?"} recue cote serveur.`);
      }
      renderAll();
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
    if(reason === "commerce:material-sold"){
      for(const event of consume(multiplayer.commerceSaleEvents)){
        const amount = Number(event.credits || 0).toLocaleString("fr-FR");
        const label = event.all
          ? `${Number(event.amount || 0).toLocaleString("fr-FR")} materiaux`
          : `${Number(event.amount || 0).toLocaleString("fr-FR")} ${event.material?.name || "materiau"}`;
        showToast(`Commerce : ${label} vendu(s), +${amount} credits.`);
      }
      renderAll();
      window.dispatchEvent(new CustomEvent("voidsector:inventory-updated", {detail:{reason, type:"material-sale"}}));
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
    for(const event of consume(multiplayer.questProgressEvents)){
      for(const update of event.updates || []){
        if(update?.completed) showToast(`Objectif serveur termine : ${update.title || "quete"}.`);
      }
    }
  }

  function applyQuestFailureProgress(){
    for(const event of consume(multiplayer.questFailureEvents)){
      for(const failed of event.failed || []){
        const reason = failed?.failType === "timeElapsed" ? "temps depasse" : "limite de vie depassee";
        showToast(`${failed.title || "Quete"} : ${reason}, quete annulee.`);
      }
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
        showToast(`Vaisseau equipe au spawn ${serverEvent.homeMap || "de firme"}.`);
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
    else if(reason === "auth:logout" || reason === "auth:replaced" || reason === "auth:banned") switchLocalProfileScope("guest");
    if(!reason.startsWith("auth:") || store.currentView !== "hangar") return;
    renderTop();
    if(store.hangarTab === "profile") renderProfile();
  }

  return {handleChange};
}
