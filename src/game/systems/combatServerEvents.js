import { portals } from "../../data/catalog.js";
import { fmt } from "../../core/utils.js";
import { SAFE_ZONE_DELAY } from "../combatData.js";
import { createProjectile } from "./projectiles.js";
import { buildPortalEnvironment, createPortalMap } from "./portalState.js";
import { createRemoteWeaponEventProcessor } from "./combatRemoteWeaponEvents.js";
import { createQuestServerEventProcessor } from "./combatQuestServerEvents.js";

const RICKY_ALLY_ID = "ricky_companion";
const RICKY_ROCKET_PROJECTILE = "assets/equipment/rocket_r2_projectile.png";
const MAX_SERVER_ENEMY_PROJECTILES = 32;

export function applyAuthoritativeCombatAmmo({event, playerId, ammoInventory} = {}){
  const consumed = Math.max(0, Math.round(Number(event?.consumed || 0)));
  const ammoId = String(event?.ammoId || "");
  if(consumed <= 0
    || !ammoId
    || String(event?.attackerId || "") !== String(playerId || "")
    || !ammoInventory){
    return false;
  }
  const authoritativeRemaining = Number(event?.ammoRemaining);
  if(Number.isFinite(authoritativeRemaining)){
    ammoInventory[ammoId] = Math.max(0, authoritativeRemaining);
  }else{
    const current = Math.max(0, Number(ammoInventory[ammoId] || 0));
    ammoInventory[ammoId] = Math.max(0, current - consumed);
  }
  return true;
}

export function applyAuthoritativeRewardProgression({event, player} = {}){
  const progression = event?.progression;
  if(!player || !progression || typeof progression !== "object") return false;
  for(const [field, value] of Object.entries(progression)){
    if(value === undefined) continue;
    player[field] = value;
  }
  return true;
}

export function getNpcDamageDisplayAmount(event = {}){
  const totalDamage = Number(event.amount);
  if(Number.isFinite(totalDamage)) return Math.max(0, Math.round(totalDamage));
  return Math.max(0, Math.round(Number(event.hpLost || 0)));
}

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
  applyPlayerSlow,
  clearPoison,
  clearSlow,
  pushDamageText,
  spawnPortalExit,
  showToast,
  updateHud,
  updateLootPopup,
  portalStartingLives,
  onPortalMapLoaded = ()=>{},
  applyServerDeath,
  applyServerRespawn
}){
  const processedRewardIds = new Set();
  function getCurrentMapToken(map){
    return String(map?.id ?? map?.name ?? "");
  }

  function updateSpectralDoubleShotCharge(status = {}){
    if(String(status?.abilityId || "") !== "spectral_double_shot") return false;
    const {player, store} = getState();
    if(!player) return false;
    const activeShipId = String(store?.state?.activeShip || "");
    const shipId = String(status.shipId || activeShipId || "");
    if(activeShipId && shipId && shipId !== activeShipId) return false;
    const now = Date.now();
    const activeUntil = Math.max(0, Number(status.activeUntil || 0));
    if(activeUntil <= now){
      delete player.spectralDoubleShotCharge;
      return false;
    }
    const chargeMs = Math.max(1, Number(status.chargeMs || 3_000));
    const chargeSegments = Math.max(1, Number(status.chargeSegments || 3));
    const chargeReadyAt = Math.max(0, Number(status.chargeReadyAt || now + chargeMs));
    const chargeStartedAt = Math.max(0, Number(status.chargeStartedAt || chargeReadyAt - chargeMs || now));
    player.spectralDoubleShotCharge = {
      abilityId:"spectral_double_shot",
      shipId,
      activeUntil,
      chargeMs,
      chargeSegments,
      chargeStartedAt,
      chargeReadyAt,
      receivedAt:now
    };
    return true;
  }

  const remoteWeaponEvents = createRemoteWeaponEventProcessor({
    multiplayer,
    getState,
    beams,
    getCurrentMapToken
  });
  const questEvents = createQuestServerEventProcessor({
    multiplayer,
    rewards,
    showToast,
    getProfileState:()=>getState()?.store?.state || null
  });

  function loadPortalArena(event){
    const portal = portals.find(p=>p.id === event?.portal?.id) || event?.portal || portals[0];
    const currentMap = createPortalMap(portal);
    const environment = buildPortalEnvironment(portal.id, currentMap);
    const {player, missileSalvos} = getState();
    cargo.clear();
    player.x = Number(event?.spawn?.x ?? currentMap.spawn.x ?? 0);
    player.y = Number(event?.spawn?.y ?? currentMap.spawn.y ?? 0);
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
      portalAlly:null,
      portalBeacons:[],
      portalObjective:event?.objective || null,
      portalCinematic:null,
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
    onPortalMapLoaded(currentMap);
    panels.closeSpawnPanel();
    if(!event?.resumed) showToast(`${portal.name} lance cote serveur pour le groupe.`);
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
      const portal = portals.find(p=>p.id === event?.portal?.id) || event?.portal || activePortal;
      if(!portal || portalCompleted) continue;
      setState({activePortal:portal, portalCompleted:true});
      const reward = event.reward || {};
      const xp = Math.max(0, Math.round(Number(reward.xp || 0)));
      if(portal.id !== "ricky") spawnPortalExit();
      const ammoRewards = [
        ...(reward.ammoX4 ? [`+${fmt(reward.ammoX4)} munitions x4`] : []),
        ...(reward.ammoX6 ? [`+${fmt(reward.ammoX6)} munitions x6`] : [])
      ];
      window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
        kind:"portal",
        enemyName:`Portail : ${portal.name}`,
        label:["Recompense de portail", ...ammoRewards].join(" - "),
        credits:Math.max(0, Math.round(Number(reward.credits || 0))),
        xp,
        premium:Math.max(0, Math.round(Number(reward.premium || 0))),
        at:event.at || Date.now()
      }}));
      rewards.showLootNotice({
        message:"Portail serveur termine",
        credits:reward.credits || 0,
        xp,
        premium:reward.premium || 0,
        ammo:ammoRewards,
        duration:15
      });
      showToast(portal.id === "ricky"
        ? `${portal.name} termine. Retour automatique dans 15 secondes.`
        : `${portal.name} termine cote serveur.`);
      updateHud();
    }
  }

  function applyRickyCinematicEvents(){
    if(!multiplayer.rickyCinematicEvents?.length) return;
    const event = multiplayer.rickyCinematicEvents.pop();
    multiplayer.rickyCinematicEvents = [];
    setState({
      portalCinematic:{
        target:event?.target || {x:0, y:-520},
        message:event?.message || "A l'aiiiideeee !!",
        durationMs:Number(event?.durationMs || 5600),
        startedAt:performance.now()
      },
      moveTarget:null,
      mouseMoveHeld:false
    });
    showToast("La breche centrale est ouverte.");
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
      const serverHp = Number(event.hp);
      const serverMaxHp = Number(event.maxHp);
      const serverShield = Number(event.shield);
      const serverMaxShield = Number(event.maxShield);
      const hasServerVitals = Number.isFinite(serverHp) || Number.isFinite(serverShield);
      const serverAgeMs = Number.isFinite(Number(event.at)) ? Date.now() - Number(event.at) : 0;
      const staleVisual = serverAgeMs > 2500;
      if(staleVisual && hasServerVitals){
        if(Number.isFinite(serverMaxHp) && serverMaxHp > 0) player.maxHp = serverMaxHp;
        if(Number.isFinite(serverHp)) player.hp = Math.max(0, Math.min(player.maxHp || serverHp, serverHp));
        if(Number.isFinite(serverMaxShield) && serverMaxShield >= 0) player.maxShield = serverMaxShield;
        if(Number.isFinite(serverShield)) player.shield = Math.max(0, Math.min(player.maxShield || serverShield, serverShield));
        continue;
      }
      const poison = event.damageType === "poison";
      damagePlayer(amount, {
        recordQuestHpLoss:false,
        bypassShield:poison,
        allowDamageToHp:!poison,
        suppressDeath:true,
        serverAuthoritative:true
      });
      if(hasServerVitals){
        if(Number.isFinite(serverMaxHp) && serverMaxHp > 0) player.maxHp = serverMaxHp;
        if(Number.isFinite(serverHp)) player.hp = Math.max(0, Math.min(player.maxHp || serverHp, serverHp));
        if(Number.isFinite(serverMaxShield) && serverMaxShield >= 0) player.maxShield = serverMaxShield;
        if(Number.isFinite(serverShield)) player.shield = Math.max(0, Math.min(player.maxShield || serverShield, serverShield));
      }
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

  function applyShipAbilityEffectEvents(){
    if(!multiplayer.shipAbilityEffectEvents?.length) return;
    const {currentMap, particles, player} = getState();
    const remaining = [];
    for(const event of multiplayer.shipAbilityEffectEvents.splice(0)){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      if(event.kind === "poison_bomb_pulse"){
        const duration = Math.max(.25, Number(event.durationMs || 760) / 1000);
        const followsLocalPlayer = Boolean(event.followSource && player) && String(event.sourceId || "") === String(multiplayer.playerId || "");
        particles.push({
          kind:"poisonWave",
          x:followsLocalPlayer ? player.x : Number(event.x || 0),
          y:followsLocalPlayer ? player.y : Number(event.y || 0),
          offsetX:0,
          offsetY:0,
          followPlayer:followsLocalPlayer,
          life:duration,
          max:duration,
          size:Math.max(40, Number(event.radius || 300)),
          color:"rgba(34,197,94,.72)",
          pulseIndex:Number(event.pulseIndex || 1)
        });
      }
    }
    multiplayer.shipAbilityEffectEvents = remaining;
  }

  function applyShipAbilityStateEvents(){
    if(!multiplayer.shipAbilityEvents?.length) return;
    for(const event of multiplayer.shipAbilityEvents.splice(0)){
      updateSpectralDoubleShotCharge(event);
    }
    multiplayer.shipAbilityEvents = [];
  }

  function applyLifecycleEvents(){
    const {player} = getState();
    let warned = Boolean(getState().radiationWarned);
    for(const event of multiplayer.playerRadiationEvents?.splice(0) || []){
      player.radiationTimer = Math.max(0, Number(event.remainingSeconds ?? 30));
      if(event.active && !warned){
        warned = true;
        setState({radiationWarned:true});
        showToast("Zone irradiee : retourne dans la carte ou ton vaisseau sera detruit.");
      }else if(event.active === false){
        warned = false;
        player.radiationTimer = 30;
        setState({radiationWarned:false});
      }
    }
    for(const event of multiplayer.playerDeathEvents?.splice(0) || []) applyServerDeath?.(event);
    for(const event of multiplayer.playerRespawnEvents?.splice(0) || []) applyServerRespawn?.(event);
    for(const event of multiplayer.portgunEvents?.splice(0) || []){
      if(event?.type === "started"){
        const durationMs = Math.max(1, Number(event.durationMs || 20000));
        setState({
          portgunChannel:{
            teleportId:event.id,
            targetMapId:event.targetMapId,
            targetMapName:event.targetMapName || "secteur",
            durationMs,
            completeAt:Number(event.completeAt || Date.now() + durationMs)
          }
        });
        showToast(`Portgun charge vers ${event.targetMapName || "secteur"} : ne bouge pas pendant ${Math.ceil(Number(event.durationMs || 0) / 1000)}s.`);
      }else if(event?.type === "cancelled"){
        setState({portgunChannel:null});
        showToast(event.message || "Teleportation Portgun annulee.");
      }else if(event?.type === "complete"){
        setState({portgunChannel:null});
        showToast(event.message || "Teleportation Portgun effectuee.");
        applyServerRespawn?.(event);
      }
    }
  }

  function applyStatusEffectEvents(){
    if(!multiplayer.playerStatusEffectEvents?.length) return;
    for(const event of multiplayer.playerStatusEffectEvents.splice(0)){
      if(event?.type === "poison"){
        if(event.active === false) clearPoison?.();
        else applyPlayerPoison?.({...event, serverAuthoritative:true});
      }else if(event?.type === "slow"){
        if(event.active === false) clearSlow?.();
        else applyPlayerSlow?.({...event, serverAuthoritative:true});
      }
    }
  }

  function applyNpcDamageEvents(){
    if(!multiplayer.npcDamageEvents?.length) return;
    const {currentMap, portalAlly} = getState();
    const remaining = [];
    for(const event of multiplayer.npcDamageEvents.splice(0)){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      if(event.targetId === "ricky_companion" && portalAlly){
        portalAlly.hp = Math.max(0, Number(event.hp ?? portalAlly.hp ?? 0));
        portalAlly.shield = Math.max(0, Number(event.shield ?? portalAlly.shield ?? 0));
        portalAlly.alive = portalAlly.hp > 0;
        pushDamageText({
          x:Number(portalAlly.x || 0),
          y:Number(portalAlly.y || 0) - 58,
          value:getNpcDamageDisplayAmount(event),
          color:"rgba(248,113,113,",
          shadowColor:"rgba(248,113,113,.78)"
        });
      }
    }
    multiplayer.npcDamageEvents = remaining;
  }

  function spawnAbsorbingFireEffect({particles, player, event}){
    if(event.sourceId !== "absorbing_fire" || event.weaponClass !== "laser") return;
    const fromX = Number(event.fromX);
    const fromY = Number(event.fromY);
    if(!Number.isFinite(fromX) || !Number.isFinite(fromY)) return;
    const dx = Number(player.x || 0) - fromX;
    const dy = Number(player.y || 0) - fromY;
    const distance = Math.hypot(dx, dy);
    if(distance < 4) return;
    for(let index = 0; index < 10; index++){
      const progress = .08 + index / 12 * .58;
      const life = .30 + (1 - progress) * .34;
      const jitter = (index % 2 ? 1 : -1) * (4 + index % 3 * 2);
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const x = fromX + dx * progress + normalX * jitter;
      const y = fromY + dy * progress + normalY * jitter;
      particles.push({
        kind:"absorptionOrb",
        x,
        y,
        vx:(Number(player.x || 0) - x) / life,
        vy:(Number(player.y || 0) - y) / life,
        life,
        max:life,
        size:3.2 + index % 3 * 1.25,
        color:index % 3 === 0 ? "rgba(220,252,231,.96)" : "rgba(74,222,128,.88)"
      });
    }
    particles.push({
      kind:"absorptionPulse",
      x:Number(player.x || 0),
      y:Number(player.y || 0),
      offsetX:0,
      offsetY:0,
      vx:0,
      vy:0,
      followPlayer:true,
      life:.48,
      max:.48,
      size:46,
      color:"rgba(74,222,128,.9)"
    });
  }

  function applyPlayerHealEvents(){
    if(!multiplayer.playerHealEvents?.length) return;
    const {player, currentMap, portalAlly, particles} = getState();
    const remaining = [];
    for(const event of multiplayer.playerHealEvents.splice(0)){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      const amount = Math.max(0, Math.round(Number(event.amount || 0)));
      if(event.targetId === multiplayer.playerId){
        if(Number.isFinite(Number(event.maxHp)) && Number(event.maxHp) > 0) player.maxHp = Number(event.maxHp);
        if(Number.isFinite(Number(event.hp))) player.hp = Math.max(0, Math.min(player.maxHp || Number(event.hp), Number(event.hp)));
        pushDamageText({
          x:player.x,
          y:player.y - 62,
          value:`+${amount}`,
          color:"rgba(74,222,128,",
          shadowColor:"rgba(34,197,94,.78)"
        });
        spawnAbsorbingFireEffect({particles, player, event});
      }else if(event.targetId === "ricky_companion" && portalAlly){
        if(Number.isFinite(Number(event.maxHp)) && Number(event.maxHp) > 0) portalAlly.maxHp = Number(event.maxHp);
        if(Number.isFinite(Number(event.hp))) portalAlly.hp = Math.max(0, Math.min(portalAlly.maxHp || Number(event.hp), Number(event.hp)));
        portalAlly.alive = portalAlly.hp > 0;
        pushDamageText({
          x:Number(portalAlly.x || event.x || 0),
          y:Number(portalAlly.y || event.y || 0) - 62,
          value:`+${amount}`,
          color:"rgba(74,222,128,",
          shadowColor:"rgba(34,197,94,.78)"
        });
      }
    }
    multiplayer.playerHealEvents = remaining;
  }

  function applyEnemyAttackEvents(){
    if(!multiplayer.enemyAttackEvents?.length) return;
    const {player, currentMap, enemies, bullets, particles} = getState();
    const remaining = [];
    let activeServerProjectiles = bullets.reduce((count, bullet)=>count + (bullet.owner === "serverEnemy" ? 1 : 0), 0);
    for(const event of multiplayer.enemyAttackEvents){
      if(String(event.mapId ?? "") !== getCurrentMapToken(currentMap)){
        remaining.push(event);
        continue;
      }
      if(event.targetId && String(event.targetId) !== String(multiplayer.playerId)) continue;
      const enemy = enemies.find(entry=>String(entry.id) === String(event.enemyId || event.sourceId));
      if(enemy){
        enemy.attackT = Math.max(Number(enemy.attackT || 0), Number(event.life || .22));
        enemy.recentHitTimer = Math.max(Number(enemy.recentHitTimer || 0), .35);
      }
      if(activeServerProjectiles >= MAX_SERVER_ENEMY_PROJECTILES) continue;
      const fromX = Number(event.fromX ?? enemy?.x ?? player.x);
      const fromY = Number(event.fromY ?? enemy?.y ?? player.y);
      const toX = Number(event.toX ?? player.x);
      const toY = Number(event.toY ?? player.y);
      const distance = Math.hypot(toX - fromX, toY - fromY) || 1;
      const speed = Math.max(120, Number(event.projectileSpeed || enemy?.projectileSpeed || 600));
      const serverTravelTime = Number(event.travelTime);
      bullets.push(createProjectile({
        owner:"serverEnemy",
        startX:fromX,
        startY:fromY,
        targetId:"player",
        damage:0,
        travelTime:Number.isFinite(serverTravelTime)
          ? Math.max(.11, Math.min(1.15, serverTravelTime))
          : Math.max(.11, Math.min(1.15, distance / speed + .06)),
        radius:5,
        color:event.color || enemy?.color || "rgba(248,113,113,.95)",
        particle:event.particle || enemy?.particle || "rgba(252,165,165,.75)",
        sourceId:event.enemyId || event.sourceId,
        hitChance:1,
        visualOnly:true
      }));
      activeServerProjectiles += 1;
      particles.push({kind:"enemyAttack",x:fromX, y:fromY, life:.16, max:.16, size:16, color:event.particle || enemy?.particle || "rgba(252,165,165,.72)"});
    }
    multiplayer.enemyAttackEvents = remaining;
  }

  function applyRemoteWeaponEvents(){
    remoteWeaponEvents.applyRemoteWeaponEvents();
  }

  function rickyMuzzlePoint(ally, targetX, targetY, weaponClass){
    const angle = Math.atan2(targetY - Number(ally.y || 0), targetX - Number(ally.x || 0));
    const facing = angle + Math.PI / 2;
    ally.clientAimAngle = facing;
    ally.clientAimUntil = performance.now() + (weaponClass === "rocket" ? 520 : 260);
    const side = weaponClass === "rocket" ? (Math.random() > .5 ? -18 : 18) : 0;
    const front = weaponClass === "rocket" ? 50 : 44;
    return {
      x:Number(ally.x || 0) + Math.cos(angle) * front + Math.cos(facing) * side,
      y:Number(ally.y || 0) + Math.sin(angle) * front + Math.sin(facing) * side,
      angle,
      facing
    };
  }

  function addRickyAttackVisual(event){
    if(String(event?.attackerId || "") !== RICKY_ALLY_ID) return;
    const {portalAlly, bullets, particles} = getState();
    if(!portalAlly || portalAlly.alive === false || Number(portalAlly.hp || 0) <= 0) return;
    const toX = Number(event.x || portalAlly.x || 0);
    const toY = Number(event.y || portalAlly.y || 0);
    const weaponClass = String(event.weaponClass || "laser");
    const muzzle = rickyMuzzlePoint(portalAlly, toX, toY, weaponClass);
    if(weaponClass === "rocket"){
      const distance = Math.hypot(toX - muzzle.x, toY - muzzle.y);
      const bullet = createProjectile({
        owner:"player",
        startX:muzzle.x,
        startY:muzzle.y,
        targetId:String(event.enemyId || ""),
        damage:0,
        travelTime:Math.max(.18, Math.min(.85, distance / 760)),
        radius:10,
        color:"rgba(125,211,252,.95)",
        particle:"rgba(96,165,250,.82)",
        kind:"rocket",
        sprite:RICKY_ROCKET_PROJECTILE,
        visualOnly:true,
        ammoId:"rocket_r2"
      });
      bullet.fixedTarget = {x:toX, y:toY, hp:1};
      bullets.push(bullet);
      particles.push({kind:"muzzle",x:muzzle.x, y:muzzle.y, life:.24, max:.24, size:26, color:"rgba(125,211,252,.78)"});
      return;
    }
    beams.add({
      ammoId:"ricky_laser",
      fromX:muzzle.x,
      fromY:muzzle.y,
      toX,
      toY,
      targetId:String(event.enemyId || ""),
      canReplay:false,
      blueLaser:true
    });
    particles.push({kind:"muzzle",x:muzzle.x, y:muzzle.y, life:.16, max:.16, size:18, color:"rgba(125,211,252,.72)"});
  }

  function addSpectralDoubleShotVisual(event, enemy = null){
    if(String(event?.doubleStrike?.abilityId || "") !== "spectral_double_shot") return;
    if(String(event.weaponClass || "") !== "laser") return;
    updateSpectralDoubleShotCharge(event.doubleStrike);
    const {player, particles} = getState();
    const toX = Number(enemy?.x ?? event.x);
    const toY = Number(enemy?.y ?? event.y);
    if(!Number.isFinite(toX) || !Number.isFinite(toY)) return;
    const fallbackFromX = Number(player?.x || 0);
    const fallbackFromY = Number(player?.y || 0);
    const fromX = Number.isFinite(Number(event.fromX)) ? Number(event.fromX) : fallbackFromX;
    const fromY = Number.isFinite(Number(event.fromY)) ? Number(event.fromY) : fallbackFromY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy) || 1;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    for(const offset of [-5, 5]){
      beams.add({
        ammoId:event.ammoId || "ammo_x1",
        fromX:fromX + normalX * offset,
        fromY:fromY + normalY * offset,
        toX:toX + normalX * offset * .35,
        toY:toY + normalY * offset * .35,
        targetId:String(event.enemyId || ""),
        canReplay:false,
        variant:"spectral_double_shot",
        widthScale:1.85,
        duration:.28,
        beamLength:190
      });
    }
    particles.push({kind:"muzzle",x:fromX, y:fromY, life:.24, max:.24, size:28, color:"rgba(168,85,247,.82)"});
    particles.push({kind:"impact",x:toX, y:toY, life:.22, max:.22, size:30, color:"rgba(217,70,239,.76)"});
  }

  function applyCombatHitEvents(){
    if(!multiplayer.combatEvents?.length) return;
    const {enemies, store} = getState();
    const events = multiplayer.combatEvents.splice(0);
    const remaining = [];
    for(const event of events){
      applyAuthoritativeCombatAmmo({
        event,
        playerId:multiplayer.playerId,
        ammoInventory:store?.state?.ammoInventory
      });
      addRickyAttackVisual(event);
      const enemy = enemies.find(entry=>String(entry.id) === String(event.enemyId));
      addSpectralDoubleShotVisual(event, enemy);
      if(!enemy){
        const x = Number(event.x);
        const y = Number(event.y);
        if(Number.isFinite(x) && Number.isFinite(y)){
          const damage = Math.max(0, Math.round(Number(event.damage || 0)));
          const poison = event.damageType === "poison";
          pushDamageText({
            x,
            y:y - Math.max(16, Number(event.radius || 0) + 16),
            value:damage > 0 ? (poison ? `-${damage}` : damage) : "MISS",
            ...(damage > 0
              ? poison ? {color:"rgba(22,163,74,", shadowColor:"rgba(21,128,61,.82)", life:.92} : {}
              : {color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"})
          });
        }else if((performance.now() - Number(event.receivedAt || 0)) < 1000) remaining.push(event);
        continue;
      }
      const damage = Math.max(0, Math.round(Number(event.damage || 0)));
      if(damage > 0){
        const poison = event.damageType === "poison";
        pushDamageText({
          x:enemy.x,
          y:enemy.y - enemy.radius - 16,
          value:poison ? `-${damage}` : damage,
          ...(poison ? {color:"rgba(22,163,74,", shadowColor:"rgba(21,128,61,.82)", life:.92} : {})
        });
      }else{
        pushDamageText({x:enemy.x, y:enemy.y - enemy.radius - 16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
      }
    }
    multiplayer.combatEvents = remaining;
  }

  function applyRewardEvents(){
    if(!multiplayer.playerRewardEvents?.length) return;
    const {currentMap, store} = getState();
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
      const rankPoints = rewardAppliedByServer ? Math.max(0, Number(event.rankPoints || 0)) : 0;
      const reputation = rewardAppliedByServer ? Math.max(0, Math.round(Number(event.reputation || 0))) : 0;
      applyAuthoritativeRewardProgression({event, player:store?.state?.player});
      window.dispatchEvent(new CustomEvent("voidsector:combat-log", {detail:{
        kind:"reward",
        enemyName:event.enemyName || event.enemyType || "Monstre",
        enemyType:event.enemyType || "",
        enemyLevel:event.enemyLevel || 0,
        credits,
        xp,
        premium,
        reputation,
        rankPoints,
        share:event.share || 1,
        at:event.at || Date.now()
      }}));
      rewards.showLootNotice?.({credits, xp, reputation, rankPoints, premium});
      const shareValue = Number(event.share || 1);
      const shareLabel = shareValue < 1 ? ` (partage groupe ${Math.round(shareValue * 100)}%)` : "";
      showToast(`Butin serveur${shareLabel} : +${fmt(credits)} credits${premium ? `, +${fmt(premium)} NOVA` : ""}, +${fmt(xp)} XP, +${fmt(reputation)} reputation.`);
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
    questEvents.applyQuestProgressEvents();
  }

  function applyQuestClaimEvents(){
    questEvents.applyQuestClaimEvents();
  }

  function applyQuestFailureEvents(){
    questEvents.applyQuestFailureEvents();
  }

  function applyAll(){
    applyRemoteWeaponEvents();
    applyEnemyAttackEvents();
    applyShipAbilityStateEvents();
    applyShipAbilityEffectEvents();
    applyStatusEffectEvents();
    applyNpcDamageEvents();
    applyDamageEvents();
    applyPlayerHealEvents();
    applyLifecycleEvents();
    applyCombatHitEvents();
    applyRewardEvents();
    applyQuestClaimEvents();
    applyLootDropEvents();
    applyQuestProgressEvents();
    applyQuestFailureEvents();
    applyRickyCinematicEvents();
    applyPortalEvents();
  }

  return {
    loadPortalArena,
    applyPortalEvents,
    applyRickyCinematicEvents,
    applyDamageEvents,
    applyLifecycleEvents,
    applyRemoteWeaponEvents,
    applyCombatHitEvents,
    applyRewardEvents,
    applyLootDropEvents,
    applyQuestProgressEvents,
    applyQuestFailureEvents,
    applyAll
  };
}
