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
      {skillPoints:3, priceType:"credits", price:350000, stats:{vitesse:5, cargo:6, loot:4, repairBotDelayReduction:1}, label:"+5 vitesse · +6 cargo · -1s drone réparation"},
      {skillPoints:4, priceType:"premium", price:250, stats:{vitesse:5, cargo:7, loot:4}, label:"+5 vitesse · +7 cargo · +4 % crédits"},
      {skillPoints:5, priceType:"credits", price:2000000, stats:{vitesse:6, cargo:7, loot:5, repairBotDelayReduction:1}, label:"+6 vitesse · +7 cargo · -1s drone réparation"}
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

