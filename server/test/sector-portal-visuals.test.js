import assert from "node:assert/strict";
import test from "node:test";
import {SECTOR_PORTAL_VISUAL_ASSETS,isSectorTravelPortal} from "../../src/data/sectorPortalVisuals.js";
import {drawSectorTravelPortal,getSectorPortalState,drawSectorPortalTransferFocus} from "../../src/game/render/sectorPortalVisual.js";
import {drawWorldLayer} from "../../src/game/render/world.js";
import {drawPortalTransitionOverlay} from "../../src/game/render/portalTransition.js";
import {getCombatMapAssetPaths} from "../../src/game/combatAssets.js";
import {createMapPortalTransition,advanceMapPortalTransition} from "../../src/game/systems/mapPortalTransfer.js";
const portal={x:300,y:200,r:95,safeRadius:230,targetMap:1};
function fixture(){
 const calls=[],gradient={addColorStop(...args){calls.push(["color",...args]);}};
 let depth=0;
 const ctx=new Proxy({
  save(){depth++;},restore(){depth--;},
  createLinearGradient(...args){calls.push(["linear",...args]);return gradient;},
  createRadialGradient(...args){calls.push(["radial",...args]);return gradient;}
 },{get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args])});
 return {ctx,calls,get depth(){return depth;}};
}
const image={complete:true,naturalWidth:1254,naturalHeight:1254};
function cache(){return Object.fromEntries(Object.values(SECTOR_PORTAL_VISUAL_ASSETS).map(src=>[src,image]));}
test("travel art is preloaded on sector maps and excludes prepared, damaged, closed and personal portals",()=>{
 assert.equal(isSectorTravelPortal(portal),true);
 for(const flags of [{prepared:true},{closed:true},{damaged:true},{rickyPortal:true},{targetMap:"portal-blue"},{targetMap:null}]){
  assert.equal(isSectorTravelPortal({...portal,...flags}),false);
 }
 for(const src of Object.values(SECTOR_PORTAL_VISUAL_ASSETS)){
  assert.ok(getCombatMapAssetPaths({id:0,portal}).includes(src));
  assert.ok(!getCombatMapAssetPaths({id:"portal-blue",spawn:{kind:"portal"}}).includes(src));
 }
});
test("the real four-second transfer lights only its matching gate and accepts normalized cloned portals",()=>{
 const transition=createMapPortalTransition({...portal});
 assert.equal(transition.duration,4);
 advanceMapPortalTransition(transition,2);
 assert.equal(getSectorPortalState(portal,{transition}).charge,.5);
 assert.equal(getSectorPortalState({...portal,x:portal.x+500},{transition}).charge,0);
 assert.equal(getSectorPortalState({...portal,targetMap:2},{transition}).active,false);
 assert.equal(getSectorPortalState(portal,{transition:{...transition,elapsed:9}}).charge,1);
 assert.equal(getSectorPortalState(portal,{transition:{...transition,elapsed:-2}}).charge,0);
 assert.equal(getSectorPortalState(portal,{}).charge,0);
});
test("proximity reacts to real player coordinates without activating the transfer focus",()=>{
 assert.equal(getSectorPortalState(portal,{player:{x:300,y:200}}).proximity,1);
 assert.equal(getSectorPortalState(portal,{player:{x:4000,y:200}}).proximity,0);
 assert.equal(getSectorPortalState(portal,{player:{x:300,y:200}}).active,false);
});
test("the gate retains the approved upright projection, balanced canvas state and its textured rim",()=>{
 const f=fixture();
 assert.equal(drawSectorTravelPortal({ctx:f.ctx,cache:cache(),portal,now:1000}),true);
 assert.equal(f.depth,0);
 assert.ok(f.calls.some(c=>c[0]==="rotate"&&c[1]===-.045));
 assert.ok(f.calls.some(c=>c[0]==="drawImage"&&c[1]===image));
 assert.equal(f.calls.filter(c=>c[0]==="linear").length,0,"an idle gate has no activation starburst");
});
test("real world rendering forwards the live transfer into a compact activation focus",()=>{
 const transition=createMapPortalTransition(portal);advanceMapPortalTransition(transition,2);
 const f=fixture();
 drawWorldLayer({ctx:f.ctx,canvas:{width:800,height:600},cache:cache(),currentMap:{id:0,width:10000,height:8000,parallaxScene:{enabled:true,hideGrid:true}},
  camera:{x:0,y:0},stars:[],dust:[],nebulae:[],asteroids:[],stations:[],player:{x:250,y:200},
  getMapPortals:()=>[portal],getClosedMapPortals:()=>[],graphicsQuality:"low",portalTransition:transition});
 assert.equal(f.depth,0);
 assert.equal(f.calls.filter(c=>c[0]==="linear").length,20,"one sky gradient plus 19 starburst rays proves world -> gate transfer wiring");
});
test("reduced portal effects keep the gate and transfer cue while omitting particle trails and rays",()=>{
 const f=fixture(),transition={portal,elapsed:2,duration:4};
 assert.equal(drawSectorTravelPortal({ctx:f.ctx,cache:cache(),portal,transition,now:1000,simplified:true}),true);
 assert.equal(f.calls.filter(c=>c[0]==="lineTo").length,0);
 assert.ok(f.calls.some(c=>c[0]==="drawImage"));
 assert.equal(f.depth,0);
});
test("the transfer focus remains visible above a ship at the centre without covering the world",()=>{
 const f=fixture();
 drawSectorPortalTransferFocus({ctx:f.ctx,camera:{x:100,y:50},transition:{portal,elapsed:2,duration:4},now:1000});
 assert.ok(f.calls.some(c=>c[0]==="translate"&&c[1]===200&&c[2]===150));
 assert.equal(f.calls.filter(c=>c[0]==="linear").length,19);
 assert.equal(f.calls.filter(c=>c[0]==="drawImage"||c[0]==="fillRect").length,0);
 assert.equal(f.depth,0);
 const idle=fixture();drawSectorPortalTransferFocus({ctx:idle.ctx,camera:{x:0,y:0},transition:null});
 assert.equal(idle.calls.length,0);
});
test("missing textures and non-travel portals safely retain the existing renderer",()=>{
 const f=fixture();
 assert.equal(drawSectorTravelPortal({ctx:f.ctx,cache:{},portal}),false);
 assert.equal(drawSectorTravelPortal({ctx:f.ctx,cache:cache(),portal:{...portal,prepared:true}}),false);
 assert.equal(f.calls.length,0);
});
test("sector transfer captions leave the world visible while legacy portal transitions retain their overlay",()=>{
 const f=fixture();
 drawPortalTransitionOverlay({ctx:f.ctx,transition:{portal,elapsed:2,duration:4},maps:[{id:1,name:"Helion-02"}],viewW:800,viewH:600});
 assert.equal(f.calls.filter(c=>c[0]==="fillRect").length,0);
 assert.ok(f.calls.some(c=>c[0]==="fillText"&&c[1].includes("Helion-02")&&c[1].includes("2S")));
 const legacy=fixture();
 drawPortalTransitionOverlay({ctx:legacy.ctx,transition:{portal:{...portal,prepared:true},elapsed:2,duration:4},maps:[],viewW:800,viewH:600});
 assert.ok(legacy.calls.some(c=>c[0]==="fillRect"));
 assert.equal(f.depth,0);assert.equal(legacy.depth,0);
});
