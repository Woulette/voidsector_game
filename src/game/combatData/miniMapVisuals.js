// A fixed illustrated overview, independent of the pilot and the combat camera.
const HELION_ONE_OVERVIEW = Object.freeze({
  image:"assets/maps/minimaps/helion-01.png",
  atmosphere:{src:"assets/maps/decor/helion01-v1/nebula-crimson.png", alpha:.20},
  landmarks:{
    planet:{x:.16, y:.90, width:.44},
    stellar:{x:.40, y:.62, width:.28}
  }
});

export function getMiniMapVisualDefinition(map){
  return String(map?.id) === "0" && map?.name === "Helion-01" ? HELION_ONE_OVERVIEW : null;
}
