// Only the distant sky fades here. Planets and other depth layers draw afterwards.
export function getMapScenerySkyFadeBands({map, camera, width, height}){
  const fade = map?.parallaxScene?.skyFade;
  if(!(fade?.inside > 0)) return [];
  const inside = fade.inside, outside = Math.max(0, fade.outside || 0);
  const bands = [];
  const add = (axis, start, end, reversed)=>{
    const extent = axis === "x" ? width : height;
    const low = reversed ? 0 : Math.max(0, start);
    const high = reversed ? Math.min(extent, start) : extent;
    if(high <= low) return;
    bands.push({axis, start, end,
      x:axis === "x" ? low : 0, y:axis === "y" ? low : 0,
      width:axis === "x" ? high - low : width,
      height:axis === "y" ? high - low : height,
      solid:reversed ? end >= extent : end <= 0});
  };
  add("x", -map.width / 2 + inside - camera.x, -map.width / 2 - outside - camera.x, true);
  add("x", map.width / 2 - inside - camera.x, map.width / 2 + outside - camera.x, false);
  add("y", -map.height / 2 + inside - camera.y, -map.height / 2 - outside - camera.y, true);
  add("y", map.height / 2 - inside - camera.y, map.height / 2 + outside - camera.y, false);
  return bands;
}

export function drawMapScenerySkyFade({ctx, map, camera, width, height}){
  const bands = getMapScenerySkyFadeBands({map, camera, width, height});
  if(!bands.length) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  for(const band of bands){
    if(band.solid){
      ctx.fillStyle = "#000000";
    }else{
      const horizontal = band.axis === "x";
      const gradient = ctx.createLinearGradient(horizontal ? band.start : 0, horizontal ? 0 : band.start,
        horizontal ? band.end : 0, horizontal ? 0 : band.end);
      for(let step = 0; step <= 8; step++){
        const t = step / 8;
        gradient.addColorStop(t, `rgba(0,0,0,${t * t * (3 - 2 * t)})`);
      }
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(band.x, band.y, band.width, band.height);
  }
  ctx.restore();
}
