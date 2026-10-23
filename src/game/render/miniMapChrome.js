import { getMiniMapLayout } from "../systems/miniMapLayout.js?v=20261023-minimap4";
import { getFirmBadgeAsset, getFirmDefinition, getFirmIdFromMapName } from "../../data/firms.js";

function cutRect(ctx, x, y, w, h, cut = 8){
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut); ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h); ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut); ctx.lineTo(x, y + cut); ctx.closePath();
}

function diamond(ctx, x, y, radius){
  ctx.beginPath();
  ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y);
  ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath();
}

export function drawMiniMapFrame({ctx, rect, currentMap, player, cache}){
  const {x, y, w, h} = rect;
  const layout = getMiniMapLayout(rect);
  ctx.save();
  const panel = ctx.createLinearGradient(x, y, x + w * .7, y + h);
  panel.addColorStop(0, "#102330"); panel.addColorStop(.5, "#08141e"); panel.addColorStop(1, "#050e16");
  cutRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = panel; ctx.fill();
  ctx.strokeStyle = "#355666"; ctx.lineWidth = 1; ctx.stroke();
  cutRect(ctx, x + 3, y + 3, w - 6, h - 6, 8);
  ctx.strokeStyle = "rgba(130,200,218,.10)"; ctx.stroke();
  // A small cyan edge ties the console to the rest of the Avosoma HUD.
  ctx.strokeStyle = "#66d9ec"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 12, y + .5); ctx.lineTo(x + 83, y + .5); ctx.stroke();
  const firm = getFirmIdFromMapName(currentMap.name) || currentMap.firm;
  const planet = firm && cache?.[getFirmBadgeAsset(firm)];
  if(planet?.complete && planet.naturalWidth > 0){
    ctx.drawImage(planet, x + 7, y + 7, 32, 32);
  }else{
    const sphere = ctx.createRadialGradient(x + 19, y + 18, 1, x + 23, y + 23, 12);
    sphere.addColorStop(0, "#eefaff"); sphere.addColorStop(.4, firm ? getFirmDefinition(firm).color : "#889ca9");
    sphere.addColorStop(1, "#0b1520");
    ctx.fillStyle = sphere; ctx.strokeStyle = "#b2ccd3"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 23, y + 23, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#7d9dab"; ctx.font = "600 9px Rajdhani, Arial";
  ctx.fillText("CARTE DU SECTEUR", x + 40, y + 17, Math.max(40, w - 120));
  ctx.fillStyle = "#e4f7fa"; ctx.font = "700 15px Rajdhani, Arial";
  ctx.fillText(String(currentMap.displayName || currentMap.name).toUpperCase(), x + 40, y + 33, Math.max(40, w - 120));
  for(const [symbol, box] of [["−", layout.minus], ["+", layout.plus]]){
    cutRect(ctx, box.x, box.y, box.w, box.h, 3);
    ctx.fillStyle = "#102633"; ctx.fill(); ctx.strokeStyle = "#355969"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#b9e6ee"; ctx.font = "500 17px Arial"; ctx.textAlign = "center";
    ctx.fillText(symbol, box.x + box.w / 2, box.y + 16);
  }
  const footerY = layout.footer.y + 19;
  ctx.textAlign = "left"; ctx.font = "600 10px Rajdhani, Arial"; ctx.fillStyle = "#7fadb9";
  ctx.fillText("X", x + 15, footerY); ctx.fillText("Y", x + w / 2 + 7, footerY);
  ctx.font = "11px Consolas, monospace"; ctx.fillStyle = "#d3eaf0";
  ctx.fillText(String(Math.round(Number(player.x || 0) / 10)), x + 30, footerY);
  ctx.fillText(String(Math.round(Number(player.y || 0) / 10)), x + w / 2 + 22, footerY);
  ctx.strokeStyle = "#25414e";
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 4, footerY - 9); ctx.lineTo(x + w / 2 - 4, footerY + 2); ctx.stroke();
  // The grip is decorative; the whole header keeps its existing drag action.
  ctx.fillStyle = "#2e4c5b";
  for(let i = 0; i < 3; i++) ctx.fillRect(x + w - 20 + i * 3, y + h - 9, 1, 3 + i * 2);
  ctx.restore();
  return layout.content;
}

export function drawMiniMapBorder({ctx, rect}){
  const {x, y, w, h} = rect;
  ctx.save(); ctx.lineWidth = 1;
  ctx.strokeStyle = "#030a10"; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.strokeStyle = "#355261"; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.strokeStyle = "#7aa9b8"; ctx.beginPath();
  for(const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]){
    ctx.moveTo(px, py + dy * 8); ctx.lineTo(px, py); ctx.lineTo(px + dx * 8, py);
  }
  ctx.stroke(); ctx.restore();
}

export function drawMiniMapService({ctx, x, y, kind}){
  ctx.save(); diamond(ctx, x, y, 7);
  ctx.fillStyle = "#09131b"; ctx.strokeStyle = kind === "quests" ? "#f1d28f" : "#a6cdd5";
  ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle; ctx.font = "800 9px Rajdhani, Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(kind === "quests" ? "!" : "C", x, y + .5); ctx.restore();
}

export function drawMiniMapHome({ctx, x, y}){
  ctx.save(); ctx.strokeStyle = "#73ceb6"; ctx.fillStyle = "#0a2527"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x + 6, y + 5);
  ctx.lineTo(x - 6, y + 5); ctx.lineTo(x - 6, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c6f3df"; ctx.fillRect(x - 1, y - 2, 2, 5); ctx.restore();
}

export function drawMiniMapPortal({ctx, x, y}){
  ctx.save(); ctx.fillStyle = "#170f2b"; ctx.strokeStyle = "#c5a0f4"; ctx.lineWidth = 1.4;
  diamond(ctx, x, y, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#ae78ed"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

export function drawMiniMapPilot({ctx, x, y, angle = 0}){
  ctx.save(); ctx.translate(x, y); ctx.rotate(Number(angle) || 0);
  ctx.strokeStyle = "rgba(153,234,255,.65)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-10, 0); ctx.moveTo(10, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.fillStyle = "#71e5ff"; ctx.strokeStyle = "#e2fbff"; ctx.lineWidth = 1.2;
  ctx.shadowColor = "#159dcd"; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 4); ctx.lineTo(0, 2); ctx.lineTo(-4, 4); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
}

export function drawMiniMapRoute({ctx, fromX, fromY, toX, toY}){
  ctx.save(); ctx.strokeStyle = "rgba(241,206,130,.8)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#f1ce82"; ctx.fillStyle = "#f1ce82";
  ctx.beginPath(); ctx.arc(toX, toY, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillRect(toX - 1, toY - 1, 2, 2); ctx.restore();
}
