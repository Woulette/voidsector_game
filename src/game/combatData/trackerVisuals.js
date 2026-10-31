export const TRACKER_SPRITE_PATH="assets/enemies/abyssal-tracker-v4/tracker-source.png";
export const TRACKER_DRAW_SCALE=.94*1.12;
export const TRACKER_VISUAL_PROFILES=Object.freeze({
  cuirasse_nebulaire:Object.freeze({sprite:TRACKER_SPRITE_PATH,scale:TRACKER_DRAW_SCALE}),
  boss_cuirasse_nebulaire:Object.freeze({sprite:"assets/enemies/abyssal-tracker-boss-v1/tracker-source.png",scale:TRACKER_DRAW_SCALE,angle:0,timeScale:.83})
});
export const isTrackerKind=kind=>Object.hasOwn(TRACKER_VISUAL_PROFILES,kind);
