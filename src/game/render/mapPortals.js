function drawPortalVisual({ctx, portal, now}){
  const safeR = portal.safeRadius || Math.max(180, (portal.r || 90) * 2.2);
  const pulse = .92 + Math.sin(now / 430) * .08;

  const field = ctx.createRadialGradient(portal.x, portal.y, 10, portal.x, portal.y, safeR);
  field.addColorStop(0, "rgba(147,197,253,.20)");
  field.addColorStop(.36, "rgba(56,189,248,.10)");
  field.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, safeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.scale(.78, 1.12);

  const coreR = (portal.r || 95) * 1.02;
  const voidGrad = ctx.createRadialGradient(0, 0, coreR * .10, 0, 0, coreR * 1.04);
  voidGrad.addColorStop(0, "rgba(1,8,20,.96)");
  voidGrad.addColorStop(.58, "rgba(4,17,38,.88)");
  voidGrad.addColorStop(1, "rgba(15,23,42,.12)");
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();

  for(let layer = 0; layer < 2; layer++){
    const radius = coreR * (1.06 + layer * .14) * pulse;
    const offset = now / (layer ? -900 : 740);
    const segments = layer ? 22 : 28;
    ctx.lineWidth = layer ? 5 : 7;
    ctx.strokeStyle = layer ? "rgba(125,211,252,.46)" : "rgba(191,219,254,.78)";
    ctx.shadowColor = layer ? "rgba(56,189,248,.52)" : "rgba(147,197,253,.85)";
    ctx.shadowBlur = layer ? 14 : 24;
    for(let i = 0; i < segments; i += 2){
      const a0 = offset + i / segments * Math.PI * 2;
      const a1 = offset + (i + .95) / segments * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, a0, a1);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(71,85,105,.92)";
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 1.34, 0, Math.PI * 2);
  ctx.stroke();

  const shardCount = 34;
  ctx.lineWidth = 3;
  for(let i = 0; i < shardCount; i++){
    const a = i / shardCount * Math.PI * 2 + Math.sin(now / 1700 + i) * .04;
    const outer = coreR * (1.36 + (i % 4) * .035);
    const inner = coreR * (1.10 + (i % 5) * .025);
    ctx.strokeStyle = i % 3 ? "rgba(56,189,248,.52)" : "rgba(203,213,225,.54)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(191,219,254,.94)";
  for(let i = 0; i < 18; i++){
    const a = i * 2.399 + now / 1800;
    const d = coreR * (.18 + ((i * 37) % 100) / 100 * .62);
    const s = 1.2 + (i % 4) * .45;
    ctx.globalAlpha = .38 + (i % 5) * .10;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a * 1.18) * d, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if(portal.damaged){
    ctx.globalCompositeOperation = "source-over";
    ctx.rotate(-.34);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(248,113,113,.88)";
    ctx.shadowColor = "rgba(239,68,68,.75)";
    ctx.shadowBlur = 18;
    for(let i = 0; i < 4; i++){
      const y = coreR * (-.56 + i * .34);
      ctx.beginPath();
      ctx.moveTo(-coreR * .92, y);
      ctx.lineTo(-coreR * .35, y + 16);
      ctx.lineTo(coreR * .06, y - 10);
      ctx.lineTo(coreR * .78, y + 12);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.rotate(.34);
    ctx.fillStyle = "rgba(248,113,113,.94)";
    for(let i = 0; i < 7; i++){
      const a = now / 380 + i * 1.71;
      const d = coreR * (1.06 + (i % 3) * .16);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a * 1.12) * d, 3 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawMapPortals({ctx, currentMap, getMapPortals}){
  const now = performance.now();
  for(const portal of getMapPortals(currentMap)){
    const safeR = portal.safeRadius || Math.max(180, (portal.r || 90) * 2.2);
    drawPortalVisual({ctx, portal, now});
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "700 16px Rajdhani, Arial";
    if(portal.closed){
      ctx.fillText(portal.label || "PORTAIL FERME", portal.x - 78, portal.y - safeR - 16);
      continue;
    }
    ctx.fillText(`${portal.label} · APPUIE J`, portal.x - 92, portal.y - safeR - 16);
  }
}
