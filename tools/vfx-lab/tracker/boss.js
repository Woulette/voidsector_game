import {drawAbyssalTracker,setTrackerArtwork} from "../../../src/game/render/trackerSprite.js";
import {TRACKER_VISUAL_PROFILES} from "../../../src/game/combatData/trackerVisuals.js";

export const TRACKER_BOSS_SOURCE="assets/enemies/abyssal-tracker-boss-v1/tracker-source.png";
export const TRACKER_BOSS_VISUAL=TRACKER_VISUAL_PROFILES.boss_cuirasse_nebulaire;
export function setTrackerBossArtwork(image){setTrackerArtwork(image,"boss_cuirasse_nebulaire");}

// The approved boss shares the native renderer, including its slower visual
// clock. Positions, emission dt and the received shot age stay unchanged.
export function drawTrackerBoss(ctx,enemy,time,shotAge,dt,state){
  return drawAbyssalTracker(ctx,enemy,time,shotAge,dt,state,TRACKER_BOSS_VISUAL);
}
