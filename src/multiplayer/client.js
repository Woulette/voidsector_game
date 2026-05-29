const DEFAULT_SERVER_URL = "http://localhost:3001";
const SERVER_STORAGE_KEY = "voidsector-multiplayer-server";
const NAME_STORAGE_KEY = "voidsector-multiplayer-name";

export const multiplayer = {
  socket:null,
  connected:false,
  connecting:false,
  playerId:null,
  serverUrl:localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_SERVER_URL,
  name:localStorage.getItem(NAME_STORAGE_KEY) || "",
  players:[],
  remotePlayers:new Map(),
  remoteEffects:[],
  playerDamageEvents:[],
  playerRewardEvents:[],
  lootDropEvents:[],
  questProgressEvents:[],
  portalStartEvents:[],
  portalCompleteEvents:[],
  serverEnemies:new Map(),
  serverEnemyScope:null,
  coopInstanceId:null,
  coopSpawn:null,
  portalInstance:null,
  group:null,
  invites:[],
  lastSent:0,
  showToast:null
};

function emitChange(){
  window.dispatchEvent(new CustomEvent("voidsector:multiplayer-change"));
}

function toast(message){
  if(typeof multiplayer.showToast === "function") multiplayer.showToast(message);
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

export function initMultiplayer({showToast = null, getDefaultName = null} = {}){
  multiplayer.showToast = showToast;
  if(!multiplayer.name && typeof getDefaultName === "function"){
    multiplayer.name = String(getDefaultName() || "").slice(0, 24);
  }
  installMultiplayerDomHandlers();
  emitChange();
}

export async function connectMultiplayer({serverUrl, name} = {}){
  if(multiplayer.connected || multiplayer.connecting) return;
  multiplayer.serverUrl = String(serverUrl || multiplayer.serverUrl || DEFAULT_SERVER_URL).trim() || DEFAULT_SERVER_URL;
  multiplayer.name = String(name || multiplayer.name || "Pilote").trim().replace(/\s+/g, " ").slice(0, 24) || "Pilote";
  localStorage.setItem(SERVER_STORAGE_KEY, multiplayer.serverUrl);
  localStorage.setItem(NAME_STORAGE_KEY, multiplayer.name);
  multiplayer.connecting = true;
  emitChange();
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
      socket.emit("player:hello", {name:multiplayer.name});
      toast("Connecte au serveur multi.");
      emitChange();
    });
    socket.on("connect_error", ()=>{
      multiplayer.connected = false;
      multiplayer.connecting = false;
      emitChange();
    });
    socket.on("disconnect", ()=>{
      multiplayer.connected = false;
      multiplayer.group = null;
      emitChange();
    });
    socket.on("server:ready", payload=>{
      multiplayer.playerId = payload?.id || socket.id;
      emitChange();
    });
    socket.on("profile:sync", profile=>{
      window.dispatchEvent(new CustomEvent("voidsector:profile-sync", {detail:{profile}}));
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
      addRemoteEffect(effect);
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
    socket.on("quest:progress", event=>{
      multiplayer.questProgressEvents.push({
        ...event,
        receivedAt:performance.now()
      });
      if(multiplayer.questProgressEvents.length > 80) multiplayer.questProgressEvents.splice(0, multiplayer.questProgressEvents.length - 80);
      emitChange();
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
    toast(error?.message || "Connexion multi impossible.");
    emitChange();
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
  multiplayer.playerDamageEvents = [];
  multiplayer.playerRewardEvents = [];
  multiplayer.lootDropEvents = [];
  multiplayer.questProgressEvents = [];
  multiplayer.portalStartEvents = [];
  multiplayer.portalCompleteEvents = [];
  multiplayer.serverEnemies.clear();
  multiplayer.serverEnemyScope = null;
  multiplayer.coopInstanceId = null;
  multiplayer.coopSpawn = null;
  multiplayer.portalInstance = null;
  emitChange();
}

export function sendPlayerSnapshot(payload){
  if(!multiplayer.connected || !multiplayer.socket) return;
  const now = performance.now();
  if(now - multiplayer.lastSent < 50) return;
  multiplayer.lastSent = now;
  multiplayer.socket.emit("player:state", payload);
}

export function syncMultiplayerProfile(state){
  if(!multiplayer.connected || !multiplayer.socket || !state) return;
  const profile = {
    updatedAt:Number(state.mmoProfileUpdatedAt || Date.now()),
    player:state.player,
    cargoHold:state.cargoHold,
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
    refineryLastTick:state.refineryLastTick
  };
  multiplayer.socket.emit("profile:save", {name:multiplayer.name, profile});
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

export function sendServerEnemyHit(enemyId, amount){
  if(!multiplayer.connected || !multiplayer.socket || !enemyId) return;
  multiplayer.socket.emit("enemy:hit", {enemyId, amount});
}

export function sendPlayerLaserEffect(payload){
  if(!multiplayer.connected || !multiplayer.socket) return;
  multiplayer.socket.emit("player:laser", payload);
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
    if(!action) return;
    event.preventDefault();
    const type = action.dataset.mpAction;
    if(type === "connect"){
      connectMultiplayer({
        serverUrl:document.getElementById("mpServerUrl")?.value,
        name:document.getElementById("mpPlayerName")?.value
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
  });
}
