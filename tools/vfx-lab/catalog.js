import { ships } from "../../src/data/ships.js";
import { ammoTypes } from "../../src/data/equipment.js";
import { ENEMY_TYPES } from "../../src/game/combatData/enemies.js";
import { DEFAULT_ENGINE_PROFILE, SHIP_ENGINE_PROFILES } from "../../src/game/combatData/engineProfiles.js";

export const shipCatalog = ships;
export const weaponCatalog = ammoTypes.filter(ammo=>["laser", "rocket", "missile"].includes(ammo.weaponClass));
export const enemyCatalog = Object.entries(ENEMY_TYPES).map(([kind, enemy])=>({id:kind, kind, ...enemy}));
export { DEFAULT_ENGINE_PROFILE, SHIP_ENGINE_PROFILES };

export function engineProfile(ship){
  const own = SHIP_ENGINE_PROFILES[ship.id] || {};
  return {...DEFAULT_ENGINE_PROFILE, ...own, colors:{...DEFAULT_ENGINE_PROFILE.colors, ...own.colors}};
}

export function engineStyle(ship){
  if(["helion_titan", "vesperion"].includes(ship.id)) return "heavy";
  if(["nyxaris", "asterion"].includes(ship.id)) return "spectral";
  if(["velox", "razorion"].includes(ship.id)) return "interceptor";
  return "ion";
}

export const styleNames = {ion:"Plasma compact", heavy:"Plasma dense", spectral:"Plasma compact", interceptor:"Plasma resserré"};
export const engineNotes = {
  ion:"Plasma animé visible à chaque tuyère, courbure en virage et sillage qui s’élargit puis s’évapore.",
  heavy:"Plasma dense, poussée progressive et sillage diffus plus persistant, conservant la trace des virages.",
  spectral:"Jets violets visibles jusqu’aux sorties latérales ; leur sillage courbe se dissipe progressivement.",
  interceptor:"Jets resserrés et lumineux, réponse rapide en virage et traînée légère qui s’évapore."
};
export const enemyNotes = {
  drone_pirate:["Orbe commun", "Petit Orbe de départ : six pattes courtes tournent autour d’un noyau bleu stable. Rotation lente puis accélération ponctuelle, éclat au tir et fumée validée qui se dissipe derrière lui. Le modèle à huit grandes branches est réservé au boss."],
  boss_drone_pirate:["Boss Orbe", "Le modèle argent et bleu validé devient le boss : huit grandes branches animées autour d’un noyau stable. Rotation lente puis relance franche, noyau lumineux au tir et même fumée de propulsion. Le projectile reste une boule bleue."],
  raider_astral:["Intercepteur commun", "Nouvelle coque rouge et anthracite, deux ailes courtes sur charnières et deux moteurs arrière. Sept repères lumineux blancs chauds et rouges soulignent les ailes et la coque, même hors attaque. Les ailes se resserrent à la préparation du tir, le canon s’illumine brièvement ; la vapeur chaude suit les virages puis se dissipe. Gabarit courant, poursuite et attaques conservées. Proposition locale."],
  boss_raider_astral:["Intercepteur blindé", "Variante boss du Vorak validé : épaules plus blindées, renforts métalliques et deux petits éclairages supplémentaires. Gabarit visible environ 20 % plus présent, mêmes deux ailes et deux moteurs avec vapeur. Le commun validé est affiché à gauche comme référence ; le boss garde son orientation fixe et ses règles actuelles. Proposition locale."],
  chasseur_spectral:["Organisme toxique", "Nouvelle base du Parasite commun : six tentacules plus amples alternent étirements, courbures et pauses, chacun à son rythme. Un léger retard accompagne les déplacements. Le noyau et les veines deviennent vert brillant au tir ; une brume organique laisse quelques spores puis s’évapore. Carapace et noyau restent stables, gabarit courant. Animation intégrée au jeu ; poursuite, poison et projectiles conservés."],
  boss_chasseur_spectral:["Parasite à couronne", "Le boss garde son corps rond : six plaques autour du noyau forment une couronne mobile, entourée de grosses glandes vertes. Ses six tentacules sont segmentés ; chacun change sa courbure et son rythme, avec des pauses propres, puis ils se contractent avant le tir. Les plaques s’ouvrent pour laisser briller le noyau. Même boss et ancienne animation à gauche ; animation publiée à droite. Fumée et règles de combat conservées."],
  cuirasse_nebulaire:["Traqueur abyssal", "Base bleue sélectionnée par le joueur, tournée à 180° : coque pointue et six appendices articulés, métal sombre et cyan. Éclat bleu au tir, arcs électriques brefs entre les appendices et brume froide pendant le déplacement. Modèle intégré au jeu ; orientation fixe, poursuite et bombe à la mort conservées : rayon 100, ralentissement de 50 % pendant 5 s."],
  boss_cuirasse_nebulaire:["Traqueur blindé", "Le Traqueur reste reconnaissable : six appendices bleus, deux fenêtres cyan et coque pointue. Deux épaules blindées et une crête à plaques superposées élargissent le haut ; les lames deviennent segmentées avec de petits ergots. Mouvements plus lourds, arcs électriques et brume conservés. Commun publié à gauche ; boss publié à droite, avec son gabarit natif de 126 contre 106. Orientation fixe, poursuite et bombe rayon 100, ralentissement 50 % pendant 5 s conservées."],
  cuirasse_ambre:["Artillerie lourde", "Propulsion aux deux sorties de moteur, sillage de chaleur persistant et lueur orange au tir. Le blindage garde sa stabilité."],
  eclanite:["Énergie cristalline", "Éclanite commun validé et publié : un noyau minéral violet et six fragments de tailles différentes. Chacun flotte et pivote à son rythme ; le noyau reste droit. Ses tirs déclenchent un éclat du noyau et des fissures, puis les fragments s’écartent brièvement. Une poussière violette suit ses déplacements et s’évapore. Gabarit, orientation fixe et délai de poursuite conservés. L’atelier reprend les animations publiées."]
};
