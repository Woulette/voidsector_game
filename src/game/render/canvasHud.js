export function drawDamageTexts({ctx, camera, damageTexts}){
  ctx.save();
  ctx.font = "900 18px Rajdhani, Arial";
  ctx.textAlign = "center";
  for(const t of damageTexts){
    const a = Math.max(0,t.life/t.max);
    ctx.fillStyle = t.color ? `${t.color}${a})` : `rgba(255,230,140,${a})`;
    ctx.shadowColor = t.shadowColor || (t.color ? "rgba(248,113,113,.8)" : "rgba(250,204,21,.8)");
    ctx.shadowBlur = 10;
    const label = typeof t.value === "string" ? t.value : `-${t.value}`;
    ctx.fillText(label, t.x-camera.x, t.y-camera.y);
  }
  ctx.restore();
}

export function drawMiniMap({ctx, currentMap, player, enemies, rect, moveTarget}){
  const {x, y, w, h} = rect;
  const headerH = 22;
  const sx = w/currentMap.width, sy = h/currentMap.height;
  const mapX = wx => x + (wx + currentMap.width/2)*sx;
  const mapY = wy => y + headerH + (wy + currentMap.height/2)*((h - headerH)/currentMap.height);
  ctx.save();
  ctx.fillStyle = "rgba(3,12,24,.86)";
  ctx.strokeStyle = "rgba(56,189,248,.36)";
  ctx.lineWidth = 1;
  ctx.fillRect(x,y,w,h);
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = "rgba(7,24,42,.88)";
  ctx.fillRect(x, y, w, headerH);
  ctx.fillStyle = "#8ee7ff";
  ctx.font = "700 11px Rajdhani, Arial";
  ctx.fillText(currentMap.name, x+9, y+15);
  const minus = {x:x+w-42, y:y+4, w:16, h:14};
  const plus = {x:x+w-22, y:y+4, w:16, h:14};
  for(const [label, box] of [["-", minus], ["+", plus]]){
    ctx.strokeStyle = "rgba(56,189,248,.42)";
    ctx.fillStyle = "rgba(2,10,19,.78)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = "#dff6ff";
    ctx.font = "900 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, box.x + box.w / 2, box.y + 10);
  }
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(56,189,248,.16)";
  for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+i*w/4,y+headerH); ctx.lineTo(x+i*w/4,y+h); ctx.stroke(); }
  for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(x,y+headerH+i*(h-headerH)/3); ctx.lineTo(x+w,y+headerH+i*(h-headerH)/3); ctx.stroke(); }

  ctx.fillStyle = "rgba(86,255,79,.55)";
  ctx.beginPath(); ctx.arc(mapX(currentMap.spawn.x),mapY(currentMap.spawn.y),5,0,Math.PI*2); ctx.fill();
  if(currentMap.portal){
    ctx.fillStyle = "rgba(168,85,247,.95)";
    ctx.beginPath(); ctx.arc(mapX(currentMap.portal.x),mapY(currentMap.portal.y),5,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(56,189,248,.25)";
  ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),Math.max(5,player.radar*sx),0,Math.PI*2); ctx.stroke();
  if(moveTarget){
    ctx.strokeStyle = "rgba(250,204,21,.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5,4]);
    ctx.beginPath();
    ctx.moveTo(mapX(player.x), mapY(player.y));
    ctx.lineTo(mapX(moveTarget.x), mapY(moveTarget.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(250,204,21,.95)";
    ctx.beginPath(); ctx.arc(mapX(moveTarget.x), mapY(moveTarget.y),4,0,Math.PI*2); ctx.fill();
  }
  for(const e of enemies){
    if(Math.hypot(e.x-player.x,e.y-player.y) > player.radar) continue;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(mapX(e.x)-2,mapY(e.y)-2,4,4);
  }
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
