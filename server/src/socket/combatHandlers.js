export function registerCombatHandlers(socket, context){
  const {applyEnemyHit, guard, pickupLoot} = context;

  socket.on("coop:enemy-hit", payload=>{
    if(!guard("coop:enemy-hit")) return;
    applyEnemyHit(socket, payload);
  });

  socket.on("combat:fire", payload=>{
    if(!guard("combat:fire")) return;
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
