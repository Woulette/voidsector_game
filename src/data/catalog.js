export const ships = [
  {
    id:"eclaireur",
    name:"Éclaireur",
    tier:"I",
    className:"Recon léger",
    img:"assets/ships/eclaireur.png",
    priceType:"credits",
    price:0,
    unlockLevel:1,
    stats:{vie:1500, vitesse:90, cargo:24, maxLasers:1, maxGenerators:1},
    special:null
  },
  {
    id:"intercepteur",
    name:"Intercepteur",
    tier:"II",
    className:"Chasseur d'assaut",
    img:"assets/ships/intercepteur.png",
    priceType:"credits",
    price:85000,
    unlockLevel:8,
    stats:{vie:2200, vitesse:112, cargo:32, maxLasers:2, maxGenerators:1},
    special:null
  },
  {
    id:"corsaire",
    name:"Corsaire",
    tier:"III",
    className:"Raider lourd",
    img:"assets/ships/corsaire.png",
    priceType:"credits",
    price:195000,
    unlockLevel:18,
    stats:{vie:3200, vitesse:98, cargo:42, maxLasers:3, maxGenerators:2},
    special:null
  },
  {
    id:"destroyer",
    name:"Destroyer",
    tier:"IV",
    className:"Croiseur de ligne",
    img:"assets/ships/destroyer.png",
    priceType:"credits",
    price:390000,
    unlockLevel:30,
    stats:{vie:4700, vitesse:74, cargo:58, maxLasers:4, maxGenerators:2},
    special:null
  }
];

export const equipment = [
  {
    id:"laser_mk1",
    name:"Canon Laser MK-I",
    short:"Laser I",
    category:"canon",
    slotType:"weapon",
    img:"assets/equipment/canon_laser.svg",
    rarity:"STANDARD",
    priceType:"credits",
    price:12500,
    unlockLevel:1,
    stats:{degats:"30-42", cadence:"1.00s", portee:600},
    weapon:{minDamage:30, maxDamage:42, cooldown:1.00, range:600, speed:900, color:"rgba(56,189,248,.95)", particle:"rgba(125,211,252,.85)"}
  },
  {
    id:"laser_mk2",
    name:"Canon Laser MK-II",
    short:"Laser II",
    category:"canon",
    slotType:"weapon",
    img:"assets/equipment/canon_plasma.svg",
    rarity:"RARE",
    priceType:"credits",
    price:68000,
    unlockLevel:10,
    stats:{degats:"50-65", cadence:"1.00s", portee:600},
    weapon:{minDamage:50, maxDamage:65, cooldown:1.00, range:600, speed:960, color:"rgba(250,204,21,.95)", particle:"rgba(253,224,71,.8)"}
  },
  {
    id:"laser_mk3",
    name:"Canon Laser MK-III",
    short:"Laser III",
    category:"canon",
    slotType:"weapon",
    img:"assets/equipment/railgun.svg",
    rarity:"ÉPIQUE",
    priceType:"credits",
    price:135000,
    unlockLevel:25,
    stats:{degats:"70-90", cadence:"1.00s", portee:650},
    weapon:{minDamage:70, maxDamage:90, cooldown:1.00, range:650, speed:1040, color:"rgba(168,85,247,.95)", particle:"rgba(216,180,254,.85)"}
  },
  {
    id:"laser_mk4",
    name:"Canon Laser MK-IV",
    short:"Laser IV",
    category:"canon",
    slotType:"weapon",
    img:"assets/equipment/railgun.svg",
    rarity:"LÉGENDAIRE",
    priceType:"premium",
    price:450,
    unlockLevel:30,
    stats:{degats:"130-150", cadence:"1.00s", portee:650},
    weapon:{minDamage:130, maxDamage:150, cooldown:1.00, range:650, speed:1120, color:"rgba(248,250,252,.98)", particle:"rgba(191,219,254,.90)"}
  },
  { id:"shield_gen", name:"Générateur Bouclier", short:"Générateur I", category:"generateur", slotType:"generator", img:"assets/equipment/generateur_bouclier.svg", rarity:"RARE", priceType:"credits", price:28000, unlockLevel:4, stats:{bouclier:220, regen:5}},
  { id:"shield_omega", name:"Générateur Oméga", short:"Générateur Ω", category:"generateur", slotType:"generator", img:"assets/equipment/generateur_bouclier.svg", rarity:"ÉPIQUE", priceType:"credits", price:112000, unlockLevel:18, stats:{bouclier:480, regen:12}},
  { id:"reactor_ion", name:"Générateur de Vitesse MK-II", short:"Vitesse II", category:"generateur", slotType:"generator", img:"assets/equipment/reacteur_ions.svg", rarity:"ÉPIQUE", priceType:"credits", price:72000, unlockLevel:14, stats:{vitesse:18}},
  { id:"engine_ion", name:"Générateur de Vitesse MK-I", short:"Vitesse I", category:"generateur", slotType:"generator", img:"assets/equipment/moteur_ions.svg", rarity:"RARE", priceType:"credits", price:35000, unlockLevel:9, stats:{vitesse:10}},
  { id:"extra_auto_rocket", name:"Lanceur Automatique", short:"Auto-R", category:"extra", slotType:"extra", img:"assets/equipment/pod_missiles.svg", rarity:"RARE", priceType:"credits", price:45000, unlockLevel:8, stats:{extra:"Roquettes auto"}, effect:{autoRocket:true}},
  { id:"extra_rocket_accelerator", name:"Accélérateur Roquettes", short:"Accél. R", category:"extra", slotType:"extra", img:"assets/equipment/reacteur_ions.svg", rarity:"ÉPIQUE", priceType:"credits", price:95000, unlockLevel:16, stats:{extra:"Cooldown roquette /2"}, effect:{rocketCooldownMultiplier:0.5}},
  { id:"extra_rocket_calibrator", name:"Calibrateur Explosif", short:"Cal. R", category:"extra", slotType:"extra", img:"assets/equipment/module_munitions.svg", rarity:"RARE", priceType:"credits", price:62000, unlockLevel:12, stats:{extra:"+15% dégâts roquettes"}, effect:{rocketDamageBonus:0.15}},
  { id:"extra_repair_bot", name:"Robot Réparateur", short:"Répa-Bot", category:"extra", slotType:"extra", img:"assets/equipment/bot_reparation.svg", rarity:"TACTIQUE", priceType:"credits", price:78000, unlockLevel:10, stats:{extra:"Répare 2% HP/s après 15s sans dégâts"}, effect:{repairBot:true, repairBotHealRate:0.02, repairBotDelay:15}},
  { id:"extra_repair_auto", name:"IA d’Auto-Réparation", short:"Auto-Répa", category:"extra", slotType:"extra", img:"assets/equipment/drone_combat.svg", rarity:"PREMIUM", priceType:"premium", price:120, unlockLevel:10, stats:{extra:"Active auto le Robot Réparateur"}, effect:{repairBotAuto:true}},
  { id:"ammo_module", name:"Module de Munitions", short:"Munitions", category:"module", slotType:"future", img:"assets/equipment/module_munitions.svg", rarity:"COMMUN", priceType:"credits", price:8000, unlockLevel:6, stats:{bonusDegats:6}}
];

export const droneCatalog = [
  {
    id:"combat_drone",
    name:"Drone de Combat",
    short:"Drone",
    category:"drone",
    img:"assets/equipment/drone_orbital.svg",
    rarity:"TACTIQUE",
    priceType:"credits",
    basePrice:200000,
    unlockLevel:12,
    maxOwned:8,
    slots:1,
    desc:"Drone orbital avec 1 emplacement. Il peut recevoir un laser ou un générateur. Un laser de drone consomme 1 munition laser supplémentaire par tir."
  }
];

export const ammoTypes = [
  {
    id:"ammo_x1",
    name:"Munition Type 1",
    short:"M-1",
    category:"munition",
    rarity:"STANDARD",
    priceType:"credits",
    price:1800,
    amount:1000,
    unlockLevel:0,
    weaponClass:"laser",
    multiplier:1,
    cooldown:1,
    color:"rgba(56,189,248,.96)",
    particle:"rgba(125,211,252,.82)",
    desc:"Munition de base pour les lasers. Multiplie par x1 la somme des dégâts des lasers équipés."
  },
  {
    id:"ammo_x2",
    name:"Munition Type 2",
    short:"M-2",
    category:"munition",
    rarity:"RENFORCÉE",
    priceType:"credits",
    price:5200,
    amount:1000,
    unlockLevel:10,
    weaponClass:"laser",
    multiplier:2,
    cooldown:1,
    color:"rgba(250,204,21,.96)",
    particle:"rgba(253,224,71,.78)",
    desc:"Munition renforcée pour lasers. Débloquée au niveau 10."
  },
  {
    id:"ammo_x4",
    name:"Munition Type 4",
    short:"M-4",
    category:"munition",
    rarity:"ANCIENNE",
    priceType:"premium",
    price:180,
    amount:20000,
    unlockLevel:30,
    weaponClass:"laser",
    multiplier:4,
    cooldown:1,
    color:"rgba(248,250,252,.98)",
    particle:"rgba(226,232,240,.86)",
    desc:"Munition rare de portail. Multiplie par x4 la somme des dégâts des lasers équipés."
  },
  {
    id:"rocket_r1",
    name:"Roquette R-1",
    short:"R-1",
    category:"munition",
    rarity:"EXPLOSIVE",
    priceType:"credits",
    price:8500,
    amount:40,
    unlockLevel:8,
    weaponClass:"rocket",
    damageMin:500,
    damageMax:1000,
    cooldown:5,
    range:800,
    speed:620,
    color:"rgba(239,68,68,.96)",
    particle:"rgba(252,165,165,.82)",
    desc:"Roquette légère : 1 roquette consommée par tir, cadence 5 secondes."
  },
  {
    id:"rocket_r2",
    name:"Roquette R-2",
    short:"R-2",
    category:"munition",
    rarity:"LOURDE",
    priceType:"credits",
    price:16500,
    amount:30,
    unlockLevel:18,
    weaponClass:"rocket",
    damageMin:950,
    damageMax:1500,
    cooldown:5,
    range:850,
    speed:600,
    color:"rgba(251,146,60,.96)",
    particle:"rgba(253,186,116,.82)",
    desc:"Roquette lourde pour les cibles résistantes."
  },
  {
    id:"rocket_r3",
    name:"Roquette R-3",
    short:"R-3",
    category:"munition",
    rarity:"SIÈGE",
    priceType:"credits",
    price:28500,
    amount:24,
    unlockLevel:30,
    weaponClass:"rocket",
    damageMin:1500,
    damageMax:2400,
    cooldown:5,
    range:900,
    speed:580,
    color:"rgba(168,85,247,.96)",
    particle:"rgba(216,180,254,.82)",
    desc:"Roquette de siège à fort impact."
  }
];

export const portals = [
  { id:"blue", name:"Portail Bleu", img:"assets/portals/portail_bleu.svg", level:"NIV. 1-10", requirement:{level:1,power:0}, piecesRequired:20, novaCost:30000, dropZones:["ASTRA-01","ASTRA-02"], dropChance:0.001, reward:"20 000 NOVA · 20 000 munitions x4 · 1 Laser MK-IV", open:false },
  { id:"violet", name:"Portail Violet", img:"assets/portals/portail_violet.svg", level:"NIV. 11-20", requirement:{level:8,power:650}, piecesRequired:35, novaCost:65000, dropZones:["Zone 11-20"], dropChance:0, reward:"Récompenses avancées", open:false },
  { id:"red", name:"Portail Rouge", img:"assets/portals/portail_rouge.svg", level:"NIV. 21-30", requirement:{level:16,power:1100}, piecesRequired:50, novaCost:125000, dropZones:["Zone 21-30"], dropChance:0, reward:"Récompenses expertes", open:false },
  { id:"emerald", name:"Portail Émeraude", img:"assets/portals/portail_emeraude.svg", level:"NIV. 31-40", requirement:{level:24,power:1650}, piecesRequired:70, novaCost:210000, dropZones:["Zone 31-40"], dropChance:0, reward:"Récompenses élites", open:false },
  { id:"void", name:"Portail du Néant", img:"assets/portals/portail_neant.svg", level:"NIV. 41-50", requirement:{level:34,power:2350}, piecesRequired:95, novaCost:340000, dropZones:["Zone 41-50"], dropChance:0, reward:"Récompenses néant", open:false },
  { id:"ancient", name:"Portail Ancestral", img:"assets/portals/portail_ancestral.svg", level:"NIV. 51+", requirement:{level:45,power:3100}, piecesRequired:140, novaCost:520000, dropZones:["Zone 51+"], dropChance:0, reward:"Récompenses mythiques", open:false }
];

export const skills = [
  {
    id:"damage",
    name:"Branche Dégâts",
    short:"Dégâts",
    icon:"⚔",
    theme:"offense",
    desc:"Optimise les systèmes offensifs du vaisseau. Chaque niveau augmente les dégâts des lasers de 2 %.",
    maxLevel:5,
    levels:[
      {skillPoints:1, priceType:"credits", price:10000, stats:{weaponDamagePercent:0.02}, label:"+2 % dégâts laser"},
      {skillPoints:2, priceType:"credits", price:75000, stats:{weaponDamagePercent:0.02}, label:"+2 % dégâts laser"},
      {skillPoints:3, priceType:"credits", price:350000, stats:{weaponDamagePercent:0.02}, label:"+2 % dégâts laser"},
      {skillPoints:4, priceType:"premium", price:250, stats:{weaponDamagePercent:0.02}, label:"+2 % dégâts laser"},
      {skillPoints:5, priceType:"credits", price:2000000, stats:{weaponDamagePercent:0.02}, label:"+2 % dégâts laser"}
    ]
  },
  {
    id:"shield",
    name:"Branche Bouclier",
    short:"Bouclier",
    icon:"⬢",
    theme:"defense",
    desc:"Renforce la survie du vaisseau. Chaque niveau donne +5 % d’absorption au bouclier et un bonus de capacité.",
    maxLevel:5,
    levels:[
      {skillPoints:1, priceType:"credits", price:10000, stats:{shieldAbsorbBonus:0.05, shieldBonus:30}, label:"+5 % absorption · +30 bouclier"},
      {skillPoints:2, priceType:"credits", price:75000, stats:{shieldAbsorbBonus:0.05, shieldBonus:35}, label:"+5 % absorption · +35 bouclier"},
      {skillPoints:3, priceType:"credits", price:350000, stats:{shieldAbsorbBonus:0.05, shieldBonus:40}, label:"+5 % absorption · +40 bouclier"},
      {skillPoints:4, priceType:"premium", price:250, stats:{shieldAbsorbBonus:0.05, shieldBonus:45, regen:1}, label:"+5 % absorption · +45 bouclier"},
      {skillPoints:5, priceType:"credits", price:2000000, stats:{shieldAbsorbBonus:0.05, shieldBonus:50, regen:1}, label:"+5 % absorption · +50 bouclier"}
    ]
  },
  {
    id:"utility",
    name:"Branche Utilitaire",
    short:"Utilitaire",
    icon:"✦",
    theme:"utility",
    desc:"Développe les fonctions de soutien : mobilité, soute et logistique de combat.",
    maxLevel:5,
    levels:[
      {skillPoints:1, priceType:"credits", price:10000, stats:{vitesse:4, cargo:5, loot:3}, label:"+4 vitesse · +5 cargo · +3 % crédits"},
      {skillPoints:2, priceType:"credits", price:75000, stats:{vitesse:4, cargo:5, loot:3}, label:"+4 vitesse · +5 cargo · +3 % crédits"},
      {skillPoints:3, priceType:"credits", price:350000, stats:{vitesse:5, cargo:6, loot:4, repairBotDelayReduction:1}, label:"+5 vitesse · +6 cargo · -1s robot"},
      {skillPoints:4, priceType:"premium", price:250, stats:{vitesse:5, cargo:7, loot:4}, label:"+5 vitesse · +7 cargo · +4 % crédits"},
      {skillPoints:5, priceType:"credits", price:2000000, stats:{vitesse:6, cargo:7, loot:5, repairBotDelayReduction:1}, label:"+6 vitesse · +7 cargo · -1s robot"}
    ]
  }
];

export const rawMaterialCatalog = [
  {id:"ferraille", name:"Ferraille spatiale", short:"FER", kind:"raw", desc:"Débris métalliques récupérés dans les zones ouvertes."},
  {id:"cristal", name:"Cristal ionique", short:"CRI", kind:"raw", desc:"Cristaux énergétiques utiles au raffinage laser."},
  {id:"plasma", name:"Plasma instable", short:"PLA", kind:"raw", desc:"Matière volatile utilisée pour les améliorations de générateurs."},
  {id:"alliage", name:"Alliage focalisé", short:"ALY", kind:"refined", desc:"Matériau raffiné destiné à l’amélioration des lasers."},
  {id:"noyau", name:"Noyau énergétique", short:"NYO", kind:"refined", desc:"Matériau raffiné destiné à l’amélioration des générateurs."}
];

export const refineryRecipes = [
  {id:"refine_alliage", name:"Fusion Alliage focalisé", outputId:"alliage", outputAmount:1, durationMs:60_000, costs:{ferraille:12, cristal:6}, desc:"Transforme ferraille + cristal en un alliage pour lasers."},
  {id:"refine_noyau", name:"Condensation Noyau énergétique", outputId:"noyau", outputAmount:1, durationMs:90_000, costs:{plasma:8, cristal:4}, desc:"Transforme plasma + cristal en noyau pour générateurs."}
];

export const questCatalog = [
  {
    id:"quest_drone_cleanup",
    title:"Nettoyage de drones",
    giver:"Relais de Commandement",
    desc:"Élimine 6 Drones pirates dans ASTRA-01 pour sécuriser le couloir de départ.",
    objective:{type:"kill", target:"drone_pirate", count:6, zone:"ASTRA-01"},
    rewards:{credits:9000, xp:420, materials:{ferraille:10, cristal:3}}
  },
  {
    id:"quest_raider_patrol",
    title:"Patrouille astrale",
    giver:"Relais de Commandement",
    desc:"Intercepte 4 Raiders astraux autour du portail d’ASTRA-01.",
    objective:{type:"kill", target:"raider_astral", count:4, zone:"ASTRA-01"},
    rewards:{credits:13500, xp:650, materials:{ferraille:8, plasma:4}}
  },
  {
    id:"quest_spectral_scan",
    title:"Balayage spectral",
    giver:"Relais de Commandement",
    desc:"Abats 5 Chasseurs spectraux dans ASTRA-02 pour calibrer les scanners.",
    objective:{type:"kill", target:"chasseur_spectral", count:5, zone:"ASTRA-02"},
    rewards:{credits:22000, xp:1200, materials:{cristal:6, plasma:6}}
  }
];

export const pageText = {
  hangar:{title:"HANGAR", subtitle:"Configure ton vaisseau, tes drones et tes extras."},
  shop:{title:"MAGASIN", subtitle:"Progression par niveau : vaisseaux, lasers, roquettes, générateurs et drones."},
  portals:{title:"PORTAILS DIMENSIONNELS", subtitle:"Déverrouille les portails avec des pièces ou des NOVA, puis affronte 30 vagues."},
  skills:{title:"COMPÉTENCES", subtitle:"Investis tes points pour spécialiser ton pilote."},
  settings:{title:"PARAMÈTRES", subtitle:"Personnalise tes touches de slots."},
  leaderboard:{title:"CLASSEMENT", subtitle:"Classement local préparé pour le futur MMO : grades, points et règles de progression."}
};

export const defaultState = {
  player:{name:"NOVA-37", level:1, xp:0, xpNext:100, credits:85000, premium:20, skillPoints:3, totalXp:0, totalKills:0, rankScore:0},
  activeShip:"eclaireur",
  selectedShip:"eclaireur",
  ownedShips:["eclaireur"],
  ownedItems:["laser_mk1"],
  inventoryItems:[{uid:"inv_laser_mk1_1", itemId:"laser_mk1"}],
  nextInventoryUid:2,
  shipLoadouts:{eclaireur:{lasers:["inv_laser_mk1_1"], generators:[], extras:[]}},
  droneLoadout:[],
  ownedDroneCount:0,
  ammoInventory:{ammo_x1:2500},
  actionSlots:["ammo_x1", null, null, null, null, null, null, null, null],
  slotKeybinds:["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9"],
  portalPieces:{blue:0,violet:0,red:0,emerald:0,void:0,ancient:0},
  unlockedPortals:[],
  completedPortals:{},
  unlockedSkills:[],
  skillLevels:{damage:0, shield:0, utility:0},
  cargoHold:{ferraille:0, cristal:0, plasma:0, alliage:0, noyau:0},
  refineryJob:null,
  equipmentUpgrades:{},
  activeQuestId:null,
  questProgress:{},
  completedQuestClaims:{}
};
