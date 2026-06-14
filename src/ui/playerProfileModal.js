import { droneFormations, equipment, ships } from "../data/catalog.js";
import { getFirmDefinition, normalizeFirmId } from "../data/firms.js";
import { calculateRankScore, getRankAssetPath, getRankForScore } from "../data/ranks.js";
import { fmt } from "../core/utils.js";
import { store } from "../core/store.js";

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

const profileRegistry = new Map();
let profileEventsInstalled = false;
let activeProfile = null;

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function completedPortalCount(completedPortals = {}){
  return Object.values(completedPortals || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
}

function formatHours(seconds){
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  return `${fmt(Math.floor(total / 3600))}h`;
}

function profileRoot(){
  let root = document.getElementById("pilotProfileModalRoot");
  if(!root){
    root = document.createElement("div");
    root.id = "pilotProfileModalRoot";
    document.body.appendChild(root);
  }
  return root;
}

function getItem(id){
  return equipment.find(item=>item.id === id) || null;
}

function itemByUid(state, uid){
  if(!uid) return null;
  const entry = Array.isArray(state?.inventoryItems)
    ? state.inventoryItems.find(candidate=>candidate.uid === uid)
    : null;
  const item = entry ? getItem(entry.itemId) : null;
  if(!item) return null;
  return {
    id:item.id,
    name:item.name,
    short:item.short || item.name,
    category:item.category,
    slotType:item.slotType,
    rarity:item.rarity || "",
    img:item.img || "",
    upgradeLevel:Math.max(0, Number(state?.equipmentUpgrades?.[item.id] || 0)),
    stats:item.stats || {}
  };
}

function compactItems(state, uids = []){
  return (Array.isArray(uids) ? uids : []).map(uid=>itemByUid(state, uid)).filter(Boolean);
}

function activeTitle(player = {}){
  if(player.titleVisible === false || !player.activeTitleId) return null;
  return PROFILE_TITLE_NAMES[player.activeTitleId] || null;
}

function buildFormationSummary(id = "base"){
  const formation = droneFormations.find(entry=>entry.id === id) || droneFormations[0];
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

export function buildLocalPlayerProfile(row = {}){
  const state = store.state || {};
  const player = state.player || {};
  const firmId = normalizeFirmId(player.firmId || "astra");
  const firm = getFirmDefinition(firmId);
  const ship = ships.find(entry=>entry.id === (state.activeShip || "orion")) || ships[0];
  const loadout = state.shipLoadouts?.[ship.id] || {};
  const droneItems = (Array.isArray(state.droneLoadout) ? state.droneLoadout : [])
    .map((uid, index)=>{
      const item = itemByUid(state, uid);
      return item ? {...item, droneIndex:index + 1, upgraded:Boolean(state.dronePermanentUpgrades?.[index])} : null;
    })
    .filter(Boolean);
  const portalClears = completedPortalCount(state.completedPortals);
  const rankScore = Math.max(0, Number(row.points || player.rankScore || calculateRankScore(player, portalClears)));
  const rank = getRankForScore(rankScore);

  return {
    key:"local-player",
    name:player.name || row.pilot || "NOVA-37",
    firm:{id:firm.id, label:firm.label, color:firm.color},
    title:activeTitle(player),
    level:Math.max(1, Number(player.level || row.level || 1)),
    sourceLabel:"Profil sauvegardé",
    rank:{id:rank.id, name:rank.name, score:rankScore, asset:getRankAssetPath(rank)},
    ranking:row.position ? {displayRank:row.position, contribution:Number(row.points || 0)} : null,
    ship:{
      id:ship.id,
      name:ship.name,
      className:ship.className || "",
      img:ship.img || "",
      combatImg:ship.combatImg || ship.img || "",
      stats:ship.stats || {}
    },
    loadout:{
      lasers:compactItems(state, loadout.lasers),
      generators:compactItems(state, loadout.generators),
      missileLauncher:itemByUid(state, loadout.missileLauncher),
      rocketLauncher:itemByUid(state, loadout.rocketLauncher),
      extras:compactItems(state, loadout.extras)
    },
    drones:{
      owned:Math.max(0, Number(state.ownedDroneCount || 0)),
      equipped:droneItems.length,
      upgraded:droneItems.filter(item=>item.upgraded).length,
      formation:buildFormationSummary(state.activeDroneFormation || "base"),
      lasers:droneItems.filter(item=>item.category === "canon"),
      generators:droneItems.filter(item=>item.category === "generateur")
    },
    progression:{
      playSeconds:Math.max(0, Number(player.totalPlaySeconds || 0)),
      reputation:Math.max(0, Number(player.reputation || 0)),
      totalXp:Math.max(0, Number(player.totalXp || 0)),
      totalKills:Math.max(0, Number(player.totalKills ?? row.kills ?? 0)),
      totalPlayerKills:Math.max(0, Number(player.totalPlayerKills || 0)),
      portalClears,
      questsCompleted:Object.keys(state.completedQuestClaims || {}).length,
      prestige:Math.max(0, Number(state.prestigeCount || 0)),
      skillPoints:Math.max(0, Number(player.skillPoints || 0)),
      laserShots:Math.max(0, Number(player.laserShotsFired || 0)),
      rocketShots:Math.max(0, Number(player.rocketShotsFired || 0)),
      missileShots:Math.max(0, Number(player.missileShotsFired || 0))
    }
  };
}

function previewShipForLevel(level){
  if(level >= 32) return ships.find(ship=>ship.id === "razorion") || ships[0];
  if(level >= 26) return ships.find(ship=>ship.id === "valkyrie") || ships[0];
  if(level >= 18) return ships.find(ship=>ship.id === "velox") || ships[0];
  return ships.find(ship=>ship.id === "orion") || ships[0];
}

function previewItem(id, upgradeLevel = 0){
  const item = getItem(id);
  return item ? {
    id:item.id,
    name:item.name,
    short:item.short || item.name,
    category:item.category,
    slotType:item.slotType,
    rarity:item.rarity || "",
    img:item.img || "",
    upgradeLevel,
    stats:item.stats || {}
  } : null;
}

export function buildPreviewPilotProfile(row = {}){
  if(row.isPlayer) return buildLocalPlayerProfile(row);
  const level = Math.max(1, Number(row.level || 1));
  const ship = previewShipForLevel(level);
  const rank = getRankForScore(row.points || 0);
  const firm = getFirmDefinition(normalizeFirmId(row.firmId || "astra"));
  const laserId = level >= 30 ? "laser_mk3" : level >= 18 ? "laser_mk2" : "laser_mk1";
  const laserCount = Math.max(1, Math.min(Number(ship.stats?.maxLasers || 1), Math.ceil(level / 5)));
  const generatorId = level >= 24 ? "shield_omega" : "shield_gen";
  const generatorCount = Math.max(0, Math.min(Number(ship.stats?.maxGenerators || 0), Math.floor(level / 6)));
  const droneOwned = Math.max(0, Math.min(10, Math.floor(level / 4)));
  const droneLasers = Math.max(0, Math.min(droneOwned, Math.floor(level / 8)));

  return {
    key:`preview:${row.id || row.pilot || "pilot"}`,
    name:row.pilot || "Pilote",
    firm:{id:firm.id, label:firm.label, color:firm.color},
    title:level >= 30 ? "Chasseur abyssal" : level >= 20 ? "Traqueur spatial" : null,
    level,
    sourceLabel:"Profil de prévisualisation",
    rank:{id:rank.id, name:rank.name, score:Number(row.points || 0), asset:getRankAssetPath(rank)},
    ranking:row.position ? {displayRank:row.position, contribution:Number(row.points || 0)} : null,
    ship:{id:ship.id, name:ship.name, className:ship.className || "", img:ship.img || "", combatImg:ship.combatImg || ship.img || "", stats:ship.stats || {}},
    loadout:{
      lasers:Array.from({length:laserCount}, ()=>previewItem(laserId, level >= 28 ? 3 : 0)).filter(Boolean),
      generators:Array.from({length:generatorCount}, ()=>previewItem(generatorId, level >= 28 ? 2 : 0)).filter(Boolean),
      missileLauncher:level >= 20 ? previewItem("launcher_missile_mk1") : null,
      rocketLauncher:level >= 12 ? previewItem("launcher_rocket_mk1") : null,
      extras:level >= 22 ? [previewItem("extra_auto_rocket")].filter(Boolean) : []
    },
    drones:{
      owned:droneOwned,
      equipped:droneLasers,
      upgraded:level >= 34 ? 1 : 0,
      formation:buildFormationSummary(level >= 28 ? "tir" : "base"),
      lasers:Array.from({length:droneLasers}, (_, index)=>{
        const item = previewItem(laserId);
        return item ? {...item, droneIndex:index + 1, upgraded:level >= 34 && index === 0} : null;
      }).filter(Boolean),
      generators:[]
    },
    progression:{
      playSeconds:Math.max(0, level * 4200),
      reputation:Math.max(0, Math.floor(Number(row.points || 0) / 2)),
      totalXp:Math.max(0, Number(row.points || 0) * 900),
      totalKills:Math.max(0, Number(row.kills || 0)),
      totalPlayerKills:Math.max(0, Math.floor(Number(row.kills || 0) / 24)),
      portalClears:Math.max(0, Number(row.portals || 0)),
      questsCompleted:Math.max(0, Math.floor(level / 3)),
      prestige:0,
      skillPoints:Math.max(0, Math.floor(level / 3)),
      laserShots:Math.max(0, Number(row.kills || 0) * 90),
      rocketShots:Math.max(0, Number(row.kills || 0) * 8),
      missileShots:Math.max(0, Number(row.kills || 0) * 3)
    }
  };
}

export function buildFallbackPilotProfile(row = {}){
  const firm = getFirmDefinition(normalizeFirmId(row.firmId || "astra"));
  return {
    key:String(row.key || row.name || "pilot"),
    name:String(row.name || row.pilot || "Pilote"),
    firm:{id:firm.id, label:firm.label, color:firm.color},
    title:null,
    level:Math.max(1, Number(row.level || 1)),
    sourceLabel:"Profil public partiel",
    rank:null,
    ranking:{displayRank:Number(row.displayRank || row.rank || 0), contribution:Number(row.points || 0)},
    ship:null,
    loadout:{lasers:[], generators:[], missileLauncher:null, rocketLauncher:null, extras:[]},
    drones:{owned:0, equipped:0, upgraded:0, formation:null, lasers:[], generators:[]},
    progression:{
      playSeconds:0,
      reputation:0,
      totalXp:0,
      totalKills:0,
      totalPlayerKills:0,
      portalClears:0,
      questsCompleted:0,
      prestige:0,
      skillPoints:0,
      laserShots:0,
      rocketShots:0,
      missileShots:0
    }
  };
}

export function registerPilotProfile(profile){
  const cleanProfile = profile || buildFallbackPilotProfile();
  const key = String(cleanProfile.key || cleanProfile.name || `pilot:${profileRegistry.size + 1}`);
  profileRegistry.set(key, cleanProfile);
  return key;
}

export function installPilotProfileModal(){
  if(profileEventsInstalled) return;
  profileEventsInstalled = true;
  document.addEventListener("click", event=>{
    const openButton = event.target.closest?.("[data-pilot-profile-key]");
    if(openButton){
      const profile = profileRegistry.get(openButton.dataset.pilotProfileKey);
      if(profile){
        activeProfile = profile;
        renderPilotProfileModal();
        event.preventDefault();
      }
      return;
    }
    if(event.target.closest?.("[data-pilot-profile-close]") || event.target.classList?.contains("pilot-profile-modal")){
      activeProfile = null;
      renderPilotProfileModal();
    }
  });
  document.addEventListener("keydown", event=>{
    if(event.key === "Escape" && activeProfile){
      activeProfile = null;
      renderPilotProfileModal();
    }
  });
}

function renderMetric(label, value, detail = ""){
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
}

function itemStatText(item){
  if(item?.category === "canon" && item?.stats?.degats) return `Dégâts ${item.stats.degats}`;
  if(item?.stats?.bouclier) return `Bouclier ${fmt(item.stats.bouclier)}`;
  if(item?.stats?.vitesse) return `Vitesse +${fmt(item.stats.vitesse)}`;
  if(item?.stats?.extra) return item.stats.extra;
  if(["missileLauncher", "rocketLauncher"].includes(item?.slotType)) return "Module";
  return item?.rarity || "";
}

function renderItemCard(item){
  if(!item) return "";
  return `<article class="pilot-profile-item">
    <img src="${escapeHtml(item.img || "assets/materials/cargo_box.svg")}" alt="">
    <div>
      <strong>${escapeHtml(item.short || item.name)}</strong>
      <span>${escapeHtml(itemStatText(item))}</span>
      ${Number(item.upgradeLevel || 0) > 0 ? `<small>+${fmt(item.upgradeLevel)}</small>` : ""}
    </div>
  </article>`;
}

function renderItemList(title, items = [], emptyLabel = "Aucun"){
  return `<section class="pilot-profile-loadout-panel">
    <div class="pilot-profile-panel-head"><span>${escapeHtml(title)}</span><b>${fmt(items.length)}</b></div>
    <div class="pilot-profile-item-list">${items.length ? items.map(renderItemCard).join("") : `<p>${escapeHtml(emptyLabel)}</p>`}</div>
  </section>`;
}

function renderSingleTechCard(title, item, emptyLabel){
  return `<section class="pilot-profile-loadout-panel">
    <div class="pilot-profile-panel-head"><span>${escapeHtml(title)}</span><b>${item ? "1" : "0"}</b></div>
    <div class="pilot-profile-item-list">${item ? renderItemCard(item) : `<p>${escapeHtml(emptyLabel)}</p>`}</div>
  </section>`;
}

function renderShip(profile){
  const ship = profile.ship;
  if(!ship){
    return `<section class="pilot-profile-ship empty"><span>VAISSEAU</span><h3>Non synchronisé</h3><p>Ce classement ne contient pas encore le détail du vaisseau.</p></section>`;
  }
  const stats = ship.stats || {};
  return `<section class="pilot-profile-ship">
    <div class="pilot-profile-ship-art"><img src="${escapeHtml(ship.combatImg || ship.img)}" alt="${escapeHtml(ship.name)}"></div>
    <div>
      <span>VAISSEAU ACTIF</span>
      <h3>${escapeHtml(ship.name)}</h3>
      <p>${escapeHtml(ship.className || "")}</p>
      <div class="pilot-profile-ship-stats">
        ${renderMetric("PV", fmt(stats.vie || 0))}
        ${renderMetric("Vitesse", fmt(stats.vitesse || 0))}
        ${renderMetric("Lasers", fmt(stats.maxLasers || 0))}
        ${renderMetric("Générateurs", fmt(stats.maxGenerators || 0))}
      </div>
    </div>
  </section>`;
}

function renderFormationTech(profile){
  const formation = profile.drones?.formation;
  const formationCard = formation ? {
    id:formation.id,
    name:formation.name,
    short:formation.short || formation.name,
    img:formation.img,
    rarity:formation.rarity,
    stats:{extra:formation.stats?.bonus || "Formation"}
  } : null;
  return renderSingleTechCard("Formation drone", formationCard, "Formation inconnue");
}

function renderPilotProfileModal(){
  const root = profileRoot();
  if(!activeProfile){
    root.innerHTML = "";
    return;
  }
  const profile = activeProfile;
  const progression = profile.progression || {};
  const rank = profile.rank;
  const ranking = profile.ranking || {};
  const loadout = profile.loadout || {};
  const drones = profile.drones || {};
  const firm = profile.firm || getFirmDefinition("astra");
  const titleLine = [profile.title, rank?.name, `Niv. ${fmt(profile.level || 1)}`].filter(Boolean).join(" - ");

  root.innerHTML = `<div class="pilot-profile-modal" role="dialog" aria-modal="true" aria-label="Profil joueur">
    <section class="pilot-profile-window frame" style="--pilot-firm-color:${escapeHtml(firm.color || "#38bdf8")}">
      <header class="pilot-profile-head">
        <div class="pilot-profile-identity">
          <img class="pilot-profile-rank" src="${escapeHtml(rank?.asset || "assets/ranks/01_Recrue.svg")}" alt="">
          <div>
            <span class="tiny">${escapeHtml(firm.label || "Firme")} ${profile.sourceLabel ? `- ${escapeHtml(profile.sourceLabel)}` : ""}</span>
            <h3>${escapeHtml(profile.name || "Pilote")}</h3>
            <p>${escapeHtml(titleLine || "Profil public")}</p>
          </div>
        </div>
        <button class="pilot-profile-close" type="button" data-pilot-profile-close aria-label="Fermer">×</button>
      </header>
      <div class="pilot-profile-summary">
        ${renderMetric("Classement", ranking.displayRank ? `Top ${fmt(ranking.displayRank)}` : "--", ranking.contribution ? `${fmt(ranking.contribution)} pts` : "")}
        ${renderMetric("Score grade", rank ? fmt(rank.score || 0) : "--", rank?.name || "")}
        ${renderMetric("Temps de jeu", formatHours(progression.playSeconds))}
        ${renderMetric("Drones", `${fmt(drones.equipped || 0)} / ${fmt(drones.owned || 0)}`, drones.upgraded ? `${fmt(drones.upgraded)} amélioré(s)` : "")}
        ${renderMetric("Kills", fmt(progression.totalKills || 0), `${fmt(progression.totalPlayerKills || 0)} joueurs`)}
        ${renderMetric("Portails", fmt(progression.portalClears || 0))}
      </div>
      <div class="pilot-profile-main">
        ${renderShip(profile)}
        <section class="pilot-profile-stats">
          ${renderMetric("Réputation", fmt(progression.reputation || 0))}
          ${renderMetric("XP totale", fmt(progression.totalXp || 0))}
          ${renderMetric("Prestige", fmt(progression.prestige || 0))}
          ${renderMetric("Points compétence", fmt(progression.skillPoints || 0))}
          ${renderMetric("Tirs laser", fmt(progression.laserShots || 0))}
          ${renderMetric("Quêtes", fmt(progression.questsCompleted || 0))}
        </section>
      </div>
      <div class="pilot-profile-loadout-grid">
        ${renderItemList("Lasers vaisseau", loadout.lasers || [], "Aucun laser visible")}
        ${renderItemList("Générateurs", loadout.generators || [], "Aucun générateur visible")}
        ${renderItemList("Extras", loadout.extras || [], "Aucun extra visible")}
        ${renderItemList("Lasers drones", drones.lasers || [], "Aucun laser de drone")}
        ${renderItemList("Générateurs drones", drones.generators || [], "Aucun générateur de drone")}
        ${renderFormationTech(profile)}
      </div>
    </section>
  </div>`;
}
