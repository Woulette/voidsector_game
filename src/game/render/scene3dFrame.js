// A frame is active only while the combat renderer draws a supported 3D sector.
// Individual ship inspection keeps its independent canvas renderer.
let activeFrame = null;
export const getScene3dFrame = ()=>activeFrame;
export function setScene3dFrame(frame){activeFrame = frame;}
