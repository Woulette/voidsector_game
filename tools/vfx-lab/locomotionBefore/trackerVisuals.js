export const TRACKER_SPRITE_PATH="assets/enemies/abyssal-tracker-v4/tracker-source.png";
export const TRACKER_VISUAL_PROFILES=Object.freeze({
  cuirasse_nebulaire:Object.freeze({sprite:TRACKER_SPRITE_PATH,scale:.94}),
  boss_cuirasse_nebulaire:Object.freeze({sprite:"assets/enemies/abyssal-tracker-boss-v1/tracker-source.png",scale:.94,angle:0,timeScale:.83})
});
export const isTrackerKind=kind=>Object.hasOwn(TRACKER_VISUAL_PROFILES,kind);
