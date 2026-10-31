import { drawShieldSurface } from "./shieldSurfaces.js";
import { clamp, glow, line } from "./vfxPrimitives.js";

export function getEnemyImpactCenter(effect){
  return {x:Number(effect.target?.x ?? effect.centerX), y:Number(effect.target?.y ?? effect.centerY)};
}

export function drawEnemyWeaponImpact(ctx, effect, {showFlash = true, sparkCount = 5} = {}){
  if(effect.delay > 0 || effect.life <= 0 || effect.life > effect.max) return 0;
  if(effect.surface === "shield" && Number(effect.target?.hp) <= 0) return 0;
  const p = clamp(1 - effect.life / effect.max), fade = (1 - p) ** 1.6;
  const center = getEnemyImpactCenter(effect);
  const r = effect.radius, angle = effect.angle;
  const x = center.x + Math.cos(angle) * r, y = center.y + Math.sin(angle) * r;
  const shield = effect.surface === "shield";
  const color = shield ? "rgba(85,195,255,1)" : effect.monochrome ? "rgba(255,255,255,1)" : effect.color || "rgba(255,187,95,1)";
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if(showFlash && shield){
    drawShieldSurface(ctx,{...center,radius:r,angle,progress:p,style:"membrane"});
  }else if(showFlash){
    glow(ctx, x, y, 12 + p * 8, color, fade * .9);
    glow(ctx, x, y, 4 + (1-p) * 3, "rgba(245,253,255,1)", fade);
  }
  const count = Math.min(5, Math.max(0, sparkCount));
  for(let i=0; i<count; i++){
    const a = angle + (i - 2) * .52;
    const d = p * (11 + i % 3 * 6);
    const sx = x + Math.cos(a)*d, sy = y + Math.sin(a)*d;
    line(ctx, [[sx,sy],[sx + Math.cos(a)*5*fade,sy + Math.sin(a)*5*fade]], color, 1.1, fade);
  }
  ctx.restore();
  return count;
}
