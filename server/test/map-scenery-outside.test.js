import test from "node:test";
import assert from "node:assert/strict";
import {MAPS} from "../../src/game/combatData/maps.js";
import {createHelionOneVisualMaps} from "../../src/game/combatData/helionOneVisuals.js";
import {createHelionTwoVisualMaps} from "../../src/game/combatData/helionTwoVisuals.js";
import {createFirmSectorTwoVisualMaps} from "../../src/game/combatData/firmSectorTwoVisuals.js";
import {createHelionThreeVisualMaps} from "../../src/game/combatData/helionThreeVisuals.js";
import {createFirmSectorThreeVisualMaps} from "../../src/game/combatData/firmSectorThreeVisuals.js";
import {createPortalMap} from "../../src/game/systems/portalState.js";
import {getMapScenerySkyFadeBands} from "../../src/game/render/mapScenerySky.js";
import {createMiniMapSnapshotMap} from "../../src/game/render/miniMapScenery.js";
import {drawWorldLayer} from "../../src/game/render/world.js";

const sectors=createFirmSectorThreeVisualMaps(createHelionThreeVisualMaps(createFirmSectorTwoVisualMaps(createHelionTwoVisualMaps(createHelionOneVisualMaps(MAPS)))));
const portals=["blue","ricky","violet","red","emerald","void","prismatic","ancient","gold"].map(id=>createPortalMap({id,name:id}));

test("all sectors and portal backgrounds fade on every side and corner at each zoom",()=>{
  for(const map of [...sectors,...portals])for(const zoom of [.65,1,1.2]){
    const width=960/zoom,height=540/zoom,outside=map.parallaxScene?.skyFade?.outside??120;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
      const camera={x:dx<0?-map.width/2-outside-width-1:dx>0?map.width/2+outside+1:-width/2,
        y:dy<0?-map.height/2-outside-height-1:dy>0?map.height/2+outside+1:-height/2};
      const bands=getMapScenerySkyFadeBands({map,camera,width,height});
      assert(bands.some(band=>band.solid&&band.width===width&&band.height===height),`${map.name}, ${dx}/${dy}, zoom ${zoom}`);
    }
  }
});

test("fixed minimap snapshots explicitly bypass boundary fading",()=>{
  for(const map of sectors){
    const snapshot=createMiniMapSnapshotMap(map);
    assert.deepEqual(getMapScenerySkyFadeBands({map:snapshot,camera:{x:map.width*2,y:map.height*2},width:960,height:540}),[]);
  }
});

test("decorative images and nearby particles are masked before gameplay markers",()=>{
  const events=[],stack=[];
  const ctx=new Proxy({globalAlpha:1,globalCompositeOperation:"source-over",fillStyle:"",
    save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,fillStyle:this.fillStyle});},
    restore(){Object.assign(this,stack.pop());},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},
    drawImage(){events.push("decor");},arc(){events.push("particle-or-marker");},
    fillRect(){events.push(this.fillStyle==="#000000"?"outside-mask":"fill");},
    fillText(text){if(text==="QUEST MARKER")events.push("gameplay-marker");}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  const map={id:"outside-order",width:10000,height:8000,questNpcs:[{x:5600,y:0,label:"QUEST MARKER"}],
    parallaxScene:{enabled:true,hideGrid:true,images:[{src:"planet",space:"map",x:5600,y:0,p:0,w:100,h:100,alpha:1,edgeFade:false}]}};
  const source={complete:true,naturalWidth:128,naturalHeight:128};
  drawWorldLayer({ctx,canvas:{width:800,height:600},currentMap:map,camera:{x:5200,y:-300},cache:{planet:source},
    stars:[],dust:[],nebulae:[],asteroids:[{x:5600,y:0,r:3,a:1}],stations:[],player:{},
    graphicsQuality:"low",graphicsEffects:{backgroundAsteroids:true},getMapPortals:()=>[],getClosedMapPortals:()=>[]});
  assert(events.includes("decor"));assert(events.includes("gameplay-marker"));
  const mask=events.indexOf("outside-mask");assert(mask>events.indexOf("decor"));
  assert(mask>events.indexOf("particle-or-marker"));assert(mask<events.indexOf("gameplay-marker"));
  assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.globalCompositeOperation,"source-over");
});
