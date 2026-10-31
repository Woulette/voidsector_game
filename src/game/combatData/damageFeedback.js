export const DAMAGE_FEEDBACK_SPEC = Object.freeze({
  mergeWindowMs:160,
  textLife:.98,
  maxGroupAgeMs:5000,
  maxProjectileMs:2000,
  impactGraceMs:300,
  fontSize:21,
  fontPop:2,
  outlineWidth:2.4,
  metallicDamage:Object.freeze([
    [0,"#ff968c"], [.25,"#ec5651"], [.43,"#ffb0a4"],
    [.51,"#a62a31"], [.64,"#ff6961"], [1,"#d34248"]
  ]),
  outgoing:"rgba(255,96,96,",
  incoming:"rgba(255,96,96,",
  outgoingGlow:"rgba(255,80,80,.42)",
  incomingGlow:"rgba(255,80,80,.42)"
});
