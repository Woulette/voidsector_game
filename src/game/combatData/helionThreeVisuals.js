export const HELION_THREE_ASSETS = Object.freeze({
  nebula:"assets/maps/decor/astra02_nebula_mass_cutout.png",
  dust:"assets/maps/decor/helion01-v3/dust-wisp.png",
  planet:"assets/maps/decor/helion03-cataclysm-v1/shattered-planet.webp"
});

export const HELION_THREE_PARAMETERS = Object.freeze({
  x:1600, y:-1100, w:3000, h:3000 * 923 / 1704,
  p:.060, alpha:.76, rotation:-.10
});

// At the sector centre, the very slow layer sits about 270 units right and
// 150 units above the camera centre. Its world anchor is intentionally distant.
export const HELION_THREE_PLANET_PLACEMENT = Object.freeze({
  x:9000, y:-5000, w:480, h:480 * 1024 / 1536, p:.030
});

export function createHelionThreeScene(map){
  const base = map.parallaxScene || {};
  const rocks = (base.images || []).filter(layer=>layer.kind === "asteroid"
    || /asteroid|meteor/i.test(layer.src || ""));
  return {
    ...base,
    enabled:true, hideGrid:true, clipToBounds:false, showBoundary:false,
    background:["#080409", "#200912", "#09040a"],
    edgeFadeDistance:460, skyFade:{inside:900,outside:120}, vignetteOpacity:.40,
    // Retain the approved single distant red/copper nebula composition.
    backdrops:[{
      ...HELION_THREE_PARAMETERS, kind:"nebula", effect:"nebulae",
      src:HELION_THREE_ASSETS.nebula, space:"map", blend:"screen", edgeFade:false, minimap:true
    }],
    images:[
      {kind:"planet", src:HELION_THREE_ASSETS.planet, space:"map",
        ...HELION_THREE_PLANET_PLACEMENT, alpha:1, edgeFade:false, minimap:true},
      ...rocks,
      {kind:"cloud", effect:"nebulae", src:HELION_THREE_ASSETS.dust, space:"map",
        x:-3400,y:-1700,w:1900,h:950,p:.34,alpha:.105,rotation:.22,edgeFade:true,minimap:false},
      {kind:"cloud", effect:"nebulae", src:HELION_THREE_ASSETS.dust, space:"map",
        x:3500,y:2400,w:1600,h:800,p:.48,alpha:.085,rotation:-.28,flipX:true,edgeFade:true,minimap:false}
    ].sort((a,b)=>(a.p || 0) - (b.p || 0)),
    starLights:[
      {space:"map",x:-1700,y:900,p:.060,r:430,alpha:.15,static:true,point:false,
        colors:{core:"255,228,201",hot:"249,151,92",mid:"211,65,42",haze:"119,28,42"}},
      {space:"map",x:3900,y:-2100,p:.060,r:550,alpha:.18,static:true,point:false,
        colors:{core:"255,233,210",hot:"253,165,105",mid:"220,76,45",haze:"128,28,41"}}
    ],
    asteroidFields:base.asteroidFields,
    tiles:base.tiles,
    nebulae:[], lightClouds:[], foregroundClouds:[], glowSpots:[], dustSpecks:[]
  };
}

// Visual overlay only. Preserve every canonical map property and all other
// sectors by reference; no new collision, portal, reward or enemy data.
export function createHelionThreeVisualMaps(maps){
  return maps.map(map=>String(map.id) === "2" && map.name === "Helion-03"
    ? {...map, parallaxScene:createHelionThreeScene(map)} : map);
}
