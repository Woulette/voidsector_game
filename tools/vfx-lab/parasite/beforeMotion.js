// Frozen animation before independent tentacle motion. Local comparison only.
import {clamp,smooth} from "../drawing.js";

import {PARASITE_CENTER,PARASITE_ROOT} from "../../../src/game/combatData/parasiteVisuals.js";
export {PARASITE_SOURCE,PARASITE_SCALE,PARASITE_CENTER,PARASITE_ROOT} from "../../../src/game/combatData/parasiteVisuals.js";

export function parasiteAttack(age){
  const charge=age>=-.28 && age<0 ? smooth((age+.28)/.28) : 0;
  const flash=age>=0 && age<.4 ? Math.exp(-age*11) : 0;
  return {charge,flash};
}

// A stable nucleus and six flexible limbs; no autonomous hull rotation.
export function parasiteVertex(arm,r,side,time,{power=0,lagX=0,lagY=0,charge=0,flash=0,root=PARASITE_ROOT,flex=1}={}){
  const angle=-Math.PI/2+arm*Math.PI/3,dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  const tip=smooth((r-root)/.27);
  const frequency=2.1+(arm%3)*.13;
  const wave=(Math.sin(time*frequency-arm*.91-r*15)*.028+Math.sin(time*1.47+arm*1.71-r*7)*.011)*tip*flex;
  const retreat=(-charge*.013+flash*.006)*tip*flex;
  return {
    u:PARASITE_CENTER.x+dx*r+nx*side,v:PARASITE_CENTER.y+dy*r+ny*side,
    x:PARASITE_CENTER.x+dx*(r+retreat)+nx*(side+wave)-clamp(lagX,-1,1)*tip*.024*power,
    y:PARASITE_CENTER.y+dy*(r+retreat)+ny*(side+wave)-clamp(lagY,-1,1)*tip*.024*power
  };
}
