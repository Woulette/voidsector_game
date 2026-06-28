import { getCurrentRank, getInventoryCount, getItemFromInventoryUid, getLoadout } from "../core/store.js";
import { equipment } from "../data/catalog.js";
import { getFirmRepresentative } from "../data/firmRepresentatives.js";
import { createTypewriterTextController } from "../game/ui/typewriterText.js";
import { TUTORIAL_QUEST_IDS, sanitizeTutorialState } from "../shared/tutorial.js";

const [PASS_QUEST, STORAGE_QUEST, RAIDER_QUEST, YELLOW_QUEST] = TUTORIAL_QUEST_IDS;
const REPAIR_DRONE_ACTION_SELECTOR = [
  '[data-action-item-id="extra_repair_starter"]',
  '[data-action-item-id="extra_repair_bot"]',
  '[data-action-item-id="extra_repair_auto"]'
].join(",");

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
}

function stageDefinitions(ctx){
  const name = ctx.playerName || "pilote";
  return {
    launcher_orion:{mode:"launcher",handoff:true,selector:'[data-ship-id="orion"]',click:true,message:"Encore une recrue... parfait, il ne manquait plus que ça. Je suis Kael Vorn. Je vais faire court : ici, c'est ton hangar, et ce tas de métal s'appelle l'Orion. Clique dessus."},
    launcher_ship_gift:{mode:"launcher",manual:true,message:"Le commandement t'a attribué cet Orion et un équipement."},
    launcher_inventory:{mode:"launcher",manual:true,selector:".rpg-inventory-grid",message:"À droite se trouve ton inventaire. Tout ton équipement et tes ressources disponibles y seront stockés."},
    launcher_unequip_all:{mode:"launcher",manual:true,selector:"#unequipAllShipBtn",message:"Ce bouton permet de tout déséquiper sur ton vaisseau."},
    launcher_depart:{mode:"launcher",handoff:true,selector:"#startGameBtn",click:true,message:"Les bases du hangar sont acquises. Clique sur DÉPART et rejoins le quartier général."},
    game_base_intro:{mode:"game",manual:true,message:"Voilà ta station. Le QG de ta firme, en quelque sorte. Le relais de quêtes te file du travail, le commerce te permet de vendre ce que tu récupères."},
    game_quest_camera:{mode:"game",manual:true,preview:{type:"station",id:"quests"},previewDuration:6500,message:"Ici se trouve le relais de quêtes. Ouvre-le."},
    game_open_quests_1:{mode:"game",silent:true,world:{type:"station",id:"quests"},arrowMode:"world-anchor",condition:s=>isQuestPanelOpen()||questStartedOrDone(s,PASS_QUEST),message:""},
    game_select_pass:{mode:"game",handoff:true,selector:`[data-view-quest="${PASS_QUEST}"]`,click:true,condition:s=>questStartedOrDone(s,PASS_QUEST),message:"Voici les tâches disponibles au relais. Sélectionne « Un passe droit ? », puis accepte la mission."},
    game_accept_pass:{mode:"game",silent:true,selector:`[data-accept-quest="${PASS_QUEST}"]`,condition:s=>questStartedOrDone(s,PASS_QUEST),message:"Accepte la mission."},
    game_hunt_pass:{mode:"game",silent:true,world:{type:"enemy",kinds:["drone_pirate"]},arrowMode:"player-direction",condition:s=>questDone(s,PASS_QUEST),message:"Détruis trois Orbes sentinelles. La flèche au-dessus de ton vaisseau indique la plus proche."},
    game_repair_drone_intro:{mode:"game",manual:true,message:"Mission accomplie. Utilise ton drone de réparation pour réparer ton vaisseau."},
    game_use_repair_drone:{mode:"game",silent:true,selector:REPAIR_DRONE_ACTION_SELECTOR,condition:(s,g)=>Boolean(g?.player?.repairBotActive),message:""},
    game_return_hq_1:{mode:"game",handoff:true,world:{type:"hq"},arrowMode:"player-direction",condition:(s,g)=>Number(g?.target?.distance||Infinity)<520,message:"Maintenant retourne au QG."},
    launcher_open_shop:{mode:"launcher",handoff:true,selector:'[data-view="shop"]',click:true,message:"Ouvre le MAGASIN. Tes crédits de mission vont financer un Velox."},
    launcher_select_velox:{mode:"launcher",handoff:true,selector:'[data-select-shop="ship:velox"]',click:true,lockToSelector:true,message:"Sélectionne le Velox : il est plus rapide et possède trois emplacements laser."},
    launcher_buy_velox:{mode:"launcher",handoff:true,selector:'[data-buy-shop-ship="velox"]',condition:s=>s.ownedShips?.includes("velox"),message:"Achète le Velox avec les crédits reçus."},
    launcher_open_weapons:{mode:"launcher",handoff:true,selector:'[data-filter-shop="canon"]',click:true,message:"Passe maintenant dans la catégorie ARMES."},
    launcher_select_laser:{mode:"launcher",handoff:true,selector:'[data-select-shop="item:laser_mk1"]',click:true,lockToSelector:true,message:"Sélectionne un Canon laser MK-I."},
    launcher_buy_laser:{mode:"launcher",handoff:true,selector:'[data-buy-item="laser_mk1"]',condition:()=>getInventoryCount("laser_mk1")>=2,message:"Achète ce deuxième MK-I. Avec le MK-III de ta première mission, le Velox pourra utiliser ses trois emplacements."},
    launcher_open_hangar:{mode:"launcher",handoff:true,selector:'[data-view="hangar"]',click:true,message:"Retourne au HANGAR pour transférer ton équipement."},
    launcher_open_orion:{mode:"launcher",handoff:true,selector:'[data-ship-id="orion"]',click:true,message:"Ouvre d'abord l'Orion pour vérifier qu'il ne conserve aucun équipement utile."},
    launcher_unequip_orion:{mode:"launcher",handoff:true,selector:"#unequipAllShipBtn, [data-unequip-all-confirm]",condition:()=>loadoutIsEmpty("orion"),message:"Déséquipe entièrement l'Orion avec le bouton indiqué."},
    launcher_open_velox:{mode:"launcher",handoff:true,selector:'#backToShipsBtn, [data-ship-id="velox"]',condition:s=>s.selectedShip==="velox"&&!document.getElementById("shipDetailPanel")?.classList.contains("hidden"),message:"Reviens à la liste des vaisseaux, puis ouvre le Velox."},
    launcher_equip_velox:{mode:"launcher",handoff:true,selector:"#selectedShipAction",condition:s=>s.activeShip==="velox",message:"Équipe le Velox comme vaisseau actif."},
    launcher_equip_three_lasers:{mode:"launcher",handoff:true,selector:".rpg-inventory-grid",condition:()=>veloxTutorialLoadoutReady(),message:"Équipe sur le Velox tes trois lasers, le drone de réparation et le lance-roquette."},
    launcher_depart_velox:{mode:"launcher",handoff:true,selector:"#startGameBtn",click:true,message:"Ton Velox est prêt. Clique sur DÉPART pour poursuivre les missions d'initiation."},
    game_open_quests_2:{mode:"game",handoff:true,world:{type:"station",id:"quests"},arrowMode:"world-anchor",condition:s=>isQuestPanelOpen()||questStartedOrDone(s,STORAGE_QUEST),message:"Retourne au contrôleur de quêtes."},
    game_select_storage:{mode:"game",handoff:true,selector:`[data-view-quest="${STORAGE_QUEST}"]`,click:true,condition:s=>questStartedOrDone(s,STORAGE_QUEST),message:"Sélectionne « Un choix rationelle » et accepte-la."},
    game_accept_storage:{mode:"game",silent:true,selector:`[data-accept-quest="${STORAGE_QUEST}"]`,condition:s=>questStartedOrDone(s,STORAGE_QUEST),message:"Accepte la mission d'amélioration du stockage."},
    launcher_open_refinery:{mode:"launcher",handoff:true,selector:'[data-view="refinery"]',click:true,message:"Ouvre la RAFFINERIE depuis le tableau de bord."},
    launcher_upgrade_storage:{mode:"launcher",handoff:true,selector:'[data-upgrade-refinery-module="storage"], [data-confirm-refinery-module-upgrade="storage"]',condition:s=>questDone(s,STORAGE_QUEST),message:"Améliore le module STOCKAGE au niveau 2. Clique d'abord sur Améliorer, puis confirme le lancement."},
    game_open_quests_3:{mode:"game",handoff:true,world:{type:"station",id:"quests"},arrowMode:"world-anchor",condition:s=>isQuestPanelOpen()||questStartedOrDone(s,RAIDER_QUEST),message:"L'amélioration est lancée. Reviens au contrôleur pour la mission suivante."},
    game_select_raiders:{mode:"game",handoff:true,selector:`[data-view-quest="${RAIDER_QUEST}"]`,click:true,condition:s=>questStartedOrDone(s,RAIDER_QUEST),message:"Continue, sélectionne « Pulvérisé à la racine », puis accepte la mission."},
    game_accept_raiders:{mode:"game",silent:true,selector:`[data-accept-quest="${RAIDER_QUEST}"]`,condition:s=>questStartedOrDone(s,RAIDER_QUEST),message:"Accepte la mission contre les Vorak rushers."},
    game_hunt_raiders:{mode:"game",silent:true,world:{type:"enemy",kinds:["raider_astral"]},arrowMode:"player-direction",condition:s=>questDone(s,RAIDER_QUEST),message:"Détruis les Vorak rushers. La flèche au-dessus de ton vaisseau indique le plus proche."},
    game_return_hq_2:{mode:"game",handoff:true,world:{type:"hq"},arrowMode:"player-direction",condition:(s,g)=>Number(g?.target?.distance||Infinity)<520,message:"Bien joué. Continue puis retourne au QG : une mission jaune vient d'être déverrouillée."},
    game_open_quests_4:{mode:"game",handoff:true,world:{type:"station",id:"quests"},arrowMode:"world-anchor",condition:s=>isQuestPanelOpen()||questStartedOrDone(s,YELLOW_QUEST),message:"Ouvre une dernière fois le contrôleur de quêtes."},
    game_yellow_explain:{mode:"game",manual:true,message:"Cette mission est jaune car elle conclut toutes les quêtes du palier niveau 1. Ces missions spéciales sont plus rares et donnent de meilleures récompenses."},
    game_accept_yellow:{mode:"game",handoff:true,selector:`[data-accept-quest="${YELLOW_QUEST}"]`,condition:s=>questStartedOrDone(s,YELLOW_QUEST),message:"Continue, accepte « Compréhension acquisition », puis rejoins la deuxième carte de ta firme."},
    game_reach_map_2:{mode:"game",handoff:true,world:{type:"map2"},arrowMode:"player-direction",condition:(s,g)=>String(g?.mapName||"").endsWith("-02"),message:"Suis ensuite la flèche au-dessus de ton vaisseau jusqu'au portail menant à la carte 2."},
    game_hunt_yellow:{mode:"game",silent:true,world:s=>({type:"enemy",kinds:remainingYellowEnemyKinds(s)}),arrowMode:"player-direction",condition:s=>questDone(s,YELLOW_QUEST),message:"Termine les objectifs. La flèche indique la cible encore utile la plus proche."},
    game_tutorial_complete:{mode:"game",manual:true,message:`Félicitations, ${name}. Tu maîtrises maintenant le hangar, le magasin, la raffinerie, les cartes et les missions spéciales. Le reste dépend de toi.`},
    game_open_gift:{mode:"game",gift:true,message:"Le commandement t'accorde un dernier cadeau. Ouvre le coffre pour recevoir ton Laser MK-III."}
  };
}

function questDone(state, id){ return Boolean(state.completedQuestClaims?.[id]); }
function questStartedOrDone(state, id){ return questDone(state,id) || state.activeQuestIds?.includes(id); }
function loadoutIsEmpty(shipId){
  const loadout = getLoadout(shipId) || {};
  return ![
    ...(loadout.lasers || []),
    loadout.missileLauncher,
    loadout.rocketLauncher,
    ...(loadout.generators || []),
    ...(loadout.extras || [])
  ].some(Boolean);
}
function hasRepairDroneEquipped(loadout){
  return (loadout?.extras || [])
    .map(uid=>getItemFromInventoryUid(uid))
    .some(item=>Boolean(item?.effect?.repairBot));
}
function hasRocketLauncherEquipped(loadout){
  return getItemFromInventoryUid(loadout?.rocketLauncher)?.slotType === "rocketLauncher";
}
function veloxTutorialLoadoutReady(){
  const loadout = getLoadout("velox") || {};
  return (loadout.lasers || []).filter(Boolean).length >= 3
    && hasRepairDroneEquipped(loadout)
    && hasRocketLauncherEquipped(loadout);
}
function remainingYellowEnemyKinds(state){
  const progress = state.questProgress?.[YELLOW_QUEST] || {};
  const result = [];
  if(Number(progress.orbes || 0) < 5) result.push("drone_pirate");
  if(Number(progress.vorak || 0) < 5) result.push("raider_astral");
  return result.length ? result : ["drone_pirate","raider_astral"];
}
function isQuestPanelOpen(){
  const panel = document.getElementById("spawnInteractionPanel");
  return Boolean(panel && !panel.classList.contains("hidden") && panel.classList.contains("quest-mode"));
}

export function createTutorialController({store, appMode, game, updateTutorial, multiplayer}){
  const typewriter = createTypewriterTextController({charactersPerSecond:38});
  let root = null;
  let launcher = null;
  let arrow = null;
  let interactionLock = null;
  let abandonDialog = null;
  let rewardOverlay = null;
  let rewardHideTimer = null;
  let lastRewardAnimationKey = "";
  let pending = false;
  let enteredStep = "";
  let dismissedStep = "";
  let highlightedElement = null;
  let lastAutoScrollKey = "";
  let lastAutoScrollAt = 0;
  let lastTick = performance.now();

  function ensureDom(){
    if(root?.isConnected) return;
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "tutorial-launcher hidden";
    launcher.textContent = "TUTO";
    launcher.setAttribute("aria-label", "Relancer le tutoriel");
    root = document.createElement("section");
    root.className = "tutorial-guide hidden";
    root.setAttribute("aria-live", "polite");
    arrow = document.createElement("div");
    arrow.className = "tutorial-arrow hidden";
    interactionLock = document.createElement("div");
    interactionLock.className = "tutorial-input-lock hidden";
    interactionLock.setAttribute("aria-hidden", "true");
    abandonDialog = document.createElement("div");
    abandonDialog.className = "tutorial-abandon-backdrop hidden";
    abandonDialog.innerHTML = `<section class="tutorial-abandon-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorialAbandonTitle">
      <span>TRANSMISSION PRIORITAIRE</span>
      <h2 id="tutorialAbandonTitle">ABANDONNER LE TUTORIEL ?</h2>
      <p>Si tu abandonnes maintenant, le tutoriel sera définitivement désactivé pour ce pilote. Tu ne pourras plus le relancer, même après une reconnexion.</p>
      <div><button type="button" data-tutorial-keep>CONTINUER LE TUTORIEL</button><button type="button" data-tutorial-abandon>ABANDONNER DÉFINITIVEMENT</button></div>
    </section>`;
    rewardOverlay = document.createElement("div");
    rewardOverlay.className = "tutorial-reward-overlay hidden";
    document.body.append(launcher, interactionLock, root, arrow, abandonDialog, rewardOverlay);
    launcher.addEventListener("click", ()=>send("start"));
    root.addEventListener("click", event=>{
      if(event.target.closest("[data-tutorial-close]")){ abandonDialog.classList.remove("hidden"); return; }
      if(event.target.closest("[data-tutorial-dismiss]")){
        if(!typewriter.isComplete()){ typewriter.complete(); return; }
        dismissedStep = String(store.state?.tutorial?.step || "");
        root.classList.add("hidden");
        setInputLocked(false);
        syncArrow();
        return;
      }
      if(event.target.closest("[data-tutorial-next]")){
        if(!typewriter.isComplete()){ typewriter.complete(); return; }
        advance();
        return;
      }
      if(event.target.closest("[data-tutorial-gift]")){
        if(!typewriter.isComplete()){ typewriter.complete(); return; }
        send("claim-reward");
        return;
      }
      if(event.target.closest("[data-tutorial-message]")) typewriter.complete();
    });
    abandonDialog.addEventListener("click", event=>{
      if(event.target === abandonDialog || event.target.closest("[data-tutorial-keep]")){
        abandonDialog.classList.add("hidden");
        return;
      }
      if(event.target.closest("[data-tutorial-abandon]")){
        abandonDialog.classList.add("hidden");
        send("abandon");
      }
    });
  }

  function showRewardAnimation(itemId){
    if(!rewardOverlay) return;
    const item = equipment.find(entry=>entry.id === itemId) || {name:"Récompense", img:"assets/firm/chests/chest_rare.svg", rarity:"RARE"};
    const key = `${itemId}:${store.state?.tutorial?.completedAt || store.state?.tutorial?.updatedAt || Date.now()}`;
    if(key === lastRewardAnimationKey) return;
    lastRewardAnimationKey = key;
    window.clearTimeout(rewardHideTimer);
    rewardOverlay.classList.remove("hidden");
    rewardOverlay.innerHTML = `<section class="tutorial-reward-card" role="status" aria-live="assertive">
      <div class="tutorial-reward-burst"></div>
      <div class="tutorial-reward-chest"><img src="assets/firm/chests/chest_rare.svg" alt=""></div>
      <div class="tutorial-reward-item">
        <span>CADEAU DU COMMANDEMENT</span>
        <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}">
        <h2>${escapeHtml(item.name)}</h2>
        <b>${escapeHtml(item.rarity || "RARE")}</b>
      </div>
    </section>`;
    rewardHideTimer = window.setTimeout(()=>{
      rewardOverlay.classList.add("hidden");
      rewardOverlay.innerHTML = "";
    }, 3600);
  }

  function send(kind){
    const tutorial = store.state?.tutorial;
    if(pending || !tutorial || !multiplayer?.connected) return false;
    pending = Boolean(updateTutorial?.({kind,currentStep:tutorial.step}));
    if(pending) window.setTimeout(()=>{ pending=false; }, 1800);
    return pending;
  }

  function advance(){ return send("advance"); }

  function context(){
    return {
      playerName:String(store.state?.player?.name || "pilote"),
      rankName:String(getCurrentRank()?.name || "Recrue")
    };
  }

  function currentDefinition(){
    const tutorial = store.state?.tutorial;
    if(!tutorial) return null;
    return stageDefinitions(context())[tutorial.step] || null;
  }

  function render(){
    ensureDom();
    const tutorial = store.state?.tutorial;
    const definition = currentDefinition();
    if(tutorial?.step !== enteredStep){
      dismissedStep = "";
      enteredStep = String(tutorial?.step || "");
      if(definition?.preview) window.setTimeout(()=>game?.previewTutorialTarget?.(definition.preview, definition.previewDuration || 6500), 250);
    }
    const visibleStatus = tutorial
      && store.state?.player?.firmSelected === true
      && multiplayer?.auth?.profileReady === true
      && ["pending","active","paused"].includes(tutorial.status);
    launcher.classList.toggle("hidden", !visibleStatus || tutorial.status === "active");
    launcher.textContent = tutorial?.status === "paused" ? "TUTO" : "TUTO";
    arrow.classList.add("hidden");
    if(!tutorial || tutorial.status !== "active" || !definition){
      root.classList.add("hidden");
      setInputLocked(false);
      abandonDialog?.classList.add("hidden");
      return;
    }
    if(definition.mode !== appMode){
      root.classList.remove("hidden");
      root.classList.add("tutorial-mode-hint");
      setInputLocked(false);
      root.innerHTML = `<div class="tutorial-mode-copy"><b>TUTORIEL EN ${definition.mode === "game" ? "JEU" : "HANGAR"}</b><span>Poursuis dans l'onglet ${definition.mode === "game" ? "de jeu" : "du tableau de bord"}.</span></div><button type="button" data-tutorial-close aria-label="Abandonner le tutoriel">×</button>`;
      return;
    }
    if(definition.silent || (definition.handoff && dismissedStep === tutorial.step)){
      root.classList.add("hidden");
      setInputLocked(false);
      syncArrow(definition);
      return;
    }
    root.classList.remove("hidden","tutorial-mode-hint");
    setInputLocked(true);
    const representative = getFirmRepresentative(store.state?.player?.firmId);
    const gift = definition.gift ? `<button class="tutorial-gift" type="button" data-tutorial-gift><img src="assets/firm/chests/chest_rare.svg" alt="Coffre cadeau"><b>OUVRIR LE CADEAU</b><small>Laser MK-III</small></button>` : "";
    const action = definition.manual
      ? `<button class="tutorial-next" type="button" data-tutorial-next>CONTINUER</button>`
      : definition.handoff
        ? `<button class="tutorial-next" type="button" data-tutorial-dismiss>CONTINUER</button>`
        : "";
    root.innerHTML = `<button class="tutorial-close" type="button" data-tutorial-close aria-label="Abandonner le tutoriel">×</button>
      <figure class="tutorial-portrait"><img src="${escapeHtml(representative.asset)}" alt="${escapeHtml(representative.name)}"><figcaption><b>${escapeHtml(representative.name)}</b><span>${escapeHtml(representative.title)}</span></figcaption></figure>
      <div class="tutorial-transmission" data-tutorial-message><div><span>TRANSMISSION DE COMMANDEMENT</span><b>${escapeHtml(context().rankName.toUpperCase())} ${escapeHtml(context().playerName.toUpperCase())}</b></div><p data-typewriter-key="${escapeHtml(tutorial.step)}" data-typewriter-text="${escapeHtml(definition.message)}"></p><small>Cliquer sur le message pour l'afficher immédiatement.</small>${action}${gift}</div>`;
    typewriter.sync(root);
    if(shouldShowInstructionArrow(definition)){
      syncArrow(definition);
    }else{
      setHighlightedElement();
      arrow.classList.add("hidden");
    }
  }

  function placeArrowAt(x,y,angle = 0, directional = false, variant = ""){
    arrow.classList.remove("hidden","directional","world-direction");
    if(directional) arrow.classList.add("directional");
    if(variant) arrow.classList.add(variant);
    arrow.style.left = `${Math.round(x)}px`;
    arrow.style.top = `${Math.round(y)}px`;
    arrow.style.setProperty("--tutorial-arrow-angle", `${angle}rad`);
  }

  function setHighlightedElement(element = null){
    if(highlightedElement === element) return;
    highlightedElement?.classList.remove("tutorial-highlight");
    highlightedElement = element;
    highlightedElement?.classList.add("tutorial-highlight");
  }

  function setInputLocked(locked = false){
    interactionLock?.classList.toggle("hidden", !locked);
  }

  function isTransmissionBlocking(){
    return Boolean(root && !root.classList.contains("hidden") && !root.classList.contains("tutorial-mode-hint"));
  }

  function shouldShowInstructionArrow(definition){
    return Boolean(definition?.manual && (definition.selector || definition.world));
  }

  function isSelectorLockActive(tutorial = store.state?.tutorial, definition = currentDefinition()){
    return Boolean(tutorial?.status === "active"
      && definition?.mode === appMode
      && definition?.lockToSelector
      && definition?.selector
      && (!definition.handoff || dismissedStep === tutorial.step));
  }

  function handleTutorialLockedClick(event){
    const tutorial = store.state?.tutorial;
    const definition = currentDefinition();
    if(!isSelectorLockActive(tutorial, definition)) return;
    if(event.target.closest(definition.selector)) return;
    if(event.target.closest(".tutorial-guide,.tutorial-launcher,.tutorial-abandon-backdrop")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function intersectRects(a,b){
    const left = Math.max(a.left,b.left);
    const top = Math.max(a.top,b.top);
    const right = Math.min(a.right,b.right);
    const bottom = Math.min(a.bottom,b.bottom);
    return {
      left, top, right, bottom,
      width:Math.max(0,right-left),
      height:Math.max(0,bottom-top)
    };
  }

  function getElementVisibleRect(element){
    let visible = element.getBoundingClientRect();
    if(visible.width <= 0 || visible.height <= 0) return null;
    visible = intersectRects(visible,{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight});
    for(let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement){
      const style = getComputedStyle(parent);
      const clips = /(auto|scroll|hidden|clip)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);
      if(!clips) continue;
      visible = intersectRects(visible,parent.getBoundingClientRect());
      if(visible.width <= 4 || visible.height <= 4) return null;
    }
    return visible.width > 4 && visible.height > 4 ? visible : null;
  }

  function ensureTargetInView(element, selector){
    const visible = getElementVisibleRect(element);
    if(visible) return visible;
    const key = `${store.state?.tutorial?.step || ""}:${selector}`;
    const now = performance.now();
    if(key !== lastAutoScrollKey || now - lastAutoScrollAt > 700){
      lastAutoScrollKey = key;
      lastAutoScrollAt = now;
      element.scrollIntoView?.({block:"center", inline:"center", behavior:"smooth"});
    }
    return null;
  }

  function findVisibleTarget(selector){
    return [...document.querySelectorAll(selector)].find(element=>{
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }) || null;
  }

  function getTutorialStatusSnapshot(){
    return game?.getTutorialSnapshot?.({type:"player"}) || null;
  }

  function syncArrow(definition = currentDefinition()){
    if(!arrow || !definition || definition.mode !== appMode){
      setHighlightedElement();
      arrow?.classList.add("hidden");
      return null;
    }
    if(isTransmissionBlocking() && !shouldShowInstructionArrow(definition)){
      setHighlightedElement();
      arrow.classList.add("hidden");
      return null;
    }
    if(definition.handoff && dismissedStep !== store.state?.tutorial?.step){
      setHighlightedElement();
      arrow.classList.add("hidden");
      return null;
    }
    if(definition.selector){
      const target = findVisibleTarget(definition.selector);
      if(target){
        const rect = ensureTargetInView(target, definition.selector);
        if(!rect){
          setHighlightedElement();
          arrow.classList.add("hidden");
          return null;
        }
        setHighlightedElement(target);
        placeArrowAt(rect.left + rect.width/2, Math.max(68,rect.top-8));
        return getTutorialStatusSnapshot();
      }
    }
    setHighlightedElement();
    if(definition.world && game?.getTutorialSnapshot){
      const worldTarget = typeof definition.world === "function" ? definition.world(store.state) : definition.world;
      const snapshot = game.getTutorialSnapshot(worldTarget);
      const target = snapshot?.target;
      const bounds = snapshot?.canvas;
      if(!target || !bounds){ arrow.classList.add("hidden"); return snapshot; }
      if(definition.arrowMode === "world-anchor"){
        const visible = target.screenX >= bounds.left+28 && target.screenX <= bounds.right-28
          && target.screenY >= bounds.top+80 && target.screenY <= bounds.bottom-28;
        if(!visible){ arrow.classList.add("hidden"); return snapshot; }
        placeArrowAt(target.screenX, target.screenY-72, 0, false);
        return snapshot;
      }
      if(definition.arrowMode === "player-direction" && snapshot.player){
        const playerX = Number(snapshot.player.screenX);
        const playerY = Number(snapshot.player.screenY)-104;
        const angle = Math.atan2(target.screenY-snapshot.player.screenY,target.screenX-snapshot.player.screenX) - Math.PI/2;
        placeArrowAt(playerX, playerY, angle, true, "world-direction");
        return snapshot;
      }
      const margin = 42;
      const x = Math.max(bounds.left+margin,Math.min(bounds.right-margin,target.screenX));
      const y = Math.max(bounds.top+margin,Math.min(bounds.bottom-margin,target.screenY));
      const directional = x !== target.screenX || y !== target.screenY;
      const angle = Math.atan2(target.screenY-y,target.screenX-x) - Math.PI/2;
      placeArrowAt(x,y,angle,directional,directional ? "world-direction" : "");
      return snapshot;
    }
    arrow.classList.add("hidden");
    return getTutorialStatusSnapshot();
  }

  function tick(){
    ensureDom();
    const now = performance.now();
    typewriter.update(Math.min(.1,(now-lastTick)/1000));
    lastTick = now;
    const tutorial = store.state?.tutorial;
    if(tutorial?.status === "pending" && store.state?.player?.firmSelected && multiplayer?.connected) send("start");
    const definition = currentDefinition();
    const snapshot = syncArrow(definition);
    if(!pending && tutorial?.status === "active" && definition?.mode === appMode && definition.condition?.(store.state,snapshot)) advance();
  }

  function handleDocumentClick(event){
    const tutorial = store.state?.tutorial;
    const definition = currentDefinition();
    if(tutorial?.status !== "active" || definition?.mode !== appMode || !definition?.click || !definition.selector) return;
    if(definition.handoff && dismissedStep !== tutorial.step) return;
    if(event.target.closest(definition.selector)) window.setTimeout(advance, 80);
  }

  function refresh(){ pending=false; render(); }

  function init(){
    ensureDom();
    document.addEventListener("click", handleTutorialLockedClick, true);
    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("voidsector:profile-applied", refresh);
    window.addEventListener("voidsector:multiplayer-change", event=>{
      const reason = String(event.detail?.reason || "");
      if(reason === "quest:accepted"
        && store.state?.tutorial?.status === "active"
        && TUTORIAL_QUEST_IDS.includes(String(event.detail?.payload?.id || ""))){
        game?.closeTutorialInteractionPanel?.();
        root?.classList.add("hidden");
      }
      const tutorialUpdate = event.detail?.payload?.tutorial;
      if(reason === "tutorial:updated" && tutorialUpdate && typeof tutorialUpdate === "object"){
        store.state.tutorial = sanitizeTutorialState(tutorialUpdate, {missingStatus:store.state?.tutorial?.status || "abandoned"});
      }
      const rewardItemId = String(event.detail?.payload?.rewardItemId || "");
      if(reason === "tutorial:updated" && rewardItemId === "laser_mk3") showRewardAnimation(rewardItemId);
      if(reason.startsWith("tutorial:")) refresh();
    });
    const observer = new MutationObserver(()=>syncArrow());
    observer.observe(document.body,{subtree:true,childList:true});
    window.setInterval(tick,100);
    render();
  }

  return {init,render};
}
