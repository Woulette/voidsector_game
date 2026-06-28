import assert from "node:assert/strict";
import test from "node:test";
import { registerAuthHandlers } from "../src/socket/authHandlers.js";

test("account logout disconnects the launcher gracefully and keeps the game ship in abrupt-disconnect mode", async ()=>{
  const handlers = new Map();
  const emitted = [];
  const disconnected = [];
  const launcherSocket = {
    id:"launcher-socket",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({socket:"launcher", event, payload}),
    disconnect:()=>disconnected.push("launcher")
  };
  const gameSocket = {
    id:"game-socket",
    emit:(event, payload)=>emitted.push({socket:"game", event, payload}),
    disconnect:()=>disconnected.push("game")
  };
  launcherSocket.nsp = {sockets:new Map([
    [launcherSocket.id, launcherSocket],
    [gameSocket.id, gameSocket]
  ])};
  const players = new Map([
    [launcherSocket.id, {id:launcherSocket.id, accountId:"account-1", clientMode:"launcher", state:null}],
    [gameSocket.id, {id:gameSocket.id, accountId:"account-1", clientMode:"game", state:{hp:5000}}]
  ]);
  let playerListsEmitted = 0;

  registerAuthHandlers(launcherSocket, {
    players,
    guard:()=>true,
    emitPlayers:()=>{ playerListsEmitted += 1; }
  });
  await handlers.get("auth:logout")({});

  assert.deepEqual(disconnected.sort(), ["game", "launcher"]);
  assert.equal(players.get(launcherSocket.id).gracefulLogout, true);
  assert.equal(players.get(gameSocket.id).gracefulLogout, false);
  assert.equal(emitted.filter(entry=>entry.event === "auth:logout").length, 2);
  assert.equal(playerListsEmitted, 1);
});

test("a new password login revokes old account sessions and disconnects the previous game", async ()=>{
  const handlers = new Map();
  const calls = [];
  const emitted = [];
  const newSocket = {
    id:"new-launcher",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({socket:"new", event, payload})
  };
  const oldGameSocket = {
    id:"old-game",
    emit:(event, payload)=>emitted.push({socket:"old-game", event, payload}),
    disconnect:()=>calls.push("disconnect-old-game")
  };
  newSocket.nsp = {sockets:new Map([[newSocket.id, newSocket], [oldGameSocket.id, oldGameSocket]])};
  const newPlayer = {id:newSocket.id, accountId:null, clientMode:"launcher", state:null};
  const oldGamePlayer = {
    id:oldGameSocket.id,
    accountId:"account-1",
    clientMode:"game",
    connected:true,
    state:{mapId:"31", hp:5000, shipId:"velox"}
  };
  const players = new Map([[newPlayer.id, newPlayer], [oldGamePlayer.id, oldGamePlayer]]);

  registerAuthHandlers(newSocket, {
    players,
    guard:()=>true,
    emitPlayers(){},
    loginAccount:async()=>({id:"account-1", username:"Pilot"}),
    revokeSessionsForAccount:async accountId=>calls.push(`revoke:${accountId}`),
    createSession:async accountId=>{
      calls.push(`create:${accountId}`);
      return {token:"new-token", expiresAt:123};
    },
    attachOrResumeAccountSocket:()=>calls.push("attach-new-socket"),
    publicAuthPayload:({account, session})=>({account, token:session.token}),
    syncProfileForPlayer:()=>calls.push("sync-profile")
  });

  await handlers.get("auth:login")({login:"Pilot", password:"secret"});

  assert.deepEqual(calls, [
    "revoke:account-1",
    "create:account-1",
    "disconnect-old-game",
    "attach-new-socket",
    "sync-profile"
  ]);
  assert.equal(oldGamePlayer.gracefulLogout, false);
  assert.equal(emitted.some(entry=>entry.socket === "old-game" && entry.event === "auth:replaced"), true);
  assert.equal(emitted.some(entry=>entry.socket === "new" && entry.event === "auth:success"), true);
});

test("auth handlers can use the Absyrion platform provider instead of local sessions", async ()=>{
  const handlers = new Map();
  const calls = [];
  const emitted = [];
  const socket = {
    id:"game-socket",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({event, payload})
  };
  const players = new Map([[socket.id, {id:socket.id, accountId:null, clientMode:"game"}]]);
  const authProvider = {
    async session(token){
      calls.push(`session:${token}`);
      return {
        account:{id:"abs-account-1", username:"AbsyrionPilot", email:"pilot@absyrion.com", role:"player"},
        token,
        expiresAt:123,
        session:{token, expiresAt:123}
      };
    }
  };

  registerAuthHandlers(socket, {
    players,
    guard:()=>true,
    emitPlayers(){},
    authProvider,
    ensureExternalAccountRecord:async account=>{
      calls.push(`mirror:${account.id}:${account.role}`);
      return {...account, role:"owner"};
    },
    attachOrResumeAccountSocket:(targetSocket, account, session)=>{
      calls.push(`attach:${targetSocket.id}:${account.id}:${account.role}:${session.expiresAt}`);
    },
    publicAuthPayload:({account, session})=>({account, token:session.token, expiresAt:session.expiresAt}),
    syncProfileForPlayer:()=>calls.push("sync-profile")
  });

  await handlers.get("auth:session")({token:"abs-token"});

  assert.deepEqual(calls, [
    "session:abs-token",
    "mirror:abs-account-1:player",
    "attach:game-socket:abs-account-1:owner:123",
    "sync-profile"
  ]);
  assert.deepEqual(emitted, [{
    event:"auth:success",
    payload:{
      account:{id:"abs-account-1", username:"AbsyrionPilot", email:"pilot@absyrion.com", role:"owner"},
      token:"abs-token",
      expiresAt:123
    }
  }]);
});

test("external auth mode refuses direct socket account creation", async ()=>{
  const handlers = new Map();
  const calls = [];
  const emitted = [];
  const socket = {
    id:"launcher-socket",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({event, payload})
  };
  const players = new Map([[socket.id, {id:socket.id, accountId:null, clientMode:"launcher"}]]);
  const authProvider = {
    async register(){
      calls.push("provider-register");
      return {account:{id:"bad"}, token:"bad", expiresAt:1};
    }
  };

  registerAuthHandlers(socket, {
    players,
    guard:()=>true,
    emitPlayers(){},
    authProvider,
    attachOrResumeAccountSocket:()=>calls.push("attach"),
    publicAuthPayload:({account, session})=>({account, token:session.token}),
    syncProfileForPlayer:()=>calls.push("sync-profile")
  });

  await handlers.get("auth:register")({
    email:"player@absyrion.com",
    username:"Pilot",
    password:"secret123"
  });

  assert.deepEqual(calls, []);
  assert.deepEqual(emitted, [{
    event:"auth:error",
    payload:{message:"La creation du compte se fait uniquement sur Absyrion."}
  }]);
});

test("auth handlers expose expected login errors without logging them as server failures", async ()=>{
  const handlers = new Map();
  const emitted = [];
  const runtimeErrors = [];
  const serverErrors = [];
  const socket = {
    id:"login-socket",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({event, payload})
  };
  const players = new Map([[socket.id, {id:socket.id, accountId:null, clientMode:"launcher"}]]);

  registerAuthHandlers(socket, {
    players,
    guard:()=>true,
    emitPlayers(){},
    logger:{error:(message, meta)=>serverErrors.push({message, meta})},
    onError:error=>runtimeErrors.push(error),
    loginAccount:async()=>{ throw new Error("Identifiants invalides."); }
  });

  await handlers.get("auth:login")({login:"Pilot", password:"bad"});

  assert.deepEqual(emitted, [{event:"auth:error", payload:{message:"Identifiants invalides."}}]);
  assert.deepEqual(serverErrors, []);
  assert.deepEqual(runtimeErrors, []);
});

test("auth handlers hide unexpected server errors from the client and record runtime details", async ()=>{
  const handlers = new Map();
  const emitted = [];
  const runtimeErrors = [];
  const serverErrors = [];
  const socket = {
    id:"login-socket",
    on:(event, callback)=>handlers.set(event, callback),
    emit:(event, payload)=>emitted.push({event, payload})
  };
  const players = new Map([[socket.id, {
    id:socket.id,
    accountId:"account-1",
    clientMode:"launcher",
    mapId:"0"
  }]]);

  registerAuthHandlers(socket, {
    players,
    guard:()=>true,
    emitPlayers(){},
    logger:{error:(message, meta)=>serverErrors.push({message, meta})},
    onError:error=>runtimeErrors.push(error),
    loginAccount:async()=>{ throw new Error("connect ECONNREFUSED postgres://secret"); }
  });

  await handlers.get("auth:login")({login:"Pilot", password:"secret"});

  assert.deepEqual(emitted, [{event:"auth:error", payload:{message:"Connexion impossible."}}]);
  assert.equal(JSON.stringify(emitted).includes("postgres://secret"), false);
  assert.equal(serverErrors.length, 1);
  assert.equal(serverErrors[0].message, "[auth] handler failed");
  assert.equal(serverErrors[0].meta.eventName, "auth:login");
  assert.equal(serverErrors[0].meta.socketId, "login-socket");
  assert.equal(serverErrors[0].meta.accountId, "account-1");
  assert.match(serverErrors[0].meta.error, /postgres:\/\/secret/);
  assert.equal(runtimeErrors.length, 1);
  assert.equal(runtimeErrors[0].source, "auth");
  assert.equal(runtimeErrors[0].eventName, "auth:login");
});
