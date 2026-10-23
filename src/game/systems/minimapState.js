import { MINI_MAP_FRAME, MINI_MAP_CONTENT_RATIO, getMiniMapLayout } from "./miniMapLayout.js?v=20261023-minimap5";

export function createMiniMapState({canvas, getCurrentMap, initialLayout = null, onChange}){
  const state = {x:null, y:92, w:360, h:219, minW:280, minH:120, maxW:720, maxH:430};
  applyLayout(initialLayout, false);

  function viewWidth(){ return canvas.__viewWidth || canvas.clientWidth || canvas.width; }
  function viewHeight(){ return canvas.__viewHeight || canvas.clientHeight || canvas.height; }

  function fitSize(){
    const ratio = MINI_MAP_CONTENT_RATIO;
    const {header, footer, inset} = MINI_MAP_FRAME;
    const maxWidth = Math.max(1, Math.min(state.maxW, viewWidth(),
      (Math.min(state.maxH, viewHeight()) - header - footer) / ratio + inset * 2));
    state.w = Math.max(Math.min(state.minW, maxWidth), Math.min(maxWidth, state.w));
    state.h = Math.round(Math.max(1, state.w - inset * 2) * ratio) + header + footer;
  }

  function snapshot(){
    fitSize();
    return {x:state.x, y:state.y, w:state.w, h:state.h};
  }

  function notify(){
    onChange?.(snapshot());
  }

  function applyLayout(layout, shouldNotify = true){
    if(!layout || typeof layout !== "object") return;
    if(Number.isFinite(Number(layout.x))) state.x = Number(layout.x);
    if(Number.isFinite(Number(layout.y))) state.y = Number(layout.y);
    if(Number.isFinite(Number(layout.w))){
      const width = Number(layout.w) <= 300 ? state.minW : Number(layout.w);
      state.w = Math.max(state.minW, Math.min(state.maxW, width));
    }
    // The previous 300 px minimum becomes 280 px once; saved compact widths stay stable.
    fitSize();
    if(shouldNotify) notify();
  }

  function rect(){
    fitSize();
    if(state.x === null) state.x = Math.max(8, viewWidth() - state.w - 18);
    state.x = Math.max(0, Math.min(viewWidth() - state.w, state.x));
    state.y = Math.max(0, Math.min(viewHeight() - state.h, state.y));
    return {...state};
  }

  function setPosition(x, y, shouldNotify = true){
    fitSize();
    state.x = Math.max(0, Math.min(viewWidth() - state.w, x));
    state.y = Math.max(0, Math.min(viewHeight() - state.h, y));
    if(shouldNotify) notify();
  }

  function resize(delta){
    fitSize();
    const oldW = state.w;
    const oldH = state.h;
    const nextW = Math.max(state.minW, Math.min(state.maxW, state.w + delta * 2));
    if(nextW === oldW) return;
    state.w = nextW;
    fitSize();
    if(state.h === oldH && state.w === oldW) return;
    setPosition(state.x ?? viewWidth() - state.w - 18, state.y, false);
    notify();
  }

  function hitTest(sx, sy){
    const current = rect();
    const {content, minus, plus} = getMiniMapLayout(current);
    if(sx < current.x || sx > current.x + current.w || sy < current.y || sy > current.y + current.h) return {type:"none", rect:current};
    const inBox = box => sx >= box.x && sx <= box.x + box.w && sy >= box.y && sy <= box.y + box.h;
    if(inBox(minus)) return {type:"resize", delta:-28, rect:current};
    if(inBox(plus)) return {type:"resize", delta:28, rect:current};
    if(sy < content.y) return {type:"drag", rect:current, offsetX:sx - current.x, offsetY:sy - current.y};
    if(inBox(content)) return {type:"map", rect:current};
    return {type:"frame", rect:current};
  }

  function worldFromPoint(sx, sy){
    const current = rect();
    const map = getCurrentMap();
    const content = getMiniMapLayout(current).content;
    const px = Math.max(0, Math.min(1, (sx - content.x) / content.w));
    const py = Math.max(0, Math.min(1, (sy - content.y) / content.h));
    return {
      x:px * map.width - map.width / 2,
      y:py * map.height - map.height / 2
    };
  }

  return {rect, setPosition, resize, hitTest, worldFromPoint, snapshot, applyLayout};
}
