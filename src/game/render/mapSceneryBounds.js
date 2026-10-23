// Apply to the apparent world footprint after parallax, rather than its distant anchor.
export function getMapSceneryEdgeOpacity({map, x, y, width = 0, height = 0, rotation = 0}){
  const fade = map?.parallaxScene?.edgeFadeDistance;
  if(!(fade > 0)) return 1;
  const cosine = Math.abs(Math.cos(rotation)), sine = Math.abs(Math.sin(rotation));
  const halfWidth = (width * cosine + height * sine) / 2;
  const halfHeight = (height * cosine + width * sine) / 2;
  const clearance = Math.min(map.width / 2 - Math.abs(x) - halfWidth,
    map.height / 2 - Math.abs(y) - halfHeight);
  const t = Math.max(0, Math.min(1, clearance / fade));
  return t * t * (3 - 2 * t);
}

export function getVisibleMapSceneryRect({map, camera, width, height}){
  const left = Math.max(0, -map.width / 2 - camera.x);
  const top = Math.max(0, -map.height / 2 - camera.y);
  const right = Math.min(width, map.width / 2 - camera.x);
  const bottom = Math.min(height, map.height / 2 - camera.y);
  if(right <= left || bottom <= top) return null;
  return {x:left, y:top, width:right - left, height:bottom - top};
}

export function beginMapSceneryClip({ctx, map, camera, width, height}){
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  const visible = getVisibleMapSceneryRect({map, camera, width, height});
  if(!visible || visible.x > 0 || visible.y > 0 || visible.width < width || visible.height < height){
    ctx.fillStyle = map.parallaxScene?.outsideColor || "#000000";
    ctx.fillRect(0, 0, width, height);
  }
  if(!visible) return false;
  ctx.beginPath();
  ctx.rect(visible.x, visible.y, visible.width, visible.height);
  ctx.clip();
  return true;
}

export function drawMapSceneryBoundary({ctx, map, camera}){
  if(map.parallaxScene?.showBoundary === false) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = map.parallaxScene?.boundaryColor || "rgba(248,113,113,.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-map.width / 2 - camera.x, -map.height / 2 - camera.y, map.width, map.height);
  ctx.restore();
}
