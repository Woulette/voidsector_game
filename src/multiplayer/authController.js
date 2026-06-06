export function createMultiplayerAuthController({
  multiplayer,
  authTokenStorageKey,
  nameStorageKey,
  connectMultiplayer,
  emitChange,
  toast
}){
  let pendingAction = null;

  function setSuccess(payload){
    const previousAccountId = multiplayer.auth.account?.id || null;
    multiplayer.auth.account = payload?.account || null;
    multiplayer.auth.token = payload?.token || multiplayer.auth.token || "";
    multiplayer.auth.expiresAt = payload?.expiresAt || null;
    multiplayer.auth.profileReady = false;
    multiplayer.auth.pending = false;
    multiplayer.auth.error = "";
    if(multiplayer.auth.token) localStorage.setItem(authTokenStorageKey, multiplayer.auth.token);
    if(multiplayer.auth.account?.username){
      multiplayer.name = multiplayer.auth.account.username;
      localStorage.setItem(nameStorageKey, multiplayer.name);
    }
    toast(multiplayer.auth.account ? `Compte connecte : ${multiplayer.auth.account.username}.` : "Compte connecte.");
    emitChange("auth:success", {account:multiplayer.auth.account, previousAccountId});
  }

  function setError(message){
    multiplayer.auth.pending = false;
    multiplayer.auth.error = String(message || "Authentification impossible.");
    toast(multiplayer.auth.error);
    emitChange("auth:error");
  }

  function sendPendingAction(){
    if(!pendingAction || !multiplayer.connected || !multiplayer.socket) return;
    const action = pendingAction;
    pendingAction = null;
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    multiplayer.socket.emit(action.type, action.payload);
    emitChange("auth:pending");
  }

  function beginPending(action, serverUrl, name){
    pendingAction = action;
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    connectMultiplayer({serverUrl, name});
  }

  function registerAccount({email, username, password, serverUrl} = {}){
    const action = {type:"auth:register", payload:{email, username, password}};
    if(!multiplayer.connected || !multiplayer.socket){
      beginPending(action, serverUrl, username || multiplayer.name);
      return;
    }
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    multiplayer.socket.emit(action.type, action.payload);
  }

  function loginAccount({login, password, serverUrl} = {}){
    const action = {type:"auth:login", payload:{login, password}};
    if(!multiplayer.connected || !multiplayer.socket){
      beginPending(action, serverUrl);
      return;
    }
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    multiplayer.socket.emit(action.type, action.payload);
  }

  function logoutAccount(){
    if(!multiplayer.connected || !multiplayer.socket){
      localStorage.removeItem(authTokenStorageKey);
      multiplayer.auth = {account:null, token:"", expiresAt:null, pending:false, error:"", profileReady:false};
      emitChange("auth:logout");
      return;
    }
    multiplayer.socket.emit("auth:logout", {token:multiplayer.auth.token});
  }

  return {setSuccess, setError, sendPendingAction, registerAccount, loginAccount, logoutAccount};
}
