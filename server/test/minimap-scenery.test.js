import {drawMiniMapFrame} from "../../src/game/render/miniMapChrome.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MAPS } from "../../src/game/combatData/maps.js";
import { createHelionOneVisualMaps } from "../../src/game/combatData/helionOneVisuals.js";
import { createMiniMapState } from "../../src/game/systems/minimapState.js";
import { getMiniMapLayout, MINI_MAP_CONTENT_RATIO } from "../../src/game/systems/miniMapLayout.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { getMiniMapVisualDefinition } from "../../src/game/combatData/miniMapVisuals.js";
import { getFirmHomeMapTheme } from "../../src/shared/firmHomeMapThemes.js";
import {
  createMiniMapSceneryRenderer,
  getMiniMapLandmarkPosition, getMiniMapSceneryLayers, createMiniMapSnapshotMap
} from "../../src/game/render/miniMapScenery.js";

const helion = createHelionOneVisualMaps(MAPS).find(map=>map.id === 0);
const planet = helion.parallaxScene.images.find(layer=>layer.kind === "planet");

function fakeContext(){
  const calls = [];
  const ctx = {calls};
  for(const name of ["setTransform", "clearRect", "fillRect", "strokeRect", "save", "restore",
    "translate", "rotate", "scale", "drawImage", "beginPath", "rect", "clip", "setLineDash", "moveTo", "lineTo", "closePath", "stroke", "fill", "arc", "fillText"]){
    ctx[name] = (...args)=>calls.push({name, args});
  }
  ctx.createLinearGradient = ctx.createRadialGradient = ()=>({addColorStop(){}});
  return ctx;
}

function rendererFixture(){
  const surfaces = [];
  const draw = createMiniMapSceneryRenderer({createCanvas(width, height){
    const ctx = fakeContext();
    const surface = {width, height, ctx, getContext:()=>ctx};
    surfaces.push(surface);
    return surface;
  }});
  const cache = Object.fromEntries([
    ...helion.parallaxScene.images, ...helion.parallaxScene.backdrops,
    {src:helion.spawn.visual.asset}, ...helion.spawnStations.map(station=>({src:station.asset}))
  ].map(layer=>[layer.src, {src:layer.src, complete:true, naturalWidth:1254, naturalHeight:1254}]));
  const options = {ctx:fakeContext(), currentMap:helion, cache,
    camera:{x:-4300 - 1200, y:3300 - 600}, viewWidth:2400, viewHeight:1200,
    rect:{x:800, y:200, w:340, h:272}};
  return {draw, surfaces, options};
}

test("Helion landmarks remain fixed across player movement, camera changes and zoom", ()=>{
  for(const [x, y] of [[-4300, 3300], [-3270, 2540], [0, 0], [4300, -3300]]){
    for(const zoom of [.68, .78, 1.25]){
      const viewWidth = 1880 / zoom, viewHeight = 950 / zoom;
      const camera = {x:x - viewWidth / 2, y:y - viewHeight / 2};
      for(const layer of helion.parallaxScene.images.filter(layer=>["planet", "stellar"].includes(layer.kind))){
        const point = getMiniMapLandmarkPosition({map:helion, layer, camera, viewWidth, viewHeight});
        const placement = getMiniMapVisualDefinition(helion).landmarks[layer.kind];
        assert.deepEqual(point, {x:(placement.x - .5) * helion.width, y:(placement.y - .5) * helion.height});
      }
    }
  }
  const view = {camera:{x:-5500, y:2700}, viewWidth:2400, viewHeight:1200};
  const start = getMiniMapLandmarkPosition({map:helion, layer:planet, ...view});
  const end = getMiniMapLandmarkPosition({map:helion, layer:planet, ...view, camera:{x:500, y:2700}});
  assert.deepEqual(end, start);
  const path = getMiniMapVisualDefinition(helion).image;
  assert.ok(getCombatMapAssetPaths(helion).includes(path));
  assert.equal(getMiniMapVisualDefinition({...helion, name:"BRECHE DE RICKY"}), null);
  const png = readFileSync(new URL("../../" + path, import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 540);
});

test("minimap retains the planet and brilliant nebula and omits all 350 rocks and wrecks", ()=>{
  const layers = getMiniMapSceneryLayers(helion.parallaxScene);
  assert.equal(layers.filter(layer=>layer.kind === "planet").length, 1);
  assert.equal(layers.filter(layer=>layer.kind === "stellar").length, 1);
  assert.equal(layers.filter(layer=>layer.kind === "cloud").length, 0);
  assert.equal(layers.some(layer=>["asteroid", "wreck"].includes(layer.kind)), false);
  const snapshot = createMiniMapSnapshotMap(helion);
  assert.equal(snapshot.parallaxScene.backdrops.length, 1);
  assert.ok(snapshot.parallaxScene.backdrops[0].w > helion.width * 2);
  assert.deepEqual(snapshot.parallaxScene.foregroundClouds, []);
  assert.deepEqual(snapshot.parallaxScene.lightClouds, []);
  const {draw, surfaces, options} = rendererFixture();
  draw(options);
  const images = surfaces[0].ctx.calls.filter(call=>call.name === "drawImage").map(call=>call.args[0].src);
  assert.ok(images.includes(planet.src));
  assert.ok(images.includes(helion.parallaxScene.images.find(layer=>layer.kind === "stellar").src));
  assert.ok(images.includes(helion.spawn.visual.asset));
  assert.equal(images.some(src=>/asteroid|wreck|frigate/.test(src)), false);
});

test("all home-sector overviews share Helion proportions with landmarks placed in their own corners", ()=>{
  const homes=createHelionOneVisualMaps(MAPS).filter(getFirmHomeMapTheme);
  const reference=getMiniMapVisualDefinition(helion);
  for(const map of homes){
    const definition=getMiniMapVisualDefinition(map),theme=getFirmHomeMapTheme(map);
    assert.equal(getMiniMapVisualDefinition({...map}),definition,"overview metadata remains stable for renderer caching");
    const png=readFileSync(new URL("../../"+definition.image,import.meta.url));
    assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),540);
    const snapshot=createMiniMapSnapshotMap(map);
    for(const kind of ["planet","stellar"]){
      const original=reference.landmarks[kind],placement=definition.landmarks[kind];
      assert.equal(placement.width,original.width);
      assert.ok(Math.abs(placement.x-(theme.mirrorX<0?1-original.x:original.x))<1e-10);
      assert.ok(Math.abs(placement.y-(theme.mirrorY<0?1-original.y:original.y))<1e-10);
      const layer=snapshot.parallaxScene.images.find(layer=>layer.kind===kind);
      assert.equal(layer.w/map.width,original.width);
      const before=getMiniMapLandmarkPosition({map,layer,camera:{x:-5000,y:-4000}});
      const after=getMiniMapLandmarkPosition({map,layer,camera:{x:5000,y:4000}});
      assert.deepEqual(after,before);
    }
    const cache={[definition.image]:{src:definition.image,complete:true,naturalWidth:1200,naturalHeight:540}};
    const surfaces=[];
    const draw=createMiniMapSceneryRenderer({createCanvas(width,height){const ctx=fakeContext();surfaces.push(ctx);return {width,height,getContext:()=>ctx};}});
    draw({ctx:fakeContext(),currentMap:map,cache,stations:[],rect:{x:0,y:0,w:480,h:216}});
    assert.equal(surfaces[0].calls.find(call=>call.name === "drawImage").args[0],cache[definition.image]);
    assert.ok(getCombatMapAssetPaths(map).includes(definition.image));
  }
  assert.equal(getMiniMapVisualDefinition(MAPS.find(map=>map.id===22)),null);
});

test("movement, zoom and dragging never rebuild the fixed background; resize and map changes do", ()=>{
  const {draw, surfaces, options} = rendererFixture();
  const paints = ()=>surfaces.reduce((count, surface)=>count + surface.ctx.calls.filter(call=>call.name === "clearRect").length, 0);
  draw(options);
  assert.equal(paints(), 1);
  for(let i = 0; i < 60; i++) draw(options);
  draw({...options, stations:helion.spawnStations.map(station=>({...station}))});
  draw({...options, rect:{...options.rect, x:100, y:400}});
  draw({...options, camera:{...options.camera, x:options.camera.x + 2}});
  assert.equal(paints(), 1);
  draw({...options, camera:{...options.camera, x:options.camera.x + 100}});
  assert.equal(paints(), 1);
  draw({...options, viewWidth:1900});
  assert.equal(paints(), 1);
  for(let i = 0; i < 240; i++){
    draw({...options, camera:{x:-5000 + i * 40, y:4000 - i * 30}, viewWidth:1000 + i, viewHeight:600 + i});
  }
  assert.equal(paints(), 1);
  draw({...options, rect:{...options.rect, w:400, h:320}});
  assert.equal(paints(), 2);
  assert.equal(surfaces.length, 2);
  draw({...options, currentMap:{...helion, parallaxScene:{...helion.parallaxScene, background:["#000", "#111", "#000"]}}});
  assert.equal(paints(), 3);
  const surface = surfaces.at(-1);
  const callStart = surface.ctx.calls.length;
  draw({...options, stations:[]});
  const visibleImages = surface.ctx.calls.slice(callStart).filter(call=>call.name === "drawImage").map(call=>call.args[0].src);
  assert.ok(visibleImages.includes(helion.spawn.visual.asset));
  assert.equal(visibleImages.some(src=>helion.spawnStations.some(station=>station.asset === src)), false,
    "services hidden by the world renderer must also disappear from the minimap");
});

test("late-loading or replaced textures invalidate the background without moving the player", ()=>{
  const {draw, surfaces, options} = rendererFixture();
  const image = options.cache[planet.src];
  image.complete = false;
  image.naturalWidth = 0;
  draw(options);
  const imageCount = ()=>surfaces[0].ctx.calls.filter(call=>call.name === "drawImage" && call.args[0].src === planet.src).length;
  assert.equal(imageCount(), 0);
  image.complete = true;
  image.naturalWidth = 1254;
  draw(options);
  assert.equal(imageCount(), 1);
  draw(options);
  assert.equal(imageCount(), 1);
  options.cache[planet.src] = {...image};
  draw(options);
  assert.equal(imageCount(), 2);
  const path = getMiniMapVisualDefinition(helion).image;
  options.cache[path] = {src:path, complete:true, naturalWidth:1200, naturalHeight:960};
  draw(options);
  assert.ok(surfaces[0].ctx.calls.some(call=>call.name === "drawImage" && call.args[0].src === path));
});

test("the loaded sector capture is drawn as one image rather than many separate clouds", ()=>{
  const {draw, surfaces, options} = rendererFixture();
  const path = getMiniMapVisualDefinition(helion).image;
  options.cache[path] = {src:path, complete:true, naturalWidth:1200, naturalHeight:960};
  draw(options);
  const calls = surfaces[0].ctx.calls.filter(call=>call.name === "drawImage");
  assert.equal(calls[0].args[0].src, path);
  assert.deepEqual(calls[0].args.slice(1), [0, 0, helion.width, helion.height]);
  assert.equal(calls.length, 4, "one captured background plus the three existing buildings");
  assert.equal(calls.some(call=>/nebula-crimson|stellar-corona|planet-crimson/.test(call.args[0].src)), false);
});

test("existing layouts, resize and map changes keep the landscape proportions and click coordinates", ()=>{
  let map = helion;
  const canvas = {width:1920, height:950};
  const minimap = createMiniMapState({canvas, getCurrentMap:()=>map,
    initialLayout:{x:1450, y:600, w:366, h:203}});
  for(const step of [()=>{}, ()=>minimap.resize(28), ()=>minimap.resize(1000), ()=>{map={width:11000, height:8200};}]){
    step();
    const rect = minimap.rect();
    const {content} = getMiniMapLayout(rect);
    assert.ok(Math.abs(content.h / content.w - MINI_MAP_CONTENT_RATIO) <= 1 / content.w);
    assert.ok(rect.x >= 0 && rect.x + rect.w <= canvas.width);
    assert.ok(rect.y >= 0 && rect.y + rect.h <= canvas.height);
    assert.ok(rect.h <= 430);
    const target = {x:-3270, y:2540};
    const px = content.x + (target.x + map.width / 2) / map.width * content.w;
    const py = content.y + (target.y + map.height / 2) / map.height * content.h;
    const world = minimap.worldFromPoint(px, py);
    assert.ok(Math.abs(world.x - target.x) < 1e-8 && Math.abs(world.y - target.y) < 1e-8);
    assert.equal(minimap.hitTest(px, py).type, "map");
  }
});

test("minimap frame and coordinate bar never navigate; buttons and header retain their actions", ()=>{
  const minimap = createMiniMapState({canvas:{width:1280, height:720}, getCurrentMap:()=>helion});
  const rect = minimap.rect();
  const {content, minus, plus, footer} = getMiniMapLayout(rect);
  assert.equal(minimap.hitTest(rect.x + 50, rect.y + 20).type, "drag");
  assert.equal(minimap.hitTest(footer.x + 25, footer.y + 15).type, "frame");
  assert.equal(minimap.hitTest(rect.x + 2, content.y + 30).type, "frame");
  assert.equal(minimap.hitTest(minus.x + 12, minus.y + 11).delta, -28);
  assert.equal(minimap.hitTest(plus.x + 12, plus.y + 11).delta, 28);
  assert.deepEqual(minimap.worldFromPoint(content.x, content.y), {x:-helion.width / 2, y:-helion.height / 2});
  assert.deepEqual(minimap.worldFromPoint(content.x + content.w, content.y + content.h), {x:helion.width / 2, y:helion.height / 2});
});

test("legacy minimum layouts migrate to a 242 by 183 widget and stay compact after reload", ()=>{
  const canvas = {width:1920, height:950};
  const mini = createMiniMapState({canvas, getCurrentMap:()=>helion,
    initialLayout:{x:1530, y:700, w:220, h:237}});
  for(let i = 0; i < 20; i++) mini.resize(-28);
  const rect = mini.rect();
  assert.equal(rect.w, 242);
  assert.equal(rect.h, 183);
  assert.ok(rect.h < 237 && rect.w > 220);
  const restored = createMiniMapState({canvas, getCurrentMap:()=>helion, initialLayout:mini.snapshot()});
  assert.deepEqual(restored.snapshot(), mini.snapshot());
  const previousMinimum = createMiniMapState({canvas, getCurrentMap:()=>helion, initialLayout:{w:300, h:192}});
  assert.equal(previousMinimum.rect().w, 242);
  assert.equal(previousMinimum.rect().h, 183);
});

test("saved wide layouts narrow once while preserving their height and right edge", ()=>{
  const canvas = {width:1920, height:1080};
  for(const [widthVersion, widths, previousRatio] of [[0, [280, 360, 448, 720], 9 / 20], [1, [254, 326, 404, 650], 1 / 2]]){
   for(const width of widths){
    const previous = {x:1920 - width - 18, y:620, w:width, widthVersion};
    const mini = createMiniMapState({canvas, getCurrentMap:()=>helion, initialLayout:previous});
    const next = mini.rect();
    assert.equal(next.h, Math.round((width - 16) * previousRatio) + 64);
    assert.equal(next.x + next.w, previous.x + previous.w);
    assert.ok(next.w < width);
    assert.equal(next.y, previous.y);
    const restored = createMiniMapState({canvas, getCurrentMap:()=>helion, initialLayout:mini.snapshot()});
    assert.deepEqual(restored.snapshot(), mini.snapshot());
    mini.applyLayout(mini.snapshot());
    assert.deepEqual(mini.snapshot(), restored.snapshot());
   }
  }
});

test("a wide minimap preserves the native proportions of planets and station illustrations", ()=>{
  const {draw, surfaces, options} = rendererFixture();
  draw({...options, rect:{x:0, y:0, w:300, h:135}});
  const calls = surfaces[0].ctx.calls;
  const transform = calls.find(call=>call.name === "setTransform").args;
  const compensation = calls.find(call=>call.name === "scale" && call.args[0] === 1 && call.args[1] > 1).args[1];
  assert.ok(Math.abs(transform[0] - transform[3] * compensation) < 1e-10,
    "world positions use the wide projection while sprite width and height use the same visual scale");
});

test("the header planet follows the sector, independently of the player's faction",()=>{
 const cache=Object.fromEntries(['astra','cyan','jaune','verte'].map(firm=>['assets/firms/'+firm+'.svg',{complete:true,naturalWidth:64,firm}]));
 for(const [name,firm] of [['Helion-03','astra'],['Nereid-02','cyan'],['Cygnus-03','cyan'],['Aureon-04','jaune'],['Sylva-05','verte']]){
  const ctx=fakeContext();drawMiniMapFrame({ctx,cache,rect:{x:0,y:0,w:340,h:333},currentMap:{name},player:{x:0,y:0,firmId:'astra'}});
  const icons=ctx.calls.filter(call=>call.name==='drawImage');
  assert.equal(icons.length,1);assert.equal(icons[0].args[0].firm,firm);
 }
});
