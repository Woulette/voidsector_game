import { getFirmHomeMapTheme, getFirmHomeAssetPath } from "../../shared/firmHomeMapThemes.js";
import { HELION_THREE_ASSETS } from "./helionThreeVisuals.js";
import { HELION_ONE_ASSETS } from "./helionOneVisuals.js";

// One silhouette and alpha channel per object on all four maps. Separate AI
// renders with equal canvas dimensions still had different visible bounds.
// Palette variants preserve every pixel's position and opacity at load time.
export const SECTOR_THREE_SHARED_ASSETS = Object.freeze({
  violetGas:HELION_THREE_ASSETS.violetGas,
  violet:HELION_THREE_ASSETS.violet,
  crystalOutcrop:HELION_THREE_ASSETS.crystalOutcrop,
  splinter:HELION_THREE_ASSETS.splinter,
  flake:HELION_THREE_ASSETS.flake
});

export const FIRM_SECTOR_THREE_ASSETS = Object.freeze(Object.fromEntries(
  [["nereid",20,"Nereid-01"], ["aureon",30,"Aureon-01"], ["sylva",40,"Sylva-01"]].map(([firm,id,name])=>{
    const theme=getFirmHomeMapTheme({id,name});
    return [firm, Object.freeze({
      ...SECTOR_THREE_SHARED_ASSETS,
      nebula:getFirmHomeAssetPath(HELION_THREE_ASSETS.nebula,theme),
      mainNebula:getFirmHomeAssetPath(HELION_THREE_ASSETS.nebula,theme)+"&mapPocket=helion03",
      dust:getFirmHomeAssetPath(HELION_THREE_ASSETS.dust,theme),
      planet:getFirmHomeAssetPath(HELION_THREE_ASSETS.planet,theme),
      ruin:getFirmHomeAssetPath(HELION_THREE_ASSETS.ruin,theme),
      neutral:getFirmHomeAssetPath(HELION_ONE_ASSETS.asteroids,theme),
      lit:getFirmHomeAssetPath(HELION_THREE_ASSETS.copper,theme),
      star:"assets/maps/decor/sector03-firms-v2/"+firm+"/distant-star.svg"
    })];
  })
));
