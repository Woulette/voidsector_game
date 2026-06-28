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
  pondeuse_astrale:0.92,
  cuirasse_nebulaire:0.93,
  cuirasse_ambre:0.92,
  eclanite:0.92,
  cristanite:0.92,
  astranite:0.94,
  boss_drone_pirate:0.86,
  boss_raider_astral:0.89,
  boss_chasseur_spectral:0.91,
  boss_cuirasse_nebulaire:0.93,
  boss_cuirasse_ambre:0.92
};

export const PORTAL_WAVE_TOTAL = 30;

// Profils visuels des réacteurs joueur.
// Positions locales exprimées pour le rendu 96x96 du vaisseau.
// X décale gauche/droite, Y décale vers l'arrière du sprite (les vaisseaux pointent vers le haut quand angle = 0).
// Ce bloc est purement graphique : aucune stat, collision ou mécanique d'équipement n'en dépend.
