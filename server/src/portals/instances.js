import { applyProgressionReward } from "../players/progression.js";
import { applyServerReputationFromXp, updateRankScore } from "../players/rankProgression.js";
import { enrichFirmSnapshot } from "../firms/firmSnapshots.js";
import { consumeInventoryItemAmount, getInventoryItemCount } from "../economy/inventoryStacks.js";
import { PORTAL_CONFIGS, WORLD_ENEMY_TYPES } from "../world/definitions.js";
import { ENEMY_THREAT_RECALC_MS, markEnemyAttackedByPlayer } from "../world/aggro.js";
import { portals } from "../../../src/data/catalog.js";

const RICKY_PORTAL_ID = "ricky";
const RICKY_PORTAL_KEY_ITEM_ID = "portal_anchor_key";
const RICKY_PORTAL_QUEST_BASE_ID = "quest_lv10_maintenance_impossible";
const RICKY_MAX_GROUP_MEMBERS = 4;
const RICKY_ALLY_ID = "ricky_companion";
const RICKY_ALLY_IMG = "assets/ships/npc/npc_saucer.png";
const RICKY_HEAL_COOLDOWN_MS = 60000;
const RICKY_HEAL_BEACON_DURATION_MS = 18000;
const RICKY_HEAL_BEACON_INTERVAL_MS = 2000;
const RICKY_HEAL_BEACON_RADIUS = 250;
const RICKY_HEAL_BEACON_AMOUNT = 3000;
const RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM = {
  astra:"",
  cyan:"_cyan",
  jaune:"_jaune",
  verte:"_verte"
};
const RICKY_PORTAL_DEFINITION = {
  id:RICKY_PORTAL_ID,
  name:"Portail de Ricky",
  requirement:{level:10},
  accessItem:{itemId:RICKY_PORTAL_KEY_ITEM_ID, amount:1, name:"Clé d'ancrage dimensionnel"}
};

function getRickyPortalQuestId(profile){
  const firmId = String(profile?.player?.firmId || "astra").toLowerCase();
  if(!Object.hasOwn(RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM, firmId)) return null;
  return `${RICKY_PORTAL_QUEST_BASE_ID}${RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM[firmId]}`;
}

function getPortalDefinition(portalId){
  const id = String(portalId || "blue");
  if(id === RICKY_PORTAL_ID) return RICKY_PORTAL_DEFINITION;
  return portals.find(entry=>entry.id === id) || null;
}

function applyDamageToEnemy(enemy, incoming){
  enemy.recentHitTimer = 4;
  const damage = Math.max(0, Number(incoming || 0));
  if(enemy.maxShield > 0 && enemy.shield > 0){
    const shieldPart = damage * Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? .8)));
    let hullPart = damage - shieldPart;
    const absorbed = Math.min(enemy.shield, shieldPart);
    enemy.shield -= absorbed;
    hullPart += shieldPart - absorbed;
    if(hullPart > 0) enemy.hp -= hullPart;
  }else{
    enemy.hp -= damage;
  }
  enemy.hp = Math.max(0, enemy.hp);
  enemy.shield = Math.max(0, enemy.shield);
}

function healShipState(state, amount){
  if(!state) return 0;
  const maxHp = Math.max(0, Number(state.maxHp || state.hp || 0));
  const before = Math.max(0, Number(state.hp || 0));
  state.hp = Math.min(maxHp || before, before + Math.max(0, Number(amount || 0)));
  return Math.max(0, state.hp - before);
}

export function createPortalInstanceManager({io, players, groups, profileManager, emitProfileSync, emitQuestClaims, createGroup, emitInstance, firmWarManager, portalWaveTotal}){
  let instanceSeq = 1;

  function createPortalEnemy(kind, wave, index, x, y, boss = false){
    const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
    const level = Math.max(1, Math.round((boss ? 20 : 1) + wave * 0.75));
    const hp = Math.round(base.hp(level) * (boss ? 2.6 : 1 + wave * 0.035));
    const shield = Math.round(base.shield(level) * (boss ? 2.6 : 1 + wave * 0.025));
    return {
      id:`P-${wave}-${index}-${Date.now().toString(36)}`,
      serverControlled:true,
      kind:base.kind,
      type:boss ? `${base.type} Alpha` : base.type,
      img:base.img,
      level,
      x,
      y,
      homeX:x,
      homeY:y,
      angle:Math.PI,
      hp,
      maxHp:hp,
      shield,
      maxShield:shield,
      radius:Math.round(base.radius * (boss ? 1.2 : 1)),
      width:Math.round(base.width * (boss ? 1.22 : 1)),
      height:Math.round(base.height * (boss ? 1.22 : 1)),
      speed:base.speed(level),
      attackRange:base.attackRange,
      attackDamage:Math.round(base.attackDamage(level) * (boss ? 1.65 : 1)),
      attackCooldown:base.attackCooldown,
      projectileSpeed:base.projectileSpeed || 600,
      particle:base.particle || base.color,
      onHitEffect:base.onHitEffect || null,
      reward:base.reward(level),
      color:base.color,
      shieldAbsorbRatio:base.shieldAbsorbRatio,
      vx:0,
      vy:0,
      moving:false,
      recentHitTimer:0
    };
  }

  function buildServerPortalWave(wave){
    if(wave >= portalWaveTotal){
      return [createPortalEnemy("chasseur_spectral", wave, 1, 0, -1040, true)];
    }
    const batch = Math.ceil(wave / 5);
    const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
    const kinds = batch <= 2 ? ["drone_pirate", "raider_astral"] : batch <= 4 ? ["raider_astral", "chasseur_spectral"] : ["chasseur_spectral", "boss_cuirasse_nebulaire"];
    return Array.from({length:count}, (_, i)=>{
      const side = i % 3;
      const x = side === 0 ? -1480 + i * 80 : side === 1 ? 1480 - i * 75 : -480 + i * 105;
      const y = -1040 - (i % 4) * 96;
      return createPortalEnemy(kinds[i % kinds.length], wave, i + 1, x, y, false);
    });
  }

  function createRickyAlly(spawn = {x:0, y:0}, now = Date.now()){
    return {
      id:RICKY_ALLY_ID,
      name:"Ricky",
      img:RICKY_ALLY_IMG,
      x:Number(spawn.x || 0) - 170,
      y:Number(spawn.y || 0) + 90,
      vx:0,
      vy:0,
      angle:0,
      hp:50000,
      maxHp:50000,
      shield:30000,
      maxShield:30000,
      radius:44,
      width:86,
      height:86,
      speed:360,
      followDistance:260,
      maxLeaderDistance:720,
      attackRange:600,
      laserCooldownMs:1400,
      rocketCooldownMs:4600,
      nextLaserAt:now + 900,
      nextRocketAt:now + 2200,
      healCooldownMs:RICKY_HEAL_COOLDOWN_MS,
      healCooldownUntil:0,
      alive:true
    };
  }

  function isRickyPortalInstance(instance){
    return instance?.type === "portal" && instance.portal?.id === RICKY_PORTAL_ID;
  }

  function getInstanceMapId(instance){
    return `portal-${instance?.portal?.id || "blue"}`;
  }

  function getJoinedMemberIds(instance){
    if(!Array.isArray(instance.joinedMemberIds)) instance.joinedMemberIds = Object.keys(instance.playerLives || {});
    return instance.joinedMemberIds;
  }

  function getRickyPortalPlayers(group, {requireMap = false, aliveOnly = false} = {}){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return [];
    const joined = new Set(getJoinedMemberIds(instance));
    const mapId = getInstanceMapId(instance);
    return (group.members || [])
      .filter(memberId=>joined.has(memberId) && !instance.abandonedMemberIds?.includes(memberId))
      .map(memberId=>players.get(memberId))
      .filter(player=>{
        if(!player || player.connected === false || player.clientMode !== "game") return false;
        if(requireMap && String(player.state?.mapId || player.mapId || "") !== mapId) return false;
        if(aliveOnly && Number(player.state?.hp || 0) <= 0) return false;
        return true;
      });
  }

  function getRickyFollowTarget(group){
    const activePlayers = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    return activePlayers.find(player=>player.id === group.leaderId) || activePlayers[0] || null;
  }

  function validateRickyAccess(profile, portalDefinition){
    const questId = getRickyPortalQuestId(profile);
    if(!questId || !profile?.completedQuestClaims?.[questId]){
      return {ok:false, reason:"Ricky n'a pas encore stabilise ce portail."};
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      return {ok:false, reason:`Niveau ${portalDefinition.requirement.level} requis.`};
    }
    if(getInventoryItemCount(profile, RICKY_PORTAL_KEY_ITEM_ID) < 1){
      return {ok:false, reason:"Cle d'ancrage dimensionnel requise."};
    }
    return {ok:true};
  }

  function consumeRickyPortalKey(player, profile, portalDefinition){
    const access = validateRickyAccess(profile, portalDefinition);
    if(!access.ok) return access;
    const keyResult = profileManager.updateProfileForPlayer({
      player,
      update:draft=>{
        const draftAccess = validateRickyAccess(draft, portalDefinition);
        if(!draftAccess.ok) return draftAccess;
        if(!consumeInventoryItemAmount(draft, RICKY_PORTAL_KEY_ITEM_ID, 1)){
          return {ok:false, reason:"Cle d'ancrage dimensionnel requise."};
        }
        return {ok:true};
      }
    });
    if(!keyResult.ok) return keyResult;
    emitProfileSync?.(player, keyResult.profile);
    return {ok:true, profile:keyResult.profile || profile};
  }

  function emitPortalStart(socket, group){
    const instance = group?.instance;
    if(!instance) return;
    socket.emit("portal:started", {
      instanceId:instance.id,
      portal:instance.portal,
      spawn:instance.spawn,
      wave:instance.wave
    });
  }

  function joinRickyPortalInstance(socket, group, portalDefinition, profile){
    const player = players.get(socket.id);
    const instance = group?.instance;
    if(!player || !isRickyPortalInstance(instance) || instance.completed) return false;
    if(group.members.length > RICKY_MAX_GROUP_MEMBERS){
      socket.emit("portal:error", {message:`Portail limite a ${RICKY_MAX_GROUP_MEMBERS} joueurs.`});
      return false;
    }
    const joined = getJoinedMemberIds(instance);
    if(instance.abandonedMemberIds?.includes(player.id)){
      socket.emit("portal:error", {message:"Cette tentative de portail a deja ete abandonnee."});
      return false;
    }
    if(joined.includes(player.id)){
      emitPortalStart(socket, group);
      emitInstance(group);
      return true;
    }
    const keyResult = consumeRickyPortalKey(player, profile, portalDefinition);
    if(!keyResult.ok){
      socket.emit("portal:error", {message:keyResult.reason || "Cle d'ancrage dimensionnel requise."});
      return false;
    }
    joined.push(player.id);
    if(!instance.playerLives || typeof instance.playerLives !== "object") instance.playerLives = {};
    instance.playerLives[player.id] = Math.max(1, Number(instance.playerLives[player.id] || 3));
    if(Array.isArray(instance.abandonedMemberIds)){
      instance.abandonedMemberIds = instance.abandonedMemberIds.filter(memberId=>memberId !== player.id);
    }
    emitPortalStart(socket, group);
    emitInstance(group);
    return true;
  }

  function startPortalInstance(socket, portalId){
    const player = players.get(socket.id);
    if(!player || player.deathState || Number(player.state?.hp || 0) <= 0) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group || group.leaderId !== socket.id) return;
    if(group.instance?.type === "portal" && !group.instance.completed){
      socket.emit("portal:error", {message:"Un portail est deja actif pour ce groupe."});
      return;
    }
    let profile = profileManager.getProfileForPlayer?.(player);
    const portalDefinition = getPortalDefinition(portalId);
    if(!portalDefinition){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    const isRickyPortal = portalDefinition.id === RICKY_PORTAL_ID;
    if(!isRickyPortal && !profile?.unlockedPortals?.includes(portalDefinition.id)){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    if(isRickyPortal){
      const questId = getRickyPortalQuestId(profile);
      if(!questId || !profile?.completedQuestClaims?.[questId]){
        socket.emit("portal:error", {message:"Ricky n'a pas encore stabilise ce portail."});
        return;
      }
      if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
        socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
        return;
      }
      if(getInventoryItemCount(profile, RICKY_PORTAL_KEY_ITEM_ID) < 1){
        socket.emit("portal:error", {message:"Clé d'ancrage dimensionnel requise."});
        return;
      }
      const keyResult = profileManager.updateProfileForPlayer({
        player,
        update:draft=>{
          const draftQuestId = getRickyPortalQuestId(draft);
          if(!draftQuestId || !draft?.completedQuestClaims?.[draftQuestId]){
            return {ok:false, reason:"Ricky n'a pas encore stabilise ce portail."};
          }
          if(!consumeInventoryItemAmount(draft, RICKY_PORTAL_KEY_ITEM_ID, 1)){
            return {ok:false, reason:"Clé d'ancrage dimensionnel requise."};
          }
          return {ok:true};
        }
      });
      if(!keyResult.ok){
        socket.emit("portal:error", {message:keyResult.reason || "Clé d'ancrage dimensionnel requise."});
        return;
      }
      profile = keyResult.profile || profile;
      emitProfileSync?.(player, profile);
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
      return;
    }
    const portal = PORTAL_CONFIGS[portalDefinition.id] || PORTAL_CONFIGS.blue;
    group.instance = {
      id:`P-${String(instanceSeq++).padStart(4, "0")}`,
      type:"portal",
      portal:{id:portal.id, name:portal.name, totalWaves:portalWaveTotal},
      spawn:{mapId:`portal-${portal.id}`, x:0, y:0},
      wave:1,
      completed:false,
      playerLives:Object.fromEntries(group.members.map(memberId=>[memberId, 3])),
      abandonedMemberIds:[],
      enemies:buildServerPortalWave(1)
    };
    io.to(group.id).emit("portal:started", {
      instanceId:group.instance.id,
      portal:group.instance.portal,
      spawn:group.instance.spawn,
      wave:group.instance.wave
    });
    emitInstance(group);
  }

  function startRickyAwarePortalInstance(socket, portalId){
    const player = players.get(socket.id);
    if(!player || player.deathState || Number(player.state?.hp || 0) <= 0) return;
    let group = player.groupId ? groups.get(player.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group) return;
    let profile = profileManager.getProfileForPlayer?.(player);
    const portalDefinition = getPortalDefinition(portalId);
    if(!portalDefinition){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    const isRickyPortal = portalDefinition.id === RICKY_PORTAL_ID;
    if(group.instance?.type === "portal" && !group.instance.completed){
      if(isRickyPortal && group.instance.portal?.id === RICKY_PORTAL_ID){
        joinRickyPortalInstance(socket, group, portalDefinition, profile);
        return;
      }
      socket.emit("portal:error", {message:"Un portail est deja actif pour ce groupe."});
      return;
    }
    if(group.leaderId !== socket.id){
      socket.emit("portal:error", {message:"Seul le chef de groupe peut lancer ce portail."});
      return;
    }
    if(isRickyPortal && group.members.length > RICKY_MAX_GROUP_MEMBERS){
      socket.emit("portal:error", {message:`Portail limite a ${RICKY_MAX_GROUP_MEMBERS} joueurs.`});
      return;
    }
    if(!isRickyPortal && !profile?.unlockedPortals?.includes(portalDefinition.id)){
      socket.emit("portal:error", {message:"Portail non deverrouille."});
      return;
    }
    if(isRickyPortal){
      const keyResult = consumeRickyPortalKey(player, profile, portalDefinition);
      if(!keyResult.ok){
        socket.emit("portal:error", {message:keyResult.reason || "Cle d'ancrage dimensionnel requise."});
        return;
      }
      profile = keyResult.profile || profile;
    }
    if(Number(profile.player?.level || 1) < Number(portalDefinition.requirement?.level || 1)){
      socket.emit("portal:error", {message:`Niveau ${portalDefinition.requirement.level} requis.`});
      return;
    }
    const portal = PORTAL_CONFIGS[portalDefinition.id] || PORTAL_CONFIGS.blue;
    const joinedMemberIds = isRickyPortal ? [socket.id] : [...group.members];
    group.instance = {
      id:`P-${String(instanceSeq++).padStart(4, "0")}`,
      type:"portal",
      portal:{id:portal.id, name:portal.name, totalWaves:portalWaveTotal},
      spawn:{mapId:`portal-${portal.id}`, x:0, y:0},
      wave:1,
      completed:false,
      playerLives:Object.fromEntries(joinedMemberIds.map(memberId=>[memberId, 3])),
      joinedMemberIds,
      abandonedMemberIds:[],
      enemies:buildServerPortalWave(1),
      ...(isRickyPortal ? {ally:createRickyAlly({x:0, y:0}), beacons:[]} : {})
    };
    if(isRickyPortal) emitPortalStart(socket, group);
    else io.to(group.id).emit("portal:started", {
      instanceId:group.instance.id,
      portal:group.instance.portal,
      spawn:group.instance.spawn,
      wave:group.instance.wave
    });
    emitInstance(group);
  }

  function progressPortalCompletionQuest(player, portalId){
    const result = profileManager.applyQuestAction?.({
      player,
      action:{kind:"progress", type:"portal_complete", portalId}
    });
    if(!result?.ok) return result;
    if(result.updates?.length){
      io.to(player.id).emit("quest:progress", {
        updates:result.updates,
        at:Date.now()
      });
    }
    if(result.claimedQuests?.length) emitQuestClaims?.(player, result.claimedQuests, {auto:true});
    return result;
  }

  function emitPortalComplete(group){
    const instance = group?.instance;
    if(!instance || instance.type !== "portal" || instance.rewardGranted) return;
    instance.rewardGranted = true;
    instance.rewardGrantedAt = Date.now();
    instance.completed = true;
    const portal = PORTAL_CONFIGS[instance.portal?.id] || PORTAL_CONFIGS.blue;
    const now = Date.now();
    const firmContributors = [];
    const personalFirmSnapshots = [];
    const completionMemberIds = isRickyPortalInstance(instance) ? getJoinedMemberIds(instance) : group.members || [];
    for(const memberId of completionMemberIds){
      if(instance.abandonedMemberIds?.includes(memberId)) continue;
      const player = players.get(memberId);
      if(!player) continue;
      const currentProfile = profileManager.getProfileForPlayer?.(player);
      const playerKey = profileManager.profileKeyForPlayer?.(player) || "";
      firmContributors.push({
        key:playerKey,
        name:currentProfile?.player?.name || player.name || "Pilote",
        firmId:currentProfile?.player?.firmId || player.account?.firmId || "astra"
      });
      const result = profileManager.updateProfileForPlayer({
        player,
        update:profile=>{
          profile.player = applyProgressionReward(profile.player || {}, portal.reward || {});
          if(!profile.completedPortals || typeof profile.completedPortals !== "object") profile.completedPortals = {};
          profile.completedPortals[portal.id] = Math.max(0, Number(profile.completedPortals[portal.id] || 0)) + 1;
          if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
          if(Number(portal.reward?.ammoX4 || 0) > 0){
            profile.ammoInventory.ammo_x4 = Math.max(0, Number(profile.ammoInventory.ammo_x4 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX4 || 0)));
          }
          if(Number(portal.reward?.ammoX6 || 0) > 0){
            profile.ammoInventory.ammo_x6 = Math.max(0, Number(profile.ammoInventory.ammo_x6 || 0)) + Math.max(0, Math.round(Number(portal.reward.ammoX6 || 0)));
          }
          applyServerReputationFromXp(profile, portal.reward?.xp);
          updateRankScore(profile);
          return {ok:true};
        }
      });
      io.to(memberId).emit("portal:complete", {
        instanceId:instance.id,
        portal:{id:portal.id, name:portal.name},
        reward:portal.reward,
        rewardAppliedByServer:true,
        at:now
      });
      const questResult = progressPortalCompletionQuest(player, portal.id);
      const finalProfile = questResult?.profile || result.profile || currentProfile;
      emitProfileSync?.(player, finalProfile);
      personalFirmSnapshots.push({player, playerKey, profile:finalProfile});
    }
    if(firmWarManager && firmContributors.length){
      const result = firmWarManager.recordPortalCompletion(firmContributors);
      io.emit?.("firm:ranking", enrichFirmSnapshot(profileManager, result.snapshot));
      for(const entry of personalFirmSnapshots){
        if(!entry.playerKey) continue;
        io.to(entry.player.id).emit("firm:snapshot", enrichFirmSnapshot(profileManager, firmWarManager.snapshot({
          playerKey:entry.playerKey,
          profile:entry.profile
        })));
      }
    }
    emitInstance(group);
  }

  function randomBetween(min, max){
    return Math.round(Number(min || 0) + Math.random() * (Number(max || min || 0) - Number(min || 0)));
  }

  function findRickyTarget(ally, leader, enemies){
    if(!ally || !leader?.state) return null;
    const leaderX = Number(leader.state.x || 0);
    const leaderY = Number(leader.state.y || 0);
    const maxDistanceFromLeader = Number(ally.maxLeaderDistance || 720) + Number(ally.attackRange || 600);
    let best = null;
    for(const enemy of enemies || []){
      if(!enemy || Number(enemy.hp || 0) <= 0) continue;
      const allyDistance = Math.hypot(Number(enemy.x || 0) - ally.x, Number(enemy.y || 0) - ally.y);
      const leaderDistance = Math.hypot(Number(enemy.x || 0) - leaderX, Number(enemy.y || 0) - leaderY);
      if(allyDistance > Number(ally.attackRange || 600) && leaderDistance > Number(ally.attackRange || 600)) continue;
      if(leaderDistance > maxDistanceFromLeader) continue;
      const score = Math.min(allyDistance, leaderDistance + 120);
      if(!best || score < best.score) best = {enemy, score};
    }
    return best?.enemy || null;
  }

  function moveRickyAlly(ally, targetX, targetY, dt){
    const dx = Number(targetX || 0) - ally.x;
    const dy = Number(targetY || 0) - ally.y;
    const distance = Math.hypot(dx, dy);
    if(distance <= 8){
      ally.vx = 0;
      ally.vy = 0;
      return;
    }
    const step = Math.min(distance, Number(ally.speed || 320) * dt);
    const nx = dx / distance;
    const ny = dy / distance;
    ally.x += nx * step;
    ally.y += ny * step;
    ally.vx = nx * Number(ally.speed || 320);
    ally.vy = ny * Number(ally.speed || 320);
    ally.angle = Math.atan2(ny, nx) + Math.PI / 2;
  }

  function emitRickyHit(group, enemy, damage, weaponClass){
    io.to(`instance:${group.instance.id}`).emit("combat:hit", {
      enemyId:enemy.id,
      attackerId:RICKY_ALLY_ID,
      weaponClass,
      ammoId:weaponClass === "rocket" ? "ricky_rocket" : "ricky_laser",
      consumed:0,
      hit:damage > 0,
      damage,
      mapId:getInstanceMapId(group.instance),
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      radius:Number(enemy.radius || 0),
      at:Date.now()
    });
  }

  function awardRickyPortalEnemyReward(group, enemy, killerId = RICKY_ALLY_ID){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance) || enemy.rewardGranted) return;
    enemy.rewardGranted = true;
    enemy.rewardGrantedAt = Date.now();
    const reward = enemy.reward || {credits:0, xp:0, premium:0};
    const rewardId = `${enemy.id}:${killerId}:${enemy.rewardGrantedAt}`;
    for(const player of getRickyPortalPlayers(group, {requireMap:true, aliveOnly:false})){
      const currentProfile = profileManager.getProfileForPlayer?.(player);
      const firmId = currentProfile?.player?.firmId || player.account?.firmId || "astra";
      const firmBonus = Math.max(0, Number(firmWarManager?.getRewardMultiplier?.(firmId) || 0));
      const multiplier = 1 + firmBonus;
      const credits = Math.max(0, Math.round(Number(reward.credits || 0) * multiplier));
      const xp = Math.max(0, Math.round(Number(reward.xp || 0) * multiplier));
      const premium = Math.max(0, Math.round(Number(reward.premium || 0) * multiplier));
      const reputation = Math.max(0, Math.round(xp * 0.1));
      io.to(player.id).emit("player:reward", {
        rewardId,
        enemyId:enemy.id,
        enemyType:enemy.type,
        enemyName:enemy.name || enemy.type || enemy.kind,
        enemyLevel:enemy.level,
        mapId:getInstanceMapId(instance),
        share:1,
        killerId,
        credits,
        xp,
        premium,
        reputation,
        rankPoints:0,
        firmBonus,
        rewardAppliedByServer:true,
        at:Date.now()
      });
      const profile = profileManager.applyReward?.({
        player,
        reward:{
          credits,
          xp,
          premium,
          enemyName:enemy.name || enemy.type || enemy.kind,
          enemyKind:enemy.kind || enemy.type,
          enemyType:enemy.type,
          enemyLevel:enemy.level
        }
      });
      emitProfileSync?.(player, profile);
    }
  }

  function handlePortalEnemyDeath(group, enemy, killerId = RICKY_ALLY_ID){
    const instance = group?.instance;
    if(!instance || instance.completed || Number(enemy?.hp || 0) > 0) return;
    awardRickyPortalEnemyReward(group, enemy, killerId);
    const alive = instance.enemies.some(entry=>entry.hp > 0);
    if(alive) return;
    if(instance.wave >= portalWaveTotal) emitPortalComplete(group);
    else{
      instance.wave += 1;
      instance.enemies = buildServerPortalWave(instance.wave);
    }
  }

  function damagePortalEnemyByRicky(group, enemy, damage, weaponClass, now){
    if(!enemy || Number(enemy.hp || 0) <= 0 || damage <= 0) return;
    const wasAlive = enemy.hp > 0;
    if(!enemy.lockedPlayerId){
      const priorityTarget = getRickyFollowTarget(group);
      if(priorityTarget){
        enemy.lockedPlayerId = priorityTarget.id;
        enemy.lockedPlayerLastSeenAt = now;
        enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
      }
    }
    markEnemyAttackedByPlayer(enemy, RICKY_ALLY_ID, damage, now);
    applyDamageToEnemy(enemy, damage);
    emitRickyHit(group, enemy, damage, weaponClass);
    if(wasAlive && enemy.hp <= 0) handlePortalEnemyDeath(group, enemy, RICKY_ALLY_ID);
  }

  function healRickyBeaconTargets(group, beacon){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return;
    const targets = getRickyPortalPlayers(group, {requireMap:true, aliveOnly:true});
    const ally = instance.ally;
    if(ally?.alive !== false && Number(ally.hp || 0) > 0){
      targets.push({id:RICKY_ALLY_ID, state:ally});
    }
    for(const target of targets){
      const state = target.state;
      const distance = Math.hypot(Number(state.x || 0) - beacon.x, Number(state.y || 0) - beacon.y);
      if(distance > Number(beacon.radius || RICKY_HEAL_BEACON_RADIUS)) continue;
      const healed = healShipState(state, beacon.heal);
      if(healed <= 0) continue;
      if(target.id !== RICKY_ALLY_ID){
        profileManager.saveWorldSession?.({player:target, state, force:false});
        const profile = profileManager.getProfileForPlayer?.(target);
        emitProfileSync?.(target, profile);
      }
      io.to(target.id === RICKY_ALLY_ID ? `instance:${instance.id}` : target.id).emit("player:healed", {
        targetId:target.id,
        sourceId:RICKY_ALLY_ID,
        amount:healed,
        hp:state.hp,
        maxHp:state.maxHp,
        mapId:getInstanceMapId(instance),
        x:Number(state.x || beacon.x),
        y:Number(state.y || beacon.y),
        at:Date.now()
      });
    }
  }

  function updateRickyBeacons(group, now){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance)) return;
    instance.beacons = (Array.isArray(instance.beacons) ? instance.beacons : []).filter(beacon=>Number(beacon.expiresAt || 0) > now);
    for(const beacon of instance.beacons){
      if(now < Number(beacon.nextTickAt || 0)) continue;
      healRickyBeaconTargets(group, beacon);
      beacon.nextTickAt = now + RICKY_HEAL_BEACON_INTERVAL_MS;
    }
  }

  function updateRickyCompanion(group, dt, now){
    const instance = group?.instance;
    if(!isRickyPortalInstance(instance) || instance.completed) return;
    updateRickyBeacons(group, now);
    const ally = instance.ally;
    if(!ally || ally.alive === false) return;
    if(Number(ally.hp || 0) <= 0){
      ally.alive = false;
      return;
    }
    const leader = getRickyFollowTarget(group);
    if(!leader?.state){
      ally.vx = 0;
      ally.vy = 0;
      return;
    }
    const leaderX = Number(leader.state.x || 0);
    const leaderY = Number(leader.state.y || 0);
    const target = findRickyTarget(ally, leader, instance.enemies);
    const leaderDistance = Math.hypot(leaderX - ally.x, leaderY - ally.y);
    if(leaderDistance > Number(ally.maxLeaderDistance || 720)){
      moveRickyAlly(ally, leaderX - 150, leaderY + 90, dt);
      return;
    }
    if(target){
      const targetDistance = Math.hypot(Number(target.x || 0) - ally.x, Number(target.y || 0) - ally.y);
      if(targetDistance > Number(ally.attackRange || 600) * .82){
        moveRickyAlly(ally, target.x, target.y, dt);
      }else{
        ally.vx = 0;
        ally.vy = 0;
        ally.angle = Math.atan2(Number(target.y || 0) - ally.y, Number(target.x || 0) - ally.x) + Math.PI / 2;
      }
      if(targetDistance <= Number(ally.attackRange || 600) && now >= Number(ally.nextLaserAt || 0)){
        ally.nextLaserAt = now + Number(ally.laserCooldownMs || 1400);
        damagePortalEnemyByRicky(group, target, randomBetween(1000, 1500), "laser", now);
      }
      if(targetDistance <= Number(ally.attackRange || 600) && now >= Number(ally.nextRocketAt || 0)){
        ally.nextRocketAt = now + Number(ally.rocketCooldownMs || 4600);
        damagePortalEnemyByRicky(group, target, randomBetween(500, 1000), "rocket", now);
      }
      return;
    }
    if(leaderDistance > Number(ally.followDistance || 260)){
      moveRickyAlly(ally, leaderX - 160, leaderY + 90, dt);
    }else{
      ally.vx = 0;
      ally.vy = 0;
    }
  }

  function updateRickyCompanions(dt, now = Date.now()){
    for(const group of groups.values()) updateRickyCompanion(group, dt, now);
  }

  function activateRickyHealBeacon(socket){
    const player = players.get(socket.id);
    const group = player?.groupId ? groups.get(player.groupId) : null;
    const instance = group?.instance;
    if(!player || !isRickyPortalInstance(instance) || instance.completed){
      socket.emit("portal:error", {message:"Balise Ricky indisponible."});
      return false;
    }
    if(!getJoinedMemberIds(instance).includes(player.id)){
      socket.emit("portal:error", {message:"Tu dois etre dans le portail de Ricky."});
      return false;
    }
    if(instance.abandonedMemberIds?.includes(player.id) || String(player.state?.mapId || player.mapId || "") !== getInstanceMapId(instance)){
      socket.emit("portal:error", {message:"Tu dois etre dans le portail de Ricky."});
      return false;
    }
    const ally = instance.ally;
    if(!ally || ally.alive === false || Number(ally.hp || 0) <= 0){
      socket.emit("portal:error", {message:"Ricky n'est plus en etat de poser une balise."});
      return false;
    }
    const now = Date.now();
    if(now < Number(ally.healCooldownUntil || 0)){
      socket.emit("portal:error", {message:`Balise en recharge : ${Math.ceil((ally.healCooldownUntil - now) / 1000)}s.`});
      return false;
    }
    ally.healCooldownUntil = now + RICKY_HEAL_COOLDOWN_MS;
    const beacon = {
      id:`RB-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      x:Number(player.state?.x || ally.x || 0),
      y:Number(player.state?.y || ally.y || 0),
      radius:RICKY_HEAL_BEACON_RADIUS,
      heal:RICKY_HEAL_BEACON_AMOUNT,
      nextTickAt:now,
      expiresAt:now + RICKY_HEAL_BEACON_DURATION_MS
    };
    if(!Array.isArray(instance.beacons)) instance.beacons = [];
    instance.beacons.push(beacon);
    io.to(`instance:${instance.id}`).emit("portal:ricky-heal", {beacon, cooldown:RICKY_HEAL_COOLDOWN_MS / 1000, at:now});
    healRickyBeaconTargets(group, beacon);
    emitInstance(group);
    return true;
  }

  return {
    buildServerPortalWave,
    emitPortalComplete,
    portalWaveTotal,
    activateRickyHealBeacon,
    updateRickyCompanions,
    startPortalInstance:startRickyAwarePortalInstance
  };
}
