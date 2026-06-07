export function createCombatCommands({multiplayer}){
  function sendPlayerSnapshot(payload){
    if(!multiplayer.connected || !multiplayer.socket) return;
    if(multiplayer.auth.token && !multiplayer.auth.account) return;
    const now = performance.now();
    if(now - multiplayer.lastSent < 50) return;
    multiplayer.lastSent = now;
    multiplayer.socket.emit("player:state", payload);
  }

  function sendServerEnemyHit(enemyId, context = {}){
    if(!multiplayer.connected || !multiplayer.socket || !enemyId) return;
    multiplayer.socket.emit("combat:fire", {
      enemyId,
      weaponClass:context.weaponClass || "laser",
      ammoId:context.ammoId || "ammo_x1",
      count:context.count || 1,
      clientAimX:Number(context.clientAimX || 0),
      clientAimY:Number(context.clientAimY || 0),
      targetRadius:Number(context.targetRadius || 0)
    });
  }

  function sendServerPlayerHit(targetPlayerId, context = {}){
    if(!multiplayer.connected || !multiplayer.socket || !targetPlayerId) return;
    multiplayer.socket.emit("combat:fire-player", {
      targetPlayerId,
      weaponClass:context.weaponClass || "laser",
      ammoId:context.ammoId || "ammo_x1",
      count:context.count || 1,
      clientAimX:Number(context.clientAimX || 0),
      clientAimY:Number(context.clientAimY || 0),
      targetRadius:Number(context.targetRadius || 0)
    });
  }

  function sendPlayerLaserEffect(payload){
    if(!multiplayer.connected || !multiplayer.socket) return;
    multiplayer.socket.emit("player:laser", payload);
  }

  return {sendPlayerSnapshot, sendServerEnemyHit, sendServerPlayerHit, sendPlayerLaserEffect};
}
