export function drawPortalTransitionOverlay({ctx, transition, maps, viewW, viewH}){
  if(!transition) return;
  const t = Math.max(0, Math.min(1, transition.elapsed / transition.duration));
  const now = performance.now();
  const pulse = .5 + Math.sin(now / 95) * .5;
  const cx = viewW / 2;
  const cy = viewH / 2;
  const radius = Math.max(viewW, viewH) * (.18 + t * .62);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  wash.addColorStop(0, `rgba(219,244,255,${.12 + t * .36})`);
  wash.addColorStop(.24, `rgba(125,211,252,${.08 + t * .22})`);
  wash.addColorStop(.62, `rgba(59,130,246,${.04 + t * .12})`);
  wash.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.translate(cx, cy);
  ctx.scale(1.35 + t * .65, .72 + t * .38);
  ctx.lineWidth = 3 + t * 8;
  ctx.strokeStyle = `rgba(226,245,255,${.45 + pulse * .25})`;
  ctx.shadowColor = "rgba(125,211,252,.9)";
  ctx.shadowBlur = 22 + t * 34;
  for(let i = 0; i < 3; i++){
    ctx.rotate((now / (900 + i * 240)) * (i % 2 ? -1 : 1));
    ctx.beginPath();
    ctx.arc(0, 0, 70 + i * 34 + t * 190, i * .7, Math.PI * 1.65 + i * .7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0, t - .62) * 1.4})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = `rgba(226,245,255,${.62 + pulse * .24})`;
  ctx.font = "800 20px Rajdhani, Arial";
  ctx.textAlign = "center";
  const target = maps.find(map=>map.id === transition.portal.targetMap);
  ctx.fillText(`TRANSFERT VERS ${target?.name || "SECTEUR"} · ${Math.ceil(transition.duration - transition.elapsed)}S`, cx, viewH * .78);
  ctx.restore();
}
