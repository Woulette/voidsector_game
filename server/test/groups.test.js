import assert from "node:assert/strict";
import test from "node:test";
import { createGroupManager } from "../src/groups/groups.js";

function createHarness(){
  const events = [];
  const rooms = new Map();
  const sockets = new Map();
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", groupId:null}],
    ["b", {id:"b", name:"Beta", connected:true, clientMode:"game", groupId:null}]
  ]);
  for(const id of players.keys()){
    sockets.set(id, {
      id,
      emit:(event, payload)=>events.push({id, event, payload}),
      join:room=>rooms.set(`${id}:${room}`, true),
      leave:room=>rooms.delete(`${id}:${room}`)
    });
  }
  const io = {
    sockets:{sockets},
    to:id=>({emit:(event, payload)=>events.push({id, event, payload})})
  };
  const manager = createGroupManager({
    io,
    players,
    publicPlayer:player=>player ? {id:player.id, name:player.name, groupId:player.groupId} : null,
    publicEnemy:enemy=>enemy,
    emitPlayers(){}
  });
  return {events, manager, players, sockets};
}

test("group invitation must exist before accept and supports promote and kick", ()=>{
  const {manager, players, sockets} = createHarness();
  const alphaSocket = sockets.get("a");
  const betaSocket = sockets.get("b");

  assert.equal(manager.acceptInvite(betaSocket, "missing"), false);
  assert.equal(manager.invitePlayer(alphaSocket, players.get("b")).ok, true);
  const groupId = players.get("a").groupId;
  assert.equal(manager.acceptInvite(betaSocket, groupId), true);
  assert.equal(players.get("b").groupId, groupId);

  assert.equal(manager.promoteLeader(alphaSocket, "b"), true);
  assert.equal(manager.groups.get(groupId).leaderId, "b");
  assert.equal(manager.kickMember(betaSocket, "a"), true);
  assert.equal(players.get("a").groupId, null);
});
