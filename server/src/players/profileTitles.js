export const PROFILE_TITLE_NAMES = {
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

function completedPortalCount(profile){
  return Object.values(profile?.completedPortals || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
}

function completedSkillRankCount(profile){
  return Object.values(profile?.skillRanks || {}).reduce((total, ranks)=>{
    return total + (Array.isArray(ranks) ? ranks.reduce((sum, rank)=>sum + Math.max(0, Number(rank || 0)), 0) : 0);
  }, 0);
}

export function isProfileTitleUnlocked(profile, titleId){
  const id = String(titleId || "");
  const player = profile?.player || {};
  const rules = {
    first_contact:()=>Number(player.totalKills || 0) >= 1,
    hunter_100:()=>Number(player.totalKills || 0) >= 100,
    veteran_25:()=>Number(player.level || 1) >= 25,
    portal_mastery:()=>completedPortalCount(profile) > 0,
    quest_5:()=>Object.keys(profile?.completedQuestClaims || {}).length >= 5,
    inventory_30:()=>Array.isArray(profile?.inventoryItems) && profile.inventoryItems.length >= 30,
    skill_15:()=>completedSkillRankCount(profile) >= 15,
    drone_5:()=>Number(profile?.ownedDroneCount || 0) >= 5,
    hunter_500:()=>Number(player.totalKills || 0) >= 500,
    laser_100k:()=>Number(player.laserShotsFired || 0) >= 100000,
    laser_1m:()=>Number(player.laserShotsFired || 0) >= 1000000,
    laser_10m:()=>Number(player.laserShotsFired || 0) >= 10000000,
    laser_100m:()=>Number(player.laserShotsFired || 0) >= 100000000,
    laser_1b:()=>Number(player.laserShotsFired || 0) >= 1000000000,
    rocket_25k:()=>Number(player.rocketShotsFired || 0) >= 25000,
    rocket_250k:()=>Number(player.rocketShotsFired || 0) >= 250000,
    rocket_25m:()=>Number(player.rocketShotsFired || 0) >= 25000000,
    missile_10k:()=>Number(player.missileShotsFired || 0) >= 10000,
    missile_1m:()=>Number(player.missileShotsFired || 0) >= 1000000,
    missile_100m:()=>Number(player.missileShotsFired || 0) >= 100000000
  };
  return Boolean(PROFILE_TITLE_NAMES[id] && rules[id]?.());
}

export function applyProfileTitleSelection(profile, {titleId, visible} = {}){
  if(!profile?.player || typeof profile.player !== "object") return {ok:false, reason:"Profil joueur invalide."};
  if(titleId !== undefined){
    const nextTitleId = String(titleId || "");
    if(nextTitleId && !isProfileTitleUnlocked(profile, nextTitleId)){
      return {ok:false, reason:"Titre non debloque."};
    }
    profile.player.activeTitleId = nextTitleId || null;
  }
  if(visible !== undefined) profile.player.titleVisible = visible !== false;
  return {
    ok:true,
    titleId:profile.player.activeTitleId || null,
    visible:profile.player.titleVisible !== false
  };
}

export function getActiveProfileTitleName(profile){
  const player = profile?.player || {};
  if(player.titleVisible === false || !isProfileTitleUnlocked(profile, player.activeTitleId)) return null;
  return PROFILE_TITLE_NAMES[player.activeTitleId] || null;
}
