export function createCombatCommands({multiplayer}){
  function sendPlayerSnapshot(payload){
    if(!multiplayer.connected || !multiplayer.socket) return;
    if(multiplayer.auth.token && !multiplayer.auth.account) return;
    const now = performance.now();
    if(now - multiplayer.lastSent < 50) return;
    multiplayer.lastSent = now;
    multiplayer.socket.emit("player:state", payload);
  }

  function sendServerEnemyHit(enemyId, amount, context = {}){
    if(!multiplayer.connected || !multiplayer.socket || !enemyId) return;
    const payload = {
      enemyId,
      amount,
      weaponClass:context.weaponClass || "laser",
      ammoId:context.ammoId || "ammo_x1",
      count:context.count || 1,
      serverCalculated:Boolean(context.serverCalculated)
    };
    multiplayer.socket.emit(payload.serverCalculated ? "combat:fire" : "enemy:hit", payload);
  }

  function sendPlayerLaserEffect(payload){
    if(!multiplayer.connected || !multiplayer.socket) return;
    multiplayer.socket.emit("player:laser", payload);
  }

  return {sendPlayerSnapshot, sendServerEnemyHit, sendPlayerLaserEffect};
}
