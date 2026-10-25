import { HELION_ONE_ASSETS } from "./helionOneVisuals.js";
import { createHelionTwoScene } from "./helionTwoVisuals.js";

import { finishHelionThreeScene } from "./helionThreeFinishes.js";

const finishDecor = "assets/maps/decor/helion03-eclanite-v1/";
const decor = "assets/maps/decor/helion03-ruins-v1/";
export const HELION_THREE_ASSETS = Object.freeze({
  nebula:HELION_ONE_ASSETS.nebula, dust:HELION_ONE_ASSETS.dust,
  planet:"assets/maps/decor/helion03-cataclysm-v1/shattered-planet.webp",
  star:"assets/maps/decor/helion03-crimson-v1/distant-star.svg",
  ruin:"assets/maps/decor/helion03-reflections-v1/orbital-ruin.png", violetGas:decor+"violet-gas.png",
  crystalOutcrop:finishDecor+"outcrop.png", crystalSeam:finishDecor+"outcrop.png",
  splinter:finishDecor+"splinter.png", flake:finishDecor+"flake.png",
  copper:finishDecor+"asteroids-copper.png", violet:finishDecor+"asteroids-violet.png"
});
export const HELION_THREE_PARAMETERS = Object.freeze({p:.065});
export const overview = Object.freeze({
  atmosphere:{src:HELION_ONE_ASSETS.nebula,alpha:.20},
  landmarks:{planet:{x:.52,y:.47,width:.15},
    nebula:{x:.77,y:.39,width:.62},"violet-gas":{x:.77,y:.39,width:.62},
    dustbank:{x:.20,y:.74,width:.68}}
});

// Apparent offsets at the sector centre are independent of the camera's depth.
const distantStars = [
  [-650,-80,66,.020,.95], [-350,-290,44,.021,.86],
  [-220,260,52,.020,.90], [610,-120,74,.018,1]
].map(([x,y,w,p,alpha])=>({kind:"star",effect:"starGlow",space:"map",
  src:HELION_THREE_ASSETS.star,x:x/p,y:y/p,w,h:w,p,alpha,
  blend:"screen",edgeFade:false,minimap:false}));

const deposits = [
  [3250,-1850,48,HELION_THREE_ASSETS.crystalOutcrop,.22,-.20],
  [-3050,1850,38,HELION_THREE_ASSETS.crystalSeam,.24,.60]
].map(([x,y,w,src,p,rotation])=>({kind:"crystal",effect:"backgroundAsteroids",space:"map",
  src,x,y,w,h:w,p,rotation,alpha:.72,edgeFade:true,minimap:false,
  filter:"brightness(.72) saturate(.82)"}));

const shards = [
  [225,-265,30,HELION_THREE_ASSETS.splinter,.055,.20],
  [360,-135,38,HELION_THREE_ASSETS.flake,.060,-.90],
  [470,-180,22,HELION_THREE_ASSETS.splinter,.065,1.20],
  [405,110,28,HELION_THREE_ASSETS.flake,.058,-.60],
  [-330,230,25,HELION_THREE_ASSETS.splinter,.055,.70],
  [-480,-110,20,HELION_THREE_ASSETS.flake,.060,.30]
].map(([x,y,w,src,p,rotation])=>({kind:"eclanite-shard",effect:"backgroundAsteroids",space:"map",
  src,x:x/p,y:y/p,w,h:w,p,rotation,alpha:1,edgeFade:false,minimap:false,
  blend:"screen",filter:"brightness(2.3) saturate(.85)"}));

// Apparent positions at the centre of the map. Deliberately broken, unequal groups.
const distantAsteroidFields = [
  {x:-600,y:-285,rx:235,ry:110,count:10},
  {x:-90,y:-360,rx:275,ry:75,count:9},
  {x:675,y:80,rx:210,ry:230,count:10},
  {x:-280,y:315,rx:250,ry:95,count:11}
];

function createDistantAsteroids(){
  let seed=251025;
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const columns=[{x:0,w:560},{x:560,w:480},{x:1040,w:496}];
  return distantAsteroidFields.flatMap(field=>Array.from({length:field.count},()=>{
    const angle=random()*Math.PI*2,radius=Math.sqrt(random());
    const x=field.x+Math.cos(angle)*field.rx*radius;
    const y=field.y+Math.sin(angle)*field.ry*radius;
    const p=.024+random()*.018,w=11+random()*13;
    const variant=Math.floor(random()*6),column=columns[variant%3];
    const violet=x>470&&y<230,lit=random()>.4;
    return {kind:"distant-asteroid",effect:"backgroundAsteroids",space:"map",
      src:lit?(violet?HELION_THREE_ASSETS.violet:HELION_THREE_ASSETS.copper):HELION_ONE_ASSETS.asteroids,
      x:x/p,y:y/p,w,h:w*512/column.w,p,alpha:1,rotation:random()*Math.PI*2,
      frame:{x:column.x/1536,y:Math.floor(variant/3)/2,w:column.w/1536,h:.5},
      blend:"source-over",filter:`brightness(${lit?.78:.66}) saturate(.62)`,
      edgeFade:false,minimap:false};
  }));
}


function planetFragment(x,y,size,variant,rotation){
  const columns=[{x:0,w:560},{x:560,w:480},{x:1040,w:496}];
  const column=columns[variant%3],p=.105;
  return {kind:"planet-fragment",effect:"backgroundAsteroids",space:"map",
    src:HELION_ONE_ASSETS.asteroids,x:(54+(x-54)*.75)/p,y:(-66+(y+66)*.75)/p,
    w:size*.75,h:size*512/column.w*.75,p,alpha:1,rotation,edgeFade:false,minimap:false,
    frame:{x:column.x/1536,y:Math.floor(variant/3)/2,w:column.w/1536,h:.5},
    filter:"brightness(.65) saturate(.75)"};
}

export function createHelionThreeScene(map){
  const family=createHelionTwoScene(map);
  // Keep the family textures. Depth comes from scale and shading, never transparent rock bodies.
  const asteroids=family.images.filter(layer=>layer.kind==="asteroid").filter((_,index)=>index%3!==0).map(layer=>{
    const far=layer.p<.5,near=layer.p>=.8,scale=far?.76:near?.84:.82;
    return {...layer,w:layer.w*scale,h:layer.h*scale,alpha:1,
      filter:`brightness(${far?.57:near?.65:.63}) saturate(.70)`};
  });
  const mainCloud={kind:"nebula",effect:"nebulae",src:HELION_ONE_ASSETS.nebula,
    space:"map",x:7400,y:-1800,w:1150,h:1150,p:.065,alpha:.34,
    rotation:-.32,flipX:true,edgeFade:false,minimap:true};
  const dustbank={kind:"dustbank",effect:"nebulae",src:HELION_ONE_ASSETS.dust,
    space:"map",x:-6800,y:2600,w:1700,h:850,p:.075,alpha:.20,
    rotation:-.32,edgeFade:false,minimap:true};
  // Native-resolution export of the approved masked lighting, shared with the minimap.
  const emission={...mainCloud,kind:"violet-gas",src:HELION_THREE_ASSETS.violetGas,alpha:.54,blend:"screen"};
  const drift=(x,y,w,h,p,alpha,rotation,flipX=false)=>({kind:"cloud",effect:"nebulae",
    src:HELION_ONE_ASSETS.dust,space:"map",x,y,w,h,p,alpha,rotation,flipX,edgeFade:true,minimap:false});
  return finishHelionThreeScene({...family,vignetteOpacity:.42,
    backdrops:[...family.backdrops,mainCloud,dustbank,emission],
    images:[
      ...distantStars,...createDistantAsteroids(),...asteroids,...deposits,...shards,
      planetFragment(291,42,42,2,.5),planetFragment(347,105,29,3,-.45),
      planetFragment(420,139,20,0,.7),planetFragment(475,111,13,5,-.8),
      {kind:"planet",src:HELION_THREE_ASSETS.planet,space:"map",x:54/.09,y:-66/.09,
        w:360,h:240,p:.09,alpha:1,edgeFade:false,minimap:true},
      {kind:"ruin",src:HELION_THREE_ASSETS.ruin,space:"map",x:-490/.22,y:-154/.22,
        w:420,h:280,p:.22,alpha:1,rotation:-.08,filter:"brightness(.82) saturate(.88) contrast(.98)",
        edgeFade:true,minimap:false},
      drift(-2900,1800,1500,750,.45,.17,-.32),drift(2700,-2100,1650,825,.50,.15,.28,true),
      drift(-2100,-1800,1300,650,.72,.12,.20),drift(2600,2100,1400,700,.84,.13,-.35,true)
    ].sort((a,b)=>a.p-b.p),
    starLights:[
      {space:"map",x:6900,y:-2000,p:.065,r:650,alpha:.17,static:true,point:false,
        colors:{core:"255,220,190",hot:"244,177,136",mid:"210,112,110",haze:"157,68,89"}},
      {space:"map",x:mainCloud.x,y:mainCloud.y,p:mainCloud.p,r:420,alpha:.22,static:true,point:false,
        colors:{core:"218,177,255",hot:"179,91,247",mid:"128,57,209",haze:"88,35,139"}}
    ],
    dustSpecks:[{count:48,x:0,y:0,w:2800,h:1800,p:.018,sizeMin:.55,sizeMax:.90,alphaMin:.22,alphaMax:.46,
      colors:["226,238,255","255,235,215","255,255,255"],streak:0,wrap:false}]
  },HELION_THREE_ASSETS);
}

export function createHelionThreeVisualMaps(maps){
  return maps.map(map=>String(map.id)==="2"&&map.name==="Helion-03"
    ? {...map,closeStarCount:420,parallaxScene:createHelionThreeScene(map)}:map);
}
