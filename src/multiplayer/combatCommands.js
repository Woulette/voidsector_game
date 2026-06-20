import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

export function createCombatCommands({multiplayer}){
  function sendPlayerSnapshot(payload){
    if(!isAuthenticatedGameplaySession(multiplayer)) return;
    const now = performance.now();
    if(now - multiplayer.lastSent < 50) return;
    multiplayer.lastSent = now;
    multiplayer.socket.emit("player:state", payload);
  }

  function sendPlayerActivity(kind = "input"){
    if(!isAuthenticatedGameplaySession(multiplayer)) return false;
    const now = performance.now();
    const lastSent = Number(multiplayer.lastActivitySent || 0);
    if(lastSent > 0 && now - lastSent < 10000) return false;
    multiplayer.lastActivitySent = now;
    multiplayer.socket.emit("player:activity", {
      kind:String(kind || "input").slice(0, 40)
    });
    return true;
  }

  function sendServerEnemyHit(enemyId, context = {}){
    if(!isAuthenticatedGameplaySession(multiplayer) || !enemyId) return;
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
    if(!isAuthenticatedGameplaySession(multiplayer) || !targetPlayerId) return;
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
    if(!isAuthenticatedGameplaySession(multiplayer)) return;
    multiplayer.socket.emit("player:laser", payload);
  }

  return {sendPlayerSnapshot, sendPlayerActivity, sendServerEnemyHit, sendServerPlayerHit, sendPlayerLaserEffect};
}
