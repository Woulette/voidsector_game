import { SHIP_FLIGHT_CAMERA_TILT } from "./ship3dProjection.js";

const cos = Math.cos(SHIP_FLIGHT_CAMERA_TILT);
const sin = Math.sin(SHIP_FLIGHT_CAMERA_TILT);

// Preserve the MMO's existing map coordinates at the objects' ground anchors.
// Height adds volume without moving click targets, navigation or server positions.
export function worldPointToScene({x, y, height = 0}){
  return {x, y:height, z:(y + height * sin) / cos};
}

export function configureWorld3dCamera(camera, view){
  const width = view.width / view.zoom, height = view.height / view.zoom;
  const x = view.x + width / 2, z = (view.y + height / 2) / cos;
  camera.left = -width / 2;camera.right = width / 2;
  camera.top = height / 2;camera.bottom = -height / 2;
  camera.position.set(x,12000 * cos,z + 12000 * sin);
  camera.up.set(0,1,0);camera.lookAt(x,0,z);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
