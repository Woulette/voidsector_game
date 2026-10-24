import { getFirmHomeMapTheme, getFirmHomeAssetPath } from "../../shared/firmHomeMapThemes.js";
import { getFirmSectorTwoTheme } from "./firmSectorTwoVisuals.js";

// Fixed illustrated overviews, independent of the pilot and the combat camera.
const HELION_ONE_OVERVIEW = Object.freeze({
  image:"assets/maps/minimaps/helion-01-wide-v3.png",
  atmosphere:{src:"assets/maps/decor/helion01-v1/nebula-crimson.png", alpha:.20},
  landmarks:{
    planet:{x:.10, y:.90, width:.44},
    stellar:{x:.40, y:.52, width:.28}
  }
});

const sectorOverviews = new Map();
const reflect = (value, sign)=>sign < 0 ? Number((1 - value).toFixed(4)) : value;
const HELION_TWO_OVERVIEW = Object.freeze({
  image:"assets/maps/minimaps/helion-02-wide-v3.png",
  atmosphere:HELION_ONE_OVERVIEW.atmosphere,
  landmarks:{planet:{x:.88,y:.23,width:.38},station:{x:.28,y:.44,width:.14}}
});
const HELION_THREE_OVERVIEW = Object.freeze({
  image:"assets/maps/minimaps/helion-03-wide-v2.png",
  landmarks:{
    nebula:{x:.60,y:.40,width:.88},
    planet:{x:.67,y:.34,width:.20}
  }
});

export function getMiniMapVisualDefinition(map){
  if(String(map?.id) === "1" && map?.name === "Helion-02") return HELION_TWO_OVERVIEW;
  if(String(map?.id) === "2" && map?.name === "Helion-03") return HELION_THREE_OVERVIEW;
  const industrialTheme = getFirmSectorTwoTheme(map);
  if(industrialTheme){
    const key = `industrial:${industrialTheme.id}`;
    if(!sectorOverviews.has(key)){
      sectorOverviews.set(key, Object.freeze({
        image:`assets/maps/minimaps/${industrialTheme.name.toLowerCase()}-wide-v1.png`,
        atmosphere:{...HELION_TWO_OVERVIEW.atmosphere,
          src:getFirmHomeAssetPath(HELION_TWO_OVERVIEW.atmosphere.src, industrialTheme)},
        landmarks:Object.fromEntries(Object.entries(HELION_TWO_OVERVIEW.landmarks).map(([kind, placement])=>
          [kind, {...placement, x:reflect(placement.x, industrialTheme.mirrorX), y:reflect(placement.y, industrialTheme.mirrorY)}]))
      }));
    }
    return sectorOverviews.get(key);
  }
  const theme = getFirmHomeMapTheme(map);
  if(!theme) return null;
  if(theme.palette === "astra") return HELION_ONE_OVERVIEW;
  if(!sectorOverviews.has(theme.id)){
    sectorOverviews.set(theme.id, Object.freeze({
      image:`assets/maps/minimaps/${theme.name.toLowerCase()}-v1.png`,
      atmosphere:{...HELION_ONE_OVERVIEW.atmosphere,
        src:getFirmHomeAssetPath(HELION_ONE_OVERVIEW.atmosphere.src, theme)},
      landmarks:Object.fromEntries(Object.entries(HELION_ONE_OVERVIEW.landmarks).map(([kind, placement])=>
        [kind, {...placement, x:reflect(placement.x, theme.mirrorX), y:reflect(placement.y, theme.mirrorY)}]))
    }));
  }
  return sectorOverviews.get(theme.id);
}
