import { beginCombatProfilerFrame, finishCombatProfilerFrame, timeCombatProfiler } from "./combatFrameProfiler.js?v=20260726-kharon1";

const VISIBLE_FIXED_STEP_SECONDS = 1 / 60;
const MAX_VISIBLE_ACCUMULATOR_SECONDS = .25;
const MAX_VISIBLE_UPDATES_PER_FRAME = 8;
const MAX_HIDDEN_STEP_SECONDS = .12;

export function createCombatLoop({isRunning, update, draw, getLastTime, setLastTime, onFrameMetrics, getFpsLimit = ()=>0}){
  let frameHandle = null;
  let hiddenInterval = null;
  let lastVisibleFrameAt = 0;
  let lastMetricsAt = 0;
  let previousFpsLimit = 0;
  let visibleAccumulator = 0;

  function measuredFrame({dt, drawFrame, updateFrame}){
    if(!isRunning()) return;
    const frameStart = performance.now();
    beginCombatProfilerFrame({dt, drawFrame});
    updateFrame();
    if(drawFrame) timeCombatProfiler("frame.draw", draw);
    const frameMs = performance.now() - frameStart;
    finishCombatProfilerFrame({frameMs});
    return frameMs;
  }

  function tickVisible(time, drawFrame){
    const elapsedSeconds = (time - getLastTime()) / 1000;
    const elapsed = Number.isFinite(elapsedSeconds)
      ? Math.max(0, elapsedSeconds)
      : 0;
    setLastTime(time);
    visibleAccumulator = Math.min(
      MAX_VISIBLE_ACCUMULATOR_SECONDS,
      visibleAccumulator + elapsed
    );

    let updateCount = 0;
    const frameMs = measuredFrame({
      dt:Math.min(visibleAccumulator, MAX_VISIBLE_UPDATES_PER_FRAME * VISIBLE_FIXED_STEP_SECONDS),
      drawFrame,
      updateFrame:()=>{
        while(
          visibleAccumulator + 1e-9 >= VISIBLE_FIXED_STEP_SECONDS
          && updateCount < MAX_VISIBLE_UPDATES_PER_FRAME
        ){
          timeCombatProfiler("frame.update", ()=>update(VISIBLE_FIXED_STEP_SECONDS));
          visibleAccumulator = Math.max(0, visibleAccumulator - VISIBLE_FIXED_STEP_SECONDS);
          updateCount += 1;
        }
      }
    });

    if(drawFrame){
      const metricsElapsedSeconds = (time - lastMetricsAt) / 1000;
      const metricsDt = Number.isFinite(metricsElapsedSeconds)
        ? Math.max(0, Math.min(MAX_VISIBLE_ACCUMULATOR_SECONDS, metricsElapsedSeconds))
        : 0;
      lastMetricsAt = time;
      onFrameMetrics?.({dt:metricsDt, frameMs, updateCount});
    }
  }

  function tickHidden(time){
    const elapsedSeconds = (time - getLastTime()) / 1000;
    const dt = Number.isFinite(elapsedSeconds)
      ? Math.max(0, Math.min(MAX_HIDDEN_STEP_SECONDS, elapsedSeconds))
      : .1;
    setLastTime(time);
    visibleAccumulator = 0;
    lastVisibleFrameAt = 0;
    lastMetricsAt = time;
    const frameMs = measuredFrame({
      dt,
      drawFrame:false,
      updateFrame:()=>timeCombatProfiler("frame.update", ()=>update(dt))
    });
    onFrameMetrics?.({dt, frameMs, updateCount:1});
  }

  function stopHiddenInterval(){
    if(!hiddenInterval) return;
    clearInterval(hiddenInterval);
    hiddenInterval = null;
  }

  function ensureHiddenInterval(){
    if(hiddenInterval) return;
    hiddenInterval = setInterval(()=>{
      if(!isRunning()){
        stopHiddenInterval();
        return;
      }
      if(!document.hidden) return;
      tickHidden(performance.now());
    }, 100);
  }

  function frame(time){
    if(!isRunning()){
      stopHiddenInterval();
      return;
    }
    if(!document.hidden){
      const fpsLimit = Math.max(0, Number(getFpsLimit?.() || 0));
      if(fpsLimit !== previousFpsLimit){
        previousFpsLimit = fpsLimit;
        lastVisibleFrameAt = 0;
      }
      const interval = fpsLimit > 0 ? 1000 / fpsLimit : 0;
      const elapsed = time - lastVisibleFrameAt;
      if(interval <= 0 || lastVisibleFrameAt <= 0 || elapsed >= interval - .1){
        lastVisibleFrameAt = interval > 0 && lastVisibleFrameAt > 0 && elapsed >= interval
          ? time - (elapsed % interval)
          : time;
        tickVisible(time, true);
      }else{
        tickVisible(time, false);
      }
    }
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  function start(time = performance.now()){
    setLastTime(time);
    lastVisibleFrameAt = 0;
    lastMetricsAt = time;
    visibleAccumulator = 0;
    if(frameHandle) cancelAnimationFrame(frameHandle);
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  return {start};
}
