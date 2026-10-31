// Shared art profiles. Entity dimensions and combat rules stay in
// the existing catalogue; the boss keeps its current fixed hull orientation.
export const VORAK_VISUAL_PROFILES = {
  raider_astral:{
    sprite:"assets/enemies/vorak-rusher-v1/vorak-source.png",
    scale:.625,light:1,hinge:1,fixedHeading:false,
    nozzles:[{x:-.117,y:.307},{x:.118,y:.307}]
  },
  boss_raider_astral:{
    sprite:"assets/enemies/vorak-boss-v1/vorak-source.png",
    scale:.85,light:1.08,hinge:.88,fixedHeading:true,
    nozzles:[{x:-.114,y:.307},{x:.114,y:.307}]
  }
};

export const isVorakKind = kind=>Object.hasOwn(VORAK_VISUAL_PROFILES,kind);
export const vorakProfile = kind=>VORAK_VISUAL_PROFILES[kind] || VORAK_VISUAL_PROFILES.raider_astral;

export const VORAK_THRUSTER_TEXTURE="assets/effects/vorak-thruster-v1.webp";
