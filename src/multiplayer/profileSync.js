import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

export function syncMultiplayerProfile(multiplayer, state){
  if(!isAuthenticatedGameplaySession(multiplayer) || !state) return;
  const profile = {
    updatedAt:Date.now(),
    actionSlots:state.actionSlots,
    actionSlotsByShip:state.actionSlotsByShip,
    lastLaserAmmoId:state.lastLaserAmmoId
  };
  multiplayer.socket.emit("profile:save", {name:multiplayer.name, profile});
}
