import { AZURON_PORTAL_MAP, AZURON_WAVE_FAMILIES } from "../../data/azuronPortal.js";
import { SECTOR_PORTAL_VISUAL_ASSETS } from "../../data/sectorPortalVisuals.js?v=20261024-sector-portals1";

export const AZURON_ARENA_ASSET = "assets/maps/decor/azuron-blue-v1/azure-nebula.png";
export const AZURON_LAYER_ASSETS = Object.freeze({
  mist:"assets/maps/decor/azuron-layered-v1/azure-mist.png",
  celestial:"assets/maps/decor/azuron-nebula-v2/celestial-bank.png",
  rift:"assets/maps/decor/azuron-nebula-v2/rift-bank.png"
});

// Each transparent source is 1536 x 1024. A piece stays at most 760 x 507
// logical pixels, keeping native detail even at a canvas pixel ratio of two.
function cloud(asset,x,y,w,p,alpha,rotation = 0,flipX = false,options = {}){
  return {kind:"cloud",effect:"nebulae",src:AZURON_LAYER_ASSETS[asset],space:"map",
    x:x/p,y:y/p,w,h:w*2/3,p,alpha,rotation,flipX,blend:"source-over",edgeFade:false,minimap:false,...options};
}

function distantClouds(){
  // Offsets describe the distant sky at the arena centre. All pieces remain
  // native-sized; their slow camera motion keeps the nebula behind the combat.
  return [
    cloud("mist",-700,-300,760,.045,.24,.25),
    cloud("mist",700,280,760,.045,.24,-.30,true),
    cloud("mist",-60,-410,720,.05,.28,-.12,true),
    cloud("mist",100,400,740,.05,.24,.18),
    // The two bright banks follow the upper-left / lower-right composition
    // of the existing minimap illustration, with dimmer gas joining them.
    cloud("celestial",-450,-220,760,.075,.96,.26,true),
    cloud("rift",-110,-320,700,.07,.68,-.32,true),
    cloud("celestial",-660,80,720,.08,.78,-.55),
    cloud("rift",420,240,760,.075,.96,.06),
    cloud("celestial",660,-20,720,.08,.74,.65,true),
    cloud("rift",40,390,700,.07,.72,.16,true),
    cloud("celestial",-220,90,660,.06,.46,.48),
    cloud("rift",210,-90,680,.065,.48,-.68,true),
    cloud("mist",0,30,700,.05,.24,.15,true),
    // Extra outer banks keep the same density on wide displays and when flying
    // to the arena edges, without enlarging any individual source image.
    cloud("rift",-1050,-300,760,.07,.72,.24,true),
    cloud("celestial",1040,280,760,.07,.74,-.12),
    cloud("celestial",-1000,380,740,.075,.58,-.40),
    cloud("rift",1030,-380,740,.075,.58,.42,true)
  ];
}

export function createAzuronArena(portal){
  return {
    id:`portal-${portal.id}`, name:portal.name.toUpperCase(), azuronPortal:true,
    width:AZURON_PORTAL_MAP.width, height:AZURON_PORTAL_MAP.height,
    spawn:{...AZURON_PORTAL_MAP.spawn,r:240,kind:"portal",label:"POINT D’ENTRÉE"},
    portal:null,waveFamilies:AZURON_WAVE_FAMILIES,
    // The complete illustration is only a small minimap overview now.
    miniMapVisual:{image:AZURON_ARENA_ASSET},
    portalAssets:["assets/portals/seuil_azuron.png?v=20260726-kharon1",...Object.values(SECTOR_PORTAL_VISUAL_ASSETS)],
    enemyAssets:[
      "assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png",
      "assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png",
      "assets/enemies/enemy_green_parasite.png","assets/enemies/enemy_blue_spider.png",
      "assets/enemies/generated/void-crystals/eclanite.png","assets/enemies/generated/astra4_ember_cuirass.png"
    ],
    parallaxScene:{
      enabled:true,hideGrid:true,clipToBounds:false,showBoundary:false,
      edgeFadeDistance:600,skyFade:{inside:800,outside:220},vignetteOpacity:.16,
      background:["#010719","#041329","#02091b"],
      images:[],
      backdrops:distantClouds(),
      nebulae:[
        {x:-430,y:-280,r:1050,p:.06,color:"rgba(26,110,204,.16)",mid:"rgba(12,45,103,.07)",edge:"rgba(0,0,0,0)"},
        {x:520,y:290,r:900,p:.09,color:"rgba(37,153,213,.14)",mid:"rgba(14,52,116,.06)",edge:"rgba(0,0,0,0)"}
      ],
      starLights:[{space:"map",x:-2400,y:-1600,p:.11,r:650,alpha:.05,static:true,point:false,
        colors:{core:"189,231,255",hot:"66,173,242",mid:"25,89,173",haze:"8,24,65"}}],
      dustSpecks:[],
      asteroidFields:[{x:0,y:0,w:7600,h:5200,count:24,p:.38,angle:.12,alpha:.35,
        sizeMin:3,sizeMax:12,sizePower:1.9,craters:1,tint:"ice",shadeMin:18,shadeMax:32}],
      lightClouds:[],foregroundClouds:[],glowSpots:[],tiles:[]
    }
  };
}
