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
