export const DEFAULT_ENGINE_PROFILE = {
  ports:[
    {x:-18, y:43, size:.85},
    {x:18, y:43, size:.85}
  ],
  colors:{
    core:"255,255,255",
    hot:"125,211,252",
    mid:"56,189,248",
    edge:"37,99,235",
    particle:"125,211,252",
    spark:"240,249,255"
  },
  baseLength:22,
  powerLength:30,
  baseWidth:7.5,
  powerWidth:7,
  particleRate:1,
  particleSpeed:1,
  particleSpread:1,
  particleSize:1,
  particleLife:1
};

export const SHIP_ENGINE_PROFILES = {
  velox:{
    // Petit chasseur vert : r�acteur court, nerveux, �meraude.
    ports:[
      {x:0, y:28, size:.78, length:.76, width:.70}
    ],
    colors:{core:"236,253,245", hot:"110,231,183", mid:"16,185,129", edge:"5,150,105", particle:"52,211,153", spark:"209,250,229"},
    baseLength:28,
    powerLength:38,
    baseWidth:8.6,
    powerWidth:9.6,
    throatWidth:.22,
    plumeWidth:1.28,
    tailWidth:.58,
    particleRate:.72,
    particleSpeed:1.06,
    particleSpread:.42,
    particleSize:.68,
    particleLife:.74,
    particleOriginOffset:25,
    turnAngleScale:.42,
    turnAngleMax:.09,
    turnBendScale:.34,
    engineGlow:false
  },
  orion:{
    // Orion: one compact central cyan exhaust, matched to the single rear nozzle.
    ports:[
      {x:0, y:26, size:1.05, length:.96, width:.86}
    ],
    colors:{core:"248,250,252", hot:"125,211,252", mid:"14,165,233", edge:"30,64,175", particle:"56,189,248", spark:"224,242,254"},
    baseLength:15,
    powerLength:22,
    baseWidth:6.2,
    powerWidth:7.2,
    trailAlpha:.86,
    coreAlpha:.84,
    particleRate:.84,
    particleSpeed:1.02,
    particleSpread:.52,
    particleSize:.74,
    particleLife:.82,
    particleOriginOffset:24,
    turnAngleScale:.38,
    turnAngleMax:.08,
    turnBendScale:.30,
    engineGlow:false
  },
  valkyrie:{
    // Croiseur d'assaut : trois sorties violet/bleu calees sur la poupe.
    ports:[
      {x:-17, y:31, size:.74, length:.92, width:.72},
      {x:3, y:36, size:1.0, length:1.04, width:.86},
      {x:21, y:31, size:.74, length:.92, width:.72}
    ],
    colors:{core:"250,245,255", hot:"196,181,253", mid:"129,140,248", edge:"67,56,202", particle:"165,180,252", spark:"238,242,255"},
    baseLength:23,
    powerLength:32,
    baseWidth:7.4,
    powerWidth:7.6,
    particleRate:1.0,
    particleSpeed:1.0,
    particleSpread:.68,
    particleSize:.9,
    particleLife:.92,
    particleOriginOffset:16,
    turnAngleScale:.62,
    turnAngleMax:.13,
    turnBendScale:.56
  },
  razorion:{
    // Chasseur d'elite agressif : trois flammes orange calees sur les ailes et le reacteur central.
    ports:[
      {x:-34, y:40, size:.7, length:.82, width:.58},
      {x:0, y:45, size:.88, length:.92, width:.68},
      {x:34, y:40, size:.7, length:.82, width:.58}
    ],
    colors:{core:"255,247,237", hot:"253,186,116", mid:"249,115,22", edge:"185,28,28", particle:"251,146,60", spark:"255,237,213"},
    baseLength:22,
    powerLength:33,
    baseWidth:6.6,
    powerWidth:5.8,
    throatWidth:.14,
    plumeWidth:1.1,
    tailWidth:.38,
    trailAlpha:1.04,
    coreAlpha:1.02,
    particleRate:.9,
    particleSpeed:1.08,
    particleSpread:.58,
    particleSize:.72,
    particleLife:.7,
    particleOriginOffset:16,
    turnAngleScale:.38,
    turnAngleMax:.08,
    turnBendScale:.34
  },
  vesperion:{
    // Profil proche du moteur par defaut, avec une rotation plus douce en virage.
    ports:[
      {x:-18, y:43, size:.85},
      {x:18, y:43, size:.85}
    ],
    colors:{core:"255,255,255", hot:"125,211,252", mid:"56,189,248", edge:"37,99,235", particle:"125,211,252", spark:"240,249,255"},
    baseLength:22,
    powerLength:30,
    baseWidth:7.5,
    powerWidth:7,
    particleRate:1,
    particleSpeed:1,
    particleSpread:1,
    particleSize:1,
    particleLife:1,
    turnAngleScale:.38,
    turnAngleMax:.08,
    turnBendScale:.34
  },  helion_titan:{
    // Cuirasse lourde : gros moteurs ambrés, plus massifs et plus lents.
    ports:[
      {x:-34, y:38, size:.72, length:.78, width:.9},
      {x:-17, y:47, size:1.04, length:1.08, width:1.08},
      {x:17, y:47, size:1.04, length:1.08, width:1.08},
      {x:34, y:38, size:.72, length:.78, width:.9}
    ],
    colors:{core:"255,251,235", hot:"253,230,138", mid:"245,158,11", edge:"180,83,9", particle:"251,191,36", spark:"255,247,237"},
    baseLength:24,
    powerLength:39,
    baseWidth:8.8,
    powerWidth:9.4,
    particleRate:1.38,
    particleSpeed:.82,
    particleSpread:1.28,
    particleSize:1.22,
    particleLife:1.25
  },
  nyxaris:{
    // Vaisseau organique blanc/violet : deux sorties d'ailes et un coeur central.
    ports:[
      {x:-62, y:32, size:.66, length:.74, width:.58},
      {x:0, y:67, size:1.02, length:.98, width:.64},
      {x:60, y:32, size:.66, length:.74, width:.58}
    ],
    colors:{core:"250,245,255", hot:"216,180,254", mid:"168,85,247", edge:"107,33,168", particle:"192,132,252", spark:"233,213,255"},
    baseLength:19,
    powerLength:31,
    baseWidth:5.6,
    powerWidth:6.3,
    particleRate:.56,
    particleSpeed:.9,
    particleSpread:.34,
    particleSize:.54,
    particleLife:.68,
    engineGlow:false
  },
  astralis:{
    // Intercepteur astral : deux sorties bleues calees sur les reacteurs arriere.
    ports:[
      {x:-6, y:34, size:.9, length:.9, width:.78},
      {x:6, y:34, size:.9, length:.9, width:.78}
    ],
    colors:{core:"248,250,252", hot:"186,230,253", mid:"56,189,248", edge:"37,99,235", particle:"125,211,252", spark:"240,249,255"},
    baseLength:23,
    powerLength:33,
    baseWidth:7.4,
    powerWidth:6.8,
    throatWidth:.15,
    plumeWidth:1.18,
    tailWidth:.42,
    particleRate:.88,
    particleSpeed:1.04,
    particleSpread:.58,
    particleSize:.78,
    particleLife:.76,
    particleOriginOffset:17,
    turnAngleScale:.36,
    turnAngleMax:.075,
    turnBendScale:.32
  },
  asterion:{
    // Intercepteur spectral : sorties violettes plus nerveuses sur les blocs arriere.
    ports:[
      {x:-21, y:48, size:.72, length:.9, width:.72},
      {x:21, y:48, size:.72, length:.9, width:.72},
      {x:0, y:54, size:1.0, length:1.12, width:.92},
      {x:-43, y:35, size:.5, length:.72, width:.26},
      {x:43, y:35, size:.5, length:.72, width:.26}
    ],
    colors:{core:"250,245,255", hot:"216,180,254", mid:"168,85,247", edge:"76,29,149", particle:"192,132,252", spark:"245,243,255"},
    baseLength:22,
    powerLength:36,
    baseWidth:7.2,
    powerWidth:8.6,
    particleRate:1.2,
    particleSpeed:1.06,
    particleSpread:.82,
    particleSize:.95,
    particleLife:.94,
    turnAngleScale:.38,
    turnAngleMax:.08,
    turnBendScale:.34
  },
  ricky_companion:{
    ports:[
      {x:-27, y:36, size:.70, length:.70, width:.88},
      {x:0, y:43, size:1.08, length:1.04, width:1.15},
      {x:27, y:36, size:.70, length:.70, width:.88}
    ],
    colors:{core:"240,253,255", hot:"125,211,252", mid:"14,165,233", edge:"30,64,175", particle:"96,165,250", spark:"224,242,254"},
    baseLength:20,
    powerLength:34,
    baseWidth:7.2,
    powerWidth:8.6,
    particleRate:1.1,
    particleSpeed:1.05,
    particleSpread:.92,
    particleSize:.96,
    particleLife:.9
  }
};
