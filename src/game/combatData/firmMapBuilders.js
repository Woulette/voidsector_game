import { CORE_MAP_ID, FIRM_INTERNAL_PORTALS, FIRM_LIGHT_PALETTES, FIRM_VISUALS } from "./mapConstants.js";
import { cloneData, firmMapId, getAstraTemplate, getInternalFirmMapName, portalFromDir, themeObject } from "./mapUtils.js";
function getFirmPlanetPosition(firm, num){
  const perMap = {
    CYAN:{2:{x:250,y:-250}},
    JAUNE:{2:{x:250,y:-250}},
    VERTE:{2:{x:250,y:-250}}
  };
  if(perMap[firm]?.[num]) return perMap[firm][num];
  const cell = FIRM_VISUALS[firm].cells[num] || {x:0,y:0};
  return {
    x:cell.x < 0 ? -640 : 640,
    y:cell.y < 0 ? -520 : 460
  };
}

function applyFirmVisuals(map, firm, num){
  const visual = FIRM_VISUALS[firm];
  const lights = FIRM_LIGHT_PALETTES[firm];
  map.name = getInternalFirmMapName(firm, num);
  map.id = firmMapId(firm, num);
  map.enemySeed = Number(map.enemySeed || 0) + visual.seedOffset;
  map.parallaxScene = themeObject(map.parallaxScene || {}, firm);
  map.parallaxScene.background = visual.background;
  if(lights){
    if(Array.isArray(map.parallaxScene.glowSpots)){
      map.parallaxScene.glowSpots = map.parallaxScene.glowSpots.map(spot=>({
        ...spot,
        core:`rgba(${lights.core},${Number.isFinite(spot.alpha) ? spot.alpha : .42})`,
        hot:`rgba(${lights.hot},${Number.isFinite(spot.alpha) ? spot.alpha * .7 : .28})`,
        mid:spot.color || `rgba(${lights.mid},${Number.isFinite(spot.alpha) ? spot.alpha * .38 : .16})`
      }));
    }
    if(Array.isArray(map.parallaxScene.starLights)){
      map.parallaxScene.starLights = map.parallaxScene.starLights.map(light=>({
        ...light,
        colors:lights
      }));
    }
  }
  if(Array.isArray(map.parallaxScene.images)){
    const planet = getFirmPlanetPosition(firm, num);
    map.parallaxScene.images = map.parallaxScene.images.map(image=>{
      const next = {...image};
      if(String(next.src || "").includes("planet")){
        next.src = visual.planet;
        next.x = planet.x;
        next.y = planet.y;
      }
      return next;
    });
    if(!map.parallaxScene.images.some(image=>String(image.src || "").includes("planet_")) && num === 1){
      map.parallaxScene.images.unshift({src:visual.planet, x:planet.x, y:planet.y, w:1340, h:1340, p:.105, alpha:.98});
    }
  }
  if(num === 1 && map.spawn){
    const cell = visual.cells[1] || {x:-1,y:1};
    map.spawn.x = cell.x < 0 ? -4300 : 4300;
    map.spawn.y = cell.y < 0 ? -3300 : 3300;
    map.spawn.safeRect = null;
  }
  delete map.questNpcs;
  delete map.closedPortals;
  delete map.portal;
  map.firm = firm;
  map.theme = visual.tint;
  return map;
}

export function buildFirmMaps(sourceMaps, firm){
  const generatedMaps = [1,2,3,4,5].map(num=>applyFirmVisuals(cloneData(getAstraTemplate(sourceMaps, num)), firm, num));
  const byNum = new Map(generatedMaps.map((map, index)=>[index + 1, map]));
  generatedMaps.forEach(map=>{ map.portals = []; });
  FIRM_INTERNAL_PORTALS[firm].forEach(([fromNum, fromDir, toNum, toDir])=>{
    byNum.get(fromNum).portals.push(portalFromDir({
      from:fromDir,
      toMap:firmMapId(firm, toNum),
      to:toDir,
      label:`VERS ${getInternalFirmMapName(firm, toNum)}`
    }));
    byNum.get(toNum).portals.push(portalFromDir({
      from:toDir,
      toMap:firmMapId(firm, fromNum),
      to:fromDir,
      label:`VERS ${getInternalFirmMapName(firm, fromNum)}`
    }));
  });
  return generatedMaps;
}

export function buildCoreMap(maps){
  const core = cloneData(getAstraTemplate(maps, 5));
  core.id = CORE_MAP_ID;
  core.name = "CORE";
  core.firm = "CORE";
  core.theme = "core";
  core.spawn = {x:0,y:0,r:360,label:"NOYAU CENTRAL",safeRadius:520,decorRadius:600};
  core.enemySeed = 900;
  core.enemyCount = 55;
  core.enemyLevel = [25,34];
  core.parallaxScene = themeObject(core.parallaxScene || {}, "CYAN");
  core.parallaxScene.background = ["#04010b", "#11051f", "#020104"];
  core.parallaxScene.images = [];
  core.portals = [
    portalFromDir({from:"left", toMap:4, to:"right", label:"VERS Helion-05"}),
    portalFromDir({from:"top", toMap:firmMapId("CYAN", 5), to:"right", label:"VERS Nereid-05"}),
    portalFromDir({from:"right", toMap:firmMapId("JAUNE", 5), to:"left", label:"VERS Aureon-05"}),
    portalFromDir({from:"bottom", toMap:firmMapId("VERTE", 5), to:"left", label:"VERS Sylva-05"})
  ];
  return core;
}
