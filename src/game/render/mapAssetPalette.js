import { getMapAssetPalette } from "../../shared/firmHomeMapThemes.js";

// Rotate only the warm material colours. Neutral metal, white highlights,
// existing blue lights and every alpha value keep their original detail.
export function applyMapPalettePixels(pixels, hue, hueRange, geometry){
  const shift = hue / 60;
  const lower = hueRange?.[0] / 60, upper = hueRange?.[1] / 60;
  for(let i = 0; i < pixels.length; i += 4){
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if(!pixels[i + 3] || r <= g + 1 || r <= b + 1) continue;
    const min = Math.min(g, b), delta = r - min;
    const shifted = (g - b) / delta + shift;
    // Amber hardware lights stay gold/blue/emerald instead of drifting into
    // another firm's colour when the source texture contains orange highlights.
    const h = ((hueRange ? Math.max(lower, Math.min(upper, shifted)) : shifted) + 6) % 6;
    const x = delta * (1 - Math.abs(h % 2 - 1));
    const sector = Math.floor(h);
    pixels[i] = min + (sector === 0 || sector === 5 ? delta : sector === 1 || sector === 4 ? x : 0);
    pixels[i + 1] = min + (sector === 1 || sector === 2 ? delta : sector === 0 || sector === 3 ? x : 0);
    pixels[i + 2] = min + (sector === 3 || sector === 4 ? delta : sector === 2 || sector === 5 ? x : 0);
    if(geometry?.pocket){
      const {width,height,pocket} = geometry, pixel=i/4;
      const radius=Math.hypot(((pixel%width+.5)/width-pocket.x)/pocket.rx,
        ((Math.floor(pixel/width)+.5)/height-pocket.y)/pocket.ry);
      // Same ellipse as the approved violet emission. Preserve its underlying
      // warm light locally so cyan/green gas cannot turn the violet core blue.
      // There is no preserved source colour beyond the original pocket.
      const amount=radius<=.24 ? 1 : radius>=1 ? 0 : 1-(radius-.24)/.76;
      const weight=amount*amount*(3-2*amount);
      pixels[i]=pixels[i]*(1-weight)+r*weight;
      pixels[i+1]=pixels[i+1]*(1-weight)+g*weight;
      pixels[i+2]=pixels[i+2]*(1-weight)+b*weight;
    }
  }
  return pixels;
}

function createPaletteCanvas(width, height){
  if(typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  if(typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas;
}

// Called once when a themed image loads, never from the frame renderer. The
// prepared canvas lives in the existing bounded map cache and is evicted with it.
export function prepareMapPaletteImage(image, src, createCanvas = createPaletteCanvas){
  const theme = getMapAssetPalette(src);
  if(!theme || !image?.naturalWidth || !image.naturalHeight) return image;
  const width = image.naturalWidth, height = image.naturalHeight;
  try{
    const canvas = createCanvas(width, height);
    const ctx = canvas?.getContext("2d", {willReadFrequently:true});
    if(!ctx) return image;
    // A palette changes colour only. Building and decor orientations belong to
    // their source illustrations, independently of their positions on the map.
    ctx.drawImage(image, 0, 0);
    const frame = ctx.getImageData(0, 0, width, height);
    applyMapPalettePixels(frame.data, theme.hue, theme.hueRange,
      theme.sourcePocket ? {width,height,pocket:theme.sourcePocket} : undefined);
    ctx.putImageData(frame, 0, 0);
    // Existing world, hub and minimap renderers accept a CanvasImageSource and
    // use these image dimensions for readiness and atlas cropping.
    Object.assign(canvas, {complete:true, naturalWidth:width, naturalHeight:height});
    return canvas;
  }catch{
    return image;
  }
}
