export const PROGRESSION_PORTAL_IDS = Object.freeze([
  "blue",
  "violet",
  "red",
  "ionis",
  "emerald",
  "void",
  "prismatic",
  "ancient",
  "eternal"
]);

export const PROGRESSION_PORTAL_NAMES = Object.freeze({
  blue:"Le Seuil d'Azuron",
  violet:"La Faille de Vesper",
  red:"La Forge de Kharon",
  ionis:"La Tempête d'Ionis",
  emerald:"La Ruche d'Éclanite",
  void:"L'Abîme de Nox",
  prismatic:"Le Nexus Prismatique",
  ancient:"Le Sanctuaire des Précurseurs",
  eternal:"Le Cœur de l'Éternel"
});

export const PROGRESSION_UNLOCKS = Object.freeze({
  eliteSkillShips:Object.freeze({
    portalId:"red",
    portalName:PROGRESSION_PORTAL_NAMES.red
  }),
  equipmentUpgrades:Object.freeze({
    portalId:"ionis",
    portalName:PROGRESSION_PORTAL_NAMES.ionis
  }),
  eliteLaserRecipes:Object.freeze({
    portalId:"emerald",
    portalName:PROGRESSION_PORTAL_NAMES.emerald
  }),
  stellarSystemTitle:Object.freeze({
    portalId:"eternal",
    portalName:PROGRESSION_PORTAL_NAMES.eternal
  })
});

export const STELLAR_SYSTEM_TITLE = Object.freeze({
  id:"stellar_system_colonized",
  name:"Système stellaire colonisé",
  portalId:PROGRESSION_UNLOCKS.stellarSystemTitle.portalId,
  ornamentId:"stellar_system_colonized_ornament",
  damageMultiplier:1.05
});

export function getCompletedPortalCount(profile, portalId){
  const count = Number(profile?.completedPortals?.[String(portalId || "")] || 0);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function hasCompletedProgressionPortal(profile, portalId){
  return getCompletedPortalCount(profile, portalId) >= 1;
}

export function getMissingProgressionPortalIds(profile){
  return PROGRESSION_PORTAL_IDS.filter(portalId=>!hasCompletedProgressionPortal(profile, portalId));
}

export function hasCompletedAllProgressionPortals(profile){
  return getMissingProgressionPortalIds(profile).length === 0;
}

export function isEliteSkillShip(ship){
  return Boolean(
    ship
    && (
      String(ship.rarityTier || "") === "elite"
      || ship.skillShip === true
      || Boolean(ship.abilityId)
    )
  );
}

export function getRequiredPortalForShip(ship){
  if(!ship) return null;
  if(isEliteSkillShip(ship)) return PROGRESSION_UNLOCKS.eliteSkillShips;
  const portalId = String(ship.requiresCompletedPortal || ship.requiresPortalCompletion || "");
  if(!portalId) return null;
  return {
    portalId,
    portalName:PROGRESSION_PORTAL_NAMES[portalId] || portalId
  };
}

export function getShipProgressionLockReason(profile, ship){
  const requirement = getRequiredPortalForShip(ship);
  if(!requirement || hasCompletedProgressionPortal(profile, requirement.portalId)) return "";
  return `${requirement.portalName} terminé requis.`;
}

export function getProgressionUnlockSnapshot(profile){
  return Object.freeze({
    eliteSkillShips:hasCompletedProgressionPortal(profile, PROGRESSION_UNLOCKS.eliteSkillShips.portalId),
    equipmentUpgrades:hasCompletedProgressionPortal(profile, PROGRESSION_UNLOCKS.equipmentUpgrades.portalId),
    eliteLaserRecipes:hasCompletedProgressionPortal(profile, PROGRESSION_UNLOCKS.eliteLaserRecipes.portalId),
    stellarSystemTitle:hasCompletedProgressionPortal(profile, PROGRESSION_UNLOCKS.stellarSystemTitle.portalId),
    prestige:hasCompletedAllProgressionPortals(profile)
  });
}
