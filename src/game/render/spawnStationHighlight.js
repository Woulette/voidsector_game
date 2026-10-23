const glowCache = new WeakMap();
const hoverFrames = new WeakMap();

function createSurface(ctx, width, height){
  const surface = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(width, height)
    : ctx.canvas.ownerDocument.createElement("canvas");
  surface.width = width;
  surface.height = height;
  return surface;
}

// Build the silhouette halo once per image/style, never blur the sprite each frame.
function getGlow(ctx, image, station){
  const width = Math.ceil(station.assetWidth), height = Math.ceil(station.assetHeight);
  const color = station.color || "153,213,222";
  const key = `${width}:${height}:${color}`;
  const cached = glowCache.get(image);
  if(cached?.key === key) return cached;
  const padding = 32;
  const mask = createSurface(ctx, width + padding * 2, height + padding * 2);
  const maskCtx = mask.getContext("2d");
  maskCtx.drawImage(image, padding, padding, width, height);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.fillStyle = `rgb(${color})`;
  maskCtx.fillRect(0, 0, mask.width, mask.height);
  const surface = createSurface(ctx, mask.width, mask.height);
  const glowCtx = surface.getContext("2d");
  glowCtx.shadowColor = `rgb(${color})`;
  glowCtx.shadowBlur = 20;
  glowCtx.globalAlpha = .55;
  glowCtx.drawImage(mask, 0, 0);
  glowCtx.shadowBlur = 6;
  glowCtx.globalAlpha = .85;
  glowCtx.drawImage(mask, 0, 0);
  const result = {key, surface, padding};
  glowCache.set(image, result);
  return result;
}

export function beginSpawnStationHighlight({ctx, cache, station, now}){
  if(!station){
    hoverFrames.delete(ctx);
    return 0;
  }
  let frame = hoverFrames.get(ctx);
  if(frame?.station !== station){
    frame = {station, since:now};
    hoverFrames.set(ctx, frame);
  }
  const alpha = Math.min(1, Math.max(0, (now - frame.since) / 140));
  const image = cache?.[station.asset];
  if(!image?.complete || !image.naturalWidth) return 0;
  const {surface, padding} = getGlow(ctx, image, station);
  ctx.save();
  ctx.globalAlpha = alpha * .85;
  ctx.drawImage(surface, station.x - station.assetWidth / 2 - padding,
    station.y - station.assetHeight / 2 - padding);
  ctx.restore();
  return alpha;
}

export function drawSpawnStationHoverLabel({ctx, station, alpha, camera}){
  if(!station || alpha <= 0) return;
  const zoom = camera?.zoom || 1;
  const color = station.color || "153,213,222";
  // Keep type readable at every game zoom; the anchor stays above the building.
  let x = station.x, y = station.y - station.assetHeight / 2 - 32 / zoom;
  ctx.save();
  ctx.font = "600 15px Rajdhani, Arial";
  const width = ctx.measureText(station.title).width + 38;
  if(camera){
    const viewWidth = ctx.canvas.__renderWidth || ctx.canvas.clientWidth / zoom;
    x = Math.max(camera.x + (width / 2 + 12) / zoom,
      Math.min(x, camera.x + viewWidth - (width / 2 + 12) / zoom));
    y = Math.max(y, camera.y + 38 / zoom);
  }
  ctx.translate(x, y + (1 - alpha) * 4 / zoom);
  ctx.scale(1 / zoom, 1 / zoom);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(4,11,18,.94)";
  ctx.strokeStyle = `rgba(${color},.65)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -23, width, 46, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgb(${color})`;
  ctx.fillRect(-width / 2 + 12, -23, width - 24, 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0f5f8";
  ctx.fillText(station.title, 0, -6);
  ctx.font = "500 11px Rajdhani, Arial";
  ctx.fillStyle = `rgb(${color})`;
  ctx.fillText("Cliquer pour ouvrir", 0, 11);
  ctx.restore();
}
