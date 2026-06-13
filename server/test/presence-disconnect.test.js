import assert from "node:assert/strict";
import test from "node:test";
import { createPresenceManager } from "../src/players/presence.js";

function createHarness(){
  const players = new Map();
  const removed = [];
  const io = {
    sockets:{sockets:new Map()},
    to:()=>({emit(){}})
  };
  const presence = createPresenceManager({
    io,
    players,
    emitPlayers(){},
    config:{disconnectCombatGraceMs:30000, combatRecentMs:15000},
    onPlayerRemove:player=>removed.push(player.id)
  });
  return {players, presence, removed};
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
