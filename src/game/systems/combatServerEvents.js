import { portals } from "../../data/catalog.js";
import { addAmmo, addReputationFromXp, addXP, getAllQuests, markPortalCompleted, registerKill, saveState, store } from "../../core/store.js";
import { fmt } from "../../core/utils.js";
import { SAFE_ZONE_DELAY } from "../combatData.js";
import { buildPortalEnvironment, createPortalMap } from "./portalState.js";

export function createCombatServerEventSystem({
  multiplayer,
  getState,
  setState,
  cargo,
  beams,
  rewards,
  panels,
  damagePlayer,
  pushDamageText,
  spawnPortalExit,
  showToast,
  updateHud,
  updateLootPopup,
  portalStartingLives
}){
  function getCurrentMapToken(map){
    return String(map?.id ?? map?.name ?? "");
  }

  function loadPortalArena(event){
    const portal = portals.find(p=>p.id === event?.portal?.id) || portals[0];
    const currentMap = createPortalMap(portal);
    const environment = buildPortalEnvironment(portal.id, currentMap);
    const {player, missileSalvos} = getState();
    cargo.clear();
    player.x = Number(event?.spawn?.x || currentMap.spawn.x || 0);
    player.y = Number(event?.spawn?.y || currentMap.spawn.y || 0);
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.safeZoneLock = SAFE_ZONE_DELAY;
    missileSalvos.clear();
    beams.clear();
    setState({
      gameMode:"portal",
      activePortal:portal,
      portalWave:Math.max(1, Number(event?.wave || 1)),
      portalDelay:0,
      portalCompleted:false,
      portalLives:portalStartingLives,
      currentMap,
      enemies:[],
      asteroids:environment.asteroids,
      stars:environment.stars,
      dust:environment.dust,
      nebulae:environment.nebulae,
      moveTarget:null,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[],
      particles:[],
      damageTexts:[],
      teleportLock:1.2
    });
    panels.closeSpawnPanel();
    showToast(`${portal.name} lance cote serveur pour le groupe.`);
    updateHud();
  }

  function applyPortalEvents(){
    if(multiplayer.portalStartEvents?.length){
      const event = multiplayer.portalStartEvents.pop();
      multiplayer.portalStartEvents = [];
      loadPortalArena(event);
    }
    if(!multiplayer.portalCompleteEvents?.length) return;
    const events = multiplayer.portalCompleteEvents.splice(0);
    for(const event of events){
      const {activePortal, portalCompleted} = getState();
      const portal = portals.find(p=>p.id === event?.portal?.id) || activePortal;
      if(!portal || portalCompleted) continue;
      setState({activePortal:portal, portalCompleted:true});
      const reward = event.reward || {};
      markPortalCompleted(portal.id);
      store.state.player.credits += Math.max(0, Math.round(Number(reward.credits || 0)));
      store.state.player.premium += Math.max(0, Math.round(Number(reward.premium || 0)));
      addAmmo("ammo_x4", Math.max(0, Math.round(Number(reward.ammoX4 || 0))));
      addAmmo("ammo_x6", Math.max(0, Math.round(Number(reward.ammoX6 || 0))));
      const xp = Math.max(0, Math.round(Number(reward.xp || 0)));
      if(xp > 0 && addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de competence.`);
      spawnPortalExit();
      rewards.showLootNotice({
        message:"Portail serveur termine",
        credits:reward.credits || 0,
        xp,
        premium:reward.premium || 0,
        ammo:[
          ...(reward.ammoX4 ? [`+${fmt(reward.ammoX4)} munitions x4`] : []),
          ...(reward.ammoX6 ? [`+${fmt(reward.ammoX6)} munitions x6`] : [])
        ]
      });
      showToast(`${portal.name} termine cote serveur.`);
      saveState();
      updateHud();
    }
  }

  function applyDamageEvents(){
    if(!multiplayer.playerDamageEvents?.length) return;
    const {player, currentMap} = getState();
    const remaining = [];
    for(const event of multiplayer.playerDamageEvents){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      if(player.isDead) continue;
      const amount = Math.max(0, Math.round(Number(event.amount || 0)));
      if(amount <= 0) continue;
      damagePlayer(amount);
      pushDamageText({x:player.x, y:player.y - 58, value:amount, color:"rgba(248,113,113,", shadowColor:"rgba(248,113,113,.78)"});
    }
    multiplayer.playerDamageEvents = remaining;
  }

  function applyRewardEvents(){
    if(!multiplayer.playerRewardEvents?.length) return;
    const {currentMap} = getState();
    const remaining = [];
    for(const event of multiplayer.playerRewardEvents){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      const credits = Math.max(0, Math.round(Number(event.credits || 0)));
      const xp = Math.max(0, Math.round(Number(event.xp || 0)));
      const premium = Math.max(0, Math.round(Number(event.premium || 0)));
      const rankPoints = registerKill(event.enemyType || "server_enemy", event.enemyLevel);
      const reputation = addReputationFromXp(xp);
      if(credits > 0) store.state.player.credits += credits;
      if(premium > 0) store.state.player.premium += premium;
      if(xp > 0 && addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de competence.`);
      rewards.showLootNotice?.({message:`${event.enemyType || "Ennemi"} detruit`, credits, xp, reputation, rankPoints, premium});
      const shareLabel = Number(event.share || 1) < 1 ? " (partage groupe 50%)" : "";
      showToast(`Butin serveur${shareLabel} : +${fmt(credits)} credits${premium ? `, +${fmt(premium)} NOVA` : ""}, +${fmt(xp)} XP, +${fmt(reputation)} reputation.`);
      saveState();
    }
    multiplayer.playerRewardEvents = remaining;
    updateLootPopup();
    updateHud();
  }

  function applyLootDropEvents(){
    if(!multiplayer.lootDropEvents?.length) return;
    const {player, currentMap} = getState();
    const remaining = [];
    for(const event of multiplayer.lootDropEvents){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      if(event.kind !== "portalPiece") continue;
      const portal = portals.find(item=>item.id === event.portalId);
      if(!portal) continue;
      cargo.spawnPortalPieceDrop(
        {x:Number(event.x || player.x), y:Number(event.y || player.y)},
        portal,
        {
          uid:event.id,
          x:Number(event.x || player.x),
          y:Number(event.y || player.y),
          expiresAt:Number(event.expiresAt || Date.now() + 60000)
        }
      );
      showToast(`Piece ${portal.name} detectee au sol.`);
    }
    multiplayer.lootDropEvents = remaining;
  }

  function applyQuestProgressEvents(){
    if(!multiplayer.questProgressEvents?.length) return;
    const quests = getAllQuests();
    let changed = false;
    for(const event of multiplayer.questProgressEvents){
      const updates = Array.isArray(event.updates) ? event.updates : [];
      for(const update of updates){
        const quest = quests.find(entry=>entry.id === update?.id);
        if(!quest) continue;
        if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
        const previous = Math.max(0, Number(store.state.questProgress[quest.id] || 0));
        const target = Number(update.target || quest.objective?.count || 0);
        const next = Number.isFinite(Number(update.delta))
          ? Math.min(target, previous + Math.max(0, Number(update.delta || 0)))
          : Math.max(previous, Math.min(target, Number(update.progress || 0)));
        if(next <= previous) continue;
        store.state.questProgress[quest.id] = next;
        changed = true;
        if(update.completed) showToast(`Objectif serveur termine : ${quest.title}.`);
      }
    }
    multiplayer.questProgressEvents = [];
    if(changed){
      saveState();
      updateHud();
    }
  }

  function applyAll(){
    applyDamageEvents();
    applyRewardEvents();
    applyLootDropEvents();
    applyQuestProgressEvents();
    applyPortalEvents();
  }

  return {
    loadPortalArena,
    applyPortalEvents,
    applyDamageEvents,
    applyRewardEvents,
    applyLootDropEvents,
    applyQuestProgressEvents,
    applyAll
  };
}
