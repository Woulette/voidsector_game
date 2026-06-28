import assert from "node:assert/strict";
import test from "node:test";
import { createCombatLoop } from "../../src/game/systems/combatLoop.js";

function withAnimationFrameHarness(callback){
  const previousDocument = globalThis.document;
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  const previousSetInterval = globalThis.setInterval;
  const previousClearInterval = globalThis.clearInterval;
  let queuedFrame = null;
  globalThis.document = {hidden:false};
  globalThis.requestAnimationFrame = frame=>{ queuedFrame = frame; return 1; };
  globalThis.cancelAnimationFrame = ()=>{};
  globalThis.setInterval = ()=>1;
  globalThis.clearInterval = ()=>{};
  const runFrame = time=>{
    const frame = queuedFrame;
    assert.equal(typeof frame, "function");
    frame(time);
  };
  try{
    callback(runFrame);
  }finally{
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousRequest;
    globalThis.cancelAnimationFrame = previousCancel;
    globalThis.setInterval = previousSetInterval;
    globalThis.clearInterval = previousClearInterval;
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
    let capturedDt = null;
    const loop = createCombatLoop({
      isRunning:()=>true,
      update:dt=>{ capturedDt = dt; },
      draw:()=>{},
      getLastTime:()=>last,
      setLastTime:value=>{ last = value; },
      getFpsLimit:()=>0
    });
    loop.start(200);
    runFrame(150);
    assert.equal(capturedDt, 0);
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
