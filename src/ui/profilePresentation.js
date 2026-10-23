import { getRarityLabel, rarityClass } from "../shared/rarities.js";
import { hasCompletedProgressionPortal, PROGRESSION_PORTAL_IDS, PROGRESSION_PORTAL_NAMES, STELLAR_SYSTEM_TITLE } from "../shared/progressionUnlocks.js?v=20260726-kharon1";

const number = value=>Number.isFinite(Number(value)) ? Number(value) : 0;
const nonnegative = value=>Math.max(0, number(value));
const percent = value=>Math.max(0, Math.min(100, number(value)));

export function formatProfileDuration(seconds){
  const total = Math.floor(nonnegative(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${minutes} min ${String(total % 60).padStart(2, "0")} s`;
}

// A read-only projection. Rank, equipment statistics and ascension eligibility are
// supplied by the existing gameplay getters; this module grants no progression.
export function createProfilePresentation({ state = {}, rank = {}, nextRank = null, rankProgress = {}, rankAsset = "", nextRankAsset = "", levelCap = 50, ship = {}, stats = {}, ascension = {}, drones = [], drone = {}, formation = null, displayMode = "ship" } = {}){
  const player = state.player || {};
  const ascended = number(state.prestigeCount) > 0;
  const titleUnlocked = hasCompletedProgressionPortal(state, STELLAR_SYSTEM_TITLE.portalId);
  const titleEquipped = titleUnlocked && player.activeTitleId === STELLAR_SYSTEM_TITLE.id;
  const titleVisible = player.titleVisible !== false;
  const xp = nonnegative(player.xp);
  const xpNext = Math.max(1, nonnegative(player.xpNext));
  const completedPortals = PROGRESSION_PORTAL_IDS.filter(id=>hasCompletedProgressionPortal(state, id)).length;
  return {
    identity:{
      name:String(player.name || "Pilote"), level:Math.max(1, number(player.level)), levelCap,
      rankName:String(rank.name || ""), rankAsset,
      rankPoints:nonnegative(rankProgress.score), rankPercent:percent(rankProgress.progress),
      nextRank:nextRank ? {name:String(nextRank.name), asset:nextRankAsset, points:nonnegative(nextRank.score), remaining:nonnegative(rankProgress.remaining)} : null
    },
    counters:[
      {icon:"clock", label:"Temps de jeu", value:formatProfileDuration(player.totalPlaySeconds)},
      {icon:"kills", label:"Monstres détruits", value:nonnegative(player.totalKills)},
      {icon:"flag", label:"Quêtes terminées", value:Object.keys(state.completedQuestClaims || {}).length, detail:"Quêtes terminées dont la récompense a été réclamée"},
      {icon:"star", label:"Réputation", value:number(player.reputation)}
    ],
    ship:{name:String(ship.name || ""), className:String(ship.className || ""), image:String(ship.img || ""), rarity:getRarityLabel(ship), rarityClass:rarityClass(ship)},
    stats:[
      {icon:"hull", label:"Points de vie", value:Math.round(nonnegative(stats.vie))},
      {icon:"shield", label:"Bouclier", value:Math.round(nonnegative(stats.bouclier))},
      {icon:"regen", label:"Régénération", value:Math.round(nonnegative(stats.regen)), suffix:" / s"},
      {icon:"absorb", label:"Absorption", value:Math.round(nonnegative(stats.shieldAbsorbRatio) * 100), suffix:" %"},
      {icon:"speed", label:"Vitesse", value:Math.round(nonnegative(stats.vitesseReelle))},
      {icon:"cargo", label:"Soute", value:Math.round(nonnegative(stats.cargo))}
    ],
    xp:{value:xp, next:xpNext, total:nonnegative(player.totalXp), percent:percent(xp / xpNext * 100)},
    displayMode:displayMode === "drones" ? "drones" : "ship",
    drones:drones.map(entry=>({...entry})),
    droneImage:String(drone.img || ""),
    formationName:String(formation?.name || "Formation Base"),
    title:{
      id:STELLAR_SYSTEM_TITLE.id, name:STELLAR_SYSTEM_TITLE.name, portalName:PROGRESSION_PORTAL_NAMES[STELLAR_SYSTEM_TITLE.portalId],
      unlocked:titleUnlocked, equipped:titleEquipped, visible:titleVisible,
      bonus:Math.round((STELLAR_SYSTEM_TITLE.damageMultiplier - 1) * 100),
      status:!titleUnlocked ? "Verrouillé" : titleEquipped ? titleVisible ? "Équipé · visible" : "Équipé · masqué" : "Débloqué"
    },
    ascension:{
      ascended, available:!ascended && Boolean(ascension.ok), levelOk:Boolean(ascension.levelOk), portalOk:Boolean(ascension.portalOk),
      completedPortals, requiredPortals:PROGRESSION_PORTAL_IDS.length
    }
  };
}
