const lightSprites = new WeakMap();

// Static lights share a small cached halo; no gradients or large buffers per frame.
export function getMapSceneryLightSprite(light){
  if(lightSprites.has(light)) return lightSprites.get(light);
  const buffer = document.createElement("canvas");
  buffer.width = buffer.height = 512;
  const ctx = buffer.getContext("2d");
  const colors = light.colors || {};
  const core = colors.core || "255,245,228";
  const hot = colors.hot || "255,211,172";
  const mid = colors.mid || "236,142,116";
  const haze = colors.haze || "175,74,89";
  const alpha = Number.isFinite(light.alpha) ? light.alpha : .4;
  const halo = ctx.createRadialGradient(256,256,0,256,256,256);
  halo.addColorStop(0, `rgba(${core},${alpha})`);
  halo.addColorStop(.055, `rgba(${hot},${alpha * .64})`);
  halo.addColorStop(.19, `rgba(${mid},${alpha * .32})`);
  halo.addColorStop(.5, `rgba(${haze},${alpha * .09})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0,0,512,512);
  if(light.point !== false){
    const point = ctx.createRadialGradient(256,256,0,256,256,4);
    point.addColorStop(0, `rgba(${core},.95)`);
    point.addColorStop(.35, `rgba(${hot},.7)`);
    point.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = point;
    ctx.fillRect(252,252,8,8);
  }
  lightSprites.set(light, buffer);
  return buffer;
}
