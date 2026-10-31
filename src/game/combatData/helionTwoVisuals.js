import { HELION_ONE_ASSETS } from "./helionOneVisuals.js";

const ROOT = "assets/maps/decor/helion02-industrial-v1";
export const HELION_TWO_ASSETS = Object.freeze({
  station:`${ROOT}/orbital-station.webp`,
  freighter:`${ROOT}/derelict-freighter.webp`,
  planet:"assets/maps/decor/astra02_planet_small_red.png"
});

function cloud(src, x, y, w, h, p, alpha, rotation = 0, flipX = false){
  return {kind:"cloud", effect:"nebulae", src, space:"map", x, y, w, h, p, alpha, rotation, flipX, edgeFade:true};
}

function createIndustrialAsteroids(map){
  let seed = 271023;
  const random = ()=>((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const columns = [{x:0,w:560}, {x:560,w:480}, {x:1040,w:496}];
  const rocks = [];
  const fields = [
    {x:-3200,y:-400,rx:1450,ry:2300,start:-1.6,span:3.0,count:75},
    {x:2400,y:500,rx:1650,ry:2600,start:-1.8,span:3.2,count:95},
    {count:60}
  ];
  const navigation = [...(map.portals || []), ...(map.closedPortals || []), ...(map.questNpcs || [])];
  for(const field of fields){
    for(let i = 0; i < field.count; i++){
      const angle = (field.start || 0) + random() * (field.span || Math.PI * 2);
      const x = field.rx ? field.x + Math.cos(angle) * field.rx + (random() - .5) * 540
        : (random() - .5) * (map.width - 220);
      const y = field.ry ? field.y + Math.sin(angle) * field.ry + (random() - .5) * 540
        : (random() - .5) * (map.height - 220);
      if(Math.abs(x) > map.width / 2 - 100 || Math.abs(y) > map.height / 2 - 100) continue;
      if(navigation.some(point=>Math.hypot(x - point.x, y - point.y) < 320)) continue;
      const depth = random(), far = depth < .70, close = depth > .95;
      const size = far ? 24 + random() * 22 : close ? 58 + random() * 22 : 36 + random() * 25;
      const variant = Math.floor(random() * 6), column = columns[variant % 3];
      rocks.push({kind:"asteroid", effect:"backgroundAsteroids", src:HELION_ONE_ASSETS.asteroids,
        space:"map", edgeFade:true, x, y, w:size, h:size * 512 / column.w,
        frame:{x:column.x / 1536,y:Math.floor(variant / 3) / 2,w:column.w / 1536,h:.5},
        p:far ? .34 + random() * .13 : close ? .86 + random() * .07 : .58 + random() * .13,
        alpha:far ? .78 + random() * .12 : .94, rotation:random() * Math.PI * 2});
    }
  }
  return rocks;
}

export function createHelionTwoScene(map){
  const {nebula, dust} = HELION_ONE_ASSETS;
  const layers = [
    {kind:"planet", src:HELION_TWO_ASSETS.planet, space:"map", x:9600,y:-5700,w:750,h:750,p:.065,alpha:1},
    {kind:"wreck", src:HELION_TWO_ASSETS.freighter, space:"map", x:-4000,y:2700,
      w:350,h:175,p:.16,alpha:1,filter:"brightness(0.90) saturate(0.80) contrast(0.88)",edgeFade:true,minimap:false},
    // The diagonal and the volume are baked into the native sprite. No mirroring
    // or live 3D rendering is needed, and its solid hull remains opaque.
    {kind:"station", src:HELION_TWO_ASSETS.station, space:"map", x:-1750,y:-250,
      w:540,h:540 * 1145 / 1374,p:.36,alpha:1,filter:"brightness(0.90) saturate(0.80) contrast(0.88)",edgeFade:true,minimap:true},
    ...createIndustrialAsteroids(map),
    cloud(nebula,-3000,-1700,2200,1350,.50,.22,.16),
    cloud(nebula,2700,2200,1850,1100,.54,.24,-.65),
    cloud(dust,2200,-1800,1500,650,.64,.22,-.35,true),
    cloud(dust,-1900,2100,1300,620,.84,.17,.25),
    cloud(dust,2800,1500,1400,620,.87,.17,-.35,true)
  ];
  return {
    enabled:true, hideGrid:true, clipToBounds:false, showBoundary:false,
    edgeFadeDistance:460, vignetteOpacity:.42, skyFade:{inside:900,outside:120},
    background:["#08070c", "#1b0d15", "#09070d"],
    // The exact approved Helion-01 textures and depth ranges are reused here.
    backdrops:[
      cloud(dust,-2500,-1000,2400,1400,.065,.10,.35),
      cloud(nebula,3200,1800,2000,1500,.085,.13,-.40,true),
      cloud(nebula,-4500,-3400,1800,1300,.10,.10,.20),
      cloud(nebula,4400,-2800,1700,1100,.11,.10,-.25,true),
      cloud(dust,1400,3600,2100,900,.12,.09,.60)
    ].map(layer=>({...layer,edgeFade:false})),
    images:layers.sort((a,b)=>a.p - b.p),
    starLights:[
      {space:"map",x:-2000,y:-700,p:.085,r:680,alpha:.20,static:true,point:false},
      {space:"map",x:2300,y:1100,p:.09,r:650,alpha:.19,static:true,point:false,
        colors:{core:"255,220,190",hot:"244,177,136",mid:"210,112,110",haze:"157,68,89"}}
    ],
    nebulae:[], dustSpecks:[], lightClouds:[], foregroundClouds:[], glowSpots:[], tiles:[], asteroidFields:[]
  };
}

// Visual overlay only: canonical portals, NPCs, dimensions, enemies and quests
// are retained by reference, as are every other sector's approved visuals.
export function createHelionTwoVisualMaps(maps){
  return maps.map(map=>String(map.id) === "1" && map.name === "Helion-02"
    ? {...map,closeStarCount:420,parallaxScene:createHelionTwoScene(map)} : map);
}
