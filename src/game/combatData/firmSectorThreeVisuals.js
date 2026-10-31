import { getFirmHomeMapTheme } from "../../shared/firmHomeMapThemes.js";
import { createHelionThreeScene, HELION_THREE_ASSETS } from "./helionThreeVisuals.js";
import { HELION_ONE_ASSETS } from "./helionOneVisuals.js";
import { FIRM_SECTOR_THREE_ASSETS } from "./firmSectorThreeAssets.js";

const SECTOR_THREE_THEMES = Object.freeze([
  {id:22, name:"Nereid-03", homeId:20, homeName:"Nereid-01"},
  {id:32, name:"Aureon-03", homeId:30, homeName:"Aureon-01"},
  {id:42, name:"Sylva-03", homeId:40, homeName:"Sylva-01"}
].map(({id, name, homeId, homeName})=>Object.freeze({
  ...getFirmHomeMapTheme({id:homeId, name:homeName}), id, name,
  assets:FIRM_SECTOR_THREE_ASSETS[name.split("-")[0].toLowerCase()]
})));

export function getFirmSectorThreeTheme(map){
  return SECTOR_THREE_THEMES.find(theme=>String(map?.id) === String(theme.id) && map?.name === theme.name) || null;
}

function themeScene(scene, theme){
  const assets=theme.assets;
  const sources=new Map([
    [HELION_THREE_ASSETS.nebula,assets.nebula], [HELION_THREE_ASSETS.dust,assets.dust],
    [HELION_THREE_ASSETS.planet,assets.planet], [HELION_THREE_ASSETS.ruin,assets.ruin],
    [HELION_THREE_ASSETS.star,assets.star], [HELION_THREE_ASSETS.violetGas,assets.violetGas],
    [HELION_THREE_ASSETS.copper,assets.lit], [HELION_THREE_ASSETS.violet,assets.violet],
    [HELION_ONE_ASSETS.asteroids,assets.neutral],
    [HELION_THREE_ASSETS.crystalOutcrop,assets.crystalOutcrop],
    [HELION_THREE_ASSETS.splinter,assets.splinter], [HELION_THREE_ASSETS.flake,assets.flake]
  ]);
  // The main cloud keeps the firm's colour. Violet comes exclusively from
  // Helion's original localized emission mask, never a whole-cloud purple tint.
  const material=layer=>layer.src ? {...layer,
    src:layer.kind==="nebula" ? assets.mainNebula : sources.get(layer.src) || layer.src} : layer;
  const [ambient, ...eclaniteLights] = scene.starLights;
  return {...scene,
    background:[...theme.background],
    backdrops:scene.backdrops.map(material),
    images:scene.images.map(material),
    starLights:[{...ambient,colors:{...theme.lights}}, ...eclaniteLights],
    dustSpecks:scene.dustSpecks.map(layer=>({...layer,
      colors:[theme.lights.core,"223,217,240","242,245,249"]}))
  };
}

// Same approved composition and depth on all four sectors: no mirrored scenery.
// Keep navigation, enemies, dimensions and all other MMO data by reference.
export function createFirmSectorThreeVisualMaps(maps){
  return maps.map(map=>{
    const theme = getFirmSectorThreeTheme(map);
    return theme ? {...map, closeStarCount:420,
      parallaxScene:themeScene(createHelionThreeScene(map), theme)
    } : map;
  });
}
