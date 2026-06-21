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

test("group membership moves to a reconnecting socket id", ()=>{
  const {manager, players, sockets} = createHarness();
  const alphaSocket = sockets.get("a");
  const betaSocket = sockets.get("b");
  assert.equal(manager.invitePlayer(alphaSocket, players.get("b")).ok, true);
  const groupId = players.get("a").groupId;
  assert.equal(manager.acceptInvite(betaSocket, groupId), true);
  const group = manager.groups.get(groupId);
  group.instance = {
    id:"portal-1",
    type:"portal",
    portal:{id:"ricky"},
    joinedMemberIds:["a"],
    abandonedMemberIds:[],
    playerLives:{a:3},
    enemies:[]
  };

  players.set("next-a", {...players.get("a"), id:"next-a"});
  players.delete("a");
  manager.replaceGroupMemberId("a", "next-a");

  assert.deepEqual(group.members.sort(), ["b", "next-a"]);
  assert.equal(group.leaderId, "next-a");
  assert.deepEqual(group.instance.joinedMemberIds, ["next-a"]);
  assert.equal(group.instance.playerLives["next-a"], 3);
  assert.equal(group.instance.playerLives.a, undefined);
});

test("portal instance snapshots are sent only to members that joined the instance", ()=>{
  const {events, manager, players, sockets} = createHarness();
  const alphaSocket = sockets.get("a");
  const betaSocket = sockets.get("b");
  assert.equal(manager.invitePlayer(alphaSocket, players.get("b")).ok, true);
  const groupId = players.get("a").groupId;
  assert.equal(manager.acceptInvite(betaSocket, groupId), true);
  const group = manager.groups.get(groupId);
  group.instance = {
    id:"portal-1",
    type:"portal",
    portal:{id:"ricky"},
    joinedMemberIds:["a"],
    abandonedMemberIds:[],
    enemies:[]
  };
  events.length = 0;

  manager.emitInstance(group);

  assert.equal(events.some(entry=>entry.id === "a" && entry.event === "coop:enemies"), true);
  assert.equal(events.some(entry=>entry.id === "b" && entry.event === "coop:enemies"), false);
  assert.equal(events.some(entry=>entry.id === groupId && entry.event === "coop:enemies"), false);

  events.length = 0;
  group.instance.objective = {returnedMemberIds:["a"]};
  manager.emitInstance(group);

  assert.equal(events.some(entry=>entry.event === "coop:enemies"), false);
});
