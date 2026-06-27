import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

let lastProfileSaveSignature = "";

function profileSaveSignature(multiplayer, state){
  return JSON.stringify({
    name:multiplayer?.name || "",
    actionSlots:state?.actionSlots || [],
    actionSlotsByShip:state?.actionSlotsByShip || {},
    lastLaserAmmoId:state?.lastLaserAmmoId || null
  });
}

export function syncMultiplayerProfile(multiplayer, state){
  if(!isAuthenticatedGameplaySession(multiplayer) || !state) return;
  const signature = profileSaveSignature(multiplayer, state);
  if(signature === lastProfileSaveSignature) return;
  lastProfileSaveSignature = signature;
  const profile = {
    updatedAt:Date.now(),
    actionSlots:state.actionSlots,
    actionSlotsByShip:state.actionSlotsByShip,
    lastLaserAmmoId:state.lastLaserAmmoId
  };
  multiplayer.socket.emit("profile:save", {name:multiplayer.name, profile});
}
