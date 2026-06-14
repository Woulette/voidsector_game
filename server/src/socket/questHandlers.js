import { WORLD_MAPS } from "../world/definitions.js";

const CLIENT_PROGRESS_TYPES = new Set([
  "talk_npc",
  "deliver_item",
  "mission_control",
  "visit_coordinates"
]);
const MISSION_CONTROL_INTERACTION_RADIUS = 320;

function getPlayerWorldMap(player){
  return WORLD_MAPS[String(player?.mapId || player?.state?.mapId || "")] || null;
}

function getNearbyNpc(player, npcId){
  const map = getPlayerWorldMap(player);
  const state = player?.state;
  if(!map || !state) return {ok:false, reason:"Position joueur inconnue."};
  const npc = (Array.isArray(map.questNpcs) ? map.questNpcs : [])
    .find(entry=>String(entry.id || "") === String(npcId || ""));
  if(!npc) return {ok:false, reason:"PNJ introuvable sur cette carte."};
  const radius = Math.max(80, Number(npc.interactionRadius || npc.radius || 180));
  const distance = Math.hypot(Number(state.x || 0) - Number(npc.x || 0), Number(state.y || 0) - Number(npc.y || 0));
  if(distance > radius) return {ok:false, reason:"PNJ trop loin."};
  return {ok:true, map, npc};
}

function getNearbyMissionControl(player){
  const map = getPlayerWorldMap(player);
  const state = player?.state;
  const spawn = map?.spawn;
  if(!map || !state || !spawn) return {ok:false, reason:"Controleur de mission introuvable."};
  const sideX = Number(spawn.x || 0) > 0 ? -1 : 1;
  const sideY = Number(spawn.y || 0) > 0 ? -1 : 1;
  const station = {
    id:"quests",
    x:Number(spawn.x || 0) + sideX * 600,
    y:Number(spawn.y || 0) + sideY * 300,
    radius:MISSION_CONTROL_INTERACTION_RADIUS
  };
  const distance = Math.hypot(Number(state.x || 0) - station.x, Number(state.y || 0) - station.y);
  if(distance > station.radius) return {ok:false, reason:"Controleur de mission trop loin."};
  return {ok:true, map, station};
}

export function registerQuestHandlers(socket, context){
  const {emitProfileSync, guard, players, profileManager, progressProfileQuestAction} = context;

  socket.on("quest:accept", payload=>{
    if(!guard("quest:accept")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"accept", questId:payload?.id}
    });
    if(!result.ok){
      socket.emit("quest:error", {message:result.reason || "Quete impossible."});
      return;
    }
    socket.emit("quest:accepted", {id:result.quest?.id, title:result.quest?.title, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("quest:claim", payload=>{
    if(!guard("quest:claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"claim", questId:payload?.id}
    });
    if(!result.ok){
      socket.emit("quest:error", {message:result.reason || "Recompense impossible."});
      return;
    }
    socket.emit("quest:claimed", {
      id:result.quest?.id,
      title:result.quest?.title,
      reward:result.reward || result.claimedQuests?.[0]?.reward || {},
      auto:false,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("quest:track", payload=>{
    if(!guard("quest:track")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyQuestAction({
      player,
      action:{kind:"track", questId:payload?.id}
    });
    if(!result.ok){
      socket.emit("quest:error", {message:result.reason || "Suivi de quete impossible."});
      return;
    }
    socket.emit("quest:tracked", {id:result.quest?.id, title:result.quest?.title, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("quest:progress", payload=>{
    if(!guard("quest:progress")) return;
    const type = String(payload?.type || "");
    if(!CLIENT_PROGRESS_TYPES.has(type)) return;
    const player = players.get(socket.id);
    if(!player) return;
    const map = getPlayerWorldMap(player);
    if(!map){
      socket.emit("quest:error", {message:"Carte joueur inconnue."});
      return;
    }
    if(type === "talk_npc" || type === "deliver_item"){
      const npcResult = getNearbyNpc(player, payload?.npcId);
      if(!npcResult.ok){
        socket.emit("quest:error", {message:npcResult.reason || "Interaction PNJ impossible."});
        return;
      }
      progressProfileQuestAction(socket, {
        type,
        itemId:String(payload?.itemId || ""),
        npcId:String(npcResult.npc.id || ""),
        zoneName:String(npcResult.map.name || "")
      });
      return;
    }
    if(type === "mission_control"){
      const stationResult = getNearbyMissionControl(player);
      if(!stationResult.ok){
        socket.emit("quest:error", {message:stationResult.reason || "Controleur de mission impossible."});
        return;
      }
      progressProfileQuestAction(socket, {
        type,
        stationId:String(stationResult.station.id || "quests"),
        zoneName:String(stationResult.map.name || "")
      });
      return;
    }
    if(!player.state){
      socket.emit("quest:error", {message:"Position joueur inconnue."});
      return;
    }
    progressProfileQuestAction(socket, {
      type,
      zoneName:String(map.name || ""),
      x:Number(player.state.x || 0),
      y:Number(player.state.y || 0),
      amount:1
    });
  });
}
