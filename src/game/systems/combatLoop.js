export function createCombatLoop({isRunning, update, draw, getLastTime, setLastTime}){
  function frame(time){
    if(!isRunning()) return;
    const dt = Math.min(.033, (time - getLastTime()) / 1000 || .016);
    setLastTime(time);
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function start(time = performance.now()){
    setLastTime(time);
    requestAnimationFrame(frame);
  }

  return {start};
}
