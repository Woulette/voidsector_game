export const MAPS = [
  {
    id:0,
    name:"ASTRA-01",
    width:10000,
    height:8000,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-4300,y:3300,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430, safeRect:{minX:-5000, minY:2500, maxX:-3500, maxY:3950}},
    portal:{x:4300,y:-3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:3300,label:"VERS ASTRA-02"},
    enemyCount:40,
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
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:0,targetX:4300,targetY:-3300,label:"VERS ASTRA-01"},
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:-4300,targetY:3300,label:"VERS ASTRA-03"},
      {x:4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:-4300,targetY:3300,label:"VERS ASTRA-04"}
    ],
    closedPortals:[
      {x:4300,y:-3300,r:95,safeRadius:230,label:"PORTAIL FERME", damaged:true, closed:true}
    ],
    questNpcs:[
      {id:"astra02_portal_mechanic", name:"Ricky", npcImg:"assets/ships/npc/npc_saucer.png", x:4470, y:-3180, radius:82, size:132, marker:"!", label:"RICKY"}
    ],
    enemyCount:40,
    enemyLevel:[3,7],
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
    ]
  },
  {
    id:2,
    name:"ASTRA-03",
    width:10000,
    height:8000,
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:-3300,label:"VERS ASTRA-02"},
      {x:4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:-4300,targetY:-3300,label:"VERS ASTRA-04"},
      {x:4300,y:-3300,r:95,safeRadius:230,targetMap:4,targetX:-4300,targetY:-3300,label:"VERS ASTRA-05"}
    ],
    enemyCount:50,
    enemyLevel:[6,10],
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
      {id:"chasseur_spectral", weight:.56},
      {id:"cuirasse_nebulaire", weight:.44}
    ],
    fixedEnemyCounts:{
      cristal_du_neant:8
    }
  },
  {
    id:3,
    name:"ASTRA-04",
    width:10000,
    height:8000,
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:4300,targetY:3300,label:"VERS ASTRA-02"},
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:4300,targetY:3300,label:"VERS ASTRA-03"},
      {x:4300,y:-3300,r:95,safeRadius:230,targetMap:4,targetX:-4300,targetY:3300,label:"VERS ASTRA-05"}
    ],
    enemyCount:50,
    enemyLevel:[8,12],
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
      {id:"chasseur_spectral", weight:.56},
      {id:"cuirasse_nebulaire", weight:.44}
    ],
    fixedEnemyCounts:{
      cuirasse_ambre:6
    }
  },
  {
    id:4,
    name:"ASTRA-05",
    width:10000,
    height:8000,
    spawn:{x:-4300,y:3300,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430, hub:false},
    portals:[
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:4300,targetY:-3300,label:"VERS ASTRA-03"},
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:4300,targetY:-3300,label:"VERS ASTRA-04"}
    ],
    enemyCount:30,
    enemyLevel:[18,24],
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
      {id:"boss_drone_pirate", weight:.16},
      {id:"boss_raider_astral", weight:.18},
      {id:"boss_chasseur_spectral", weight:.20},
      {id:"boss_cuirasse_nebulaire", weight:.20},
      {id:"boss_cristal_du_neant", weight:.16},
      {id:"boss_cuirasse_ambre", weight:.10}
    ]
  }
];

const FIRM_PORTAL_POINT = {
  top:{x:0,y:-3300},
  bottom:{x:0,y:3300},
  left:{x:-4300,y:0},
  right:{x:4300,y:0},
  topLeft:{x:-4300,y:-3300},
  topRight:{x:4300,y:-3300},
  bottomLeft:{x:-4300,y:3300},
  bottomRight:{x:4300,y:3300}
};

const FIRM_VISUALS = {
  CYAN:{
    baseId:20,
    planet:"assets/maps/decor/planet_cyan_blue.png",
    background:["#01040b", "#07182b", "#01040b"],
    tint:"cyan",
    seedOffset:200,
    replacements:[
      ["127,29,29","30,64,175"],["185,28,28","59,130,246"],["153,27,27","30,58,138"],
      ["248,113,113","56,189,248"],["251,146,60","34,211,238"],["251,191,36","103,232,249"],
      ["220,54,42","14,116,144"],["88,28,28","30,64,175"],["168,85,247","59,130,246"],
      ["216,180,254","125,211,252"],["255,132,86","56,189,248"],["238,73,56","14,165,233"],
      ["255,122,74","34,211,238"],["255,237,213","224,242,254"],["253,186,116","186,230,253"],
      ["255,138,92","56,189,248"],["190,58,45","14,116,144"],["255,214,170","224,242,254"],
      ["185,42,34","14,116,144"],["185,38,31","14,116,144"],["48,9,11","3,21,38"],
      ["34,6,8","3,21,38"],["28,5,8","2,18,32"],["24,4,5","2,18,32"],
      ["22,4,5","2,18,32"],["20,4,5","2,18,32"],["16,3,5","2,18,32"],
      ["15,3,4","2,18,32"],["18,3,4","2,18,32"],["18,3,5","2,18,32"],
      ["220,38,38","14,165,233"],["252,165,165","186,230,253"],["180,83,9","14,116,144"],
      ["88,28,135","30,64,175"],["109,40,217","59,130,246"],["91,33,182","30,64,175"],
      ["126,34,206","14,165,233"],["192,132,252","125,211,252"],["18,3,8","2,18,32"],
      ["18,3,20","2,18,32"],["18,3,24","2,18,32"],["24,4,28","2,18,32"],
      ["22,4,30","2,18,32"]
    ],
    cells:{
      1:{x:-1,y:-1}, 2:{x:-1,y:0}, 3:{x:-1,y:1}, 4:{x:1,y:0}, 5:{x:1,y:1}
    }
  },
  JAUNE:{
    baseId:30,
    planet:"assets/maps/decor/planet_solaris_yellow.png",
    background:["#070401", "#1a1204", "#020201"],
    tint:"gold",
    seedOffset:300,
    replacements:[
      ["127,29,29","120,53,15"],["185,28,28","180,83,9"],["153,27,27","146,64,14"],
      ["248,113,113","245,158,11"],["251,146,60","250,204,21"],["251,191,36","253,230,138"],
      ["220,54,42","217,119,6"],["88,28,28","92,45,15"],["168,85,247","245,158,11"],
      ["216,180,254","253,230,138"],["255,132,86","245,158,11"],["238,73,56","234,88,12"],
      ["255,122,74","251,191,36"],["255,237,213","254,243,199"],["253,186,116","253,224,71"],
      ["96,165,250","250,204,21"],["59,130,246","245,158,11"],["56,189,248","250,204,21"],
      ["34,211,238","253,224,71"],["103,232,249","254,240,138"],["125,211,252","254,243,199"],
      ["20,184,166","202,138,4"],["14,165,233","234,88,12"],["14,116,144","146,64,14"],
      ["30,64,175","146,64,14"],["30,58,138","120,53,15"],
      ["255,138,92","245,158,11"],["190,58,45","146,64,14"],["255,214,170","254,243,199"],
      ["185,42,34","146,64,14"],["185,38,31","146,64,14"],["48,9,11","30,18,2"],
      ["34,6,8","30,18,2"],["28,5,8","30,18,2"],["24,4,5","30,18,2"],
      ["22,4,5","30,18,2"],["20,4,5","30,18,2"],["16,3,5","30,18,2"],
      ["15,3,4","30,18,2"],["18,3,4","30,18,2"],["18,3,5","30,18,2"],
      ["220,38,38","234,88,12"],["252,165,165","254,243,199"],["180,83,9","146,64,14"],
      ["88,28,135","120,53,15"],["109,40,217","180,83,9"],["91,33,182","120,53,15"],
      ["126,34,206","245,158,11"],["192,132,252","253,230,138"],["18,3,8","30,18,2"],
      ["18,3,20","30,18,2"],["18,3,24","30,18,2"],["24,4,28","30,18,2"],
      ["22,4,30","30,18,2"]
    ],
    cells:{
      1:{x:1,y:-1}, 2:{x:1,y:0}, 3:{x:1,y:1}, 4:{x:-1,y:0}, 5:{x:-1,y:1}
    }
  },
  VERTE:{
    baseId:40,
    planet:"assets/maps/decor/planet_virdis_green.png",
    background:["#010603", "#06170c", "#010201"],
    tint:"green",
    seedOffset:400,
    replacements:[
      ["127,29,29","20,83,45"],["185,28,28","22,101,52"],["153,27,27","21,94,59"],
      ["248,113,113","34,197,94"],["251,146,60","74,222,128"],["251,191,36","134,239,172"],
      ["220,54,42","16,185,129"],["88,28,28","20,83,45"],["168,85,247","45,212,191"],
      ["216,180,254","167,243,208"],["255,132,86","52,211,153"],["238,73,56","34,197,94"],
      ["255,122,74","110,231,183"],["255,237,213","220,252,231"],["253,186,116","187,247,208"],
      ["96,165,250","45,212,191"],["59,130,246","34,197,94"],["56,189,248","45,212,191"],
      ["34,211,238","74,222,128"],["103,232,249","134,239,172"],["125,211,252","167,243,208"],
      ["20,184,166","16,185,129"],["14,165,233","34,197,94"],["14,116,144","20,83,45"],
      ["30,64,175","20,83,45"],["30,58,138","21,94,59"],
      ["255,138,92","52,211,153"],["190,58,45","20,83,45"],["255,214,170","220,252,231"],
      ["185,42,34","20,83,45"],["185,38,31","20,83,45"],["48,9,11","2,24,12"],
      ["34,6,8","2,24,12"],["28,5,8","2,24,12"],["24,4,5","2,24,12"],
      ["22,4,5","2,24,12"],["20,4,5","2,24,12"],["16,3,5","2,24,12"],
      ["15,3,4","2,24,12"],["18,3,4","2,24,12"],["18,3,5","2,24,12"],
      ["220,38,38","34,197,94"],["252,165,165","220,252,231"],["180,83,9","20,83,45"],
      ["88,28,135","20,83,45"],["109,40,217","22,101,52"],["91,33,182","20,83,45"],
      ["126,34,206","16,185,129"],["192,132,252","167,243,208"],["18,3,8","2,24,12"],
      ["18,3,20","2,24,12"],["18,3,24","2,24,12"],["24,4,28","2,24,12"],
      ["22,4,30","2,24,12"]
    ],
    cells:{
      1:{x:1,y:1}, 2:{x:1,y:0}, 3:{x:1,y:-1}, 4:{x:-1,y:0}, 5:{x:-1,y:-1}
    }
  }
};

const FIRM_INTERNAL_PORTALS = {
  CYAN:[
    [1,"bottomRight",2,"topLeft"],
    [2,"bottomLeft",3,"topLeft"],
    [2,"right",4,"left"],
    [4,"bottomRight",5,"topRight"],
    [3,"right",5,"left"]
  ],
  JAUNE:[
    [1,"bottomLeft",2,"topRight"],
    [2,"bottomRight",3,"topRight"],
    [2,"left",4,"right"],
    [4,"bottomLeft",5,"topLeft"],
    [5,"right",3,"left"]
  ],
  VERTE:[
    [1,"topLeft",2,"bottomRight"],
    [2,"topRight",3,"bottomRight"],
    [2,"left",4,"right"],
    [4,"topLeft",5,"bottomLeft"],
    [5,"right",3,"left"]
  ]
};

const CORE_MAP_ID = 50;

const FIRM_LIGHT_PALETTES = {
  CYAN:{core:"224,242,254", hot:"125,211,252", mid:"56,189,248", haze:"14,116,144"},
  JAUNE:{core:"254,243,199", hot:"253,230,138", mid:"250,204,21", haze:"146,64,14"},
  VERTE:{core:"220,252,231", hot:"134,239,172", mid:"34,197,94", haze:"20,83,45"}
};

function cloneData(value){
  return JSON.parse(JSON.stringify(value));
}

function getAstraTemplate(num){
  return MAPS.find(map=>map.name === `ASTRA-${String(num).padStart(2, "0")}`);
}

function firmMapId(firm, num){
  return FIRM_VISUALS[firm].baseId + num - 1;
}

function portalFromDir({from, toMap, to, label}){
  const p = FIRM_PORTAL_POINT[from];
  const target = FIRM_PORTAL_POINT[to];
  return {x:p.x,y:p.y,r:95,safeRadius:230,targetMap:toMap,targetX:target.x,targetY:target.y,label};
}

function themedString(value, firm){
  const visual = FIRM_VISUALS[firm];
  return visual.replacements.reduce((text, [from, to])=>text.split(from).join(to), value);
}

function themeObject(value, firm){
  return JSON.parse(themedString(JSON.stringify(value), firm));
}

function getFirmPlanetPosition(firm, num){
  const perMap = {
    CYAN:{2:{x:250,y:-250}},
    JAUNE:{2:{x:250,y:-250}},
    VERTE:{2:{x:250,y:-250}}
  };
  if(perMap[firm]?.[num]) return perMap[firm][num];
  const cell = FIRM_VISUALS[firm].cells[num] || {x:0,y:0};
  return {
    x:cell.x < 0 ? -640 : 640,
    y:cell.y < 0 ? -520 : 460
  };
}

function applyFirmVisuals(map, firm, num){
  const visual = FIRM_VISUALS[firm];
  const lights = FIRM_LIGHT_PALETTES[firm];
  map.name = `${firm}-${String(num).padStart(2, "0")}`;
  map.id = firmMapId(firm, num);
  map.enemySeed = Number(map.enemySeed || 0) + visual.seedOffset;
  map.parallaxScene = themeObject(map.parallaxScene || {}, firm);
  map.parallaxScene.background = visual.background;
  if(lights){
    if(Array.isArray(map.parallaxScene.glowSpots)){
      map.parallaxScene.glowSpots = map.parallaxScene.glowSpots.map(spot=>({
        ...spot,
        core:`rgba(${lights.core},${Number.isFinite(spot.alpha) ? spot.alpha : .42})`,
        hot:`rgba(${lights.hot},${Number.isFinite(spot.alpha) ? spot.alpha * .7 : .28})`,
        mid:spot.color || `rgba(${lights.mid},${Number.isFinite(spot.alpha) ? spot.alpha * .38 : .16})`
      }));
    }
    if(Array.isArray(map.parallaxScene.starLights)){
      map.parallaxScene.starLights = map.parallaxScene.starLights.map(light=>({
        ...light,
        colors:lights
      }));
    }
  }
  if(Array.isArray(map.parallaxScene.images)){
    const planet = getFirmPlanetPosition(firm, num);
    map.parallaxScene.images = map.parallaxScene.images.map(image=>{
      const next = {...image};
      if(String(next.src || "").includes("planet")){
        next.src = visual.planet;
        next.x = planet.x;
        next.y = planet.y;
      }
      return next;
    });
    if(!map.parallaxScene.images.some(image=>String(image.src || "").includes("planet_")) && num === 1){
      map.parallaxScene.images.unshift({src:visual.planet, x:planet.x, y:planet.y, w:1340, h:1340, p:.105, alpha:.98});
    }
  }
  if(num === 1 && map.spawn){
    const cell = visual.cells[1] || {x:-1,y:1};
    map.spawn.x = cell.x < 0 ? -4300 : 4300;
    map.spawn.y = cell.y < 0 ? -3300 : 3300;
    map.spawn.safeRect = null;
  }
  delete map.questNpcs;
  delete map.closedPortals;
  delete map.portal;
  map.firm = firm;
  map.theme = visual.tint;
  return map;
}

function buildFirmMaps(firm){
  const maps = [1,2,3,4,5].map(num=>applyFirmVisuals(cloneData(getAstraTemplate(num)), firm, num));
  const byNum = new Map(maps.map((map, index)=>[index + 1, map]));
  maps.forEach(map=>{ map.portals = []; });
  FIRM_INTERNAL_PORTALS[firm].forEach(([fromNum, fromDir, toNum, toDir])=>{
    byNum.get(fromNum).portals.push(portalFromDir({
      from:fromDir,
      toMap:firmMapId(firm, toNum),
      to:toDir,
      label:`VERS ${firm}-${String(toNum).padStart(2, "0")}`
    }));
    byNum.get(toNum).portals.push(portalFromDir({
      from:toDir,
      toMap:firmMapId(firm, fromNum),
      to:fromDir,
      label:`VERS ${firm}-${String(fromNum).padStart(2, "0")}`
    }));
  });
  return maps;
}

function upsertMaps(generatedMaps){
  generatedMaps.forEach(map=>{
    const existing = MAPS.findIndex(entry=>entry.id === map.id || entry.name === map.name);
    if(existing >= 0) MAPS[existing] = map;
    else MAPS.push(map);
  });
}

function addPortalIfMissing(map, portal){
  map.portals = Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [];
  delete map.portal;
  const exists = map.portals.some(existing=>
    existing.targetMap === portal.targetMap
    && existing.x === portal.x
    && existing.y === portal.y
  );
  if(!exists) map.portals.push(portal);
}

function addSectorBridge(fromMapName, fromDir, toMapName, toDir){
  const fromMap = MAPS.find(map=>map.name === fromMapName);
  const toMap = MAPS.find(map=>map.name === toMapName);
  if(!fromMap || !toMap) return;
  addPortalIfMissing(fromMap, portalFromDir({from:fromDir, toMap:toMap.id, to:toDir, label:`VERS ${toMap.name}`}));
  addPortalIfMissing(toMap, portalFromDir({from:toDir, toMap:fromMap.id, to:fromDir, label:`VERS ${fromMap.name}`}));
}

function getMapByName(name){
  return MAPS.find(map=>map.name === name);
}

function removePortalsTo(map, targetMapId){
  if(!map || targetMapId == null) return;
  map.portals = (Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [])
    .filter(portal=>portal.targetMap !== targetMapId);
  delete map.portal;
}

function removePortalAtDir(map, dir){
  if(!map) return;
  const point = FIRM_PORTAL_POINT[dir];
  if(!point) return;
  map.portals = (Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : [])
    .filter(portal=>portal.x !== point.x || portal.y !== point.y);
  delete map.portal;
}

function resetZoneFourPortals(firm, crossFirm){
  const prefix = `${firm}-`;
  const map4 = getMapByName(`${prefix}04`);
  const map2 = getMapByName(`${prefix}02`);
  const map3 = getMapByName(`${prefix}03`);
  const map5 = getMapByName(`${prefix}05`);
  const cross4 = getMapByName(`${crossFirm}-04`);
  if(!map4 || !map2 || !map3 || !map5 || !cross4) return;

  [map2, map3, map5, cross4].forEach(map=>removePortalsTo(map, map4.id));
  removePortalAtDir(map2, "bottomRight");
  removePortalAtDir(map3, "bottomRight");
  removePortalAtDir(map5, "bottomLeft");
  removePortalAtDir(cross4, "bottomRight");
  map4.portals = [
    portalFromDir({from:"bottomLeft", toMap:map2.id, to:"bottomRight", label:`VERS ${map2.name}`}),
    portalFromDir({from:"topLeft", toMap:map3.id, to:"bottomRight", label:`VERS ${map3.name}`}),
    portalFromDir({from:"topRight", toMap:map5.id, to:"bottomLeft", label:`VERS ${map5.name}`}),
    portalFromDir({from:"bottomRight", toMap:cross4.id, to:"bottomRight", label:`VERS ${cross4.name}`})
  ];
  addPortalIfMissing(map2, portalFromDir({from:"bottomRight", toMap:map4.id, to:"bottomLeft", label:`VERS ${map4.name}`}));
  addPortalIfMissing(map3, portalFromDir({from:"bottomRight", toMap:map4.id, to:"topLeft", label:`VERS ${map4.name}`}));
  addPortalIfMissing(map5, portalFromDir({from:"bottomLeft", toMap:map4.id, to:"topRight", label:`VERS ${map4.name}`}));
  addPortalIfMissing(cross4, portalFromDir({from:"bottomRight", toMap:map4.id, to:"bottomRight", label:`VERS ${map4.name}`}));
}

const ZONE_TWO_PORTAL_LAYOUT = {
  ASTRA:{to1:"bottomLeft", from1:"topRight", to3:"topLeft", from3:"bottomLeft", to4:"bottomRight", from4:"bottomLeft"},
  CYAN:{to1:"topLeft", from1:"bottomRight", to3:"bottomLeft", from3:"topLeft", to4:"topRight", from4:"topLeft"},
  JAUNE:{to1:"topRight", from1:"bottomLeft", to3:"bottomRight", from3:"topRight", to4:"topLeft", from4:"bottomLeft"},
  VERTE:{to1:"bottomRight", from1:"topLeft", to3:"topRight", from3:"bottomRight", to4:"bottomLeft", from4:"bottomRight"}
};

function resetZoneTwoPortals(firm){
  const layout = ZONE_TWO_PORTAL_LAYOUT[firm];
  const prefix = `${firm}-`;
  const map1 = getMapByName(`${prefix}01`);
  const map2 = getMapByName(`${prefix}02`);
  const map3 = getMapByName(`${prefix}03`);
  const map4 = getMapByName(`${prefix}04`);
  if(!layout || !map1 || !map2 || !map3 || !map4) return;

  [map1, map3, map4].forEach(map=>removePortalsTo(map, map2.id));
  removePortalAtDir(map1, layout.from1);
  removePortalAtDir(map3, layout.from3);
  removePortalAtDir(map4, layout.from4);
  map2.portals = [
    portalFromDir({from:layout.to1, toMap:map1.id, to:layout.from1, label:`VERS ${map1.name}`}),
    portalFromDir({from:layout.to3, toMap:map3.id, to:layout.from3, label:`VERS ${map3.name}`}),
    portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`})
  ];
  addPortalIfMissing(map1, portalFromDir({from:layout.from1, toMap:map2.id, to:layout.to1, label:`VERS ${map2.name}`}));
  addPortalIfMissing(map3, portalFromDir({from:layout.from3, toMap:map2.id, to:layout.to3, label:`VERS ${map2.name}`}));
  addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map2.id, to:layout.to4, label:`VERS ${map2.name}`}));
}

const ZONE_THREE_PORTAL_LAYOUT = {
  ASTRA:{to2:"bottomLeft", from2:"topLeft", to4:"bottomRight", from4:"topLeft", to5:"topRight", from5:"topLeft", crossFirm:"CYAN", crossFrom:"topLeft", crossTo:"bottomLeft"},
  CYAN:{to2:"topLeft", from2:"bottomLeft", to4:"topRight", from4:"bottomLeft", to5:"bottomRight", from5:"bottomLeft", crossFirm:"ASTRA", crossFrom:"bottomLeft", crossTo:"topLeft"},
  JAUNE:{to2:"topRight", from2:"bottomRight", to4:"topLeft", from4:"bottomRight", to5:"bottomLeft", from5:"bottomRight", crossFirm:"VERTE", crossFrom:"bottomRight", crossTo:"topRight"},
  VERTE:{to2:"bottomRight", from2:"topRight", to4:"bottomLeft", from4:"topLeft", to5:"topLeft", from5:"topRight", crossFirm:"JAUNE", crossFrom:"topRight", crossTo:"bottomRight"}
};

function resetZoneThreePortals(firm){
  const layout = ZONE_THREE_PORTAL_LAYOUT[firm];
  const prefix = `${firm}-`;
  const map2 = getMapByName(`${prefix}02`);
  const map3 = getMapByName(`${prefix}03`);
  const map4 = getMapByName(`${prefix}04`);
  const map5 = getMapByName(`${prefix}05`);
  const cross3 = getMapByName(`${layout?.crossFirm || ""}-03`);
  if(!layout || !map2 || !map3 || !map4 || !map5 || !cross3) return;

  [map2, map4, map5, cross3].forEach(map=>removePortalsTo(map, map3.id));
  removePortalAtDir(map2, layout.from2);
  removePortalAtDir(map4, layout.from4);
  removePortalAtDir(map5, layout.from5);
  removePortalAtDir(cross3, layout.crossTo);

  map3.portals = [
    portalFromDir({from:layout.to2, toMap:map2.id, to:layout.from2, label:`VERS ${map2.name}`}),
    portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`}),
    portalFromDir({from:layout.to5, toMap:map5.id, to:layout.from5, label:`VERS ${map5.name}`}),
    portalFromDir({from:layout.crossFrom, toMap:cross3.id, to:layout.crossTo, label:`VERS ${cross3.name}`})
  ];
  addPortalIfMissing(map2, portalFromDir({from:layout.from2, toMap:map3.id, to:layout.to2, label:`VERS ${map3.name}`}));
  addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map3.id, to:layout.to4, label:`VERS ${map3.name}`}));
  addPortalIfMissing(map5, portalFromDir({from:layout.from5, toMap:map3.id, to:layout.to5, label:`VERS ${map3.name}`}));
  addPortalIfMissing(cross3, portalFromDir({from:layout.crossTo, toMap:map3.id, to:layout.crossFrom, label:`VERS ${map3.name}`}));
}

const ZONE_FIVE_PORTAL_LAYOUT = {
  ASTRA:{
    to3:"topLeft", from3:"topRight",
    to4:"bottomLeft", from4:"topRight",
    toUpper:"topRight", upper:"CYAN", upperFrom:"bottomRight",
    toCore:"top", coreFrom:"left",
    toLower:"bottomRight", lower:"VERTE", lowerFrom:"bottomLeft"
  },
  CYAN:{
    to3:"bottomLeft", from3:"bottomRight",
    to4:"topLeft", from4:"topRight",
    toUpper:"topRight", upper:"JAUNE", upperFrom:"topLeft",
    toCore:"right", coreFrom:"top",
    toLower:"bottomRight", lower:"ASTRA", lowerFrom:"topRight"
  },
  JAUNE:{
    to3:"bottomRight", from3:"bottomLeft",
    to4:"topRight", from4:"topRight",
    toUpper:"topLeft", upper:"CYAN", upperFrom:"topRight",
    toCore:"bottom", coreFrom:"right",
    toLower:"bottomLeft", lower:"VERTE", lowerFrom:"topLeft"
  },
  VERTE:{
    to3:"topRight", from3:"topLeft",
    to4:"bottomRight", from4:"topRight",
    toUpper:"topLeft", upper:"JAUNE", upperFrom:"bottomLeft",
    toCore:"left", coreFrom:"bottom",
    toLower:"bottomLeft", lower:"ASTRA", lowerFrom:"bottomRight"
  }
};

function resetZoneFivePortals(firm){
  const layout = ZONE_FIVE_PORTAL_LAYOUT[firm];
  const prefix = `${firm}-`;
  const map3 = getMapByName(`${prefix}03`);
  const map4 = getMapByName(`${prefix}04`);
  const map5 = getMapByName(`${prefix}05`);
  const upper5 = getMapByName(`${layout?.upper || ""}-05`);
  const lower5 = getMapByName(`${layout?.lower || ""}-05`);
  const core = getMapByName("CORE");
  if(!layout || !map3 || !map4 || !map5 || !upper5 || !lower5 || !core) return;

  [map3, map4, upper5, lower5, core].forEach(map=>removePortalsTo(map, map5.id));
  removePortalAtDir(map3, layout.from3);
  removePortalAtDir(map4, layout.from4);
  removePortalAtDir(upper5, layout.upperFrom);
  removePortalAtDir(lower5, layout.lowerFrom);
  removePortalAtDir(core, layout.coreFrom);

  map5.portals = [
    portalFromDir({from:layout.to3, toMap:map3.id, to:layout.from3, label:`VERS ${map3.name}`}),
    portalFromDir({from:layout.to4, toMap:map4.id, to:layout.from4, label:`VERS ${map4.name}`}),
    portalFromDir({from:layout.toUpper, toMap:upper5.id, to:layout.upperFrom, label:`VERS ${upper5.name}`}),
    portalFromDir({from:layout.toCore, toMap:core.id, to:layout.coreFrom, label:"VERS CORE"}),
    portalFromDir({from:layout.toLower, toMap:lower5.id, to:layout.lowerFrom, label:`VERS ${lower5.name}`})
  ];
  addPortalIfMissing(map3, portalFromDir({from:layout.from3, toMap:map5.id, to:layout.to3, label:`VERS ${map5.name}`}));
  addPortalIfMissing(map4, portalFromDir({from:layout.from4, toMap:map5.id, to:layout.to4, label:`VERS ${map5.name}`}));
  addPortalIfMissing(upper5, portalFromDir({from:layout.upperFrom, toMap:map5.id, to:layout.toUpper, label:`VERS ${map5.name}`}));
  addPortalIfMissing(core, portalFromDir({from:layout.coreFrom, toMap:map5.id, to:layout.toCore, label:`VERS ${map5.name}`}));
  addPortalIfMissing(lower5, portalFromDir({from:layout.lowerFrom, toMap:map5.id, to:layout.toLower, label:`VERS ${map5.name}`}));
}

function resetCyanFourPortals(){
  const map2 = getMapByName("CYAN-02");
  const map3 = getMapByName("CYAN-03");
  const map4 = getMapByName("CYAN-04");
  const map5 = getMapByName("CYAN-05");
  const jaune4 = getMapByName("JAUNE-04");
  if(!map2 || !map3 || !map4 || !map5 || !jaune4) return;

  [map2, map3, map5, jaune4].forEach(map=>removePortalsTo(map, map4.id));
  removePortalAtDir(map2, "topRight");
  removePortalAtDir(map3, "topRight");
  removePortalAtDir(map5, "topLeft");
  removePortalAtDir(jaune4, "topLeft");

  map4.portals = [
    portalFromDir({from:"topLeft", toMap:map2.id, to:"topRight", label:"VERS CYAN-02"}),
    portalFromDir({from:"bottomLeft", toMap:map3.id, to:"topRight", label:"VERS CYAN-03"}),
    portalFromDir({from:"topRight", toMap:jaune4.id, to:"topLeft", label:"VERS JAUNE-04"}),
    portalFromDir({from:"bottomRight", toMap:map5.id, to:"topLeft", label:"VERS CYAN-05"})
  ];
  addPortalIfMissing(map2, portalFromDir({from:"topRight", toMap:map4.id, to:"topLeft", label:"VERS CYAN-04"}));
  addPortalIfMissing(map3, portalFromDir({from:"topRight", toMap:map4.id, to:"bottomLeft", label:"VERS CYAN-04"}));
  addPortalIfMissing(jaune4, portalFromDir({from:"topLeft", toMap:map4.id, to:"topRight", label:"VERS CYAN-04"}));
  addPortalIfMissing(map5, portalFromDir({from:"topLeft", toMap:map4.id, to:"bottomRight", label:"VERS CYAN-04"}));
}

function resetVerteFourAstraPortal(){
  const astra4 = getMapByName("ASTRA-04");
  const verte3 = getMapByName("VERTE-03");
  const verte4 = getMapByName("VERTE-04");
  const verte5 = getMapByName("VERTE-05");
  if(!astra4 || !verte3 || !verte4 || !verte5) return;

  removePortalsTo(verte4, astra4.id);
  removePortalsTo(astra4, verte4.id);
  removePortalsTo(verte4, verte3.id);
  removePortalsTo(verte3, verte4.id);
  removePortalsTo(verte4, verte5.id);
  removePortalsTo(verte5, verte4.id);
  removePortalAtDir(verte4, "topLeft");
  removePortalAtDir(verte4, "topRight");
  removePortalAtDir(verte3, "bottomLeft");
  removePortalAtDir(verte5, "bottomLeft");
  removePortalAtDir(verte5, "bottomRight");
  removePortalAtDir(verte4, "bottomLeft");
  removePortalAtDir(astra4, "bottomRight");

  addPortalIfMissing(verte4, portalFromDir({from:"topLeft", toMap:verte5.id, to:"bottomLeft", label:"VERS VERTE-05"}));
  addPortalIfMissing(verte5, portalFromDir({from:"bottomLeft", toMap:verte4.id, to:"topLeft", label:"VERS VERTE-04"}));
  addPortalIfMissing(verte4, portalFromDir({from:"topRight", toMap:verte3.id, to:"bottomLeft", label:"VERS VERTE-03"}));
  addPortalIfMissing(verte3, portalFromDir({from:"bottomLeft", toMap:verte4.id, to:"topRight", label:"VERS VERTE-04"}));
  addPortalIfMissing(verte4, portalFromDir({from:"bottomLeft", toMap:astra4.id, to:"bottomRight", label:"VERS ASTRA-04"}));
  addPortalIfMissing(astra4, portalFromDir({from:"bottomRight", toMap:verte4.id, to:"bottomLeft", label:"VERS VERTE-04"}));
}

function resetJauneFiveFourPortal(){
  const jaune2 = getMapByName("JAUNE-02");
  const jaune4 = getMapByName("JAUNE-04");
  const jaune5 = getMapByName("JAUNE-05");
  const cyan5 = getMapByName("CYAN-05");
  if(!jaune2 || !jaune4 || !jaune5 || !cyan5) return;

  removePortalsTo(jaune5, cyan5.id);
  removePortalsTo(cyan5, jaune5.id);
  removePortalsTo(jaune5, jaune4.id);
  removePortalsTo(jaune4, jaune5.id);
  removePortalAtDir(jaune5, "topLeft");
  removePortalAtDir(jaune5, "topRight");
  removePortalAtDir(jaune4, "topRight");
  removePortalAtDir(jaune4, "bottomLeft");
  removePortalAtDir(cyan5, "topRight");

  addPortalIfMissing(jaune5, portalFromDir({from:"topLeft", toMap:jaune4.id, to:"bottomLeft", label:"VERS JAUNE-04"}));
  addPortalIfMissing(jaune4, portalFromDir({from:"bottomLeft", toMap:jaune5.id, to:"topLeft", label:"VERS JAUNE-05"}));
  addPortalIfMissing(jaune4, portalFromDir({from:"topRight", toMap:jaune2.id, to:"topLeft", label:"VERS JAUNE-02"}));
  addPortalIfMissing(jaune2, portalFromDir({from:"topLeft", toMap:jaune4.id, to:"topRight", label:"VERS JAUNE-04"}));
}

function removeExtraMapFivePortals(){
  const cyan4 = getMapByName("CYAN-04");
  const cyan5 = getMapByName("CYAN-05");
  const astra4 = getMapByName("ASTRA-04");
  const astra5 = getMapByName("ASTRA-05");
  if(cyan4 && cyan5){
    removePortalsTo(cyan5, cyan4.id);
    removePortalsTo(cyan4, cyan5.id);
    removePortalAtDir(cyan5, "topLeft");
    removePortalAtDir(cyan5, "topRight");
    removePortalAtDir(cyan4, "bottomRight");
    addPortalIfMissing(cyan5, portalFromDir({from:"topRight", toMap:cyan4.id, to:"bottomRight", label:"VERS CYAN-04"}));
    addPortalIfMissing(cyan4, portalFromDir({from:"bottomRight", toMap:cyan5.id, to:"topRight", label:"VERS CYAN-05"}));
  }
  if(astra4 && astra5){
    removePortalsTo(astra5, astra4.id);
    removePortalsTo(astra4, astra5.id);
    removePortalAtDir(astra5, "bottomLeft");
    removePortalAtDir(astra4, "topRight");
    addPortalIfMissing(astra4, portalFromDir({from:"topRight", toMap:astra5.id, to:"bottomRight", label:"VERS ASTRA-05"}));
    addPortalIfMissing(astra5, portalFromDir({from:"bottomRight", toMap:astra4.id, to:"topRight", label:"VERS ASTRA-04"}));
  }
}

function applySectorGraphPortals(){
  const graphMaps = MAPS.filter(map=>["ASTRA", "CYAN", "JAUNE", "VERTE"].includes(map.firm || String(map.name || "").split("-")[0]));
  graphMaps.forEach(map=>{ map.portals = []; delete map.portal; });

  const links = [
    ["CYAN-01", "bottomRight", "CYAN-02", "topLeft"],
    ["CYAN-02", "bottomLeft", "CYAN-03", "topLeft"],
    ["CYAN-02", "topRight", "CYAN-04", "topLeft"],
    ["CYAN-03", "topRight", "CYAN-04", "bottomLeft"],
    ["CYAN-03", "bottomRight", "CYAN-05", "bottomLeft"],
    ["CYAN-04", "topRight", "JAUNE-04", "topLeft"],
    ["CYAN-04", "bottomRight", "CYAN-05", "topRight"],
    ["CYAN-05", "bottomRight", "ASTRA-05", "topRight"],

    ["ASTRA-01", "topRight", "ASTRA-02", "bottomLeft"],
    ["ASTRA-02", "topLeft", "ASTRA-03", "bottomLeft"],
    ["ASTRA-02", "bottomRight", "ASTRA-04", "bottomLeft"],
    ["ASTRA-03", "topLeft", "CYAN-03", "bottomLeft"],
    ["ASTRA-03", "topRight", "ASTRA-05", "topLeft"],
    ["ASTRA-03", "bottomRight", "ASTRA-04", "topLeft"],
    ["ASTRA-04", "topRight", "ASTRA-05", "bottomRight"],
    ["ASTRA-04", "bottomRight", "VERTE-04", "bottomLeft"],

    ["JAUNE-01", "bottomLeft", "JAUNE-02", "topRight"],
    ["JAUNE-02", "topLeft", "JAUNE-04", "topRight"],
    ["JAUNE-02", "bottomRight", "JAUNE-03", "topRight"],
    ["JAUNE-03", "topLeft", "JAUNE-04", "bottomRight"],
    ["JAUNE-03", "bottomLeft", "JAUNE-05", "bottomRight"],
    ["JAUNE-03", "bottomRight", "VERTE-03", "topRight"],
    ["JAUNE-04", "bottomLeft", "JAUNE-05", "topLeft"],
    ["JAUNE-05", "bottomLeft", "VERTE-05", "topLeft"],

    ["VERTE-01", "topLeft", "VERTE-02", "bottomRight"],
    ["VERTE-02", "topRight", "VERTE-03", "bottomRight"],
    ["VERTE-02", "bottomLeft", "VERTE-04", "bottomRight"],
    ["VERTE-03", "topLeft", "VERTE-05", "topRight"],
    ["VERTE-03", "bottomLeft", "VERTE-04", "topRight"],
    ["VERTE-04", "topLeft", "VERTE-05", "bottomLeft"],
    ["VERTE-05", "topLeft", "JAUNE-05", "bottomLeft"]
  ];

  links.forEach(([fromName, fromDir, toName, toDir])=>{
    const fromMap = getMapByName(fromName);
    const toMap = getMapByName(toName);
    if(!fromMap || !toMap) return;
    addPortalIfMissing(fromMap, portalFromDir({from:fromDir, toMap:toMap.id, to:toDir, label:`VERS ${toMap.name}`}));
    addPortalIfMissing(toMap, portalFromDir({from:toDir, toMap:fromMap.id, to:fromDir, label:`VERS ${fromMap.name}`}));
  });

  const core = getMapByName("CORE");
  const coreLinks = [
    ["ASTRA-05", "top", "left"],
    ["CYAN-05", "right", "top"],
    ["JAUNE-05", "bottom", "right"],
    ["VERTE-05", "left", "bottom"]
  ];
  coreLinks.forEach(([mapName, fromDir, coreDir])=>{
    const map = getMapByName(mapName);
    if(!map || !core) return;
    addPortalIfMissing(map, portalFromDir({from:fromDir, toMap:core.id, to:coreDir, label:"VERS CORE"}));
  });
}

function buildCoreMap(){
  const core = cloneData(getAstraTemplate(5));
  core.id = CORE_MAP_ID;
  core.name = "CORE";
  core.firm = "CORE";
  core.theme = "core";
  core.spawn = {x:0,y:0,r:360,label:"NOYAU CENTRAL",safeRadius:520,decorRadius:600};
  core.enemySeed = 900;
  core.enemyCount = 55;
  core.enemyLevel = [20,28];
  core.parallaxScene = themeObject(core.parallaxScene || {}, "CYAN");
  core.parallaxScene.background = ["#04010b", "#11051f", "#020104"];
  core.parallaxScene.images = [];
  core.portals = [
    portalFromDir({from:"left", toMap:4, to:"right", label:"VERS ASTRA-05"}),
    portalFromDir({from:"top", toMap:firmMapId("CYAN", 5), to:"right", label:"VERS CYAN-05"}),
    portalFromDir({from:"right", toMap:firmMapId("JAUNE", 5), to:"left", label:"VERS JAUNE-05"}),
    portalFromDir({from:"bottom", toMap:firmMapId("VERTE", 5), to:"left", label:"VERS VERTE-05"})
  ];
  return core;
}

upsertMaps([
  ...buildFirmMaps("CYAN"),
  ...buildFirmMaps("JAUNE"),
  ...buildFirmMaps("VERTE"),
  buildCoreMap()
]);

addPortalIfMissing(getAstraTemplate(3), portalFromDir({from:"topLeft", toMap:firmMapId("CYAN", 3), to:"bottomLeft", label:"VERS CYAN-03"}));
addPortalIfMissing(getAstraTemplate(5), portalFromDir({from:"right", toMap:CORE_MAP_ID, to:"left", label:"VERS CORE"}));
addPortalIfMissing(MAPS.find(map=>map.name === "CYAN-03"), portalFromDir({from:"bottomLeft", toMap:2, to:"topLeft", label:"VERS ASTRA-03"}));
addPortalIfMissing(MAPS.find(map=>map.name === "CYAN-05"), portalFromDir({from:"right", toMap:CORE_MAP_ID, to:"top", label:"VERS CORE"}));
addPortalIfMissing(MAPS.find(map=>map.name === "JAUNE-05"), portalFromDir({from:"left", toMap:CORE_MAP_ID, to:"right", label:"VERS CORE"}));
addPortalIfMissing(MAPS.find(map=>map.name === "VERTE-05"), portalFromDir({from:"left", toMap:CORE_MAP_ID, to:"bottom", label:"VERS CORE"}));

addSectorBridge("CYAN-04", "topRight", "JAUNE-04", "topLeft");
addSectorBridge("CYAN-05", "bottomRight", "ASTRA-05", "topRight");
addSectorBridge("JAUNE-05", "bottomLeft", "VERTE-05", "topLeft");
addSectorBridge("JAUNE-03", "bottomRight", "VERTE-03", "topRight");
addSectorBridge("ASTRA-04", "bottomRight", "VERTE-04", "bottomLeft");

resetZoneFourPortals("ASTRA", "VERTE");
resetZoneFourPortals("VERTE", "ASTRA");
resetZoneFourPortals("CYAN", "JAUNE");
resetZoneFourPortals("JAUNE", "CYAN");
resetZoneTwoPortals("ASTRA");
resetZoneTwoPortals("CYAN");
resetZoneTwoPortals("JAUNE");
resetZoneTwoPortals("VERTE");
resetZoneThreePortals("ASTRA");
resetZoneThreePortals("CYAN");
resetZoneThreePortals("JAUNE");
resetZoneThreePortals("VERTE");
resetZoneFivePortals("ASTRA");
resetZoneFivePortals("CYAN");
resetZoneFivePortals("JAUNE");
resetZoneFivePortals("VERTE");
resetCyanFourPortals();
resetVerteFourAstraPortal();
resetJauneFiveFourPortal();
removeExtraMapFivePortals();
applySectorGraphPortals();

const RICKY_PORTAL_BY_FIRM = {
  ASTRA:{map:"ASTRA-02", npcId:"astra02_portal_mechanic", portal:{x:4300, y:-3300}, npc:{x:4470, y:-3180}},
  CYAN:{map:"CYAN-02", npcId:"cyan02_portal_mechanic", portal:{x:4300, y:3300}, npc:{x:4470, y:3180}},
  JAUNE:{map:"JAUNE-02", npcId:"jaune02_portal_mechanic", portal:{x:-4300, y:3300}, npc:{x:-4470, y:3180}},
  VERTE:{map:"VERTE-02", npcId:"verte02_portal_mechanic", portal:{x:-4300, y:-3300}, npc:{x:-4470, y:-3180}}
};

function installFirmRickyPortals(){
  const rickyTemplate = {
    npcImg:"assets/ships/npc/npc_saucer.png",
    radius:82,
    size:132,
    marker:"!",
    label:"RICKY",
    ...(MAPS.find(entry=>entry.name === "ASTRA-02")?.questNpcs?.find(npc=>npc.id === "astra02_portal_mechanic") || {})
  };
  for(const config of Object.values(RICKY_PORTAL_BY_FIRM)){
    const map = MAPS.find(entry=>entry.name === config.map);
    if(!map) continue;
    map.closedPortals = [{...config.portal, r:95, safeRadius:230}];
    map.questNpcs = [{
      ...rickyTemplate,
      id:config.npcId,
      name:"Ricky",
      x:config.npc.x,
      y:config.npc.y,
      interactionRadius:260,
      text:"Le portail est ferme. J'ai besoin de fluides et de renforts pour le stabiliser."
    }];
  }
}

installFirmRickyPortals();

export function getMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

const BOSS_STAT_MULTIPLIER = 4;
function multiplyMaterials(materials = {}, multiplier = BOSS_STAT_MULTIPLIER){
  return Object.fromEntries(Object.entries(materials).map(([id, amount])=>[id, Math.max(0, Math.round(Number(amount || 0) * multiplier))]));
}
function multiplyLoot(loot, multiplier = BOSS_STAT_MULTIPLIER){
  return {
    credits:Math.max(0, Math.round(Number(loot?.credits || 0) * multiplier)),
    xp:Math.max(0, Math.round(Number(loot?.xp || 0) * multiplier)),
    premium:Math.max(0, Math.round(Number(loot?.premium || 0) * multiplier)),
    materials:multiplyMaterials(loot?.materials, multiplier)
  };
}

export const ENEMY_TYPES = {
  drone_pirate:{
    name:"Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
    levelRange:[1,4],
    maxHp:()=>800,
    speed:()=>190,
    radius:26,
    width:74,
    height:74,
    attackRange:500,
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
    levelRange:[4,7],
    maxHp:(level)=>1450 + level*170,
    speed:()=>220,
    radius:36,
    width:88,
    height:88,
    attackRange:250,
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
    levelRange:[7,10],
    maxHp:()=>3500,
    maxShield:()=>1500,
    speed:()=>200,
    radius:34,
    width:86,
    height:86,
    attackRange:350,
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
    levelRange:[11,14],
    maxHp:()=>8000,
    maxShield:()=>2000,
    speed:()=>150,
    radius:46,
    width:106,
    height:106,
    attackRange:350,
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
  cuirasse_ambre:{
    name:"Cuirasse ambre",
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    levelRange:[17,20],
    maxHp:()=>80000,
    maxShield:()=>50000,
    speed:()=>165,
    radius:62,
    width:148,
    height:148,
    attackRange:350,
    shieldAbsorbRatio:.8,
    attackDamageMin:1300,
    attackDamageMax:1500,
    attackDamage:()=>1500,
    attackCooldown:1.65,
    projectileSpeed:610,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:{
      credits:100000,
      xp:20000,
      premium:30,
      materials:{
        cuivre_orbital:120,
        zinc_spatial:120,
        nickel_brut:120,
        titane_fissure:120,
        silice_conductrice:120,
        alliage_cuivre_zinc:8,
        plaque_nickel_titane:8
      }
    }
  },
  cristal_du_neant:{
    name:"Cristal du néant",
    img:"assets/enemies/enemy_purple_crystal.png",
    levelRange:[14,17],
    maxHp:()=>40000,
    maxShield:()=>20000,
    speed:()=>170,
    radius:48,
    width:112,
    height:112,
    attackRange:400,
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
  },
  boss_drone_pirate:{
    name:"Boss Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
    levelRange:[18,24],
    maxHp:()=>800 * BOSS_STAT_MULTIPLIER,
    speed:()=>190,
    radius:32,
    width:88,
    height:88,
    attackRange:500,
    shieldAbsorbRatio:.8,
    attackDamage:(level)=>(34 + level*4) * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.25,
    projectileSpeed:680,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.72)",
    loot:multiplyLoot({
      credits:1200,
      xp:350,
      premium:2,
      materials:{nickel_brut:10, titane_fissure:10, silice_conductrice:10}
    })
  },
  boss_raider_astral:{
    name:"Boss Vorak rusher",
    img:"assets/enemies/enemy_red_rusher.png",
    levelRange:[18,24],
    maxHp:(level)=>(1450 + level*170) * BOSS_STAT_MULTIPLIER,
    speed:()=>220,
    radius:42,
    width:104,
    height:104,
    attackRange:250,
    shieldAbsorbRatio:.8,
    attackDamageMin:90 * BOSS_STAT_MULTIPLIER,
    attackDamageMax:140 * BOSS_STAT_MULTIPLIER,
    attackDamage:()=>115 * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.35,
    projectileSpeed:640,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:multiplyLoot({
      credits:1500,
      xp:500,
      premium:3,
      materials:{cuivre_orbital:10, zinc_spatial:10, nickel_brut:10}
    })
  },
  boss_chasseur_spectral:{
    name:"Boss Parasite astral",
    img:"assets/enemies/enemy_green_parasite.png",
    levelRange:[18,24],
    maxHp:()=>3500 * BOSS_STAT_MULTIPLIER,
    maxShield:()=>1500 * BOSS_STAT_MULTIPLIER,
    speed:()=>200,
    radius:42,
    width:104,
    height:104,
    attackRange:350,
    shieldAbsorbRatio:.8,
    attackDamageMin:150 * BOSS_STAT_MULTIPLIER,
    attackDamageMax:250 * BOSS_STAT_MULTIPLIER,
    attackDamage:()=>200 * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.55,
    projectileSpeed:620,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    onHitEffect:{type:"poison", damage:50 * BOSS_STAT_MULTIPLIER, interval:2, duration:10},
    loot:multiplyLoot({
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
    })
  },
  boss_cuirasse_nebulaire:{
    name:"Boss Traqueur abyssal",
    img:"assets/enemies/enemy_blue_spider.png",
    levelRange:[18,24],
    maxHp:()=>8000 * BOSS_STAT_MULTIPLIER,
    maxShield:()=>2000 * BOSS_STAT_MULTIPLIER,
    speed:()=>150,
    radius:54,
    width:126,
    height:126,
    attackRange:350,
    shieldAbsorbRatio:.8,
    attackDamageMin:250 * BOSS_STAT_MULTIPLIER,
    attackDamageMax:350 * BOSS_STAT_MULTIPLIER,
    attackDamage:()=>300 * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.70,
    projectileSpeed:590,
    color:"rgba(96,165,250,.95)",
    particle:"rgba(191,219,254,.72)",
    loot:multiplyLoot({
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
    })
  },
  boss_cuirasse_ambre:{
    name:"Boss Cuirasse ambre",
    img:"assets/enemies/generated/astra4_ember_cuirass.png",
    levelRange:[18,24],
    maxHp:()=>80000 * BOSS_STAT_MULTIPLIER,
    maxShield:()=>50000 * BOSS_STAT_MULTIPLIER,
    speed:()=>165,
    radius:70,
    width:164,
    height:164,
    attackRange:350,
    shieldAbsorbRatio:.8,
    attackDamageMin:1300 * BOSS_STAT_MULTIPLIER,
    attackDamageMax:1500 * BOSS_STAT_MULTIPLIER,
    attackDamage:()=>1500 * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.65,
    projectileSpeed:610,
    color:"rgba(251,146,60,.95)",
    particle:"rgba(253,186,116,.72)",
    loot:multiplyLoot({
      credits:100000,
      xp:20000,
      premium:30,
      materials:{
        cuivre_orbital:120,
        zinc_spatial:120,
        nickel_brut:120,
        titane_fissure:120,
        silice_conductrice:120,
        alliage_cuivre_zinc:8,
        plaque_nickel_titane:8
      }
    })
  },
  boss_cristal_du_neant:{
    name:"Boss Cristal du neant",
    img:"assets/enemies/enemy_purple_crystal.png",
    levelRange:[18,24],
    maxHp:()=>40000 * BOSS_STAT_MULTIPLIER,
    maxShield:()=>20000 * BOSS_STAT_MULTIPLIER,
    speed:()=>170,
    radius:56,
    width:128,
    height:128,
    attackRange:400,
    shieldAbsorbRatio:.8,
    attackDamageMin:800 * BOSS_STAT_MULTIPLIER,
    attackDamageMax:1000 * BOSS_STAT_MULTIPLIER,
    attackDamage:()=>900 * BOSS_STAT_MULTIPLIER,
    attackCooldown:1.85,
    projectileSpeed:560,
    color:"rgba(168,85,247,.95)",
    particle:"rgba(216,180,254,.72)",
    loot:multiplyLoot({
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
    })
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
  cuirasse_nebulaire:0.93,
  cuirasse_ambre:0.92,
  cristal_du_neant:0.92,
  boss_drone_pirate:0.86,
  boss_raider_astral:0.89,
  boss_chasseur_spectral:0.91,
  boss_cuirasse_nebulaire:0.93,
  boss_cuirasse_ambre:0.92,
  boss_cristal_du_neant:0.92
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
