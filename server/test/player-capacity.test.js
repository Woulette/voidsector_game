import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGameCapacity,
  checkGameCapacity,
  countLiveGameAccounts,
  hasLiveGameAccount,
  isLiveGamePlayer
} from "../src/players/playerCapacity.js";

test("player capacity counts live game accounts, not launcher sockets", ()=>{
  const players = new Map([
    ["game-a", {id:"game-a", accountId:"account-a", clientMode:"game", connected:true, state:{}}],
    ["launcher-a", {id:"launcher-a", accountId:"account-a", clientMode:"launcher", connected:true}],
    ["game-b", {id:"game-b", accountId:"account-b", clientMode:"game", connected:false, state:{}}],
    ["gone-c", {id:"gone-c", accountId:"account-c", clientMode:"game", connected:false, state:null}],
    ["guest", {id:"guest", accountId:null, clientMode:"game", connected:true, state:{}}]
  ]);

  assert.equal(isLiveGamePlayer(players.get("game-a")), true);
  assert.equal(isLiveGamePlayer(players.get("launcher-a")), false);
  assert.equal(isLiveGamePlayer(players.get("game-b")), true);
  assert.equal(isLiveGamePlayer(players.get("gone-c")), false);
  assert.equal(countLiveGameAccounts(players), 2);
  assert.equal(hasLiveGameAccount(players, "account-a"), true);
  assert.equal(hasLiveGameAccount(players, "account-c"), false);
});

test("player capacity allows same-account takeover but refuses a new account at the cap", ()=>{
  const players = new Map([
    ["game-a", {id:"game-a", accountId:"account-a", clientMode:"game", connected:true, state:{}}]
  ]);

  assert.equal(checkGameCapacity({
    players,
    accountId:"account-a",
    socketId:"new-game-a",
    maxConcurrentGamePlayers:1
  }).ok, true);

  const rejected = checkGameCapacity({
    players,
    accountId:"account-b",
    socketId:"new-game-b",
    maxConcurrentGamePlayers:1
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.current, 1);
  assert.equal(rejected.max, 1);
  assert.equal(rejected.code, "SERVER_FULL");

  assert.throws(
    ()=>assertGameCapacity({
      players,
      accountId:"account-b",
      socketId:"new-game-b",
      maxConcurrentGamePlayers:1
    }),
    error=>error?.code === "SERVER_FULL"
  );
});
