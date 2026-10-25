import { HELION_ONE_ASSETS } from "./helionOneVisuals.js";
import { createHelionTwoScene } from "./helionTwoVisuals.js";

export const HELION_THREE_ASSETS=Object.freeze({
  nebula:HELION_ONE_ASSETS.nebula,dust:HELION_ONE_ASSETS.dust,
  planet:"assets/maps/decor/helion03-cataclysm-v1/shattered-planet.webp",
  star:"assets/maps/decor/helion03-crimson-v1/distant-star.svg",
  wreck:"assets/maps/decor/helion03-crimson-v1/cargo-wreck.png"
});
const planetAsset=HELION_THREE_ASSETS.planet;
// Four irregularly scattered distant suns, with an unequal left/right balance.
// These offsets are their apparent position relative
// to the sector centre; slow parallax keeps them behind the planet and dust.
const distantStars = [
  [-650,-80,66,.020,.95], [-350,-290,44,.021,.86],
  [-220,260,52,.020,.90], [610,-120,74,.018,1]
].map(([x,y,w,p,alpha])=>({kind:"star",effect:"starGlow",space:"map",
  src:HELION_THREE_ASSETS.star,
  x:x/p,y:y/p,w,h:w,p,alpha,blend:"screen",edgeFade:false,minimap:false
}));
export const HELION_THREE_PARAMETERS = Object.freeze({p:.065});
export const overview = Object.freeze({
  atmosphere:{src:HELION_ONE_ASSETS.nebula,alpha:.20},
  landmarks:{planet:{x:.52,y:.47,width:.20},
    nebula:{x:.77,y:.39,width:.62},dustbank:{x:.20,y:.74,width:.68}}
});

function planetFragment(x, y, size, variant, rotation, alpha){
  const columns=[{x:0,w:560},{x:560,w:480},{x:1040,w:496}];
  const column=columns[variant % 3], p=.045;
  return {kind:"planet-fragment",effect:"backgroundAsteroids",space:"map",
    src:HELION_ONE_ASSETS.asteroids,x:x/p,y:y/p,w:size,h:size*512/column.w,p,
    alpha,rotation,edgeFade:false,minimap:false,
    frame:{x:column.x/1536,y:Math.floor(variant/3)/2,w:column.w/1536,h:.5},
    filter:"brightness(.65) saturate(.75)"};
}

export function createHelionThreeScene(map){
  const additions=[
    planetFragment(291,42,42,2,.5,.72),
    planetFragment(347,105,29,3,-.45,.62),
    planetFragment(420,139,20,0,.7,.52),
    planetFragment(475,111,13,5,-.8,.45),
    {kind:"wreck",src:HELION_THREE_ASSETS.wreck,
      space:"map",x:-2600,y:-950,w:620,h:310,p:.18,alpha:1,
      rotation:-.17,filter:"brightness(.76) saturate(.78) contrast(.94)",
      edgeFade:true,minimap:false}
  ];

  const family = createHelionTwoScene(map);
  // Same five background layers and palette as the approved first two sectors.
  // The new composition is assembled from existing native textures, not a sky poster.
  const mainCloud = {kind:"nebula",effect:"nebulae",src:HELION_ONE_ASSETS.nebula,
    space:"map",x:7400,y:-1800,w:1150,h:1150,p:.065,alpha:.34,
    rotation:-.32,flipX:true,edgeFade:false,minimap:true};
  const dustbank = {kind:"dustbank",effect:"nebulae",src:HELION_ONE_ASSETS.dust,
    space:"map",x:-6800,y:2600,w:1700,h:850,p:.075,alpha:.20,
    rotation:-.32,edgeFade:false,minimap:true};
  const drift = (x,y,w,h,p,alpha,rotation,flipX=false)=>({kind:"cloud",
    effect:"nebulae",src:HELION_ONE_ASSETS.dust,space:"map",x,y,w,h,p,
    alpha,rotation,flipX,edgeFade:true,minimap:false});
  return {...family,
    vignetteOpacity:.42,
    backdrops:[...family.backdrops,mainCloud,dustbank],
    images:[
      ...additions,
      ...distantStars,
      {kind:"planet",src:planetAsset,space:"map",x:1800,y:-2200,w:480,h:320,
        p:.03,alpha:1,edgeFade:false,minimap:true},
      ...family.images.filter(layer=>layer.kind === "asteroid"),
      drift(-2900,1800,1500,750,.45,.17,-.32),
      drift(2700,-2100,1650,825,.50,.15,.28,true),
      drift(-2100,-1800,1300,650,.72,.12,.20),
      drift(2600,2100,1400,700,.84,.13,-.35,true)
    ].sort((a,b)=>a.p-b.p),
    starLights:[{space:"map",x:6900,y:-2000,p:.065,r:650,alpha:.17,
      static:true,point:false,
      colors:{core:"255,220,190",hot:"244,177,136",mid:"210,112,110",haze:"157,68,89"}}],
    dustSpecks:[{count:48,x:0,y:0,w:2800,h:1800,p:.018,
      sizeMin:.55,sizeMax:.90,alphaMin:.22,alphaMax:.46,
      colors:["226,238,255","255,235,215","255,255,255"],streak:0,wrap:false}]
  };
}

export function createHelionThreeVisualMaps(maps){
  return maps.map(map=>String(map.id)==="2" && map.name==="Helion-03"
    ? {...map,closeStarCount:420,parallaxScene:createHelionThreeScene(map)}
    : map);
}
