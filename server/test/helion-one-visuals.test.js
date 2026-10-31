import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData.js";
import { HELION_ONE_ASSETS, createHelionOneVisualMaps } from "../../src/game/combatData/helionOneVisuals.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { drawWorldLayer } from "../../src/game/render/world.js";
import { getVisibleMapSceneryRect, getMapSceneryEdgeOpacity } from "../../src/game/render/mapSceneryBounds.js";
import { projectMapSceneryLayer } from "../../src/game/render/mapSceneryProjection.js";
import { getMapSceneryLightSprite } from "../../src/game/render/mapSceneryLights.js";
import { getMapScenerySkyFadeBands, drawMapScenerySkyFade } from "../../src/game/render/mapScenerySky.js";
import { getFirmHomeMapTheme, getFirmHomeAssetPath } from "../../src/shared/firmHomeMapThemes.js";

test("the four home visuals preserve every other map and all gameplay data", ()=>{
  const original = JSON.stringify(MAPS);
  const visualMaps = createHelionOneVisualMaps(MAPS);
  assert.equal(visualMaps.length, MAPS.length);
  for(let index = 0; index < MAPS.length; index++){
    const theme = getFirmHomeMapTheme(MAPS[index]);
    if(!theme){
      assert.equal(visualMaps[index], MAPS[index]);
      continue;
    }
    const {parallaxScene:oldScene, closeStarCount:oldStars, ...oldGameplay} = MAPS[index];
    const {parallaxScene:newScene, closeStarCount:newStars, ...newGameplay} = visualMaps[index];
    assert.deepEqual(newGameplay, oldGameplay);
    assert.notEqual(newScene, oldScene);
    assert.ok(newStars < oldStars);
    const planet = newScene.images.find(layer=>layer.src === getFirmHomeAssetPath(HELION_ONE_ASSETS.planet, theme));
    assert.ok(planet.x * theme.mirrorX < 0);
    assert.ok(planet.y * theme.mirrorY > 0);
  }
  assert.equal(JSON.stringify(MAPS), original, "the shared firm template must remain unchanged");
});

test("Helion's separate decor assets are discovered by map streaming", ()=>{
  const map = createHelionOneVisualMaps(MAPS).find(entry=>entry.id === 0);
  const paths = getCombatMapAssetPaths(map);
  for(const src of Object.values(HELION_ONE_ASSETS)) assert.ok(paths.includes(src), src);
  assert.equal(paths.length, new Set(paths).size);
});

function renderLayer(layer, camera, graphicsEffects = {}, overrides = {}){
  const translations = [];
  const images = [];
  const imageAlphas = [];
  const events = [];
  const fills = [];
  const bounds = [];
  let depth = 0;
  const ctx = new Proxy({
    save:()=>depth++,
    restore:()=>depth--,
    createLinearGradient:()=>{events.push("gradient"); return {addColorStop(){}};},
    fillRect:(...args)=>{fills.push({args,style:ctx.fillStyle,alpha:ctx.globalAlpha});events.push("fill");},
    rect:(...args)=>events.push({clipRect:args}),
    clip:()=>events.push("clip"),
    strokeRect:(...args)=>{bounds.push(args);events.push("boundary");},
    translate:(x,y)=>translations.push({x,y}),
    drawImage:(...args)=>{images.push(args);imageAlphas.push(ctx.globalAlpha);events.push("image");}
  }, {get:(target, key)=>key in target ? target[key] : ()=>{}});
  const image = {complete:true, naturalWidth:1536, naturalHeight:1024};
  const sourceLayers = [...(overrides.scene?.images || [layer]), ...(overrides.scene?.backdrops || [])];
  const cache = Object.fromEntries(sourceLayers.map(entry=>[entry.src,{...image,src:entry.src}]));
  drawWorldLayer({
    ctx, canvas:{width:800,height:600}, cache, camera,
    currentMap:{id:"world-layer-test", width:10000, height:8000,
      parallaxScene:{enabled:true, hideGrid:true, images:[layer], ...overrides.scene}},
    stars:[], dust:[], nebulae:[], asteroids:[], stations:[], player:{},
    graphicsQuality:"low", graphicsEffects,
    getMapPortals:()=>[], getClosedMapPortals:()=>[],
    ...(overrides.canvas ? {canvas:overrides.canvas} : {})
  });
  return {translations, images, imageAlphas, events, fills, bounds, depth};
}

test("world decor follows map coordinates while distant decor retains parallax", ()=>{
  const layer = {src:"decor.png",x:140,y:290,w:64,h:64,p:1};
  const camera = {x:100,y:200};
  const world = renderLayer({...layer,space:"world"}, camera);
  const distant = renderLayer(layer, camera);
  assert.ok(world.translations.some(point=>point.x === 40 && point.y === 90));
  assert.ok(distant.translations.some(point=>point.x === 440 && point.y === 390));
});

test("cloud landmarks stay at world positions across camera moves and viewport sizes", ()=>{
  const layer = {src:"cloud.png",space:"world",x:140,y:290,w:64,h:64};
  const draw = (camera,canvas)=>renderLayer(layer,camera,{nebulae:true},{
    scene:{images:[],backdrops:[layer]},canvas
  });
  assert.ok(draw({x:100,y:200}).translations.some(point=>point.x === 40 && point.y === 90));
  assert.ok(draw({x:120,y:230}).translations.some(point=>point.x === 20 && point.y === 60));
  assert.ok(draw({x:100,y:200},{width:1600,height:900}).translations.some(point=>point.x === 40 && point.y === 90));
  const {space,...legacyLayer} = layer;
  const legacy = renderLayer(legacyLayer,{x:100,y:200},{nebulae:true},{scene:{images:[],backdrops:[legacyLayer]}});
  assert.ok(legacy.translations.some(point=>point.x === 536 && point.y === 582));
});

test("cloud culling keeps visible rotated corners and honours the nebula setting", ()=>{
  const layer = {src:"cloud.png",space:"world",x:0,y:300,w:1000,h:1000,p:1,rotation:Math.PI/4};
  const scene = {images:[],backdrops:[layer]};
  assert.equal(renderLayer(layer,{x:680,y:0},{nebulae:true},{scene}).images.length, 1);
  assert.equal(renderLayer(layer,{x:5000,y:0},{nebulae:true},{scene}).images.length, 0);
  assert.equal(renderLayer(layer,{x:0,y:0},{nebulae:false},{scene}).images.length, 0);
});

test("off-screen world decor is culled and asteroid decor respects the graphics toggle", ()=>{
  const layer = {src:"decor.png",space:"world",effect:"backgroundAsteroids",x:140,y:290,w:64,h:64,p:1};
  assert.equal(renderLayer(layer,{x:100,y:200}).images.length, 1);
  assert.equal(renderLayer(layer,{x:2000,y:2000}).images.length, 0);
  assert.equal(renderLayer(layer,{x:100,y:200},{backgroundAsteroids:false}).images.length, 0);
});

test("the asteroid atlas draws the selected rock alone at the requested size", ()=>{
  const layer = {src:"atlas.png",space:"world",x:140,y:290,w:64,h:64,p:1,
    frame:{x:2/3,y:1/2,w:1/3,h:1/2}};
  const result = renderLayer(layer, {x:100,y:200});
  assert.deepEqual(result.images[0].slice(1), [1024,512,512,512,-32,-32,64,64]);
  assert.equal(result.depth, 0);
});

test("Helion's small varied asteroids replace the old fields throughout the sector", ()=>{
  const map = createHelionOneVisualMaps(MAPS).find(entry=>entry.id === 0);
  const scene = map.parallaxScene;
  const rocks = scene.images.filter(layer=>layer.src === HELION_ONE_ASSETS.asteroids);
  assert.ok(rocks.length >= 300 && rocks.length <= 350);
  assert.equal(new Set(rocks.map(rock=>`${rock.frame.x}:${rock.frame.y}`)).size, 6);
  assert.deepEqual(scene.asteroidFields, []);
  for(const rock of rocks){
    assert.equal(rock.space, "map");
    assert.ok(rock.p >= .34 && rock.p <= .94);
    assert.ok(rock.w >= 22 && rock.w <= 84);
    assert.ok(Math.abs(rock.h / rock.w - rock.frame.h * 1024 / (rock.frame.w * 1536)) < 1e-10);
    assert.ok(rock.alpha >= .72 && rock.alpha <= 1);
    if(rock.p > .86) assert.ok(rock.alpha >= .94);
    assert.ok(Math.abs(rock.x) + rock.w / 2 <= map.width / 2);
    assert.ok(Math.abs(rock.y) + rock.h / 2 <= map.height / 2);
  }
  for(const sx of [-1,1]) for(const sy of [-1,1]){
    assert.ok(rocks.filter(rock=>rock.x * sx > 0 && rock.y * sy > 0).length > 25);
  }
  assert.deepEqual(createHelionOneVisualMaps(MAPS).find(entry=>entry.id === 0).parallaxScene, scene);
});

test("map scenery clips correctly on every side, at corners and entirely outside", ()=>{
  const map = {width:10000,height:8000};
  const rect = (x,y,width=800,height=600)=>getVisibleMapSceneryRect({map,camera:{x,y},width,height});
  assert.deepEqual(rect(0,0), {x:0,y:0,width:800,height:600});
  assert.deepEqual(rect(-5200,100), {x:200,y:0,width:600,height:600});
  assert.deepEqual(rect(4800,100), {x:0,y:0,width:200,height:600});
  assert.deepEqual(rect(100,-4100), {x:0,y:100,width:800,height:500});
  assert.deepEqual(rect(100,3800), {x:0,y:0,width:800,height:200});
  assert.deepEqual(rect(-5200,-4100), {x:200,y:100,width:600,height:500});
  assert.deepEqual(rect(-5250,-4050,1000,750), {x:250,y:50,width:750,height:700});
  for(const [x,y] of [[5000,0],[0,4000],[-5900,0],[0,-4700],[5200,4200]]){
    assert.equal(rect(x,y), null);
  }
});

test("the black void and map contour stay visible with the grid hidden and low settings", ()=>{
  const layer = {src:"decor.png",space:"world",x:-4950,y:290,w:64,h:64,p:1};
  const result = renderLayer(layer, {x:-5200,y:200}, {}, {scene:{clipToBounds:true}});
  assert.deepEqual(result.fills[0], {args:[0,0,800,600],style:"#000000",alpha:1});
  assert.ok(result.events.indexOf("clip") < result.events.indexOf("gradient"));
  assert.ok(result.events.indexOf("image") < result.events.indexOf("boundary"));
  assert.deepEqual(result.events.find(event=>event.clipRect)?.clipRect, [200,0,600,600]);
  assert.deepEqual(result.bounds, [[200,-4200,10000,8000]]);
  assert.equal(result.depth, 0);
});

test("the scenery clip uses the zoomed logical viewport and skips decor entirely outside", ()=>{
  const layer = {src:"decor.png",space:"world",x:-4950,y:0,w:64,h:64,p:1};
  const scene = {clipToBounds:true};
  const result = renderLayer(layer, {x:-5250,y:-4050}, {}, {
    scene,canvas:{width:800,height:600,__renderWidth:1000,__renderHeight:750}
  });
  assert.deepEqual(result.fills[0].args, [0,0,1000,750]);
  assert.deepEqual(result.events.find(event=>event.clipRect)?.clipRect, [250,50,750,700]);
  const outside = renderLayer(layer, {x:-5900,y:0}, {}, {scene});
  assert.equal(outside.fills.length, 1);
  assert.equal(outside.images.length, 0);
  assert.ok(!outside.events.includes("gradient"));
  assert.equal(outside.depth, 0);
  const inside = renderLayer(layer, {x:0,y:0}, {}, {scene});
  const viewportFills = inside.fills.filter(fill=>fill.args.join() === "0,0,800,600");
  assert.equal(viewportFills.length, 1, "the map background alone fills a wholly inside viewport");
  assert.notEqual(viewportFills[0].style, "#000000");
});

test("map depth anchors give the planet, dust and rocks different camera speeds", ()=>{
  const scene = createHelionOneVisualMaps(MAPS).find(map=>map.id === 0).parallaxScene;
  const planet = scene.images.find(layer=>layer.kind === "planet");
  const nearDust = scene.images.find(layer=>layer.kind === "cloud" && layer.p > .8);
  const rocks = scene.images.filter(layer=>layer.kind === "asteroid");
  const farRock = rocks.find(layer=>layer.p < .45);
  const nearRock = rocks.find(layer=>layer.p > .86);
  for(const layer of [planet,nearDust,farRock,nearRock]){
    const project = camera=>projectMapSceneryLayer({layer,camera,viewWidth:1280,viewHeight:720,defaultParallax:1});
    const before = project({x:-4940,y:2940}), after = project({x:-3940,y:2440});
    assert.ok(Math.abs(after.x - before.x + layer.p * 1000) < 1e-9);
    assert.ok(Math.abs(after.y - before.y - layer.p * 500) < 1e-9);
  }
  assert.ok(planet.p >= .06 && planet.p <= .08, "a distant planet shifts only 60 to 80 logical pixels per 1000 units");
  assert.ok(nearDust.p > farRock.p && nearRock.p > farRock.p);
  assert.ok(nearRock.p < 1, "decor must not be locked to the gameplay plane");
});

test("a map depth anchor stays centred at its location across resolution and zoom changes", ()=>{
  const layer = {space:"map",x:1200,y:-300,p:.6};
  for(const [width,height] of [[800,600],[1912,900],[800/.78,600/.78]]){
    const camera = {x:layer.x-width/2,y:layer.y-height/2};
    const point = projectMapSceneryLayer({layer,camera,viewWidth:width,viewHeight:height,defaultParallax:1});
    assert.ok(Math.abs(point.x-width/2)<1e-9);
    assert.ok(Math.abs(point.y-height/2)<1e-9);
  }
});

test("Helion fades all decorative layers including the planet outside, without clipping or contour", ()=>{
  const scene = createHelionOneVisualMaps(MAPS).find(map=>map.id === 0).parallaxScene;
  const planet = scene.images.find(layer=>layer.kind === "planet");
  for(let index=1;index<scene.images.length;index++) assert.ok(scene.images[index].p >= scene.images[index-1].p);
  const outside = renderLayer(planet,{x:-6000,y:2700},{nebulae:true},{scene});
  assert.equal(scene.clipToBounds,false);
  assert.ok(!outside.events.includes("clip"));
  assert.ok(outside.fills.some(fill=>fill.style === "#000000"));
  assert.ok(outside.images.some(args=>args[0].src === HELION_ONE_ASSETS.planet));
  assert.ok(outside.images.some(args=>args[0].src === HELION_ONE_ASSETS.nebula || args[0].src === HELION_ONE_ASSETS.dust));
  assert.ok(!outside.images.some(args=>[HELION_ONE_ASSETS.asteroids,HELION_ONE_ASSETS.wreck,HELION_ONE_ASSETS.frigate].includes(args[0].src)));
  assert.ok(outside.events.lastIndexOf("fill") > outside.events.lastIndexOf("image"), "the final scenery fade must cover the planet too");
  assert.deepEqual(outside.bounds,[]);
  assert.equal(outside.depth,0);
});

test("close scenery fades smoothly inside every border with its complete rotated footprint", ()=>{
  const map = {width:10000,height:8000,parallaxScene:{edgeFadeDistance:460}};
  const opacity = (x,y,options={})=>getMapSceneryEdgeOpacity({map,x,y,width:80,height:40,...options});
  assert.equal(opacity(0,0),1);
  for(const sign of [-1,1]){
    assert.equal(opacity(sign*4960,0),0);
    assert.equal(opacity(sign*4730,0),.5);
    assert.equal(opacity(sign*4500,0),1);
    assert.equal(opacity(0,sign*3980),0);
    assert.equal(opacity(0,sign*3750),.5);
    assert.equal(opacity(0,sign*3520),1);
    assert.equal(opacity(sign*5100,sign*4100),0);
    assert.equal(opacity(sign*4980,0,{rotation:Math.PI/2}),0);
  }
  assert.equal(getMapSceneryEdgeOpacity({map:{width:10000,height:8000},x:9000,y:9000}),1);
});

test("close-layer fading follows its apparent position after parallax and honours the graphics toggle", ()=>{
  const layer = {src:"rock.png",space:"map",x:-4900,y:0,w:80,h:40,p:.5,alpha:.8,edgeFade:true};
  const scene = {edgeFadeDistance:460};
  // The anchor is near the border, but the visible rock remains well inside on the first view.
  const inside = renderLayer(layer,{x:-4400,y:-300},{},{scene});
  const partial = renderLayer(layer,{x:-4800,y:-300},{},{scene});
  const outside = renderLayer(layer,{x:-5500,y:-300},{},{scene});
  assert.equal(inside.images.length,1);
  assert.ok(inside.imageAlphas[0] > partial.imageAlphas[0]);
  assert.ok(partial.imageAlphas[0] > 0 && partial.imageAlphas[0] < .8);
  assert.equal(outside.images.length,0);
  assert.equal(renderLayer({...layer,effect:"backgroundAsteroids"},{x:-4400,y:-300},{backgroundAsteroids:false},{scene}).images.length,0);
});

test("Helion leaves the spawn free of medium and close cloud footprints while retaining slow distant coverage", ()=>{
  const map = createHelionOneVisualMaps(MAPS).find(map=>map.id === 0);
  const scene = map.parallaxScene;
  const localClouds = scene.images.filter(layer=>layer.kind === "cloud");
  assert.equal(localClouds.length,5);
  assert.equal(localClouds.filter(layer=>layer.p > .8).length,2);
  assert.ok(localClouds.every(layer=>layer.edgeFade));
  for(const layer of localClouds){
    const distance = Math.hypot((layer.x-map.spawn.x)*layer.p,(layer.y-map.spawn.y)*layer.p);
    assert.ok(distance > Math.hypot(layer.w,layer.h)/2 + 500);
  }
  for(const x of [-5000,-2500,0,2500,5000]) for(const y of [-4000,-2000,0,2000,4000]){
    assert.ok(scene.backdrops.some(layer=>{
      assert.ok(layer.p <= .12 && layer.p > 0 && !layer.edgeFade);
      const point = projectMapSceneryLayer({layer,camera:{x:x-640,y:y-360},viewWidth:1280,viewHeight:720,defaultParallax:1});
      return Math.abs(point.x-640) < layer.w/2 && Math.abs(point.y-360) < layer.h/2;
    }),`distant haze around ${x},${y}`);
  }
});

test("near clouds still draw after the planet and static light textures are cached", ()=>{
  const scene = createHelionOneVisualMaps(MAPS).find(map=>map.id === 0).parallaxScene;
  const planet = {...scene.images.find(layer=>layer.kind === "planet"),x:0,y:0,w:600,h:600};
  const cloud = {...scene.images.find(layer=>layer.kind === "cloud" && layer.p > .8),x:0,y:0,w:200,h:100};
  const result = renderLayer(planet,{x:-400,y:-300},{nebulae:true},{scene:{images:[planet,cloud],edgeFadeDistance:460}});
  assert.equal(result.images[0][0].src,planet.src);
  assert.equal(result.images[1][0].src,cloud.src);
  const previousDocument = globalThis.document;
  let builds=0,gradients=0;
  globalThis.document={createElement(){builds++;return {getContext(){return {
    createRadialGradient(){gradients++;return {addColorStop(){}};},fillRect(){}
  };}};}};
  try{
    const light={static:true,alpha:.4};
    const first=getMapSceneryLightSprite(light);
    assert.equal(first.width,512);
    assert.equal(first.height,512);
    assert.equal(getMapSceneryLightSprite(light),first);
    assert.equal(builds,1);
    assert.equal(gradients,2);
    assert.ok(scene.starLights.length >= 2 && scene.starLights.every(entry=>entry.static && entry.point === false));
    const enabled=renderLayer(planet,{x:-400,y:-300},{starGlow:true},{scene:{images:[],starLights:[{...light,x:0,y:0,space:"map",p:.1,r:300}]}});
    assert.equal(enabled.images.length,1);
    const disabled=renderLayer(planet,{x:-400,y:-300},{starGlow:false},{scene:{images:[],starLights:scene.starLights}});
    assert.equal(disabled.images.length,0);
  }finally{
    if(previousDocument === undefined) delete globalThis.document;
    else globalThis.document=previousDocument;
  }
});

test("the smaller distant planet shifts slightly down-right and stays visible on a long rightward trip", ()=>{
  const map=createHelionOneVisualMaps(MAPS).find(map=>map.id === 0);
  const planet=map.parallaxScene.images.find(layer=>layer.kind === "planet");
  const previous={...planet,x:-9050,y:7800,w:1560,h:1560,p:.12};
  assert.ok(planet.w < previous.w && planet.w >= previous.w*.85);
  for(const [width,height] of [[800,600],[1280/.78,720/.78],[1920,1080]]){
    const camera={x:map.spawn.x-width/2,y:map.spawn.y-height/2};
    const options={camera,viewWidth:width,viewHeight:height,defaultParallax:1};
    const before=projectMapSceneryLayer({...options,layer:previous});
    const after=projectMapSceneryLayer({...options,layer:planet});
    assert.ok(after.x-before.x >= 100 && after.x-before.x <= 150);
    assert.ok(after.y-before.y >= 40 && after.y-before.y <= 80);
    const farRight=projectMapSceneryLayer({...options,layer:planet,camera:{x:camera.x+6000,y:camera.y}});
    assert.ok(farRight.x+planet.w/2>0 && farRight.y-planet.h/2<height,
      "the planet remains in view after 6000 units to the right");
  }
  const options={viewWidth:1280/.78,viewHeight:720/.78,defaultParallax:1,layer:planet};
  const start={x:-2700-options.viewWidth/2,y:3300-options.viewHeight/2};
  const before=projectMapSceneryLayer({...options,camera:start});
  const after=projectMapSceneryLayer({...options,camera:{x:start.x+1700,y:start.y-900}});
  assert.ok(Math.abs(after.x-before.x)<260);
  assert.ok(after.x+planet.w/2>0 && after.y-planet.h/2<options.viewHeight);
});

test("solid distant wrecks remain behind rocks while the rejected explosion leaves rendering and streaming", ()=>{
  const scene=createHelionOneVisualMaps(MAPS).find(map=>map.id === 0).parallaxScene;
  const relics=scene.images.filter(layer=>["wreck","remnant"].includes(layer.kind));
  assert.equal(relics.length,2);
  for(const layer of relics){
    assert.equal(layer.space,"map");
    assert.equal(layer.kind,"wreck");
    assert.ok(layer.p > .12 && layer.p < .3 && layer.alpha >= .85 && layer.alpha <= 1 && layer.edgeFade);
    const firstRock=scene.images.findIndex(entry=>entry.kind === "asteroid");
    assert.ok(scene.images.indexOf(layer)<firstRock);
  }
  const star={...scene.images.find(layer=>layer.kind === "stellar"),x:0,y:0};
  assert.equal(renderLayer(star,{x:-400,y:-300},{starGlow:false}).images.length,0);
  assert.equal(renderLayer(star,{x:-400,y:-300},{starGlow:true}).images.length,1);
  assert.equal(renderLayer(star,{x:-400,y:-300}).images.length,0,"low settings omit additional star effects by default");
  const paths=getCombatMapAssetPaths(createHelionOneVisualMaps(MAPS).find(map=>map.id === 0));
  assert.ok(!paths.some(src=>src.includes("reactor-remnant")));
});

test("the stellar light moves slightly right without changing its height or depth", ()=>{
  const layer=createHelionOneVisualMaps(MAPS).find(map=>map.id === 0).parallaxScene.images.find(layer=>layer.kind === "stellar");
  const options={camera:{x:-4500,y:2000},viewWidth:1600,viewHeight:900,defaultParallax:1};
  const previous=projectMapSceneryLayer({...options,layer:{...layer,x:-5500}});
  const current=projectMapSceneryLayer({...options,layer});
  assert.ok(current.x-previous.x>=120 && current.x-previous.x<=180);
  assert.equal(current.y,previous.y);
  assert.equal(layer.p,.065);
});

test("sky falloff follows all four real borders and only reaches 120 units outside", ()=>{
  const map={width:10000,height:8000,parallaxScene:{skyFade:{inside:900,outside:120}}};
  const options={map,width:800,height:600};
  assert.deepEqual(getMapScenerySkyFadeBands({...options,camera:{x:-400,y:-300}}),[]);
  assert.equal(getMapScenerySkyFadeBands({...options,map:{...map,parallaxScene:{}},camera:{x:-6000,y:0}}).length,1);
  assert.deepEqual(getMapScenerySkyFadeBands({...options,map:{...map,parallaxScene:{skyFade:null}},camera:{x:-6000,y:0}}),[]);
  for(const zoom of [1,.78]) for(const [axis,sign,border] of [["x",-1,5000],["x",1,5000],["y",-1,4000],["y",1,4000]]){
    const width=800/zoom,height=600/zoom;
    const camera={x:-width/2,y:-height/2};
    camera[axis]+=sign*border;
    const bands=getMapScenerySkyFadeBands({map,camera,width,height});
    assert.equal(bands.length,1);
    const band=bands[0];
    assert.equal(band.axis,axis);
    assert.equal(band.end+camera[axis],sign*(border+120));
    assert.equal(band.start+camera[axis],sign*(border-900));
    assert.equal(band.solid,false);
    assert.ok(band.width>0 && band.height>0);
  }
});

test("scenery falloff is gradual and skips extra gradients once wholly outside", ()=>{
  const map={width:10000,height:8000,parallaxScene:{skyFade:{inside:900,outside:120}}};
  const stops=[],fills=[];
  let gradients=0,depth=0;
  const ctx={save(){depth++;},restore(){depth--;},
    createLinearGradient(){gradients++;return {addColorStop:(t,color)=>stops.push({t,color})};},
    fillRect(...rect){fills.push(rect);}};
  drawMapScenerySkyFade({ctx,map,camera:{x:-5400,y:-300},width:800,height:600});
  assert.equal(gradients,1);
  assert.equal(stops[0].color,"rgba(0,0,0,0)");
  assert.equal(stops.at(-1).color,"rgba(0,0,0,1)");
  assert.ok(stops.some(stop=>stop.color==="rgba(0,0,0,0.5)"));
  assert.equal(depth,0);
  gradients=0;fills.length=0;
  drawMapScenerySkyFade({ctx,map,camera:{x:-6200,y:-300},width:800,height:600});
  assert.equal(gradients,0);
  assert.equal(ctx.fillStyle,"#000000");
  assert.deepEqual(fills,[[0,0,800,600]]);
});
