import test from "node:test";
import assert from "node:assert/strict";
import {MAPS} from "../../src/game/combatData/maps.js";
import {createHelionThreeScene} from "../../src/game/combatData/helionThreeVisuals.js";
import {getMapSceneryAlpha} from "../../src/game/render/mapSceneryAnimation.js";
import {drawWorldLayer} from "../../src/game/render/world.js";

const scene=createHelionThreeScene(MAPS.find(map=>map.id===2));

test("the violet gas varies slowly within its approved bounds without mutating the scene",()=>{
  const layer=scene.backdrops.find(layer=>layer.kind==="violet-gas"),before=JSON.stringify(layer);
  assert.equal(getMapSceneryAlpha(layer,0,false),.54);
  assert(Math.abs(getMapSceneryAlpha(layer,5000,false)-.5616)<1e-12);
  assert(Math.abs(getMapSceneryAlpha(layer,15000,false)-.5184)<1e-12);
  assert(Math.abs(getMapSceneryAlpha(layer,25000,false)-.5616)<1e-12);
  for(let now=0;now<120000;now+=71){const alpha=getMapSceneryAlpha(layer,now,false);assert(alpha>=.5184&&alpha<=.5616);}
  assert.equal(JSON.stringify(layer),before);
});

test("reduced motion and all ordinary scenery retain their static opacity",()=>{
  for(const layer of scene.backdrops){
    for(const now of [0,5000,15000,25000]){
      assert.equal(getMapSceneryAlpha(layer,now,true),layer.alpha);
      if(!layer.lightPulse)assert.equal(getMapSceneryAlpha(layer,now,false),layer.alpha);
    }
  }
});

test("Eclanite keeps opaque faces, aligned emissive cracks and distant depth ordering",()=>{
  const shards=scene.images.filter(layer=>layer.kind==="eclanite-shard"),halos=scene.starLights.filter(light=>light.kind==="shard-halo");
  assert.equal(shards.length,6);assert.equal(halos.length,6);
  assert.equal(scene.images.filter(layer=>layer.kind==="crystal").length,2);
  for(const shard of shards){
    assert.equal(shard.alpha,1);assert.equal(shard.blend,"source-over");assert.equal(shard.minimap,false);
    const index=scene.images.indexOf(shard),emission=scene.images[index+1];
    assert.equal(emission.kind,"eclanite-emission");assert.equal(emission.blend,"screen");
    for(const key of ["src","x","y","w","h","p","rotation"])assert.equal(emission[key],shard[key],key);
    assert(halos.some(light=>light.x===shard.x&&light.y===shard.y&&light.p===shard.p));
  }
  assert(scene.images.every((layer,i)=>!i||scene.images[i-1].p<=layer.p));
  assert(scene.images.filter(layer=>layer.kind==="asteroid").every(layer=>layer.alpha===1));
});

test("disabling background rocks also hides their halos while preserving distant gas lights",()=>{
  const previous=globalThis.document;
  const context=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
  globalThis.document={createElement(){return {halo:true,getContext:context};}};
  try{
    function render(enabled){
      const ctx=context(),drawn=[];ctx.drawImage=(image)=>{if(image.halo)drawn.push(image);};
      const currentMap={...MAPS.find(map=>map.id===2),parallaxScene:{enabled:true,starLights:scene.starLights}};
      drawWorldLayer({ctx,canvas:{width:1920,height:1080},cache:{},currentMap,camera:{x:-960,y:-540},
        player:{},stars:[],dust:[],nebulae:[],asteroids:[],stations:[],getMapPortals:()=>[],getClosedMapPortals:()=>[],
        graphicsQuality:"low",graphicsEffects:{nebulae:false,cosmicClouds:false,starGlow:true,vignette:false,backgroundAsteroids:enabled}});
      return drawn.length;
    }
    assert.equal(render(false),2);assert.equal(render(true),8);assert.equal(render(false),2);
  }finally{globalThis.document=previous;}
});
