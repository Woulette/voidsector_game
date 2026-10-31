import test from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../../src/game/combatData/maps.js";
import { createHelionOneVisualMaps } from "../../src/game/combatData/helionOneVisuals.js";
import { getFirmHomeMapTheme, getMapAssetPalette, getMapPaletteSource } from "../../src/shared/firmHomeMapThemes.js";
import { projectMapSceneryLayer } from "../../src/game/render/mapSceneryProjection.js";
import { getMapSceneryEdgeOpacity } from "../../src/game/render/mapSceneryBounds.js";
import { applyMapPalettePixels, prepareMapPaletteImage } from "../../src/game/render/mapAssetPalette.js";
import { createCombatMapAssetCache, getCachedCombatImage } from "../../src/game/combatAssets.js";

const homes=createHelionOneVisualMaps(MAPS).filter(getFirmHomeMapTheme);

test("each firm's home reflects positions while preserving the approved illustrations and depth", ()=>{
  const reference=homes[0].parallaxScene;
  for(const map of homes.slice(1)){
    const theme=getFirmHomeMapTheme(map),scene=map.parallaxScene;
    for(const group of ["images","backdrops","starLights"]){
      assert.equal(scene[group].length,reference[group].length);
      for(let i=0;i<scene[group].length;i++){
        const original=reference[group][i],layer=scene[group][i];
        assert.equal(layer.x,original.x*theme.mirrorX);
        assert.equal(layer.y,original.y*theme.mirrorY);
        for(const key of ["w","h","r","p","alpha","edgeFade","frame","kind","effect"]){
          assert.deepEqual(layer[key],original[key],`${map.name} ${group} ${key}`);
        }
        for(const key of ["rotation","flipX","flipY"]) assert.equal(layer[key],original[key],`${map.name} ${key}`);
        if(layer.src) assert.equal(getMapAssetPalette(layer.src)?.palette,theme.palette);
      }
    }
    assert.equal(scene.clipToBounds,false); assert.equal(scene.showBoundary,false);
    assert.deepEqual(scene.skyFade,reference.skyFade);
    const isolated=createHelionOneVisualMaps([MAPS.find(entry=>entry.id === map.id)])[0];
    assert.deepEqual(isolated.parallaxScene,scene,"subset loads cannot change rock distribution");
  }
});

test("planet corners, camera speeds and empty borders remain consistent on all four homes", ()=>{
  for(const map of homes){
    const theme=getFirmHomeMapTheme(map),planet=map.parallaxScene.images.find(layer=>layer.kind === "planet");
    const width=1920,height=1080,camera={x:map.spawn.x-width/2,y:map.spawn.y-height/2};
    const project=camera=>projectMapSceneryLayer({layer:planet,camera,viewWidth:width,viewHeight:height});
    const start=project(camera),after=project({x:camera.x+1000,y:camera.y+500});
    assert.ok((start.x-width/2)*theme.mirrorX<0);
    assert.ok((start.y-height/2)*theme.mirrorY>0);
    assert.ok(Math.abs(after.x-start.x+70)<1e-9);
    assert.ok(Math.abs(after.y-start.y+35)<1e-9);
    for(const [x,y] of [[-5100,0],[5100,0],[0,-4100],[0,4100]]){
      assert.equal(getMapSceneryEdgeOpacity({map,x,y,width:80,height:40}),0);
    }
  }
  assert.equal(getFirmHomeMapTheme({id:0,name:"Portail privé"}),null);
  assert.equal(getFirmHomeMapTheme({id:21,name:"Nereid-02"}),null);
});

test("palette transforms preserve alpha, neutral metal, cool lights and colour detail", ()=>{
  const original=new Uint8ClampedArray([220,45,20,255, 100,100,100,255, 10,160,230,120, 80,10,5,0]);
  for(const hue of [180,33,125]){
    const next=applyMapPalettePixels(original.slice(),hue);
    assert.deepEqual([...next.slice(4)],[...original.slice(4)]);
    assert.equal(next[3],255);
    assert.equal(Math.max(...next.slice(0,3)),220);
    assert.equal(Math.min(...next.slice(0,3)),20);
    assert.notDeepEqual([...next.slice(0,3)],[...original.slice(0,3)]);
    if(hue === 180) assert.ok(next[2]>next[0] && next[1]>next[0]);
    if(hue === 33) assert.ok(next[0]>next[2] && next[1]>next[2]);
    if(hue === 125) assert.ok(next[1]>next[0] && next[1]>next[2]);
  }
  assert.equal(getMapAssetPalette("assets/ships/Velox.png?mapPalette=cyan"),null);
  assert.equal(getMapAssetPalette("assets/maps/decor/planet.png?mapPalette=unknown"),null);
  assert.equal(getMapPaletteSource("assets/maps/decor/planet.png?v=original&mapPalette=cyan"),"assets/maps/decor/planet.png?v=original");
  for(const map of homes.slice(1)){
    const theme=getFirmHomeMapTheme(map);
    const amber=applyMapPalettePixels(new Uint8ClampedArray([240,160,15,255]),theme.hue,theme.hueRange);
    if(theme.palette === "jaune") assert.ok(amber[0]>amber[1] && amber[1]>amber[2],"gold lamps must not drift green");
    if(theme.palette === "verte") assert.ok(amber[1]>amber[2] && amber[2]>amber[0],"green lamps stay emerald");
  }
});

function fakeCanvas(){
  const transforms=[];
  const frame={data:new Uint8ClampedArray([220,45,20,255])};
  const ctx={translate:(...args)=>transforms.push(["translate",...args]),
    scale:(...args)=>transforms.push(["scale",...args]),drawImage(){},
    getImageData:()=>frame,putImageData(){}};
  return {transforms,getContext:()=>ctx};
}

test("all prepared building textures keep their original orientation and native dimensions", ()=>{
  const image={naturalWidth:1254,naturalHeight:1254};
  for(const palette of ["cyan","jaune","verte"]){
    for(const building of ["headquarters","quest-relay","refinery"]){
      const canvas=fakeCanvas();
      const prepared=prepareMapPaletteImage(image,`assets/spawn/helion01-crown-v1/${building}.webp?mapPalette=${palette}`,()=>canvas);
      assert.equal(prepared,canvas); assert.equal(prepared.complete,true);
      assert.equal(prepared.naturalWidth,1254); assert.equal(prepared.naturalHeight,1254);
      assert.deepEqual(canvas.transforms,[],`${palette} ${building} cannot be reflected`);
    }
  }
  assert.equal(prepareMapPaletteImage(image,"assets/maps/decor/plain.png",()=>{throw Error("unexpected conversion");}),image);
});

test("map colours prepare once per retained asset and late image loads cannot revive evicted maps", ()=>{
  const oldImage=globalThis.Image,oldDocument=globalThis.document,oldOffscreen=globalThis.OffscreenCanvas;
  let builds=0;
  globalThis.OffscreenCanvas=undefined;
  globalThis.document={createElement(){builds++;return fakeCanvas();}};
  globalThis.Image=class{naturalWidth=1;naturalHeight=1;set src(value){this.path=value;}};
  try{
    const cache={},assets=createCombatMapAssetCache({cache,maxMaps:1});
    const src="assets/maps/decor/planet.png?mapPalette=cyan";
    const firstMap={id:20,parallaxScene:{images:[{src}]}};
    assets.activate(firstMap);const first=cache[src];
    assert.equal(first.path,"assets/maps/decor/planet.png","the firm palette must reuse the original HTTP texture");
    first.onload();
    const prepared=cache[src];assert.notEqual(prepared,first);assert.equal(builds,1);
    assets.activate(firstMap);assert.equal(cache[src],prepared);assert.equal(builds,1);
    assets.activate({id:30});assert.equal(cache[src],undefined);
    assets.activate(firstMap);const pending=cache[src];
    assets.clear();pending.onload();assert.equal(cache[src],undefined);assert.equal(builds,1);
    const runtime={};getCachedCombatImage(runtime,src,{maxAssets:1});runtime[src].onload();
    getCachedCombatImage(runtime,"assets/plain.png",{maxAssets:1});assert.equal(runtime[src],undefined);
    globalThis.Image=class{naturalWidth=1;naturalHeight=1;complete=true;set src(value){this.path=value;}};
    const cached={};getCachedCombatImage(cached,src,{maxAssets:1});
    assert.ok(cached[src].getContext,"an already decoded texture must be prepared before its first draw");
    getCachedCombatImage(cached,"assets/plain.png",{maxAssets:1});assert.equal(cached[src],undefined);
  }finally{
    globalThis.Image=oldImage;globalThis.document=oldDocument;globalThis.OffscreenCanvas=oldOffscreen;
  }
});
