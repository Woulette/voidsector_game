export function syncMultiplayerProfile(multiplayer, state){
  if(!multiplayer.connected || !multiplayer.socket || !state) return;
  if(multiplayer.auth.token && multiplayer.auth.account && !multiplayer.auth.profileReady) return;
  const profile = {
    updatedAt:Date.now(),
    actionSlots:state.actionSlots,
    actionSlotsByShip:state.actionSlotsByShip,
    lastLaserAmmoId:state.lastLaserAmmoId
  };
  multiplayer.socket.emit("profile:save", {name:multiplayer.name, profile});
}
