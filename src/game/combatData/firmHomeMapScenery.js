import { getFirmHomeAssetPath } from "../../shared/firmHomeMapThemes.js";

// Move the approved anchors into the sector's corner. Keep each illustration's
// original rotation and silhouette; sector placement must not mirror the art.
export function mirrorFirmHomeScenery(scene, theme){
  const {mirrorX:sx, mirrorY:sy} = theme;
  const mirror = layer=>({
    ...layer, x:layer.x * sx, y:layer.y * sy,
    ...(layer.src ? {src:getFirmHomeAssetPath(layer.src, theme)} : {})
  });
  return {
    ...scene,
    background:[...theme.background],
    backdrops:scene.backdrops.map(mirror),
    images:scene.images.map(mirror),
    starLights:scene.starLights.map(light=>({...mirror(light), colors:{...theme.lights}}))
  };
}
