import assert from "node:assert/strict";
import test from "node:test";
import { createCombatLoop } from "../../src/game/systems/combatLoop.js";

function withAnimationFrameHarness(callback){
  const previousDocument = globalThis.document;
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  const previousSetInterval = globalThis.setInterval;
  const previousClearInterval = globalThis.clearInterval;
  const previousPerformance = globalThis.performance;
  let queuedFrame = null;
  let queuedInterval = null;
  let now = 0;
  globalThis.document = {hidden:false};
  globalThis.requestAnimationFrame = frame=>{ queuedFrame = frame; return 1; };
  globalThis.cancelAnimationFrame = ()=>{};
  globalThis.setInterval = callback=>{ queuedInterval = callback; return 1; };
  globalThis.clearInterval = ()=>{};
  globalThis.performance = {now:()=>now};
  const runFrame = time=>{
    now = time;
    const frame = queuedFrame;
    assert.equal(typeof frame, "function");
    frame(time);
  };
  const runHiddenInterval = time=>{
    now = time;
    assert.equal(typeof queuedInterval, "function");
    queuedInterval();
  };
  try{
    callback(runFrame, runHiddenInterval, hidden=>{ globalThis.document.hidden = hidden; });
  }finally{
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousRequest;
    globalThis.cancelAnimationFrame = previousCancel;
    globalThis.setInterval = previousSetInterval;
    globalThis.clearInterval = previousClearInterval;
    globalThis.performance = previousPerformance;
  }
}

test("visible combat loop skips early frames when an FPS limit is active", ()=>{
  withAnimationFrameHarness(runFrame=>{
    let last = 100;
    let draws = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:()=>{},
      draw:()=>{ draws += 1; },
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>30
    });
    loop.start(100);
    runFrame(101);
    runFrame(110);
    runFrame(125);
    assert.equal(draws, 1);
    runFrame(135);
    assert.equal(draws, 2);
  });
});

test("unlimited combat loop renders every animation frame", ()=>{
  withAnimationFrameHarness(runFrame=>{
    let last = 100;
    let draws = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:()=>{},
      draw:()=>{ draws += 1; },
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>0
    });
    loop.start(100);
    runFrame(101);
    runFrame(110);
    runFrame(125);
    assert.equal(draws, 3);
  });
});

test("combat loop clamps negative frame delta to zero", ()=>{
  withAnimationFrameHarness(runFrame=>{
    let last = 200;
    let updates = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:()=>{ updates += 1; },
      draw:()=>{},
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>0
    });
    loop.start(200);
    runFrame(150);
    assert.equal(updates, 0);
    runFrame(200);
    assert.equal(updates, 3);
  });
});

test("60 FPS limit stays at 60 on a 240 Hz animation clock", ()=>{
  withAnimationFrameHarness(runFrame=>{
    let last = 0;
    let draws = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:()=>{},
      draw:()=>{ draws += 1; },
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>60
    });
    loop.start(0);
    for(let frame = 1; frame <= 240; frame += 1) runFrame(frame * 1000 / 240);
    assert.equal(draws, 60);
  });
});

for(const browserFps of [15, 20]){
  test(`fixed-step combat simulation preserves one second at ${browserFps} FPS`, ()=>{
    withAnimationFrameHarness(runFrame=>{
      let last = 0;
      let simulatedSeconds = 0;
      let updates = 0;
      const loop = createCombatLoop({
        isRunning:()=>true,
        update:dt=>{
          simulatedSeconds += dt;
          updates += 1;
        },
        draw:()=>{},
        getLastTime:()=>last,
        setLastTime:value=>{ last = value; },
        getFpsLimit:()=>0
      });
      loop.start(0);
      for(let frame = 1; frame <= browserFps; frame += 1){
        runFrame(frame * 1000 / browserFps);
      }
      assert.equal(updates, 60);
      assert.ok(Math.abs(simulatedSeconds - 1) < 1e-9);
    });
  });
}

test("FPS limit only limits rendering and keeps the simulation at 60 Hz", ()=>{
  withAnimationFrameHarness(runFrame=>{
    let last = 0;
    let draws = 0;
    let updates = 0;
    let simulatedSeconds = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:dt=>{
        updates += 1;
        simulatedSeconds += dt;
      },
      draw:()=>{ draws += 1; },
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>30
    });
    loop.start(0);
    for(let frame = 1; frame <= 60; frame += 1) runFrame(frame * 1000 / 60);
    assert.equal(draws, 30);
    assert.equal(updates, 60);
    assert.ok(Math.abs(simulatedSeconds - 1) < 1e-9);
  });
});

test("hidden MMO loop keeps its low-frequency update without rendering", ()=>{
  withAnimationFrameHarness((runFrame, runHiddenInterval, setHidden)=>{
    let last = 0;
    const updateDts = [];
    let draws = 0;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:dt=>updateDts.push(dt),
      draw:()=>{ draws += 1; },
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>0
    });
    loop.start(0);
    setHidden(true);
    runFrame(10);
    runHiddenInterval(110);
    runHiddenInterval(210);

    assert.deepEqual(updateDts, [.11, .1]);
    assert.equal(draws, 0);
  });
});
