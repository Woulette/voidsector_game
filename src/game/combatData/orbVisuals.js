export const ORB_VISUAL_PROFILES={
  drone_pirate:{
    sprite:"assets/enemies/orb-scout-v1/orb-source.png",
    branches:6,offset:-Math.PI/2,centerY:.5,sourceScale:1/.76,
    size:.66,light:.78
  },
  boss_drone_pirate:{
    sprite:"assets/enemies/orb-rig-v1/orb-source.png",
    branches:8,offset:0,centerY:.488,sourceScale:1,
    size:.75,light:1
  }
};

export function isOrbKind(kind){return Object.hasOwn(ORB_VISUAL_PROFILES,kind);}
