import assert from "node:assert/strict";
import test from "node:test";
import { createSocialManager } from "../src/social/social.js";

function profile(name, firmId = "astra"){
  return {
    activeShip:"orion",
    player:{name, firmId, level:5},
    social:{friends:[], incoming:[], outgoing:[], enemies:[], ignored:[]}
  };
}

function createHarness(){
  const profiles = new Map([
    ["account:a", profile("Alpha", "astra")],
    ["account:b", profile("Beta", "astra")],
    ["account:c", profile("Gamma", "cyan")]
  ]);
  const emitted = [];
  const players = new Map([
    ["socket-a", {id:"socket-a", accountId:"a", clientMode:"game", connected:true, state:{mapId:"0", shipId:"orion", updatedAt:Date.now()}}],
    ["socket-b", {id:"socket-b", accountId:"b", clientMode:"game", connected:true, afk:true, state:{mapId:"0", shipId:"velox", updatedAt:Date.now()}}]
  ]);
  const profileManager = {
    profileKeyForPlayer:player=>`account:${player.accountId}`,
    getProfileForPlayer:player=>profiles.get(`account:${player.accountId}`),
    getProfileEntry:key=>profiles.has(key) ? {key, profile:profiles.get(key)} : null,
    findProfileEntryByPilotName:name=>{
      const entry = [...profiles.entries()].find(([, value])=>value.player.name.toLowerCase() === String(name || "").toLowerCase());
      return entry ? {key:entry[0], profile:entry[1]} : null;
    },
    listProfileEntries:()=>[...profiles.entries()].map(([key, value])=>({key, profile:value})),
    updateProfileByKey:(key, update)=>{
      const value = profiles.get(key);
      if(!value) return null;
      update(value);
      return value;
    }
  };
  const io = {to:id=>({emit:(event, payload)=>emitted.push({id, event, payload})})};
  return {emitted, players, profiles, social:createSocialManager({io, players, profileManager})};
}

test("friend request stays pending until accepted and firm list excludes other firms", ()=>{
  const harness = createHarness();
  const alpha = harness.players.get("socket-a");
  const beta = harness.players.get("socket-b");

  assert.equal(harness.social.sendFriendRequest(alpha, "Beta").ok, true);
  assert.deepEqual(harness.profiles.get("account:a").social.outgoing, ["account:b"]);
  assert.deepEqual(harness.profiles.get("account:b").social.incoming, ["account:a"]);

  const pending = harness.social.publicSocialForPlayer(alpha);
  assert.equal(pending.outgoing[0].name, "Beta");
  assert.equal(pending.outgoing[0].status, "away");
  assert.equal(pending.firmMembers.some(member=>member.name === "Gamma"), false);

  assert.equal(harness.social.respondFriendRequest(beta, "account:a", true).ok, true);
  assert.deepEqual(harness.profiles.get("account:a").social.friends, ["account:b"]);
  assert.deepEqual(harness.profiles.get("account:b").social.friends, ["account:a"]);
  assert.deepEqual(harness.profiles.get("account:a").social.outgoing, []);
});

test("ignored players cannot send private messages", ()=>{
  const harness = createHarness();
  const alpha = harness.players.get("socket-a");
  const beta = harness.players.get("socket-b");
  harness.social.sendFriendRequest(alpha, "Beta");
  harness.social.respondFriendRequest(beta, "account:a", true);
  harness.social.setCategory(beta, "Alpha", "ignored");

  const result = harness.social.sendPrivateMessage(alpha, "account:b", "Salut");
  assert.equal(result.ok, false);
  assert.match(result.reason, /refuse/i);
});
