export const MAPS = [
  {
    id:0,
    name:"Helion-01",
    width:10000,
    height:8000,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-4300,y:3300,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430, safeRect:{minX:-5000, minY:2500, maxX:-3500, maxY:3950}},
    portal:{x:4300,y:-3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:3300,label:"VERS Helion-02"},
    enemyCount:40,
    enemyLevel:[1,4],
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
        {x:-320,y:-80,r:660,p:.045,seed:11,alpha:.145,blobs:13,filaments:0,rotation:.18,squeeze:.46,core:"rgba(255,132,86,.145)",mid:"rgba(185,42,34,.064)",edge:"rgba(48,9,11,.018)"},
        {x:320,y:220,r:600,p:.060,seed:12,alpha:.122,blobs:11,filaments:0,rotation:-.25,squeeze:.52,core:"rgba(238,73,56,.122)",mid:"rgba(153,27,27,.052)",edge:"rgba(28,5,8,.016)"},
        {x:-520,y:420,r:470,p:.085,seed:13,alpha:.092,blobs:9,filaments:0,rotation:-.45,squeeze:.40,core:"rgba(251,146,60,.092)",mid:"rgba(153,27,27,.040)",edge:"rgba(24,4,5,.013)"},
        {x:560,y:-260,r:430,p:.075,seed:14,alpha:.082,blobs:8,filaments:0,rotation:.55,squeeze:.50,core:"rgba(220,54,42,.082)",mid:"rgba(127,29,29,.036)",edge:"rgba(16,3,5,.012)"}
      ],
      foregroundClouds:[
        {x:-2480,y:1880,r:560,p:.50,seed:31,alpha:.150,blobs:22,filaments:0,scale:.86,squeeze:.42,core:"rgba(255,132,86,.150)",mid:"rgba(185,38,31,.072)",edge:"rgba(34,6,8,.022)"},
        {x:-1880,y:1640,r:460,p:.56,seed:32,alpha:.116,blobs:18,filaments:0,scale:.76,squeeze:.48,core:"rgba(238,73,56,.116)",mid:"rgba(153,27,27,.056)",edge:"rgba(24,4,6,.019)"},
        {x:-980,y:1040,r:410,p:.46,seed:33,alpha:.102,blobs:17,filaments:0,scale:.72,squeeze:.44,core:"rgba(251,146,60,.102)",mid:"rgba(153,27,27,.050)",edge:"rgba(22,4,5,.016)"},
        {x:-3080,y:2280,r:370,p:.52,seed:34,alpha:.112,blobs:16,filaments:0,scale:.74,squeeze:.50,core:"rgba(248,113,113,.112)",mid:"rgba(127,29,29,.052)",edge:"rgba(20,4,5,.016)"},
        {x:-260,y:460,r:440,p:.50,seed:35,alpha:.132,blobs:19,filaments:0,scale:.78,squeeze:.46,core:"rgba(255,132,86,.132)",mid:"rgba(185,38,31,.064)",edge:"rgba(22,4,5,.015)"},
        {x:760,y:120,r:430,p:.52,seed:36,alpha:.118,blobs:18,filaments:0,scale:.74,squeeze:.44,core:"rgba(238,73,56,.118)",mid:"rgba(127,29,29,.056)",edge:"rgba(16,3,4,.014)"},
        {x:1320,y:-760,r:410,p:.48,seed:37,alpha:.110,blobs:17,filaments:0,scale:.72,squeeze:.48,core:"rgba(251,146,60,.110)",mid:"rgba(153,27,27,.052)",edge:"rgba(16,3,4,.014)"},
        {x:-720,y:-920,r:440,p:.54,seed:38,alpha:.124,blobs:18,filaments:0,scale:.76,squeeze:.42,core:"rgba(220,54,42,.124)",mid:"rgba(127,29,29,.058)",edge:"rgba(16,3,5,.014)"},
        {x:-180,y:-1480,r:370,p:.50,seed:39,alpha:.104,blobs:16,filaments:0,scale:.70,squeeze:.46,core:"rgba(255,122,74,.104)",mid:"rgba(127,29,29,.050)",edge:"rgba(18,3,5,.014)"},
        {x:1180,y:-1720,r:350,p:.46,seed:40,alpha:.092,blobs:14,filaments:0,scale:.68,squeeze:.44,core:"rgba(238,73,56,.092)",mid:"rgba(88,28,28,.044)",edge:"rgba(15,3,4,.013)"},
        {x:-1420,y:-1720,r:360,p:.48,seed:41,alpha:.098,blobs:15,filaments:0,scale:.68,squeeze:.46,core:"rgba(251,146,60,.098)",mid:"rgba(127,29,29,.046)",edge:"rgba(15,3,4,.013)"}
      ],
      glowSpots:[],
      starLights:[
        {x:100,y:0,r:760,p:.040,seed:101,alpha:.70,speed:1500,coreRadius:.034}
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
      {id:"drone_pirate", weight:.50},
      {id:"raider_astral", weight:.50}
    ]
  },
  {
    id:20,
    name:"Nereid-01",
    width:10000,
    height:8000,
    spawn:{x:-2250,y:1450,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:null,
    enemyCount:20,
    enemyLevel:[1,4],
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
    name:"Helion-02",
    width:10000,
    height:8000,
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:0,targetX:4300,targetY:-3300,label:"VERS Helion-01"},
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:-4300,targetY:3300,label:"VERS Helion-03"},
      {x:4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:-4300,targetY:3300,label:"VERS Helion-04"}
    ],
    closedPortals:[
      {x:4300,y:-3300,r:95,safeRadius:230,label:"PORTAIL FERME", damaged:true, closed:true}
    ],
    questNpcs:[
      {id:"astra02_portal_mechanic", name:"Ricky", npcImg:"assets/ships/npc/npc_saucer.png", x:4470, y:-3180, radius:82, size:132, marker:"!", label:"RICKY"}
    ],
    enemyCount:40,
    enemyLevel:[5,9],
    enemySeed:19,
    closeStarCount:2240,
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
      backdrops:[],
      dustSpecks:[
        {x:-80,y:-40,w:1400,h:520,count:150,p:.10,sizeMin:.28,sizeMax:.95,alphaMin:.018,alphaMax:.065,colors:["255,138,92","190,58,45","255,214,170"]},
        {x:220,y:220,w:1250,h:480,count:105,p:.14,sizeMin:.24,sizeMax:.82,alphaMin:.014,alphaMax:.050,colors:["248,113,113","153,27,27","251,146,60"]},
        {x:-320,y:340,w:980,h:390,count:78,p:.18,sizeMin:.20,sizeMax:.62,alphaMin:.010,alphaMax:.038,colors:["251,146,60","127,29,29","255,237,213"]}
      ],
      tiles:[],
      images:[
        {src:"assets/maps/decor/astra02_planet_small_red.png", x:250, y:-250, w:350, h:350, p:.055, alpha:.96},
        {src:"assets/maps/decor/astra02_station_iss_like.png", x:-420, y:20, w:240, h:123, p:.205, alpha:.92}
      ],
      lightClouds:[
        {x:-320,y:-80,r:660,p:.045,seed:11,alpha:.145,blobs:13,filaments:0,rotation:.18,squeeze:.46,core:"rgba(255,132,86,.145)",mid:"rgba(185,42,34,.064)",edge:"rgba(48,9,11,.018)"},
        {x:320,y:220,r:600,p:.060,seed:12,alpha:.122,blobs:11,filaments:0,rotation:-.25,squeeze:.52,core:"rgba(238,73,56,.122)",mid:"rgba(153,27,27,.052)",edge:"rgba(28,5,8,.016)"},
        {x:-520,y:420,r:470,p:.085,seed:13,alpha:.092,blobs:9,filaments:0,rotation:-.45,squeeze:.40,core:"rgba(251,146,60,.092)",mid:"rgba(153,27,27,.040)",edge:"rgba(24,4,5,.013)"},
        {x:560,y:-260,r:430,p:.075,seed:14,alpha:.082,blobs:8,filaments:0,rotation:.55,squeeze:.50,core:"rgba(220,54,42,.082)",mid:"rgba(127,29,29,.036)",edge:"rgba(16,3,5,.012)"},
        {x:720,y:-320,r:330,p:.070,seed:53,alpha:.074,blobs:8,filaments:0,rotation:.45,squeeze:.48,core:"rgba(168,85,247,.074)",mid:"rgba(88,28,135,.034)",edge:"rgba(18,3,8,.010)"},
        {x:1120,y:-180,r:280,p:.075,seed:54,alpha:.060,blobs:7,filaments:0,rotation:-.28,squeeze:.52,core:"rgba(192,132,252,.060)",mid:"rgba(109,40,217,.028)",edge:"rgba(18,3,8,.009)"},
        {x:260,y:-170,r:460,p:.070,seed:55,alpha:.088,blobs:10,filaments:0,rotation:-.12,squeeze:.44,core:"rgba(168,85,247,.088)",mid:"rgba(91,33,182,.040)",edge:"rgba(18,3,20,.012)"},
        {x:560,y:-20,r:390,p:.090,seed:56,alpha:.072,blobs:9,filaments:0,rotation:.34,squeeze:.58,core:"rgba(216,180,254,.072)",mid:"rgba(126,34,206,.033)",edge:"rgba(24,4,28,.010)"}
      ],
      foregroundClouds:[
        {x:-260,y:460,r:390,p:.50,seed:75,alpha:.108,blobs:15,filaments:0,scale:.66,squeeze:.54,core:"rgba(255,132,86,.108)",mid:"rgba(185,38,31,.052)",edge:"rgba(22,4,5,.012)"},
        {x:760,y:120,r:380,p:.52,seed:76,alpha:.096,blobs:14,filaments:0,scale:.64,squeeze:.50,core:"rgba(238,73,56,.096)",mid:"rgba(127,29,29,.046)",edge:"rgba(16,3,4,.012)"},
        {x:540,y:-170,r:360,p:.50,seed:82,alpha:.112,blobs:15,filaments:0,scale:.64,squeeze:.46,core:"rgba(192,132,252,.112)",mid:"rgba(109,40,217,.052)",edge:"rgba(22,4,30,.012)"},
        {x:880,y:-380,r:330,p:.54,seed:83,alpha:.100,blobs:14,filaments:0,scale:.62,squeeze:.56,core:"rgba(168,85,247,.100)",mid:"rgba(88,28,135,.048)",edge:"rgba(18,3,24,.011)"},
        {x:1420,y:-1120,r:360,p:.52,seed:84,alpha:.104,blobs:15,filaments:0,scale:.62,squeeze:.50,core:"rgba(192,132,252,.104)",mid:"rgba(109,40,217,.050)",edge:"rgba(22,4,30,.011)"},
        {x:1940,y:-980,r:330,p:.55,seed:85,alpha:.096,blobs:14,filaments:0,scale:.60,squeeze:.58,core:"rgba(168,85,247,.096)",mid:"rgba(88,28,135,.046)",edge:"rgba(18,3,24,.010)"},
        {x:2360,y:-1460,r:300,p:.50,seed:86,alpha:.086,blobs:12,filaments:0,scale:.58,squeeze:.44,core:"rgba(216,180,254,.086)",mid:"rgba(126,34,206,.040)",edge:"rgba(24,4,28,.010)"},
        {x:1320,y:-760,r:360,p:.48,seed:77,alpha:.090,blobs:13,filaments:0,scale:.62,squeeze:.54,core:"rgba(251,146,60,.090)",mid:"rgba(153,27,27,.042)",edge:"rgba(16,3,4,.011)"},
        {x:-720,y:-920,r:390,p:.54,seed:78,alpha:.102,blobs:14,filaments:0,scale:.66,squeeze:.48,core:"rgba(220,54,42,.102)",mid:"rgba(127,29,29,.048)",edge:"rgba(16,3,5,.011)"},
        {x:-180,y:-1480,r:330,p:.50,seed:79,alpha:.084,blobs:12,filaments:0,scale:.60,squeeze:.52,core:"rgba(255,122,74,.084)",mid:"rgba(127,29,29,.040)",edge:"rgba(18,3,5,.011)"},
        {x:1180,y:-1720,r:310,p:.46,seed:80,alpha:.076,blobs:11,filaments:0,scale:.58,squeeze:.50,core:"rgba(238,73,56,.076)",mid:"rgba(88,28,28,.036)",edge:"rgba(15,3,4,.010)"},
        {x:-1420,y:-1720,r:320,p:.48,seed:81,alpha:.080,blobs:12,filaments:0,scale:.58,squeeze:.52,core:"rgba(251,146,60,.080)",mid:"rgba(127,29,29,.038)",edge:"rgba(15,3,4,.010)"}
      ],
      glowSpots:[],
      starLights:[],
      asteroidFields:[
        {x:-240,y:-520,w:5000,h:1900,count:42,p:.10,angle:-.04,alpha:.40,sizeMin:2,sizeMax:8,sizePower:1.7,craters:0,tint:"rust",shadeMin:28,shadeMax:62},
        {x:640,y:-260,w:4300,h:2050,count:34,p:.16,angle:.12,alpha:.54,sizeMin:4,sizeMax:14,sizePower:1.9,craters:1,tint:"slate",shadeMin:26,shadeMax:60},
        {x:240,y:340,w:3700,h:1800,count:27,p:.24,angle:-.16,alpha:.70,sizeMin:7,sizeMax:22,sizePower:2.1,craters:2,tint:"rust",shadeMin:22,shadeMax:52},
        {x:-980,y:620,w:2600,h:1500,count:14,p:.30,angle:.14,alpha:.88,sizeMin:12,sizeMax:30,sizePower:2.3,craters:3,tint:"slate",shadeMin:20,shadeMax:48},
        {x:840,y:780,w:1900,h:1300,count:5,p:.34,angle:-.10,alpha:.94,sizeMin:20,sizeMax:36,sizePower:2.4,craters:3,tint:"rust",shadeMin:18,shadeMax:46}
      ]
    },
    enemyTypes:[
      {id:"drone_pirate", weight:1},
      {id:"raider_astral", weight:1},
      {id:"chasseur_spectral", weight:1}
    ],
    fixedEnemyCounts:{
      boss_drone_pirate:4,
      boss_raider_astral:4
    }
  },
  {
    id:2,
    name:"Helion-03",
    width:10000,
    height:8000,
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:-3300,label:"VERS Helion-02"},
      {x:4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:-4300,targetY:-3300,label:"VERS Helion-04"},
      {x:4300,y:-3300,r:95,safeRadius:230,targetMap:4,targetX:-4300,targetY:-3300,label:"VERS Helion-05"}
    ],
    enemyCount:50,
    enemyLevel:[10,14],
    enemySeed:31,
    closeStarCount:2240,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#030103", "#090204", "#010102"],
      nebulae:[
        {x:-860,y:360,r:860,p:.075,color:"rgba(127,29,29,.095)",mid:"rgba(185,28,28,.034)",edge:"rgba(0,0,0,0)"},
        {x:620,y:-620,r:920,p:.060,color:"rgba(251,146,60,.060)",mid:"rgba(127,29,29,.024)",edge:"rgba(0,0,0,0)"},
        {x:1320,y:660,r:720,p:.11,color:"rgba(248,113,113,.050)",mid:"rgba(127,29,29,.020)",edge:"rgba(0,0,0,0)"}
      ],
      backdrops:[],
      dustSpecks:[
        {x:-120,y:-80,w:1700,h:560,count:140,p:.10,sizeMin:.22,sizeMax:.82,alphaMin:.012,alphaMax:.055,colors:["251,146,60","248,113,113","255,237,213"]},
        {x:360,y:340,w:1400,h:500,count:96,p:.16,sizeMin:.20,sizeMax:.70,alphaMin:.010,alphaMax:.042,colors:["185,28,28","251,191,36","252,165,165"]},
        {x:-640,y:680,w:980,h:360,count:58,p:.24,sizeMin:.18,sizeMax:.58,alphaMin:.008,alphaMax:.030,colors:["255,237,213","127,29,29","253,186,116"]}
      ],
      tiles:[],
      images:[],
      lightClouds:[
        {x:-460,y:-40,r:620,p:.050,seed:301,alpha:.118,blobs:12,filaments:0,rotation:.22,squeeze:.44,core:"rgba(248,113,113,.118)",mid:"rgba(127,29,29,.052)",edge:"rgba(18,3,5,.012)"},
        {x:420,y:280,r:560,p:.065,seed:302,alpha:.096,blobs:10,filaments:0,rotation:-.34,squeeze:.52,core:"rgba(251,146,60,.096)",mid:"rgba(153,27,27,.040)",edge:"rgba(18,3,4,.010)"},
        {x:900,y:-380,r:460,p:.080,seed:303,alpha:.078,blobs:9,filaments:0,rotation:.48,squeeze:.50,core:"rgba(251,191,36,.078)",mid:"rgba(180,83,9,.032)",edge:"rgba(18,3,4,.010)"}
      ],
      foregroundClouds:[
        {x:-1680,y:1320,r:460,p:.50,seed:321,alpha:.112,blobs:16,filaments:0,scale:.72,squeeze:.44,core:"rgba(248,113,113,.112)",mid:"rgba(127,29,29,.052)",edge:"rgba(18,3,5,.012)"},
        {x:-620,y:720,r:390,p:.54,seed:322,alpha:.096,blobs:14,filaments:0,scale:.66,squeeze:.50,core:"rgba(251,146,60,.096)",mid:"rgba(153,27,27,.044)",edge:"rgba(18,3,4,.011)"},
        {x:960,y:-960,r:410,p:.48,seed:323,alpha:.090,blobs:14,filaments:0,scale:.64,squeeze:.46,core:"rgba(220,38,38,.090)",mid:"rgba(127,29,29,.040)",edge:"rgba(18,3,5,.010)"},
        {x:1720,y:-420,r:340,p:.56,seed:324,alpha:.078,blobs:12,filaments:0,scale:.60,squeeze:.52,core:"rgba(251,191,36,.078)",mid:"rgba(127,29,29,.032)",edge:"rgba(18,3,4,.009)"}
      ],
      glowSpots:[
        {x:120,y:-120,r:460,p:.10,color:"rgba(251,146,60,.042)"},
        {x:-760,y:540,r:380,p:.15,color:"rgba(248,113,113,.036)"},
        {x:980,y:720,r:320,p:.18,color:"rgba(251,191,36,.030)"}
      ],
      asteroidFields:[
        {x:-420,y:-960,w:4800,h:1750,count:42,p:.12,angle:-.08,alpha:.44,sizeMin:2,sizeMax:9,sizePower:1.6,craters:0,tint:"rust",shadeMin:26,shadeMax:60},
        {x:720,y:-600,w:3900,h:1900,count:34,p:.20,angle:.13,alpha:.58,sizeMin:5,sizeMax:16,sizePower:1.8,craters:1,tint:"slate",shadeMin:24,shadeMax:56},
        {x:-260,y:240,w:3100,h:1600,count:24,p:.28,angle:-.15,alpha:.74,sizeMin:8,sizeMax:22,sizePower:2.0,craters:2,tint:"rust",shadeMin:20,shadeMax:50},
        {x:1180,y:520,w:1900,h:1250,count:8,p:.34,angle:.08,alpha:.92,sizeMin:18,sizeMax:34,sizePower:2.3,craters:3,tint:"slate",shadeMin:18,shadeMax:46}
      ]
    },
    enemyTypes:[
      {id:"raider_astral", weight:1},
      {id:"chasseur_spectral", weight:1},
      {id:"cuirasse_nebulaire", weight:1}
    ],
    fixedEnemyCounts:{
      eclanite:4,
      boss_raider_astral:4
    }
  },
  {
    id:3,
    name:"Helion-04",
    width:10000,
    height:8000,
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:4300,targetY:3300,label:"VERS Helion-02"},
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:4300,targetY:3300,label:"VERS Helion-03"},
      {x:4300,y:-3300,r:95,safeRadius:230,targetMap:4,targetX:-4300,targetY:3300,label:"VERS Helion-05"}
    ],
    enemyCount:50,
    enemyLevel:[15,19],
    enemySeed:43,
    closeStarCount:2240,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#030103", "#090204", "#010102"],
      nebulae:[
        {x:-860,y:360,r:860,p:.075,color:"rgba(127,29,29,.095)",mid:"rgba(185,28,28,.034)",edge:"rgba(0,0,0,0)"},
        {x:620,y:-620,r:920,p:.060,color:"rgba(251,146,60,.060)",mid:"rgba(127,29,29,.024)",edge:"rgba(0,0,0,0)"},
        {x:1320,y:660,r:720,p:.11,color:"rgba(248,113,113,.050)",mid:"rgba(127,29,29,.020)",edge:"rgba(0,0,0,0)"}
      ],
      backdrops:[],
      dustSpecks:[
        {x:-120,y:-80,w:1700,h:560,count:140,p:.10,sizeMin:.22,sizeMax:.82,alphaMin:.012,alphaMax:.055,colors:["251,146,60","248,113,113","255,237,213"]},
        {x:360,y:340,w:1400,h:500,count:96,p:.16,sizeMin:.20,sizeMax:.70,alphaMin:.010,alphaMax:.042,colors:["185,28,28","251,191,36","252,165,165"]},
        {x:-640,y:680,w:980,h:360,count:58,p:.24,sizeMin:.18,sizeMax:.58,alphaMin:.008,alphaMax:.030,colors:["255,237,213","127,29,29","253,186,116"]}
      ],
      tiles:[],
      images:[],
      lightClouds:[
        {x:-460,y:-40,r:620,p:.050,seed:301,alpha:.118,blobs:12,filaments:0,rotation:.22,squeeze:.44,core:"rgba(248,113,113,.118)",mid:"rgba(127,29,29,.052)",edge:"rgba(18,3,5,.012)"},
        {x:420,y:280,r:560,p:.065,seed:302,alpha:.096,blobs:10,filaments:0,rotation:-.34,squeeze:.52,core:"rgba(251,146,60,.096)",mid:"rgba(153,27,27,.040)",edge:"rgba(18,3,4,.010)"},
        {x:900,y:-380,r:460,p:.080,seed:303,alpha:.078,blobs:9,filaments:0,rotation:.48,squeeze:.50,core:"rgba(251,191,36,.078)",mid:"rgba(180,83,9,.032)",edge:"rgba(18,3,4,.010)"}
      ],
      foregroundClouds:[
        {x:-1680,y:1320,r:460,p:.50,seed:321,alpha:.112,blobs:16,filaments:0,scale:.72,squeeze:.44,core:"rgba(248,113,113,.112)",mid:"rgba(127,29,29,.052)",edge:"rgba(18,3,5,.012)"},
        {x:-620,y:720,r:390,p:.54,seed:322,alpha:.096,blobs:14,filaments:0,scale:.66,squeeze:.50,core:"rgba(251,146,60,.096)",mid:"rgba(153,27,27,.044)",edge:"rgba(18,3,4,.011)"},
        {x:960,y:-960,r:410,p:.48,seed:323,alpha:.090,blobs:14,filaments:0,scale:.64,squeeze:.46,core:"rgba(220,38,38,.090)",mid:"rgba(127,29,29,.040)",edge:"rgba(18,3,5,.010)"},
        {x:1720,y:-420,r:340,p:.56,seed:324,alpha:.078,blobs:12,filaments:0,scale:.60,squeeze:.52,core:"rgba(251,191,36,.078)",mid:"rgba(127,29,29,.032)",edge:"rgba(18,3,4,.009)"}
      ],
      glowSpots:[],
      starLights:[
        {x:-40,y:-20,r:760,p:.034,seed:401,alpha:.58,speed:1500,coreRadius:.032},
        {x:180,y:70,r:640,p:.038,seed:402,alpha:.48,speed:1720,coreRadius:.030},
        {x:60,y:290,r:700,p:.036,seed:403,alpha:.52,speed:1640,coreRadius:.031}
      ],
      asteroidFields:[
        {x:-420,y:-960,w:4800,h:1750,count:42,p:.12,angle:-.08,alpha:.44,sizeMin:2,sizeMax:9,sizePower:1.6,craters:0,tint:"rust",shadeMin:26,shadeMax:60},
        {x:720,y:-600,w:3900,h:1900,count:34,p:.20,angle:.13,alpha:.58,sizeMin:5,sizeMax:16,sizePower:1.8,craters:1,tint:"slate",shadeMin:24,shadeMax:56},
        {x:-260,y:240,w:3100,h:1600,count:24,p:.28,angle:-.15,alpha:.74,sizeMin:8,sizeMax:22,sizePower:2.0,craters:2,tint:"rust",shadeMin:20,shadeMax:50},
        {x:1180,y:520,w:1900,h:1250,count:8,p:.34,angle:.08,alpha:.92,sizeMin:18,sizeMax:34,sizePower:2.3,craters:3,tint:"slate",shadeMin:18,shadeMax:46}
      ]
    },
    enemyTypes:[
      {id:"pondeuse_astrale", weight:.56},
      {id:"cuirasse_nebulaire", weight:.44}
    ],
    fixedEnemyCounts:{
      cuirasse_ambre:6
    }
  },
  {
    id:4,
    name:"Helion-05",
    width:10000,
    height:8000,
    spawn:{x:-4300,y:3300,r:320,label:"RELAIS HELION-05", safeRadius:440, decorRadius:520, hub:false, safeType:"relay"},
    questStations:[{
      id:"quests",
      x:-4300,
      y:3300,
      radius:124,
      interactionRadius:320,
      marker:{x:-4300,y:3050,radius:54,text:"!"},
      asset:"assets/spawn/astra05_quest_relay.png",
      assetWidth:360,
      assetHeight:360,
      color:"192,38,211",
      dark:"24,5,35",
      title:"RELAIS HELION-05",
      subtitle:"Recevoir et rendre des missions",
      promptLabel:"MISSIONS"
    }],
    portals:[
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:4300,targetY:-3300,label:"VERS Helion-03"},
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:4300,targetY:-3300,label:"VERS Helion-04"}
    ],
    enemyCount:50,
    enemyLevel:[20,24],
    enemySeed:59,
    closeStarCount:1840,
    parallaxScene:{
      enabled:true,
      hideGrid:true,
      tileAlpha:0,
      background:["#010104", "#06010a", "#010102"],
      nebulae:[
        {x:-980,y:420,r:1040,p:.075,color:"rgba(88,28,135,.12)",mid:"rgba(168,85,247,.040)",edge:"rgba(0,0,0,0)"},
        {x:760,y:-760,r:1180,p:.060,color:"rgba(185,28,28,.10)",mid:"rgba(251,146,60,.032)",edge:"rgba(0,0,0,0)"},
        {x:1580,y:780,r:820,p:.11,color:"rgba(96,165,250,.070)",mid:"rgba(30,64,175,.030)",edge:"rgba(0,0,0,0)"}
      ],
      dustSpecks:[
        {x:-220,y:-180,w:1800,h:620,count:135,p:.11,sizeMin:.22,sizeMax:.82,alphaMin:.012,alphaMax:.052,colors:["216,180,254","248,113,113","191,219,254"]},
        {x:520,y:420,w:1500,h:520,count:96,p:.17,sizeMin:.20,sizeMax:.72,alphaMin:.010,alphaMax:.040,colors:["168,85,247","251,146,60","147,197,253"]},
        {x:-780,y:720,w:1080,h:420,count:64,p:.25,sizeMin:.18,sizeMax:.60,alphaMin:.008,alphaMax:.030,colors:["255,237,213","127,29,29","216,180,254"]}
      ],
      tiles:[],
      images:[],
      lightClouds:[
        {x:-520,y:-80,r:720,p:.050,seed:501,alpha:.116,blobs:13,filaments:0,rotation:.18,squeeze:.44,core:"rgba(168,85,247,.116)",mid:"rgba(88,28,135,.052)",edge:"rgba(18,3,24,.012)"},
        {x:460,y:280,r:620,p:.065,seed:502,alpha:.098,blobs:11,filaments:0,rotation:-.30,squeeze:.52,core:"rgba(248,113,113,.098)",mid:"rgba(153,27,27,.040)",edge:"rgba(18,3,4,.010)"},
        {x:980,y:-420,r:520,p:.080,seed:503,alpha:.082,blobs:9,filaments:0,rotation:.44,squeeze:.50,core:"rgba(96,165,250,.082)",mid:"rgba(30,64,175,.034)",edge:"rgba(18,3,4,.010)"}
      ],
      foregroundClouds:[
        {x:-1740,y:1360,r:520,p:.50,seed:521,alpha:.108,blobs:16,filaments:0,scale:.72,squeeze:.44,core:"rgba(168,85,247,.108)",mid:"rgba(88,28,135,.052)",edge:"rgba(18,3,24,.012)"},
        {x:-660,y:760,r:440,p:.54,seed:522,alpha:.092,blobs:14,filaments:0,scale:.66,squeeze:.50,core:"rgba(248,113,113,.092)",mid:"rgba(153,27,27,.044)",edge:"rgba(18,3,4,.011)"},
        {x:980,y:-1040,r:460,p:.48,seed:523,alpha:.088,blobs:14,filaments:0,scale:.64,squeeze:.46,core:"rgba(96,165,250,.088)",mid:"rgba(30,64,175,.040)",edge:"rgba(18,3,5,.010)"},
        {x:1780,y:-520,r:380,p:.56,seed:524,alpha:.076,blobs:12,filaments:0,scale:.60,squeeze:.52,core:"rgba(251,146,60,.076)",mid:"rgba(127,29,29,.032)",edge:"rgba(18,3,4,.009)"}
      ],
      glowSpots:[
        {x:160,y:-160,r:520,p:.10,color:"rgba(168,85,247,.040)"},
        {x:-920,y:600,r:440,p:.15,color:"rgba(248,113,113,.034)"},
        {x:1180,y:780,r:360,p:.18,color:"rgba(96,165,250,.028)"}
      ],
      starLights:[
        {x:-60,y:-40,r:800,p:.034,seed:601,alpha:.56,speed:1500,coreRadius:.032},
        {x:220,y:110,r:660,p:.038,seed:602,alpha:.46,speed:1720,coreRadius:.030}
      ],
      asteroidFields:[
        {x:-520,y:-1020,w:5000,h:1800,count:38,p:.12,angle:-.08,alpha:.42,sizeMin:2,sizeMax:9,sizePower:1.6,craters:0,tint:"slate",shadeMin:24,shadeMax:58},
        {x:780,y:-620,w:4100,h:1960,count:32,p:.20,angle:.13,alpha:.56,sizeMin:5,sizeMax:17,sizePower:1.8,craters:1,tint:"rust",shadeMin:22,shadeMax:54},
        {x:-320,y:280,w:3200,h:1640,count:22,p:.28,angle:-.15,alpha:.72,sizeMin:9,sizeMax:24,sizePower:2.0,craters:2,tint:"slate",shadeMin:20,shadeMax:48},
        {x:1260,y:560,w:2000,h:1320,count:8,p:.34,angle:.08,alpha:.92,sizeMin:18,sizeMax:36,sizePower:2.3,craters:3,tint:"rust",shadeMin:18,shadeMax:46}
      ]
    },
    enemyTypes:[
      {id:"eclanite", weight:.60},
      {id:"cristanite", weight:.32},
      {id:"astranite", weight:.08}
    ],
    fixedEnemyCounts:{
      eclanite:30,
      cristanite:16,
      astranite:4
    }
  }
];
