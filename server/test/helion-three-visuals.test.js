import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MAPS, getMapPortals, getClosedMapPortals} from "../../src/game/combatData/maps.js";
import {createHelionOneVisualMaps} from "../../src/game/combatData/helionOneVisuals.js";
import {createHelionTwoVisualMaps} from "../../src/game/combatData/helionTwoVisuals.js";
import {createFirmSectorTwoVisualMaps} from "../../src/game/combatData/firmSectorTwoVisuals.js";
import {HELION_THREE_ASSETS, HELION_THREE_PARAMETERS, createHelionThreeScene, createHelionThreeVisualMaps} from "../../src/game/combatData/helionThreeVisuals.js";
import {buildMapState} from "../../src/game/systems/mapState.js";
import {createCombatMapAssetCache, getCombatMapAssetPaths} from "../../src/game/combatAssets.js";
import {projectMapSceneryLayer} from "../../src/game/render/mapSceneryProjection.js";
import {getMapSceneryEdgeOpacity} from "../../src/game/render/mapSceneryBounds.js";
import {getMapSceneryLightSprite} from "../../src/game/render/mapSceneryLights.js";
import {getMiniMapVisualDefinition} from "../../src/game/combatData/miniMapVisuals.js";
import {drawWorldLayer} from "../../src/game/render/world.js";
import {createMiniMapSnapshotMap, createMiniMapSceneryRenderer, getMiniMapLandmarkPosition, getMiniMapSceneryLayers} from "../../src/game/render/miniMapScenery.js";

const before=createFirmSectorTwoVisualMaps(createHelionTwoVisualMaps(createHelionOneVisualMaps(MAPS)));
const original=before.find(map=>map.id===2);
const after=createHelionThreeVisualMaps(before);
const helion=after.find(map=>map.id===2),scene=helion.parallaxScene;

function freeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value))freeze(child);
  }
  return value;
}

test("Helion-03 replaces only scenery and preserves all other approved sectors and gameplay references",()=>{
  const snapshot=JSON.stringify(before);
  assert.equal(after.length,before.length);
  for(let index=0;index<before.length;index++){
    const input=before[index],map=after[index];
    if(input!==original){assert.equal(map,input);continue;}
    assert.notEqual(map,input);assert.notEqual(map.parallaxScene,input.parallaxScene);
    assert.deepEqual(Object.keys(map),Object.keys(input));
    for(const key of Object.keys(input).filter(key=>key!=="parallaxScene"))assert.equal(map[key],input[key],key);
  }
  const frozen=freeze(structuredClone(before));
  assert.doesNotThrow(()=>createHelionThreeVisualMaps(frozen));
  assert.equal(JSON.stringify(before),snapshot);
  assert.equal(helion.width,10000);assert.equal(helion.height,8000);
  assert.equal(helion.enemyCount,50);assert.deepEqual(helion.enemyLevel,[10,14]);
  assert.equal(helion.enemySeed,31);assert.equal(helion.closeStarCount,2240);
  assert.equal(helion.spawn,undefined);assert.equal(helion.questNpcs,undefined);
});

test("only the exact Helion-03 ID and name qualify, including isolated and string-ID loads",()=>{
  for(const input of [{...original,id:3},{...original,name:"Nereid-03"},{...original,name:"Helion-03-instance"}]){
    assert.equal(createHelionThreeVisualMaps([input])[0],input);
  }
  const stringId={...original,id:"2"};
  assert.notEqual(createHelionThreeVisualMaps([stringId])[0],stringId);
  assert.deepEqual(createHelionThreeVisualMaps([original])[0],helion);
});

test("all four graph-installed portals keep destinations, arrival coordinates, radii and protections",()=>{
  assert.equal(getMapPortals(helion),getMapPortals(original));
  assert.deepEqual(getClosedMapPortals(helion),getClosedMapPortals(original));
  assert.deepEqual(helion.portals.map(({x,y,targetMap,targetX,targetY,r,safeRadius})=>({x,y,targetMap,targetX,targetY,r,safeRadius})),[
    {x:-4300,y:3300,targetMap:1,targetX:-4300,targetY:-3300,r:95,safeRadius:230},
    {x:-4300,y:-3300,targetMap:22,targetX:-4300,targetY:3300,r:95,safeRadius:230},
    {x:4300,y:-3300,targetMap:4,targetX:-4300,targetY:-3300,r:95,safeRadius:230},
    {x:4300,y:3300,targetMap:3,targetX:-4300,targetY:-3300,r:95,safeRadius:230}
  ]);
});

test("seeded enemies, close rocks, stars and dust remain byte-for-byte identical",()=>{
  const generated=buildMapState(helion);
  assert.deepEqual(generated,buildMapState(original));
  assert.equal(generated.state.enemies.length,50);assert.equal(generated.state.asteroids.length,2240);
  assert.equal(generated.state.stars.length,660);assert.equal(generated.state.dust.length,70);
  assert.deepEqual(buildMapState(helion,200),buildMapState(original,200));
  assert.equal(scene.asteroidFields,original.parallaxScene.asteroidFields);
  assert.equal(scene.tiles,original.parallaxScene.tiles);
  assert.equal(scene.asteroidFields.reduce((sum,field)=>sum+field.count,0),108);
});

test("existing asteroid and meteor image layers retain their objects and the input order never mutates",()=>{
  const rocks=[{kind:"asteroid",src:"rock.png",x:20,y:40,p:.7},
    {src:"assets/maps/meteor.png",x:-40,y:80,p:.2},
    {src:"assets/maps/asteroid-atlas.png",x:600,y:-300,p:.5}];
  const oldCloud={kind:"cloud",src:"obsolete-cloud.png",p:.1};
  const input=freeze({...original,parallaxScene:{...original.parallaxScene,images:[...rocks,oldCloud]}});
  const snapshot=JSON.stringify(input),result=createHelionThreeScene(input);
  for(const rock of rocks)assert.ok(result.images.includes(rock));
  assert.ok(!result.images.includes(oldCloud));
  assert.equal(JSON.stringify(input),snapshot);
  for(let index=1;index<result.images.length;index++)assert.ok(result.images[index-1].p<=result.images[index].p);
});

test("a native-detail nebula sits over five restrained atmospheric layers while approved veils and halos remain",()=>{
  assert.deepEqual(HELION_THREE_PARAMETERS,{x:-2400,y:-1200,w:1300,h:1300*941/1672,p:.06,alpha:.70,rotation:0});
  assert.deepEqual(scene.background,["#080409","#200912","#09040a"]);
  const landmarks=scene.backdrops.filter(layer=>layer.kind==="nebula");
  assert.equal(landmarks.length,1);
  assert.deepEqual(landmarks[0],{...HELION_THREE_PARAMETERS,kind:"nebula",effect:"nebulae",
    src:HELION_THREE_ASSETS.nebula,space:"map",edgeFade:false,minimap:true});
  const atmosphere=scene.backdrops.filter(layer=>layer!==landmarks[0]);
  assert.equal(atmosphere.length,5);
  const profiles=[
    [HELION_THREE_ASSETS.dust,-2500,-1000,2400,1400,.065,.065],
    [HELION_THREE_ASSETS.haze,3200,1800,2000,1500,.085,.080],
    [HELION_THREE_ASSETS.haze,-4500,-3400,1800,1300,.10,.065],
    [HELION_THREE_ASSETS.haze,4400,-2800,1700,1100,.11,.065],
    [HELION_THREE_ASSETS.dust,1400,3600,2100,900,.12,.055]
  ];
  assert.deepEqual(atmosphere.map(({src,x,y,w,h,p,alpha})=>[src,x,y,w,h,p,alpha]),profiles);
  assert.ok(atmosphere.every(layer=>layer.kind==="cloud"&&layer.effect==="nebulae"&&layer.edgeFade===false&&layer.minimap!==true));
  assert.ok(scene.backdrops.every(layer=>!layer.src.includes("astra02_nebula_mass")));
  assert.ok(HELION_THREE_PARAMETERS.w*.78*1.5/1672<=1,"The detailed hero must not upscale at zoom78% and DPR1.5");
  assert.ok(HELION_THREE_PARAMETERS.w/1672<=1,"Standard zoom at DPR1 keeps native detail");
  assert.deepEqual(scene.images.filter(layer=>layer.kind==="cloud"),[
    {kind:"cloud",effect:"nebulae",src:HELION_THREE_ASSETS.dust,space:"map",x:-3400,y:-1700,w:1900,h:950,p:.34,alpha:.105,rotation:.22,edgeFade:true,minimap:false},
    {kind:"cloud",effect:"nebulae",src:HELION_THREE_ASSETS.dust,space:"map",x:3500,y:2400,w:1600,h:800,p:.48,alpha:.085,rotation:-.28,flipX:true,edgeFade:true,minimap:false}
  ]);
  assert.equal(scene.starLights.length,2);
  assert.deepEqual(scene.starLights.map(({x,y,p,r,alpha,static:fixed,point})=>({x,y,p,r,alpha,fixed,point})),[
    {x:-1700,y:900,p:.06,r:430,alpha:.15,fixed:true,point:false},
    {x:3900,y:-2100,p:.06,r:550,alpha:.18,fixed:true,point:false}
  ]);
  for(const key of ["nebulae","lightClouds","foregroundClouds","glowSpots","dustSpecks"])assert.deepEqual(scene[key],[]);
});

test("one opaque shattered planet stays far away with no artificial rotation or cloud-option dependency",()=>{
  const planets=scene.images.filter(layer=>layer.kind==="planet");
  assert.equal(planets.length,1);
  const planet=planets[0];
  assert.equal(planet.src,HELION_THREE_ASSETS.planet);assert.equal(planet.space,"map");
  assert.deepEqual([planet.x,planet.y],[9000,-5000]);
  assert.equal(planet.p,.03);assert.equal(planet.w,480);assert.equal(planet.alpha,1);
  assert.equal(planet.effect,undefined);assert.equal(planet.blend,undefined);assert.equal(planet.filter,undefined);
  assert.ok(!planet.rotation&&!planet.flipX&&!planet.flipY);assert.equal(planet.edgeFade,false);
  assert.equal(planet.minimap,true);
  assert.ok(!scene.images.some(layer=>["station","spawn","hub"].includes(layer.kind)));
  for(const layer of [planet,scene.backdrops.find(layer=>layer.kind==="nebula")]){
    for(const [viewWidth,viewHeight] of [[1366,768],[1920,1080],[1680/.8,1000/.8]]){
      const project=camera=>projectMapSceneryLayer({layer,camera,viewWidth,viewHeight});
      const start=project({x:-1000,y:0}),end=project({x:0,y:500});
      assert.ok(Math.abs(end.x-start.x+1000*layer.p)<1e-9);
      assert.ok(Math.abs(end.y-start.y+500*layer.p)<1e-9);
    }
  }
});

function context(){
  const calls=[];
  const ctx=new Proxy({calls,save(){},restore(){},createLinearGradient:()=>({addColorStop(){}}),
    createRadialGradient:()=>({addColorStop(){}}),drawImage(...args){calls.push(args);}},
  {get:(target,key)=>key in target?target[key]:()=>{}});
  return ctx;
}

function render(graphicsEffects,camera={x:-960,y:-540}){
  const ctx=context(),cache=Object.fromEntries([...scene.images,...scene.backdrops].map(layer=>
    [layer.src,{src:layer.src,complete:true,naturalWidth:1704,naturalHeight:923}]));
  drawWorldLayer({ctx,canvas:{width:1920,height:1080},cache,camera,currentMap:helion,
    stars:[],dust:[],nebulae:[],asteroids:[],stations:[],player:{},graphicsQuality:"low",
    graphicsEffects:{cosmicClouds:false,starGlow:false,vignette:false,backgroundAsteroids:false,...graphicsEffects},
    getMapPortals:()=>[],getClosedMapPortals:()=>[]});
  return ctx.calls.map(args=>args[0].src);
}

test("the real world renderer hides nebula and veils on request while retaining the planet and culling off-screen art",()=>{
  assert.deepEqual(render({nebulae:false}),[HELION_THREE_ASSETS.planet]);
  const visible=render({nebulae:true});
  assert.equal(visible.filter(src=>src===HELION_THREE_ASSETS.nebula).length,1);
  assert.ok(visible.includes(HELION_THREE_ASSETS.planet));
  assert.ok(!render({nebulae:true},{x:200000,y:200000}).some(src=>Object.values(HELION_THREE_ASSETS).includes(src)));
});

test("sky and close decor retain the approved soft border fade without clipping the distant planet",()=>{
  assert.equal(scene.clipToBounds,false);assert.equal(scene.showBoundary,false);
  assert.equal(scene.edgeFadeDistance,460);assert.equal(scene.vignetteOpacity,.4);
  assert.deepEqual(scene.skyFade,{inside:900,outside:120});
  for(const [x,y] of [[-5200,0],[5200,0],[0,-4200],[0,4200]]){
    assert.equal(getMapSceneryEdgeOpacity({map:helion,x,y,width:80,height:80}),0);
  }
});

test("static halo buffers are small and allocated once, with no new texture generation each frame",()=>{
  const previous=globalThis.document;
  const surfaces=[];
  globalThis.document={createElement(){const surface={getContext:()=>context()};surfaces.push(surface);return surface;}};
  try{
    for(const light of scene.starLights){
      const first=getMapSceneryLightSprite(light);
      for(let frame=0;frame<120;frame++)assert.equal(getMapSceneryLightSprite(light),first);
      assert.equal(first.width,512);assert.equal(first.height,512);
    }
    assert.equal(surfaces.length,2);
  }finally{globalThis.document=previous;}
});

test("streaming loads each art source once and retains the existing three-map cache budget",()=>{
  const previous=globalThis.Image;
  let loaded=0;
  globalThis.Image=class{complete=true;naturalWidth=1;naturalHeight=1;set src(value){this.url=value;loaded++;}};
  try{
    const cache={},assets=createCombatMapAssetCache({cache,maxMaps:3});
    const paths=assets.activate(helion);
    assert.equal(paths.length,new Set(paths).size);
    assert.ok(paths.length<=7,"The scene reuses two atmosphere sources, one hero, one planet and its fixed overview plus gates");
    for(const src of Object.values(HELION_THREE_ASSETS))assert.equal(paths.filter(path=>path===src).length,1);
    assert.ok(!paths.some(path=>path.includes("astra02_nebula_mass")));
    const first=loaded;
    assets.activate(helion);assert.equal(loaded,first);
    for(const id of ["other-a","other-b","other-c"])assets.activate({id,parallaxScene:{images:[{src:id+".png"}]}});
    assert.equal(assets.getRetainedMapKeys().length,3);
    assert.ok(!assets.getRetainedMapKeys().includes("2"));
    for(const src of Object.values(HELION_THREE_ASSETS))assert.equal(cache[src],undefined);
    assets.clear();assert.deepEqual(assets.getRetainedMapKeys(),[]);assert.deepEqual(Object.keys(cache),[]);
  }finally{globalThis.Image=previous;}
});

test("the minimap's scenic planet and cached background stay fixed while live markers remain separate",()=>{
  const source=JSON.stringify(helion);
  const definition=getMiniMapVisualDefinition(helion);
  assert.equal(definition.image,"assets/maps/minimaps/helion-03-wide-v3.png");
  assert.equal(definition,getMiniMapVisualDefinition(helion));
  assert.deepEqual(definition.landmarks,{nebula:{x:.46,y:.53,width:.72},planet:{x:.67,y:.34,width:.20}});
  assert.deepEqual(definition.atmosphere,{src:HELION_THREE_ASSETS.haze,alpha:.20});
  const snapshot=createMiniMapSnapshotMap(helion);
  assert.deepEqual(snapshot.parallaxScene.images.map(layer=>layer.kind),["nebula","planet"]);
  assert.equal(snapshot.parallaxScene.backdrops.length,1);
  assert.equal(snapshot.parallaxScene.backdrops[0].src,HELION_THREE_ASSETS.haze);
  assert.equal(snapshot.parallaxScene.backdrops[0].space,"world");assert.equal(snapshot.parallaxScene.backdrops[0].p,1);
  for(const layer of snapshot.parallaxScene.images){
    const placement=definition.landmarks[layer.kind];
    assert.equal(layer.space,"world");assert.equal(layer.p,1);assert.equal(layer.edgeFade,false);
    assert.equal(layer.x,(placement.x-.5)*helion.width);assert.equal(layer.y,(placement.y-.5)*helion.height);
    assert.equal(layer.w,placement.width*helion.width);
  }
  const planet=snapshot.parallaxScene.images.find(layer=>layer.kind==="planet");
  assert.ok(planet);assert.equal(planet.src,HELION_THREE_ASSETS.planet);assert.equal(planet.p,1);
  assert.deepEqual(snapshot.portals,[]);assert.deepEqual(snapshot.questNpcs,[]);
  assert.deepEqual(snapshot.closedPortals,[]);assert.deepEqual(snapshot.parallaxScene.asteroidFields,[]);
  const position=getMiniMapLandmarkPosition({map:helion,layer:scene.images.find(layer=>layer.kind==="planet")});
  const surfaces=[],draw=createMiniMapSceneryRenderer({createCanvas(width,height){
    const ctx=context();surfaces.push(ctx);return {width,height,getContext:()=>ctx};
  }});
  const cache=Object.fromEntries(getCombatMapAssetPaths(helion).map(src=>[src,{src,complete:true,naturalWidth:1200,naturalHeight:540}]));
  const ctx=context();
  for(let frame=0;frame<120;frame++){
    draw({ctx,currentMap:helion,cache,rect:{x:0,y:0,w:444,h:200},stations:[],camera:{x:frame*100,y:-frame*100}});
    assert.deepEqual(getMiniMapLandmarkPosition({map:helion,layer:scene.images.find(layer=>layer.kind==="planet"),camera:{x:frame*100,y:frame*100}}),position);
  }
  assert.equal(surfaces.length,1);
  assert.ok(surfaces[0].calls.length>=1&&surfaces[0].calls.length<=2,"Background imagery must be painted once and reused");
  assert.equal(ctx.calls.length,120);
  assert.equal(JSON.stringify(helion),source);
});

test("before the atlas loads the fixed atmosphere and two landmarks draw in order, then the atlas takes over once",()=>{
  const surfaces=[],draw=createMiniMapSceneryRenderer({createCanvas(width,height){
    const ctx=context();surfaces.push(ctx);return {width,height,getContext:()=>ctx};
  }});
  const cache=Object.fromEntries(Object.values(HELION_THREE_ASSETS).map(src=>[src,{src,complete:true,naturalWidth:1536,naturalHeight:1024}]));
  const options={ctx:context(),currentMap:helion,cache,rect:{x:0,y:0,w:444,h:200},stations:[]};
  draw(options);
  assert.deepEqual(surfaces[0].calls.map(args=>args[0].src),[HELION_THREE_ASSETS.haze,HELION_THREE_ASSETS.nebula,HELION_THREE_ASSETS.planet]);
  for(let frame=0;frame<120;frame++)draw({...options,camera:{x:frame*100,y:frame*-100}});
  assert.equal(surfaces[0].calls.length,3);
  const path=getMiniMapVisualDefinition(helion).image;
  cache[path]={src:path,complete:true,naturalWidth:1200,naturalHeight:540};
  draw(options);
  assert.equal(surfaces[0].calls.length,4);assert.equal(surfaces[0].calls[3][0],cache[path]);
  for(let frame=0;frame<120;frame++)draw(options);
  assert.equal(surfaces[0].calls.length,4);assert.equal(surfaces.length,1);
});

test("backdrops require an explicit minimap opt-in and ordinary clouds and rock images stay excluded",()=>{
  const selected=scene.backdrops.find(layer=>layer.kind==="nebula"),planet=scene.images.find(layer=>layer.kind==="planet");
  const background={kind:"nebula",src:"ordinary-cloud.png"};
  const off={kind:"nebula",src:"disabled-cloud.png",minimap:false};
  const cloud={kind:"cloud",src:"cloud.png",minimap:true};
  const rock={kind:"asteroid",src:"asteroid.png",minimap:true};
  const input=freeze({backdrops:[background,selected,off],images:[cloud,rock,planet]});
  const previous=JSON.stringify(input);
  assert.deepEqual(getMiniMapSceneryLayers(input),[selected,planet]);
  assert.equal(JSON.stringify(input),previous);
  for(const map of before.filter(map=>map.id!==2)){
    const selectedLayers=getMiniMapSceneryLayers(map.parallaxScene);
    assert.ok(!selectedLayers.some(layer=>(map.parallaxScene.backdrops||[]).includes(layer)),map.name);
  }
});

test("the Helion-03 overview is strictly identified and every earlier fixed overview keeps its asset",()=>{
  for(const input of [{id:2,name:"Other-map"},{id:12,name:"Helion-03"},{id:22,name:"Nereid-03"},{id:3,name:"Helion-04"}]){
    assert.equal(getMiniMapVisualDefinition(input),null);
  }
  const expected={0:"helion-01-wide-v3",1:"helion-02-wide-v3",20:"nereid-01-v1",21:"nereid-02-wide-v1",
    30:"aureon-01-v1",31:"aureon-02-wide-v1",40:"sylva-01-v1",41:"sylva-02-wide-v1"};
  for(const [id,asset]of Object.entries(expected)){
    const map=before.find(entry=>String(entry.id)===id);
    assert.equal(getMiniMapVisualDefinition(map).image,`assets/maps/minimaps/${asset}.png`);
  }
});

function imageDimensions(src){
  const data=readFileSync(new URL("../../"+src,import.meta.url));
  if(data.subarray(1,4).toString()==="PNG")return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),bytes:data.length};
  assert.equal(data.toString("ascii",0,4),"RIFF");assert.equal(data.toString("ascii",8,12),"WEBP");
  for(let offset=12;offset+8<=data.length;){
    const kind=data.toString("ascii",offset,offset+4),length=data.readUInt32LE(offset+4),start=offset+8;
    if(kind==="VP8X")return {width:data.readUIntLE(start+4,3)+1,height:data.readUIntLE(start+7,3)+1,bytes:data.length,hasAlpha:Boolean(data[start]&0x10)};
    if(kind==="VP8L"){
      assert.equal(data[start],0x2f);const bits=data.readUInt32LE(start+1);
      return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1,bytes:data.length,hasAlpha:Boolean(bits&0x10000000),lossless:true};
    }
    if(kind==="VP8 ")return {width:data.readUInt16LE(start+6)&0x3fff,height:data.readUInt16LE(start+8)&0x3fff,bytes:data.length};
    offset=start+length+(length%2);
  }
  assert.fail("Unsupported WebP image dimensions: "+src);
}

test("the transparent lossless hero retains native detail and bounded textures preserve both landmark proportions",()=>{
  const nebula=imageDimensions(HELION_THREE_ASSETS.nebula);assert.deepEqual([nebula.width,nebula.height],[1672,941]);
  assert.equal(nebula.hasAlpha,true);assert.equal(nebula.lossless,true);assert.ok(nebula.bytes<=2*1024*1024);
  const haze=imageDimensions(HELION_THREE_ASSETS.haze);assert.deepEqual([haze.width,haze.height],[1254,1254]);
  const hero=scene.backdrops.find(layer=>layer.kind==="nebula");
  assert.ok(Math.abs(hero.h/hero.w-nebula.height/nebula.width)<1e-12);
  const dust=imageDimensions(HELION_THREE_ASSETS.dust);assert.equal(dust.width,1774);assert.equal(dust.height,887);
  const image=imageDimensions(HELION_THREE_ASSETS.planet),planet=scene.images.find(layer=>layer.kind==="planet");
  assert.deepEqual([image.width,image.height],[1536,1024]);
  assert.ok(image.width>=512&&image.width<=2048&&image.height>=512&&image.height<=2048);
  assert.ok(image.bytes<=4*1024*1024);
  assert.ok(Math.abs(planet.h/planet.w-image.height/image.width)<1e-12,"The shattered silhouette must retain its native aspect ratio");
});

test("the exported Helion-03 atlas is a real 1200 by 540 PNG preloaded once with separate live markers",()=>{
  const definition=getMiniMapVisualDefinition(helion),image=imageDimensions(definition.image);
  assert.deepEqual([image.width,image.height],[1200,540]);
  assert.equal(getCombatMapAssetPaths(helion).filter(src=>src===definition.image).length,1);
  const snapshot=createMiniMapSnapshotMap(helion);
  assert.deepEqual(snapshot.parallaxScene.images.map(layer=>layer.kind),["nebula","planet"]);
  assert.deepEqual(snapshot.portals,[]);assert.deepEqual(snapshot.questNpcs,[]);assert.deepEqual(snapshot.closedPortals,[]);
  assert.equal(snapshot.spawn,null);assert.deepEqual(snapshot.spawnStations,[]);
});
