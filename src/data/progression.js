export const portals = [
  { id:"blue", name:"Portail Bleu", img:"assets/portals/portail_bleu.svg", level:"NIV. 1-10", requirement:{level:1}, piecesRequired:20, novaCost:30000, dropZones:["ASTRA-01","ASTRA-02"], dropChance:0.001, reward:"20 000 NOVA · 20 000 munitions x4 · 1 Laser MK-IV", open:false },
  { id:"violet", name:"Portail Violet", img:"assets/portals/portail_violet.svg", level:"NIV. 11-20", requirement:{level:8}, piecesRequired:35, novaCost:65000, dropZones:["Zone 11-20"], dropChance:0, reward:"Récompenses avancées", open:false },
  { id:"red", name:"Portail Rouge", img:"assets/portals/portail_rouge.svg", level:"NIV. 21-30", requirement:{level:16}, piecesRequired:50, novaCost:125000, dropZones:["Zone 21-30"], dropChance:0, reward:"Récompenses expertes", open:false },
  { id:"emerald", name:"Portail Émeraude", img:"assets/portals/portail_emeraude.svg", level:"NIV. 31-40", requirement:{level:24}, piecesRequired:70, novaCost:210000, dropZones:["Zone 31-40"], dropChance:0, reward:"Récompenses élites", open:false },
  { id:"void", name:"Portail du Néant", img:"assets/portals/portail_neant.svg", level:"NIV. 41-50", requirement:{level:34}, piecesRequired:95, novaCost:340000, dropZones:["Zone 41-50"], dropChance:0, reward:"Récompenses néant", open:false },
  { id:"ancient", name:"Portail Ancestral", img:"assets/portals/portail_ancestral.svg", level:"NIV. 51+", requirement:{level:45}, piecesRequired:140, novaCost:520000, dropZones:["Zone 51+"], dropChance:0, reward:"Récompenses mythiques", open:false }
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
  {id:"ferraille", name:"Ferraille spatiale", short:"FER", kind:"raw", img:"assets/materials/ferraille.svg", desc:"Débris métalliques récupérés dans les zones ouvertes."},
  {id:"cristal", name:"Cristal ionique", short:"CRI", kind:"raw", img:"assets/materials/cristal.svg", desc:"Cristaux énergétiques utiles au raffinage laser."},
  {id:"plasma", name:"Plasma instable", short:"PLA", kind:"raw", img:"assets/materials/plasma.svg", desc:"Matière volatile utilisée pour les améliorations de générateurs."},
  {id:"alliage", name:"Alliage focalisé", short:"ALY", kind:"refined", img:"assets/materials/alliage.svg", desc:"Matériau raffiné destiné à l'amélioration des lasers."},
  {id:"noyau", name:"Noyau énergétique", short:"NYO", kind:"refined", img:"assets/materials/noyau.svg", desc:"Matériau raffiné destiné à l'amélioration des générateurs."}
];

export const refineryRecipes = [
  {id:"refine_alliage", name:"Fusion Alliage focalisé", outputId:"alliage", outputAmount:1, durationMs:60_000, costs:{ferraille:12, cristal:6}, desc:"Transforme ferraille + cristal en un alliage pour lasers."},
  {id:"refine_noyau", name:"Condensation Noyau énergétique", outputId:"noyau", outputAmount:1, durationMs:90_000, costs:{plasma:8, cristal:4}, desc:"Transforme plasma + cristal en noyau pour générateurs."}
];

export const questCatalog = [
  {
    id:"quest_drone_cleanup",
    category:"normal",
    requiredLevel:1,
    title:"Nettoyage de drones",
    giver:"Relais de Commandement",
    desc:"Élimine 6 Drones pirates dans ASTRA-01 pour sécuriser le couloir de départ.",
    objective:{type:"kill", target:"drone_pirate", count:6, zone:"ASTRA-01"},
    rewards:{credits:9000, xp:420, materials:{ferraille:10, cristal:3}}
  },
  {
    id:"quest_raider_patrol",
    category:"normal",
    requiredLevel:3,
    title:"Patrouille astrale",
    giver:"Relais de Commandement",
    desc:"Intercepte 4 Raiders astraux autour du portail d'ASTRA-01.",
    objective:{type:"kill", target:"raider_astral", count:4, zone:"ASTRA-01"},
    rewards:{credits:13500, xp:650, materials:{ferraille:8, plasma:4}}
  },
  {
    id:"quest_spectral_scan",
    category:"normal",
    requiredLevel:8,
    title:"Balayage spectral",
    giver:"Relais de Commandement",
    desc:"Abats 5 Chasseurs spectraux dans ASTRA-02 pour calibrer les scanners.",
    objective:{type:"kill", target:"chasseur_spectral", count:5, zone:"ASTRA-02"},
    rewards:{credits:22000, xp:1200, materials:{cristal:6, plasma:6}}
  },
  {
    id:"quest_daily_cleanup",
    category:"daily",
    requiredLevel:4,
    title:"Prime journaliere",
    giver:"Relais de Commandement",
    desc:"Elimine 8 ennemis dans ASTRA-01 pour maintenir la route commerciale ouverte.",
    objective:{type:"kill", target:"drone_pirate", count:8, zone:"ASTRA-01"},
    rewards:{credits:18000, xp:900, materials:{ferraille:14, cristal:4}}
  },
  {
    id:"quest_weekly_assault",
    category:"weekly",
    requiredLevel:10,
    title:"Contrat hebdomadaire",
    giver:"Relais de Commandement",
    desc:"Neutralise une force spectrale dans ASTRA-02. Contrat lourd reserve aux pilotes prepares.",
    objective:{type:"kill", target:"chasseur_spectral", count:15, zone:"ASTRA-02"},
    rewards:{credits:85000, xp:4200, materials:{cristal:15, plasma:14}}
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

