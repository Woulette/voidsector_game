export const PORTAL_FRAGMENT_DROP_CHANCE = 0.0033;
export const PORTAL_CONTENT_PENDING_CODE = "PORTAL_CONTENT_PENDING";

export const AZURON_PORTAL_ID = "blue";
export const AZURON_PORTAL_NAME = "Le Seuil d’Azuron";
export const AZURON_REQUIRED_LEVEL = 10;
export const AZURON_REQUIRED_FRAGMENTS = 15;

export const VESPER_PORTAL_ID = "violet";
export const VESPER_PORTAL_NAME = "La Faille de Vesper";
export const VESPER_REQUIRED_LEVEL = 15;
export const VESPER_REQUIRED_FRAGMENTS = 20;

function freezePortalDefinition(definition){
  const drop = definition.drop || {};
  return Object.freeze({
    ...definition,
    requirement:Object.freeze({level:definition.level}),
    reward:Object.freeze({
      credits:0,
      xp:0,
      premium:0,
      ammoX4:0,
      ammoX6:0,
      ...(definition.reward || {})
    }),
    drop:Object.freeze({
      chance:PORTAL_FRAGMENT_DROP_CHANCE,
      mapNumbers:Object.freeze([...(drop.mapNumbers || [])]),
      includeCore:Boolean(drop.includeCore),
      includeFrontier35_50:Boolean(drop.includeFrontier35_50),
      levelRange:Array.isArray(drop.levelRange)
        ? Object.freeze([...drop.levelRange])
        : null,
      assumption:drop.assumption || ""
    })
  });
}

export const SERVER_PORTAL_DEFINITIONS = Object.freeze([
  freezePortalDefinition({
    id:AZURON_PORTAL_ID,
    name:AZURON_PORTAL_NAME,
    shortName:"Seuil d’Azuron",
    assetSlug:"seuil_azuron",
    img:"assets/portals/seuil_azuron.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_azuron.png?v=20260726-kharon1",
    pieceName:"Fragment d’Azuron",
    pieceLabel:"Fragments d’Azuron",
    pieceUnit:"fragments",
    level:AZURON_REQUIRED_LEVEL,
    piecesRequired:AZURON_REQUIRED_FRAGMENTS,
    gameplayReady:true,
    totalWaves:20,
    drop:{mapNumbers:[1, 2, 3, 4]},
    reward:{premium:10_000, ammoX4:10_000}
  }),
  freezePortalDefinition({
    id:VESPER_PORTAL_ID,
    name:VESPER_PORTAL_NAME,
    shortName:"Faille de Vesper",
    assetSlug:"faille_vesper",
    img:"assets/portals/faille_vesper.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_vesper.png?v=20260726-kharon1",
    pieceName:"Fragment de Vesper",
    pieceLabel:"Fragments de Vesper",
    pieceUnit:"fragments",
    level:VESPER_REQUIRED_LEVEL,
    piecesRequired:VESPER_REQUIRED_FRAGMENTS,
    gameplayReady:true,
    drop:{mapNumbers:[1, 2, 3, 4]},
    reward:{premium:20_000, ammoX4:20_000}
  }),
  freezePortalDefinition({
    id:"red",
    name:"La Forge de Kharon",
    shortName:"Forge de Kharon",
    assetSlug:"forge_kharon",
    img:"assets/portals/forge_kharon.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_kharon.png?v=20260726-kharon1",
    pieceName:"Fragment de Kharon",
    pieceLabel:"Fragments de Kharon",
    pieceUnit:"fragments",
    level:20,
    piecesRequired:35,
    gameplayReady:true,
    totalWaves:30,
    drop:{mapNumbers:[1, 2, 3, 4, 5]},
    reward:{premium:30_000, ammoX4:30_000}
  }),
  freezePortalDefinition({
    id:"ionis",
    name:"La Tempête d’Ionis",
    shortName:"Tempête d’Ionis",
    assetSlug:"tempete_ionis",
    img:"assets/portals/tempete_ionis.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_ionis.png?v=20260726-kharon1",
    pieceName:"Fragment d’Ionis",
    pieceLabel:"Fragments d’Ionis",
    pieceUnit:"fragments",
    level:25,
    piecesRequired:50,
    gameplayReady:true,
    totalWaves:40,
    drop:{mapNumbers:[2, 3, 4, 5], includeCore:true},
    reward:{premium:40_000, ammoX4:40_000}
  }),
  freezePortalDefinition({
    id:"emerald",
    name:"La Ruche d’Éclanite",
    shortName:"Ruche d’Éclanite",
    assetSlug:"ruche_eclanite",
    img:"assets/portals/ruche_eclanite.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_eclanite.png?v=20260726-kharon1",
    pieceName:"Fragment d’Éclanite",
    pieceLabel:"Fragments d’Éclanite",
    pieceUnit:"fragments",
    level:30,
    piecesRequired:60,
    gameplayReady:true,
    drop:{mapNumbers:[2, 3, 4, 5], includeCore:true},
    reward:{premium:50_000, ammoX6:5_000}
  }),
  freezePortalDefinition({
    id:"void",
    name:"L’Abîme de Nox",
    shortName:"Abîme de Nox",
    assetSlug:"abime_nox",
    img:"assets/portals/abime_nox.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_nox.png?v=20260726-kharon1",
    pieceName:"Fragment de Nox",
    pieceLabel:"Fragments de Nox",
    pieceUnit:"fragments",
    level:35,
    piecesRequired:75,
    gameplayReady:true,
    totalWaves:30,
    drop:{mapNumbers:[3, 4, 5], includeCore:true, includeFrontier35_50:true, levelRange:[35, 50]},
    reward:{premium:50_000, ammoX6:10_000}
  }),
  freezePortalDefinition({
    id:"prismatic",
    name:"Le Nexus Prismatique",
    shortName:"Nexus Prismatique",
    assetSlug:"nexus_prismatique",
    img:"assets/portals/nexus_prismatique.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_nexus_prismatique.png?v=20260726-kharon1",
    pieceName:"Fragment du Nexus",
    pieceLabel:"Fragments du Nexus",
    pieceUnit:"fragments",
    level:40,
    piecesRequired:80,
    gameplayReady:true,
    drop:{mapNumbers:[4, 5], includeCore:true, includeFrontier35_50:true, levelRange:[35, 50]},
    reward:{premium:50_000, ammoX4:50_000}
  }),
  freezePortalDefinition({
    id:"ancient",
    name:"Le Sanctuaire des Précurseurs",
    shortName:"Sanctuaire des Précurseurs",
    assetSlug:"sanctuaire_precurseurs",
    img:"assets/portals/sanctuaire_precurseurs.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_sanctuaire_precurseurs.png?v=20260726-kharon1",
    pieceName:"Fragment des Précurseurs",
    pieceLabel:"Fragments des Précurseurs",
    pieceUnit:"fragments",
    level:45,
    piecesRequired:90,
    gameplayReady:true,
    drop:{mapNumbers:[5], includeCore:true, includeFrontier35_50:true, levelRange:[35, 50]},
    reward:{premium:75_000, ammoX6:15_000}
  }),
  freezePortalDefinition({
    id:"eternal",
    name:"Le Cœur de l’Éternel",
    shortName:"Cœur de l’Éternel",
    assetSlug:"coeur_eternel",
    img:"assets/portals/coeur_eternel.png?v=20260726-kharon1",
    pieceImg:"assets/portal_pieces/fragment_coeur_eternel.png?v=20260726-kharon1",
    pieceName:"Fragment de l’Éternel",
    pieceLabel:"Fragments de l’Éternel",
    pieceUnit:"fragments",
    level:50,
    piecesRequired:100,
    gameplayReady:false,
    drop:{
      mapNumbers:[],
      includeCore:false,
      includeFrontier35_50:false,
      assumption:"Zones de drop non définies : fragments disponibles uniquement via le Space Caster jusqu’à décision."
    },
    reward:{premium:100_000, ammoX6:25_000}
  })
]);

export const SERVER_PORTAL_IDS = Object.freeze(SERVER_PORTAL_DEFINITIONS.map(portal=>portal.id));

const SERVER_PORTALS_BY_ID = new Map(SERVER_PORTAL_DEFINITIONS.map(portal=>[portal.id, portal]));

export function getServerPortalDefinition(portalId){
  return SERVER_PORTALS_BY_ID.get(String(portalId || "")) || null;
}

export function getServerPortalDefinitions(){
  return [...SERVER_PORTAL_DEFINITIONS];
}

export function getPortalContentLock(portalId){
  const portal = getServerPortalDefinition(portalId);
  if(!portal || portal.gameplayReady) return null;
  return {
    code:PORTAL_CONTENT_PENDING_CODE,
    message:`${portal.name} peut être collecté et déverrouillé, mais son épreuve de combat reste à définir.`
  };
}

export function buildServerPortalConfigs(){
  return Object.fromEntries(SERVER_PORTAL_DEFINITIONS.map(portal=>[
    portal.id,
    {
      id:portal.id,
      name:portal.name,
      ...(portal.totalWaves ? {totalWaves:portal.totalWaves} : {}),
      gameplayReady:portal.gameplayReady,
      reward:{...portal.reward}
    }
  ]));
}

export function buildServerPortalDropRules(){
  return SERVER_PORTAL_DEFINITIONS.map(portal=>({
    id:portal.id,
    name:portal.name,
    pieceName:portal.pieceName,
    img:portal.pieceImg,
    dropMapNumbers:[...portal.drop.mapNumbers],
    includeCore:portal.drop.includeCore,
    includeFrontier35_50:portal.drop.includeFrontier35_50,
    dropLevelRange:portal.drop.levelRange ? [...portal.drop.levelRange] : null,
    dropChance:portal.drop.chance,
    ...(portal.drop.assumption ? {assumption:portal.drop.assumption} : {})
  }));
}
