import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {MAPS,getMapPortals,getClosedMapPortals} from "../../src/game/combatData/maps.js";
import {createHelionTwoScene} from "../../src/game/combatData/helionTwoVisuals.js";
import {HELION_THREE_ASSETS,createHelionThreeVisualMaps} from "../../src/game/combatData/helionThreeVisuals.js";
import {buildMapState} from "../../src/game/systems/mapState.js";
import {createCombatMapAssetCache,getCombatMapAssetPaths} from "../../src/game/combatAssets.js";
import {projectMapSceneryLayer} from "../../src/game/render/mapSceneryProjection.js";
import {drawWorldLayer} from "../../src/game/render/world.js";
import {getMiniMapVisualDefinition} from "../../src/game/combatData/miniMapVisuals.js";
import {createMiniMapSnapshotMap,createMiniMapSceneryRenderer,getMiniMapSceneryLayers} from "../../src/game/render/miniMapScenery.js";

const original=MAPS.find(map=>map.id===2);
const after=createHelionThreeVisualMaps(MAPS),helion=after.find(map=>map.id===2),scene=helion.parallaxScene;
function context(){
  const calls=[];
  return new Proxy({calls,createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage(...args){calls.push(args);}},{get:(o,k)=>k in o?o[k]:()=>{}});
}
const images=()=>Object.fromEntries(getCombatMapAssetPaths(helion).map(src=>[src,{src,complete:true,naturalWidth:1200,naturalHeight:540}]));

test("Helion-03 scenery preserves all gameplay references and every other sector",()=>{
  const snapshot=JSON.stringify(MAPS);createHelionThreeVisualMaps(MAPS);assert.equal(JSON.stringify(MAPS),snapshot);
  for(const key of Object.keys(original).filter(key=>!["parallaxScene","closeStarCount"].includes(key)))assert.equal(helion[key],original[key],key);
  assert(after.every((map,index)=>map.id===2||map===MAPS[index]));
  for(const input of [{...original,id:3},{...original,name:"Nereid-03"},{...original,name:"Helion-03-instance"}])assert.equal(createHelionThreeVisualMaps([input])[0],input);
  const stringId={...original,id:"2"};assert.notEqual(createHelionThreeVisualMaps([stringId])[0],stringId);
  assert.equal(getMapPortals(helion),getMapPortals(original));assert.deepEqual(getClosedMapPortals(helion),getClosedMapPortals(original));
  for(const firstId of [1,200]){const a=buildMapState(original,firstId),b=buildMapState(helion,firstId);assert.deepEqual(b.state.enemies,a.state.enemies);assert.equal(b.nextEnemySeq,a.nextEnemySeq);}
});

test("the approved family atmosphere is retained and the four larger stars stay behind the planet",()=>{
  const family=createHelionTwoScene(original);assert.deepEqual(scene.background,family.background);assert.deepEqual(scene.backdrops.slice(0,5),family.backdrops);
  const planet=scene.images.find(layer=>layer.kind==="planet"),stars=scene.images.filter(layer=>layer.kind==="star"),wreck=scene.images.find(layer=>layer.kind==="wreck");
  assert.equal(stars.length,4);assert.equal(new Set(stars.map(layer=>layer.src)).size,1);assert(stars.every(layer=>layer.p<planet.p&&layer.minimap===false));
  assert.equal(planet.p,.03);assert.equal(planet.alpha,1);assert.equal(planet.effect,undefined);assert.equal(planet.blend,undefined);assert.equal(planet.filter,undefined);
  assert(planet.p<wreck.p&&wreck.p<.3);assert.equal(wreck.minimap,false);assert(scene.images.every((layer,i)=>!i||scene.images[i-1].p<=layer.p));
});

test("camera travel retains distinct distant depths without moving scenery anchors",()=>{
  for(const layer of scene.images.filter(layer=>["planet","wreck","star","planet-fragment"].includes(layer.kind))){
    const snapshot=JSON.stringify(layer),project=camera=>projectMapSceneryLayer({layer,camera,viewWidth:1920,viewHeight:1080});
    const a=project({x:-1000,y:0}),b=project({x:0,y:500});assert(Math.abs(b.x-a.x+1000*layer.p)<1e-9);assert(Math.abs(b.y-a.y+500*layer.p)<1e-9);assert.equal(JSON.stringify(layer),snapshot);
  }
});

test("world rendering honors cloud/star/rock options while solid landmarks remain visible and culled",()=>{
  function render(camera,nebulae){
    const ctx=context();drawWorldLayer({ctx,canvas:{width:1920,height:1080},cache:images(),camera,currentMap:helion,stars:[],dust:[],nebulae:[],asteroids:[],stations:[],player:{},graphicsQuality:"low",
      graphicsEffects:{nebulae,cosmicClouds:false,starGlow:false,vignette:false,backgroundAsteroids:false},getMapPortals:()=>[],getClosedMapPortals:()=>[]});return ctx.calls.map(args=>args[0].src);
  }
  const camera={x:-960,y:-540};assert.deepEqual(new Set(render(camera,false)),new Set([HELION_THREE_ASSETS.planet,HELION_THREE_ASSETS.wreck]));
  assert(render(camera,true).includes(HELION_THREE_ASSETS.nebula));assert(!render({x:200000,y:200000},true).some(src=>Object.values(HELION_THREE_ASSETS).includes(src)));
});

test("runtime assets are reachable without preview paths and new images retain their native ratio",()=>{
  for(const src of getCombatMapAssetPaths(helion)){assert(!src.includes('/output/'));assert(existsSync(new URL('../../'+src,import.meta.url)),src);}
  const data=readFileSync(new URL('../../'+HELION_THREE_ASSETS.wreck,import.meta.url));assert.deepEqual([data.readUInt32BE(16),data.readUInt32BE(20),data[25]],[1774,887,6]);
  const wreck=scene.images.find(layer=>layer.kind==='wreck');assert.equal(wreck.w/wreck.h,1774/887);assert(wreck.w*1.2*2<=1774);assert(data.length<2*1024*1024);
  const star=readFileSync(new URL('../../'+HELION_THREE_ASSETS.star,import.meta.url),'utf8');assert(star.includes('<svg'));
});

test("streaming reuses each scenery source and keeps the three-map retention budget",()=>{
  const previous=globalThis.Image;let loaded=0;globalThis.Image=class{complete=true;naturalWidth=1;naturalHeight=1;set src(value){this.url=value;loaded++;}};
  try{
    const cache={},assets=createCombatMapAssetCache({cache,maxMaps:3}),paths=assets.activate(helion);assert.equal(paths.length,new Set(paths).size);
    for(const src of Object.values(HELION_THREE_ASSETS))assert(paths.includes(src));const first=loaded;assets.activate(helion);assert.equal(loaded,first);
    for(const id of ['a','b','c'])assets.activate({id,parallaxScene:{images:[{src:id+'.png'}]}});assert.equal(assets.getRetainedMapKeys().length,3);assert(!assets.getRetainedMapKeys().includes('2'));assets.clear();assert.deepEqual(Object.keys(cache),[]);
  }finally{globalThis.Image=previous;}
});

test("the fixed minimap has a central planet, no ships or debris, and a 1200 by 540 atlas",()=>{
  const definition=getMiniMapVisualDefinition(helion),snapshot=createMiniMapSnapshotMap(helion);assert.deepEqual(definition.landmarks.planet,{x:.52,y:.47,width:.20});
  const image=readFileSync(new URL('../../'+definition.image,import.meta.url));assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],[1200,540]);
  assert.deepEqual(snapshot.parallaxScene.images.map(layer=>layer.kind),['nebula','dustbank','planet']);assert.equal(snapshot.spawn,null);assert.deepEqual(snapshot.portals,[]);assert.deepEqual(snapshot.closedPortals,[]);
  assert.deepEqual(getMiniMapSceneryLayers(scene).map(layer=>layer.kind),['nebula','dustbank','planet']);assert.equal(getMiniMapVisualDefinition({id:2,name:'Other-map'}),null);assert.equal(getMiniMapVisualDefinition({id:22,name:'Nereid-03'}),null);
});

test("minimap scenery stays cached through camera moves and is replaced once when the atlas loads",()=>{
  const surfaces=[],draw=createMiniMapSceneryRenderer({createCanvas(width,height){const ctx=context();surfaces.push(ctx);return {width,height,getContext:()=>ctx};}});
  const definition=getMiniMapVisualDefinition(helion),cache=images();delete cache[definition.image];const options={ctx:context(),currentMap:helion,cache,rect:{x:0,y:0,w:400,h:180},stations:[]};
  draw(options);const count=surfaces[0].calls.length;assert(count>=3);
  for(let frame=0;frame<100;frame++)draw({...options,camera:{x:frame*100,y:frame*50},player:{x:frame,y:frame}});assert.equal(surfaces.length,1);assert.equal(surfaces[0].calls.length,count);
  cache[definition.image]={complete:true,naturalWidth:1200,naturalHeight:540};draw(options);assert.equal(surfaces[0].calls.length,count+1);
  for(let frame=0;frame<100;frame++)draw(options);assert.equal(surfaces[0].calls.length,count+1);
});
