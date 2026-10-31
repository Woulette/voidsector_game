import {clamp,smooth} from "../../../src/game/render/vfxPrimitives.js";
import {PARASITE_CENTER} from "./parasiteVisuals.js";
import {parasiteTentacleState,parasiteTentacleCurve} from "./parasiteTentacles.js";

export const BOSS_ARM_ANGLES=Object.freeze(Array.from({length:6},(_,i)=>-Math.PI/2+i*Math.PI/3));

export function bossArmSector(arm){
  const angle=BOSS_ARM_ANGLES[arm];
  const before=arm ? BOSS_ARM_ANGLES[arm-1] : BOSS_ARM_ANGLES.at(-1)-Math.PI*2;
  const after=arm<5 ? BOSS_ARM_ANGLES[arm+1] : BOSS_ARM_ANGLES[0]+Math.PI*2;
  return {start:(before+angle)/2,end:(angle+after)/2};
}

// Cosmetic anticipation only: the attack age still comes from the shot.
// Six independently active limbs contract before a shot;
// the circular shell breathes uniformly instead of changing its silhouette.
export function parasiteBossPose(time,shotAge){
  const charge=shotAge>=-.38 && shotAge<0 ? smooth((shotAge+.38)/.38) : 0;
  const flash=shotAge>=0 && shotAge<.48 ? Math.exp(-shotAge*9) : 0;
  const release=shotAge>=0 && shotAge<.5 ? Math.sin(clamp(shotAge/.22)*Math.PI)*Math.exp(-shotAge*4) : 0;
  const scale=1+Math.sin(time*1.1)*.006-charge*.012+release*.012;
  return {time,charge,flash,release,sx:scale,sy:scale};
}

export function parasiteCrownPose(pose,index){
  return {angle:-Math.PI*2/3+index*Math.PI/3,
    offset:.0015*(.5+.5*Math.sin(pose.time*.9-index*Math.PI/3))+Math.max(pose.charge,pose.flash)*.018+pose.release*.012,
    twist:(index%2 ? -1 : 1)*(pose.charge*.045+pose.release*.025)};
}

export function parasiteBossVertex(arm,r,side,time,options){
  const {power=0,lagX=0,lagY=0,charge=0,release=0,sx=1,sy=1,rootShape,limb}=options;
  const angle=BOSS_ARM_ANGLES[arm],dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  const sourceX=dx*r+nx*side,sourceY=dy*r+ny*side;
  const fromShell=Math.hypot(sourceX/rootShape.x,sourceY/rootShape.y);
  const progress=clamp((fromShell-1)/1.35),tip=smooth(progress);
  const sign=arm%2 ? -1 : 1;
  const motion=limb || parasiteTentacleState(arm,time,{power,boss:true});
  const curl=sign*(charge*.034-release*.026)*motion.reaction;
  const wave=(parasiteTentacleCurve(motion,progress)+curl)*tip;
  const reach=(motion.reach-charge*.024*motion.reaction+release*.025)*tip;
  const x=sourceX+dx*reach+nx*wave-clamp(lagX,-1,1)*tip*motion.drag*power;
  const y=sourceY+dy*reach+ny*wave-clamp(lagY,-1,1)*tip*motion.drag*power;
  return {u:PARASITE_CENTER.x+sourceX,v:PARASITE_CENTER.y+sourceY,
    x:PARASITE_CENTER.x+x*sx,y:PARASITE_CENTER.y+y*sy};
}
