import { createCombatCommands } from "./combatCommands.js";
import { installChatSocketListeners } from "./chatSocketListeners.js";
import { createMultiplayerAuthController } from "./authController.js";
import { installMultiplayerDomHandlers as installDomHandlers } from "./domHandlers.js";
import { installEconomySocketListeners } from "./economySocketListeners.js?v=beta-store-1";
import { createFirmCommands } from "./firmCommands.js";
import { installFirmSocketListeners } from "./firmSocketListeners.js?v=firm-shop-sync-1";
import { createGroupCommands } from "./groupCommands.js?v=portal-prepare-1";
import { syncMultiplayerProfile as syncProfile } from "./profileSync.js?v=profile-sync-dedupe-1";
import { installPlayerSocketListeners } from "./playerSocketListeners.js";
import { installProgressionSocketListeners } from "./progressionSocketListeners.js";
import { createSocketCommands } from "./socketCommands.js?v=firm-setup-1";
import { createSocialCommands } from "./socialCommands.js";
import { installSocialSocketListeners } from "./socialSocketListeners.js";
import {
  addRemoteEffect as addRemoteEffectState,
  replaceServerEnemies as replaceServerEnemiesState,
  upsertRemotePlayer as upsertRemotePlayerState
} from "./socketState.js";
import { DEFAULT_MULTIPLAYER_SERVER_URL, isLocalServerUrl, normalizeServerUrl, resolveInitialServerUrl } from "./serverUrlConfig.js";
import { installWorldSocketListeners } from "./worldSocketListeners.js?v=portal-prepare-1";
import { setPersonalFirmBoosterReward, setPersonalPlayerBoosters } from "../core/firmBoosterStore.js";

const DEFAULT_SERVER_URL = DEFAULT_MULTIPLAYER_SERVER_URL;
const SERVER_STORAGE_KEY = "voidsector-multiplayer-server";
const NAME_STORAGE_KEY = "voidsector-multiplayer-name";
const AUTH_TOKEN_STORAGE_KEY = "voidsector-auth-token";
const ABSYRION_AUTH_TOKEN_COOKIE = "absyrion_auth_token";
const AUTH_REMEMBER_STORAGE_KEY = "avosoma-auth-remember";
const LEGACY_AUTH_REMEMBER_STORAGE_KEY = "avosomanox-auth-remember";
const AUTH_SYNC_CHANNEL_NAME = "avosoma-auth-sync";
const CLIENT_ID_STORAGE_KEY = "voidsector-client-id";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const LEADERBOARD_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const MULTIPLAYER_STATE_KEY = "__voidsectorMultiplayerState";

let authSyncChannel = null;
let authSyncInstalled = false;
let authStorageRevision = 0;

function readConfiguredServerUrl(){
  const values = [
    window.__VOIDSECTOR_CONFIG__?.serverUrl,
    typeof document !== "undefined" ? document.querySelector('meta[name="voidsector-server-url"]')?.getAttribute("content") : ""
  ];
  for(const value of values){
    const normalized = normalizeServerUrl(value);
    if(normalized) return normalized;
  }
  return "";
}

function readPublicOriginServerUrl(){
  const origin = normalizeServerUrl(window.location?.origin || "");
  if(!origin || isLocalServerUrl(origin)) return "";
  return origin;
}

function readDefaultServerUrl(){
  return readPublicOriginServerUrl() || DEFAULT_SERVER_URL;
}

function readStoredServerUrl(){
  const stored = normalizeServerUrl(localStorage.getItem(SERVER_STORAGE_KEY));
  if(!stored) return "";
  return readPublicOriginServerUrl() ? "" : stored;
}

function broadcastAuthChange(message){
  try{ authSyncChannel?.postMessage(message); }catch(error){}
}

function authCookieDomainAttribute(){
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "absyrion.com" || hostname.endsWith(".absyrion.com") ? "; Domain=.absyrion.com" : "";
}

function authCookieSecurityAttribute(){
  return window.location?.protocol === "https:" ? "; Secure" : "";
}

function getCookieValue(name){
  if(typeof document === "undefined") return "";
  const prefix = `${encodeURIComponent(name)}=`;
  const cookies = String(document.cookie || "").split(";").map(value=>value.trim());
  const match = cookies.find(value=>value.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function isAbsyrionHost(){
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "absyrion.com" || hostname.endsWith(".absyrion.com");
}

function storeAbsyrionAuthCookie(token, remember = shouldRememberAuth()){
  if(typeof document === "undefined") return;
  const clean = String(token || "");
  if(!clean) return clearAbsyrionAuthCookie();
  const maxAge = remember ? `; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}` : "";
  document.cookie = `${encodeURIComponent(ABSYRION_AUTH_TOKEN_COOKIE)}=${encodeURIComponent(clean)}; Path=/; SameSite=Lax${authCookieSecurityAttribute()}${authCookieDomainAttribute()}${maxAge}`;
}

function clearAbsyrionAuthCookie(){
  if(typeof document === "undefined") return;
  const base = `${encodeURIComponent(ABSYRION_AUTH_TOKEN_COOKIE)}=; Path=/; SameSite=Lax; Max-Age=0${authCookieSecurityAttribute()}`;
  document.cookie = base;
  const domain = authCookieDomainAttribute();
  if(domain) document.cookie = `${base}${domain}`;
}

function getStoredAuthToken(){
  const cookieToken = getCookieValue(ABSYRION_AUTH_TOKEN_COOKIE);
  if(cookieToken) return cookieToken;
  if(isAbsyrionHost()) return "";
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

function clearStoredAuthToken(){
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  clearAbsyrionAuthCookie();
  broadcastAuthChange({type:"logout"});
}

function migrateAuthRememberPreference(){
  const current = localStorage.getItem(AUTH_REMEMBER_STORAGE_KEY);
  if(current !== null){
    localStorage.removeItem(LEGACY_AUTH_REMEMBER_STORAGE_KEY);
    return current;
  }
  const legacy = localStorage.getItem(LEGACY_AUTH_REMEMBER_STORAGE_KEY);
  if(legacy !== null){
    localStorage.setItem(AUTH_REMEMBER_STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_AUTH_REMEMBER_STORAGE_KEY);
  }
  return legacy;
}

function removeStoredAuthTokenIfMatches(token){
  const clean = String(token || "");
  if(!clean) return;
  if(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === clean) localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === clean) sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if(getCookieValue(ABSYRION_AUTH_TOKEN_COOKIE) === clean) clearAbsyrionAuthCookie();
}

function shouldRememberAuth(){
  return migrateAuthRememberPreference() !== "0";
}

function storeAuthToken(token, remember = shouldRememberAuth()){
  if(!token) return clearStoredAuthToken();
  if(remember){
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }else{
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
  storeAbsyrionAuthCookie(token, remember);
  broadcastAuthChange({type:"token", token:String(token)});
}

function getClientId(){
  let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if(!id){
    id = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  }
  return id;
}

function createMultiplayerState(){
  return {
  socket:null,
  connected:false,
  connecting:false,
  authoritativeSession:false,
  playerId:null,
  auth:{
    account:null,
    token:getStoredAuthToken(),
    expiresAt:null,
    profileReady:false,
    pending:false,
    error:"",
    remember:shouldRememberAuth()
  },
  clientId:getClientId(),
  serverUrl:resolveInitialServerUrl({
    locationSearch:window.location?.search || "",
    configuredUrl:readConfiguredServerUrl(),
    storedUrl:readStoredServerUrl(),
    defaultUrl:readDefaultServerUrl()
  }),
  clientMode:"launcher",
  name:localStorage.getItem(NAME_STORAGE_KEY) || "",
  players:[],
  remotePlayers:new Map(),
  remoteEffects:[],
  enemyAttackEvents:[],
  playerDamageEvents:[],
  playerDeathEvents:[],
  playerRespawnEvents:[],
  playerRadiationEvents:[],
  playerStatusEffectEvents:[],
  playerRewardEvents:[],
  chatMessages:[],
  resumeEvents:[],
  lootDropEvents:[],
  shopAmmoEvents:[],
  shopItemEvents:[],
  shopBoosterEvents:[],
  shopPremiumPackEvents:[],
  shopBetaPackEvents:[],
  premiumRewardEvents:[],
  betaRewardEvents:[],
  inventorySaleEvents:[],
  commerceSaleEvents:[],
  shopShipEvents:[],
  shipEvents:[],
  shopDroneEvents:[],
  shopDroneFormationEvents:[],
  equipmentEvents:[],
  combatEvents:[],
  lootPickupEvents:[],
  questProgressEvents:[],
  questFailureEvents:[],
  questEvents:[],
  refineryEvents:[],
  spaceCasterEvents:[],
  portalStartEvents:[],
  portalCompleteEvents:[],
  portgunEvents:[],
  rickyHealEvents:[],
  rickyCinematicEvents:[],
  npcDamageEvents:[],
  playerHealEvents:[],
  shipAbilityEvents:[],
  shipAbilityEffectEvents:[],
  shipAbilityState:null,
  serverEnemies:new Map(),
  serverEnemyDefinitions:new Map(),
  serverEnemyScope:null,
  serverEnemyScopeKey:null,
  coopInstanceId:null,
  coopSpawn:null,
  portalInstance:null,
  preparedPortal:null,
  portalAlly:null,
  portalBeacons:[],
  portalObjective:null,
  group:null,
  invites:[],
  outgoingGroupInvites:[],
  groupPing:null,
  social:{friends:[], incoming:[], outgoing:[], enemies:[], ignored:[], firmMembers:[]},
  socialSync:{lastProfileSyncRequestedAt:0},
  leaderboardRanking:null,
  leaderboardSync:{lastRequestedAt:0, lastReceivedAt:0},
  admin:{
    snapshot:null,
    inspect:null,
    pending:false,
    error:"",
    lastSyncAt:0,
    lastAction:null
  },
  firmRanking:null,
  firmSnapshot:null,
  firmEvents:[],
  logout:{
    pending:false,
    completeAt:null,
    reason:""
  },
  disconnectIntent:"",
  lastActivitySent:0,
  lastSent:0,
  showToast:null
};
}

export const multiplayer = globalThis[MULTIPLAYER_STATE_KEY] || (globalThis[MULTIPLAYER_STATE_KEY] = createMultiplayerState());

function emitChange(reason = "state", payload = null){
  window.dispatchEvent(new CustomEvent("voidsector:multiplayer-change", {detail:{reason, payload}}));
}

function toast(message, options){
  if(typeof multiplayer.showToast === "function") multiplayer.showToast(message, options);
}

function applyExternalAuthToken(token){
  const clean = String(token || "");
  if(!clean) return;
  authStorageRevision += 1;
  multiplayer.auth.token = clean;
  multiplayer.auth.pending = false;
  multiplayer.auth.error = "";
  emitChange("auth:external-token");
}

function applyExternalAuthLogout(){
  authStorageRevision += 1;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  multiplayer.auth = {
    ...multiplayer.auth,
    account:null,
    token:"",
    expiresAt:null,
    pending:false,
    error:"",
    profileReady:false
  };
  emitChange("auth:external-logout");
  disconnectMultiplayer("external-auth-logout");
}

function installCrossTabAuthSync(){
  if(authSyncInstalled) return;
  authSyncInstalled = true;
  if(typeof BroadcastChannel === "function"){
    authSyncChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
    authSyncChannel.addEventListener("message", event=>{
      if(event.data?.type === "token") applyExternalAuthToken(event.data.token);
      else if(event.data?.type === "logout") applyExternalAuthLogout();
    });
  }
  window.addEventListener("storage", event=>{
    if(event.key !== AUTH_TOKEN_STORAGE_KEY) return;
    if(event.newValue){
      applyExternalAuthToken(event.newValue);
      return;
    }
    const revision = ++authStorageRevision;
    setTimeout(()=>{
      if(revision !== authStorageRevision || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return;
      applyExternalAuthLogout();
    }, 50);
  });
}

const {
  sendPlayerSnapshot,
  sendPlayerActivity,
  sendServerEnemyHit,
  sendServerPlayerHit,
  sendPlayerLaserEffect
} = createCombatCommands({multiplayer});

const {
  createMultiplayerGroup,
  inviteMultiplayerPlayer,
  inviteMultiplayerPlayerByName,
  acceptMultiplayerInvite,
  declineMultiplayerInvite,
  leaveMultiplayerGroup,
  kickMultiplayerGroupMember,
  promoteMultiplayerGroupMember,
  pingMultiplayerGroupMember,
  startCoopTestInstance,
  prepareServerPortal,
  startServerPortal,
  getGroupRemotePlayers
} = createGroupCommands({multiplayer, toast, emitChange});

const socketCommands = createSocketCommands({multiplayer});
const socialCommands = createSocialCommands({multiplayer, toast});
const firmCommands = createFirmCommands({multiplayer, toast});
const upsertRemotePlayer = player=>upsertRemotePlayerState(multiplayer, player);
const replaceServerEnemies = (payload, scope)=>replaceServerEnemiesState(multiplayer, payload, scope);
const addRemoteEffect = effect=>addRemoteEffectState(multiplayer, effect);
const auth = createMultiplayerAuthController({
  multiplayer,
  authTokenStorageKey:AUTH_TOKEN_STORAGE_KEY,
  storeAuthToken,
  clearStoredAuthToken,
  nameStorageKey:NAME_STORAGE_KEY,
  connectMultiplayer:options=>connectMultiplayer(options),
  emitChange,
  toast
});

export function setAuthRememberEnabled(remember = true){
  multiplayer.auth.remember = remember !== false;
  localStorage.setItem(AUTH_REMEMBER_STORAGE_KEY, multiplayer.auth.remember ? "1" : "0");
  localStorage.removeItem(LEGACY_AUTH_REMEMBER_STORAGE_KEY);
  if(multiplayer.auth.token) storeAuthToken(multiplayer.auth.token, multiplayer.auth.remember);
  else if(!multiplayer.auth.remember) localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  emitChange("auth:remember");
  return multiplayer.auth.remember;
}

export function requestLeaderboardSync({force = false} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  const now = Date.now();
  const lastRequestedAt = Number(multiplayer.leaderboardSync?.lastRequestedAt || 0);
  if(!force && lastRequestedAt && now - lastRequestedAt < LEADERBOARD_SYNC_INTERVAL_MS) return false;
  const sent = socketCommands.requestLeaderboardSync();
  if(sent){
    multiplayer.leaderboardSync = {
      ...(multiplayer.leaderboardSync || {}),
      lastRequestedAt:now
    };
  }
  return sent;
}

function loadSocketIo(serverUrl = multiplayer.serverUrl){
  const resolvedServerUrl = normalizeServerUrl(serverUrl) || readDefaultServerUrl();
  if(window.io) return Promise.resolve(window.io);
  return new Promise((resolve, reject)=>{
    const existing = document.querySelector("script[data-socket-io-client]");
    if(existing){
      if(existing.dataset.socketIoClientUrl !== resolvedServerUrl){
        existing.remove();
      }else{
        existing.addEventListener("load", ()=>resolve(window.io), {once:true});
        existing.addEventListener("error", reject, {once:true});
        return;
      }
    }
    const script = document.createElement("script");
    script.src = `${resolvedServerUrl}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketIoClient = "true";
    script.dataset.socketIoClientUrl = resolvedServerUrl;
    script.onload = ()=>resolve(window.io);
    script.onerror = ()=>{
      script.remove();
      reject(new Error("Impossible de charger Socket.IO client."));
    };
    document.head.appendChild(script);
  });
}

export function initMultiplayer({showToast = null, getDefaultName = null, autoConnectAuth = true, clientMode = "launcher"} = {}){
  multiplayer.showToast = showToast;
  multiplayer.clientMode = clientMode === "game" ? "game" : "launcher";
  installCrossTabAuthSync();
  if(!multiplayer.name && typeof getDefaultName === "function"){
    multiplayer.name = String(getDefaultName() || "").slice(0, 24);
  }
  installMultiplayerDomHandlers();
  emitChange("init");
  if(autoConnectAuth && multiplayer.auth.token){
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    setTimeout(()=>connectMultiplayer({name:multiplayer.name}), 0);
  }
}

export async function connectMultiplayer({serverUrl, name} = {}){
  if(multiplayer.connected || multiplayer.connecting) return;
  multiplayer.serverUrl = normalizeServerUrl(serverUrl) || normalizeServerUrl(multiplayer.serverUrl) || readDefaultServerUrl();
  multiplayer.name = String(name || multiplayer.name || "Pilote").trim().replace(/\s+/g, " ").slice(0, 24) || "Pilote";
  localStorage.setItem(SERVER_STORAGE_KEY, multiplayer.serverUrl);
  localStorage.setItem(NAME_STORAGE_KEY, multiplayer.name);
  multiplayer.connecting = true;
  emitChange("connection:pending");
  try{
    const io = await loadSocketIo(multiplayer.serverUrl);
    const socket = io(multiplayer.serverUrl, {
      transports:["websocket", "polling"],
      reconnection:true,
      reconnectionAttempts:Infinity,
      timeout:8000
    });
    multiplayer.socket = socket;
    socket.on("connect", ()=>{
      multiplayer.disconnectIntent = "";
      multiplayer.connected = true;
      multiplayer.connecting = false;
      multiplayer.authoritativeSession = true;
      multiplayer.playerId = socket.id;
      socket.emit("player:hello", {
        name:multiplayer.name,
        clientMode:multiplayer.clientMode,
        clientId:multiplayer.clientId,
        hasAuthToken:Boolean(multiplayer.auth.token)
      });
      if(multiplayer.auth.token) socket.emit("auth:session", {token:multiplayer.auth.token});
      auth.sendPendingAction();
      toast("Connecte au serveur multi.");
      emitChange("connection");
    });
    socket.on("connect_error", ()=>{
      multiplayer.connected = false;
      multiplayer.connecting = false;
      multiplayer.auth.pending = false;
      emitChange("connection:error");
    });
    socket.on("disconnect", socketReason=>{
      const disconnectIntent = multiplayer.disconnectIntent || "";
      multiplayer.connected = false;
      multiplayer.group = null;
      multiplayer.preparedPortal = null;
      multiplayer.logout = {pending:false, completeAt:null, reason:""};
      emitChange("connection:disconnect", {
        intent:disconnectIntent,
        socketReason:String(socketReason || "")
      });
      multiplayer.disconnectIntent = "";
    });
    socket.on("server:ready", payload=>{
      multiplayer.playerId = payload?.id || socket.id;
      emitChange("server:ready");
    });
    socket.on("rate:limited", payload=>{
      const eventName = String(payload?.eventName || "");
      const message = eventName === "profile:setup"
        ? "Choix de firme deja envoye, attends quelques secondes."
        : "Commande envoyee trop vite, attends quelques secondes.";
      toast(message);
      emitChange("rate:limited", payload);
    });
    socket.on("account:action-limited", payload=>{
      const eventName = String(payload?.eventName || "");
      const message = eventName === "profile:setup"
        ? "Choix de firme deja en cours, attends la reponse du serveur."
        : "Action envoyee trop vite, attends quelques secondes.";
      toast(message);
      emitChange("account:action-limited", payload);
    });
    socket.on("auth:success", payload=>{
      const previousAccountId = String(multiplayer.auth.account?.id || "");
      const nextAccountId = String(payload?.account?.id || "");
      if(previousAccountId !== nextAccountId){
        multiplayer.firmSnapshot = null;
        multiplayer.firmRanking = null;
        setPersonalFirmBoosterReward(null);
        setPersonalPlayerBoosters(null);
      }
      auth.setSuccess(payload);
    });
    socket.on("account:role", payload=>{
      const account = payload?.account || null;
      if(account?.id){
        multiplayer.auth.account = {
          ...(multiplayer.auth.account || {}),
          ...account
        };
        emitChange("auth:role", payload);
      }
    });
    socket.on("account:moderation", payload=>{
      if(multiplayer.auth.account){
        multiplayer.auth.account = {
          ...multiplayer.auth.account,
          bannedUntil:Math.max(0, Number(payload?.bannedUntil || 0)),
          banReason:String(payload?.banReason || ""),
          mutedUntil:Math.max(0, Number(payload?.mutedUntil || 0)),
          muteReason:String(payload?.muteReason || "")
        };
      }
      emitChange("auth:moderation", payload);
    });
    socket.on("auth:error", payload=>{
      if(multiplayer.auth.token && String(payload?.message || "").toLowerCase().includes("session")){
        clearStoredAuthToken();
        multiplayer.auth.token = "";
        multiplayer.auth.account = null;
      }
      auth.setError(payload?.message);
    });
    socket.on("server:full", payload=>{
      const message = String(payload?.message || "Serveur complet. Reviens dans quelques minutes.");
      auth.setError(message);
      toast(message);
      emitChange("server:full", payload);
    });
    socket.on("auth:logout", ()=>{
      clearStoredAuthToken();
      multiplayer.auth = {...multiplayer.auth, account:null, token:"", expiresAt:null, pending:false, error:"", profileReady:false};
      toast("Compte deconnecte.");
      emitChange("auth:logout");
      setTimeout(()=>disconnectMultiplayer("account-logout"), 0);
    });
    socket.on("auth:replaced", payload=>{
      multiplayer.auth = {...multiplayer.auth, account:null, expiresAt:null, pending:false, error:"", profileReady:false};
      multiplayer.disconnectIntent = "session-replaced";
      toast(String(payload?.message || "Ce compte a ete connecte depuis une autre session."));
      emitChange("auth:replaced", payload);
    });
    socket.on("admin:banned", payload=>{
      clearStoredAuthToken();
      multiplayer.auth = {...multiplayer.auth, account:null, token:"", expiresAt:null, pending:false, error:String(payload?.message || "Compte banni."), profileReady:false};
      multiplayer.disconnectIntent = "account-banned";
      toast(String(payload?.message || "Compte banni temporairement."));
      emitChange("auth:banned", payload);
      setTimeout(()=>disconnectMultiplayer("account-banned"), 0);
    });
    socket.on("session:logout-started", payload=>{
      multiplayer.logout = {
        pending:true,
        completeAt:Number(payload?.completeAt || 0),
        reason:""
      };
      emitChange("logout:started", payload);
    });
    socket.on("session:logout-rejected", payload=>{
      multiplayer.logout = {
        pending:false,
        completeAt:null,
        reason:String(payload?.reason || "refusee")
      };
      emitChange("logout:rejected", payload);
    });
    socket.on("session:logout-cancelled", payload=>{
      multiplayer.logout = {
        pending:false,
        completeAt:null,
        reason:String(payload?.reason || "annulee")
      };
      emitChange("logout:cancelled", payload);
    });
    socket.on("session:logout-complete", payload=>{
      multiplayer.logout = {pending:false, completeAt:null, reason:""};
      emitChange("logout:complete", payload);
    });
    socket.on("session:afk-status", payload=>{
      if(payload?.afk) toast("Tu es maintenant AFK. Déconnexion automatique après 10 minutes d'inactivité.");
      else toast("Statut AFK retiré.");
      emitChange("session:afk-status", payload);
    });
    socket.on("session:afk-disconnect", payload=>{
      emitChange("session:afk-disconnect", payload);
      disconnectMultiplayer("afk-timeout");
    });
    socket.on("admin:snapshot", payload=>{
      multiplayer.admin.snapshot = payload?.snapshot || null;
      multiplayer.admin.pending = false;
      multiplayer.admin.error = "";
      multiplayer.admin.lastSyncAt = Date.now();
      emitChange("admin:snapshot", payload);
    });
    socket.on("admin:player", payload=>{
      multiplayer.admin.inspect = payload || null;
      multiplayer.admin.pending = false;
      multiplayer.admin.error = "";
      emitChange("admin:player", payload);
    });
    socket.on("admin:kicked", payload=>{
      multiplayer.admin.lastAction = {type:"kick", payload, at:Date.now()};
      toast("Kick admin applique.");
      emitChange("admin:kicked", payload);
    });
    socket.on("admin:adjusted", payload=>{
      multiplayer.admin.lastAction = {type:"adjust", payload, at:Date.now()};
      toast("Correction admin appliquee.");
      emitChange("admin:adjusted", payload);
    });
    socket.on("admin:granted", payload=>{
      multiplayer.admin.lastAction = {type:"grant", payload, at:Date.now()};
      toast("Don admin applique.");
      emitChange("admin:granted", payload);
    });
    socket.on("admin:inventory-removed", payload=>{
      multiplayer.admin.lastAction = {type:"inventory-remove", payload, at:Date.now()};
      toast("Objet supprime du profil.");
      emitChange("admin:inventory-removed", payload);
    });
    socket.on("admin:moderated", payload=>{
      multiplayer.admin.lastAction = {type:"moderation", payload, at:Date.now()};
      toast("Moderation appliquee.");
      emitChange("admin:moderated", payload);
    });
    socket.on("admin:instance-reset", payload=>{
      multiplayer.admin.lastAction = {type:"reset-instance", payload, at:Date.now()};
      toast("Instance reinitialisee.");
      emitChange("admin:instance-reset", payload);
    });
    socket.on("admin:error", payload=>{
      multiplayer.admin.pending = false;
      multiplayer.admin.error = payload?.message || "Action admin refusee.";
      toast(multiplayer.admin.error);
      emitChange("admin:error", payload);
    });
    installPlayerSocketListeners({socket, multiplayer, requestLeaderboardSync, upsertRemotePlayer, addRemoteEffect, emitChange, toast});
    installChatSocketListeners({socket, multiplayer, emitChange, toast});
    installEconomySocketListeners({socket, multiplayer, emitChange, toast});
    installProgressionSocketListeners({socket, multiplayer, emitChange, toast});
    installWorldSocketListeners({socket, multiplayer, replaceServerEnemies, emitChange, toast});
    installSocialSocketListeners({socket, multiplayer, emitChange, toast});
    installFirmSocketListeners({socket, multiplayer, emitChange, toast});
  }catch(error){
    multiplayer.connected = false;
    multiplayer.connecting = false;
    multiplayer.auth.pending = false;
    toast(error?.message || "Connexion multi impossible.");
    emitChange("connection:error");
  }
}

export function disconnectMultiplayer(intent = "manual"){
  const disconnectIntent = String(intent || "manual");
  multiplayer.disconnectIntent = disconnectIntent;
  multiplayer.socket?.disconnect();
  multiplayer.socket = null;
  multiplayer.connected = false;
  multiplayer.connecting = false;
  multiplayer.authoritativeSession = false;
  multiplayer.group = null;
  multiplayer.invites = [];
  multiplayer.outgoingGroupInvites = [];
  multiplayer.groupPing = null;
  multiplayer.social = {friends:[], incoming:[], outgoing:[], enemies:[], ignored:[], firmMembers:[]};
  multiplayer.socialSync = {lastProfileSyncRequestedAt:0};
  multiplayer.leaderboardRanking = null;
  multiplayer.leaderboardSync = {lastRequestedAt:0, lastReceivedAt:0};
  multiplayer.admin = {snapshot:null, inspect:null, pending:false, error:"", lastSyncAt:0, lastAction:null};
  multiplayer.firmRanking = null;
  multiplayer.firmSnapshot = null;
  setPersonalFirmBoosterReward(null);
  setPersonalPlayerBoosters(null);
  multiplayer.firmEvents = [];
  multiplayer.remotePlayers.clear();
  multiplayer.remoteEffects = [];
  multiplayer.enemyAttackEvents = [];
  multiplayer.playerDamageEvents = [];
  multiplayer.playerDeathEvents = [];
  multiplayer.playerRespawnEvents = [];
  multiplayer.playerRadiationEvents = [];
  multiplayer.playerStatusEffectEvents = [];
  multiplayer.playerRewardEvents = [];
  multiplayer.chatMessages = [];
  multiplayer.resumeEvents = [];
  multiplayer.lootDropEvents = [];
  multiplayer.shopAmmoEvents = [];
  multiplayer.shopItemEvents = [];
  multiplayer.shopBoosterEvents = [];
  multiplayer.shopPremiumPackEvents = [];
  multiplayer.shopBetaPackEvents = [];
  multiplayer.premiumRewardEvents = [];
  multiplayer.betaRewardEvents = [];
  multiplayer.inventorySaleEvents = [];
  multiplayer.commerceSaleEvents = [];
  multiplayer.shopShipEvents = [];
  multiplayer.shopDroneEvents = [];
  multiplayer.shopDroneFormationEvents = [];
  multiplayer.equipmentEvents = [];
  multiplayer.combatEvents = [];
  multiplayer.lootPickupEvents = [];
  multiplayer.questProgressEvents = [];
  multiplayer.questFailureEvents = [];
  multiplayer.questEvents = [];
  multiplayer.refineryEvents = [];
  multiplayer.spaceCasterEvents = [];
  multiplayer.portalStartEvents = [];
  multiplayer.portalCompleteEvents = [];
  multiplayer.portgunEvents = [];
  multiplayer.rickyHealEvents = [];
  multiplayer.rickyCinematicEvents = [];
  multiplayer.npcDamageEvents = [];
  multiplayer.playerHealEvents = [];
  multiplayer.shipAbilityEvents = [];
  multiplayer.shipAbilityEffectEvents = [];
  multiplayer.shipAbilityState = null;
  multiplayer.serverEnemies.clear();
  multiplayer.serverEnemyDefinitions.clear();
  multiplayer.serverEnemyScope = null;
  multiplayer.serverEnemyScopeKey = null;
  multiplayer.coopInstanceId = null;
  multiplayer.coopSpawn = null;
  multiplayer.portalInstance = null;
  multiplayer.preparedPortal = null;
  multiplayer.portalAlly = null;
  multiplayer.portalBeacons = [];
  multiplayer.portalObjective = null;
  emitChange("connection:disconnect", {intent:disconnectIntent});
  multiplayer.disconnectIntent = "";
}

export function getLatestAuthToken(){
  return String(multiplayer.auth?.token || getStoredAuthToken() || "");
}

export function reconnectWithStoredAuthSession(){
  const token = getLatestAuthToken();
  if(!token) return false;
  multiplayer.auth = {
    ...multiplayer.auth,
    account:null,
    token,
    expiresAt:null,
    profileReady:false,
    pending:true,
    error:""
  };
  emitChange("auth:pending", {source:"stored-session"});
  if(multiplayer.socket?.connected){
    multiplayer.socket.emit("auth:session", {token});
  }else if(multiplayer.socket){
    multiplayer.connecting = true;
    emitChange("connection:pending", {reconnect:true});
    multiplayer.socket.connect();
  }else{
    connectMultiplayer({name:multiplayer.name});
  }
  return true;
}

export const {
  registerAccount,
  loginAccount,
  logoutAccount
} = auth;

export const requestServerLogout = socketCommands.requestServerLogout;
export const requestPlayerRespawn = socketCommands.requestPlayerRespawn;
export const startPortgunTeleport = socketCommands.startPortgunTeleport;
export const activateRickyPortalLever = socketCommands.activateRickyPortalLever;
export const activateRickyHealBeacon = socketCommands.activateRickyHealBeacon;
export const activateShipAbility = socketCommands.activateShipAbility;
export const setupServerProfile = socketCommands.setupServerProfile;
export const updateTutorial = socketCommands.updateTutorial;
export const setServerProfileTitle = socketCommands.setServerProfileTitle;
export const resetServerFirmDebug = socketCommands.resetServerFirmDebug;
export const sendChatMessage = socketCommands.sendChatMessage;
export const requestSocialSync = socialCommands.requestSocialSync;
export const requestFirmRankingSync = socialCommands.requestFirmRankingSync;
export const sendFriendRequest = socialCommands.sendFriendRequest;
export const respondFriendRequest = socialCommands.respondFriendRequest;
export const setSocialCategory = socialCommands.setSocialCategory;
export const removeSocialRelation = socialCommands.removeSocialRelation;
export const sendPrivateMessage = socialCommands.sendPrivateMessage;
export const requestFirmSync = firmCommands.requestFirmSync;
export const buyFirmShopItem = firmCommands.buyFirmShopItem;
export const openFirmBox = firmCommands.openFirmBox;
export const claimFirmRewards = firmCommands.claimFirmRewards;
export const claimFirmQuest = firmCommands.claimFirmQuest;
export const claimFirmSeasonObjective = firmCommands.claimFirmSeasonObjective;
export const acceptFirmQuest = firmCommands.acceptFirmQuest;
export {sendPlayerSnapshot, sendPlayerActivity, sendServerEnemyHit, sendServerPlayerHit, sendPlayerLaserEffect};

export const syncMultiplayerProfile = state=>syncProfile(multiplayer, state);

export const {
  acceptServerQuest,
  claimServerQuest,
  trackServerQuest,
  progressServerQuest,
  upgradeServerSkill,
  unlockServerPortal,
  performServerPrestige,
  runServerSpaceCaster,
  startServerRefineryUpgrade,
  rushServerRefineryUpgrade,
  toggleServerRefineryProduction,
  startServerRefineryJob,
  claimServerRefineryJob,
  startServerRefineryShipment,
  rushServerRefineryShipment,
  refineServerShipCargo,
  depositServerCombatBoostMaterial,
  buyServerAmmo,
  buyServerItem,
  buyServerBooster,
  buyServerPremiumPack,
  buyServerBetaPack,
  claimServerPremiumReward,
  claimServerBetaReward,
  sellServerInventoryItem,
  sellServerMaterial,
  buyServerShip,
  equipServerActiveShip,
  buyServerDrone,
  buyServerDroneFormation,
  equipServerInventoryItem,
  applyServerEquipmentBatch,
  unequipServerSlot,
  unequipServerShip,
  unequipServerInventoryItem,
  applyServerDroneUpgrade,
  upgradeServerEquipment,
  requestServerLootPickup
} = socketCommands;

export const {
  requestAdminSync,
  inspectAdminPlayer,
  kickAdminPlayer,
  adjustAdminPlayer,
  grantAdminPlayer,
  removeAdminInventoryItem,
  moderateAdminAccount,
  resetAdminInstance
} = socketCommands;

export {
  createMultiplayerGroup,
  inviteMultiplayerPlayer,
  inviteMultiplayerPlayerByName,
  acceptMultiplayerInvite,
  declineMultiplayerInvite,
  leaveMultiplayerGroup,
  kickMultiplayerGroupMember,
  promoteMultiplayerGroupMember,
  pingMultiplayerGroupMember,
  startCoopTestInstance,
  prepareServerPortal,
  startServerPortal,
  getGroupRemotePlayers
};

function installMultiplayerDomHandlers(){
  installDomHandlers({
    connectMultiplayer,
    disconnectMultiplayer,
    createMultiplayerGroup,
    inviteMultiplayerPlayer,
    acceptMultiplayerInvite,
    declineMultiplayerInvite,
    leaveMultiplayerGroup,
    startCoopTestInstance,
    registerAccount,
    loginAccount,
    logoutAccount
  });
}
