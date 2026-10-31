// Presentation only: firing cadence, ammunition and damage stay authoritative.
export const LASER_VISUAL_SPEC = Object.freeze({duration:.20, beamLength:130});
export const SHIELD_VISUAL_SPEC = Object.freeze({duration:.56});

export const M6_VISUAL_SPEC = Object.freeze({
  cooldown:3,
  pulseOffsets:Object.freeze([0, .09, .18, .27]),
  travelTime:.12,
  palette:Object.freeze({core:"rgba(255,255,255,1)", glow:"rgba(245,245,245,1)", flare:"rgba(0,0,0,.8)"})
});
