import test from "node:test";
import assert from "node:assert/strict";
import { createSceneLoadingGate } from "../../src/game/systems/sceneLoadingGate.js";
import { preloadCombatAssets, getCombatMapAssetPaths, createCombatMapAssetCache, getCachedCombatImage, releaseCombatImages, prepareCombatImages } from "../../src/game/combatAssets.js";
import { disposeScene3d } from "../../src/game/render/disposeScene3d.js";

const tick = ()=>new Promise(resolve=>setImmediate(resolve));
const deferred = ()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test("the loading screen waits for assets AND the first rendered frame", async ()=>{
  const loading=deferred(),events=[];
  const gate=createSceneLoadingGate({prepare:()=>loading.promise,show:()=>events.push("show"),hide:()=>events.push("hide"),onError:assert.fail});
  assert.equal(gate.begin("sector-a",{}),false);
  gate.completeFrame("sector-a");assert.deepEqual(events,["show"]);
  loading.resolve();await tick();
  assert.equal(gate.begin("sector-a",{}),true);assert.deepEqual(events,["show"]);
  gate.completeFrame("sector-a");assert.deepEqual(events,["show","hide"]);
  gate.completeFrame("sector-a");assert.equal(events.length,2);
});

test("an old sector completion or error cannot reveal a newer loading scene", async ()=>{
  const a=deferred(),b=deferred(),events=[],current=[];
  const gate=createSceneLoadingGate({prepare:(options,isCurrent)=>{
    current.push(isCurrent);return options.promise;
  },show:()=>events.push("show"),hide:()=>events.push("hide"),onError:()=>events.push("error")});
  gate.begin("a",a);await tick();gate.begin("b",b);await tick();
  assert.equal(current[0](),false);assert.equal(current[1](),true);
  a.reject(new Error("late failure"));await tick();
  assert.equal(gate.phase,"loading");assert.deepEqual(events,["show","show"]);
  b.resolve();await tick();gate.completeFrame("a");assert.equal(gate.phase,"first-frame");
  gate.completeFrame("b");assert.equal(gate.phase,"ready");
});

test("a failed image preparation exposes retry without showing an unfinished scene", async ()=>{
  let retry,calls=0,hidden=0;
  const gate=createSceneLoadingGate({prepare:()=>{if(++calls===1) throw Error("offline");},show(){},hide(){hidden++;},onError:(error,action)=>{retry=action;}});
  gate.begin("a",{});await tick();assert.equal(gate.phase,"error");assert.equal(hidden,0);
  retry();assert.equal(gate.begin("a",{}),false);await tick();
  gate.completeFrame("a");assert.equal(hidden,1);
});

test("3D preload excludes replaced combat hulls and facilities, keeping genuine 2D resources", ()=>{
  const previous=globalThis.Image;globalThis.Image=class {set src(value){this.srcValue=value;}};
  try{
    const cache={};preloadCombatAssets({cache,ships:[{id:"orion",img:"orion.png",combatImg:"orion-combat.png"},{id:"legacy",img:"legacy.png"}],shipModels3d:true,world3d:true});
    assert.equal(cache["orion.png"],undefined);assert.equal(cache["orion-combat.png"],undefined);
    assert(cache["legacy.png"]);assert.equal(cache["assets/spawn/spawn_dock.png"],undefined);
    assert(Object.keys(cache).some(src=>src.includes("orb")),"unconverted Orb must keep its approved visual");
    preloadCombatAssets({cache,ships:[{id:"orion",img:"orion.png"}]});
    assert(cache["orion.png"]);assert(cache["assets/spawn/spawn_dock.png"]);
  }finally{globalThis.Image=previous;}
});

test("switching rendering modes releases only replaced map images and reloads them for 2D", ()=>{
  const previous=globalThis.Image;globalThis.Image=class {set src(value){this.srcValue=value;}};
  try{
    let world3d=false;const cache={},map={id:0,spawn:{visual:{asset:"hq.png"}},spawnStations:[{id:"quests",asset:"relay.png"},{id:"other",asset:"other.png"}],parallaxScene:{images:[{src:"planet.png"}]}};
    const assets=createCombatMapAssetCache({cache,getOptions:()=>({world3d})});
    assets.activate(map);assert(cache["hq.png"]);world3d=true;assets.activate(map);
    assert.equal(cache["hq.png"],undefined);assert.equal(cache["relay.png"],undefined);
    assert(cache["other.png"]);assert(cache["planet.png"]);
    assert(getCombatMapAssetPaths(map,{world3d:true}).includes("planet.png"));
    world3d=false;assets.activate(map);assert(cache["hq.png"]);assert(cache["relay.png"]);
    getCachedCombatImage(cache,"old-runtime.png");releaseCombatImages(cache,["old-runtime.png"]);
    assert.equal(cache["old-runtime.png"],undefined);
  }finally{globalThis.Image=previous;}
});

test("decoded palette canvases need no new image load event", async ()=>{
  await prepareCombatImages({"palette.png":{width:100,height:100,getContext(){}}},["palette.png"]);
});

test("retry replaces a failed image rather than reusing its rejected decode", async ()=>{
  const previous=globalThis.Image;let attempts=0;
  globalThis.Image=class {
    constructor(){this.attempt=++attempts;this.naturalWidth=32;}
    set src(value){}
    decode(){return this.attempt===1 ? Promise.reject(Error("network")) : Promise.resolve();}
  };
  try{
    const cache={};await assert.rejects(prepareCombatImages(cache,["retry.png"]));
    assert.equal(cache["retry.png"],undefined);
    await prepareCombatImages(cache,["retry.png"]);assert.equal(attempts,2);
  }finally{globalThis.Image=previous;}
});

test("private resources are disposed once; GLB resources shared by live clones remain valid", ()=>{
  const counts={geometry:0,material:0,texture:0,shared:0};
  const resource=key=>({dispose(){counts[key]++;}});
  const geometry=resource("geometry"),texture={...resource("texture"),isTexture:true};
  const material={...resource("material"),map:texture,normalMap:texture};
  const sharedGeometry=resource("shared"),sharedMaterial=resource("shared");
  const shared=new WeakSet([sharedGeometry,sharedMaterial]);
  disposeScene3d({traverse(visit){visit({geometry,material});visit({geometry,material});visit({geometry:sharedGeometry,material:sharedMaterial});}},shared);
  assert.deepEqual(counts,{geometry:1,material:1,texture:1,shared:0});
});
