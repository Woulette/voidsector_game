import {drawWorldLayer} from "../../src/game/render/world.js";
import {createHelionOneVisualMaps} from "../../src/game/combatData/helionOneVisuals.js";
import {createHelionThreeScene} from "../../src/game/combatData/helionThreeVisuals.js";
import {MAPS} from "../../src/game/combatData/mapDefinitions.js";
import {background} from "./drawing.js";

const home=MAPS.find(map=>map.id===0);
const homeScene=createHelionOneVisualMaps([home])[0].parallaxScene;
const outer=MAPS.find(map=>map.id===2);
const scenes={
  helion1:{map:{...home,spawn:null,questNpcs:[],parallaxScene:homeScene},focus:{x:-1100,y:400}},
  helion3:{map:{...outer,spawn:null,questNpcs:[],parallaxScene:createHelionThreeScene(outer)},focus:{x:3000,y:-1800}}
};
export const ENGINE_BACKDROP_ASSETS=[...new Set(Object.values(scenes).flatMap(({map})=>
  [...map.parallaxScene.backdrops,...map.parallaxScene.images].map(layer=>layer.src).filter(Boolean)))];

// Actual map scenery renderer and scene definitions, with gameplay markers
// omitted from this isolated comparison. Both panes share the same camera.
export function drawEngineBackdrop(ctx,width,height,decor,flight,cache,time){
  const scene=scenes[decor];
  if(!scene){background(ctx,width,height,time,0,{x:flight.travelX,y:flight.travelY});return;}
  const camera={x:scene.focus.x-width/2+Math.sin((flight.travelX || 0)/1600)*450,
    y:scene.focus.y-height/2+Math.sin((flight.travelY || 0)/1600)*450};
  drawWorldLayer({ctx,canvas:{__renderWidth:width,__renderHeight:height},cache,
    currentMap:scene.map,camera,nebulae:[],stars:[],dust:[],asteroids:[],
    player:{x:scene.focus.x,y:scene.focus.y},stations:[],getMapPortals:()=>[],getClosedMapPortals:()=>[],
    graphicsQuality:"high"});
}
