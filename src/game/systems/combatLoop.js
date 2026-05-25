export function createCombatLoop({isRunning, update, draw, getLastTime, setLastTime, onFrameMetrics}){
  function frame(time){
    if(!isRunning()) return;
    const dt = Math.min(.033, (time - getLastTime()) / 1000 || .016);
    setLastTime(time);
    const frameStart = performance.now();
    update(dt);
    draw();
    onFrameMetrics?.({dt, frameMs:performance.now() - frameStart});
    requestAnimationFrame(frame);
  }

  function start(time = performance.now()){
    setLastTime(time);
    requestAnimationFrame(frame);
  }

  return {start};
}
