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
    portal:{id:"prismatic"},
    joinedMemberIds:["a"],
    abandonedMemberIds:[],
    playerLives:{a:3},
    objective:{
      kind:"prismatic",
      activeBurns:[{targetId:"a"}],
      activeSlows:[{targetId:"a"}]
    },
    enemies:[{
      id:"prismatic-boss",
      hp:1,
      lockedPlayerId:"a",
      attackedPlayerId:"a",
      damageThreat:{a:123}
    }]
  };

  players.set("next-a", {...players.get("a"), id:"next-a"});
  players.delete("a");
  manager.replaceGroupMemberId("a", "next-a");

  assert.deepEqual(group.members.sort(), ["b", "next-a"]);
  assert.equal(group.leaderId, "next-a");
  assert.deepEqual(group.instance.joinedMemberIds, ["next-a"]);
  assert.equal(group.instance.playerLives["next-a"], 3);
  assert.equal(group.instance.playerLives.a, undefined);
  assert.equal(group.instance.objective.activeBurns[0].targetId, "next-a");
  assert.equal(group.instance.objective.activeSlows[0].targetId, "next-a");
  assert.equal(group.instance.enemies[0].lockedPlayerId, "next-a");
  assert.equal(group.instance.enemies[0].attackedPlayerId, "next-a");
  assert.deepEqual(group.instance.enemies[0].damageThreat, {"next-a":123});
});

test("Ancient threat, transient targets and blessing ownership migrate on reconnect", ()=>{
  const {manager, players, sockets} = createHarness();
  manager.createGroup(sockets.get("a"));
  const group = manager.groups.get(players.get("a").groupId);
  group.instance = {
    id:"ancient-instance",
    type:"portal",
    portal:{id:"ancient"},
    joinedMemberIds:["a"],
    abandonedMemberIds:[],
    playerLives:{a:3},
    objective:{
      kind:"precursors",
      effects:[{id:"angel-heal", targetId:"a"}],
      bombs:[],
      allies:[]
    },
    enemies:[{
      id:"demon-king",
      hp:1,
      lockedPlayerId:"a",
      attackedPlayerId:"a",
      damageThreat:{a:456}
    }]
  };
  players.get("a").precursorBlessing = {
    sourceInstanceId:"ancient-instance",
    damageMultiplier:1.15,
    expiresAt:99_000
  };
  players.get("a").precursorActiveInstanceId = "ancient-instance";
  players.set("next-a", {...players.get("a"), id:"next-a"});
  manager.replaceGroupMemberId("a", "next-a");

  assert.deepEqual(group.instance.joinedMemberIds, ["next-a"]);
  assert.equal(group.instance.objective.effects[0].targetId, "next-a");
  assert.equal(group.instance.enemies[0].lockedPlayerId, "next-a");
  assert.equal(group.instance.enemies[0].attackedPlayerId, "next-a");
  assert.deepEqual(group.instance.enemies[0].damageThreat, {"next-a":456});
  assert.equal(players.get("next-a").precursorBlessing.damageMultiplier, 1.15);
  assert.equal(players.get("next-a").precursorActiveInstanceId, "ancient-instance");
  assert.equal(players.get("a").precursorActiveInstanceId, undefined);
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
