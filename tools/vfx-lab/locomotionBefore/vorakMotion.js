import {clamp, smooth} from "../../../src/game/render/vfxPrimitives.js";
import {vorakProfile} from "../../../src/game/combatData/vorakVisuals.js";

export const VORAK_DRAW_SCALE = vorakProfile("raider_astral").scale;
export const VORAK_NOZZLES = vorakProfile("raider_astral").nozzles;
export const vorakSize = enemy=>Math.min(enemy.width,enemy.height)*vorakProfile(enemy.kind).scale;
export const vorakHeading = enemy=>vorakProfile(enemy.kind).fixedHeading ? 0 : Number(enemy.angle || 0);

// Cosmetic pose only. The server's angle already points an upward-facing
// sprite along its movement; no autonomous hull rotation is added here.
export function vorakPose(time, shotAge, power = 0, turn = 0, kind = "raider_astral"){
  const charge = shotAge >= -.24 && shotAge < 0 ? smooth((shotAge+.24)/.24) : 0;
  const flash = shotAge >= 0 && shotAge < .32 ? Math.exp(-shotAge*13) : 0;
  const fold = .016*Math.sin(time*2.3) + power*.018 + charge*.08 - flash*.025;
  const bank = clamp(turn,-2,2)*.012;
  const hinge=vorakProfile(kind).hinge;
  return {charge,flash,recoil:flash*.012,wings:[(fold+bank)*hinge,(-fold+bank)*hinge]};
}

export function vorakMounts(enemy){
  const size = vorakSize(enemy);
  const angle = vorakHeading(enemy), c = Math.cos(angle), s = Math.sin(angle);
  return vorakProfile(enemy.kind).nozzles.map(p=>({
    x:enemy.x+(p.x*c-p.y*s)*size,
    y:enemy.y+(p.x*s+p.y*c)*size,
    dx:-s,dy:c
  }));
}
