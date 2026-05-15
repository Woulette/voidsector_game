export const MAPS = [
  {
    id:0,
    name:"ASTRA-01",
    width:5200,
    height:3600,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-2250,y:1450,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:{x:2260,y:-1420,r:95,safeRadius:230,targetMap:1,targetX:2260,targetY:-1260,label:"VERS ASTRA-02"},
    enemyCount:13,
    enemyLevel:[1,3],
    enemySeed:7,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      nebulae:[
        {x:-1650,y:640,r:1220,p:.08,color:"rgba(30,64,175,.12)",mid:"rgba(59,130,246,.04)",edge:"rgba(0,0,0,0)"},
        {x:780,y:-760,r:1440,p:.06,color:"rgba(124,58,237,.11)",mid:"rgba(76,29,149,.045)",edge:"rgba(0,0,0,0)"},
        {x:2060,y:820,r:980,p:.11,color:"rgba(20,184,166,.08)",mid:"rgba(14,116,144,.035)",edge:"rgba(0,0,0,0)"},
        {x:-760,y:-1080,r:820,p:.10,color:"rgba(56,189,248,.075)",mid:"rgba(30,64,175,.03)",edge:"rgba(0,0,0,0)"}
      ],
      images:[
        {src:"assets/maps/decor/astra01_planet_large.png", x:-640, y:460, w:1340, h:1340, p:.105, alpha:.96},
        {src:"assets/maps/decor/astra01_planet_teal.png", x:2600, y:1220, w:720, h:720, p:.18, alpha:.88}
      ],
      asteroidFields:[
        {x:-360,y:-540,w:4500,h:1450,count:34,p:.30,angle:.10,alpha:.48},
        {x:1120,y:360,w:3200,h:1560,count:28,p:.38,angle:-.08,alpha:.42},
        {x:-1780,y:520,w:1700,h:1280,count:18,p:.48,angle:.06,alpha:.38}
      ]
    },
    enemyTypes:[
      {id:"drone_pirate", weight:.70},
      {id:"raider_astral", weight:.30}
    ]
  },
  {
    id:1,
    name:"ASTRA-02",
    width:6000,
    height:4200,
    spawn:{x:-2650,y:1750,r:260,label:"ZONE DE SPAWN", safeRadius:260, decorRadius:340},
    portal:{x:2550,y:-1500,r:95,safeRadius:230,targetMap:0,targetX:2260,targetY:-1260,label:"VERS ASTRA-01"},
    enemyCount:21,
    enemyLevel:[3,7],
    enemySeed:19,
    bg:"assets/maps/astra02_bg.jpg",
    // Trois familles de vaisseaux ennemis sur ASTRA-02.
    enemyTypes:[
      {id:"raider_astral", weight:.46},
      {id:"chasseur_spectral", weight:.34},
      {id:"cuirasse_nebulaire", weight:.20}
    ]
  }
];

export const ENEMY_TYPES = {
  drone_pirate:{
    name:"Drone pirate",
    img:"assets/enemies/drone_pirate.png",
    maxHp:(level)=>1000 + level*120,
    speed:(level)=>78 + level*4,
    radius:26,
    width:74,
    height:74,
    attackRange:450,
    attackDamage:(level)=>34 + level*4,
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:{credits:800,xp:80,premium:1}
  },
  raider_astral:{
    name:"Raider astral",
    img:"assets/enemies/raider_astral.png",
    maxHp:(level)=>1450 + level*170,
    speed:(level)=>62 + level*3,
    radius:36,
    width:88,
    height:88,
    attackRange:450,
    attackDamage:(level)=>52 + level*5,
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{credits:800,xp:80,premium:1}
  },
  chasseur_spectral:{
    name:"Chasseur spectral",
    img:"assets/enemies/chasseur_spectral.png",
    maxHp:(level)=>2200 + level*220,
    speed:(level)=>72 + level*3,
    radius:34,
    width:86,
    height:86,
    attackRange:450,
    attackDamage:(level)=>78 + Math.round(level*6),
    attackCooldown:1.28,
    projectileSpeed:720,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    loot:{credits:2400,xp:220,premium:3}
  },
  cuirasse_nebulaire:{
    name:"Cuirassé nébulaire",
    img:"assets/enemies/cuirasse_nebulaire.png",
    maxHp:(level)=>3200 + level*260,
    speed:(level)=>46 + level*2,
    radius:46,
    width:106,
    height:106,
    attackRange:450,
    attackDamage:(level)=>118 + Math.round(level*8),
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    loot:{credits:6000,xp:700,premium:8}
  }
};

export const RADAR_RANGE = 950;
export const AGGRO_RANGE = 760;
export const LEASH_RANGE = 1280;
export const PLAYER_COLLISION_RADIUS = 38;
export const PLAYER_HIT_CHANCE = 0.92;
export const SAFE_ZONE_DELAY = 5;
export const RAW_DROP_TABLE = [
  {id:"cuivre_orbital", min:1, max:3, chance:0.78},
  {id:"zinc_spatial", min:1, max:2, chance:0.58},
  {id:"nickel_brut", min:1, max:2, chance:0.48},
  {id:"titane_fissure", min:1, max:2, chance:0.34},
  {id:"silice_conductrice", min:1, max:2, chance:0.26},
  {id:"catalyseur_quantique", min:1, max:1, chance:0.015}
];
export const ENEMY_HIT_CHANCE = {
  drone_pirate:0.86,
  raider_astral:0.89,
  chasseur_spectral:0.91,
  cuirasse_nebulaire:0.93
};

export const PORTAL_WAVE_TOTAL = 30;

// Profils visuels des réacteurs joueur.
// Positions locales exprimées pour le rendu 96x96 du vaisseau.
// X décale gauche/droite, Y décale vers l'arrière du sprite (les vaisseaux pointent vers le haut quand angle = 0).
// Ce bloc est purement graphique : aucune stat, collision ou mécanique d'équipement n'en dépend.
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
    // Petit chasseur vert : réacteur court, nerveux, émeraude.
    ports:[
      {x:0, y:47, size:.82, length:.78, width:.82},
      {x:-14, y:42, size:.36, length:.46, width:.55},
      {x:14, y:42, size:.36, length:.46, width:.55}
    ],
    colors:{core:"236,253,245", hot:"110,231,183", mid:"16,185,129", edge:"5,150,105", particle:"52,211,153", spark:"209,250,229"},
    baseLength:15,
    powerLength:20,
    baseWidth:5.2,
    powerWidth:4.8,
    particleRate:.72,
    particleSpeed:1.12,
    particleSpread:.62,
    particleSize:.72,
    particleLife:.78
  },
  orion:{
    // Chasseur polyvalent : double réacteur cyan propre et stable.
    ports:[
      {x:-17, y:43, size:.74, length:.86},
      {x:17, y:43, size:.74, length:.86},
      {x:0, y:47, size:.68, length:.72, width:.75}
    ],
    colors:{core:"240,249,255", hot:"103,232,249", mid:"34,211,238", edge:"14,116,144", particle:"103,232,249", spark:"224,242,254"},
    baseLength:19,
    powerLength:25,
    baseWidth:6.4,
    powerWidth:5.8,
    particleRate:.95,
    particleSpeed:1.0,
    particleSpread:.8,
    particleSize:.86,
    particleLife:.88
  },
  valkyrie:{
    // Croiseur d'assaut : plusieurs sorties bleu électrique/violet.
    ports:[
      {x:-30, y:38, size:.64, length:.78},
      {x:30, y:38, size:.64, length:.78},
      {x:-12, y:46, size:.92, length:1.04},
      {x:12, y:46, size:.92, length:1.04}
    ],
    colors:{core:"250,245,255", hot:"196,181,253", mid:"129,140,248", edge:"67,56,202", particle:"165,180,252", spark:"238,242,255"},
    baseLength:22,
    powerLength:31,
    baseWidth:7.8,
    powerWidth:7.2,
    particleRate:1.18,
    particleSpeed:1.02,
    particleSpread:1.05,
    particleSize:.98,
    particleLife:1.02
  },
  razorion:{
    // Chasseur d'élite agressif : combustion rouge/orange, plus tranchante.
    ports:[
      {x:-22, y:40, size:.72, length:.9, width:.75},
      {x:22, y:40, size:.72, length:.9, width:.75},
      {x:0, y:47, size:1.0, length:1.08, width:.92}
    ],
    colors:{core:"255,247,237", hot:"253,186,116", mid:"249,115,22", edge:"185,28,28", particle:"251,146,60", spark:"255,237,213"},
    baseLength:21,
    powerLength:34,
    baseWidth:6.8,
    powerWidth:6.2,
    particleRate:1.15,
    particleSpeed:1.16,
    particleSpread:.9,
    particleSize:.92,
    particleLife:.82
  },
  helion_titan:{
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
  }
};
