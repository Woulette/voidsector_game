import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGameCapacity,
  checkGameCapacity,
  countCapacityLimitedGameAccounts,
  countLiveGameAccounts,
  hasLiveGameAccount,
  isGameCapacityExemptAccount,
  isGameCapacityExemptPlayer,
  isGameCapacityExemptRole,
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

test("player capacity excludes only OWNER and ADMIN game accounts from the beta quota", ()=>{
  const players = new Map([
    ["player", {
      id:"player",
      accountId:"account-player",
      account:{id:"account-player", role:"player"},
      clientMode:"game",
      connected:true,
      state:{}
    }],
    ["moderator", {
      id:"moderator",
      accountId:"account-moderator",
      account:{id:"account-moderator", role:"moderator"},
      clientMode:"game",
      connected:true,
      state:{}
    }],
    ["admin", {
      id:"admin",
      accountId:"account-admin",
      account:{id:"account-admin", role:"ADMIN"},
      clientMode:"game",
      connected:true,
      state:{}
    }],
    ["owner", {
      id:"owner",
      accountId:"account-owner",
      account:{id:"account-owner", role:"OWNER"},
      clientMode:"game",
      connected:true,
      state:{}
    }],
    ["launcher", {
      id:"launcher",
      accountId:"account-launcher",
      account:{id:"account-launcher", role:"player"},
      clientMode:"launcher",
      connected:true,
      state:null
    }]
  ]);

  assert.equal(isGameCapacityExemptRole("OWNER"), true);
  assert.equal(isGameCapacityExemptAccount({role:"admin"}), true);
  assert.equal(isGameCapacityExemptPlayer(players.get("moderator")), false);
  assert.equal(isGameCapacityExemptPlayer({
    role:"owner",
    account:{role:"player"}
  }), false);
  assert.equal(countLiveGameAccounts(players), 4);
  assert.equal(countCapacityLimitedGameAccounts(players), 2);
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

test("player capacity lets OWNER and ADMIN enter after the normal-player quota is full", ()=>{
  const players = new Map([
    ["game-a", {
      id:"game-a",
      accountId:"account-a",
      account:{id:"account-a", role:"player"},
      clientMode:"game",
      connected:true,
      state:{}
    }]
  ]);

  for(const role of ["OWNER", "ADMIN"]){
    const capacity = checkGameCapacity({
      players,
      accountId:`account-${role.toLowerCase()}`,
      account:{id:`account-${role.toLowerCase()}`, role},
      socketId:`game-${role.toLowerCase()}`,
      maxConcurrentGamePlayers:1
    });
    assert.equal(capacity.ok, true);
    assert.equal(capacity.current, 1);
    assert.equal(capacity.capacityExempt, true);
  }

  const moderator = checkGameCapacity({
    players,
    accountId:"account-moderator",
    account:{id:"account-moderator", role:"moderator"},
    socketId:"game-moderator",
    maxConcurrentGamePlayers:1
  });
  assert.equal(moderator.ok, false);
  assert.equal(moderator.current, 1);
});
