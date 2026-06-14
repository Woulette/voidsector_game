export function createQuestNpcDialogue({
  canvas,
  multiplayer,
  getCamera,
  getCurrentMap,
  getPlayer,
  stopPlayerMovement,
  getActiveQuests,
  getQuestObjectiveProgress,
  getInventoryCount,
  progressServerQuest,
  recordQuestNpcTalk,
  saveState,
  getSpawnPanelMode,
  renderSpawnInteractionPanel,
  updateHud,
  showToast
}){
  let dialogueState = null;

  function findAt(world){
    const npcs = Array.isArray(getCurrentMap()?.questNpcs) ? getCurrentMap().questNpcs : [];
    return npcs.find(npc=>Math.hypot(world.x - npc.x, world.y - npc.y) <= (npc.radius || 90)) || null;
  }

  function getObjectiveState(quest, objectiveId){
    const objective = quest?.objectives?.find(entry=>entry.id === objectiveId);
    if(!quest || !objective) return {progress:0, target:0};
    const index = quest.objectives.indexOf(objective);
    const key = objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
    return {
      progress:getQuestObjectiveProgress(quest.id, key),
      target:Number(objective.count || 0)
    };
  }

  function isObjectiveDone(quest, objectiveId){
    const state = getObjectiveState(quest, objectiveId);
    return state.target > 0 && state.progress >= state.target;
  }

  function questSourceId(quest){
    return String(quest?.sourceQuestId || quest?.id || "");
  }

  function getRickyQuest(sourceQuestId, npc){
    return getActiveQuests().find(entry=>
      questSourceId(entry) === sourceQuestId
      && entry.objectives?.some(objective=>objective.npcId === npc.id)
    ) || null;
  }

  function getLevelFiveDialogue(npc){
    const quest = getRickyQuest("quest_lv5_call_for_help", npc);
    if(!quest) return null;
    if(!isObjectiveDone(quest, "portal_coord")) return {lines:["Approche du portail ferme, je capte mal ton signal."], progress:false};
    if(!isObjectiveDone(quest, "talk_start")){
      return {lines:["Mon petit fils !!", "J'ai merder mon petit fils et coince a l'interieur avec mon pistou portgun.", "Arh c'est pas le moment ! ont se fait attaquer."], progress:true};
    }
    const combatDone = ["traqueurs", "parasites", "vorak", "orbes"].every(id=>isObjectiveDone(quest, id));
    if(combatDone && !isObjectiveDone(quest, "talk_return")){
      return {lines:["Belle bete tu les as bien remis a leur place.", "Il faudrait me trouver du fluide de teleportation mais ici il n'y en as pas essaye de voir en magasin."], progress:true};
    }
    if(!combatDone) return {lines:["Nettoie la zone d'abord ! 2 traqueurs abyssaux, 6 parasites, 8 Vorak et 15 orbes, puis reviens me voir."], progress:false};
    if(!isObjectiveDone(quest, "fluides")){
      const fluides = getInventoryCount("teleportation_fluid");
      if(fluides >= 10) return {
        lines:["Ahah impressionant. Retourne a ta station reviens me voir une fois plus aguerris j'aurais encore besoin de toi"],
        progress:true,
        progressType:"deliver_item",
        itemId:"teleportation_fluid"
      };
      return {lines:[`Il me faut 10 fluides de teleportation. Tu en as ${fluides}/10. Regarde dans les extras du magasin.`], progress:false};
    }
    return {lines:["Le portail ne bougera pas sans pieces. On aura encore du boulot."], progress:false};
  }

  function getLevelTenDialogue(npc){
    const quest = getRickyQuest("quest_lv10_maintenance_impossible", npc);
    if(!quest) return null;
    if(!isObjectiveDone(quest, "talk_start")){
      return {
        lines:[
          "Ah, te voila. Le pilote qui m'a ramene des fluides sans demander a quoi ca servait. J'adore ce genre d'obeissance.",
          "Petit detail : les fluides ne servent pas a ouvrir le portail. Ils serviront a sortir en cas d'urgence. Nuance importante si tu tiens a ne pas finir recycle en lumiere bleue.",
          "Le portail, lui, est casse pour une raison beaucoup plus stupide : il lui manque des pieces de stabilisation.",
          "Et comme l'univers adore me faire perdre du temps, ces pieces sont dans la zone 4. Zone a risque eleve, monstres agressifs, taux de survie discutable... bref, un endroit parfait pour toi.",
          "Va la-bas, demonte ce qui bouge, recupere 5 pieces de stabilisation et ramene-les-moi."
        ],
        progress:true
      };
    }
    if(!isObjectiveDone(quest, "stabilisateurs")){
      const state = getObjectiveState(quest, "stabilisateurs");
      return {
        lines:[
          `Il me faut 5 pieces de stabilisation. Pas 4, pas "presque 5", 5. Tu en as ${state.progress}/${state.target}.`,
          "Les fluides, je les garde pour la sortie d'urgence. Les pieces, elles, servent a empecher le portail de transformer ton vaisseau en confettis quantiques."
        ],
        progress:false
      };
    }
    if(!isObjectiveDone(quest, "talk_return")){
      return {
        lines:[
          "Oh, tu les as.",
          "Je vais noter quelque part que t'es capable de suivre une instruction simple sous pression. C'est rare.",
          "Donne-moi ca. Avec ces pieces, je peux enfin remettre l'armature du portail dans un etat moins insultant pour la science.",
          "Le temps que je termine de reparer ce portail, je te conseille vivement d'aller te preparer.",
          "Retourne au controleur de mission. Ils adorent cocher des cases pendant que moi je fais le vrai boulot."
        ],
        progress:true
      };
    }
    if(!isObjectiveDone(quest, "mission_control")){
      return {lines:["Je repare. Toi, tu retournes au controleur de mission. C'est le gros relais de quetes, au cas ou le concept de \"retourner\" serait trop abstrait."], progress:false};
    }
    return {lines:["Le portail est en cours de stabilisation. Reviens quand tu seras equipe pour autre chose qu'une promenade de sante."], progress:false};
  }

  function getDeadlyRescueDialogue(npc){
    const quest = getRickyQuest("quest_lv10_sauvons_deadly", npc);
    if(!quest) return null;
    if(!isObjectiveDone(quest, "portal")){
      return {lines:["Deadly est toujours coince dans le portail. Tu comptes le sauver ou attendre qu'il se recycle tout seul ?"], progress:false};
    }
    if(!isObjectiveDone(quest, "talk_return")){
      return {
        lines:[
          "Ah, te voilà encore vivant. Honnêtement, j'avais déjà commencé à réfléchir à une façon rentable de recycler les morceaux de ton vaisseau.",
          "J'ai remarqué. Les explosions, les alarmes dimensionnelles et la moitié de mes capteurs qui ont grillé étaient des indices plutôt subtils.",
          "Mais bon... tu as réussi, tu n'as pas détruit l'univers et Deadly respire encore. Pour quelqu'un comme toi, c'est presque impressionnant.",
          "Prends ta récompense et dégage avant que je décide de te facturer les réparations du portail."
        ],
        progress:true
      };
    }
    return {lines:["Deadly respire encore. Profite de ce miracle statistique et laisse-moi travailler."], progress:false};
  }

  function getDialogue(npc){
    if(!String(npc.id || "").endsWith("02_portal_mechanic")) return {lines:[`${npc.name || "PNJ"} n'a rien a te demander pour le moment.`], progress:false};
    const deadlyRescueDialogue = getDeadlyRescueDialogue(npc);
    if(deadlyRescueDialogue) return deadlyRescueDialogue;
    const levelTenDialogue = getLevelTenDialogue(npc);
    if(levelTenDialogue) return levelTenDialogue;
    const levelFiveDialogue = getLevelFiveDialogue(npc);
    if(levelFiveDialogue) return levelFiveDialogue;
    return {lines:["Signal bloque. Passe par le relais de quetes avant de revenir."], progress:false};
  }

  function getPanel(){
    let panel = document.getElementById("npcDialoguePanel");
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "npcDialoguePanel";
    panel.className = "npc-dialogue hidden";
    panel.innerHTML = `
      <div class="npc-dialogue-box">
        <div class="npc-dialogue-head"><span data-npc-name></span><button type="button" class="npc-dialogue-close" aria-label="Fermer le dialogue">x</button></div>
        <p><span data-npc-line></span><i class="npc-dialogue-cursor"></i></p>
      </div>`;
    document.getElementById("gameScreen")?.appendChild(panel);
    panel.addEventListener("click", event=>{
      event.preventDefault();
      if(event.target.closest(".npc-dialogue-close")) close();
      else advance();
    });
    return panel;
  }

  function position(){
    if(!dialogueState?.npc) return false;
    const panel = getPanel();
    if(panel.classList.contains("hidden")) return false;
    const camera = getCamera();
    const rect = canvas.getBoundingClientRect();
    const zoom = Number(camera.zoom || 1);
    const npc = dialogueState.npc;
    const rawX = rect.left + (Number(npc.x || 0) - camera.x) * zoom;
    const rawY = rect.top + (Number(npc.y || 0) - camera.y - Number(npc.size || 120) * .68) * zoom;
    if(rawX < -90 || rawX > window.innerWidth + 90 || rawY < -90 || rawY > window.innerHeight + 90){
      close();
      return false;
    }
    const width = Math.min(440, Math.max(300, window.innerWidth - 32));
    const margin = 14;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rawX - width / 2));
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(82, Math.min(window.innerHeight - 190, rawY - 132))}px`;
    panel.style.setProperty("--npc-arrow-x", `${Math.max(28, Math.min(width - 28, rawX - left))}px`);
    return true;
  }

  function render(){
    const panel = getPanel();
    const line = dialogueState?.lines?.[dialogueState.index] || "";
    panel.querySelector("[data-npc-name]").textContent = dialogueState?.npc?.name || "PNJ";
    dialogueState.lineText = line;
    dialogueState.visibleText = "";
    dialogueState.charIndex = 0;
    dialogueState.typeTimer = 0;
    panel.querySelector("[data-npc-line]").textContent = "";
    panel.classList.remove("hidden", "visible", "line-swap");
    position();
    requestAnimationFrame(()=>{
      panel.classList.add("visible", "line-swap");
      window.setTimeout(()=>panel.classList.remove("line-swap"), 220);
    });
  }

  function close(){
    const panel = document.getElementById("npcDialoguePanel");
    panel?.classList.remove("visible", "line-swap");
    panel?.classList.add("hidden");
    dialogueState = null;
  }

  function advance(){
    if(!dialogueState) return;
    if((dialogueState.charIndex || 0) < String(dialogueState.lineText || "").length){
      dialogueState.charIndex = String(dialogueState.lineText || "").length;
      dialogueState.visibleText = dialogueState.lineText || "";
      document.getElementById("npcDialoguePanel")?.querySelector("[data-npc-line]")?.replaceChildren(document.createTextNode(dialogueState.visibleText));
      return;
    }
    dialogueState.index += 1;
    if(dialogueState.index < dialogueState.lines.length){
      render();
      return;
    }
    const npc = dialogueState.npc;
    const shouldProgress = dialogueState.progress;
    const progressType = dialogueState.progressType || "talk_npc";
    const itemId = dialogueState.itemId || "";
    close();
    const currentMap = getCurrentMap();
    const progressed = shouldProgress && (multiplayer.connected
      ? progressServerQuest({type:progressType, itemId, npcId:npc.id, zoneName:currentMap.name})
      : recordQuestNpcTalk(npc.id, currentMap.name));
    if(progressed){
      saveState();
      const panelMode = getSpawnPanelMode();
      if(panelMode) renderSpawnInteractionPanel(panelMode);
      updateHud();
      if(!multiplayer.connected) showToast("Objectif mis a jour.");
    }
  }

  function interact(npc){
    const dialogue = getDialogue(npc);
    dialogueState = {
      npc,
      lines:dialogue.lines,
      progress:dialogue.progress,
      progressType:dialogue.progressType,
      itemId:dialogue.itemId,
      index:0
    };
    stopPlayerMovement();
    render();
  }

  function update(dt){
    if(!dialogueState || !position()) return;
    const line = String(dialogueState.lineText || "");
    if((dialogueState.charIndex || 0) >= line.length) return;
    dialogueState.typeTimer = Number(dialogueState.typeTimer || 0) + dt * 42;
    const nextIndex = Math.min(line.length, Math.floor(dialogueState.typeTimer));
    if(nextIndex <= (dialogueState.charIndex || 0)) return;
    dialogueState.charIndex = nextIndex;
    dialogueState.visibleText = line.slice(0, nextIndex);
    const target = document.getElementById("npcDialoguePanel")?.querySelector("[data-npc-line]");
    if(target) target.textContent = dialogueState.visibleText;
  }

  return {close, findAt, interact, update};
}
