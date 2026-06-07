const CLIENT_PROGRESS_TYPES = new Set([
  "refinery_module_upgrade_start",
  "refinery_material_upgrade_start",
  "space_caster_use",
  "quest_item_drop",
  "talk_npc",
  "deliver_item",
  "visit_coordinates"
]);

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
    progressProfileQuestAction(socket, {
      type,
      moduleId:String(payload?.moduleId || ""),
      materialId:String(payload?.materialId || ""),
      itemId:String(payload?.itemId || ""),
      npcId:String(payload?.npcId || ""),
      zoneName:String(payload?.zoneName || ""),
      x:Number(payload?.x || 0),
      y:Number(payload?.y || 0),
      targetLevel:Number(payload?.targetLevel || 0),
      amount:Number(payload?.amount || 1)
    });
  });
}
