export const MAPS = [
  {
    id:0,
    name:"ASTRA-01",
    width:10000,
    height:8000,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-4300,y:3300,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:{x:4300,y:-3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:3300,label:"VERS ASTRA-02"},
    enemyCount:20,
    enemyLevel:[1,3],
    enemySeed:7,
    closeStarCount:4280,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#020103", "#060206", "#010102"],
      nebulae:[
        {x:-760,y:360,r:720,p:.08,color:"rgba(127,29,29,.10)",mid:"rgba(185,28,28,.034)",edge:"rgba(0,0,0,0)"},
        {x:320,y:-420,r:820,p:.065,color:"rgba(153,27,27,.085)",mid:"rgba(88,28,28,.028)",edge:"rgba(0,0,0,0)"},
        {x:920,y:460,r:620,p:.11,color:"rgba(248,113,113,.050)",mid:"rgba(127,29,29,.018)",edge:"rgba(0,0,0,0)"},
        {x:-260,y:-520,r:500,p:.10,color:"rgba(251,146,60,.035)",mid:"rgba(127,29,29,.014)",edge:"rgba(0,0,0,0)"}
      ],
      dustSpecks:[
        {x:-80,y:-40,w:1400,h:520,count:150,p:.10,sizeMin:.28,sizeMax:.95,alphaMin:.018,alphaMax:.065,colors:["255,138,92","190,58,45","255,214,170"]},
        {x:220,y:220,w:1250,h:480,count:105,p:.14,sizeMin:.24,sizeMax:.82,alphaMin:.014,alphaMax:.050,colors:["248,113,113","153,27,27","251,146,60"]},
        {x:-320,y:340,w:980,h:390,count:78,p:.18,sizeMin:.20,sizeMax:.62,alphaMin:.010,alphaMax:.038,colors:["251,146,60","127,29,29","255,237,213"]}
      ],
      lightClouds:[
        {x:-320,y:-80,r:560,p:.045,seed:11,alpha:.100,blobs:12,filaments:0,rotation:.18,squeeze:.46,core:"rgba(255,122,74,.100)",mid:"rgba(167,42,34,.040)",edge:"rgba(43,8,10,.012)"},
        {x:320,y:220,r:500,p:.060,seed:12,alpha:.082,blobs:10,filaments:0,rotation:-.25,squeeze:.52,core:"rgba(220,54,42,.082)",mid:"rgba(127,29,29,.034)",edge:"rgba(24,4,7,.010)"},
        {x:-520,y:420,r:380,p:.085,seed:13,alpha:.060,blobs:8,filaments:0,rotation:-.45,squeeze:.40,core:"rgba(251,146,60,.060)",mid:"rgba(127,29,29,.024)",edge:"rgba(20,3,4,.008)"},
        {x:560,y:-260,r:340,p:.075,seed:14,alpha:.052,blobs:7,filaments:0,rotation:.55,squeeze:.50,core:"rgba(185,28,28,.052)",mid:"rgba(88,28,28,.022)",edge:"rgba(12,2,4,.008)"}
      ],
      foregroundClouds:[
        {x:-2480,y:1880,r:430,p:.50,seed:31,alpha:.092,blobs:20,filaments:0,scale:.68,squeeze:.42,core:"rgba(255,116,72,.092)",mid:"rgba(185,38,31,.046)",edge:"rgba(30,5,7,.014)"},
        {x:-1880,y:1640,r:350,p:.56,seed:32,alpha:.070,blobs:16,filaments:0,scale:.60,squeeze:.48,core:"rgba(218,54,42,.070)",mid:"rgba(127,29,29,.034)",edge:"rgba(20,3,5,.012)"},
        {x:-980,y:1040,r:310,p:.46,seed:33,alpha:.060,blobs:15,filaments:0,scale:.56,squeeze:.44,core:"rgba(251,146,60,.060)",mid:"rgba(153,27,27,.030)",edge:"rgba(18,3,4,.010)"},
        {x:-3080,y:2280,r:280,p:.52,seed:34,alpha:.066,blobs:14,filaments:0,scale:.58,squeeze:.50,core:"rgba(248,113,113,.066)",mid:"rgba(127,29,29,.032)",edge:"rgba(16,3,4,.010)"},
        {x:-260,y:460,r:330,p:.50,seed:35,alpha:.078,blobs:17,filaments:0,scale:.60,squeeze:.46,core:"rgba(255,122,74,.078)",mid:"rgba(153,27,27,.038)",edge:"rgba(18,3,4,.009)"},
        {x:760,y:120,r:320,p:.52,seed:36,alpha:.070,blobs:16,filaments:0,scale:.58,squeeze:.44,core:"rgba(220,54,42,.070)",mid:"rgba(127,29,29,.034)",edge:"rgba(12,2,3,.008)"},
        {x:1320,y:-760,r:310,p:.48,seed:37,alpha:.066,blobs:15,filaments:0,scale:.56,squeeze:.48,core:"rgba(251,146,60,.066)",mid:"rgba(127,29,29,.032)",edge:"rgba(12,2,3,.008)"},
        {x:-720,y:-920,r:330,p:.54,seed:38,alpha:.074,blobs:16,filaments:0,scale:.58,squeeze:.42,core:"rgba(185,28,28,.074)",mid:"rgba(88,28,28,.034)",edge:"rgba(12,2,4,.008)"},
        {x:-180,y:-1480,r:280,p:.50,seed:39,alpha:.062,blobs:14,filaments:0,scale:.54,squeeze:.46,core:"rgba(255,116,72,.062)",mid:"rgba(127,29,29,.030)",edge:"rgba(14,2,4,.008)"},
        {x:1180,y:-1720,r:260,p:.46,seed:40,alpha:.054,blobs:12,filaments:0,scale:.52,squeeze:.44,core:"rgba(220,54,42,.054)",mid:"rgba(88,28,28,.026)",edge:"rgba(12,2,3,.008)"},
        {x:-1420,y:-1720,r:270,p:.48,seed:41,alpha:.058,blobs:13,filaments:0,scale:.52,squeeze:.46,core:"rgba(251,146,60,.058)",mid:"rgba(127,29,29,.028)",edge:"rgba(12,2,3,.008)"}
      ],
      images:[
        {src:"assets/maps/decor/planet_astra_red.png", x:-640, y:460, w:1340, h:1340, p:.105, alpha:.98}
      ],
      asteroidFields:[
        {x:-240,y:-520,w:5000,h:1900,count:46,p:.10,angle:.08,alpha:.42,sizeMin:2,sizeMax:7,sizePower:1.4,craters:0,tint:"slate",shadeMin:30,shadeMax:68},
        {x:640,y:-260,w:4300,h:2050,count:38,p:.16,angle:-.06,alpha:.56,sizeMin:5,sizeMax:13,sizePower:1.6,craters:0,tint:"slate",shadeMin:28,shadeMax:64},
        {x:240,y:340,w:3700,h:1800,count:30,p:.24,angle:.10,alpha:.74,sizeMin:8,sizeMax:20,sizePower:1.8,craters:1,tint:"rust",shadeMin:24,shadeMax:56},
        {x:-980,y:620,w:2600,h:1500,count:16,p:.30,angle:-.12,alpha:.94,sizeMin:13,sizeMax:28,sizePower:2.0,craters:2,tint:"slate",shadeMin:22,shadeMax:52},
        {x:840,y:780,w:1900,h:1300,count:5,p:.34,angle:.04,alpha:1,sizeMin:22,sizeMax:34,sizePower:2.1,craters:3,tint:"rust",shadeMin:20,shadeMax:48}
      ]
    },
    enemyTypes:[
      {id:"drone_pirate", weight:.70},
      {id:"raider_astral", weight:.30}
    ]
  },
  {
    id:20,
    name:"CYAN-01",
    width:10000,
    height:8000,
    spawn:{x:-2250,y:1450,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:null,
    enemyCount:20,
    enemyLevel:[1,3],
    enemySeed:207,
    closeStarCount:80,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#01040b", "#07182b", "#01040b"],
      nebulae:[
        {x:-1650,y:640,r:1220,p:.08,color:"rgba(30,64,175,.12)",mid:"rgba(59,130,246,.04)",edge:"rgba(0,0,0,0)"},
        {x:780,y:-760,r:1440,p:.06,color:"rgba(124,58,237,.11)",mid:"rgba(76,29,149,.045)",edge:"rgba(0,0,0,0)"},
        {x:2060,y:820,r:980,p:.11,color:"rgba(20,184,166,.08)",mid:"rgba(14,116,144,.035)",edge:"rgba(0,0,0,0)"},
        {x:-760,y:-1080,r:820,p:.10,color:"rgba(56,189,248,.075)",mid:"rgba(30,64,175,.03)",edge:"rgba(0,0,0,0)"}
      ],
      images:[
        {src:"assets/maps/decor/planet_cyan_blue.png", x:-640, y:460, w:1340, h:1340, p:.105, alpha:.98}
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
    width:10000,
    height:8000,
    portal:{x:-4300,y:3300,r:95,safeRadius:230,targetMap:0,targetX:4300,targetY:-3300,label:"VERS ASTRA-01"},
    enemyCount:21,
    enemyLevel:[3,7],
    enemySeed:19,
    closeStarCount:2240,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#040205", "#0a0306", "#020103"],
      nebulae:[],
      backdrops:[
        {src:"assets/maps/decor/astra02_nebula_mass_cutout.png", x:-100, y:-50, w:1704, h:1223, p:.15, alpha:.64, blend:"screen"}
      ],
      dustSpecks:[],
      tiles:[],
      images:[],
      lightClouds:[],
      glowSpots:[],
      asteroidFields:[]
    },
    // Trois familles de vaisseaux ennemis sur ASTRA-02.
    enemyTypes:[
      {id:"raider_astral", weight:.46},
      {id:"chasseur_spectral", weight:.28},
      {id:"cuirasse_nebulaire", weight:.18},
      {id:"cristal_du_neant", weight:.08}
    ]
  }
];

export const ENEMY_TYPES = {
  drone_pirate:{
    name:"Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
    maxHp:()=>800,
    speed:()=>190,
    radius:26,
    width:74,
    height:74,
    attackRange:600,
    shieldAbsorbRatio:.8,
    attackDamage:(level)=>34 + level*4,
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:{
      credits:1200,
      xp:350,
      premium:2,
      materials:{nickel_brut:10, titane_fissure:10, silice_conductrice:10}
    }
  },
  raider_astral:{
    name:"Vorak rusher",
    img:"assets/enemies/enemy_red_rusher.png",
    maxHp:(level)=>1450 + level*170,
    speed:()=>220,
    radius:36,
    width:88,
    height:88,
    attackRange:300,
    shieldAbsorbRatio:.8,
    attackDamageMin:90,
    attackDamageMax:140,
    attackDamage:()=>115,
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{
      credits:1500,
      xp:500,
      premium:3,
      materials:{cuivre_orbital:10, zinc_spatial:10, nickel_brut:10}
    }
  },
  chasseur_spectral:{
    name:"Parasite astral",
    img:"assets/enemies/enemy_green_parasite.png",
    maxHp:()=>3500,
    maxShield:()=>1500,
    speed:()=>200,
    radius:34,
    width:86,
    height:86,
    attackRange:450,
    shieldAbsorbRatio:.8,
    attackDamageMin:150,
    attackDamageMax:250,
    attackDamage:()=>200,
    attackCooldown:1.55,
    projectileSpeed:620,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50, interval:2, duration:10},
    loot:{
      credits:4000,
      xp:1700,
      premium:5,
      materials:{
        cuivre_orbital:20,
        zinc_spatial:20,
        nickel_brut:20,
        titane_fissure:20,
        silice_conductrice:20
      }
    }
  },
  cuirasse_nebulaire:{
    name:"Traqueur abyssal",
    img:"assets/enemies/enemy_blue_spider.png",
    maxHp:()=>8000,
    maxShield:()=>2000,
    speed:()=>150,
    radius:46,
    width:106,
    height:106,
    attackRange:550,
    shieldAbsorbRatio:.8,
    attackDamageMin:250,
    attackDamageMax:350,
    attackDamage:()=>300,
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    loot:{
      credits:7000,
      xp:3000,
      premium:8,
      materials:{
        cuivre_orbital:30,
        zinc_spatial:30,
        nickel_brut:30,
        titane_fissure:30,
        silice_conductrice:30
      }
    }
  },
  cristal_du_neant:{
    name:"Cristal du néant",
    img:"assets/enemies/enemy_purple_crystal.png",
    maxHp:()=>40000,
    maxShield:()=>20000,
    speed:()=>170,
    radius:48,
    width:112,
    height:112,
    attackRange:500,
    shieldAbsorbRatio:.8,
    attackDamageMin:800,
    attackDamageMax:1000,
    attackDamage:()=>900,
    attackCooldown:1.85,
    projectileSpeed:560,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    loot:{
      credits:60000,
      xp:12000,
      premium:20,
      materials:{
        cuivre_orbital:80,
        zinc_spatial:80,
        nickel_brut:80,
        titane_fissure:80,
        silice_conductrice:80,
        alliage_cuivre_zinc:5,
        plaque_nickel_titane:5
      }
    }
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
