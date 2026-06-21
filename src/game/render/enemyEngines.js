const DEADLY_ENGINE_PORTS = Object.freeze({
  deadly_eclaireur:Object.freeze([[-.14, .42], [.14, .42]]),
  deadly_intercepteur:Object.freeze([[-.15, .43], [.15, .43]]),
  deadly_gardien:Object.freeze([[-.20, .40], [0, .47], [.20, .40]]),
  deadly_traqueur:Object.freeze([[-.16, .38], [.16, .38]]),
  deadly_ravageur:Object.freeze([[-.14, .42], [.14, .42]]),
  deadly_amiral_k137:Object.freeze([[-.23, .43], [.23, .43]])
});

export function getDeadlyEnginePorts(kind){
  return DEADLY_ENGINE_PORTS[String(kind || "")] || null;
}

export function drawDeadlyEnemyEngines({ctx, camera, enemy, x, y, width, height, angle, time}){
  const ports = getDeadlyEnginePorts(enemy?.kind);
  if(!ports || enemy?.moving === false || Math.hypot(Number(enemy?.vx || 0), Number(enemy?.vy || 0)) < 4) return;

  if(!Number.isFinite(enemy.__enginePhaseSeed)){
    enemy.__enginePhaseSeed = String(enemy.id || "").split("").reduce((sum, char)=>sum + char.charCodeAt(0), 0);
  }
  const phaseSeed = enemy.__enginePhaseSeed;
  const phase = Number(time || 0) / 72 + phaseSeed * .31;
  const pulse = .88 + Math.sin(phase) * .10;
  const plumeLength = Math.max(8, Math.min(20, Number(height || 72) * .17)) * pulse;
  const plumeWidth = Math.max(2, Math.min(6.5, Number(width || 72) * .052));

  ctx.save();
  ctx.translate(Math.round(Number(x || 0) - Number(camera?.x || 0)), Math.round(Number(y || 0) - Number(camera?.y || 0)));
  ctx.rotate(Number(angle || 0));
  ctx.globalCompositeOperation = "lighter";

  for(let index = 0; index < ports.length; index++){
    const port = ports[index];
    const px = port[0] * width;
    const py = port[1] * height;
    const flicker = 1 + Math.sin(phase * 1.31 + index * 2.17) * .08;
    const length = plumeLength * flicker;

    ctx.shadowColor = "rgba(37,99,235,.72)";
    ctx.shadowBlur = 7;
    ctx.fillStyle = "rgba(37,99,235,.34)";
    ctx.beginPath();
    ctx.moveTo(px - plumeWidth, py - 1);
    ctx.quadraticCurveTo(px - plumeWidth * .72, py + length * .52, px, py + length);
    ctx.quadraticCurveTo(px + plumeWidth * .72, py + length * .52, px + plumeWidth, py - 1);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = "rgba(125,211,252,.88)";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "rgba(125,211,252,.72)";
    ctx.beginPath();
    ctx.moveTo(px - plumeWidth * .38, py);
    ctx.quadraticCurveTo(px, py + length * .48, px, py + length * .72);
    ctx.quadraticCurveTo(px, py + length * .48, px + plumeWidth * .38, py);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(186,230,253,.78)";
    ctx.beginPath();
    ctx.ellipse(px, py, plumeWidth * .56, Math.max(1.2, plumeWidth * .28), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(148,163,184,.055)";
    ctx.beginPath();
    ctx.ellipse(px, py + length * 1.20, plumeWidth * 1.15, length * .25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
  }
  ctx.restore();
}
