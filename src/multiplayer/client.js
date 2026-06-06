import { createCombatCommands } from "./combatCommands.js";
import { createMultiplayerAuthController } from "./authController.js";
import { installMultiplayerDomHandlers as installDomHandlers } from "./domHandlers.js";
import { installEconomySocketListeners } from "./economySocketListeners.js";
import { createGroupCommands } from "./groupCommands.js";
import { syncMultiplayerProfile as syncProfile } from "./profileSync.js";
import { installPlayerSocketListeners } from "./playerSocketListeners.js";
import { installProgressionSocketListeners } from "./progressionSocketListeners.js";
import { createSocketCommands } from "./socketCommands.js";
import {
  addRemoteEffect as addRemoteEffectState,
  replaceServerEnemies as replaceServerEnemiesState,
  upsertRemotePlayer as upsertRemotePlayerState
} from "./socketState.js";
import { installWorldSocketListeners } from "./worldSocketListeners.js";

const DEFAULT_SERVER_URL = "http://localhost:3001";
const SERVER_STORAGE_KEY = "voidsector-multiplayer-server";
const NAME_STORAGE_KEY = "voidsector-multiplayer-name";
const AUTH_TOKEN_STORAGE_KEY = "voidsector-auth-token";
const CLIENT_ID_STORAGE_KEY = "voidsector-client-id";

function getClientId(){
  let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if(!id){
    id = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  }
  return id;
}

export const multiplayer = {
  socket:null,
  connected:false,
  connecting:false,
  playerId:null,
  auth:{
    account:null,
    token:localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "",
    expiresAt:null,
    profileReady:false,
    pending:false,
    error:""
  },
  clientId:getClientId(),
  serverUrl:localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_SERVER_URL,
  clientMode:"launcher",
  name:localStorage.getItem(NAME_STORAGE_KEY) || "",
  players:[],
  remotePlayers:new Map(),
  remoteEffects:[],
  enemyAttackEvents:[],
  playerDamageEvents:[],
  playerStatusEffectEvents:[],
  playerRewardEvents:[],
  resumeEvents:[],
  lootDropEvents:[],
  shopAmmoEvents:[],
  shopItemEvents:[],
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
  serverEnemies:new Map(),
  serverEnemyScope:null,
  coopInstanceId:null,
  coopSpawn:null,
  portalInstance:null,
  group:null,
  invites:[],
  logout:{
    pending:false,
    completeAt:null,
    reason:""
  },
  lastSent:0,
  showToast:null
};

function emitChange(reason = "state", payload = null){
  window.dispatchEvent(new CustomEvent("voidsector:multiplayer-change", {detail:{reason, payload}}));
}

function toast(message){
  if(typeof multiplayer.showToast === "function") multiplayer.showToast(message);
}

const {
  sendPlayerSnapshot,
  sendServerEnemyHit,
  sendPlayerLaserEffect
} = createCombatCommands({multiplayer});

const {
  createMultiplayerGroup,
  inviteMultiplayerPlayer,
  acceptMultiplayerInvite,
  declineMultiplayerInvite,
  leaveMultiplayerGroup,
  startCoopTestInstance,
  startServerPortal,
  getGroupRemotePlayers
} = createGroupCommands({multiplayer, toast, emitChange});

const socketCommands = createSocketCommands({multiplayer});
const upsertRemotePlayer = player=>upsertRemotePlayerState(multiplayer, player);
const replaceServerEnemies = (payload, scope)=>replaceServerEnemiesState(multiplayer, payload, scope);
const addRemoteEffect = effect=>addRemoteEffectState(multiplayer, effect);
const auth = createMultiplayerAuthController({
  multiplayer,
  authTokenStorageKey:AUTH_TOKEN_STORAGE_KEY,
  nameStorageKey:NAME_STORAGE_KEY,
  connectMultiplayer:options=>connectMultiplayer(options),
  emitChange,
  toast
});

function loadSocketIo(serverUrl = multiplayer.serverUrl){
  if(window.io) return Promise.resolve(window.io);
  return new Promise((resolve, reject)=>{
    const existing = document.querySelector("script[data-socket-io-client]");
    if(existing){
      existing.addEventListener("load", ()=>resolve(window.io), {once:true});
      existing.addEventListener("error", reject, {once:true});
      return;
    }
    const script = document.createElement("script");
    script.src = `${String(serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, "")}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketIoClient = "true";
    script.onload = ()=>resolve(window.io);
    script.onerror = ()=>reject(new Error("Impossible de charger Socket.IO client."));
    document.head.appendChild(script);
  });
}

export function initMultiplayer({showToast = null, getDefaultName = null, autoConnectAuth = true, clientMode = "launcher"} = {}){
  multiplayer.showToast = showToast;
  multiplayer.clientMode = clientMode === "game" ? "game" : "launcher";
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
  multiplayer.serverUrl = String(serverUrl || multiplayer.serverUrl || DEFAULT_SERVER_URL).trim() || DEFAULT_SERVER_URL;
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
      multiplayer.connected = true;
      multiplayer.connecting = false;
      multiplayer.playerId = socket.id;
      socket.emit("player:hello", {name:multiplayer.name, clientMode:multiplayer.clientMode, clientId:multiplayer.clientId});
      if(multiplayer.auth.token) socket.emit("auth:session", {token:multiplayer.auth.token});
      auth.sendPendingAction();
      toast("Connecte au serveur multi.");
      emitChange("connection");
    });
    socket.on("connect_error", ()=>{
      multiplayer.connected = false;
      multiplayer.connecting = false;
      emitChange("connection:error");
    });
    socket.on("disconnect", ()=>{
      multiplayer.connected = false;
      multiplayer.group = null;
      multiplayer.logout = {pending:false, completeAt:null, reason:""};
      emitChange("connection:disconnect");
    });
    socket.on("server:ready", payload=>{
      multiplayer.playerId = payload?.id || socket.id;
      emitChange("server:ready");
    });
    socket.on("auth:success", payload=>{
      auth.setSuccess(payload);
    });
    socket.on("auth:error", payload=>{
      if(multiplayer.auth.token && String(payload?.message || "").toLowerCase().includes("session")){
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        multiplayer.auth.token = "";
        multiplayer.auth.account = null;
      }
      auth.setError(payload?.message);
    });
    socket.on("auth:logout", ()=>{
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      multiplayer.auth = {account:null, token:"", expiresAt:null, pending:false, error:"", profileReady:false};
      toast("Compte deconnecte.");
      emitChange("auth:logout");
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
    installPlayerSocketListeners({socket, multiplayer, upsertRemotePlayer, addRemoteEffect, emitChange, toast});
    installEconomySocketListeners({socket, multiplayer, emitChange, toast});
    installProgressionSocketListeners({socket, multiplayer, emitChange, toast});
    installWorldSocketListeners({socket, multiplayer, replaceServerEnemies, emitChange, toast});
  }catch(error){
    multiplayer.connected = false;
    multiplayer.connecting = false;
    multiplayer.auth.pending = false;
    toast(error?.message || "Connexion multi impossible.");
    emitChange("connection:error");
  }
}

export function disconnectMultiplayer(){
  multiplayer.socket?.disconnect();
  multiplayer.socket = null;
  multiplayer.connected = false;
  multiplayer.connecting = false;
  multiplayer.group = null;
  multiplayer.invites = [];
  multiplayer.remotePlayers.clear();
  multiplayer.remoteEffects = [];
  multiplayer.enemyAttackEvents = [];
  multiplayer.playerDamageEvents = [];
  multiplayer.playerStatusEffectEvents = [];
  multiplayer.playerRewardEvents = [];
  multiplayer.resumeEvents = [];
  multiplayer.lootDropEvents = [];
  multiplayer.shopAmmoEvents = [];
  multiplayer.shopItemEvents = [];
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
  multiplayer.serverEnemies.clear();
  multiplayer.serverEnemyScope = null;
  multiplayer.coopInstanceId = null;
  multiplayer.coopSpawn = null;
  multiplayer.portalInstance = null;
  emitChange("connection:disconnect");
}

export const {
  registerAccount,
  loginAccount,
  logoutAccount
} = auth;

export const requestServerLogout = socketCommands.requestServerLogout;
export {sendPlayerSnapshot, sendServerEnemyHit, sendPlayerLaserEffect};

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
  buyServerAmmo,
  buyServerItem,
  buyServerShip,
  equipServerActiveShip,
  buyServerDrone,
  buyServerDroneFormation,
  equipServerInventoryItem,
  unequipServerSlot,
  unequipServerInventoryItem,
  applyServerDroneUpgrade,
  upgradeServerEquipment,
  requestServerLootPickup
} = socketCommands;

export {
  createMultiplayerGroup,
  inviteMultiplayerPlayer,
  acceptMultiplayerInvite,
  declineMultiplayerInvite,
  leaveMultiplayerGroup,
  startCoopTestInstance,
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
