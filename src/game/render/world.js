import { getClosedMapPortals as getDefaultClosedMapPortals, getMapPortals as getDefaultMapPortals } from "../combatData.js";
import { drawMapPortals } from "./mapPortals.js";
import { ships } from "../../data/catalog.js";

function viewWidth(canvas){ return canvas.__renderWidth || canvas.__viewWidth || canvas.clientWidth || canvas.width; }
function viewHeight(canvas){ return canvas.__renderHeight || canvas.__viewHeight || canvas.clientHeight || canvas.height; }
const parallaxAsteroidCache = new Map();
const parallaxDustSpeckCache = new Map();
const asteroidSpriteCache = new Map();
const parallaxCloudSpriteCache = new Map();
let vignetteCache = null;

function getTilePath(tileMap, col, row){
  const prefix = tileMap.prefix || "tile";
  const ext = tileMap.ext || "webp";
  return `${tileMap.path}/${prefix}_${col}_${row}.${ext}`;
}

function drawMapImage({ctx, cache, currentMap, camera}){
  const bgImg = currentMap?.bg ? cache[currentMap.bg] : null;
  if(!bgImg || !bgImg.complete || !bgImg.naturalWidth) return false;
  const worldX = -currentMap.width/2;
  const worldY = -currentMap.height/2;
  ctx.save();
  ctx.globalAlpha = Number.isFinite(currentMap.bgAlpha) ? currentMap.bgAlpha : .7;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bgImg, worldX - camera.x, worldY - camera.y, currentMap.width, currentMap.height);
  ctx.restore();
  return true;
}

function getVisibleTileWindow({canvas, currentMap, camera}){
  const tileMap = currentMap?.tileMap;
  if(!tileMap) return null;
  const screenW = viewWidth(canvas);
  const screenH = viewHeight(canvas);
  const tileSize = tileMap.tileSize || 1024;
  const sourceW = tileMap.sourceWidth || tileSize * tileMap.cols;
  const sourceH = tileMap.sourceHeight || tileSize * tileMap.rows;
  const mapLeft = -currentMap.width / 2;
  const mapTop = -currentMap.height / 2;
  const sourcePerWorldX = sourceW / currentMap.width;
  const sourcePerWorldY = sourceH / currentMap.height;
  const startCol = Math.max(0, Math.floor((camera.x - mapLeft) * sourcePerWorldX / tileSize) - 1);
  const endCol = Math.min(tileMap.cols - 1, Math.floor((camera.x + screenW - mapLeft) * sourcePerWorldX / tileSize) + 1);
  const startRow = Math.max(0, Math.floor((camera.y - mapTop) * sourcePerWorldY / tileSize) - 1);
  const endRow = Math.min(tileMap.rows - 1, Math.floor((camera.y + screenH - mapTop) * sourcePerWorldY / tileSize) + 1);
  return {tileMap, tileSize, sourceW, sourceH, mapLeft, mapTop, startCol, endCol, startRow, endRow};
}

function areVisibleTilesReady({canvas, cache, currentMap, camera}){
  const view = getVisibleTileWindow({canvas, currentMap, camera});
  if(!view) return false;
  for(let row = view.startRow; row <= view.endRow; row++){
    for(let col = view.startCol; col <= view.endCol; col++){
      const img = cache[getTilePath(view.tileMap, col, row)];
      if(!img || !img.complete || !img.naturalWidth) return false;
    }
  }
  return true;
}

function drawTileBackground({ctx, canvas, cache, currentMap, camera, alphaOverride}){
  const view = getVisibleTileWindow({canvas, currentMap, camera});
  if(!view) return {drawn:false, complete:false};
  const {tileMap, tileSize, sourceW, sourceH, mapLeft, mapTop, startCol, endCol, startRow, endRow} = view;
  let drawn = 0;
  let expected = 0;

  ctx.save();
  ctx.globalAlpha = Number.isFinite(alphaOverride) ? alphaOverride : (Number.isFinite(tileMap.alpha) ? tileMap.alpha : 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for(let row = startRow; row <= endRow; row++){
    for(let col = startCol; col <= endCol; col++){
      expected++;
      const img = cache[getTilePath(tileMap, col, row)];
      if(!img || !img.complete || !img.naturalWidth) continue;
      const tilePixelW = Math.min(tileSize, sourceW - col * tileSize);
      const tilePixelH = Math.min(tileSize, sourceH - row * tileSize);
      const worldX = mapLeft + (col * tileSize / sourceW) * currentMap.width;
      const worldY = mapTop + (row * tileSize / sourceH) * currentMap.height;
      const worldW = tilePixelW / sourceW * currentMap.width;
      const worldH = tilePixelH / sourceH * currentMap.height;
      ctx.drawImage(img, 0, 0, tilePixelW, tilePixelH, worldX - camera.x, worldY - camera.y, worldW, worldH);
      drawn++;
    }
  }
  ctx.restore();
  return {drawn:drawn > 0, complete:expected > 0 && drawn === expected};
}

function wrappedParallaxPoint(value, cameraValue, parallax, span, center){
  let next = (value - cameraValue * parallax) % span;
  if(next < -span / 2) next += span;
  if(next > span / 2) next -= span;
  return next + center;
}

function drawParallaxStars({ctx, canvas, camera, stars, dust}){
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,255,255,.22)";
  const farSpan = 220;
  const farOffsetX = ((-camera.x * .018) % farSpan + farSpan) % farSpan;
  const farOffsetY = ((-camera.y * .018) % farSpan + farSpan) % farSpan;
  for(let y = -farSpan + farOffsetY; y < h + farSpan; y += farSpan){
    for(let x = -farSpan + farOffsetX; x < w + farSpan; x += farSpan){
      const jitter = Math.sin((x * 12.9898 + y * 78.233) * .001) * 43758.5453;
      const fx = x + (jitter - Math.floor(jitter)) * 128;
      const fy = y + ((jitter * 1.37) - Math.floor(jitter * 1.37)) * 128;
      ctx.globalAlpha = .18 + ((jitter * 2.11) - Math.floor(jitter * 2.11)) * .18;
      ctx.fillRect(fx, fy, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  for(const s of stars){
    const p = Math.max(.012, Math.min(.18, (s.p || .4) * .16));
    const span = 7200;
    const sx = wrappedParallaxPoint(s.x, camera.x, p, span, w / 2);
    const sy = wrappedParallaxPoint(s.y, camera.y, p, span, h / 2);
    if(sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    const size = Math.max(.45, s.s * (p > .08 ? 1.15 : .72));
    ctx.fillStyle = `rgba(226,242,255,${Math.min(.9, s.a * (p > .08 ? .92 : .62))})`;
    if(size <= 1.35){
      ctx.fillRect(sx, sy, Math.max(1, size), Math.max(1, size));
    }else{
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    if(size > 1.9 && s.a > .55){
      ctx.strokeStyle = `rgba(125,211,252,${s.a * .16})`;
      ctx.beginPath();
      ctx.moveTo(sx - size * 3.2, sy);
      ctx.lineTo(sx + size * 3.2, sy);
      ctx.moveTo(sx, sy - size * 3.2);
      ctx.lineTo(sx, sy + size * 3.2);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(125,211,252,.075)";
  for(const d of dust){
    const p = Math.max(.12, Math.min(.32, d.p * .28));
    const sx = wrappedParallaxPoint(d.x, camera.x, p, 7600, w / 2);
    const sy = wrappedParallaxPoint(d.y, camera.y, p, 7600, h / 2);
    if(sx < -120 || sx > w + 120 || sy < -120 || sy > h + 120) continue;
    ctx.globalAlpha = d.a * .55;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + d.len * .72, sy + d.len * .12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawParallaxNebulae({ctx, canvas, currentMap, camera}){
  const scene = currentMap?.parallaxScene;
  if(!scene?.nebulae?.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for(const n of scene.nebulae){
    const p = Number.isFinite(n.p) ? n.p : .08;
    const sx = n.x - camera.x * p + w / 2;
    const sy = n.y - camera.y * p + h / 2;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.r);
    g.addColorStop(0, n.color || "rgba(56,189,248,.2)");
    g.addColorStop(.42, n.mid || "rgba(59,130,246,.08)");
    g.addColorStop(1, n.edge || "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawCenteredLayerImage({ctx, img, layer, sx, sy, width, height}){
  ctx.save();
  ctx.translate(sx, sy);
  if(layer.rotation) ctx.rotate(layer.rotation);
  ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawParallaxBackdrops({ctx, canvas, cache, currentMap, camera}){
  const layers = currentMap?.parallaxScene?.backdrops || [];
  if(!layers.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for(const layer of layers){
    const img = cache[layer.src];
    if(!img || !img.complete || !img.naturalWidth) continue;
    const p = Number.isFinite(layer.p) ? layer.p : .04;
    const width = layer.w || img.naturalWidth;
    const height = layer.h || img.naturalHeight;
    const sx = (layer.x || 0) - camera.x * p + w / 2;
    const sy = (layer.y || 0) - camera.y * p + h / 2;
    if(sx + width / 2 < -160 || sx - width / 2 > w + 160 || sy + height / 2 < -160 || sy - height / 2 > h + 160) continue;
    ctx.globalAlpha = Number.isFinite(layer.alpha) ? layer.alpha : 1;
    ctx.filter = layer.filter || "none";
    ctx.globalCompositeOperation = layer.blend || "source-over";
    drawCenteredLayerImage({ctx, img, layer, sx, sy, width, height});
    ctx.filter = "none";
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawParallaxImages({ctx, canvas, cache, currentMap, camera}){
  const layers = currentMap?.parallaxScene?.images || [];
  if(!layers.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  for(const layer of layers){
    const img = cache[layer.src];
    if(!img || !img.complete || !img.naturalWidth) continue;
    const p = Number.isFinite(layer.p) ? layer.p : .35;
    const width = layer.w || img.naturalWidth;
    const height = layer.h || img.naturalHeight;
    const sx = layer.x - camera.x * p + w / 2;
    const sy = layer.y - camera.y * p + h / 2;
    if(sx + width / 2 < -120 || sx - width / 2 > w + 120 || sy + height / 2 < -120 || sy - height / 2 > h + 120) continue;
    ctx.globalAlpha = Number.isFinite(layer.alpha) ? layer.alpha : 1;
    ctx.filter = layer.filter || "none";
    if(layer.blend) ctx.globalCompositeOperation = layer.blend;
    else ctx.globalCompositeOperation = "source-over";
    drawCenteredLayerImage({ctx, img, layer, sx, sy, width, height});
    ctx.filter = "none";
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function getParallaxDustSpecks(currentMap){
  const scene = currentMap?.parallaxScene;
  if(!scene?.dustSpecks?.length) return [];
  const key = currentMap.id || currentMap.name || "map";
  if(parallaxDustSpeckCache.has(key)) return parallaxDustSpeckCache.get(key);
  const specks = [];
  scene.dustSpecks.forEach((field, fieldIndex)=>{
    const rnd = seededValue(26000 + fieldIndex * 701 + (currentMap.id || 0) * 131);
    const count = field.count || 120;
    const colors = field.colors || [
      "255,222,128",
      "159,220,255",
      "255,255,255"
    ];
    for(let i = 0; i < count; i++){
      const color = colors[Math.floor(rnd() * colors.length)] || colors[0];
      specks.push({
        x:(field.x || 0) + (rnd() - .5) * (field.w || currentMap.width),
        y:(field.y || 0) + (rnd() - .5) * (field.h || currentMap.height),
        p:Number.isFinite(field.p) ? field.p : .24,
        r:(field.sizeMin || .55) + rnd() * ((field.sizeMax || 1.45) - (field.sizeMin || .55)),
        a:(field.alphaMin || .10) + rnd() * ((field.alphaMax || .34) - (field.alphaMin || .10)),
        wrap:!!field.wrap,
        span:field.span || Math.max(field.w || currentMap.width, field.h || currentMap.height, 2400),
        streak:Number.isFinite(field.streak) ? field.streak : 0,
        color
      });
    }
  });
  parallaxDustSpeckCache.set(key, specks);
  return specks;
}

function drawParallaxDustSpecks({ctx, canvas, currentMap, camera}){
  const specks = getParallaxDustSpecks(currentMap);
  if(!specks.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for(const s of specks){
    const sx = s.wrap ? wrappedParallaxPoint(s.x, camera.x, s.p, s.span, w / 2) : s.x - camera.x * s.p + w / 2;
    const sy = s.wrap ? wrappedParallaxPoint(s.y, camera.y, s.p, s.span, h / 2) : s.y - camera.y * s.p + h / 2;
    if(sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    ctx.fillStyle = `rgba(${s.color},${s.a})`;
    if(s.streak > 0){
      ctx.strokeStyle = `rgba(${s.color},${s.a})`;
      ctx.lineWidth = Math.max(1, s.r);
      ctx.beginPath();
      ctx.moveTo(sx - s.streak * .5, sy - s.streak * .10);
      ctx.lineTo(sx + s.streak * .5, sy + s.streak * .10);
      ctx.stroke();
    }else if(s.r <= 1){
      ctx.fillRect(sx, sy, 1, 1);
    }else{
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawParallaxTiles({ctx, canvas, cache, currentMap, camera}){
  const layers = currentMap?.parallaxScene?.tiles || [];
  if(!layers.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  for(const layer of layers){
    const img = cache[layer.src];
    if(!img || !img.complete || !img.naturalWidth) continue;
    const p = Number.isFinite(layer.p) ? layer.p : .08;
    const tileW = layer.w || img.naturalWidth;
    const tileH = layer.h || img.naturalHeight;
    const gapX = Number.isFinite(layer.gapX) ? layer.gapX : 0;
    const gapY = Number.isFinite(layer.gapY) ? layer.gapY : 0;
    const stepX = Math.max(80, tileW + gapX);
    const stepY = Math.max(80, tileH + gapY);
    const originX = (layer.x || 0) - camera.x * p + w / 2;
    const originY = (layer.y || 0) - camera.y * p + h / 2;
    const startX = ((originX % stepX) + stepX) % stepX - stepX;
    const startY = ((originY % stepY) + stepY) % stepY - stepY;
    ctx.globalAlpha = Number.isFinite(layer.alpha) ? layer.alpha : 1;
    ctx.filter = layer.filter || "none";
    ctx.globalCompositeOperation = layer.blend || "source-over";
    for(let y = startY, row = 0; y < h + stepY; y += stepY, row++){
      const stagger = layer.stagger ? (row % 2) * stepX * .5 : 0;
      for(let x = startX - stagger; x < w + stepX; x += stepX){
        ctx.drawImage(img, x - tileW / 2, y - tileH / 2, tileW, tileH);
      }
    }
    ctx.filter = "none";
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function getParallaxCloudSprite(cloud){
  const r = cloud.r || 360;
  const logicalSize = Math.max(260, r * 2.65);
  const bufferSize = Math.max(128, Math.min(1024, Math.ceil(logicalSize)));
  const key = [
    cloud.seed || 0,
    Math.round(r),
    Math.round((cloud.alpha || .22) * 1000),
    Math.round((cloud.scale || 1) * 1000),
    Math.round((cloud.squeeze || .62) * 1000),
    cloud.blobs || 9,
    cloud.core || "",
    cloud.mid || "",
    cloud.edge || ""
  ].join("|");
  if(parallaxCloudSpriteCache.has(key)) return parallaxCloudSpriteCache.get(key);

  const buffer = document.createElement("canvas");
  buffer.width = bufferSize;
  buffer.height = bufferSize;
  const bctx = buffer.getContext("2d");
  const k = bufferSize / logicalSize;
  const center = bufferSize / 2;
  const rnd = seededValue(17000 + (cloud.seed || 0) * 997);
  const blobs = cloud.blobs || 9;
  bctx.globalCompositeOperation = "screen";
  for(let i = 0; i < blobs; i++){
    const angle = rnd() * Math.PI * 2;
    const dist = Math.pow(rnd(), .72) * r * .72;
    const bx = center + Math.cos(angle) * dist * k;
    const by = center + Math.sin(angle) * dist * (cloud.squeeze || .62) * k;
    const br = r * (.18 + rnd() * .30) * (cloud.scale || 1) * k;
    const alpha = (cloud.alpha || .22) * (.55 + rnd() * .55);
    const g = bctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, cloud.core || `rgba(255,176,72,${alpha})`);
    g.addColorStop(.28, cloud.mid || `rgba(220,54,28,${alpha * .46})`);
    g.addColorStop(.68, cloud.edge || `rgba(92,18,24,${alpha * .16})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    bctx.fillStyle = g;
    bctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  bctx.globalCompositeOperation = "source-over";
  const sprite = {buffer, logicalSize};
  parallaxCloudSpriteCache.set(key, sprite);
  return sprite;
}

function drawParallaxClouds({ctx, canvas, currentMap, camera, layers, defaultComposite = "screen"}){
  const clouds = layers || [];
  if(!clouds.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = defaultComposite;
  for(const cloud of clouds){
    const p = Number.isFinite(cloud.p) ? cloud.p : .06;
    const sx = cloud.x - camera.x * p + w / 2;
    const sy = cloud.y - camera.y * p + h / 2;
    const r = cloud.r || 360;
    if(sx + r * 2 < -160 || sx - r * 2 > w + 160 || sy + r * 2 < -160 || sy - r * 2 > h + 160) continue;
    const rnd = seededValue(17000 + (cloud.seed || 0) * 997);
    const sprite = getParallaxCloudSprite(cloud);
    ctx.drawImage(sprite.buffer, sx - sprite.logicalSize / 2, sy - sprite.logicalSize / 2, sprite.logicalSize, sprite.logicalSize);
    ctx.strokeStyle = cloud.filament || `rgba(255,124,42,${(cloud.alpha || .22) * .34})`;
    ctx.lineWidth = Math.max(1, r * .006);
    const filamentCount = Number.isFinite(cloud.filaments) ? cloud.filaments : 5;
    for(let i = 0; i < filamentCount; i++){
      const a = (cloud.rotation || 0) + (rnd() - .5) * 1.25;
      const len = r * (.55 + rnd() * .62);
      const ox = (rnd() - .5) * r * .65;
      const oy = (rnd() - .5) * r * .34;
      ctx.beginPath();
      ctx.moveTo(sx + ox - Math.cos(a) * len * .5, sy + oy - Math.sin(a) * len * .22);
      ctx.quadraticCurveTo(sx + ox, sy + oy + (rnd() - .5) * r * .18, sx + ox + Math.cos(a) * len * .5, sy + oy + Math.sin(a) * len * .22);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawParallaxLightClouds({ctx, canvas, currentMap, camera}){
  drawParallaxClouds({ctx, canvas, currentMap, camera, layers:currentMap?.parallaxScene?.lightClouds || []});
}

function drawParallaxForegroundClouds({ctx, canvas, currentMap, camera}){
  drawParallaxClouds({ctx, canvas, currentMap, camera, layers:currentMap?.parallaxScene?.foregroundClouds || [], defaultComposite:"screen"});
}

function drawParallaxGlowSpots({ctx, canvas, currentMap, camera}){
  const spots = currentMap?.parallaxScene?.glowSpots || [];
  if(!spots.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const now = performance.now();
  for(const spot of spots){
    const p = Number.isFinite(spot.p) ? spot.p : .12;
    const sx = spot.x - camera.x * p + w / 2;
    const sy = spot.y - camera.y * p + h / 2;
    const r = spot.r || 120;
    if(sx + r < -80 || sx - r > w + 80 || sy + r < -80 || sy - r > h + 80) continue;
    const flicker = .86 + Math.sin(now / (spot.speed || 720) + (spot.seed || 0)) * .14;
    const alpha = (Number.isFinite(spot.alpha) ? spot.alpha : .45) * flicker;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, spot.core || spot.color || `rgba(255,236,180,${alpha})`);
    g.addColorStop(.18, spot.hot || spot.color || `rgba(255,104,36,${alpha * .72})`);
    g.addColorStop(.48, spot.mid || spot.color || `rgba(185,28,28,${alpha * .34})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawParallaxStarLights({ctx, canvas, currentMap, camera}){
  const lights = currentMap?.parallaxScene?.starLights || [];
  if(!lights.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const now = performance.now();
  for(const light of lights){
    const p = Number.isFinite(light.p) ? light.p : .03;
    const sx = light.x - camera.x * p + w / 2;
    const sy = light.y - camera.y * p + h / 2;
    const r = light.r || 760;
    if(sx + r < -120 || sx - r > w + 120 || sy + r < -120 || sy - r > h + 120) continue;
    const flicker = .92 + Math.sin(now / (light.speed || 1500) + (light.seed || 0)) * .08;
    const alpha = (Number.isFinite(light.alpha) ? light.alpha : .62) * flicker;
    const coreRadius = Math.max(10, r * (light.coreRadius || .035));

    const colors = light.colors || {};
    const coreColor = colors.core || "255,255,255";
    const hotColor = colors.hot || "255,255,255";
    const midColor = colors.mid || "219,244,255";
    const hazeColor = colors.haze || "125,211,252";
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    halo.addColorStop(0, `rgba(${coreColor},${alpha})`);
    halo.addColorStop(.055, `rgba(${hotColor},${alpha * .72})`);
    halo.addColorStop(.16, `rgba(${midColor},${alpha * .30})`);
    halo.addColorStop(.42, `rgba(${hazeColor},${alpha * .075})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);

    const bloom = ctx.createRadialGradient(sx, sy, coreRadius * .8, sx, sy, r * .46);
    bloom.addColorStop(0, `rgba(${coreColor},${alpha * .28})`);
    bloom.addColorStop(.34, `rgba(${midColor},${alpha * .12})`);
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.sin(now / 4200 + (light.seed || 0)) * .10);
    ctx.scale(1.45, .58);
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, r * .46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(.38, `rgba(255,255,255,${Math.min(1, alpha * .95)})`);
    core.addColorStop(1, "rgba(186,230,253,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function seededValue(seed){
  let value = seed % 2147483647;
  return ()=>{
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function getParallaxAsteroids(currentMap){
  const scene = currentMap?.parallaxScene;
  if(!scene?.asteroidFields?.length) return [];
  const key = currentMap.id || currentMap.name || "map";
  if(parallaxAsteroidCache.has(key)) return parallaxAsteroidCache.get(key);
  const asteroids = [];
  scene.asteroidFields.forEach((field, fieldIndex)=>{
    const rnd = seededValue(9000 + fieldIndex * 1193 + (currentMap.id || 0) * 97);
    const count = field.count || 40;
    const cos = Math.cos(field.angle || 0);
    const sin = Math.sin(field.angle || 0);
    for(let i = 0; i < count; i++){
      const lx = (rnd() - .5) * field.w;
      const ly = (rnd() - .5) * field.h;
      const x = field.x + lx * cos - ly * sin;
      const y = field.y + lx * sin + ly * cos;
      const minR = Number.isFinite(field.sizeMin) ? field.sizeMin : 4;
      const maxR = Number.isFinite(field.sizeMax) ? field.sizeMax : 46;
      const r = minR + Math.pow(rnd(), field.sizePower || 2.2) * (maxR - minR);
      const variant = Math.floor(rnd() * 10);
      const shadeMin = Number.isFinite(field.shadeMin) ? field.shadeMin : 42;
      const shadeMax = Number.isFinite(field.shadeMax) ? field.shadeMax : 96;
      asteroids.push({
        x,y,r,
        rot:rnd() * Math.PI * 2,
        p:field.p || .45,
        alpha:(field.alpha || .6) * (.55 + rnd() * .45),
        shade:Math.floor(shadeMin + rnd() * Math.max(0, shadeMax - shadeMin)),
        tint:field.tint || "slate",
        variant,
        craters:Number.isFinite(field.craters) ? field.craters : 1
      });
    }
  });
  parallaxAsteroidCache.set(key, asteroids);
  return asteroids;
}

function asteroidPalette(tint, shade){
  if(tint === "rust"){
    return {
      hi:[shade + 92, shade + 70, shade + 58],
      mid:[shade + 38, shade + 28, shade + 26],
      low:[16, 10, 12],
      rim:[218, 180, 150]
    };
  }
  if(tint === "ice"){
    return {
      hi:[shade + 82, shade + 104, shade + 118],
      mid:[shade + 22, shade + 36, shade + 50],
      low:[7, 12, 20],
      rim:[205, 235, 248]
    };
  }
  return {
    hi:[shade + 76, shade + 84, shade + 96],
    mid:[shade + 18, shade + 24, shade + 34],
    low:[7, 8, 13],
    rim:[205, 220, 235]
  };
}

function getAsteroidSprite(asteroid){
  const bucket = Math.max(8, Math.round(asteroid.r / 4) * 4);
  const key = `${bucket}|${asteroid.tint}|${asteroid.shade}|${asteroid.variant}|${asteroid.craters}`;
  if(asteroidSpriteCache.has(key)) return asteroidSpriteCache.get(key);

  const pad = Math.ceil(bucket * .55) + 8;
  const size = Math.max(24, Math.ceil(bucket * 2 + pad * 2));
  const cx = size / 2;
  const cy = size / 2;
  const rnd = seededValue(47000 + asteroid.variant * 271 + asteroid.shade * 13 + bucket * 19);
  const verts = [];
  const vertexCount = 13;
  for(let i = 0; i < vertexCount; i++){
    const a = i / vertexCount * Math.PI * 2;
    const rr = bucket * (.72 + rnd() * .34);
    verts.push({
      x:cx + Math.cos(a) * rr,
      y:cy + Math.sin(a) * rr * (.78 + rnd() * .18)
    });
  }

  const buffer = document.createElement("canvas");
  buffer.width = size;
  buffer.height = size;
  const bctx = buffer.getContext("2d");
  const palette = asteroidPalette(asteroid.tint, asteroid.shade);
  const grad = bctx.createLinearGradient(cx - bucket, cy - bucket, cx + bucket * .9, cy + bucket * .85);
  grad.addColorStop(0, `rgb(${palette.hi.join(",")})`);
  grad.addColorStop(.46, `rgb(${palette.mid.join(",")})`);
  grad.addColorStop(1, `rgb(${palette.low.join(",")})`);

  bctx.save();
  bctx.beginPath();
  verts.forEach((p, i)=>i ? bctx.lineTo(p.x, p.y) : bctx.moveTo(p.x, p.y));
  bctx.closePath();
  bctx.clip();
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, size, size);

  for(let i = 0; i < 48; i++){
    const x = cx + (rnd() - .5) * bucket * 1.9;
    const y = cy + (rnd() - .5) * bucket * 1.55;
    const alpha = .025 + rnd() * .055;
    const light = rnd() > .48 ? 255 : 0;
    bctx.fillStyle = `rgba(${light},${light},${light},${alpha})`;
    bctx.beginPath();
    bctx.arc(x, y, .8 + rnd() * bucket * .035, 0, Math.PI * 2);
    bctx.fill();
  }

  const craterCount = Math.max(0, Math.round(asteroid.craters + bucket / 18));
  for(let i = 0; i < craterCount; i++){
    const x = cx + (rnd() - .5) * bucket * 1.15;
    const y = cy + (rnd() - .5) * bucket * .92;
    const r = Math.max(1.3, bucket * (.06 + rnd() * .09));
    const cg = bctx.createRadialGradient(x - r * .25, y - r * .25, 0, x, y, r);
    cg.addColorStop(0, "rgba(255,255,255,.10)");
    cg.addColorStop(.42, "rgba(0,0,0,.18)");
    cg.addColorStop(1, "rgba(0,0,0,.04)");
    bctx.fillStyle = cg;
    bctx.beginPath();
    bctx.ellipse(x, y, r, r * (.55 + rnd() * .25), rnd() * Math.PI, 0, Math.PI * 2);
    bctx.fill();
  }
  bctx.restore();

  bctx.strokeStyle = `rgba(${palette.rim.join(",")},.24)`;
  bctx.lineWidth = Math.max(1, bucket * .035);
  bctx.beginPath();
  verts.forEach((p, i)=>i ? bctx.lineTo(p.x, p.y) : bctx.moveTo(p.x, p.y));
  bctx.closePath();
  bctx.stroke();

  const shadow = bctx.createRadialGradient(cx + bucket * .22, cy + bucket * .18, 0, cx + bucket * .18, cy + bucket * .12, bucket * 1.06);
  shadow.addColorStop(0, "rgba(0,0,0,0)");
  shadow.addColorStop(.56, "rgba(0,0,0,.10)");
  shadow.addColorStop(1, "rgba(0,0,0,.46)");
  bctx.globalCompositeOperation = "multiply";
  bctx.fillStyle = shadow;
  bctx.beginPath();
  verts.forEach((p, i)=>i ? bctx.lineTo(p.x, p.y) : bctx.moveTo(p.x, p.y));
  bctx.closePath();
  bctx.fill();
  bctx.globalCompositeOperation = "source-over";

  asteroidSpriteCache.set(key, buffer);
  return buffer;
}

function drawParallaxAsteroids({ctx, canvas, currentMap, camera}){
  const asteroids = getParallaxAsteroids(currentMap);
  if(!asteroids.length) return;
  const w = viewWidth(canvas), h = viewHeight(canvas);
  ctx.save();
  for(const asteroid of asteroids){
    const sx = asteroid.x - camera.x * asteroid.p + w / 2;
    const sy = asteroid.y - camera.y * asteroid.p + h / 2;
    const margin = asteroid.r * 3 + 80;
    if(sx < -margin || sx > w + margin || sy < -margin || sy > h + margin) continue;
    const sprite = getAsteroidSprite(asteroid);
    const size = asteroid.r * 2 + Math.ceil(asteroid.r * 1.1) + 16;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(asteroid.rot);
    ctx.globalAlpha = asteroid.alpha;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
}

function graphicsQualityStep(value){
  if(value === "low") return 5;
  if(value === "medium") return 2;
  return 1;
}

function drawCloseSpeedStars({ctx, canvas, camera, asteroids, player, graphicsQuality = "high"}){
  if(!asteroids?.length) return;
  const w = viewWidth(canvas);
  const h = viewHeight(canvas);
  const now = performance.now() * 0.001;
  const step = graphicsQualityStep(graphicsQuality);
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  ctx.globalCompositeOperation = "screen";
  for(let i = 0; i < asteroids.length; i += step){
    const star = asteroids[i];
    const drift = star.drift || 0;
    const driftX = drift ? Math.sin(now * (star.driftSpeed || .7) + (star.phase || 0)) * drift : 0;
    const driftY = drift ? Math.cos(now * (star.driftSpeed || .7) * .83 + (star.phase || 0) * 1.37) * drift * .65 : 0;
    const x = star.x + driftX;
    const y = star.y + driftY;
    if(x < camera.x-100 || x > camera.x+w+100 || y < camera.y-100 || y > camera.y+h+100) continue;
    const pulse = .78 + Math.sin(now * (star.twinkleSpeed || 1.1) + (star.phase || 0)) * .22;
    const alpha = (star.a || .45) * pulse;
    const radius = (star.r || 1) * (.92 + pulse * .08);
    const blue = (star.tint || 0) > .72;
    ctx.fillStyle = blue ? `rgba(186,230,253,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawParallaxVignette({ctx, canvas}){
  const w = viewWidth(canvas), h = viewHeight(canvas);
  if(!vignetteCache || vignetteCache.w !== w || vignetteCache.h !== h){
    const buffer = document.createElement("canvas");
    buffer.width = Math.max(1, Math.round(w));
    buffer.height = Math.max(1, Math.round(h));
    const bctx = buffer.getContext("2d");
    const g = bctx.createRadialGradient(w / 2, h / 2, Math.min(w,h) * .22, w / 2, h / 2, Math.max(w,h) * .78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(.68, "rgba(0,0,0,.08)");
    g.addColorStop(1, "rgba(0,0,0,.36)");
    bctx.fillStyle = g;
    bctx.fillRect(0,0,w,h);
    vignetteCache = {w, h, buffer};
  }
  ctx.drawImage(vignetteCache.buffer, 0, 0, w, h);
}

function drawParallaxBackground({ctx, canvas, cache, currentMap, camera, stars, dust, graphicsQuality = "high"}){
  drawParallaxNebulae({ctx, canvas, currentMap, camera});
  drawParallaxBackdrops({ctx, canvas, cache, currentMap, camera});
  drawParallaxStars({ctx, canvas, camera, stars, dust});
  drawParallaxDustSpecks({ctx, canvas, currentMap, camera});
  drawParallaxTiles({ctx, canvas, cache, currentMap, camera});
  drawParallaxLightClouds({ctx, canvas, currentMap, camera});
  if(graphicsQuality === "high") drawParallaxStarLights({ctx, canvas, currentMap, camera});
  drawParallaxImages({ctx, canvas, cache, currentMap, camera});
  drawParallaxForegroundClouds({ctx, canvas, currentMap, camera});
  drawParallaxAsteroids({ctx, canvas, currentMap, camera});
  drawParallaxGlowSpots({ctx, canvas, currentMap, camera});
  drawParallaxVignette({ctx, canvas});
}

function drawBackground({ctx, canvas, cache, currentMap, camera, nebulae, stars, dust, graphicsQuality = "high"}){
  const w = viewWidth(canvas), h = viewHeight(canvas);
  const quality = currentMap?.parallaxScene?.qualityOverride || graphicsQuality;
  const bg = ctx.createLinearGradient(0,0,w,h);
  const colors = currentMap?.parallaxScene?.background || ["#01040b", "#07182b", "#01040b"];
  bg.addColorStop(0, colors[0] || "#01040b");
  bg.addColorStop(.55, colors[1] || "#07182b");
  bg.addColorStop(1, colors[2] || "#01040b");
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,w,h);

  if(currentMap?.parallaxScene?.enabled){
    if(quality !== "low") drawParallaxNebulae({ctx, canvas, currentMap, camera});
    if(quality !== "low") drawParallaxBackdrops({ctx, canvas, cache, currentMap, camera});
    drawParallaxStars({ctx, canvas, camera, stars, dust:quality === "low" ? [] : dust});
    if(quality === "high") drawParallaxDustSpecks({ctx, canvas, currentMap, camera});
    if(quality !== "low") drawParallaxTiles({ctx, canvas, cache, currentMap, camera});
    if(quality !== "low") drawParallaxLightClouds({ctx, canvas, currentMap, camera});
    if(quality === "high") drawParallaxStarLights({ctx, canvas, currentMap, camera});
    drawParallaxImages({ctx, canvas, cache, currentMap, camera});
    if(quality === "high") drawParallaxForegroundClouds({ctx, canvas, currentMap, camera});
    if(quality !== "low") drawParallaxAsteroids({ctx, canvas, currentMap, camera});
    if(quality !== "low") drawParallaxGlowSpots({ctx, canvas, currentMap, camera});
    if(quality !== "low") drawParallaxVignette({ctx, canvas});
    return;
  }

  let tileState = {drawn:false, complete:false};
  if(currentMap?.tileMap){
    if(!areVisibleTilesReady({canvas, cache, currentMap, camera})){
      drawMapImage({ctx, cache, currentMap, camera});
    }
    tileState = drawTileBackground({ctx, canvas, cache, currentMap, camera});
  }else{
    drawMapImage({ctx, cache, currentMap, camera});
  }

  if(tileState.complete || tileState.drawn) return;
  for(const n of nebulae){
    const sx = n.x - camera.x*n.p + w/2;
    const sy = n.y - camera.y*n.p + h/2;
    const g = ctx.createRadialGradient(sx,sy,0,sx,sy,n.r);
    g.addColorStop(0,n.c);
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
  }
  ctx.save();
  for(const s of stars){
    const span = 9000;
    let sx = (s.x - camera.x*s.p) % span;
    let sy = (s.y - camera.y*s.p) % span;
    if(sx < -span/2) sx += span;
    if(sx > span/2) sx -= span;
    if(sy < -span/2) sy += span;
    if(sy > span/2) sy -= span;
    sx += w/2;
    sy += h/2;
    if(sx < -10 || sx > w+10 || sy < -10 || sy > h+10) continue;
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.beginPath();
    ctx.arc(sx,sy,s.s,0,Math.PI*2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(125,211,252,.10)";
  for(const d of dust){
    const sx = d.x - camera.x*d.p + w/2;
    const sy = d.y - camera.y*d.p + h/2;
    if(sx < -100 || sx > w+100 || sy < -100 || sy > h+100) continue;
    ctx.globalAlpha = d.a;
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.lineTo(sx+d.len, sy+d.len*.18);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMapBounds({ctx, currentMap}){
  const x = -currentMap.width/2;
  const y = -currentMap.height/2;
  ctx.strokeStyle = "rgba(56,189,248,.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(x,y,currentMap.width,currentMap.height);
}

function drawGrid({ctx, canvas, camera, currentMap}){
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  const size = 120;
  const startX = Math.floor((camera.x-50)/size)*size;
  const endX = camera.x+viewWidth(canvas)+50;
  const startY = Math.floor((camera.y-50)/size)*size;
  const endY = camera.y+viewHeight(canvas)+50;
  ctx.strokeStyle = "rgba(56,189,248,.065)";
  ctx.lineWidth = 1;
  for(let x=startX;x<endX;x+=size){
    ctx.beginPath();
    ctx.moveTo(x,startY);
    ctx.lineTo(x,endY);
    ctx.stroke();
  }
  for(let y=startY;y<endY;y+=size){
    ctx.beginPath();
    ctx.moveTo(startX,y);
    ctx.lineTo(endX,y);
    ctx.stroke();
  }
  drawMapBounds({ctx, currentMap});
  ctx.restore();
}

function drawSpawnAsset({ctx, cache, src, x, y, width, height, alpha = 1, rotation = 0}){
  const img = cache?.[src];
  if(!img || !img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  if(rotation) ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function drawSpawnPath({ctx, from, to, color = "56,189,248"}){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = -dy / distance;
  const ny = dx / distance;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(${color},.10)`;
  ctx.lineWidth = 38;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${color},.28)`;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(from.x + nx * 13, from.y + ny * 13);
  ctx.lineTo(to.x + nx * 13, to.y + ny * 13);
  ctx.moveTo(from.x - nx * 13, from.y - ny * 13);
  ctx.lineTo(to.x - nx * 13, to.y - ny * 13);
  ctx.stroke();
  ctx.restore();
}

function drawSpawnHub({ctx, cache, spawn, stations}){
  if(!spawn) return;
  const now = performance.now();
  const pulse = .5 + Math.sin(now / 260) * .5;
  const dockBob = Math.sin(now / 2200) * 18;
  ctx.save();
  for(const station of stations){
    drawSpawnPath({
      ctx,
      from:{x:spawn.x, y:spawn.y - 20},
      to:{x:station.x, y:station.y + 20},
      color:station.id === "quests" ? "56,189,248" : "250,204,21"
    });
  }
  ctx.globalCompositeOperation = "screen";
  const dockGlow = ctx.createRadialGradient(spawn.x, spawn.y, 40, spawn.x, spawn.y, 198);
  dockGlow.addColorStop(0, `rgba(34,211,238,${.18 + pulse * .08})`);
  dockGlow.addColorStop(.52, "rgba(14,165,233,.08)");
  dockGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = dockGlow;
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 198, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const drawn = drawSpawnAsset({
    ctx,
    cache,
    src:"assets/spawn/spawn_dock.png",
    x:spawn.x,
    y:spawn.y - 2 + dockBob,
    width:1460,
    height:1460
  });
  if(!drawn){
    ctx.strokeStyle = "rgba(125,211,252,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(spawn.x-92, spawn.y-32, 184, 64);
    ctx.strokeRect(spawn.x-42, spawn.y-118, 84, 236);
    ctx.fillStyle = "rgba(2,132,199,.10)";
    ctx.fillRect(spawn.x-88, spawn.y-28, 176, 56);
  }
  ctx.restore();
}

function getSpawnStationBob(station, now){
  const phase = station.id === "quests" ? .45 : 2.15;
  return Math.sin(now / 900 + phase) * 10;
}

function drawSpawnStations({ctx, cache, stations}){
  const now = performance.now();
  for(const station of stations){
    const bob = getSpawnStationBob(station, now);
    const glow = 6 + Math.sin(now/220 + station.x*0.002) * 4;
    ctx.save();
    ctx.translate(station.x, station.y + bob);
    const color = station.id === "quests" ? "56,189,248" : "250,204,21";
    const assetDrawn = drawSpawnAsset({
      ctx,
      cache,
      src:station.asset,
      x:0,
      y:0,
      width:station.assetWidth || 180,
      height:station.assetHeight || 180
    });
    if(!assetDrawn){
      ctx.fillStyle = station.id === "quests" ? "rgba(14,165,233,.22)" : "rgba(251,191,36,.18)";
      ctx.strokeStyle = station.id === "quests" ? "rgba(56,189,248,.92)" : "rgba(250,204,21,.92)";
      ctx.shadowColor = station.id === "quests" ? "rgba(56,189,248,.75)" : "rgba(250,204,21,.65)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-38,-28,76,56,14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(226,232,240,.95)";
      ctx.font = "700 18px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.fillText(station.id === "quests" ? "Q" : "R", 0, 7);
    }
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.beginPath();
    ctx.arc(0, 0, station.radius + glow, 0, Math.PI*2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${color},.52)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, station.radius, 0, Math.PI*2);
    ctx.stroke();
    const labelY = Math.max(48, (station.assetHeight || 76) / 2 + 16);
    ctx.font = "700 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(248,250,252,.94)";
    ctx.fillText(station.title, 0, labelY);
    ctx.restore();
  }
}

function drawSpawnStationPrompts({ctx, stations}){
  const now = performance.now();
  for(const station of stations){
    const marker = station.marker;
    if(!marker) continue;
    const pulse = .5 + Math.sin(now / 210 + station.x * .003) * .5;
    const color = station.id === "quests" ? "56,189,248" : "250,204,21";
    const dark = station.id === "quests" ? "4,20,35" : "28,18,4";
    const label = station.id === "quests" ? "MISSIONS" : "RAFFINAGE";
    const r = marker.radius || 42;
    const bob = getSpawnStationBob(station, now);
    ctx.save();
    ctx.translate(marker.x, marker.y + bob - pulse * 5);

    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, r + 54);
    glow.addColorStop(0, `rgba(${color},${.24 + pulse * .10})`);
    glow.addColorStop(.55, `rgba(${color},.08)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r + 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${color},.30)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r + 32);
    ctx.lineTo(0, r + 80);
    ctx.stroke();

    ctx.shadowColor = `rgba(${color},.85)`;
    ctx.shadowBlur = 16 + pulse * 10;
    ctx.fillStyle = `rgba(${dark},.94)`;
    ctx.strokeStyle = `rgba(${color},${.82 + pulse * .14})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * .82, -r * .58);
    ctx.lineTo(-r * .40, -r);
    ctx.lineTo(r * .40, -r);
    ctx.lineTo(r * .82, -r * .58);
    ctx.lineTo(r * .82, r * .44);
    ctx.lineTo(0, r + 24);
    ctx.lineTo(-r * .82, r * .44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${color},.34)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, r * .62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${color},.48)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r - 12, -r * .36);
    ctx.lineTo(-r - 28, -r * .36);
    ctx.lineTo(-r - 28, r * .12);
    ctx.moveTo(r + 12, -r * .36);
    ctx.lineTo(r + 28, -r * .36);
    ctx.lineTo(r + 28, r * .12);
    ctx.stroke();

    ctx.fillStyle = `rgba(${color},.96)`;
    ctx.font = station.id === "quests" ? "900 48px Rajdhani, Arial" : "900 36px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(marker.text || (station.id === "quests" ? "!" : "R"), 0, station.id === "quests" ? -5 : -4);

    ctx.fillStyle = "rgba(226,242,255,.94)";
    ctx.font = "800 10px Rajdhani, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label, 0, r * .68);

    ctx.strokeStyle = `rgba(${color},${.22 + pulse * .14})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, r + 16 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawQuestNpcs({ctx, cache, currentMap}){
  const npcs = Array.isArray(currentMap?.questNpcs) ? currentMap.questNpcs : [];
  if(!npcs.length) return;
  const now = performance.now();
  for(const npc of npcs){
    const ship = ships.find(entry=>entry.id === npc.shipId);
    const img = cache?.[npc.npcImg || ship?.combatImg || ship?.img || ""] || null;
    const pulse = .5 + Math.sin(now / 240 + npc.x * .01) * .5;
    const radius = Number(npc.radius || 115);
    const size = Number(npc.size || 126);
    ctx.save();
    ctx.translate(npc.x, npc.y);
    ctx.strokeStyle = `rgba(250,204,21,${.56 + pulse * .22})`;
    ctx.fillStyle = "rgba(250,204,21,.08)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if(img?.complete && img.naturalWidth){
      ctx.save();
      ctx.rotate(Number(npc.rotation ?? -.25));
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }else{
      ctx.fillStyle = "rgba(56,189,248,.70)";
      ctx.beginPath();
      ctx.moveTo(size * .45, 0);
      ctx.lineTo(-size * .32, -size * .25);
      ctx.lineTo(-size * .12, 0);
      ctx.lineTo(-size * .32, size * .25);
      ctx.closePath();
      ctx.fill();
    }
    const markerY = -radius - 24 - pulse * 4;
    ctx.fillStyle = "rgba(250,204,21,.95)";
    ctx.shadowColor = "rgba(250,204,21,.85)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, markerY + 30);
    ctx.lineTo(-18, markerY + 5);
    ctx.quadraticCurveTo(0, markerY - 20, 18, markerY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#04101d";
    ctx.font = "900 28px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(npc.marker || "!", 0, markerY + 4);
    ctx.fillStyle = "rgba(248,250,252,.96)";
    ctx.font = "800 15px Rajdhani, Arial";
    ctx.fillText(npc.label || npc.name || "PNJ", 0, radius + 30);
    ctx.restore();
  }
}

function drawWorldMarkers({
  ctx,
  camera,
  currentMap,
  player,
  safeReady,
  spawnProtected,
  stations,
  cache,
  getMapPortals = getDefaultMapPortals,
  getClosedMapPortals = getDefaultClosedMapPortals
}){
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  const spawn = currentMap.spawn;
  const pulse = Math.sin(performance.now()/240)*8;
  if(spawn && spawn.kind !== "portal"){
    if(!spawn.safeRect && spawnProtected){
      const ring = spawn.safeRadius || spawn.r;
      const decor = spawn.decorRadius || ring + 90;
      const spawnGrad = ctx.createRadialGradient(spawn.x, spawn.y, 18, spawn.x, spawn.y, decor + 20);
      spawnGrad.addColorStop(0, "rgba(8,145,178,.22)");
      spawnGrad.addColorStop(.45, "rgba(16,185,129,.13)");
      spawnGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = spawnGrad;
      ctx.beginPath();
      ctx.arc(spawn.x,spawn.y,decor,0,Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = safeReady ? "rgba(86,255,79,.82)" : "rgba(250,204,21,.88)";
      ctx.fillStyle = safeReady ? "rgba(86,255,79,.09)" : "rgba(250,204,21,.07)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(spawn.x,spawn.y,ring+pulse,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(125,211,252,.16)";
      ctx.beginPath();
      ctx.arc(spawn.x,spawn.y,decor,0,Math.PI*2);
      ctx.stroke();

      ctx.fillStyle = "rgba(187,247,208,.95)";
      ctx.font = "700 18px Rajdhani, Arial";
      ctx.fillText(`${spawn.label}${safeReady ? " · SAFE" : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`}`, spawn.x-ring+24, spawn.y-ring-18);
    }
    if(spawn.hub !== false){
      drawSpawnHub({ctx, cache, spawn, stations});
      drawSpawnStations({ctx, cache, stations});
      drawSpawnStationPrompts({ctx, stations});
    }
  }

  drawMapPortals({ctx, currentMap, getMapPortals});
  const closedPortals = getClosedMapPortals(currentMap);
  if(closedPortals.length){
    drawMapPortals({
      ctx,
      currentMap:{...currentMap, portal:null, portals:closedPortals},
      getMapPortals:map=>map.portals || []
    });
  }
  drawQuestNpcs({ctx, cache, currentMap});
  ctx.restore();
}

export function drawWorldLayer(options){
  drawBackground(options);
  if(!options.currentMap?.parallaxScene?.hideGrid) drawGrid(options);
  drawWorldMarkers(options);
  drawCloseSpeedStars(options);
}
