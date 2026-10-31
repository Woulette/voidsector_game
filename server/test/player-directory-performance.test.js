import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPlayerDirectoryEmitter } from "../src/players/playerDirectory.js";

const serverIndexSource = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

test("player directory emitter is initialized before presence receives it", ()=>{
  const directoryInitialization = serverIndexSource.indexOf("const emitPlayers = createPlayerDirectoryEmitter");
  const presenceInitialization = serverIndexSource.indexOf("const presence = createPresenceManager");
  assert.ok(directoryInitialization >= 0);
  assert.ok(presenceInitialization >= 0);
  assert.ok(directoryInitialization < presenceInitialization);
});

test("quest timer skips unauthenticated sockets before touching profiles", ()=>{
  const timerStart = serverIndexSource.indexOf("function updateQuestTimers");
  const timerEnd = serverIndexSource.indexOf("const serverTick =", timerStart);
  const timerSource = serverIndexSource.slice(timerStart, timerEnd);

  assert.match(
    timerSource,
    /if\(!player\.accountId \|\| player\.clientMode !== "game" \|\| player\.connected === false\) continue;/
  );
  assert.doesNotMatch(timerSource, /guest:\$\{player\.name\}/);
});

test("player directory sanitizes each player once per broadcast and masks hidden state", ()=>{
  const players = new Map([
    ["a", {id:"a", accountId:"account-a", mapRoom:"map:0", state:{x:1}}],
    ["b", {id:"b", accountId:"account-b", mapRoom:"map:0", state:{x:2}}],
    ["c", {id:"c", accountId:"account-c", mapRoom:"map:1", state:{x:3}}],
    ["guest", {id:"guest", accountId:null, mapRoom:"map:0", state:{x:4}}]
  ]);
  const emitted = new Map();
  let publicPlayerCalls = 0;
  const emitPlayers = createPlayerDirectoryEmitter({
    players,
    io:{
      to(id){
        return {
          emit(eventName, payload){
            emitted.set(id, {eventName, payload});
          }
        };
      }
    },
    publicPlayer(player){
      publicPlayerCalls += 1;
      return {id:player.id, state:player.state};
    },
    canSharePlayerState(recipient, candidate){
      return recipient.id === candidate.id || recipient.mapRoom === candidate.mapRoom;
    }
  });

  emitPlayers();

  assert.equal(publicPlayerCalls, 3);
  assert.equal(emitted.size, 3);
  assert.equal(emitted.get("a").eventName, "players:list");
  assert.deepEqual(emitted.get("a").payload.map(player=>player.id), ["a", "b", "c"]);
  assert.deepEqual(emitted.get("a").payload.find(player=>player.id === "b").state, {x:2});
  assert.equal(emitted.get("a").payload.find(player=>player.id === "c").state, null);
});
