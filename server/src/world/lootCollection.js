import {
  LOOT_COLLECTION_DURATION_MS,
  LOOT_COLLECTION_MOVE_TOLERANCE,
  LOOT_COLLECTION_START_RADIUS,
  LOOT_COLLECTION_TIMEOUT_MS,
  getLootCollectionHoverPoint
} from "../../../src/shared/lootCollection.js";

const distance = (a, b)=>Math.hypot(a.x - b.x, a.y - b.y);
function point(value){
  return value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))
    ? {x:Number(value.x), y:Number(value.y)} : null;
}

/** One server-clock collection channel per socket, advanced by the world tick. */
export function createLootCollectionManager({players, getDrop, getMap = ()=>null, complete, now = Date.now}){
  const pending = new Map();

  function validate(socket, id, at){
    const player = players.get(socket.id);
    const drop = getDrop(id);
    if(!player || !drop) return {reason:"missing", message:"Butin introuvable."};
    if(drop.ownerId !== socket.id) return {reason:"owner", message:"Ce butin ne t'appartient pas."};
    if(at >= Number(drop.expiresAt || 0)) return {reason:"expired", message:"Butin expire."};
    if(socket.connected === false || player.connected === false || (player.clientMode && player.clientMode !== "game")){
      return {reason:"disconnected", message:"Ramassage indisponible."};
    }
    const state = player.state;
    if(!state || !Number.isFinite(Number(state.hp)) || Number(state.hp) <= 0){
      return {reason:"dead", message:"Le vaisseau ne peut pas ramasser de butin."};
    }
    if(String(player.mapId || "") !== String(drop.mapId || "")
      || String(state.mapId || "") !== String(drop.mapId || "")){
      return {reason:"map", message:"Butin sur une autre map."};
    }
    const position = point(state);
    const hover = getLootCollectionHoverPoint(drop, getMap(drop.mapId));
    if(!position || !point(drop) || distance(position, hover) > LOOT_COLLECTION_START_RADIUS){
      return {reason:"distance", message:"Trop loin du butin."};
    }
    return {player, drop, position, hover};
  }

  function cancel(socket, id, reason = "cancelled", attemptId){
    const channel = pending.get(socket.id);
    // A late cancellation for a previous item cannot interrupt the new one.
    if(!channel || channel.id !== id) return false;
    if(attemptId !== undefined && channel.attemptId && channel.attemptId !== attemptId) return false;
    pending.delete(socket.id);
    socket.emit("loot:collection", {id, ...(channel.attemptId ? {attemptId:channel.attemptId} : {}),
      status:"cancelled", durationMs:LOOT_COLLECTION_DURATION_MS, reason});
    return true;
  }

  function checkChannel(channel, at){
    const result = validate(channel.socket, channel.id, at);
    if(result.reason) return result;
    if(result.player !== channel.player || result.drop !== channel.drop){
      return {reason:"replaced", message:"Ramassage interrompu."};
    }
    if(at - channel.startedAt >= LOOT_COLLECTION_TIMEOUT_MS){
      return {reason:"timeout", message:"Ramassage expire."};
    }
    if(distance(result.position, channel.anchor) > LOOT_COLLECTION_MOVE_TOLERANCE){
      return {reason:"movement", message:"Ramassage interrompu par le deplacement."};
    }
    const target = point(result.player.state.moveTarget);
    // A last movement packet still aiming at the arrival point is harmless.
    if(target && distance(target, result.hover) > LOOT_COLLECTION_START_RADIUS
      && distance(target, channel.anchor) > LOOT_COLLECTION_MOVE_TOLERANCE){
      return {reason:"movement", message:"Ramassage interrompu par le deplacement."};
    }
    return result;
  }

  function advance(channel, at){
    const result = checkChannel(channel, at);
    if(result.reason){
      cancel(channel.socket, channel.id, result.reason);
      return false;
    }
    if(!channel.finishRequested || at < channel.endsAt) return false;
    // Delete the channel before calling the synchronous reward transaction.
    pending.delete(channel.socket.id);
    complete(channel.socket, result.player, result.drop, channel.attemptId);
    return true;
  }

  function handle(socket, payload){
    const id = String(payload?.id || "");
    const attemptId = String(payload?.attemptId || "").slice(0, 128);
    const correlation = attemptId ? {attemptId} : {};
    const phase = payload?.phase === undefined ? "start" : payload.phase;
    const at = now();
    if(phase === "cancel") return cancel(socket, id, "cancelled", attemptId);
    if(phase !== "start" && phase !== "finish"){
      socket.emit("loot:error", {id, ...correlation, message:"Phase de ramassage invalide."});
      return false;
    }
    const existing = pending.get(socket.id);
    if(phase === "finish"){
      if(!existing || existing.id !== id){
        socket.emit("loot:error", {id, ...correlation, message:"Aucun ramassage en cours pour ce butin."});
        return false;
      }
      if(existing.attemptId && existing.attemptId !== attemptId) return false;
      existing.finishRequested = true;
      return advance(existing, at);
    }
    const result = validate(socket, id, at);
    if(result.reason){
      if(existing?.id === id) cancel(socket, id, result.reason, attemptId);
      socket.emit("loot:error", {id, ...correlation, message:result.message});
      return false;
    }
    if(existing?.id === id && existing.attemptId === attemptId){
      // Retrying a start must neither shorten nor reset its server deadline.
      if(checkChannel(existing, at).reason){
        cancel(socket, id, "interrupted");
        return false;
      }
      socket.emit("loot:collection", {id, ...correlation, status:"started", durationMs:LOOT_COLLECTION_DURATION_MS,
        startedAt:existing.startedAt, endsAt:existing.endsAt});
      return true;
    }
    if(existing) cancel(socket, existing.id, "replaced");
    const channel = {id, attemptId, socket, player:result.player, drop:result.drop, anchor:result.position,
      startedAt:at, endsAt:at + LOOT_COLLECTION_DURATION_MS, finishRequested:false};
    pending.set(socket.id, channel);
    socket.emit("loot:collection", {id, ...correlation, status:"started", durationMs:LOOT_COLLECTION_DURATION_MS,
      startedAt:channel.startedAt, endsAt:channel.endsAt});
    return true;
  }

  function tick(at = now()){
    for(const channel of pending.values()) advance(channel, at);
  }

  return {handle, tick};
}
