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
