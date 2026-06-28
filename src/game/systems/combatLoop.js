import { beginCombatProfilerFrame, finishCombatProfilerFrame, timeCombatProfiler } from "./combatFrameProfiler.js?v=action-slots-save-1-fps-burst-1";

export function createCombatLoop({isRunning, update, draw, getLastTime, setLastTime, onFrameMetrics, getFpsLimit = ()=>0}){
  let frameHandle = null;
  let hiddenInterval = null;
  let lastVisibleFrameAt = 0;
  let previousFpsLimit = 0;

  function tick(time, drawFrame){
    if(!isRunning()) return;
    const maxDt = document.hidden ? .12 : .033;
    const elapsedSeconds = (time - getLastTime()) / 1000;
    const dt = Number.isFinite(elapsedSeconds)
      ? Math.max(0, Math.min(maxDt, elapsedSeconds))
      : .016;
    setLastTime(time);
    const frameStart = performance.now();
    beginCombatProfilerFrame({dt, drawFrame});
    timeCombatProfiler("frame.update", ()=>update(dt));
    if(drawFrame) timeCombatProfiler("frame.draw", draw);
    const frameMs = performance.now() - frameStart;
    finishCombatProfilerFrame({frameMs});
    onFrameMetrics?.({dt, frameMs});
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
      tick(performance.now(), false);
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
        tick(time, true);
      }
    }
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  function start(time = performance.now()){
    setLastTime(time);
    lastVisibleFrameAt = 0;
    if(frameHandle) cancelAnimationFrame(frameHandle);
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  return {start};
}
