import { npcDialogueMarkup, updateNpcDialogueView } from "./npcDialogueView.js?v=20261024-ricky-bubble1";

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
  getCompletedPortalCount = ()=>0,
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
      return {
        lines:["Mon petit fils !!", "J'ai merder mon petit fils et coince a l'interieur avec mon pistou portgun.", "Arh c'est pas le moment ! ont se fait attaquer."],
        progress:true,
        progressOnLastLine:true
      };
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
      if(getInventoryCount("portal_anchor_key") < 1){
        if(getCompletedPortalCount("ricky") > 0){
          return {lines:["Tu as déjà réussi ce portail. Pour y retourner, il faudra trouver une nouvelle clé sur les monstres."], progress:false};
        }
        return {
          lines:[
            "Tu n'as plus de clé ? Je peux t'en refaire une. On ne va pas laisser Deadly coincé là-dedans.",
            "Reviens me voir si tu échoues encore. Mais dès que tu auras réussi ce portail une première fois, ce sera terminé : les prochaines clés, il faudra les trouver sur les monstres."
          ],
          progress:true
        };
      }
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
    panel.innerHTML = npcDialogueMarkup();
    document.getElementById("gameScreen")?.appendChild(panel);
    panel.addEventListener("click", event=>{
      event.preventDefault();
      if(event.target.closest(".npc-dialogue-close")) close();
      else if(event.target.closest("[data-npc-previous]")) previous();
      else advance();
    });
    document.addEventListener?.("keydown", event=>{
      if(!dialogueState || event.target?.closest?.("input,textarea,select,[contenteditable=true]")) return;
      if(!["Enter"," ","Escape","ArrowLeft"].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      if(event.repeat) return;
      if(event.key === "Escape") close();
      else if(event.key === "ArrowLeft") previous();
      else advance();
    }, true);
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
    const width = Math.min(480, Math.max(280, window.innerWidth - 32));
    const margin = 14;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rawX - width / 2));
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    const height = panel.getBoundingClientRect?.().height || 200;
    const belowTop = rawY + Number(npc.size || 120) * 1.36 * zoom + 35;
    const below = rawY - height - 35 < 76 && belowTop + height <= window.innerHeight - 88;
    panel.classList[below ? "add" : "remove"]("npc-dialogue-below");
    panel.style.top = `${Math.max(76, Math.min(window.innerHeight - height - 88, below ? belowTop : rawY - height - 35))}px`;
    panel.style.setProperty("--npc-arrow-x", `${Math.max(44, Math.min(width - 36, rawX - left))}px`);
    return true;
  }

  function render(){
    const panel = getPanel();
    const line = dialogueState?.lines?.[dialogueState.index] || "";
    dialogueState.lineText = line;
    dialogueState.visibleText = "";
    dialogueState.charIndex = 0;
    dialogueState.typeTimer = 0;
    panel.querySelector("[data-npc-line]").textContent = "";
    updateNpcDialogueView(panel, dialogueState, true);
    panel.classList.remove("hidden", "line-swap");
    position();
    const rendering = dialogueState;
    requestAnimationFrame(()=>{
      if(dialogueState !== rendering) return;
      panel.classList.add("visible", "line-swap");
      window.setTimeout(()=>panel.classList.remove("line-swap"), 220);
    });
    if(dialogueState?.progressOnLastLine && dialogueState.index === dialogueState.lines.length - 1){
      progressDialogue(dialogueState);
    }
  }

  function close(){
    const panel = document.getElementById("npcDialoguePanel");
    panel?.classList.remove("visible", "line-swap");
    panel?.classList.add("hidden");
    dialogueState = null;
  }

  function progressDialogue(state){
    if(!state?.progress || state.progressCommitted) return false;
    const currentMap = getCurrentMap();
    const progressed = multiplayer.connected && progressServerQuest({
      type:state.progressType || "talk_npc",
      itemId:state.itemId || "",
      npcId:state.npc.id,
      zoneName:currentMap.name
    });
    if(!progressed) return false;
    state.progressCommitted = true;
    saveState();
    const panelMode = getSpawnPanelMode();
    if(panelMode) renderSpawnInteractionPanel(panelMode);
    updateHud();
    return true;
  }

  function advance(){
    if(!dialogueState) return;
    if((dialogueState.charIndex || 0) < String(dialogueState.lineText || "").length){
      dialogueState.charIndex = String(dialogueState.lineText || "").length;
      dialogueState.visibleText = dialogueState.lineText || "";
      document.getElementById("npcDialoguePanel")?.querySelector("[data-npc-line]")?.replaceChildren(document.createTextNode(dialogueState.visibleText));
      updateNpcDialogueView(getPanel(), dialogueState, false);
      return;
    }
    dialogueState.index += 1;
    if(dialogueState.index < dialogueState.lines.length){
      render();
      return;
    }
    const completedDialogue = dialogueState;
    close();
    progressDialogue(completedDialogue);
  }

  function previous(){
    if(!dialogueState || dialogueState.index <= 0) return;
    dialogueState.index -= 1;
    render();
    advance();
  }

  function interact(npc){
    const dialogue = getDialogue(npc);
    dialogueState = {
      npc,
      lines:dialogue.lines,
      progress:dialogue.progress,
      progressType:dialogue.progressType,
      itemId:dialogue.itemId,
      progressOnLastLine:Boolean(dialogue.progressOnLastLine),
      questTitle:["quest_lv10_sauvons_deadly","quest_lv10_maintenance_impossible","quest_lv5_call_for_help"].map(id=>getRickyQuest(id,npc)).find(Boolean)?.title || "Conversation avec Ricky",
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
    if(nextIndex === line.length) updateNpcDialogueView(getPanel(), dialogueState, false);
  }

  return {close, findAt, interact, update};
}
