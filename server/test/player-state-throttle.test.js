import assert from "node:assert/strict";
import test from "node:test";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";

function withPerformanceClock(callback){
  const previousPerformance = globalThis.performance;
  let now = 0;
  globalThis.performance = {now:()=>now};
  try{
    callback(value=>{ now = value; });
  }finally{
    globalThis.performance = previousPerformance;
  }
}

function createAuthenticatedMultiplayer({withVolatile = true} = {}){
  const emitted = [];
  const volatileEmitted = [];
  const socket = {
    id:"socket-1",
    emit:(eventName, payload)=>emitted.push({eventName, payload})
  };
  if(withVolatile){
    socket.volatile = {
      emit:(eventName, payload)=>volatileEmitted.push({eventName, payload})
    };
  }
  return {
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket
    },
    emitted,
    volatileEmitted
  };
}

test("idle player state sends one heartbeat per second without rebuilding every frame", ()=>{
  withPerformanceClock(setNow=>{
    const fixture = createAuthenticatedMultiplayer();
    const commands = createCombatCommands({multiplayer:fixture.multiplayer});
    let factoryCalls = 0;
    const factory = ()=>{
      factoryCalls += 1;
      return {x:10, y:20, hp:100, shield:50, pageHidden:false};
    };

    for(let now = 0; now <= 1000; now += 10){
      setNow(now);
      commands.sendPlayerSnapshot(factory, {active:false});
    }

    assert.equal(fixture.emitted.length, 2);
    assert.equal(fixture.volatileEmitted.length, 0);
    assert.deepEqual(fixture.emitted.map(event=>event.eventName), ["player:state", "player:state"]);
    assert.deepEqual(fixture.emitted.map(event=>event.payload.sourceSeq), [1, 2]);
    assert.deepEqual(fixture.emitted.map(event=>event.payload.sourceAt), [0, 1000]);
    assert.equal(factoryCalls, 11);
  });
});

test("moving player state is emitted at 20 Hz and payload creation is throttled", ()=>{
  withPerformanceClock(setNow=>{
    const fixture = createAuthenticatedMultiplayer();
    const commands = createCombatCommands({multiplayer:fixture.multiplayer});
    let x = 0;
    let factoryCalls = 0;
    const factory = ()=>{
      factoryCalls += 1;
      return {x, y:0, vx:120, vy:0, hp:100, shield:50, pageHidden:false};
    };

    for(let now = 0; now <= 1000; now += 10){
      x = now * .12;
      setNow(now);
      commands.sendPlayerSnapshot(factory, {active:true});
    }

    const all = [...fixture.emitted, ...fixture.volatileEmitted]
      .sort((left, right)=>left.payload.sourceSeq - right.payload.sourceSeq);
    assert.equal(fixture.emitted.length, 1);
    assert.equal(fixture.volatileEmitted.length, 20);
    assert.equal(all.length, 21);
    assert.equal(factoryCalls, all.length);
    assert.deepEqual(all.map(event=>event.payload.sourceSeq), Array.from({length:21}, (_, index)=>index + 1));
    assert.deepEqual(all.map(event=>event.payload.sourceAt), Array.from({length:21}, (_, index)=>index * 50));
    assert.ok(all.at(-1).payload.x >= 118);
  });
});

test("important idle state changes are sent before the next heartbeat", ()=>{
  withPerformanceClock(setNow=>{
    const fixture = createAuthenticatedMultiplayer();
    const commands = createCombatCommands({multiplayer:fixture.multiplayer});
    let hp = 100;
    const snapshot = ()=>({x:0, y:0, hp, shield:50, pageHidden:false});

    setNow(0);
    commands.sendPlayerSnapshot(snapshot, {active:false});
    hp = 75;
    setNow(100);
    commands.sendPlayerSnapshot(snapshot, {active:false});

    assert.equal(fixture.emitted.length, 1);
    assert.equal(fixture.volatileEmitted.length, 1);
    assert.equal(fixture.volatileEmitted[0].payload.hp, 75);
  });
});

test("player state falls back to the regular socket emitter when volatile is unavailable", ()=>{
  withPerformanceClock(setNow=>{
    const fixture = createAuthenticatedMultiplayer({withVolatile:false});
    const commands = createCombatCommands({multiplayer:fixture.multiplayer});
    setNow(0);

    const sent = commands.sendPlayerSnapshot(
      ()=>({x:0, y:0, hp:100, shield:50, pageHidden:true}),
      {active:false}
    );

    assert.equal(sent, true);
    assert.equal(fixture.emitted.length, 1);
    assert.equal(fixture.emitted[0].eventName, "player:state");
    assert.equal(fixture.emitted[0].payload.pageHidden, true);
  });
});

test("fixed-step subupdates coalesce to the final player snapshot of the frame", async ()=>{
  const previousPerformance = globalThis.performance;
  globalThis.performance = {now:()=>100};
  const fixture = createAuthenticatedMultiplayer();
  const commands = createCombatCommands({multiplayer:fixture.multiplayer});
  let factoryCalls = 0;

  try{
    commands.sendPlayerSnapshot(()=>{
      factoryCalls += 1;
      return {x:10, y:0, hp:100};
    }, {active:true, coalesce:true});
    commands.sendPlayerSnapshot(()=>{
      factoryCalls += 1;
      return {x:40, y:0, hp:100};
    }, {active:true, coalesce:true});
    await Promise.resolve();

    assert.equal(factoryCalls, 1);
    assert.equal(fixture.emitted.length, 1);
    assert.equal(fixture.volatileEmitted.length, 0);
    assert.equal(fixture.emitted[0].payload.x, 40);
  }finally{
    globalThis.performance = previousPerformance;
  }
});

test("20 Hz movement cadence does not drift at common render frame rates", ()=>{
  for(const fps of [30, 60, 144, 240]){
    withPerformanceClock(setNow=>{
      const fixture = createAuthenticatedMultiplayer();
      const commands = createCombatCommands({multiplayer:fixture.multiplayer});
      let factoryCalls = 0;
      const frameMs = 1000 / fps;
      for(let frame = 0; frame * frameMs <= 1000 + .001; frame += 1){
        const now = frame * frameMs;
        setNow(now);
        commands.sendPlayerSnapshot(()=>{
          factoryCalls += 1;
          return {x:now * .3, y:0, vx:300, vy:0, enginePower:1, mapId:"0"};
        }, {active:true});
      }
      const emissions = fixture.emitted.length + fixture.volatileEmitted.length;
      assert.ok(emissions >= 20 && emissions <= 21, `${fps} FPS produced ${emissions} snapshots`);
      assert.equal(factoryCalls, emissions);
    });
  }
});

test("movement starts, stops, map changes and large jumps use reliable snapshots", ()=>{
  withPerformanceClock(setNow=>{
    const fixture = createAuthenticatedMultiplayer();
    const commands = createCombatCommands({multiplayer:fixture.multiplayer});
    const send = (now, payload, active)=>{
      setNow(now);
      commands.sendPlayerSnapshot(()=>payload, {active});
    };

    send(0, {x:0, y:0, vx:0, vy:0, enginePower:0, mapId:"0"}, false);
    send(100, {x:20, y:0, vx:200, vy:0, enginePower:1, mapId:"0"}, true);
    send(150, {x:30, y:0, vx:200, vy:0, enginePower:1, mapId:"0"}, true);
    send(200, {x:30, y:0, vx:0, vy:0, enginePower:0, mapId:"0"}, false);
    send(300, {x:30, y:0, vx:0, vy:0, enginePower:0, mapId:"1"}, false);
    send(400, {x:500, y:0, vx:0, vy:0, enginePower:0, mapId:"1"}, false);

    assert.deepEqual(fixture.emitted.map(event=>event.payload.sourceAt), [0, 100, 200, 300, 400]);
    assert.deepEqual(fixture.volatileEmitted.map(event=>event.payload.sourceAt), [150]);
  });
});
