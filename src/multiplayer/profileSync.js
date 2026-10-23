import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

let lastProfileSaveSignature = "";
let pendingProfileSave = null;
let profileSaveRetryHandle = null;
let profileSaveRequestSequence = 0;

const PROFILE_SAVE_RETRY_DELAYS_MS = [900, 1800];
const PROFILE_SAVE_RETRY_JITTER_RATIO = 0.2;
const PROFILE_SAVE_FINAL_ACK_WAIT_MS = 3600;

function getActionSlotsUpdatedAt(state){
  const numeric = Number(state?.actionSlotsUpdatedAt || 0);
  if(!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric)));
}

function ensureActionSlotsUpdatedAt(state){
  const existing = getActionSlotsUpdatedAt(state);
  if(existing > 0) return existing;
  const updatedAt = Date.now();
  if(state && typeof state === "object") state.actionSlotsUpdatedAt = updatedAt;
  return updatedAt;
}

function profileSaveSignature(multiplayer, state, actionSlotsUpdatedAt = getActionSlotsUpdatedAt(state)){
  return JSON.stringify({
    accountId:String(multiplayer?.auth?.account?.id || ""),
    name:multiplayer?.name || "",
    actionSlots:state?.actionSlots || [],
    actionSlotsByShip:state?.actionSlotsByShip || {},
    actionSlotsUpdatedAt,
    lastLaserAmmoId:state?.lastLaserAmmoId || null
  });
}

function createProfileSaveRequestId(multiplayer){
  profileSaveRequestSequence += 1;
  const clientId = String(multiplayer?.clientId || "client").replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 48);
  return `${clientId}:${Date.now().toString(36)}:${profileSaveRequestSequence.toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function clearProfileSaveRetry(){
  if(profileSaveRetryHandle !== null) clearTimeout(profileSaveRetryHandle);
  profileSaveRetryHandle = null;
}

function clearPendingProfileSave({resetSignature = false} = {}){
  const signature = pendingProfileSave?.signature || "";
  pendingProfileSave = null;
  clearProfileSaveRetry();
  if(resetSignature && signature && lastProfileSaveSignature === signature){
    lastProfileSaveSignature = "";
  }
}

export function resetProfileSaveState(){
  clearPendingProfileSave({resetSignature:true});
  lastProfileSaveSignature = "";
}

function retryDelayMs(retryIndex){
  const base = PROFILE_SAVE_RETRY_DELAYS_MS[retryIndex];
  const jitter = base * PROFILE_SAVE_RETRY_JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(base + jitter));
}

function scheduleProfileSaveRetry(multiplayer, signature){
  clearProfileSaveRetry();
  const retryIndex = Math.max(0, Number(pendingProfileSave?.attempts || 1) - 1);
  if(retryIndex >= PROFILE_SAVE_RETRY_DELAYS_MS.length){
    profileSaveRetryHandle = setTimeout(()=>{
      profileSaveRetryHandle = null;
      if(pendingProfileSave?.signature === signature){
        clearPendingProfileSave({resetSignature:true});
      }
    }, PROFILE_SAVE_FINAL_ACK_WAIT_MS);
    profileSaveRetryHandle.unref?.();
    return;
  }
  profileSaveRetryHandle = setTimeout(()=>{
    profileSaveRetryHandle = null;
    if(!pendingProfileSave || pendingProfileSave.signature !== signature) return;
    const currentAccountId = String(multiplayer?.auth?.account?.id || "");
    const currentSocketId = String(multiplayer?.socket?.id || "");
    if(
      !isAuthenticatedGameplaySession(multiplayer)
      || currentAccountId !== pendingProfileSave.accountId
      || currentSocketId !== pendingProfileSave.socketId
    ){
      clearPendingProfileSave({resetSignature:true});
      return;
    }
    pendingProfileSave.attempts += 1;
    multiplayer.socket.emit("profile:save", pendingProfileSave.payload);
    scheduleProfileSaveRetry(multiplayer, signature);
  }, retryDelayMs(retryIndex));
  profileSaveRetryHandle.unref?.();
}

export function markProfileSaveAcknowledged(event = {}){
  if(!pendingProfileSave) return false;
  const requestId = String(event?.requestId || "");
  const pendingRequestId = String(pendingProfileSave.payload?.requestId || "");
  if(requestId && requestId !== pendingRequestId) return false;
  const acknowledgedAt = Math.max(0, Number(event?.updatedAt || 0));
  if(!requestId && acknowledgedAt && acknowledgedAt < Number(pendingProfileSave.payload?.profile?.updatedAt || 0)) return false;
  const status = String(event?.status || "saved");
  const retryableRejection = status === "rejected"
    && String(event?.reason || "") === "profile-persistence-failed";
  if(retryableRejection){
    const retryIndex = Math.max(0, Number(pendingProfileSave.attempts || 1) - 1);
    if(retryIndex >= PROFILE_SAVE_RETRY_DELAYS_MS.length){
      clearPendingProfileSave({resetSignature:true});
      return true;
    }
    scheduleProfileSaveRetry(pendingProfileSave.multiplayer, pendingProfileSave.signature);
    return true;
  }
  clearPendingProfileSave({resetSignature:status === "rejected"});
  return true;
}

export function syncMultiplayerProfile(multiplayer, state, options = {}){
  if(!isAuthenticatedGameplaySession(multiplayer) || !state) return false;
  const actionSlotsUpdatedAt = ensureActionSlotsUpdatedAt(state);
  const signature = profileSaveSignature(multiplayer, state, actionSlotsUpdatedAt);
  if(options.serverApplied){
    lastProfileSaveSignature = signature;
    if(pendingProfileSave?.signature === signature){
      pendingProfileSave = null;
      clearProfileSaveRetry();
    }
    return false;
  }
  if(signature === lastProfileSaveSignature) return false;
  lastProfileSaveSignature = signature;
  const profile = {
    updatedAt:Date.now(),
    actionSlots:state.actionSlots,
    actionSlotsByShip:state.actionSlotsByShip,
    actionSlotsUpdatedAt,
    lastLaserAmmoId:state.lastLaserAmmoId
  };
  const payload = {
    requestId:createProfileSaveRequestId(multiplayer),
    name:multiplayer.name,
    profile
  };
  pendingProfileSave = {
    signature,
    payload,
    attempts:1,
    accountId:String(multiplayer?.auth?.account?.id || ""),
    socketId:String(multiplayer?.socket?.id || ""),
    multiplayer
  };
  multiplayer.socket.emit("profile:save", payload);
  scheduleProfileSaveRetry(multiplayer, signature);
  return true;
}
