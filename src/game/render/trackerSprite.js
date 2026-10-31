import {clamp,glow} from "./vfxPrimitives.js";
import {drawCreatureBody} from "./enemyArticulatedSprite.js";
import {trackerAttack,trackerVertex,trackerHeading} from "./trackerMotion.js";
import {advanceTrackerWake,drawTrackerWake} from "./trackerWake.js";
import {trackerElectricSeed,trackerElectricArcs,drawTrackerElectricity} from "./trackerElectricity.js";

import {TRACKER_VISUAL_PROFILES} from "../combatData/trackerVisuals.js";
import {stepLocomotionPower} from "./enemyLocomotion.js";
export {TRACKER_SPRITE_PATH} from "../combatData/trackerVisuals.js";
const profile={style:"abyssal",channel:"blue",vertex:trackerVertex};
const artworks=new Map();
export function setTrackerArtwork(image,kind="cuirasse_nebulaire"){artworks.set(kind,image);}

export function drawAbyssalTracker(ctx,enemy,time,shotAge,dt,state,visual=TRACKER_VISUAL_PROFILES[enemy.kind]){
  const artwork=artworks.get(enemy.kind);
  if(!visual || !artwork?.complete || !artwork.naturalWidth)return;
  state.wake??={};
  advanceTrackerWake(state.wake,enemy,dt);
  drawTrackerWake(ctx,state.wake);
  const angle=visual.angle ?? trackerHeading(enemy.kind,enemy.angle);
  const size=Math.min(enemy.width,enemy.height)*visual.scale;
  const visualTime=time*(visual.timeScale ?? 1);
  const attack=trackerAttack(shotAge),power=clamp(state.wake.power || 0);
  const motion=stepLocomotionPower(state,power,dt);
  const visualEnemy={...enemy,width:size,height:size,
    vx:state.wake.vx || 0,vy:state.wake.vy || 0};
  ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(angle);
  glow(ctx,0,-size*.08,size*.24,"rgba(45,167,215,1)",attack.charge*.12+attack.flash*.22);
  drawCreatureBody(ctx,{image:artwork,enemy:visualEnemy,profile:visual.vertex ? {...profile,vertex:visual.vertex} : profile,time:visualTime,power:motion,attack,angle});
  // The paired blue windows of the selected original silhouette.
  ctx.globalCompositeOperation="lighter";
  for(const side of [-1,1]){
    glow(ctx,side*size*.07,size*.03,size*(.055+attack.flash*.025),"rgba(134,239,255,1)",
      .06+attack.charge*.33+attack.flash*.76);
  }
  state.arcSeed??=trackerElectricSeed(enemy.id);
  const arcs=trackerElectricArcs(visualTime,{attack,power:motion,seed:state.arcSeed});
  drawTrackerElectricity(ctx,size,arcs);
  ctx.restore();
}
