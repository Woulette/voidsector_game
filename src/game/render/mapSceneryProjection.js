// Map anchors stay resolution-independent; p controls their apparent camera speed.
export function projectMapSceneryLayer({layer, camera, viewWidth, viewHeight, defaultParallax}){
  const p = Number.isFinite(layer.p) ? layer.p : (layer.space === "map" ? 1 : defaultParallax);
  if(layer.space === "map"){
    return {
      x:viewWidth / 2 + (layer.x - camera.x - viewWidth / 2) * p,
      y:viewHeight / 2 + (layer.y - camera.y - viewHeight / 2) * p
    };
  }
  const world = layer.space === "world";
  return {
    x:(layer.x || 0) - camera.x * p + (world ? 0 : viewWidth / 2),
    y:(layer.y || 0) - camera.y * p + (world ? 0 : viewHeight / 2)
  };
}

export function isMapSceneryLayerVisible({layer, x, y, width, height, viewWidth, viewHeight, padding}){
  const radius = layer.rotation ? Math.hypot(width, height) / 2 : 0;
  const halfWidth = radius || width / 2, halfHeight = radius || height / 2;
  return x + halfWidth >= -padding && x - halfWidth <= viewWidth + padding
    && y + halfHeight >= -padding && y - halfHeight <= viewHeight + padding;
}
