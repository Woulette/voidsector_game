import {SHIELD_VISUAL_SPEC} from "../combatData/weaponVisuals.js";
import {drawShieldSurface} from "./shieldSurfaces.js";

export function drawPlayerShieldImpacts({ctx,camera,player,ship,position=player,now=performance.now()}){
  if(player.isDead || Number(player.hp)<=0){player.shieldHitVisuals=[];return;}
  if(!player.shieldHitVisuals?.length) return;
  const duration=SHIELD_VISUAL_SPEC.duration*1000;
  player.shieldHitVisuals=player.shieldHitVisuals.filter(hit=>now>=hit.receivedAt && now-hit.receivedAt<duration);
  const radius=Math.max(Number(ship.renderWidth||96),Number(ship.renderHeight||96))*.5+4;
  for(const hit of player.shieldHitVisuals) drawShieldSurface(ctx,{x:position.x-camera.x,y:position.y-camera.y,
    radius,angle:hit.angle,progress:(now-hit.receivedAt)/duration,style:"hex"});
}
