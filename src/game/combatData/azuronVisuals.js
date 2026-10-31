import { AZURON_PORTAL_MAP, AZURON_WAVE_FAMILIES } from "../../data/azuronPortal.js";

const ART_ROOT = "assets/maps/decor/azuron-v2";
export const AZURON_SCENERY_ASSETS = Object.freeze({
  void:`${ART_ROOT}/fractured-void.png`,
  arch:`${ART_ROOT}/fractured-arch.png`,
  refractors:`${ART_ROOT}/refractor-atlas.png`
});

function refractor(variant, x, y, size, p, options = {}){
  return {
    kind:"refractor", src:AZURON_SCENERY_ASSETS.refractors, space:"map",
    frame:{x:(variant % 2) / 2, y:Math.floor(variant / 2) / 2, w:.5, h:.5},
    x, y, w:size, h:size, p, alpha:1, edgeFade:false, minimap:false, ...options
  };
}

function makeGlassFragments(){
  let seed = 231031;
  const random = ()=>((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  return Array.from({length:44}, (_, index)=>{
    const angle = random() * Math.PI * 2;
    const far = index < 28;
    const radiusX = 1250 + random() * 1250;
    const radiusY = 850 + random() * 850;
    return refractor(index % 2 ? 2 : 3,
      Math.cos(angle) * radiusX, Math.sin(angle) * radiusY,
      far ? 70 + random() * 70 : 100 + random() * 110,
      far ? .22 + random() * .16 : .64 + random() * .22,
      {rotation:random() * Math.PI * 2, alpha:far ? .22 + random() * .18 : .55 + random() * .2, edgeFade:true});
  }).filter(piece=>Math.hypot(piece.x * piece.p, piece.y * piece.p) > 350);
}

export function createAzuronPortalMap(portal){
  return {
    id:"portal-blue", name:portal.name.toUpperCase(),
    width:AZURON_PORTAL_MAP.width, height:AZURON_PORTAL_MAP.height,
    spawn:{...AZURON_PORTAL_MAP.spawn, r:240, kind:"portal", label:"SEUIL D’AZURON"},
    portal:null, azuronPortal:true, waveFamilies:AZURON_WAVE_FAMILIES,
    enemyAssets:[
      "assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png",
      "assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png",
      "assets/enemies/enemy_green_parasite.png", "assets/enemies/enemy_blue_spider.png",
      "assets/enemies/generated/void-crystals/eclanite.png", "assets/enemies/generated/astra4_ember_cuirass.png"
    ],
    parallaxScene:{
      enabled:true, hideGrid:true, clipToBounds:false, showBoundary:false,
      edgeFadeDistance:420, skyFade:{inside:650, outside:160}, vignetteOpacity:.36,
      background:["#050510", "#0e0a1c", "#05040d"],
      backdrops:[{
        kind:"dimensionalVeil", src:AZURON_SCENERY_ASSETS.void, space:"map",
        x:0, y:0, w:2800, h:1867, p:.065, alpha:.92, blend:"screen", edgeFade:false
      }],
      images:[
        // These original landmarks belong to Azuron's shattered glass dimension.
        // Their hollow silhouettes leave the centre clear for the firing ring.
        {kind:"refractorArch", src:AZURON_SCENERY_ASSETS.arch, space:"map", x:-350, y:-80,
          w:1480, h:1480, p:.30, rotation:-.12, alpha:.92, minimap:true},
        refractor(1, 1400, 0, 760, .50, {rotation:.28, minimap:true}),
        refractor(3, 800, 1100, 660, .64, {rotation:-.4, alpha:.78}),
        refractor(0, 2100, -1450, 620, .60, {rotation:1.8, alpha:.65}),
        refractor(1, -1900, 1400, 560, .58, {rotation:-1.2, alpha:.58}),
        ...makeGlassFragments()
      ].sort((a, b)=>a.p - b.p),
      starLights:[
        {space:"map", x:-350, y:-80, p:.30, r:680, alpha:.07, static:true, point:false,
          colors:{core:"238,226,255", hot:"198,166,237", mid:"106,69,159", haze:"41,27,76"}},
        {space:"map", x:1450, y:150, p:.42, r:440, alpha:.10, static:true, point:false,
          colors:{core:"255,244,219", hot:"228,192,144", mid:"130,89,113", haze:"49,30,68"}}
      ],
      dustSpecks:[{
        x:-3000, y:-2000, w:6000, h:4000, count:120, p:.12,
        sizeMin:.15, sizeMax:.7, alphaMin:.012, alphaMax:.05,
        colors:["226,212,247", "241,215,170", "193,151,216"]
      }],
      nebulae:[], lightClouds:[], foregroundClouds:[], glowSpots:[], tiles:[], asteroidFields:[]
    }
  };
}
