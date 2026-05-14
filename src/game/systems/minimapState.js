export function createMiniMapState({canvas, getCurrentMap, initialLayout = null, onChange}){
  const state = {x:null, y:92, w:184, h:150, minW:150, maxW:330};
  applyLayout(initialLayout, false);

  function viewWidth(){ return canvas.__viewWidth || canvas.clientWidth || canvas.width; }
  function viewHeight(){ return canvas.__viewHeight || canvas.clientHeight || canvas.height; }

  function snapshot(){
    return {x:state.x, y:state.y, w:state.w, h:state.h};
  }

  function notify(){
    onChange?.(snapshot());
  }

  function applyLayout(layout, shouldNotify = true){
    if(!layout || typeof layout !== "object") return;
    if(Number.isFinite(Number(layout.x))) state.x = Number(layout.x);
    if(Number.isFinite(Number(layout.y))) state.y = Number(layout.y);
    if(Number.isFinite(Number(layout.w))) state.w = Math.max(state.minW, Math.min(state.maxW, Number(layout.w)));
    if(Number.isFinite(Number(layout.h))) state.h = Math.max(90, Math.min(300, Number(layout.h)));
    if(shouldNotify) notify();
  }

  function rect(){
    if(state.x === null) state.x = Math.max(8, viewWidth() - state.w - 18);
    state.x = Math.max(0, Math.min(viewWidth() - state.w, state.x));
    state.y = Math.max(0, Math.min(viewHeight() - state.h, state.y));
    return {...state};
  }

  function setPosition(x, y, shouldNotify = true){
    state.x = Math.max(0, Math.min(viewWidth() - state.w, x));
    state.y = Math.max(0, Math.min(viewHeight() - state.h, y));
    if(shouldNotify) notify();
  }

  function resize(delta){
    const oldW = state.w;
    const nextW = Math.max(state.minW, Math.min(state.maxW, state.w + delta));
    if(nextW === oldW) return;
    const ratio = state.h / state.w;
    state.w = nextW;
    state.h = Math.round(nextW * ratio);
    setPosition(state.x ?? viewWidth() - state.w - 18, state.y, false);
    notify();
  }

  function hitTest(sx, sy){
    const current = rect();
    const headerH = 22;
    if(sx < current.x || sx > current.x + current.w || sy < current.y || sy > current.y + current.h) return {type:"none", rect:current};
    const minus = {x:current.x + current.w - 42, y:current.y + 4, w:16, h:14};
    const plus = {x:current.x + current.w - 22, y:current.y + 4, w:16, h:14};
    const inBox = box => sx >= box.x && sx <= box.x + box.w && sy >= box.y && sy <= box.y + box.h;
    if(inBox(minus)) return {type:"resize", delta:-28, rect:current};
    if(inBox(plus)) return {type:"resize", delta:28, rect:current};
    if(sy <= current.y + headerH) return {type:"drag", rect:current, offsetX:sx - current.x, offsetY:sy - current.y};
    return {type:"map", rect:current};
  }

  function worldFromPoint(sx, sy){
    const current = rect();
    const map = getCurrentMap();
    const headerH = 22;
    const px = Math.max(0, Math.min(1, (sx - current.x) / current.w));
    const py = Math.max(0, Math.min(1, (sy - current.y - headerH) / Math.max(1, current.h - headerH)));
    return {
      x:px * map.width - map.width / 2,
      y:py * map.height - map.height / 2
    };
  }

  return {rect, setPosition, resize, hitTest, worldFromPoint, snapshot, applyLayout};
}
