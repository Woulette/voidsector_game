import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { advancePlayerStateSourceAt } from "../src/socket/playerHandlers.js";
import {
  emitAuthoritativePlayerStateToMapRoom
} from "../src/players/playerStateStream.js";

test("client source timeline resumes after server fallback without double-counting elapsed time", ()=>{
  const first = advancePlayerStateSourceAt({
    hasSourceAt:true,
    rawSourceAt:1000,
    lastRawSourceAt:Number.NaN,
    lastClientNormalizedAt:Number.NaN,
    previousSourceAt:Number.NaN,
    sourceDelta:50,
    now:100000
  });
  assert.equal(first, 1000);

  const resumed = advancePlayerStateSourceAt({
    hasSourceAt:true,
    rawSourceAt:1300,
    lastRawSourceAt:1000,
    lastClientNormalizedAt:1000,
    previousSourceAt:1250,
    sourceDelta:300,
    now:100300
  });
  assert.equal(resumed, 1300);
});

test("client source timeline never moves behind a newer server fallback state", ()=>{
  const resumed = advancePlayerStateSourceAt({
    hasSourceAt:true,
    rawSourceAt:1300,
    lastRawSourceAt:1000,
    lastClientNormalizedAt:1000,
    previousSourceAt:1350,
    sourceDelta:300,
    now:100300
  });
  assert.equal(resumed, 1351);
});

test("legacy clients advance the normalized source timeline from server elapsed time", ()=>{
  const legacy = advancePlayerStateSourceAt({
    hasSourceAt:false,
    previousSourceAt:2000,
    sourceDelta:50,
    now:100000
  });
  assert.equal(legacy, 2050);
});

test("combat fanout advances sequence without relabeling an old position as new motion", ()=>{
  const rooms = [];
  const emitted = [];
  const player = {
    id:"target",
    groupId:"group-cross-map",
    mapRoom:"map:0",
    stateStreamSeq:4,
    lastStateStreamAt:1000,
    state:{sourceAt:100, streamSeq:4, serverAt:1000, hp:50}
  };
  const sent = emitAuthoritativePlayerStateToMapRoom({
    io:{to(room){
      rooms.push(room);
      return {emit(eventName, payload){ emitted.push({eventName, payload}); }};
    }},
    player,
    publicPlayer:entry=>({id:entry.id, state:{...entry.state}}),
    profile:{player:{firmId:"astra"}},
    now:1050
  });
  assert.equal(sent, true);
  assert.deepEqual(rooms, ["map:0"]);
  assert.equal(player.stateStreamSeq, 5);
  assert.equal(player.state.streamSeq, 5);
  assert.equal(player.state.sourceAt, 100);
  assert.equal(player.lastStateStreamAt, 1000);
  assert.equal(player.state.serverAt, 1050);
  assert.equal(player.lastReliableStateBroadcastAt, 1050);
  assert.equal(emitted[0].payload.state.streamSeq, 5);
});

test("PvP impact wiring uses sequenced map-room fanout instead of a global snapshot", ()=>{
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const functionStart = source.indexOf("function applyPlayerHit(socket, requestedPayload)");
  const functionEnd = source.indexOf("\nfunction activatePlayerShipAbility", functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);
  const pvpSource = source.slice(functionStart, functionEnd);
  const fanoutStart = pvpSource.indexOf("  const fanoutAt = Date.now();");
  const fanoutEnd = pvpSource.indexOf("\n  };", fanoutStart);
  assert.ok(fanoutStart >= 0 && fanoutEnd > fanoutStart);
  const fanoutSource = pvpSource.slice(fanoutStart, fanoutEnd);

  assert.equal(
    (fanoutSource.match(/emitAuthoritativePlayerStateToMapRoom\(/g) || []).length,
    2
  );
  assert.equal((fanoutSource.match(/room:attackerLaunchRoom/g) || []).length, 2);
  assert.doesNotMatch(fanoutSource, /emitPlayers\(|groupId/);
});
