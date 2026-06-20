import assert from "node:assert/strict";
import test from "node:test";
import { createPresenceManager } from "../src/players/presence.js";

function createHarness(){
  const players = new Map();
  const removed = [];
  const emitted = [];
  const io = {
    sockets:{sockets:new Map()},
    to:id=>({emit(event, payload){ emitted.push({id, event, payload}); }})
  };
  const presence = createPresenceManager({
    io,
    players,
    emitPlayers(){},
    config:{
      disconnectCombatGraceMs:30000,
      combatRecentMs:15000,
      afkAfterMs:5 * 60 * 1000,
      afkDisconnectMs:10 * 60 * 1000
    },
    onPlayerRemove:player=>removed.push(player.id)
  });
  return {players, presence, removed, emitted, io};
}

test("refresh keeps an active game ship for the disconnect grace period", ()=>{
  const {players, presence, removed} = createHarness();
  const player = presence.createPlayer("old-socket");
  player.clientMode = "game";
  player.groupId = "G-1";
  player.state = {hp:5000};
  players.set(player.id, player);

  presence.handleDisconnect({id:player.id, leave(){}});

  assert.equal(players.has(player.id), true);
  assert.equal(player.connected, false);
  assert.equal(player.groupId, "G-1");
  assert.equal(player.removeAt, player.disconnectedAt + 30000);
  presence.tick(player.removeAt - 1);
  assert.equal(players.has(player.id), true);
  presence.tick(player.removeAt);
  assert.equal(players.has(player.id), false);
  assert.deepEqual(removed, ["old-socket"]);
});

test("a disconnected ship stays targetable until its grace deadline", ()=>{
  const {players, presence} = createHarness();
  const player = presence.createPlayer("target-socket");
  player.clientMode = "game";
  player.state = {hp:5000};
  players.set(player.id, player);

  presence.handleDisconnect({id:player.id, leave(){}});

  assert.equal(presence.isActiveForWorld(player, player.removeAt - 1), true);
  assert.equal(presence.isActiveForWorld(player, player.removeAt), false);
});

test("every received damage resets the disconnected ship grace to thirty seconds", ()=>{
  const {players, presence, removed} = createHarness();
  const player = presence.createPlayer("damaged-socket");
  player.clientMode = "game";
  player.state = {hp:5000, maxHp:5000, shield:0, maxShield:0};
  players.set(player.id, player);

  presence.handleDisconnect({id:player.id, leave(){}});
  const originalDeadline = player.removeAt;
  const damageAt = originalDeadline - 5000;
  presence.applyDamageToPlayerState(player, 100, damageAt);

  assert.equal(player.state.hp, 4900);
  assert.equal(player.removeAt, damageAt + 30000);
  presence.tick(originalDeadline);
  assert.equal(players.has(player.id), true);
  presence.tick(player.removeAt - 1);
  assert.equal(players.has(player.id), true);
  presence.tick(player.removeAt);
  assert.equal(players.has(player.id), false);
  assert.deepEqual(removed, ["damaged-socket"]);
});

test("a killing blow is preserved and the dead ship is removed at the reset deadline", ()=>{
  const {players, presence} = createHarness();
  const player = presence.createPlayer("dead-socket");
  player.clientMode = "game";
  player.state = {hp:50, maxHp:5000, shield:0, maxShield:0};
  players.set(player.id, player);

  presence.handleDisconnect({id:player.id, leave(){}});
  const damageAt = player.removeAt - 10000;
  presence.applyDamageToPlayerState(player, 100, damageAt);

  assert.equal(player.state.hp, 0);
  assert.equal(player.removeAt, damageAt + 30000);
  presence.tick(player.removeAt - 1);
  assert.equal(players.has(player.id), true);
  presence.tick(player.removeAt);
  assert.equal(players.has(player.id), false);
});

test("an inactive game player becomes AFK after five minutes and activity clears it", ()=>{
  const {players, presence, emitted} = createHarness();
  const player = presence.createPlayer("afk-socket");
  player.clientMode = "game";
  player.state = {hp:5000};
  player.lastActivityAt = 1000;
  players.set(player.id, player);

  presence.tick(1000 + 5 * 60 * 1000 - 1);
  assert.equal(player.afk, false);
  presence.tick(1000 + 5 * 60 * 1000);
  assert.equal(player.afk, true);
  assert.equal(emitted.some(entry=>entry.event === "session:afk-status" && entry.payload.afk === true), true);

  presence.markActivity(player, "clic", 1000 + 5 * 60 * 1000 + 1);
  assert.equal(player.afk, false);
  assert.equal(emitted.some(entry=>entry.event === "session:afk-status" && entry.payload.afk === false), true);
});

test("ten minutes without activity disconnects the socket without granting a graceful logout", ()=>{
  const {players, presence, emitted, io} = createHarness();
  let disconnected = 0;
  const player = presence.createPlayer("afk-timeout-socket");
  player.clientMode = "game";
  player.state = {hp:5000};
  player.lastActivityAt = 2000;
  players.set(player.id, player);
  io.sockets.sockets.set(player.id, {
    disconnect(){ disconnected += 1; }
  });

  presence.tick(2000 + 10 * 60 * 1000);

  assert.equal(disconnected, 1);
  assert.equal(player.afk, true);
  assert.equal(player.afkDisconnecting, true);
  assert.equal(player.gracefulLogout, false);
  assert.equal(emitted.some(entry=>entry.event === "session:afk-disconnect"), true);
});
