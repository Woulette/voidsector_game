import { getFirmHomeMapTheme, getFirmHomeAssetPath } from "../../shared/firmHomeMapThemes.js";

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

export function getMiniMapVisualDefinition(map){
  if(String(map?.id) === "1" && map?.name === "Helion-02") return HELION_TWO_OVERVIEW;
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
