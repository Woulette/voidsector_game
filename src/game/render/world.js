function viewWidth(canvas){ return canvas.__renderWidth || canvas.__viewWidth || canvas.clientWidth || canvas.width; }
function viewHeight(canvas){ return canvas.__renderHeight || canvas.__viewHeight || canvas.clientHeight || canvas.height; }
const parallaxAsteroidCache = new Map();
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
    if(layer.blend) ctx.globalCompositeOperation = layer.blend;
    else ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, sx - width / 2, sy - height / 2, width, height);
  }
  ctx.globalAlpha = 1;
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
      const r = 4 + Math.pow(rnd(), 2.2) * 42;
      const verts = Array.from({length:9}, (_,index)=>{
        const angle = index / 9 * Math.PI * 2;
        const radius = r * (.72 + rnd() * .44);
        return {x:Math.cos(angle) * radius, y:Math.sin(angle) * radius * (.72 + rnd() * .18)};
      });
      asteroids.push({
        x,y,r,verts,
        rot:rnd() * Math.PI * 2,
        p:field.p || .45,
        alpha:(field.alpha || .6) * (.55 + rnd() * .45),
        shade:42 + Math.floor(rnd() * 54)
      });
    }
  });
  parallaxAsteroidCache.set(key, asteroids);
  return asteroids;
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
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(asteroid.rot);
    const g = ctx.createLinearGradient(-asteroid.r, -asteroid.r, asteroid.r, asteroid.r);
    g.addColorStop(0, `rgba(${asteroid.shade + 72},${asteroid.shade + 88},${asteroid.shade + 105},${asteroid.alpha})`);
    g.addColorStop(.52, `rgba(${asteroid.shade},${asteroid.shade + 9},${asteroid.shade + 18},${asteroid.alpha * .92})`);
    g.addColorStop(1, `rgba(5,9,16,${asteroid.alpha * .86})`);
    ctx.fillStyle = g;
    ctx.strokeStyle = `rgba(190,220,240,${asteroid.alpha * .22})`;
    ctx.lineWidth = Math.max(1, asteroid.r * .045);
    ctx.beginPath();
    asteroid.verts.forEach((point, index)=>{
      if(index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if(asteroid.r > 13){
      ctx.strokeStyle = `rgba(240,249,255,${asteroid.alpha * .16})`;
      ctx.beginPath();
      ctx.moveTo(-asteroid.r * .35, -asteroid.r * .22);
      ctx.lineTo(asteroid.r * .26, -asteroid.r * .14);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCloseSpeedStars({ctx, canvas, camera, asteroids, player}){
  if(!asteroids?.length) return;
  const w = viewWidth(canvas);
  const h = viewHeight(canvas);
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  ctx.globalCompositeOperation = "screen";
  for(const star of asteroids){
    if(star.x < camera.x-100 || star.x > camera.x+w+100 || star.y < camera.y-100 || star.y > camera.y+h+100) continue;
    const alpha = star.a || .45;
    const radius = star.r || 1;
    const blue = (star.tint || 0) > .72;
    ctx.fillStyle = blue ? `rgba(186,230,253,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
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

function drawParallaxBackground({ctx, canvas, cache, currentMap, camera, stars, dust}){
  drawParallaxNebulae({ctx, canvas, currentMap, camera});
  drawParallaxStars({ctx, canvas, camera, stars, dust});
  drawParallaxAsteroids({ctx, canvas, currentMap, camera});
  drawParallaxImages({ctx, canvas, cache, currentMap, camera});
  drawParallaxVignette({ctx, canvas});
}

function drawBackground({ctx, canvas, cache, currentMap, camera, nebulae, stars, dust}){
  const w = viewWidth(canvas), h = viewHeight(canvas);
  const bg = ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,"#01040b");
  bg.addColorStop(.55,"#07182b");
  bg.addColorStop(1,"#01040b");
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,w,h);

  if(currentMap?.parallaxScene?.enabled){
    drawParallaxNebulae({ctx, canvas, currentMap, camera});
    drawParallaxStars({ctx, canvas, camera, stars, dust});
    drawParallaxAsteroids({ctx, canvas, currentMap, camera});
    drawParallaxImages({ctx, canvas, cache, currentMap, camera});
    drawParallaxVignette({ctx, canvas});
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

function drawSpawnStations({ctx, stations}){
  for(const station of stations){
    const glow = 6 + Math.sin(performance.now()/220 + station.x*0.002) * 4;
    ctx.save();
    ctx.translate(station.x, station.y);
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
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.beginPath();
    ctx.arc(0, 0, station.radius + glow, 0, Math.PI*2);
    ctx.stroke();
    ctx.font = "700 12px Rajdhani, Arial";
    ctx.fillText(station.title, 0, 48);
    ctx.restore();
  }
}

function drawWorldMarkers({ctx, camera, currentMap, player, safeReady, stations}){
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  const spawn = currentMap.spawn;
  const pulse = Math.sin(performance.now()/240)*8;
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

  ctx.strokeStyle = "rgba(125,211,252,.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(spawn.x-92, spawn.y-32, 184, 64);
  ctx.strokeRect(spawn.x-42, spawn.y-118, 84, 236);
  ctx.fillStyle = "rgba(2,132,199,.10)";
  ctx.fillRect(spawn.x-88, spawn.y-28, 176, 56);

  ctx.fillStyle = "rgba(187,247,208,.95)";
  ctx.font = "700 18px Rajdhani, Arial";
  ctx.fillText(`${spawn.label}${safeReady ? " · SAFE" : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`}`, spawn.x-ring+24, spawn.y-ring-18);
  drawSpawnStations({ctx, stations});

  const portal = currentMap.portal;
  if(portal){
    const safeR = portal.safeRadius || Math.max(180, portal.r * 2.2);
    const grad = ctx.createRadialGradient(portal.x,portal.y,4,portal.x,portal.y,safeR);
    grad.addColorStop(0,"rgba(168,85,247,.95)");
    grad.addColorStop(.35,"rgba(56,189,248,.28)");
    grad.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(portal.x,portal.y,safeR,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(196,181,253,.26)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(portal.x,portal.y,safeR,0,Math.PI*2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(168,85,247,.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(portal.x,portal.y,portal.r,0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "700 16px Rajdhani, Arial";
    ctx.fillText(`${portal.label} · APPUIE J`, portal.x-92, portal.y-safeR-16);
  }
  ctx.restore();
}

export function drawWorldLayer(options){
  drawBackground(options);
  if(!options.currentMap?.parallaxScene?.hideGrid) drawGrid(options);
  drawWorldMarkers(options);
  drawCloseSpeedStars(options);
}
