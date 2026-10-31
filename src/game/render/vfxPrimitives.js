export const clamp = (value, min = 0, max = 1)=>Math.max(min, Math.min(max, value));
export const mix = (a, b, t)=>a + (b - a) * t;
export const smooth = t=>{t = clamp(t); return t * t * (3 - 2 * t);};
export const rgba = (rgb, alpha = 1)=>`rgba(${rgb},${clamp(alpha)})`;

export function alpha(color, amount){
  return color.startsWith("rgba(") ? color.replace(/,[\d.]+\)$/, `,${clamp(amount)})`) : color;
}

export function glow(ctx, x, y, radius, color, opacity = 1){
  if(radius <= 0 || opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(opacity);
  const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
  fill.addColorStop(0, alpha(color, .65));
  fill.addColorStop(.3, alpha(color, .25));
  fill.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = fill;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

export function line(ctx, points, color, width, opacity = 1){
  if(points.length < 2) return;
  ctx.save();
  ctx.globalAlpha *= clamp(opacity);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], index)=>index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  ctx.restore();
}

export function shard(ctx, x, y, size, angle, color){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * .36, -size * .38);
  ctx.lineTo(-size * .8, 0);
  ctx.lineTo(-size * .36, size * .38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function sprite(ctx, image, x, y, width, height, angle = 0, sx = 1, sy = 1){
  if(!image?.complete || !image.naturalWidth) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(sx, sy);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

