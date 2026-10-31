import { randomUUID } from "node:crypto";
import { isPremiumActive } from "../../../src/data/premium.js";
import { MAP_PORTAL_TRANSFER_DURATION } from "../../../src/game/systems/mapPortalTransfer.js";
import { getTrustedMovementSpeed } from "../players/playerStateValidation.js";
import { advanceServerPlayerStateTimeline } from "../players/playerStateStream.js";
import { WORLD_SESSION_SAVE_INTERVAL_MS } from "../players/profileWorldSession.js";
import { createSectorTravelRoutes } from "./sectorTravelRoutes.js";

const STATE_INTERVAL_MS = 200;
export const SECTOR_TRAVEL_ARRIVAL_GUARD_MS = 15000;
const TRANSFER_DURATION_MS = MAP_PORTAL_TRANSFER_DURATION * 1000;
const MOTION_FIELDS = ["x", "y", "vx", "vy", "mapId", "moveTarget", "angle", "engineAngle", "enginePower"];
const cleanToken = value=>(typeof value === "string" || typeof value === "number" ? String(value) : "")
  .replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 100);

export function createSectorTravelManager({
  io, players, profileManager, presence, setPlayerMap, publicPlayer,
  routes = createSectorTravelRoutes(), now:readNow = ()=>Date.now(), makeId = randomUUID
} = {}){
  const journeys = new Map();
  const arrivals = new Map();

  function profileFor(player){
    return profileManager?.getProfileSnapshotForPlayer?.(player)
      || profileManager?.getProfileForPlayer?.(player) || null;
  }

  function problem(player, profile, now){
    if(!player?.accountId || player.clientMode !== "game" || !player.state){
      return {code:"session-required", message:"Une session de vol MMO est requise."};
    }
    if(players.get(player.id) !== player || player.connected === false){
      return {code:"disconnected", message:"Voyage interrompu : session deconnectee."};
    }
    if(!isPremiumActive(profile?.player, now)){
      return {code:"premium-required", message:"Le voyage automatique est reserve aux abonnes Premium."};
    }
    if(player.deathState || player.state.isDead || Number(player.state.hp || 0) <= 0){
      return {code:"dead", message:"Voyage interrompu : vaisseau detruit."};
    }
    if(!Number.isFinite(player.state.x) || !Number.isFinite(player.state.y)){
      return {code:"invalid-position", message:"Position du vaisseau indisponible."};
    }
    if(player.pendingPortgunTeleport || Number(player.shipSwitchLockUntil || 0) > now || player.logoutPending){
      return {code:"busy", message:"Termine l'action en cours avant de voyager."};
    }
    return null;
  }

  function stopMovement(player, now){
    if(!player?.state) return;
    Object.assign(player.state, {vx:0, vy:0, enginePower:0, moveTarget:null, updatedAt:now});
  }

  function emitState(player, journey, now){
    journey.revision += 1;
    journey.nextEmitAt = now + STATE_INTERVAL_MS;
    const session = {...player.state, moveTarget:player.state?.moveTarget ? {...player.state.moveTarget} : null, source:"auto-travel"};
    const payload = {
      id:journey.id, requestId:journey.requestId, revision:journey.revision,
      status:journey.status, targetMapId:journey.targetMapId,
      route:[...journey.route], index:journey.index,
      currentMapId:String(player.state?.mapId ?? player.mapId),
      nextMapId:journey.route[journey.index + 1] ?? null,
      moveTarget:session.moveTarget, session, at:now,
      ...(journey.reason ? {reason:journey.reason, message:journey.message} : {}),
      ...(journey.transition ? {transition:{
        ...journey.transition,
        durationMs:TRANSFER_DURATION_MS,
        elapsedMs:Math.max(0, Math.min(TRANSFER_DURATION_MS, now - journey.transition.startedAt))
      }} : {})
    };
    io?.to?.(player.id)?.emit?.("travel:state", payload);
    return payload;
  }

  function broadcastMovement(player, now){
    advanceServerPlayerStateTimeline(player, now, STATE_INTERVAL_MS);
    if(player.mapRoom && typeof publicPlayer === "function"){
      io?.to?.(player.mapRoom)?.emit?.("player:state", publicPlayer(player));
      player.lastReliableStateBroadcastAt = now;
    }
  }

  function finish(player, journey, status, reason = "", message = "", now = readNow()){
    journeys.delete(player.id);
    // A socket takeover may already have installed another player object and
    // session for this account. Never overwrite or persist that newer session.
    const stillOwnsSession = players.get(player.id) === player;
    if(stillOwnsSession) stopMovement(player, now);
    journey.status = status;
    journey.reason = reason;
    journey.message = message;
    journey.transition = null;
    if(stillOwnsSession){
      broadcastMovement(player, now);
      profileManager?.saveWorldSession?.({player, state:player.state, force:true});
    }
    return emitState(player, journey, now);
  }

  function cancel(player, {journeyId, requestId, reason = "manual", message = "Voyage automatique interrompu.", now = readNow()} = {}){
    const journey = journeys.get(player?.id);
    if(!journey || journey.player !== player) return false;
    if(journeyId && String(journeyId) !== journey.id) return false;
    if(requestId && String(requestId) !== journey.requestId) return false;
    finish(player, journey, "cancelled", reason, message, now);
    return true;
  }

  function start(player, payload = {}, now = readNow()){
    if(!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};
    const requestId = cleanToken(payload.requestId);
    const profile = profileFor(player);
    const invalid = problem(player, profile, now);
    if(invalid) return {ok:false, requestId, ...invalid};
    const fromMapId = String(player.state.mapId ?? player.mapId);
    const targetMapId = cleanToken(payload.targetMapId);
    const route = routes.find(fromMapId, targetMapId);
    if(!route) return {ok:false, requestId, code:"unreachable", message:"Aucun passage ouvert vers ce secteur."};
    cancel(player, {reason:"replaced", message:"Nouvelle destination selectionnee.", now});
    const journey = {
      id:makeId(), requestId, player, accountId:player.accountId,
      shipId:player.state.shipId, route, index:0, targetMapId,
      status:"traveling", revision:0, nextEmitAt:0,
      nextSaveAt:now + WORLD_SESSION_SAVE_INTERVAL_MS, transition:null
    };
    stopMovement(player, now);
    if(route.length === 1){
      return {ok:true, travel:finish(player, journey, "arrived", "", "Tu es deja dans ce secteur.", now)};
    }
    journeys.set(player.id, journey);
    const nextLeg = routes.leg(route[0], route[1]);
    player.state.moveTarget = {x:nextLeg.x, y:nextLeg.y};
    presence?.markActivity?.(player, "voyage automatique", now);
    return {ok:true, travel:emitState(player, journey, now)};
  }

  function checkJourney(player, journey, now){
    const profile = profileFor(player);
    const invalid = problem(player, profile, now);
    if(invalid || journey.accountId !== player.accountId || journey.shipId !== player.state?.shipId){
      const reason = invalid || {code:"session-changed", message:"Voyage interrompu : vaisseau ou compte modifie."};
      finish(player, journey, "cancelled", reason.code, reason.message, now);
      return null;
    }
    if(String(player.state.mapId ?? player.mapId) !== journey.route[journey.index]){
      finish(player, journey, "cancelled", "map-changed", "Voyage interrompu : secteur modifie.", now);
      return null;
    }
    return profile;
  }

  // Ordinary player snapshots still validate combat state and source ordering.
  // While the server pilots, they cannot move or transfer the ship themselves.
  function preparePlayerState(player, payload, now = readNow()){
    let arrival = arrivals.get(player?.id);
    if(arrival && (arrival.player !== player || now >= arrival.expiresAt
      || String(player?.state?.mapId) !== arrival.mapId)){
      arrivals.delete(player.id);
      arrival = null;
    }
    if(arrival && String(payload?.mapId ?? "") !== arrival.mapId){
      // A source-map packet can already be in flight when the final portal
      // commits. It must not undo that commit after the journey was removed.
      // Send a correction as well: cancellation may have made the client ignore
      // the travel event carrying the new map.
      if(now >= arrival.nextCorrectionAt){
        arrival.nextCorrectionAt = now + STATE_INTERVAL_MS;
        io?.to?.(player.id)?.emit?.("player:state-correction", {
          ...player.state, source:"state-correction", serverAt:now
        });
      }
      const canonical = {...payload, portalTransfer:false};
      for(const field of MOTION_FIELDS) canonical[field] = player.state[field];
      return canonical;
    }
    const journey = journeys.get(player?.id);
    if(!journey || journey.player !== player || !checkJourney(player, journey, now)) return payload;
    const canonical = {...payload, portalTransfer:journey.status === "transferring"};
    for(const field of MOTION_FIELDS) canonical[field] = player.state[field];
    return canonical;
  }

  function confirmPlayerState(player, originalPayload){
    const arrival = arrivals.get(player?.id);
    if(arrival?.player === player
      && String(originalPayload?.mapId ?? "") === arrival.mapId
      && Number(player.lastClientStateSourceSeq || 0) > arrival.sourceSeq){
      // Called only after the normal sequence/timestamp validator accepted the
      // original packet. Earlier packets can subsequently only be rejected as
      // stale, while legitimate manual destinations remain unrestricted.
      arrivals.delete(player.id);
    }
  }

  function update(dt, now = readNow()){
    for(const [id, arrival] of arrivals){
      if(now >= arrival.expiresAt || players.get(id) !== arrival.player) arrivals.delete(id);
    }
    for(const journey of [...journeys.values()]){
      const player = journey.player;
      const profile = checkJourney(player, journey, now);
      if(!profile) continue;
      const leg = routes.leg(journey.route[journey.index], journey.route[journey.index + 1]);
      if(!leg){
        finish(player, journey, "cancelled", "route-closed", "Voyage interrompu : passage indisponible.", now);
        continue;
      }
      const state = player.state;
      const distance = Math.hypot(leg.x - state.x, leg.y - state.y);
      if(journey.status === "transferring"){
        if(distance > leg.activationRadius){
          finish(player, journey, "cancelled", "portal-distance", "Voyage interrompu : vaisseau hors du portail.", now);
          continue;
        }
        if(now >= journey.transition.completeAt){
          const socket = io?.sockets?.sockets?.get?.(player.id);
          if(!socket){
            finish(player, journey, "cancelled", "disconnected", "Voyage interrompu : session deconnectee.", now);
            continue;
          }
          Object.assign(state, {
            mapId:leg.toMapId, x:leg.targetX, y:leg.targetY,
            vx:0, vy:0, enginePower:0, moveTarget:null, updatedAt:now
          });
          player.mapId = leg.toMapId;
          arrivals.set(player.id, {
            player, mapId:leg.toMapId, sourceSeq:Number(player.lastClientStateSourceSeq || 0),
            committedAt:now, expiresAt:now + SECTOR_TRAVEL_ARRIVAL_GUARD_MS, nextCorrectionAt:0
          });
          journey.index += 1;
          journey.transition = null;
          journey.status = "traveling";
          setPlayerMap(socket, leg.toMapId);
          profileManager?.saveWorldSession?.({player, state, force:true});
          if(journey.index === journey.route.length - 1){
            finish(player, journey, "arrived", "", "Destination atteinte.", now);
            continue;
          }
          const following = routes.leg(journey.route[journey.index], journey.route[journey.index + 1]);
          if(following) state.moveTarget = {x:following.x, y:following.y};
          broadcastMovement(player, now);
          state.motionDiscontinuity = true;
          emitState(player, journey, now);
        }
      }else if(distance <= leg.activationRadius){
        stopMovement(player, now);
        journey.status = "transferring";
        journey.transition = {startedAt:now, completeAt:now + TRANSFER_DURATION_MS};
        broadcastMovement(player, now);
        emitState(player, journey, now);
      }else{
        const slow = player.statusEffects?.slow;
        const slowAmount = slow && now < Number(slow.expiresAt || 0) ? Math.max(0, Number(slow.amount || 0)) : 0;
        const speed = Math.max(1, getTrustedMovementSpeed(profile) - slowAmount);
        const step = Math.min(speed * Math.max(0, Math.min(.12, Number(dt) || 0)), distance);
        const nx = (leg.x - state.x) / distance;
        const ny = (leg.y - state.y) / distance;
        Object.assign(state, {
          x:state.x + nx * step, y:state.y + ny * step,
          vx:nx * speed, vy:ny * speed, speed,
          angle:Math.atan2(ny, nx) + Math.PI / 2,
          engineAngle:Math.atan2(ny, nx) + Math.PI / 2,
          enginePower:1, moveTarget:{x:leg.x, y:leg.y}, updatedAt:now
        });
      }
      presence?.markActivity?.(player, "voyage automatique", now);
      presence?.syncMovementLogoutState?.(player);
      if(now >= journey.nextSaveAt){
        journey.nextSaveAt = now + WORLD_SESSION_SAVE_INTERVAL_MS;
        profileManager?.saveWorldSession?.({player, state});
      }
      if(now >= journey.nextEmitAt){
        broadcastMovement(player, now);
        emitState(player, journey, now);
      }
    }
  }

  return {start, cancel, update, preparePlayerState, confirmPlayerState,
    isActive:player=>Boolean(player && journeys.get(player.id)?.player === player)};
}
