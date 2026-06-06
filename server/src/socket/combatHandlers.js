export function registerCombatHandlers(socket, context){
  const {applyEnemyHit, guard, pickupLoot} = context;

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

  socket.on("coop:enemy-hit", payload=>{
    if(!guard("coop:enemy-hit")) return;
    applyEnemyHit(socket, payload);
  });

  socket.on("combat:fire", payload=>{
    if(!guard("combat:fire")){
      emitCombatMiss(payload);
      return;
    }
    applyEnemyHit(socket, {...payload, serverCalculated:true});
  });

  socket.on("loot:pickup", payload=>{
    if(!guard("loot:pickup")) return;
    pickupLoot(socket, payload);
  });

  socket.on("enemy:hit", payload=>{
    if(!guard("enemy:hit")) return;
    applyEnemyHit(socket, payload);
  });
}
