import { portals } from "../../data/catalog.js";
import { addAmmo, addReputationFromXp, addXP, getAllQuests, markPortalCompleted, registerKill, saveState, store } from "../../core/store.js";
import { fmt } from "../../core/utils.js";
import { SAFE_ZONE_DELAY } from "../combatData.js";
import { createProjectile } from "./projectiles.js";
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
  applyPlayerPoison,
  clearPoison,
  pushDamageText,
  spawnPortalExit,
  showToast,
  updateHud,
  updateLootPopup,
  portalStartingLives
}){
  const processedRewardIds = new Set();

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
      const rewardAppliedByServer = Boolean(event.rewardAppliedByServer);
      if(!rewardAppliedByServer){
        markPortalCompleted(portal.id);
        store.state.player.credits += Math.max(0, Math.round(Number(reward.credits || 0)));
        store.state.player.premium += Math.max(0, Math.round(Number(reward.premium || 0)));
        addAmmo("ammo_x4", Math.max(0, Math.round(Number(reward.ammoX4 || 0))));
        addAmmo("ammo_x6", Math.max(0, Math.round(Number(reward.ammoX6 || 0))));
      }
      const xp = Math.max(0, Math.round(Number(reward.xp || 0)));
      if(!rewardAppliedByServer && xp > 0 && addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de competence.`);
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
      const poison = event.damageType === "poison";
      damagePlayer(amount, {
        recordQuestHpLoss:false,
        bypassShield:poison,
        allowDamageToHp:!poison
      });
      pushDamageText({
        x:player.x,
        y:player.y - 58,
        value:poison ? `-${amount}` : amount,
        color:poison ? "rgba(74,222,128," : "rgba(248,113,113,",
        shadowColor:poison ? "rgba(34,197,94,.78)" : "rgba(248,113,113,.78)"
      });
    }
    multiplayer.playerDamageEvents = remaining;
  }

  function applyStatusEffectEvents(){
    if(!multiplayer.playerStatusEffectEvents?.length) return;
    for(const event of multiplayer.playerStatusEffectEvents.splice(0)){
      if(event?.type !== "poison") continue;
      if(event.active === false) clearPoison?.();
      else applyPlayerPoison?.({...event, serverAuthoritative:true});
    }
  }

  function applyEnemyAttackEvents(){
    if(!multiplayer.enemyAttackEvents?.length) return;
    const {player, currentMap, enemies, bullets, particles} = getState();
    const remaining = [];
    for(const event of multiplayer.enemyAttackEvents){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      const enemy = enemies.find(entry=>String(entry.id) === String(event.enemyId || event.sourceId));
      if(enemy){
        enemy.attackT = Math.max(Number(enemy.attackT || 0), Number(event.life || .22));
        enemy.recentHitTimer = Math.max(Number(enemy.recentHitTimer || 0), .35);
      }
      const fromX = Number(event.fromX ?? enemy?.x ?? player.x);
      const fromY = Number(event.fromY ?? enemy?.y ?? player.y);
      const toX = Number(event.toX ?? player.x);
      const toY = Number(event.toY ?? player.y);
      const distance = Math.hypot(toX - fromX, toY - fromY) || 1;
      const speed = Math.max(120, Number(event.projectileSpeed || enemy?.projectileSpeed || 600));
      bullets.push(createProjectile({
        owner:"serverEnemy",
        startX:fromX,
        startY:fromY,
        targetId:"player",
        damage:0,
        travelTime:Math.max(.11, Math.min(1.15, distance / speed + .06)),
        radius:5,
        color:event.color || enemy?.color || "rgba(248,113,113,.95)",
        particle:event.particle || enemy?.particle || "rgba(252,165,165,.75)",
        sourceId:event.enemyId || event.sourceId,
        hitChance:1,
        visualOnly:true
      }));
      particles.push({x:fromX, y:fromY, life:.16, max:.16, size:16, color:event.particle || enemy?.particle || "rgba(252,165,165,.72)"});
    }
    multiplayer.enemyAttackEvents = remaining;
  }

  function applyCombatHitEvents(){
    if(!multiplayer.combatEvents?.length) return;
    const {enemies} = getState();
    const events = multiplayer.combatEvents.splice(0);
    const remaining = [];
    for(const event of events){
      const enemy = enemies.find(entry=>String(entry.id) === String(event.enemyId));
      if(!enemy){
        const x = Number(event.x);
        const y = Number(event.y);
        if(Number.isFinite(x) && Number.isFinite(y)){
          const damage = Math.max(0, Math.round(Number(event.damage || 0)));
          pushDamageText({
            x,
            y:y - Math.max(16, Number(event.radius || 0) + 16),
            value:damage > 0 ? damage : "MISS",
            ...(damage > 0 ? {} : {color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"})
          });
        }else if((performance.now() - Number(event.receivedAt || 0)) < 1000) remaining.push(event);
        continue;
      }
      const damage = Math.max(0, Math.round(Number(event.damage || 0)));
      if(damage > 0){
        pushDamageText({x:enemy.x, y:enemy.y - enemy.radius - 16, value:damage});
      }else{
        pushDamageText({x:enemy.x, y:enemy.y - enemy.radius - 16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
      }
    }
    multiplayer.combatEvents = remaining;
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
      const rewardId = event.rewardId || `${event.enemyId || "enemy"}:${event.killerId || "killer"}:${event.mapId || "map"}:${event.at || 0}`;
      if(processedRewardIds.has(rewardId)) continue;
      processedRewardIds.add(rewardId);
      if(processedRewardIds.size > 300){
        const oldest = processedRewardIds.values().next().value;
        processedRewardIds.delete(oldest);
      }
      const credits = Math.max(0, Math.round(Number(event.credits || 0)));
      const xp = Math.max(0, Math.round(Number(event.xp || 0)));
      const premium = Math.max(0, Math.round(Number(event.premium || 0)));
      const rewardAppliedByServer = Boolean(event.rewardAppliedByServer);
      const rankPoints = rewardAppliedByServer ? Math.max(0, Number(event.rankPoints || 0)) : registerKill(event.enemyType || "server_enemy", event.enemyLevel);
      const reputation = rewardAppliedByServer ? Math.max(0, Math.round(Number(event.reputation || 0))) : addReputationFromXp(xp);
      if(!rewardAppliedByServer){
        if(credits > 0) store.state.player.credits += credits;
        if(premium > 0) store.state.player.premium += premium;
        if(xp > 0 && addXP(xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de competence.`);
      }
      rewards.showLootNotice?.({credits, xp, reputation, rankPoints, premium});
      const shareLabel = Number(event.share || 1) < 1 ? " (partage groupe 50%)" : "";
      showToast(`Butin serveur${shareLabel} : +${fmt(credits)} credits${premium ? `, +${fmt(premium)} NOVA` : ""}, +${fmt(xp)} XP, +${fmt(reputation)} reputation.`);
      if(!rewardAppliedByServer) saveState();
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
      if(event.kind === "portalPiece"){
        const portal = portals.find(item=>item.id === event.portalId);
        if(!portal) continue;
        cargo.spawnPortalPieceDrop(
          {x:Number(event.x || player.x), y:Number(event.y || player.y)},
          portal,
          {
            uid:event.id,
            x:Number(event.x || player.x),
            y:Number(event.y || player.y),
            expiresAt:Number(event.expiresAt || Date.now() + 60000),
            serverControlled:Boolean(event.serverControlled)
          }
        );
        showToast(`Piece ${portal.name} detectee au sol.`);
        continue;
      }
      cargo.spawnServerLootDrop?.({
        ...event,
        x:Number(event.x || player.x),
        y:Number(event.y || player.y),
        expiresAt:Number(event.expiresAt || Date.now() + 60000),
        serverControlled:Boolean(event.serverControlled)
      });
      const amountLabel = Number(event.amount || 1) > 1 ? ` x${event.amount}` : "";
      showToast(`${event.name || "Butin serveur"}${amountLabel} detecte au sol.`);
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
        const objectiveKey = update.objectiveKey ? String(update.objectiveKey) : "";
        const hasMultipleObjectives = Array.isArray(quest.objectives) && quest.objectives.length > 1;
        const stored = store.state.questProgress[quest.id];
        const previous = objectiveKey && hasMultipleObjectives
          ? Math.max(0, Number((stored && typeof stored === "object" ? stored[objectiveKey] : 0) || 0))
          : Math.max(0, Number((stored && typeof stored === "object" ? 0 : stored) || 0));
        const target = Number(update.target || quest.objective?.count || 0);
        const next = Number.isFinite(Number(update.progress))
          ? Math.max(previous, Math.min(target, Number(update.progress || 0)))
          : Math.min(target, previous + Math.max(0, Number(update.delta || 0)));
        if(next <= previous) continue;
        if(objectiveKey && hasMultipleObjectives){
          if(!store.state.questProgress[quest.id] || typeof store.state.questProgress[quest.id] !== "object") store.state.questProgress[quest.id] = {};
          store.state.questProgress[quest.id][objectiveKey] = next;
        }else{
          store.state.questProgress[quest.id] = next;
        }
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

  function applyQuestFailureEvents(){
    if(!multiplayer.questFailureEvents?.length) return;
    let changed = false;
    if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
    if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
    for(const event of multiplayer.questFailureEvents){
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
        const quest = getAllQuests().find(entry=>entry.id === (failed?.questId || failed?.id));
        const questId = failed?.questId || failed?.id;
        if(!questId) continue;
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
    multiplayer.questFailureEvents = [];
    if(changed){
      saveState();
      updateHud();
    }
  }

  function applyAll(){
    applyEnemyAttackEvents();
    applyStatusEffectEvents();
    applyDamageEvents();
    applyCombatHitEvents();
    applyRewardEvents();
    applyLootDropEvents();
    applyQuestProgressEvents();
    applyQuestFailureEvents();
    applyPortalEvents();
  }

  return {
    loadPortalArena,
    applyPortalEvents,
    applyDamageEvents,
    applyCombatHitEvents,
    applyRewardEvents,
    applyLootDropEvents,
    applyQuestProgressEvents,
    applyQuestFailureEvents,
    applyAll
  };
}
