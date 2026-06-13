export const COMMON_CRAFT_RESOURCES = [
  {
    id:"cables_cuivre",
    name:"Câbles de cuivre",
    short:"CCU",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/copper_cables.webp",
    dropImg:"assets/resources/common/copper_cables_drop.webp",
    desc:"Câblage conducteur pour les systèmes électriques légers.",
    maxLevel:20
  },
  {
    id:"plaques_acier",
    name:"Plaques d'acier",
    short:"PAC",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/steel_plates.webp",
    dropImg:"assets/resources/common/steel_plates_drop.webp",
    desc:"Plaques structurelles utilisées dans les coques et modules.",
    maxLevel:20
  },
  {
    id:"polymere_isolant",
    name:"Polymère isolant",
    short:"POL",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/insulating_polymer.webp",
    dropImg:"assets/resources/common/insulating_polymer_drop.webp",
    desc:"Polymère protecteur pour câbles, cellules et munitions.",
    maxLevel:20
  },
  {
    id:"circuits_imprimes",
    name:"Circuits imprimés",
    short:"CIR",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/printed_circuits.webp",
    dropImg:"assets/resources/common/printed_circuits_drop.webp",
    desc:"Cartes électroniques destinées aux systèmes embarqués.",
    maxLevel:20
  },
  {
    id:"condensateurs_ceramiques",
    name:"Condensateurs céramiques",
    short:"CDC",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/ceramic_capacitors.webp",
    dropImg:"assets/resources/common/ceramic_capacitors_drop.webp",
    desc:"Composants de stockage pour générateurs et lasers.",
    maxLevel:20
  },
  {
    id:"lentilles_optiques",
    name:"Lentilles optiques",
    short:"LPO",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/optical_lenses.webp",
    dropImg:"assets/resources/common/optical_lenses_drop.webp",
    desc:"Lentilles de focalisation utilisées dans les lasers.",
    maxLevel:20
  },
  {
    id:"poudre_propulsive",
    name:"Poudre propulsive",
    short:"PDP",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/propellant_powder.webp",
    dropImg:"assets/resources/common/propellant_powder_drop.webp",
    desc:"Charge propulsive pour munitions, missiles et roquettes.",
    maxLevel:20
  },
  {
    id:"reservoirs_pressurises",
    name:"Réservoirs pressurisés",
    short:"RPR",
    kind:"raw",
    rarity:"common",
    tier:1,
    img:"assets/resources/common/pressurized_tanks.webp",
    dropImg:"assets/resources/common/pressurized_tanks_drop.webp",
    desc:"Réservoirs compacts pour carburant et systèmes auxiliaires.",
    maxLevel:20
  }
];

function craftResource(id, name, short, rarity, tier, desc){
  return {
    id,
    name,
    short,
    kind:"raw",
    rarity,
    tier,
    img:`assets/resources/${rarity}/${id}.webp`,
    dropImg:`assets/resources/${rarity}/${id}_drop.webp`,
    desc,
    maxLevel:20
  };
}

export const RARE_CRAFT_RESOURCES = [
  craftResource("bobine_supraconductrice", "Bobine supraconductrice", "BSU", "rare", 2, "Bobine de câble supraconducteur pour lasers MK-III et circuits de puissance."),
  craftResource("lentille_focalisation_dopee", "Lentille de focalisation dopée", "LFD", "rare", 2, "Bloc optique dopé pour concentrer les faisceaux haute énergie."),
  craftResource("micro_pompe_cryogenique", "Micro-pompe cryogénique", "MPC", "rare", 2, "Pompe miniature utilisée pour refroidir lasers, générateurs et réacteurs légers."),
  craftResource("connecteur_optique_blinde", "Connecteur optique blindé", "COB", "rare", 2, "Connecteur de précision pour liaisons optiques et systèmes de ciblage."),
  craftResource("gyroscope_stabilise", "Gyroscope stabilisé", "GYS", "rare", 2, "Capteur inertiel compact pour drones, roquettes et systèmes de pilotage."),
  craftResource("panneau_titane_nid_abeille", "Panneau titane nid-d'abeille", "PTA", "rare", 2, "Échantillon structurel léger pour coques et supports renforcés."),
  craftResource("cartouche_aerogel_cryogenique", "Cartouche d'aérogel cryogénique", "CAC", "rare", 2, "Cartouche isolante destinée aux conduites froides et cellules énergétiques."),
  craftResource("ruban_carbone_ceramique", "Ruban carbone-céramique", "RCC", "rare", 2, "Ruban composite flexible pour blindages légers et assemblages thermiques.")
];

export const VERY_RARE_CRAFT_RESOURCES = [
  craftResource("micro_heatpipe_quantique", "Micro heat-pipe quantique", "MHQ", "veryRare", 3, "Boucle thermique quantique pour évacuer les pics de chaleur extrêmes."),
  craftResource("diaphragme_gravitonique", "Diaphragme gravitonique", "DGV", "veryRare", 3, "Iris de confinement pour stabiliser les champs de propulsion avancés."),
  craftResource("cartouche_plasma_condense", "Cartouche de plasma condensé", "CPC", "veryRare", 3, "Réserve de plasma dense pour armes et moteurs de niveau supérieur."),
  craftResource("injecteur_ionique_miniature", "Injecteur ionique miniature", "IIM", "veryRare", 3, "Injecteur de précision pour propulseurs et accélérateurs de particules."),
  craftResource("prisme_phase", "Prisme de phase", "PDP", "veryRare", 3, "Cristal calibré pour focaliser les transitions dimensionnelles."),
  craftResource("tresse_optique_quantique", "Tresse optique quantique", "TOQ", "veryRare", 3, "Fibre tressée pour transmissions instantanées entre modules critiques."),
  craftResource("ruban_alliage_memoire", "Ruban d'alliage à mémoire", "RAM", "veryRare", 3, "Alliage flexible capable de reprendre sa forme après contrainte."),
  craftResource("capsule_fluide_neutronique", "Capsule de fluide neutronique", "CFN", "veryRare", 3, "Fluide dense sous confinement pour générateurs et blindages spéciaux.")
];

export const ELITE_CRAFT_RESOURCES = [
  craftResource("noyau_fusion_miniature", "Noyau de fusion miniature", "NFM", "elite", 4, "Cœur énergétique compact pour équipements de rang élite."),
  craftResource("cristal_phase_encapsule", "Cristal de phase encapsulé", "CPE", "elite", 4, "Cristal instable enfermé dans une capsule de confinement."),
  craftResource("roulement_magnetique", "Roulement magnétique", "RMG", "elite", 4, "Roulement sans contact pour tourelles, propulseurs et drones lourds."),
  craftResource("plaque_matiere_noire", "Plaque de matière noire", "PMN", "elite", 4, "Écaille de blindage extrêmement dense sous champ de retenue."),
  craftResource("injecteur_vide", "Injecteur du vide", "IDV", "elite", 4, "Aiguille d'injection pour canaux d'énergie instable."),
  craftResource("stabilisateur_dimensionnel", "Stabilisateur dimensionnel", "SDM", "elite", 4, "Anneaux de stabilisation pour systèmes de saut et portails."),
  craftResource("bobine_plasma_solaire", "Bobine de plasma solaire", "BPS", "elite", 4, "Bobine torique conçue pour contenir un plasma très chaud."),
  craftResource("capsule_nanoreparation", "Capsule de nano-réparation", "CNR", "elite", 4, "Capsule de nanites de réparation pour coques et modules avancés.")
];

export const MYTHIC_CRAFT_RESOURCES = [
  craftResource("fragment_noyau_stellaire", "Fragment de noyau stellaire", "FNS", "mythic", 5, "Éclat stellaire contenu, réservé aux fabrications mythiques."),
  craftResource("anneau_singularite", "Anneau de singularité", "ASG", "mythic", 5, "Anneau de confinement capable de stabiliser une micro-singularité."),
  craftResource("echappement_temporel", "Échappement temporel", "ETP", "mythic", 5, "Micro-mécanisme de précision pour synchronisation temporelle."),
  craftResource("filament_cosmique", "Filament cosmique", "FLC", "mythic", 5, "Filament énergétique quasi impossible à produire en masse."),
  craftResource("ampoule_condensat_vide", "Ampoule de condensat du vide", "ACV", "mythic", 5, "Condensat instable extrait des zones de vide absolu."),
  craftResource("plaque_astrometallique", "Plaque astrométallique", "PAM", "mythic", 5, "Fragment d'alliage cosmique pour blindages légendaires."),
  craftResource("cellule_energie_primordiale", "Cellule d'énergie primordiale", "CEP", "mythic", 5, "Cellule énergétique rare destinée aux systèmes ultimes."),
  craftResource("coeur_quantique", "Cœur quantique", "CQT", "mythic", 5, "Noyau quantique sous arcs de confinement mythiques.")
];

export const RESOURCE_DROP_POOLS = {
  common:COMMON_CRAFT_RESOURCES,
  rare:RARE_CRAFT_RESOURCES,
  veryRare:VERY_RARE_CRAFT_RESOURCES,
  elite:ELITE_CRAFT_RESOURCES,
  mythic:MYTHIC_CRAFT_RESOURCES
};
