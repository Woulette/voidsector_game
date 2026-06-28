import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

let lastProfileSaveSignature = "";
let pendingProfileSave = null;
let profileSaveRetryHandle = null;

const PROFILE_SAVE_RETRY_MS = 2500;

function getActionSlotsUpdatedAt(state){
  return Math.max(0, Math.floor(Number(state?.actionSlotsUpdatedAt || state?.mmoProfileUpdatedAt || 0)));
}

function profileSaveSignature(multiplayer, state){
  return JSON.stringify({
    name:multiplayer?.name || "",
    actionSlots:state?.actionSlots || [],
    actionSlotsByShip:state?.actionSlotsByShip || {},
    actionSlotsUpdatedAt:getActionSlotsUpdatedAt(state),
    lastLaserAmmoId:state?.lastLaserAmmoId || null
  });
}

function getProfileSaveUpdatedAt(state){
  const localUpdatedAt = Math.max(0, Math.floor(Number(state?.mmoProfileUpdatedAt || 0)));
  if(localUpdatedAt > 0) return localUpdatedAt;
  const updatedAt = Date.now();
  if(state && typeof state === "object") state.mmoProfileUpdatedAt = updatedAt;
  return updatedAt;
}

function clearProfileSaveRetry(){
  if(profileSaveRetryHandle) clearTimeout(profileSaveRetryHandle);
  profileSaveRetryHandle = null;
}

function scheduleProfileSaveRetry(multiplayer, signature){
  clearProfileSaveRetry();
  profileSaveRetryHandle = setTimeout(()=>{
    profileSaveRetryHandle = null;
    if(!pendingProfileSave || pendingProfileSave.signature !== signature) return;
    if(!isAuthenticatedGameplaySession(multiplayer)) return;
    multiplayer.socket.emit("profile:save", pendingProfileSave.payload);
    scheduleProfileSaveRetry(multiplayer, signature);
  }, PROFILE_SAVE_RETRY_MS);
  profileSaveRetryHandle.unref?.();
}

export function markProfileSaveAcknowledged(event = {}){
  const acknowledgedAt = Math.max(0, Number(event?.updatedAt || 0));
  if(pendingProfileSave && (!acknowledgedAt || acknowledgedAt >= Number(pendingProfileSave.payload?.profile?.updatedAt || 0))){
    pendingProfileSave = null;
    clearProfileSaveRetry();
  }
}

export function syncMultiplayerProfile(multiplayer, state){
  if(!isAuthenticatedGameplaySession(multiplayer) || !state) return;
  const signature = profileSaveSignature(multiplayer, state);
  if(signature === lastProfileSaveSignature) return;
  lastProfileSaveSignature = signature;
  const profile = {
    updatedAt:getProfileSaveUpdatedAt(state),
    actionSlots:state.actionSlots,
    actionSlotsByShip:state.actionSlotsByShip,
    actionSlotsUpdatedAt:getActionSlotsUpdatedAt(state),
    lastLaserAmmoId:state.lastLaserAmmoId
  };
  const payload = {name:multiplayer.name, profile};
  pendingProfileSave = {signature, payload};
  multiplayer.socket.emit("profile:save", payload);
  scheduleProfileSaveRetry(multiplayer, signature);
}
