export function registerAdminHandlers(socket, context){
  const {
    adminManager,
    guard
  } = context;

  function emitResult(eventName, result){
    if(result?.ok) socket.emit(eventName, result);
    else socket.emit("admin:error", {message:result?.reason || "Action admin refusee.", at:Date.now()});
  }

  socket.on("admin:sync", async payload=>{
    if(!guard("admin:sync")) return;
    emitResult("admin:snapshot", await adminManager.snapshot(socket, payload || {}));
  });

  socket.on("admin:inspect-player", async payload=>{
    if(!guard("admin:inspect-player")) return;
    emitResult("admin:player", await adminManager.inspectPlayer(socket, payload || {}));
  });

  socket.on("admin:kick", async payload=>{
    if(!guard("admin:kick")) return;
    emitResult("admin:kicked", await adminManager.kickPlayer(socket, payload || {}));
  });

  socket.on("admin:adjust-player", async payload=>{
    if(!guard("admin:adjust-player")) return;
    emitResult("admin:adjusted", await adminManager.adjustPlayer(socket, payload || {}));
  });

  socket.on("admin:grant-player", async payload=>{
    if(!guard("admin:grant-player")) return;
    emitResult("admin:granted", await adminManager.grantPlayer(socket, payload || {}));
  });

  socket.on("admin:inventory-remove", async payload=>{
    if(!guard("admin:inventory-remove")) return;
    emitResult("admin:inventory-removed", await adminManager.removeInventoryItem(socket, payload || {}));
  });

  socket.on("admin:moderate-account", async payload=>{
    if(!guard("admin:moderate-account")) return;
    emitResult("admin:moderated", await adminManager.moderateAccount(socket, payload || {}));
  });

  socket.on("admin:reset-instance", async payload=>{
    if(!guard("admin:reset-instance")) return;
    emitResult("admin:instance-reset", await adminManager.resetInstance(socket, payload || {}));
  });
}
