export function registerCombatHandlers(socket, context){
  const {activateShipAbility, applyEnemyHit, applyPlayerHit, guard, pickupLoot} = context;

  function emitCombatMiss(payload){
    socket.emit("combat:hit", {
      enemyId:String(payload?.enemyId || ""),
      weaponClass:String(payload?.weaponClass || ""),
      ammoId:String(payload?.ammoId || ""),
      consumed:0,
      hit:false,
      damage:0,
      mapId:"",
      x:Number(payload?.clientAimX || 0),
      y:Number(payload?.clientAimY || 0),
      radius:Number(payload?.targetRadius || 0),
      at:Date.now()
    });
  }

  socket.on("combat:fire", payload=>{
    if(!guard("combat:fire")){
      emitCombatMiss(payload);
      return;
    }
    applyEnemyHit(socket, payload);
  });

  socket.on("combat:fire-player", payload=>{
    if(!guard("combat:fire-player")){
      emitCombatMiss(payload);
      return;
    }
    applyPlayerHit?.(socket, payload);
  });

  socket.on("ship:ability-use", payload=>{
    if(!guard("ship:ability-use")) return;
    activateShipAbility?.(String(payload?.abilityId || ""));
  });

  socket.on("loot:pickup", payload=>{
    if(!guard("loot:pickup")) return;
    pickupLoot(socket, payload);
  });
}
