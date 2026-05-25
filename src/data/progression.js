export const portals = [
  { id:"blue", name:"Portail Bleu", img:"assets/portals/portail_bleu.svg", level:"NIV. 10+", requirement:{level:10}, piecesRequired:20, novaCost:30000, dropZones:["ASTRA-01","ASTRA-02","ASTRA-03"], dropChance:0.001, reward:"20 000 NOVA · 20 000 munitions x4 · Laser MK-IV garanti puis 50%", open:false },
  { id:"violet", name:"Portail Violet", img:"assets/portals/portail_violet.svg", level:"NIV. 15+", requirement:{level:15}, piecesRequired:35, novaCost:65000, dropZones:["ASTRA-03","ASTRA-04","ASTRA-05"], dropChance:0.001, reward:"35 000 NOVA · 35 000 munitions x4 · Accès vaisseaux à compétence", open:false },
  { id:"red", name:"Portail Rouge", img:"assets/portals/portail_rouge.svg", level:"NIV. 20+", requirement:{level:20}, piecesRequired:50, novaCost:125000, dropZones:["Zone 21-30"], dropChance:0, reward:"50 000 NOVA · 50 000 munitions x4 · 50% Noyau Overdrive Drone", open:false },
  { id:"emerald", name:"Portail Émeraude", img:"assets/portals/portail_emeraude.svg", level:"NIV. 30+", requirement:{level:30}, piecesRequired:70, novaCost:210000, dropZones:["Zone 31-40"], dropChance:0, reward:"50 000 NOVA · 25 000 munitions x4 · 33% Laser MK-IV · Accès améliorations", open:false },
  { id:"void", name:"Portail du Néant", img:"assets/portals/portail_neant.svg", level:"NIV. 35+", requirement:{level:35}, piecesRequired:95, novaCost:340000, dropZones:["Zone 41-50"], dropChance:0, reward:"60 000 NOVA · 30 000 munitions x4 · 33% Laser MK-IV · 33% Noyau Overdrive · Accès recettes", open:false },
  { id:"ancient", name:"Portail Ancestral", img:"assets/portals/portail_ancestral.svg", level:"NIV. 40+", requirement:{level:40}, piecesRequired:140, novaCost:520000, dropZones:["Zone 51+"], dropChance:0, reward:"100 000 NOVA · 10 000 munitions x6 · Drone ancestral garanti puis 50% · Accès prestige", open:false }
];

export const skills = [
  {
    id:"damage",
    name:"Branche Dégâts",
    short:"Dégâts",
    icon:"⚔",
    theme:"offense",
    desc:"Optimise les systèmes offensifs du vaisseau. Chaque compétence possède plusieurs rangs avant d'ouvrir la suivante.",
    maxLevel:5,
    levels:[
      {name:"Calibrage laser", ranks:[
        {skillPoints:1, priceType:"credits", price:10000, stats:{weaponDamageMultiplier:1.02}, label:"+2 % dégâts laser"},
        {skillPoints:1, priceType:"credits", price:500000, stats:{weaponDamageMultiplier:1.04}, label:"+4 % dégâts laser"},
        {skillPoints:1, costs:{premium:1000, materials:{alliage_cuivre_zinc:500, plaque_nickel_titane:500}}, stats:{weaponDamageMultiplier:1.06}, label:"+6 % dégâts laser"}
      ]},
      {name:"Surcharge stable", ranks:[
        {skillPoints:1, costs:{credits:1000000, materials:{alliage_cuivre_zinc:1000, plaque_nickel_titane:1000}}, stats:{rocketDamageMultiplier:1.02}, label:"+2 % dégâts roquette"},
        {skillPoints:1, costs:{credits:2000000, materials:{alliage_cuivre_zinc:2500, plaque_nickel_titane:2500}}, stats:{rocketDamageMultiplier:1.04}, label:"+4 % dégâts roquette"},
        {skillPoints:1, costs:{premium:5000, materials:{catalyseur_quantique:5000}}, stats:{rocketDamageMultiplier:1.06}, label:"+6 % dégâts roquette"}
      ]},
      {name:"Noyau offensif", ranks:[
        {skillPoints:1, costs:{credits:5000000, materials:{conducteur_renforce:2500, blindage_composite:2500}}, stats:{missileDamageMultiplier:1.02}, label:"+2 % dégâts missile"},
        {skillPoints:1, costs:{credits:10000000, materials:{conducteur_renforce:5000, blindage_composite:5000}}, stats:{missileDamageMultiplier:1.04}, label:"+4 % dégâts missile"},
        {skillPoints:1, costs:{premium:10000, materials:{conducteur_renforce:10000, blindage_composite:10000}}, stats:{missileDamageMultiplier:1.06}, label:"+6 % dégâts missile"}
      ]},
      {name:"Cadence roquettes", ranks:[
        {skillPoints:1, costs:{credits:25000000, materials:{noyau_astra:100}}, stats:{rocketCooldownMultiplier:0.95}, label:"-5 % délai roquette"},
        {skillPoints:1, costs:{credits:50000000, materials:{noyau_astra:200}}, stats:{rocketCooldownMultiplier:0.90}, label:"-10 % délai roquette"},
        {skillPoints:1, costs:{premium:25000, materials:{noyau_astra:500}}, stats:{rocketCooldownMultiplier:0.85}, label:"-15 % délai roquette"}
      ]},
      {name:"Calibrage laser II", ranks:[
        {skillPoints:1, costs:{credits:250000000, materials:{noyau_astra:1000}}, stats:{weaponDamageMultiplier:1.0188679245}, label:"+8 % dégâts laser"},
        {skillPoints:1, costs:{credits:500000000, materials:{noyau_astra:2000}}, stats:{weaponDamageMultiplier:1.0377358491}, label:"+10 % dégâts laser"},
        {skillPoints:1, costs:{premium:70000, materials:{noyau_astra:5000}}, stats:{weaponDamageMultiplier:1.0849056604, blueLaserBeams:1}, label:"+15 % dégâts laser · lasers bleus"}
      ]}
    ]
  },
  {
    id:"shield",
    name:"Branche Bouclier",
    short:"Bouclier",
    icon:"⬢",
    theme:"defense",
    desc:"Renforce la survie du vaisseau. Chaque compétence possède plusieurs rangs avant d'ouvrir la suivante.",
    maxLevel:5,
    levels:[
      {name:"Trame bouclier", ranks:[
        {skillPoints:1, priceType:"credits", price:10000, stats:{shieldMultiplier:1.02}, label:"+2 % bouclier"},
        {skillPoints:1, priceType:"credits", price:500000, stats:{shieldMultiplier:1.04}, label:"+4 % bouclier"},
        {skillPoints:1, costs:{premium:1000, materials:{alliage_cuivre_zinc:500, plaque_nickel_titane:500}}, stats:{shieldMultiplier:1.06}, label:"+6 % bouclier"}
      ]},
      {name:"Condensateurs", ranks:[
        {skillPoints:1, costs:{credits:1000000, materials:{alliage_cuivre_zinc:1000, plaque_nickel_titane:1000}}, stats:{evasionChance:0.02}, label:"+2 % esquive"},
        {skillPoints:1, costs:{credits:2000000, materials:{alliage_cuivre_zinc:2500, plaque_nickel_titane:2500}}, stats:{evasionChance:0.04}, label:"+4 % esquive"},
        {skillPoints:1, costs:{premium:5000, materials:{catalyseur_quantique:5000}}, stats:{evasionChance:0.06}, label:"+6 % esquive"}
      ]},
      {name:"Blindage actif", ranks:[
        {skillPoints:1, costs:{credits:5000000, materials:{conducteur_renforce:2500, blindage_composite:2500}}, stats:{shieldAbsorbBonus:0.02}, label:"+2 % absorption bouclier"},
        {skillPoints:1, costs:{credits:10000000, materials:{conducteur_renforce:5000, blindage_composite:5000}}, stats:{shieldAbsorbBonus:0.04}, label:"+4 % absorption bouclier"},
        {skillPoints:1, costs:{premium:10000, materials:{conducteur_renforce:10000, blindage_composite:10000}}, stats:{shieldAbsorbBonus:0.06}, label:"+6 % absorption bouclier"}
      ]},
      {name:"Régénération", ranks:[
        {skillPoints:1, costs:{credits:25000000, materials:{noyau_astra:100}}, stats:{regenMultiplier:1.02}, label:"+2 % régénération bouclier"},
        {skillPoints:1, costs:{credits:50000000, materials:{noyau_astra:200}}, stats:{regenMultiplier:1.04}, label:"+4 % régénération bouclier"},
        {skillPoints:1, costs:{premium:25000, materials:{noyau_astra:500}}, stats:{regenMultiplier:1.06}, label:"+6 % régénération bouclier"}
      ]},
      {name:"Renfort de coque", ranks:[
        {skillPoints:1, costs:{credits:250000000, materials:{noyau_astra:1000}}, stats:{hullMultiplier:1.02}, label:"+2 % vie du vaisseau"},
        {skillPoints:1, costs:{credits:500000000, materials:{noyau_astra:2000}}, stats:{hullMultiplier:1.04}, label:"+4 % vie du vaisseau"},
        {skillPoints:1, costs:{premium:70000, materials:{noyau_astra:5000}}, stats:{hullMultiplier:1.10}, label:"+10 % vie du vaisseau"}
      ]}
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
      {name:"Propulseurs", ranks:[
        {skillPoints:1, priceType:"credits", price:10000, stats:{speedMultiplier:1.02}, label:"+2 % vitesse"},
        {skillPoints:1, priceType:"credits", price:500000, stats:{speedMultiplier:1.04}, label:"+4 % vitesse"},
        {skillPoints:1, costs:{premium:1000, materials:{alliage_cuivre_zinc:500, plaque_nickel_titane:500}}, stats:{speedMultiplier:1.06}, label:"+6 % vitesse"}
      ]},
      {name:"Soute optimisée", ranks:[
        {skillPoints:1, costs:{credits:1000000, materials:{alliage_cuivre_zinc:1000, plaque_nickel_titane:1000}}, stats:{lootMultiplier:1.02}, label:"+2 % crédits"},
        {skillPoints:1, costs:{credits:2000000, materials:{alliage_cuivre_zinc:2500, plaque_nickel_titane:2500}}, stats:{lootMultiplier:1.04}, label:"+4 % crédits"},
        {skillPoints:1, costs:{premium:5000, materials:{catalyseur_quantique:5000}}, stats:{lootMultiplier:1.06}, label:"+6 % crédits"}
      ]},
      {name:"Drone soutien", ranks:[
        {skillPoints:1, costs:{credits:5000000, materials:{conducteur_renforce:2500, blindage_composite:2500}}, stats:{cargoMultiplier:1.04}, label:"+4 % taille de soute"},
        {skillPoints:1, costs:{credits:10000000, materials:{conducteur_renforce:5000, blindage_composite:5000}}, stats:{cargoMultiplier:1.08}, label:"+8 % taille de soute"},
        {skillPoints:1, costs:{premium:10000, materials:{conducteur_renforce:10000, blindage_composite:10000}}, stats:{cargoMultiplier:1.12}, label:"+12 % taille de soute"}
      ]},
      {name:"Drone réparation", ranks:[
        {skillPoints:1, costs:{credits:25000000, materials:{noyau_astra:100}}, stats:{repairBotHealMultiplier:1.05}, label:"+5 % soin drone"},
        {skillPoints:1, costs:{credits:50000000, materials:{noyau_astra:200}}, stats:{repairBotHealMultiplier:1.10}, label:"+10 % soin drone"},
        {skillPoints:1, costs:{premium:25000, materials:{noyau_astra:500}}, stats:{repairBotHealMultiplier:1.15}, label:"+15 % soin drone"}
      ]},
      {name:"Protocoles NOVA", ranks:[
        {skillPoints:1, costs:{credits:250000000, materials:{noyau_astra:1000}}, stats:{novaMultiplier:1.02}, label:"+2 % NOVA"},
        {skillPoints:1, costs:{credits:500000000, materials:{noyau_astra:2000}}, stats:{novaMultiplier:1.04}, label:"+4 % NOVA"},
        {skillPoints:1, costs:{premium:70000, materials:{noyau_astra:5000}}, stats:{novaMultiplier:1.10}, label:"+10 % NOVA"}
      ]}
    ]
  }
];

export const rawMaterialCatalog = [
  {id:"cuivre_orbital", name:"Cuivre", short:"CUI", kind:"raw", tier:1, img:"assets/materials/cuivre_orbital.svg", desc:"Métal conducteur extrait des débris orbitaux.", maxLevel:20},
  {id:"zinc_spatial", name:"Zinc", short:"ZNC", kind:"raw", tier:1, img:"assets/materials/zinc_spatial.svg", desc:"Minerai léger utilisé pour stabiliser les alliages.", maxLevel:20},
  {id:"nickel_brut", name:"Nickel", short:"NIC", kind:"raw", tier:1, img:"assets/materials/nickel_brut.svg", desc:"Minerai dense récupéré sur les coques ennemies.", maxLevel:20},
  {id:"titane_fissure", name:"Titane", short:"TIT", kind:"raw", tier:1, img:"assets/materials/titane_fissure.svg", desc:"Titane instable destiné aux plaques de protection.", maxLevel:20},
  {id:"silice_conductrice", name:"Silice", short:"SIL", kind:"raw", tier:1, img:"assets/materials/silice_conductrice.svg", desc:"Cristal industriel employé dans les circuits de raffinerie.", maxLevel:20},
  {id:"alliage_cuivre_zinc", name:"Alliage", short:"ACZ", kind:"refined", tier:2, img:"assets/materials/alliage_cuivre_zinc.svg", desc:"Alliage de base pour les systèmes conducteurs.", maxLevel:20},
  {id:"plaque_nickel_titane", name:"Plaque", short:"PNT", kind:"refined", tier:2, img:"assets/materials/plaque_nickel_titane.svg", desc:"Plaque renforcée pour les structures et blindages.", maxLevel:20},
  {id:"conducteur_renforce", name:"Conducteur", short:"CDR", kind:"advanced", tier:3, img:"assets/materials/conducteur_renforce.svg", desc:"Composant avancé pour les armes et circuits de puissance.", maxLevel:20},
  {id:"blindage_composite", name:"Blindage", short:"BLC", kind:"advanced", tier:3, img:"assets/materials/blindage_composite.svg", desc:"Composant avancé pour renforcer la coque et les modules.", maxLevel:20},
  {id:"catalyseur_quantique", name:"Catalyseur", short:"CAT", kind:"special", tier:4, img:"assets/materials/catalyseur_quantique.svg", desc:"Catalyseur de transition fabriqué avec minerais lourds et zinc stabilisé.", maxLevel:20},
  {id:"noyau_astra", name:"Noyau", short:"AST", kind:"final", tier:5, img:"assets/materials/noyau_astra.svg", desc:"Matériau final destiné aux grosses améliorations de vaisseau.", maxLevel:20}
];

export const refineryRecipes = [
  {id:"refine_cuivre_zinc", name:"Fusion cuivre-zinc", outputId:"alliage_cuivre_zinc", outputAmount:1, durationMs:60_000, costs:{cuivre_orbital:10, zinc_spatial:10}, desc:"Fusionne cuivre orbital et zinc spatial en alliage conducteur."},
  {id:"refine_nickel_titane", name:"Forge plaque", outputId:"plaque_nickel_titane", outputAmount:1, durationMs:75_000, costs:{titane_fissure:10, silice_conductrice:10}, desc:"Compresse titane et silice en plaque renforcée."},
  {id:"refine_catalyseur", name:"Synthese catalyseur", outputId:"catalyseur_quantique", outputAmount:1, durationMs:90_000, costs:{zinc_spatial:10, nickel_brut:10, titane_fissure:10}, desc:"Stabilise zinc, nickel et titane en catalyseur."},
  {id:"refine_conducteur", name:"Assemblage conducteur renforcé", outputId:"conducteur_renforce", outputAmount:1, durationMs:120_000, costs:{alliage_cuivre_zinc:10, catalyseur_quantique:5}, desc:"Combine alliage et catalyseur en composant conducteur avancé."},
  {id:"refine_blindage", name:"Assemblage blindage composite", outputId:"blindage_composite", outputAmount:1, durationMs:120_000, costs:{plaque_nickel_titane:10, catalyseur_quantique:5}, desc:"Renforce les plaques avec un catalyseur quantique."},
  {id:"refine_noyau_astra", name:"Stabilisation Noyau d'Astra", outputId:"noyau_astra", outputAmount:1, durationMs:240_000, costs:{catalyseur_quantique:10, conducteur_renforce:10, blindage_composite:10}, desc:"Stabilise les composants avancés avec un catalyseur spécial."}
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
    rewards:{credits:9000, xp:420, materials:{cuivre_orbital:10, zinc_spatial:3}}
  },
  {
    id:"quest_raider_patrol",
    category:"normal",
    requiredLevel:3,
    title:"Patrouille astrale",
    giver:"Relais de Commandement",
    desc:"Intercepte 4 Raiders astraux autour du portail d'ASTRA-01.",
    objective:{type:"kill", target:"raider_astral", count:4, zone:"ASTRA-01"},
    rewards:{credits:13500, xp:650, materials:{nickel_brut:8, titane_fissure:4}}
  },
  {
    id:"quest_spectral_scan",
    category:"normal",
    requiredLevel:8,
    title:"Balayage spectral",
    giver:"Relais de Commandement",
    desc:"Abats 5 Chasseurs spectraux dans ASTRA-02 pour calibrer les scanners.",
    objective:{type:"kill", target:"chasseur_spectral", count:5, zone:"ASTRA-02"},
    rewards:{credits:22000, xp:1200, materials:{silice_conductrice:8, catalyseur_quantique:1}}
  },
  {
    id:"quest_daily_cleanup",
    category:"daily",
    requiredLevel:4,
    title:"Prime journaliere",
    giver:"Relais de Commandement",
    desc:"Elimine 8 ennemis dans ASTRA-01 pour maintenir la route commerciale ouverte.",
    objective:{type:"kill", target:"drone_pirate", count:8, zone:"ASTRA-01"},
    rewards:{credits:18000, xp:900, materials:{cuivre_orbital:14, zinc_spatial:4}}
  },
  {
    id:"quest_weekly_assault",
    category:"weekly",
    requiredLevel:10,
    title:"Contrat hebdomadaire",
    giver:"Relais de Commandement",
    desc:"Neutralise une force spectrale dans ASTRA-02. Contrat lourd reserve aux pilotes prepares.",
    objective:{type:"kill", target:"chasseur_spectral", count:15, zone:"ASTRA-02"},
    rewards:{credits:85000, xp:4200, materials:{silice_conductrice:18, catalyseur_quantique:2}}
  }
];

export const pageText = {
  hangar:{title:"HANGAR", subtitle:"Configure ton vaisseau, tes drones et tes extras."},
  shop:{title:"MAGASIN", subtitle:"Progression par niveau : vaisseaux, lasers, roquettes, générateurs et drones."},
  portals:{title:"PORTAILS DIMENSIONNELS", subtitle:"Déverrouille les portails avec des pièces ou des NOVA, puis affronte 30 vagues."},
  refinery:{title:"RAFFINERIE", subtitle:"Transforme tes matériaux bruts en ressources avancées pour améliorer ton équipement."},
  settings:{title:"PARAMÈTRES", subtitle:"Personnalise tes touches de slots."},
  leaderboard:{title:"CLASSEMENT", subtitle:"Classement local préparé pour le futur MMO : grades, points et règles de progression."}
};

