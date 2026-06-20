import { FIRMS } from "../../../src/data/firms.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { getWorldSafePortals } from "../world/spawn.js";
import { spendCurrency } from "./progression.js";

const RADIATION_GRACE_MS = 30_000;
const PORTAL_STARTING_LIVES = 3;
const OPEN_RESPAWN_HP_RATIO = 0.2;
const PORTAL_RESPAWN_HP_RATIO = 0.5;
const RESPAWN_COSTS = {
  portal:100,
  death:200
};

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getHomeMap(profile){
  const firmId = String(profile?.player?.firmId || "astra").toLowerCase();
  const firm = FIRMS.find(entry=>entry.id === firmId) || FIRMS[0];
  return WORLD_MAPS[String(firm.baseMapId)] || WORLD_MAPS["0"];
}

function getNearestPortal(point, map){
  return getWorldSafePortals(map).reduce((nearest, portal)=>{
    const distance = Math.hypot(finite(point?.x) - finite(portal.x), finite(point?.y) - finite(portal.y));
    return !nearest || distance < nearest.distance ? {portal, distance} : nearest;
  }, null)?.portal || null;
}

function getPortalContext(player, groups){
  const group = player?.groupId ? groups.get(player.groupId) : null;
  const instance = group?.instance;
  if(!instance || instance.type !== "portal") return null;
  if(Array.isArray(instance.joinedMemberIds) && !instance.joinedMemberIds.includes(player.id)) return null;
  if(String(player?.state?.mapId || player?.mapId || "") !== `portal-${instance.portal?.id}`) return null;
  return {group, instance};
}

function isOutsideMap(state, map){
  if(!state || !map) return false;
  return finite(state.x) < -map.width / 2
    || finite(state.x) > map.width / 2
    || finite(state.y) < -map.height / 2
    || finite(state.y) > map.height / 2;
}

function makeRespawnSession(player, source){
  return {
    ...player.state,
    source,
    updatedAt:Date.now()
  };
}

export function createPlayerLifecycleManager({
  io,
  players,
  groups,
  profileManager,
  emitProfileSync,
  presence,
  setPlayerMap,
  logger
}){
  function emitDeath(player){
    if(!player?.deathState) return;
    io.to(player.id).emit("player:death", {
      ...player.deathState,
      at:Date.now()
    });
  }

  function syncPlayerLifecycle(player){
    if(player?.deathState) emitDeath(player);
  }

  function saveState(player, force = true){
    profileManager.saveWorldSession({player, state:player.state, force});
  }

  function clearTransientCombatState(player){
    if(!player?.state) return;
    player.state.hp = 0;
    player.state.vx = 0;
    player.state.vy = 0;
    player.state.enginePower = 0;
    player.state.moveTarget = null;
    player.state.attackTargetId = "";
    player.state.attackAmmoId = "";
    player.state.attackWeaponClass = "";
    player.state.repairBotActive = false;
    player.state.updatedAt = Date.now();
    player.serverRepairBotTick = 0;
    player.statusEffects = {};
  }

  function applyRespawnState(player, {map, x, y, hpRatio, source, portalAbandoned = false, message = ""}){
    const state = player.state;
    state.mapId = String(map.id);
    state.x = finite(x, map.spawn?.x);
    state.y = finite(y, map.spawn?.y);
    state.hp = Math.max(1, Math.round(Math.max(1, finite(state.maxHp, 1)) * hpRatio));
    state.shield = Math.max(0, finite(state.maxShield));
    state.vx = 0;
    state.vy = 0;
    state.enginePower = 0;
    state.moveTarget = null;
    state.attackTargetId = "";
    state.attackAmmoId = "";
    state.attackWeaponClass = "";
    state.repairBotActive = false;
    state.updatedAt = Date.now();
    player.mapId = state.mapId;
    player.deathState = null;
    player.radiationStartedAt = 0;
    player.lastRadiationEmitAt = 0;
    player.serverRepairBotTick = 0;
    player.statusEffects = {};
    const socket = io.sockets.sockets.get(player.id);
    if(socket) setPlayerMap(socket, state.mapId);
    saveState(player, true);
    io.to(player.id).emit("player:respawned", {
      session:makeRespawnSession(player, source),
      portalAbandoned,
      message,
      at:Date.now()
    });
  }

  function abandonPortal(player, context, message){
    const {instance} = context;
    if(!Array.isArray(instance.abandonedMemberIds)) instance.abandonedMemberIds = [];
    if(!instance.abandonedMemberIds.includes(player.id)) instance.abandonedMemberIds.push(player.id);
    const profile = profileManager.getProfileForPlayer(player);
    const home = getHomeMap(profile);
    applyRespawnState(player, {
      map:home,
      x:home.spawn?.x,
      y:home.spawn?.y,
      hpRatio:OPEN_RESPAWN_HP_RATIO,
      source:"portal-abandon",
      portalAbandoned:true,
      message
    });
  }

  function markPlayerDead(player, {reason = "combat", sourceId = ""} = {}){
    if(!player?.state || player.deathState || Number(player.state.hp || 0) > 0) return false;
    clearTransientCombatState(player);
    presence.markCombat(player, "mort");
    const questResult = profileManager.applyQuestAction({
      player,
      action:{kind:"death"}
    });
    if(questResult?.changed){
      emitProfileSync?.(player, questResult.profile);
      if(questResult.failed?.length){
        io.to(player.id).emit("quest:fail-progress", {
          updates:[],
          failed:questResult.failed,
          at:Date.now()
        });
      }
    }
    const portalContext = getPortalContext(player, groups);
    if(portalContext){
      const {instance} = portalContext;
      if(!instance.playerLives || typeof instance.playerLives !== "object") instance.playerLives = {};
      const currentLives = Math.max(0, Math.round(finite(instance.playerLives[player.id], PORTAL_STARTING_LIVES)));
      const remainingLives = Math.max(0, currentLives - 1);
      instance.playerLives[player.id] = remainingLives;
      player.deathState = {
        serverAuthoritative:true,
        gameMode:"portal",
        mapId:String(player.state.mapId),
        x:finite(player.state.x),
        y:finite(player.state.y),
        portalLives:remainingLives,
        portalStartingLives:PORTAL_STARTING_LIVES,
        reason,
        sourceId:String(sourceId || ""),
        choices:remainingLives > 0 ? ["portal-resume", "spawn"] : []
      };
      saveState(player, true);
      emitDeath(player);
      if(remainingLives <= 0){
        abandonPortal(player, portalContext, "Portail ferme : 3 vies perdues.");
      }
      return true;
    }

    const map = WORLD_MAPS[String(player.state.mapId || player.mapId || "0")] || WORLD_MAPS["0"];
    const nearestPortal = getNearestPortal(player.state, map);
    player.deathState = {
      serverAuthoritative:true,
      gameMode:"open",
      mapId:String(map.id),
      x:finite(player.state.x),
      y:finite(player.state.y),
      portal:nearestPortal ? {x:finite(nearestPortal.x), y:finite(nearestPortal.y)} : null,
      reason,
      sourceId:String(sourceId || ""),
      choices:["spawn", "portal", "death"],
      costs:{...RESPAWN_COSTS}
    };
    saveState(player, true);
    emitDeath(player);
    return true;
  }

  function spendRespawnCost(player, choice){
    const cost = Math.max(0, Number(RESPAWN_COSTS[choice] || 0));
    if(cost <= 0) return {ok:true, profile:profileManager.getProfileForPlayer(player)};
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        const spent = spendCurrency(profile.player || {}, "premium", cost);
        if(!spent.ok) return {ok:false, reason:"Pas assez de NOVA."};
        profile.player = spent.player;
        return {ok:true, changed:true};
      }
    });
    if(result.ok) emitProfileSync?.(player, result.profile);
    return result;
  }

  function respawnPlayer(socket, choiceValue){
    const player = players.get(socket.id);
    const choice = String(choiceValue || "spawn");
    if(!player?.state){
      logger?.warn?.("Invalid respawn request", {playerId:socket.id, reason:"player not dead", choice});
      socket.emit("player:respawn-error", {message:"Respawn impossible.", at:Date.now()});
      return false;
    }
    if(!player.deathState && Number(player.state.hp || 0) <= 0) markPlayerDead(player);
    const death = player.deathState;
    if(!death){
      io.to(player.id).emit("player:respawned", {
        session:makeRespawnSession(player, "respawn-already-applied"),
        portalAbandoned:!String(player.state.mapId || "").startsWith("portal-"),
        message:"Respawn deja applique.",
        at:Date.now()
      });
      return true;
    }
    if(!Array.isArray(death.choices) || !death.choices.includes(choice)){
      logger?.warn?.("Invalid respawn request", {playerId:socket.id, reason:"choice rejected", choice});
      socket.emit("player:respawn-error", {message:"Choix de respawn refuse.", at:Date.now()});
      return false;
    }

    if(death.gameMode === "portal"){
      const context = getPortalContext(player, groups);
      if(!context){
        socket.emit("player:respawn-error", {message:"Instance de portail introuvable.", at:Date.now()});
        return false;
      }
      if(choice === "spawn"){
        abandonPortal(player, context, "Portail abandonne.");
        return true;
      }
      const map = {
        id:String(death.mapId),
        spawn:{x:0, y:0}
      };
      applyRespawnState(player, {
        map,
        x:death.x,
        y:death.y,
        hpRatio:PORTAL_RESPAWN_HP_RATIO,
        source:"portal-respawn",
        message:"Retour dans le portail."
      });
      return true;
    }

    const costResult = spendRespawnCost(player, choice);
    if(!costResult.ok){
      socket.emit("player:respawn-error", {message:costResult.reason || "Respawn impossible.", at:Date.now()});
      return false;
    }
    const profile = costResult.profile || profileManager.getProfileForPlayer(player);
    const deathMap = WORLD_MAPS[String(death.mapId)] || WORLD_MAPS["0"];
    const home = getHomeMap(profile);
    const target = choice === "death"
      ? {map:deathMap, x:death.x, y:death.y, message:"Respawn a la position de destruction."}
      : choice === "portal"
        ? {map:deathMap, x:death.portal?.x ?? deathMap.spawn?.x, y:death.portal?.y ?? deathMap.spawn?.y, message:"Respawn au portail le plus proche."}
        : {map:home, x:home.spawn?.x, y:home.spawn?.y, message:`Respawn gratuit sur ${home.name}.`};
    applyRespawnState(player, {
      ...target,
      hpRatio:OPEN_RESPAWN_HP_RATIO,
      source:"server-respawn"
    });
    return true;
  }

  function updateRadiation(player, now){
    if(!player?.state || player.deathState || Number(player.state.hp || 0) <= 0) return;
    const map = WORLD_MAPS[String(player.state.mapId || player.mapId || "")];
    if(!map || !isOutsideMap(player.state, map)){
      if(player.radiationStartedAt){
        player.radiationStartedAt = 0;
        player.lastRadiationEmitAt = 0;
        io.to(player.id).emit("player:radiation", {active:false, remainingSeconds:30, at:now});
      }
      return;
    }
    if(!player.radiationStartedAt) player.radiationStartedAt = now;
    const remainingMs = Math.max(0, RADIATION_GRACE_MS - (now - player.radiationStartedAt));
    if(!player.lastRadiationEmitAt || now - player.lastRadiationEmitAt >= 1000){
      player.lastRadiationEmitAt = now;
      io.to(player.id).emit("player:radiation", {
        active:true,
        remainingSeconds:Math.ceil(remainingMs / 1000),
        at:now
      });
    }
    if(remainingMs > 0) return;
    player.state.hp = 0;
    player.state.shield = 0;
    player.state.updatedAt = now;
    markPlayerDead(player, {reason:"radiation"});
  }

  function updatePlayerLifecycles(_dt, now = Date.now()){
    for(const player of players.values()){
      if(!player?.state) continue;
      if(Number(player.state.hp || 0) <= 0){
        markPlayerDead(player);
        continue;
      }
      updateRadiation(player, now);
    }
  }

  return {
    markPlayerDead,
    respawnPlayer,
    syncPlayerLifecycle,
    updatePlayerLifecycles
  };
}
