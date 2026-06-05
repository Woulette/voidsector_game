const DEFAULT_SERVER_URL = "http://localhost:3001";
const SERVER_STORAGE_KEY = "voidsector-multiplayer-server";
const NAME_STORAGE_KEY = "voidsector-multiplayer-name";
const AUTH_TOKEN_STORAGE_KEY = "voidsector-auth-token";

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
  serverUrl:localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_SERVER_URL,
  clientMode:"launcher",
  name:localStorage.getItem(NAME_STORAGE_KEY) || "",
  players:[],
  remotePlayers:new Map(),
  remoteEffects:[],
  enemyAttackEvents:[],
  playerDamageEvents:[],
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

let pendingAuthAction = null;

function emitChange(reason = "state", payload = null){
  window.dispatchEvent(new CustomEvent("voidsector:multiplayer-change", {detail:{reason, payload}}));
}

function toast(message){
  if(typeof multiplayer.showToast === "function") multiplayer.showToast(message);
}

function setAuthSuccess(payload){
  const previousAccountId = multiplayer.auth.account?.id || null;
  multiplayer.auth.account = payload?.account || null;
  multiplayer.auth.token = payload?.token || multiplayer.auth.token || "";
  multiplayer.auth.expiresAt = payload?.expiresAt || null;
  multiplayer.auth.profileReady = false;
  multiplayer.auth.pending = false;
  multiplayer.auth.error = "";
  if(multiplayer.auth.token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, multiplayer.auth.token);
  if(multiplayer.auth.account?.username){
    multiplayer.name = multiplayer.auth.account.username;
    localStorage.setItem(NAME_STORAGE_KEY, multiplayer.name);
  }
  toast(multiplayer.auth.account ? `Compte connecte : ${multiplayer.auth.account.username}.` : "Compte connecte.");
  emitChange("auth:success", {account:multiplayer.auth.account, previousAccountId});
}

function setAuthError(message){
  multiplayer.auth.pending = false;
  multiplayer.auth.error = String(message || "Authentification impossible.");
  toast(multiplayer.auth.error);
  emitChange("auth:error");
}

function sendPendingAuthAction(){
  if(!pendingAuthAction || !multiplayer.connected || !multiplayer.socket) return;
  const action = pendingAuthAction;
  pendingAuthAction = null;
  multiplayer.auth.pending = true;
  multiplayer.auth.error = "";
  multiplayer.socket.emit(action.type, action.payload);
  emitChange("auth:pending");
}

function upsertRemotePlayer(player){
  if(!player?.id || player.id === multiplayer.playerId) return;
  const existing = multiplayer.remotePlayers.get(player.id) || {};
  const state = player.state || existing.state || null;
  const stateSamples = Array.isArray(existing.stateSamples) ? existing.stateSamples.slice(-7) : [];
  if(state){
    stateSamples.push({
      ...state,
      receivedAt:performance.now()
    });
  }
  multiplayer.remotePlayers.set(player.id, {
    ...existing,
    ...player,
    state,
    stateSamples
  });
}

function replaceServerEnemies(payload, scope){
  const next = new Map();
  const now = performance.now();
  for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
    if(!enemy?.id) continue;
    const existing = multiplayer.serverEnemies.get(enemy.id);
    const samples = Array.isArray(existing?.samples) ? existing.samples.slice(-7) : [];
    samples.push({
      x:Number(enemy.x || 0),
      y:Number(enemy.y || 0),
      angle:Number(enemy.angle || 0),
      vx:Number(enemy.vx || 0),
      vy:Number(enemy.vy || 0),
      moving:Boolean(enemy.moving),
      at:now
    });
    next.set(enemy.id, {
      ...existing,
      ...enemy,
      receivedAt:now,
      samples
    });
  }
  multiplayer.serverEnemyScope = scope;
  multiplayer.serverEnemies = next;
}

function addRemoteEffect(effect){
  if(!effect || effect.sourceId === multiplayer.playerId) return;
  multiplayer.remoteEffects.push({
    ...effect,
    createdAt:performance.now(),
    life:Number(effect.life || 0.18),
    maxLife:Number(effect.life || 0.18)
  });
  if(multiplayer.remoteEffects.length > 80) multiplayer.remoteEffects.splice(0, multiplayer.remoteEffects.length - 80);
}

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
      socket.emit("player:hello", {name:multiplayer.name, clientMode:multiplayer.clientMode});
      if(multiplayer.auth.token) socket.emit("auth:session", {token:multiplayer.auth.token});
      sendPendingAuthAction();
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
      setAuthSuccess(payload);
    });
    socket.on("auth:error", payload=>{
      if(multiplayer.auth.token && String(payload?.message || "").toLowerCase().includes("session")){
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        multiplayer.auth.token = "";
        multiplayer.auth.account = null;
      }
      setAuthError(payload?.message);
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
    socket.on("profile:sync", profile=>{
      multiplayer.auth.profileReady = true;
      window.dispatchEvent(new CustomEvent("voidsector:profile-sync", {detail:{profile}}));
    });
    socket.on("player:resume", session=>{
      multiplayer.resumeEvents.push({
        ...session,
        receivedAt:performance.now()
      });
      if(multiplayer.resumeEvents.length > 10) multiplayer.resumeEvents.splice(0, multiplayer.resumeEvents.length - 10);
      window.dispatchEvent(new CustomEvent("voidsector:player-resume", {detail:{session}}));
      emitChange("player:resume", session);
    });
    socket.on("players:list", players=>{
      multiplayer.players = Array.isArray(players) ? players : [];
      const liveIds = new Set(multiplayer.players.map(player=>player?.id).filter(Boolean));
      for(const id of multiplayer.remotePlayers.keys()){
        if(!liveIds.has(id)) multiplayer.remotePlayers.delete(id);
      }
      for(const player of multiplayer.players){
        if(player?.id && player.id !== multiplayer.playerId && player.state) upsertRemotePlayer(player);
      }
      emitChange();
    });
    socket.on("player:state", player=>{
      upsertRemotePlayer(player);
    });
    socket.on("player:laser", effect=>{
      addRemoteEffect(effect);
    });
    socket.on("enemy:attack", effect=>{
      multiplayer.enemyAttackEvents.push({
        ...effect,
        receivedAt:performance.now()
      });
      if(multiplayer.enemyAttackEvents.length > 80) multiplayer.enemyAttackEvents.splice(0, multiplayer.enemyAttackEvents.length - 80);
    });
    socket.on("player:damage", event=>{
      multiplayer.playerDamageEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.playerDamageEvents.length > 40) multiplayer.playerDamageEvents.splice(0, multiplayer.playerDamageEvents.length - 40);
    });
    socket.on("player:reward", event=>{
      multiplayer.playerRewardEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.playerRewardEvents.length > 40) multiplayer.playerRewardEvents.splice(0, multiplayer.playerRewardEvents.length - 40);
    });
    socket.on("loot:drop", event=>{
      multiplayer.lootDropEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.lootDropEvents.length > 40) multiplayer.lootDropEvents.splice(0, multiplayer.lootDropEvents.length - 40);
    });
    socket.on("loot:picked", event=>{
      multiplayer.lootPickupEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.lootPickupEvents.length > 40) multiplayer.lootPickupEvents.splice(0, multiplayer.lootPickupEvents.length - 40);
      emitChange("loot:picked", event);
    });
    socket.on("loot:error", payload=>{
      toast(payload?.message || "Ramassage impossible.");
      emitChange("loot:error", payload);
    });
    socket.on("shop:ammo-bought", event=>{
      multiplayer.shopAmmoEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shopAmmoEvents.length > 40) multiplayer.shopAmmoEvents.splice(0, multiplayer.shopAmmoEvents.length - 40);
      emitChange("shop:ammo-bought", event);
    });
    socket.on("shop:item-bought", event=>{
      multiplayer.shopItemEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shopItemEvents.length > 40) multiplayer.shopItemEvents.splice(0, multiplayer.shopItemEvents.length - 40);
      emitChange("shop:item-bought", event);
    });
    socket.on("shop:ship-bought", event=>{
      multiplayer.shopShipEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shopShipEvents.length > 40) multiplayer.shopShipEvents.splice(0, multiplayer.shopShipEvents.length - 40);
      emitChange("shop:ship-bought", event);
    });
    socket.on("shop:drone-bought", event=>{
      multiplayer.shopDroneEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shopDroneEvents.length > 40) multiplayer.shopDroneEvents.splice(0, multiplayer.shopDroneEvents.length - 40);
      emitChange("shop:drone-bought", event);
    });
    socket.on("shop:drone-formation-bought", event=>{
      multiplayer.shopDroneFormationEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shopDroneFormationEvents.length > 40) multiplayer.shopDroneFormationEvents.splice(0, multiplayer.shopDroneFormationEvents.length - 40);
      emitChange("shop:drone-formation-bought", event);
    });
    socket.on("shop:error", payload=>{
      toast(payload?.message || "Achat serveur impossible.");
      emitChange("shop:error", payload);
    });
    socket.on("ship:active-equipped", event=>{
      multiplayer.shipEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.shipEvents.length > 20) multiplayer.shipEvents.splice(0, multiplayer.shipEvents.length - 20);
      emitChange("ship:active-equipped", event);
    });
    socket.on("ship:equip-error", payload=>{
      toast(payload?.message || "Changement de vaisseau impossible.");
      emitChange("ship:equip-error", payload);
    });
    socket.on("equipment:updated", event=>{
      multiplayer.equipmentEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.equipmentEvents.length > 40) multiplayer.equipmentEvents.splice(0, multiplayer.equipmentEvents.length - 40);
      emitChange("equipment:updated", event);
    });
    socket.on("equipment:error", payload=>{
      toast(payload?.message || "Action equipement impossible.");
      emitChange("equipment:error", payload);
    });
    socket.on("combat:hit", event=>{
      multiplayer.combatEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.combatEvents.length > 80) multiplayer.combatEvents.splice(0, multiplayer.combatEvents.length - 80);
      emitChange("combat:hit", event);
    });
    socket.on("combat:error", payload=>{
      toast(payload?.message || "Tir serveur refuse.");
      emitChange("combat:error", payload);
    });
    socket.on("quest:progress", event=>{
      multiplayer.questProgressEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.questProgressEvents.length > 80) multiplayer.questProgressEvents.splice(0, multiplayer.questProgressEvents.length - 80);
      emitChange();
    });
    socket.on("quest:accepted", event=>{
      multiplayer.questEvents.push({...event, type:"accepted", receivedAt:performance.now()});
      if(multiplayer.questEvents.length > 40) multiplayer.questEvents.splice(0, multiplayer.questEvents.length - 40);
      toast(event?.title ? `Quete acceptee : ${event.title}` : "Quete acceptee.");
      emitChange("quest:accepted", event);
    });
    socket.on("quest:claimed", event=>{
      multiplayer.questEvents.push({...event, type:"claimed", receivedAt:performance.now()});
      if(multiplayer.questEvents.length > 40) multiplayer.questEvents.splice(0, multiplayer.questEvents.length - 40);
      toast(event?.title ? `Recompense recue : ${event.title}` : "Recompense recue.");
      emitChange("quest:claimed", event);
    });
    socket.on("quest:error", payload=>{
      toast(payload?.message || "Action quete impossible.");
      emitChange("quest:error", payload);
    });
    socket.on("refinery:updated", event=>{
      multiplayer.refineryEvents.push({...event, receivedAt:performance.now()});
      if(multiplayer.refineryEvents.length > 40) multiplayer.refineryEvents.splice(0, multiplayer.refineryEvents.length - 40);
      emitChange("refinery:updated", event);
    });
    socket.on("refinery:error", payload=>{
      toast(payload?.message || "Action raffinerie impossible.");
      emitChange("refinery:error", payload);
    });
    socket.on("space-caster:result", event=>{
      multiplayer.spaceCasterEvents.push({...event, receivedAt:performance.now()});
      if(multiplayer.spaceCasterEvents.length > 20) multiplayer.spaceCasterEvents.splice(0, multiplayer.spaceCasterEvents.length - 20);
      emitChange("space-caster:result", event);
    });
    socket.on("space-caster:error", payload=>{
      toast(payload?.message || "Space Caster impossible.");
      emitChange("space-caster:error", payload);
    });
    socket.on("group:update", group=>{
      multiplayer.group = group || null;
      emitChange();
    });
    socket.on("coop:enemies", payload=>{
      multiplayer.coopInstanceId = payload?.instanceId || null;
      multiplayer.coopSpawn = payload?.spawn || null;
      multiplayer.portalInstance = payload?.portal ? {
        instanceId:payload?.instanceId || null,
        portal:payload.portal,
        wave:Number(payload.wave || 0),
        completed:Boolean(payload.completed)
      } : null;
      replaceServerEnemies(payload, "coop");
      emitChange();
    });
    socket.on("portal:started", event=>{
      multiplayer.portalInstance = {
        instanceId:event?.instanceId || null,
        portal:event?.portal || null,
        wave:Number(event?.wave || 0),
        completed:false
      };
      multiplayer.portalStartEvents.push({...event, receivedAt:performance.now()});
      if(multiplayer.portalStartEvents.length > 10) multiplayer.portalStartEvents.splice(0, multiplayer.portalStartEvents.length - 10);
      emitChange();
    });
    socket.on("portal:complete", event=>{
      multiplayer.portalCompleteEvents.push({...event, receivedAt:performance.now()});
      if(multiplayer.portalCompleteEvents.length > 10) multiplayer.portalCompleteEvents.splice(0, multiplayer.portalCompleteEvents.length - 10);
      if(multiplayer.portalInstance) multiplayer.portalInstance.completed = true;
      emitChange();
    });
    socket.on("world:enemies", payload=>{
      if(multiplayer.coopInstanceId) return;
      multiplayer.coopSpawn = null;
      replaceServerEnemies(payload, "world");
      emitChange();
    });
    socket.on("group:invite", invite=>{
      if(invite?.groupId){
        multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
        multiplayer.invites.push(invite);
        toast(`${invite.fromName || "Un joueur"} t'invite en groupe.`);
        emitChange();
      }
    });
    socket.on("group:declined", payload=>{
      toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
    });
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

export function registerAccount({email, username, password, serverUrl} = {}){
  if(!multiplayer.connected || !multiplayer.socket){
    pendingAuthAction = {type:"auth:register", payload:{email, username, password}};
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    connectMultiplayer({serverUrl, name:username || multiplayer.name});
    return;
  }
  multiplayer.auth.pending = true;
  multiplayer.auth.error = "";
  emitChange("auth:pending");
  multiplayer.socket.emit("auth:register", {email, username, password});
}

export function loginAccount({login, password, serverUrl} = {}){
  if(!multiplayer.connected || !multiplayer.socket){
    pendingAuthAction = {type:"auth:login", payload:{login, password}};
    multiplayer.auth.pending = true;
    multiplayer.auth.error = "";
    emitChange("auth:pending");
    connectMultiplayer({serverUrl});
    return;
  }
  multiplayer.auth.pending = true;
  multiplayer.auth.error = "";
  emitChange("auth:pending");
  multiplayer.socket.emit("auth:login", {login, password});
}

export function logoutAccount(){
  if(!multiplayer.connected || !multiplayer.socket){
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    multiplayer.auth = {account:null, token:"", expiresAt:null, pending:false, error:"", profileReady:false};
    emitChange("auth:logout");
    return;
  }
  multiplayer.socket.emit("auth:logout", {token:multiplayer.auth.token});
}

export function requestServerLogout(){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("session:logout-request");
  return true;
}

export function sendPlayerSnapshot(payload){
  if(!multiplayer.connected || !multiplayer.socket) return;
  if(multiplayer.auth.token && !multiplayer.auth.account) return;
  const now = performance.now();
  if(now - multiplayer.lastSent < 50) return;
  multiplayer.lastSent = now;
  multiplayer.socket.emit("player:state", payload);
}

export function syncMultiplayerProfile(state){
  if(!multiplayer.connected || !multiplayer.socket || !state) return;
  if(multiplayer.auth.token && multiplayer.auth.account && !multiplayer.auth.profileReady) return;
  const profile = {
    updatedAt:Number(state.mmoProfileUpdatedAt || Date.now()),
    player:state.player,
    activeShip:state.activeShip,
    selectedShip:state.selectedShip,
    ownedShips:state.ownedShips,
    inventoryItems:state.inventoryItems,
    nextInventoryUid:state.nextInventoryUid,
    ammoInventory:state.ammoInventory,
    shipLoadouts:state.shipLoadouts,
    ownedDroneCount:state.ownedDroneCount,
    droneLoadout:state.droneLoadout,
    dronePermanentUpgrades:state.dronePermanentUpgrades,
    equipmentUpgrades:state.equipmentUpgrades,
    ownedDroneFormations:state.ownedDroneFormations,
    activeDroneFormation:state.activeDroneFormation,
    cargoHold:state.cargoHold,
    shipCargo:state.shipCargo,
    skillRanks:state.skillRanks,
    skillLevels:state.skillLevels,
    completedPortals:state.completedPortals,
    portalPieces:state.portalPieces,
    refineryLevels:state.refineryLevels,
    refineryModules:state.refineryModules,
    refineryUpgradeJobs:state.refineryUpgradeJobs,
    refineryShipmentJob:state.refineryShipmentJob || null,
    refineryJob:state.refineryJob || null,
    refineryProductionDisabled:state.refineryProductionDisabled,
    refineryLastTick:state.refineryLastTick,
    activeQuestIds:state.activeQuestIds,
    activeQuestId:state.activeQuestId,
    questProgress:state.questProgress,
    questFailProgress:state.questFailProgress,
    completedQuestClaims:state.completedQuestClaims
  };
  multiplayer.socket.emit("profile:save", {name:multiplayer.name, profile});
}

export function acceptServerQuest(id){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("quest:accept", {id});
  return true;
}

export function claimServerQuest(id){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("quest:claim", {id});
  return true;
}

export function progressServerQuest(payload = {}){
  if(!multiplayer.connected || !multiplayer.socket || !payload?.type) return false;
  multiplayer.socket.emit("quest:progress", payload);
  return true;
}

export function runServerSpaceCaster({portalId, count = 1} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !portalId) return false;
  multiplayer.socket.emit("space-caster:run", {portalId, count});
  return true;
}

export function startServerRefineryUpgrade({type = "material", id} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("refinery:upgrade-start", {type, id});
  return true;
}

export function rushServerRefineryUpgrade({type = "material", id} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("refinery:upgrade-rush", {type, id});
  return true;
}

export function toggleServerRefineryProduction(id){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("refinery:production-toggle", {id});
  return true;
}

export function startServerRefineryJob(recipeId){
  if(!multiplayer.connected || !multiplayer.socket || !recipeId) return false;
  multiplayer.socket.emit("refinery:job-start", {recipeId});
  return true;
}

export function claimServerRefineryJob(){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("refinery:job-claim");
  return true;
}

export function startServerRefineryShipment({materialId, amount, shipId} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !materialId) return false;
  multiplayer.socket.emit("refinery:shipment-start", {materialId, amount, shipId});
  return true;
}

export function rushServerRefineryShipment(){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("refinery:shipment-rush");
  return true;
}

export function refineServerShipCargo({recipeId, amount = 1, shipId} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !recipeId) return false;
  multiplayer.socket.emit("refinery:ship-cargo-refine", {recipeId, amount, shipId});
  return true;
}

export function buyServerAmmo(id, multiplier = 1){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("shop:buy-ammo", {id, multiplier});
  return true;
}

export function buyServerItem(id){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("shop:buy-item", {id});
  return true;
}

export function buyServerShip(id){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("shop:buy-ship", {id});
  return true;
}

export function equipServerActiveShip(shipId){
  if(!multiplayer.connected || !multiplayer.socket || !shipId) return false;
  multiplayer.socket.emit("ship:equip-active", {shipId});
  return true;
}

export function buyServerDrone({id = "combat_drone", ownedCount = 0} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("shop:buy-drone", {id, ownedCount});
  return true;
}

export function buyServerDroneFormation({id, owned = false} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("shop:buy-drone-formation", {id, owned});
  return true;
}

export function equipServerInventoryItem({type, index = 0, inventoryUid, shipId} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("equipment:equip", {type, index, inventoryUid, shipId});
  return true;
}

export function unequipServerSlot({type, index = 0, shipId} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("equipment:unequip-slot", {type, index, shipId});
  return true;
}

export function unequipServerInventoryItem(inventoryUid){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("equipment:unequip-inventory", {inventoryUid});
  return true;
}

export function applyServerDroneUpgrade({index = 0, inventoryUid} = {}){
  if(!multiplayer.connected || !multiplayer.socket) return false;
  multiplayer.socket.emit("equipment:drone-upgrade", {index, inventoryUid});
  return true;
}

export function upgradeServerEquipment({itemId, materialSource = "cargoHold", shipId} = {}){
  if(!multiplayer.connected || !multiplayer.socket || !itemId) return false;
  multiplayer.socket.emit("equipment:upgrade", {itemId, materialSource, shipId});
  return true;
}

export function createMultiplayerGroup(){
  if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
  multiplayer.socket.emit("group:create");
}

export function inviteMultiplayerPlayer(targetId){
  if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
  if(!targetId) return toast("Choisis un joueur a inviter.");
  multiplayer.socket.emit("group:invite", {targetId});
}

export function acceptMultiplayerInvite(groupId){
  if(!multiplayer.connected || !groupId) return;
  multiplayer.socket.emit("group:accept", {groupId});
  multiplayer.invites = multiplayer.invites.filter(invite=>invite.groupId !== groupId);
  emitChange();
}

export function declineMultiplayerInvite(groupId){
  if(!multiplayer.connected || !groupId) return;
  multiplayer.socket.emit("group:decline", {groupId});
  multiplayer.invites = multiplayer.invites.filter(invite=>invite.groupId !== groupId);
  emitChange();
}

export function leaveMultiplayerGroup(){
  if(!multiplayer.connected) return;
  multiplayer.socket.emit("group:leave");
  multiplayer.serverEnemies.clear();
  multiplayer.serverEnemyScope = null;
  multiplayer.coopInstanceId = null;
  multiplayer.coopSpawn = null;
  emitChange();
}

export function startCoopTestInstance(){
  if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
  if(!multiplayer.group) return toast("Cree ou rejoins un groupe d'abord.");
  multiplayer.socket.emit("coop:start-test");
}

export function startServerPortal(portalId){
  if(!multiplayer.connected) return toast("Connecte-toi au serveur multi d'abord.");
  if(!multiplayer.group) return toast("Cree ou rejoins un groupe d'abord.");
  multiplayer.socket.emit("portal:start", {portalId});
}

export function sendServerEnemyHit(enemyId, amount, context = {}){
  if(!multiplayer.connected || !multiplayer.socket || !enemyId) return;
  const payload = {
    enemyId,
    amount,
    weaponClass:context.weaponClass || "laser",
    ammoId:context.ammoId || "ammo_x1",
    count:context.count || 1,
    serverCalculated:Boolean(context.serverCalculated)
  };
  if(payload.serverCalculated) multiplayer.socket.emit("combat:fire", payload);
  else multiplayer.socket.emit("enemy:hit", payload);
}

export function sendPlayerLaserEffect(payload){
  if(!multiplayer.connected || !multiplayer.socket) return;
  multiplayer.socket.emit("player:laser", payload);
}

export function requestServerLootPickup(id){
  if(!multiplayer.connected || !multiplayer.socket || !id) return false;
  multiplayer.socket.emit("loot:pickup", {id});
  return true;
}

export function getGroupRemotePlayers(mapId = null){
  const memberIds = new Set((multiplayer.group?.members || []).map(member=>member?.id).filter(Boolean));
  const byId = new Map();
  for(const remote of multiplayer.remotePlayers.values()){
    if(!memberIds.has(remote.id)) continue;
    const state = remote.state;
    if(!state) continue;
    if(mapId !== null && String(state.mapId) !== String(mapId)) continue;
    byId.set(remote.id, remote);
  }
  for(const player of multiplayer.players || []){
    if(!player?.id || player.id === multiplayer.playerId || !memberIds.has(player.id) || byId.has(player.id)) continue;
    const state = player.state;
    if(!state) continue;
    if(mapId !== null && String(state.mapId) !== String(mapId)) continue;
    byId.set(player.id, player);
  }
  return [...byId.values()];
}

function installMultiplayerDomHandlers(){
  if(window.__voidsectorMultiplayerHandlersInstalled) return;
  window.__voidsectorMultiplayerHandlersInstalled = true;
  document.addEventListener("click", event=>{
    const action = event.target.closest("[data-mp-action]");
    if(action){
      event.preventDefault();
      event.stopPropagation();
      const type = action.dataset.mpAction;
      if(type === "connect"){
        const form = action.closest("[data-mp-form]") || document;
        connectMultiplayer({
          serverUrl:form.querySelector("[data-mp-server-url]")?.value || document.getElementById("mpServerUrl")?.value,
          name:form.querySelector("[data-mp-player-name]")?.value || document.getElementById("mpPlayerName")?.value
        });
      }else if(type === "disconnect"){
        disconnectMultiplayer();
      }else if(type === "create-group"){
        createMultiplayerGroup();
      }else if(type === "invite"){
        inviteMultiplayerPlayer(action.dataset.playerId);
      }else if(type === "accept"){
        acceptMultiplayerInvite(action.dataset.groupId);
      }else if(type === "decline"){
        declineMultiplayerInvite(action.dataset.groupId);
      }else if(type === "leave-group"){
        leaveMultiplayerGroup();
      }else if(type === "start-coop-test"){
        startCoopTestInstance();
      }
    }
    const authAction = event.target.closest("[data-auth-action]");
    if(!authAction) return;
    event.preventDefault();
    event.stopPropagation();
    const authType = authAction.dataset.authAction;
    const authRoot = authAction.closest(".mmo-account-card") || document;
    const serverUrl = authRoot.querySelector("[data-mp-server-url]")?.value || document.getElementById("mpServerUrl")?.value;
    if(authType === "register"){
      registerAccount({
        email:document.getElementById("authRegisterEmail")?.value,
        username:document.getElementById("authRegisterUsername")?.value,
        password:document.getElementById("authRegisterPassword")?.value,
        serverUrl
      });
    }else if(authType === "login"){
      loginAccount({
        login:document.getElementById("authLogin")?.value,
        password:document.getElementById("authPassword")?.value,
        serverUrl
      });
    }else if(authType === "logout"){
      logoutAccount();
    }
  }, true);
}
