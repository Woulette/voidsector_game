function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

export function installEconomySocketListeners({socket, multiplayer, emitChange, toast}){
  [
    ["shop:ammo-bought", "shopAmmoEvents"],
    ["shop:item-bought", "shopItemEvents"],
    ["shop:premium-pack-bought", "shopPremiumPackEvents"],
    ["premium:reward-claimed", "premiumRewardEvents"],
    ["inventory:item-sold", "inventorySaleEvents"],
    ["shop:ship-bought", "shopShipEvents"],
    ["shop:drone-bought", "shopDroneEvents"],
    ["shop:drone-formation-bought", "shopDroneFormationEvents"]
  ].forEach(([eventName, target])=>{
    socket.on(eventName, event=>{
      pushEvent(multiplayer[target], event, 40);
      emitChange(eventName, event);
    });
  });
  socket.on("shop:error", payload=>{
    toast(payload?.message || "Achat serveur impossible.");
    emitChange("shop:error", payload);
  });
  socket.on("premium:reward-error", payload=>{
    toast(payload?.message || "Recompense premium impossible.");
    emitChange("premium:reward-error", payload);
  });
  socket.on("inventory:error", payload=>{
    toast(payload?.message || "Action inventaire impossible.");
    emitChange("inventory:error", payload);
  });
  socket.on("ship:active-equipped", event=>{
    pushEvent(multiplayer.shipEvents, event, 20);
    emitChange("ship:active-equipped", event);
  });
  socket.on("ship:equip-error", payload=>{
    toast(payload?.message || "Changement de vaisseau impossible.");
    emitChange("ship:equip-error", payload);
  });
  socket.on("equipment:updated", event=>{
    pushEvent(multiplayer.equipmentEvents, event, 40);
    emitChange("equipment:updated", event);
  });
  socket.on("equipment:error", payload=>{
    toast(payload?.message || "Action equipement impossible.");
    emitChange("equipment:error", payload);
  });
  socket.on("combat:hit", event=>{
    pushEvent(multiplayer.combatEvents, event, 80);
    emitChange("combat:hit", event);
  });
  socket.on("refinery:updated", event=>{
    pushEvent(multiplayer.refineryEvents, event, 40);
    emitChange("refinery:updated", event);
  });
  socket.on("refinery:error", payload=>{
    toast(payload?.message || "Action raffinerie impossible.");
    emitChange("refinery:error", payload);
  });
  socket.on("space-caster:result", event=>{
    pushEvent(multiplayer.spaceCasterEvents, event, 20);
    emitChange("space-caster:result", event);
  });
  socket.on("space-caster:error", payload=>{
    toast(payload?.message || "Space Caster impossible.");
    emitChange("space-caster:error", payload);
  });
}
