export const MAPS = [
  {
    id:0,
    name:"ASTRA-01",
    width:10000,
    height:8000,
    // Repère de carte : X gauche/droite, Y haut/bas. Le spawn est maintenant en bas à gauche.
    spawn:{x:-4300,y:3300,r:320,label:"ZONE DE SPAWN", safeRadius:320, decorRadius:430},
    portal:{x:4300,y:-3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:3300,label:"VERS ASTRA-02"},
    enemyCount:30,
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
    portals:[
      {x:-4300,y:3300,r:95,safeRadius:230,targetMap:0,targetX:4300,targetY:-3300,label:"VERS ASTRA-01"},
      {x:-4300,y:-3300,r:95,safeRadius:230,targetMap:2,targetX:-4300,targetY:3300,label:"VERS ASTRA-03"},
      {x:4300,y:3300,r:95,safeRadius:230,targetMap:3,targetX:-4300,targetY:3300,label:"VERS ASTRA-04"}
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
      {id:"drone_pirate", weight:.30},
      {id:"raider_astral", weight:.46},
      {id:"chasseur_spectral", weight:.24}
    ]
  },
  {
    id:2,
    name:"ASTRA-03",
    width:10000,
    height:8000,
    portal:{x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:-4300,targetY:-3300,label:"VERS ASTRA-02"},
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
    portal:{x:-4300,y:3300,r:95,safeRadius:230,targetMap:1,targetX:4300,targetY:3300,label:"VERS ASTRA-02"},
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
  }
];

export function getMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

export const ENEMY_TYPES = {
  drone_pirate:{
    name:"Orbe sentinelle",
    img:"assets/enemies/enemy_cyan_orb.png",
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
    levelRange:[4,6],
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
  cuirasse_ambre:0.92
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
