export const ships = [
  {
    id:"test_runner",
    name:"Test Runner",
    className:"Prototype de déplacement",
    img:"assets/ships/Orion.png",
    priceType:"credits",
    price:0,
    desc:"Un prototype hors normes construit pour les essais de déplacement et les configurations expérimentales.",
    stats:{vie:20000, vitesse:1500, cargo:5000, maxLasers:8, maxGenerators:10, maxExtras:5},
    special:null
  },
  {
    id:"orion",
    name:"Orion",
    className:"Chasseur polyvalent",
    img:"assets/ships/Orion.png",
    priceType:"credits",
    price:0,
    desc:"Un chasseur léger et équilibré, parfait pour apprendre à piloter et découvrir les premiers secteurs.",
    stats:{vie:5000, vitesse:300, cargo:250, maxLasers:1, maxGenerators:1, maxExtras:1},
    special:null
  },
  {
    id:"velox",
    name:"Velox",
    className:"Intercepteur rapide",
    img:"assets/ships/Velox.png",
    combatImg:"assets/ships/combat/Velox.png",
    priceType:"credits",
    price:35000,
    desc:"Rapide et maniable, le Velox est taillé pour les pilotes qui préfèrent esquiver plutôt qu'encaisser.",
    stats:{vie:15000, vitesse:330, cargo:500, maxLasers:3, maxGenerators:3, maxExtras:2},
    special:null
  },
  {
    id:"valkyrie",
    name:"Valkyrie",
    className:"Croiseur d'assaut",
    img:"assets/ships/Valkyrie.png",
    priceType:"credits",
    price:500000,
    desc:"Un croiseur d'assaut équilibré qui offre assez de puissance et de résistance pour affronter des secteurs plus hostiles.",
    stats:{vie:50000, vitesse:300, cargo:1000, maxLasers:6, maxGenerators:7, maxExtras:3},
    special:null
  },
  {
    id:"razorion",
    name:"Razorion",
    className:"Chasseur d'elite",
    img:"assets/ships/Razorion.png",
    priceType:"credits",
    price:2500000,
    desc:"Un chasseur d'élite doté d'une puissance de feu impressionnante, conçu pour dominer les combats rapides.",
    stats:{vie:35000, vitesse:330, cargo:700, maxLasers:8, maxGenerators:5, maxExtras:3},
    special:null
  },
  {
    id:"astra_3d_test",
    name:"Astra 3D Test",
    className:"Prototype faux 3D 2D",
    img:"assets/ships/Astra 3D Test.png",
    priceType:"credits",
    price:25000000,
    desc:"Un prototype avancé qui réunit vitesse, capacité d'emport et armement dans une coque particulièrement polyvalente.",
    stats:{vie:70000, vitesse:340, cargo:1500, maxLasers:10, maxGenerators:7, maxExtras:5},
    special:null
  },
  {
    id:"helion_titan",
    name:"Helion Titan",
    className:"Cuirasse lourde",
    img:"assets/ships/Helion Titan.png",
    priceType:"credits",
    price:10000000,
    desc:"Une cuirasse massive faite pour tenir la ligne, absorber les tirs ennemis et soutenir les affrontements les plus longs.",
    stats:{vie:80000, vitesse:270, cargo:1500, maxLasers:6, maxGenerators:10, maxExtras:5},
    special:null
  },
  {
    id:"vesperion",
    name:"Vesperion",
    className:"Prédateur vampirique",
    img:"assets/ships/Vesperion.png",
    combatImg:"assets/ships/combat/Vesperion.png",
    renderWidth:148,
    renderHeight:148,
    priceType:"premium",
    price:150000,
    desc:"Un prédateur lourd conçu autour d'un noyau de récupération énergétique. Son Tir absorbant reconvertit temporairement la moitié des dégâts réellement infligés en points de coque.",
    stats:{
      vie:230000,
      vitesse:310,
      cargo:2500,
      maxLasers:14,
      maxGenerators:14,
      maxExtras:8,
      maxRocketLaunchers:1,
      maxMissileLaunchers:1
    },
    requiresCompletedPortal:"violet",
    skillShip:true,
    abilityId:"absorbing_fire",
    special:"Tir absorbant · 50 % vol de vie · 20 s · recharge 180 s"
  }
];
