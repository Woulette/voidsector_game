import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {MAPS} from "../../src/game/combatData/maps.js";
import {getCombatMapAssetPaths} from "../../src/game/combatAssets.js";
import {getMiniMapVisualDefinition} from "../../src/game/combatData/miniMapVisuals.js";
import {createMiniMapSceneryRenderer, getMiniMapLandmarkPosition} from "../../src/game/render/miniMapScenery.js";
import {drawMiniMapFrame} from "../../src/game/render/miniMapChrome.js";
import {createMiniMapState} from "../../src/game/systems/minimapState.js";
import {getMiniMapLayout, MINI_MAP_CONTENT_RATIO} from "../../src/game/systems/miniMapLayout.js";

const helion=MAPS.find(map=>map.id===0);
function context(){
 const calls=[];const ctx={calls};
 for(const name of ["setTransform","clearRect","fillRect","strokeRect","save","restore","translate","rotate","scale","drawImage","beginPath","rect","clip","setLineDash","moveTo","lineTo","closePath","stroke","fill","arc","fillText"]){
  ctx[name]=(...args)=>calls.push({name,args});
 }
 ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});
 return ctx;
}

test("Helion's fixed atlas is preloaded and has a valid 1200 by 540 PNG",()=>{
 const path=getMiniMapVisualDefinition(helion).image;
 assert.ok(getCombatMapAssetPaths(helion).includes(path));
 assert.equal(getMiniMapVisualDefinition({...helion,name:"BRECHE DE RICKY"}),null);
 const data=readFileSync(new URL('../../'+path,import.meta.url));
 assert.equal(data.subarray(1,4).toString(),'PNG');
 assert.equal(data.readUInt32BE(16),1200);assert.equal(data.readUInt32BE(20),540);
});

test("movement and zoom never rebuild or move the captured minimap background",()=>{
 const surfaces=[];
 const draw=createMiniMapSceneryRenderer({createCanvas(width,height){const ctx=context();const surface={width,height,getContext:()=>ctx,ctx};surfaces.push(surface);return surface;}});
 const path=getMiniMapVisualDefinition(helion).image;
 const cache={[path]:{complete:true,naturalWidth:1200,naturalHeight:960,src:path}};
 const options={ctx:context(),currentMap:helion,cache,rect:{x:10,y:20,w:340,h:272}};
 const paints=()=>surfaces.reduce((sum,surface)=>sum+surface.ctx.calls.filter(call=>call.name==='clearRect').length,0);
 const landmark={kind:'planet',src:'planet',x:20,y:30,w:100};
 const anchor=getMiniMapLandmarkPosition({map:helion,layer:landmark});
 for(let i=0;i<120;i++){
  draw({...options,camera:{x:i*100,y:i*-100},viewWidth:1000+i*10,viewHeight:700});
  assert.deepEqual(getMiniMapLandmarkPosition({map:helion,layer:landmark,camera:{x:i*100,y:0}}),anchor);
 }
 assert.equal(paints(),1);
 assert.ok(surfaces[0].ctx.calls.some(call=>call.name==='drawImage'&&call.args[0]===cache[path]));
 draw({...options,rect:{...options.rect,w:400,h:320}});assert.equal(paints(),2);
});

test("map proportions and navigation coordinates survive migration, resize and sector changes",()=>{
 let map=helion;const canvas={width:1280,height:720};
 const mini=createMiniMapState({canvas,getCurrentMap:()=>map,initialLayout:{x:900,y:400,w:366,h:170}});
 for(const step of [()=>{},()=>mini.resize(28),()=>mini.resize(1000),()=>{map={width:11000,height:8200};}]){
  step();const rect=mini.rect();const {content,minus,plus,footer}=getMiniMapLayout(rect);
  assert.ok(Math.abs(content.h/content.w-MINI_MAP_CONTENT_RATIO)<=1/content.w);
  assert.ok(rect.x>=0&&rect.x+rect.w<=canvas.width&&rect.y>=0&&rect.y+rect.h<=canvas.height);
  assert.deepEqual(mini.worldFromPoint(content.x,content.y),{x:-map.width/2,y:-map.height/2});
  assert.deepEqual(mini.worldFromPoint(content.x+content.w,content.y+content.h),{x:map.width/2,y:map.height/2});
  assert.equal(mini.hitTest(footer.x+20,footer.y+15).type,'frame');
  assert.equal(mini.hitTest(minus.x+12,minus.y+11).delta,-28);
  assert.equal(mini.hitTest(plus.x+12,plus.y+11).delta,28);
 }
});

test("the header planet follows the sector, independently of the player's faction",()=>{
 const cache=Object.fromEntries(['astra','cyan','jaune','verte'].map(firm=>['assets/firms/'+firm+'.svg',{complete:true,naturalWidth:64,firm}]));
 for(const [name,firm] of [['Helion-03','astra'],['Nereid-02','cyan'],['Cygnus-03','cyan'],['Aureon-04','jaune'],['Sylva-05','verte']]){
  const ctx=context();drawMiniMapFrame({ctx,cache,rect:{x:0,y:0,w:340,h:333},currentMap:{name},player:{x:0,y:0,firmId:'astra'}});
  const icons=ctx.calls.filter(call=>call.name==='drawImage');
  assert.equal(icons.length,1);assert.equal(icons[0].args[0].firm,firm);
 }
});

test("the old 220 px minimum migrates to a wider 300 by 192 widget and stays compact at minimum", ()=>{
  const canvas = {width:1920, height:950};
  const mini = createMiniMapState({canvas, getCurrentMap:()=>helion,
    initialLayout:{x:1530, y:700, w:220, h:237}});
  for(let i = 0; i < 20; i++) mini.resize(-28);
  const rect = mini.rect();
  assert.equal(rect.w, 300);
  assert.equal(rect.h, 192);
  assert.ok(rect.h < 237 && rect.w > 220);
  const restored = createMiniMapState({canvas, getCurrentMap:()=>helion, initialLayout:mini.snapshot()});
  assert.deepEqual(restored.snapshot(), mini.snapshot());
});
