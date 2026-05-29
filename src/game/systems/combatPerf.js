export function createCombatPerfSystem({getState, update, draw}){
  const perf = {frames:0, elapsed:0, frameTotal:0, frameMax:0, updateMs:0, drawMs:0, overlayT:0};

  function measuredUpdate(dt){
    const start = performance.now();
    update(dt);
    perf.updateMs = performance.now() - start;
  }

  function measuredDraw(){
    const start = performance.now();
    draw();
    perf.drawMs = performance.now() - start;
  }

  function recordFrameMetrics({dt, frameMs}){
    perf.frames += 1;
    perf.elapsed += dt;
    perf.frameTotal += frameMs;
    perf.frameMax = Math.max(perf.frameMax, frameMs);
    perf.overlayT -= dt;
    if(perf.overlayT <= 0) updatePerfPanel();
  }

  function updatePerfPanel(){
    const panel = document.getElementById("combatPerfPanel");
    if(!panel) return;
    const {enemies, particles, bullets, beams, impactEffects} = getState();
    const seconds = Math.max(.001, perf.elapsed);
    const fps = perf.frames / seconds;
    const frameAvg = perf.frameTotal / Math.max(1, perf.frames);
    const objects = [
      `E${enemies?.length || 0}`,
      `P${particles?.length || 0}`,
      `T${bullets?.length || 0}`,
      `B${beams.getBeams().length || 0}`,
      `I${impactEffects?.length || 0}`
    ].join(" ");
    panel.querySelector("[data-perf-fps]").textContent = String(Math.round(fps));
    panel.querySelector("[data-perf-frame]").textContent = `${frameAvg.toFixed(1)} / ${perf.frameMax.toFixed(1)}`;
    panel.querySelector("[data-perf-update]").textContent = perf.updateMs.toFixed(1);
    panel.querySelector("[data-perf-draw]").textContent = perf.drawMs.toFixed(1);
    panel.querySelector("[data-perf-objects]").textContent = objects;
    perf.frames = 0;
    perf.elapsed = 0;
    perf.frameTotal = 0;
    perf.frameMax = 0;
    perf.overlayT = .35;
  }

  function reset(){
    perf.frames = 0;
    perf.elapsed = 0;
    perf.frameTotal = 0;
    perf.frameMax = 0;
    perf.updateMs = 0;
    perf.drawMs = 0;
    perf.overlayT = 0;
  }

  return {measuredUpdate, measuredDraw, recordFrameMetrics, reset};
}
