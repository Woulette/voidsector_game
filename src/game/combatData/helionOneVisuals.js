import { getFirmHomeMapTheme } from "../../shared/firmHomeMapThemes.js";
import { mirrorFirmHomeScenery } from "./firmHomeMapScenery.js";

const ASSET_ROOT = "assets/maps/decor/helion01-v1";
// These gutters follow the six separate silhouettes in the source atlas.
const ASTEROID_COLUMNS = [{x:0,w:560}, {x:560,w:480}, {x:1040,w:496}];

export const HELION_ONE_ASSETS = Object.freeze({
  planet:`${ASSET_ROOT}/planet-crimson.png`,
  nebula:`${ASSET_ROOT}/nebula-crimson.png`,
  dust:"assets/maps/decor/helion01-v3/dust-wisp.png",
  asteroids:"assets/maps/decor/helion01-v2/asteroids-atlas.png",
  wreck:"assets/maps/decor/astra02_station_wreck.png",
  frigate:"assets/maps/decor/helion01-v4/derelict-frigate.png",
  stellar:"assets/maps/decor/helion01-v4/stellar-corona.png"
});

function cloud(src, x, y, w, h, p, alpha, rotation, flipX = false){
  return {kind:"cloud", effect:"nebulae", src, space:"map", x, y, w, h, p, alpha, rotation, flipX, edgeFade:true};
}

function createAsteroidScenery(map){
  let seed = 190119;
  const random = ()=>{
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const rocks = [];
  const fields = [
    {x:-3000,y:-400,rx:1000,ry:2500,start:-1.7,span:3.1,spread:500,count:90},
    {x:1600,y:1800,rx:2000,ry:800,start:-.5,span:3.2,spread:580,count:100},
    {x:2700,y:-1700,rx:1900,ry:1300,start:-2.9,span:3.1,spread:620,count:80},
    {count:80}
  ];
  for(const field of fields){
    for(let index = 0; index < field.count; index++){
      const angle = (field.start || 0) + random() * (field.span || Math.PI * 2);
      const x = field.rx ? field.x + Math.cos(angle) * field.rx + (random() - .5) * field.spread
        : (random() - .5) * (map.width - 220);
      const y = field.ry ? field.y + Math.sin(angle) * field.ry + (random() - .5) * field.spread
        : (random() - .5) * (map.height - 220);
      if(Math.abs(x) > map.width / 2 - 90 || Math.abs(y) > map.height / 2 - 90) continue;
      if(Math.hypot(x - map.spawn.x, y - map.spawn.y) < 240) continue;
      if(map.portals?.some(portal=>Math.hypot(x - portal.x, y - portal.y) < 250)) continue;
      const depth = random();
      const far = depth < .62, close = depth > .93;
      const p = far ? .34 + random() * .14 : close ? .86 + random() * .08 : .58 + random() * .14;
      const size = Math.round(far ? 22 + random() * 23 : close ? 50 + random() * 34 : 35 + random() * 31);
      const variant = Math.floor(random() * 6), atlasColumn = ASTEROID_COLUMNS[variant % 3];
      rocks.push({
        kind:"asteroid", src:HELION_ONE_ASSETS.asteroids, effect:"backgroundAsteroids", space:"map", edgeFade:true,
        frame:{x:atlasColumn.x / 1536, y:Math.floor(variant / 3) / 2, w:atlasColumn.w / 1536, h:1 / 2},
        x, y, w:size, h:size * 512 / atlasColumn.w, p,
        rotation:random() * Math.PI * 2,
        alpha:far ? .72 + random() * .12 : close ? .94 + random() * .06 : .86 + random() * .10
      });
    }
  }
  return rocks;
}

function createHelionOneScene(map){
  const {planet, nebula, dust, wreck, frigate, stellar} = HELION_ONE_ASSETS;
  const layers = [
    // Distant lower-left planet, slightly smaller and shifted down-right at spawn.
    {kind:"planet", src:planet, space:"map", x:-10560, y:11870, w:1380, h:1380, p:.07, alpha:1},
    {kind:"stellar", src:stellar, effect:"starGlow", space:"map", x:-3000,y:1400,w:600,h:400,p:.065,alpha:.78,rotation:-.12,blend:"screen"},
    {kind:"wreck", src:frigate, space:"map", x:-2100,y:-1700,w:360,h:240,p:.20,alpha:.90,rotation:.10,edgeFade:true},
    {kind:"wreck", src:wreck, space:"map", x:-3100,y:2400,w:260,h:146,p:.22,alpha:.88,rotation:.28,edgeFade:true},
    ...createAsteroidScenery(map),
    cloud(nebula, -2400,-1650,1800,1100,.50,.28,.22),
    cloud(nebula, 2550,1950,1900,1150,.54,.26,-.65),
    cloud(dust, 2300,-1900,1500,650,.62,.25,-.35,true),
    cloud(dust, -1100,400,1350,620,.84,.22,.25),
    cloud(dust, 2800,1200,1300,600,.88,.19,-.35,true)
  ];
  return {
    enabled:true, hideGrid:true, clipToBounds:false, showBoundary:false, edgeFadeDistance:460, vignetteOpacity:.5,
    skyFade:{inside:900,outside:120},
    background:["#08070c", "#1b0d15", "#09070d"],
    nebulae:[],
    backdrops:[
      cloud(dust,-2500,-1000,2400,1400,.065,.10,.35),
      cloud(nebula,3200,1800,2000,1500,.085,.13,-.40,true),
      cloud(nebula,-4500,-3400,1800,1300,.10,.10,.20),
      cloud(nebula,4400,-2800,1700,1100,.11,.10,-.25,true),
      cloud(dust,1400,3600,2100,900,.12,.09,.60)
    ].map(layer=>({...layer,edgeFade:false})),
    // A single far-to-near order lets close dust cross the planet and distant rocks.
    images:layers.sort((a,b)=>a.p - b.p),
    starLights:[
      {space:"map",x:-3300,y:-1600,p:.075,r:750,alpha:.23,static:true,point:false},
      {space:"map",x:3500,y:2400,p:.09,r:700,alpha:.22,static:true,point:false,
        colors:{core:"255,220,190",hot:"244,177,136",mid:"210,112,110",haze:"157,68,89"}}
    ],
    dustSpecks:[], lightClouds:[], foregroundClouds:[], glowSpots:[], tiles:[], asteroidFields:[]
  };
}

// Keep the historical entry point; the four home sectors now share the approved
// composition. Generate the rock distribution once before reflecting it.
export function createHelionOneVisualMaps(maps){
  const home = maps.find(map=>getFirmHomeMapTheme(map)?.palette === "astra")
    || maps.find(map=>getFirmHomeMapTheme(map));
  if(!home) return maps;
  const theme = getFirmHomeMapTheme(home);
  const canonical = theme.palette === "astra" ? home : {
    ...home, spawn:{...home.spawn, x:home.spawn.x * theme.mirrorX, y:home.spawn.y * theme.mirrorY},
    portals:home.portals?.map(portal=>({...portal, x:portal.x * theme.mirrorX, y:portal.y * theme.mirrorY}))
  };
  const scene = createHelionOneScene(canonical);
  return maps.map(map=>{
    const firmTheme = getFirmHomeMapTheme(map);
    return firmTheme ? {...map, closeStarCount:420,
      parallaxScene:firmTheme.palette === "astra" ? scene : mirrorFirmHomeScenery(scene, firmTheme)} : map;
  });
}
