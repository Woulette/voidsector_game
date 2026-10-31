import { getFirmHomeMapTheme } from "../../shared/firmHomeMapThemes.js";
import { mirrorFirmHomeScenery } from "./firmHomeMapScenery.js";
import { createHelionTwoScene } from "./helionTwoVisuals.js";

const SECTOR_TWO_THEMES = Object.freeze([
  {id:21, name:"Nereid-02", homeId:20, homeName:"Nereid-01"},
  {id:31, name:"Aureon-02", homeId:30, homeName:"Aureon-01"},
  {id:41, name:"Sylva-02", homeId:40, homeName:"Sylva-01"}
].map(({id, name, homeId, homeName})=>Object.freeze({
  ...getFirmHomeMapTheme({id:homeId, name:homeName}), id, name
})));

export function getFirmSectorTwoTheme(map){
  return SECTOR_TWO_THEMES.find(theme=>String(map?.id) === String(theme.id) && map?.name === theme.name) || null;
}

function reflectNavigation(points, theme){
  return (points || []).map(point=>({...point,
    x:point.x * theme.mirrorX, y:point.y * theme.mirrorY
  }));
}

// Reflect navigation into Helion's frame before scattering rocks. Only the
// resulting scenery is reflected back; the original MMO geometry stays intact.
export function createFirmSectorTwoVisualMaps(maps){
  return maps.map(map=>{
    const theme = getFirmSectorTwoTheme(map);
    if(!theme) return map;
    const canonical = {...map,
      portals:reflectNavigation(map.portals, theme),
      closedPortals:reflectNavigation(map.closedPortals, theme),
      questNpcs:reflectNavigation(map.questNpcs, theme)
    };
    return {...map, closeStarCount:420,
      parallaxScene:mirrorFirmHomeScenery(createHelionTwoScene(canonical), theme)
    };
  });
}
