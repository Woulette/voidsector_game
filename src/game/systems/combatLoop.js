export function createCombatLoop({isRunning, update, draw, getLastTime, setLastTime, onFrameMetrics}){
  let frameHandle = null;
  let hiddenInterval = null;

  function tick(time, drawFrame){
    if(!isRunning()) return;
    const maxDt = document.hidden ? .12 : .033;
    const dt = Math.min(maxDt, (time - getLastTime()) / 1000 || .016);
    setLastTime(time);
    const frameStart = performance.now();
    update(dt);
    if(drawFrame) draw();
    onFrameMetrics?.({dt, frameMs:performance.now() - frameStart});
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
    if(!document.hidden) tick(time, true);
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  function start(time = performance.now()){
    setLastTime(time);
    if(frameHandle) cancelAnimationFrame(frameHandle);
    ensureHiddenInterval();
    frameHandle = requestAnimationFrame(frame);
  }

  return {start};
}
