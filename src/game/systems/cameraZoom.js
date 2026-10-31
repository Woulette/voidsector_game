export const CAMERA_ZOOM_MIN = 1;
export const CAMERA_ZOOM_MAX = 1.8;

export function applyCameraWheelZoom(camera, event){
  const delta = Number(event.deltaY);
  if(!camera || !Number.isFinite(delta) || delta === 0) return false;
  const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1;
  const pixels = Math.max(-240, Math.min(240, delta * unit));
  const current = Number.isFinite(camera.userZoom) ? camera.userZoom : 1;
  camera.userZoom = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, current * Math.exp(-pixels * .00125)));
  return true;
}

export function updateCombatCameraZoom(camera, dt, outsideMap){
  const manual = Math.max(CAMERA_ZOOM_MIN,Math.min(CAMERA_ZOOM_MAX,Number.isFinite(camera.userZoom) ? camera.userZoom : 1));
  const target = manual * (outsideMap ? .78 : 1);
  const current = Number.isFinite(camera.zoom) ? camera.zoom : 1;
  camera.zoom = current + (target - current) * Math.min(1, Math.max(0, dt) * 4.5);
}

export function installCombatWheelZoom({canvas,getCamera,isRunning,isSettingsOpen,miniMapHitTest}){
  canvas.addEventListener("wheel", event=>{
    if(!isRunning() || isSettingsOpen() || event.ctrlKey || event.metaKey) return;
    const rect = canvas.getBoundingClientRect();
    const hit = miniMapHitTest?.(event.clientX - rect.left, event.clientY - rect.top);
    if(hit && hit.type !== "none") return;
    if(applyCameraWheelZoom(getCamera(),event)) event.preventDefault();
  },{passive:false});
}
