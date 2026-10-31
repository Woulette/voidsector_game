import test from "node:test";
import assert from "node:assert/strict";
import {
  frameRateIndependentBlend,
  isRemoteStateInViewport,
  resolveAdaptiveDelayMs,
  sampleBufferedState,
  updateRemoteRenderState
} from "../../src/multiplayer/remoteInterpolation.js";
import { upsertRemotePlayer } from "../../src/multiplayer/socketState.js";

test("remote interpolation samples already ordered buffers without mutating them", ()=>{
  const samples = [
    {x:0, y:10, angle:0, receivedAt:100},
    {x:100, y:30, angle:Math.PI / 2, receivedAt:200}
  ];
  const target = {};
  const sampled = sampleBufferedState(samples, {delayMs:50, now:200, target});
  assert.equal(sampled, target);
  assert.equal(sampled.x, 50);
  assert.equal(sampled.y, 20);
  assert.equal(samples.length, 2);
});

test("remote smoothing catches up by elapsed time instead of frame count", ()=>{
  const blendAt60 = frameRateIndependentBlend(1000 / 60, .55);
  const blendAt30 = frameRateIndependentBlend(1000 / 30, .55);
  assert.ok(Math.abs(blendAt60 - .55) < .0001);
  assert.ok(blendAt30 > blendAt60);

  const remote = {};
  updateRemoteRenderState(remote, {x:0, y:0, angle:0, enginePower:0}, 0);
  const state = updateRemoteRenderState(remote, {x:20, y:0, angle:0, enginePower:1}, 1000 / 15);
  assert.ok(state.x > 18);
});

test("remote viewport culling keeps nearby entities and rejects distant ones", ()=>{
  const canvas = {__viewWidth:1280, __viewHeight:720, __dpr:1};
  const camera = {x:1000, y:1000};
  assert.equal(isRemoteStateInViewport({
    render:{x:1200, y:1100},
    camera,
    canvas,
    radius:48
  }), true);
  assert.equal(isRemoteStateInViewport({
    render:{x:5000, y:5000},
    camera,
    canvas,
    radius:48
  }), false);
});

test("remote player updates preserve render caches and ignore duplicate state samples", ()=>{
  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  upsertRemotePlayer(multiplayer, {
    id:"remote",
    name:"Pilot",
    state:{x:10, y:20, angle:0, updatedAt:100}
  });
  const remote = multiplayer.remotePlayers.get("remote");
  remote.renderState = {x:10};

  upsertRemotePlayer(multiplayer, {
    id:"remote",
    name:"Pilot 2",
    state:{x:10, y:20, angle:0, updatedAt:100}
  });
  assert.equal(multiplayer.remotePlayers.get("remote"), remote);
  assert.equal(remote.renderState.x, 10);
  assert.equal(remote.stateSamples.length, 1);

  for(let index = 1; index <= 12; index += 1){
    upsertRemotePlayer(multiplayer, {
      id:"remote",
      state:{x:10 + index, y:20, angle:0, updatedAt:100 + index}
    });
  }
  assert.equal(remote.stateSamples.length, 12);
});

test("sequenced stream replaces a legacy epoch snapshot instead of freezing the remote", ()=>{
  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  upsertRemotePlayer(multiplayer, {
    id:"remote",
    state:{x:0, y:0, vx:0, vy:0, mapId:"0", updatedAt:1700000000000}
  }, {now:40, epochNow:1700000000040});
  const remote = multiplayer.remotePlayers.get("remote");
  remote.renderState = {x:0};
  remote.interpolationState = {playbackAt:0};

  upsertRemotePlayer(multiplayer, {
    id:"remote",
    state:{
      x:5, y:0, vx:100, vy:0, mapId:"0",
      sourceSeq:1,
      sourceAt:100,
      streamSeq:1,
      updatedAt:1700000000100
    }
  }, {now:140, epochNow:1700000000140});

  assert.equal(remote.state.x, 5);
  assert.equal(remote.stateSamples.length, 1);
  assert.equal(remote.stateSamples[0].streamSeq, 1);
  assert.equal(remote.networkDiagnostics.staleSamples, 0);
  assert.equal(remote.networkDiagnostics.discontinuityResets, 1);
  assert.equal(remote.renderState, null);
  assert.equal(remote.interpolationState, null);
});

function makePackets({delays = [40], missing = new Set(), duration = 1800} = {}){
  const packets = [];
  let lastArrival = Number.NEGATIVE_INFINITY;
  for(let sourceAt = 0, sequence = 1; sourceAt <= duration; sourceAt += 50, sequence += 1){
    if(missing.has(sequence)) continue;
    const arrival = Math.max(
      sourceAt + delays[(sequence - 1) % delays.length],
      lastArrival + .01
    );
    packets.push({
      arrival,
      state:{
        x:sourceAt * .3,
        y:0,
        vx:300,
        vy:0,
        angle:0,
        engineAngle:0,
        enginePower:1,
        mapId:"0",
        streamSeq:sequence,
        sourceSeq:sequence,
        sourceAt,
        updatedAt:100000 + sourceAt
      }
    });
    lastArrival = arrival;
  }
  return packets;
}

function runScenario({fps = 60, ...packetOptions} = {}){
  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  const packets = makePackets(packetOptions);
  let packetIndex = 0;
  let lastX = Number.NEGATIVE_INFINITY;
  for(let now = 0; now <= 2200; now += 1000 / fps){
    while(packetIndex < packets.length && packets[packetIndex].arrival <= now){
      const packet = packets[packetIndex];
      packetIndex += 1;
      upsertRemotePlayer(multiplayer, {id:"remote", state:packet.state}, {
        now:packet.arrival,
        epochNow:packet.arrival
      });
    }
    const remote = multiplayer.remotePlayers.get("remote");
    if(!remote) continue;
    remote.sampledState ||= {};
    remote.interpolationState ||= {};
    const sampled = sampleBufferedState(remote.stateSamples, {
      now,
      target:remote.sampledState,
      timing:remote.interpolationState,
      diagnostics:remote.networkDiagnostics
    });
    const render = updateRemoteRenderState(remote, sampled, now);
    if(now > 300){
      assert.ok(render.x + 1e-6 >= lastX, `remote moved backwards at ${fps} FPS`);
      lastX = render.x;
    }
  }
  return {remote:multiplayer.remotePlayers.get("remote"), x:lastX};
}

test("adaptive buffer stays monotonic under jitter, packet loss and delayed bursts", ()=>{
  const scenarios = [
    {delays:[40]},
    {delays:[40, 80, 120, 40, 120, 80], missing:new Set([8, 9])},
    {delays:[40, 40, 200, 150, 100, 50]}
  ];
  for(const scenario of scenarios){
    const finalPositions = [30, 60, 144, 240].map(fps=>runScenario({fps, ...scenario}).x);
    assert.ok(Math.max(...finalPositions) - Math.min(...finalPositions) <= 8);
  }

  const loss = runScenario({
    fps:60,
    delays:[40, 80, 120, 40, 120, 80],
    missing:new Set([8, 9])
  }).remote.networkDiagnostics;
  assert.equal(loss.droppedSequences, 2);
  assert.ok(loss.jitterMs > 0);
  assert.ok(loss.lateBursts > 0);
  assert.ok(loss.extrapolations > 0);
  assert.ok(loss.adaptiveDelayMs >= 75 && loss.adaptiveDelayMs <= 220);
});

test("stale snapshots are ignored and discontinuities reset interpolation state", ()=>{
  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  const put = (streamSeq, sourceAt, x, mapId = "0")=>upsertRemotePlayer(multiplayer, {
    id:"remote",
    state:{streamSeq, sourceSeq:streamSeq, sourceAt, updatedAt:1000 + sourceAt, x, y:0, vx:100, vy:0, mapId}
  }, {now:sourceAt + 40, epochNow:sourceAt + 40});

  put(1, 0, 0);
  put(3, 100, 10);
  put(2, 50, 5);
  const remote = multiplayer.remotePlayers.get("remote");
  assert.equal(remote.state.x, 10);
  assert.equal(remote.stateSamples.length, 2);
  assert.equal(remote.networkDiagnostics.droppedSequences, 1);
  assert.equal(remote.networkDiagnostics.staleSamples, 1);

  remote.renderState = {x:10};
  remote.interpolationState = {playbackAt:50};
  put(4, 150, 1000, "1");
  assert.equal(remote.stateSamples.length, 1);
  assert.equal(remote.renderState, null);
  assert.equal(remote.interpolationState, null);
  assert.equal(remote.networkDiagnostics.discontinuityResets, 1);
});

test("adaptive delay is bounded and long extrapolation decays instead of hard freezing", ()=>{
  assert.equal(resolveAdaptiveDelayMs({intervalMs:50, jitterMs:0}), 77.5);
  assert.equal(resolveAdaptiveDelayMs({intervalMs:500, jitterMs:500}), 220);

  const sample = [{x:0, y:0, vx:300, vy:0, enginePower:1, sourceAt:0, receivedAt:40}];
  const timing = {};
  const positions = [160, 340, 520, 800].map(now=>sampleBufferedState(sample, {
    delayMs:0,
    now,
    target:{},
    timing
  }).x);
  assert.ok(positions.every(Number.isFinite));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2] && positions[2] < positions[3]);
  assert.ok(positions.at(-1) < 90);
});

test("a sustained latency increase rebases the clock before a stop can rubber-band backwards", ()=>{
  const packets = [];
  for(let sourceAt = 0, sequence = 1; sourceAt <= 5000; sourceAt += 50, sequence += 1){
    const delay = sourceAt < 2000 ? 40 : 300;
    const moving = sourceAt < 3000;
    packets.push({
      arrival:sourceAt + delay,
      state:{
        x:Math.min(sourceAt, 3000) * .3,
        y:0,
        vx:moving ? 300 : 0,
        vy:0,
        angle:0,
        engineAngle:0,
        enginePower:moving ? 1 : 0,
        mapId:"0",
        streamSeq:sequence,
        sourceSeq:sequence,
        sourceAt,
        updatedAt:100000 + sourceAt
      }
    });
  }
  packets.sort((left, right)=>left.arrival - right.arrival);

  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  let packetIndex = 0;
  let previousX = Number.NEGATIVE_INFINITY;
  let backwardsFrames = 0;
  let maxX = Number.NEGATIVE_INFINITY;
  for(let now = 0; now <= 5000; now += 1000 / 60){
    while(packetIndex < packets.length && packets[packetIndex].arrival <= now){
      const packet = packets[packetIndex++];
      upsertRemotePlayer(multiplayer, {id:"remote", state:packet.state}, {
        now:packet.arrival,
        epochNow:packet.arrival
      });
    }
    const remote = multiplayer.remotePlayers.get("remote");
    if(!remote) continue;
    remote.sampledState ||= {};
    remote.interpolationState ||= {};
    const sampled = sampleBufferedState(remote.stateSamples, {
      now,
      target:remote.sampledState,
      timing:remote.interpolationState,
      diagnostics:remote.networkDiagnostics
    });
    const render = updateRemoteRenderState(remote, sampled, now);
    if(now >= 2800){
      if(render.x + 1e-6 < previousX) backwardsFrames += 1;
      previousX = render.x;
      maxX = Math.max(maxX, render.x);
    }
  }

  const remote = multiplayer.remotePlayers.get("remote");
  assert.equal(remote.interpolationState.clockOffset, 300);
  assert.equal(backwardsFrames, 0);
  assert.ok(maxX <= 901, `render overshot the authoritative stop at x=${maxX}`);
});

test("a long render pause rebases playback inside the live sample window", ()=>{
  const packets = makePackets({delays:[40], duration:30000});
  const multiplayer = {playerId:"self", remotePlayers:new Map()};
  let packetIndex = 0;
  const injectUntil = now=>{
    while(packetIndex < packets.length && packets[packetIndex].arrival <= now){
      const packet = packets[packetIndex++];
      upsertRemotePlayer(multiplayer, {id:"remote", state:packet.state}, {
        now:packet.arrival,
        epochNow:packet.arrival
      });
    }
  };

  for(let now = 0; now <= 1000; now += 1000 / 60){
    injectUntil(now);
    const remote = multiplayer.remotePlayers.get("remote");
    if(!remote) continue;
    remote.sampledState ||= {};
    remote.interpolationState ||= {};
    sampleBufferedState(remote.stateSamples, {
      now,
      target:remote.sampledState,
      timing:remote.interpolationState,
      diagnostics:remote.networkDiagnostics
    });
  }

  injectUntil(11000);
  const remote = multiplayer.remotePlayers.get("remote");
  const oldestAt = remote.stateSamples[0].sourceAt;
  const latestAt = remote.stateSamples.at(-1).sourceAt;
  const sampled = sampleBufferedState(remote.stateSamples, {
    now:11000,
    target:remote.sampledState,
    timing:remote.interpolationState,
    diagnostics:remote.networkDiagnostics
  });

  assert.ok(remote.interpolationState.playbackAt >= oldestAt);
  assert.ok(remote.interpolationState.playbackAt <= latestAt);
  assert.notEqual(remote.interpolationState.mode, "underrun");
  assert.ok(sampled.x > oldestAt * .3, "playback remained pinned to the oldest sample");
});
