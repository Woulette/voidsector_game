// One geometry for drawing, dragging, resizing and converting navigation clicks.
export const MINI_MAP_FRAME = Object.freeze({header:40, footer:24, inset:8});
export const MINI_MAP_CONTENT_RATIO = 10 / 19;

export function getMiniMapLayout({x, y, w, h}){
  const {header, footer, inset} = MINI_MAP_FRAME;
  return {
    content:{x:x + inset, y:y + header, w:Math.max(1, w - inset * 2), h:Math.max(1, h - header - footer)},
    minus:{x:x + w - 66, y:y + 12, w:24, h:22},
    plus:{x:x + w - 38, y:y + 12, w:24, h:22},
    footer:{x:x + inset, y:y + h - footer, w:w - inset * 2, h:footer}
  };
}
