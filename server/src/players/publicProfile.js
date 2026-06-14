import { ammoTypes, droneFormations, equipment, ships } from "../../../src/data/catalog.js";
import { getFirmDefinition, normalizeFirmId } from "../../../src/data/firms.js";
import { calculateRankScore, getRankAssetPath, getRankForScore } from "../../../src/data/ranks.js";

const PROFILE_TITLE_NAMES = {
  first_contact:"Premier sang",
  hunter_100:"Traqueur spatial",
  veteran_25:"Vétéran d'Astra",
  portal_mastery:"Nettoyeur d'Astra",
  quest_5:"Mercenaire fiable",
  inventory_30:"Ingénieur de bord",
  skill_15:"Spécialiste",
  drone_5:"Chef d'escadron",
  hunter_500:"Chasseur abyssal",
  laser_100k:"Canonnier laser",
  laser_1m:"Déluge photonique",
  laser_10m:"Architecte de faisceaux",
  laser_100m:"Tempête laser",
  laser_1b:"Légende photonique",
  rocket_25k:"Artilleur orbital",
  rocket_250k:"Maître roquettes",
  rocket_25m:"Barrage orbital",
  missile_10k:"Artilleur guidé",
  missile_1m:"Commandant missile",
  missile_100m:"Doctrine orbitale"
};

function completedPortalCount(completedPortals = {}){
  return Object.values(completedPortals || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
}

function inventoryEntry(profile, uid){
  if(!uid || !Array.isArray(profile?.inventoryItems)) return null;
  return profile.inventoryItems.find(entry=>entry.uid === uid) || null;
}

function equipmentByUid(profile, uid){
  const entry = inventoryEntry(profile, uid);
  if(!entry?.itemId) return null;
  const item = equipment.find(candidate=>candidate.id === entry.itemId);
  if(!item) return null;
  return {
    id:item.id,
    name:item.name,
    short:item.short || item.name,
    category:item.category,
    slotType:item.slotType,
    rarity:item.rarity || "",
    img:item.img || "",
    upgradeLevel:Math.max(0, Number(profile?.equipmentUpgrades?.[item.id] || 0)),
    stats:item.stats || {}
  };
}

function compactItems(profile, uids = []){
  return (Array.isArray(uids) ? uids : [])
    .map(uid=>equipmentByUid(profile, uid))
    .filter(Boolean);
}

function activeShipForProfile(profile){
  const shipId = String(profile?.activeShip || profile?.selectedShip || profile?.ownedShips?.[0] || "orion");
  return ships.find(ship=>ship.id === shipId) || ships.find(ship=>ship.id === "orion") || ships[0];
}

function activeTitle(profile){
  const player = profile?.player || {};
  if(player.titleVisible === false || !player.activeTitleId) return null;
  return PROFILE_TITLE_NAMES[player.activeTitleId] || null;
}

function activeAmmo(profile){
  const ammoId = String(profile?.lastLaserAmmoId || profile?.actionSlots?.find(id=>ammoTypes.some(ammo=>ammo.id === id)) || "ammo_x1");
  const ammo = ammoTypes.find(entry=>entry.id === ammoId) || ammoTypes.find(entry=>entry.id === "ammo_x1");
  if(!ammo) return null;
  return {
    id:ammo.id,
    name:ammo.name,
    short:ammo.short || ammo.name,
    rarity:ammo.rarity || "",
    img:ammo.img || "",
    multiplier:Math.max(1, Number(ammo.multiplier || 1))
  };
}

function activeFormation(profile){
  const formation = droneFormations.find(entry=>entry.id === profile?.activeDroneFormation) || droneFormations[0];
  if(!formation) return null;
  return {
    id:formation.id,
    name:formation.name,
    short:formation.short || formation.name,
    rarity:formation.rarity || "",
    img:formation.img || "",
    stats:formation.stats || {}
  };
}

function buildDroneItems(profile){
  const loadout = Array.isArray(profile?.droneLoadout) ? profile.droneLoadout : [];
  return loadout.map((uid, index)=>{
    const item = equipmentByUid(profile, uid);
    if(!item) return null;
    return {
      ...item,
      droneIndex:index + 1,
      upgraded:Boolean(profile?.dronePermanentUpgrades?.[index])
    };
  }).filter(Boolean);
}

export function buildPublicPlayerProfile({key = "", profile = null, ranking = null} = {}){
  if(!profile || typeof profile !== "object") return null;
  const player = profile.player || {};
  const ship = activeShipForProfile(profile);
  const loadout = profile?.shipLoadouts?.[ship?.id] || {};
  const firmId = normalizeFirmId(player.firmId || ranking?.firmId || "astra");
  const firm = getFirmDefinition(firmId);
  const portalClears = completedPortalCount(profile.completedPortals);
  const rankScore = Math.max(0, Number(player.rankScore || calculateRankScore(player, portalClears)));
  const rank = getRankForScore(rankScore);
  const droneItems = buildDroneItems(profile);
  const generatorItems = compactItems(profile, loadout.generators);
  const droneGeneratorItems = droneItems.filter(item=>item.category === "generateur");

  return {
    key:String(key || ranking?.key || player.name || ""),
    name:String(player.name || ranking?.name || "Pilote").trim() || "Pilote",
    firm:{id:firm.id, label:firm.label, color:firm.color},
    title:activeTitle(profile),
    level:Math.max(1, Math.floor(Number(player.level || 1))),
    rank:{id:rank.id, name:rank.name, score:rankScore, asset:getRankAssetPath(rank)},
    ranking:ranking ? {
      rank:Math.max(0, Number(ranking.rank || 0)),
      displayRank:Math.max(0, Number(ranking.displayRank || ranking.rank || 0)),
      contribution:Math.max(0, Number(ranking.points || 0))
    } : null,
    ship:ship ? {
      id:ship.id,
      name:ship.name,
      className:ship.className || "",
      img:ship.img || "",
      combatImg:ship.combatImg || ship.img || "",
      stats:ship.stats || {}
    } : null,
    loadout:{
      lasers:compactItems(profile, loadout.lasers),
      generators:generatorItems,
      missileLauncher:equipmentByUid(profile, loadout.missileLauncher),
      rocketLauncher:equipmentByUid(profile, loadout.rocketLauncher),
      extras:compactItems(profile, loadout.extras),
      laserAmmo:activeAmmo(profile)
    },
    drones:{
      owned:Math.max(0, Number(profile.ownedDroneCount || 0)),
      equipped:droneItems.length,
      upgraded:droneItems.filter(item=>item.upgraded).length,
      formation:activeFormation(profile),
      lasers:droneItems.filter(item=>item.category === "canon"),
      generators:droneGeneratorItems
    },
    progression:{
      playSeconds:Math.max(0, Number(player.totalPlaySeconds || 0)),
      reputation:Math.max(0, Number(player.reputation || 0)),
      totalXp:Math.max(0, Number(player.totalXp || 0)),
      totalKills:Math.max(0, Number(player.totalKills || 0)),
      totalPlayerKills:Math.max(0, Number(player.totalPlayerKills || 0)),
      portalClears,
      questsCompleted:Object.keys(profile.completedQuestClaims || {}).length,
      prestige:Math.max(0, Number(profile.prestigeCount || 0)),
      skillPoints:Math.max(0, Number(player.skillPoints || 0)),
      laserShots:Math.max(0, Number(player.laserShotsFired || 0)),
      rocketShots:Math.max(0, Number(player.rocketShotsFired || 0)),
      missileShots:Math.max(0, Number(player.missileShotsFired || 0))
    }
  };
}
