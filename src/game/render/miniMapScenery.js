import { getMiniMapVisualDefinition } from "../combatData/miniMapVisuals.js?v=20261023-minimap5";
import { projectMapSceneryLayer } from "./mapSceneryProjection.js?v=20261018-helion-depth1";

const scenePlans = new WeakMap();
const scenicKinds = new Set(["planet", "stellar", "station"]);
const sceneryNames = /planet|stellar|station_iss/i;
const excludedNames = /asteroid|meteor|wreck|frigate|remnant/i;

export function getMiniMapSceneryLayers(scene){
  const images = (scene?.images || []).filter(layer=>{
    if(layer.minimap === false || ["asteroid", "cloud", "nebula"].includes(layer.kind) || excludedNames.test(layer.src || "")) return false;
    return layer.minimap === true || scenicKinds.has(layer.kind) || sceneryNames.test(layer.src || "");
  });
  // A distant background can be an explicit fixed navigation landmark too.
  // Ordinary clouds and dust remain excluded from the overview.
  return [...(scene?.backdrops || []).filter(layer=>layer.minimap === true), ...images];
}

export function getMiniMapLandmarkPosition({map, layer, defaultParallax = .35}){
  const placement = getMiniMapVisualDefinition(map)?.landmarks[layer.kind];
  if(placement) return {x:(placement.x - .5) * map.width, y:(placement.y - .5) * map.height};
  // Freeze the full-sector view at its centre. Never use the live player camera.
  const camera = {x:-map.width / 2, y:-map.height / 2};
  const point = projectMapSceneryLayer({layer, camera, viewWidth:map.width, viewHeight:map.height, defaultParallax});
  return {x:camera.x + point.x, y:camera.y + point.y};
}

// Used to capture the fixed background with the game's actual world renderer.
export function createMiniMapSnapshotMap(map){
  const scene = map.parallaxScene || {};
  const definition = getMiniMapVisualDefinition(map);
  const images = getMiniMapSceneryLayers(scene).map(layer=>{
    const point = getMiniMapLandmarkPosition({map, layer});
    const placement = definition?.landmarks[layer.kind];
    const width = placement ? placement.width * map.width : layer.w;
    const height = placement ? width * (layer.h || layer.w) / layer.w : layer.h;
    return {...layer, ...point, space:"world", p:1, w:width, h:height, edgeFade:false,
      alpha:layer.kind === "stellar" ? 1 : layer.alpha};
  });
  const atmosphere = definition?.atmosphere;
  return {...map, spawn:null, spawnStations:[], questStations:[], questNpcs:[], portals:[], portal:null, closedPortals:[],
    parallaxScene:{...scene, enabled:true, hideGrid:true, showBoundary:false, clipToBounds:false,
      skyFade:null, nebulae:[], lightClouds:[], foregroundClouds:[], starLights:[], dustSpecks:[],
      glowSpots:[], tiles:[], asteroidFields:[], images,
      backdrops:atmosphere ? [{...atmosphere, kind:"cloud", space:"world", p:1, x:0, y:0,
        w:map.width * 2.5, h:map.height * 2.5, blend:"screen", edgeFade:false}] : []}
  };
}

function sameStationLayout(previous, stations){
  return previous?.length === stations.length && stations.every((station, i)=>
    ["asset", "x", "y", "assetWidth", "assetHeight"].every(key=>previous[i][key] === station[key]));
}

function getScenePlan(map, stations){
  let plan = scenePlans.get(map);
  if(plan?.scene === map.parallaxScene && plan?.spawn === map.spawn
    && sameStationLayout(plan.stationLayout, stations)) return plan;
  const snapshot = createMiniMapSnapshotMap(map);
  const imagePath = getMiniMapVisualDefinition(map)?.image;
  const facilities = [];
  const spawn = map.spawn;
  if(spawn && spawn.kind !== "portal" && spawn.hub !== false){
    const visual = spawn.visual;
    facilities.push({src:visual?.asset || "assets/spawn/spawn_dock.png",
      x:visual?.x ?? spawn.x, y:visual?.y ?? spawn.y,
      w:visual?.width || 1460, h:visual?.height || 1460});
  }
  for(const station of stations){
    if(station.asset) facilities.push({src:station.asset, x:station.x, y:station.y,
      w:station.assetWidth || 266, h:station.assetHeight || 266});
  }
  const backdrops = snapshot.parallaxScene.backdrops;
  const images = snapshot.parallaxScene.images;
  plan = {scene:map.parallaxScene, spawn, stationLayout:stations.map(station=>({...station})),
    snapshot, imagePath, backdrops, images, facilities,
    sources:[...new Set([imagePath, map.bg, ...backdrops.map(layer=>layer.src), ...images.map(layer=>layer.src),
      ...facilities.map(layer=>layer.src)].filter(Boolean))]};
  scenePlans.set(map, plan);
  return plan;
}

function createSurface(width, height){
  if(typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  if(typeof document === "undefined") return null;
  const surface = document.createElement("canvas");
  surface.width = width; surface.height = height;
  return surface;
}

function isReady(image){ return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0); }

function drawImageLayer({ctx, map, layer, cache, verticalScale}){
  const image = cache[layer.src];
  if(!isReady(image)) return;
  const width = layer.w || image.naturalWidth, height = layer.h || image.naturalHeight;
  ctx.save();
  ctx.translate(layer.x + map.width / 2, layer.y + map.height / 2);
  // The navigation plane is wide; illustrations retain their native proportions.
  ctx.scale(1, verticalScale);
  if(layer.rotation) ctx.rotate(layer.rotation);
  ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
  ctx.globalAlpha = Number.isFinite(layer.alpha) ? layer.alpha : 1;
  ctx.globalCompositeOperation = layer.blend || "source-over";
  if(layer.frame){
    const frame = layer.frame;
    ctx.drawImage(image, frame.x * image.naturalWidth, frame.y * image.naturalHeight,
      frame.w * image.naturalWidth, frame.h * image.naturalHeight, -width / 2, -height / 2, width, height);
  }else{
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  }
  ctx.restore();
}

function paintSurface({ctx, surface, map, plan, cache}){
  const verticalScale = surface.width * map.height / (surface.height * map.width);
  ctx.setTransform(surface.width / map.width, 0, 0, surface.height / map.height, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, map.width, map.height);
  const colors = plan.scene?.background || ["#01040b", "#07182b", "#01040b"];
  const background = ctx.createLinearGradient(0, 0, map.width, map.height);
  background.addColorStop(0, colors[0]);
  background.addColorStop(.55, colors[1] || colors[0]);
  background.addColorStop(1, colors[2] || colors[0]);
  ctx.fillStyle = background; ctx.fillRect(0, 0, map.width, map.height);
  const atlas = cache[plan.imagePath];
  if(isReady(atlas)){
    ctx.drawImage(atlas, 0, 0, map.width, map.height);
  }else if(!plan.scene?.enabled && isReady(cache[map.bg])){
    ctx.drawImage(cache[map.bg], 0, 0, map.width, map.height);
  }else{
    for(const layer of plan.backdrops) drawImageLayer({ctx, map, layer, cache, verticalScale});
    for(const layer of plan.images) drawImageLayer({ctx, map, layer, cache, verticalScale});
  }
  for(const layer of plan.facilities) drawImageLayer({ctx, map, layer, cache, verticalScale});
}

// The background is rebuilt for assets, map or size changes, never for movement or zoom.
export function createMiniMapSceneryRenderer({createCanvas = createSurface} = {}){
  let state = null;
  return function draw({ctx, currentMap:map, cache, rect, pixelRatio = 1,
    stations = map?.spawnStations || map?.questStations || []}){
    if(!cache || !(map?.width > 0 && map.height > 0) || (!map.parallaxScene?.enabled && !map.bg)) return false;
    const plan = getScenePlan(map, stations);
    const ratio = Math.max(1, Math.min(2, pixelRatio));
    const width = Math.max(1, Math.round(rect.w * ratio)), height = Math.max(1, Math.round(rect.h * ratio));
    if(!state || state.width !== width || state.height !== height){
      const surface = createCanvas(width, height), surfaceCtx = surface?.getContext("2d");
      if(!surfaceCtx) return false;
      state = {surface, ctx:surfaceCtx, width, height, plan:null, references:[], readiness:[]};
    }
    let dirty = state.plan !== plan;
    for(let i = 0; i < plan.sources.length; i++){
      const image = cache[plan.sources[i]], ready = isReady(image);
      if(state.references[i] !== image || state.readiness[i] !== ready) dirty = true;
      state.references[i] = image; state.readiness[i] = ready;
    }
    if(dirty){ paintSurface({ctx:state.ctx, surface:state.surface, map, plan, cache}); state.plan = plan; }
    ctx.drawImage(state.surface, rect.x, rect.y, rect.w, rect.h);
    return true;
  };
}

const hudRenderers = new WeakMap();
export function drawMiniMapScenery(options){
  if(!options.cache) return false;
  let renderer = hudRenderers.get(options.ctx);
  if(!renderer){ renderer = createMiniMapSceneryRenderer(); hudRenderers.set(options.ctx, renderer); }
  return renderer(options);
}
