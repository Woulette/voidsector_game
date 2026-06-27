import { getFirmDefinition, normalizeFirmId } from "../../data/firms.js";
import { ammoTypes, rawMaterialCatalog } from "../../data/catalog.js";
import { hasCompactQuestAsset } from "../../data/enemyVisuals.js";
import { getFirmIndividualRewardTiers } from "../../shared/firmSeasonRewards.js";

const FIRM_CHEST_ASSETS = {
  common:"assets/firm/chests/chest_common.svg",
  rare:"assets/firm/chests/chest_rare.svg",
  veryRare:"assets/firm/chests/chest_veryRare.svg",
  elite:"assets/firm/chests/chest_elite.svg",
  mythic:"assets/firm/chests/chest_mythic.svg"
};

const FIRM_SHOP_RARITIES = {
  common:"Commun",
  rare:"Rare",
  veryRare:"Tres rare",
  elite:"Elite",
  mythic:"Mythique"
};

const QUEST_OBJECTIVE_ASSETS = {
  portal:["assets/portals/portail_bleu.svg"],
  portals:["assets/portals/portail_bleu.svg"],
  drone_pirate:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png"],
  sentinel_orb:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png"],
  raider_astral:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png"],
  pondeuse_astrale:["assets/enemies/generated/astra4_astral_brood.png"],
  monster:[
    "assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png",
    "assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png",
    "assets/enemies/enemy_green_parasite.png"
  ],
  pvp:["assets/ships/Razorion.png"]
};

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function fmt(value){
  return Math.max(0, Number(value || 0)).toLocaleString("fr-FR");
}

function duration(ms){
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if(days) return `${days}j ${hours}h`;
  if(hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function badge(firmId){
  return `assets/firms/${normalizeFirmId(firmId || "astra")}.svg`;
}

function firmatonIcon(className = "combat-firmaton-icon"){
  return `<img class="${className}" src="assets/icons/firmaton.svg" alt="">`;
}

function firmatonAmount(value){
  return `<span class="combat-firmaton-amount">${fmt(value)}${firmatonIcon("combat-firmaton-icon inline")}</span>`;
}

function questKindLabel(quest){
  if(quest.kind === "weekly" || quest.kind === "seasonal") return "Hebdomadaire";
  return "Journaliere";
}

function rewardItems(reward = {}){
  const items = [];
  if(reward.premium) items.push({label:"NOVA", amount:reward.premium, asset:"assets/icons/premium.svg"});
  if(reward.firmatons) items.push({label:"Firmatons", amount:reward.firmatons, asset:"assets/icons/firmaton.svg"});
  for(const [id, amount] of Object.entries(reward.ammo || {})){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    items.push({label:ammo?.short || ammo?.name || id, amount, asset:ammo?.img || "assets/equipment/module_munitions.svg"});
  }
  for(const [rarity, amount] of Object.entries(reward.boxes || {})){
    items.push({label:`Coffre ${FIRM_SHOP_RARITIES[rarity] || rarity}`, amount, asset:FIRM_CHEST_ASSETS[rarity] || FIRM_CHEST_ASSETS.common});
  }
  for(const [id, amount] of Object.entries(reward.materials || {})){
    const material = rawMaterialCatalog.find(entry=>entry.id === id);
    items.push({label:material?.name || id.replaceAll("_", " "), amount, asset:material?.img || "assets/materials/cargo_box.svg"});
  }
  return items;
}

function rewardHtml(reward = {}){
  const items = rewardItems(reward);
  if(!items.length) return `<span class="combat-firm-reward-empty">Aucun gain</span>`;
  return `<span class="combat-firm-reward-items">${items.map(item=>`
    <span class="combat-firm-reward-item" title="${escapeHtml(item.label)}">
      <img src="${escapeHtml(item.asset)}" alt="">
      <span><b>${fmt(item.amount)}</b><small>${escapeHtml(item.label)}</small></span>
    </span>`).join("")}</span>`;
}

function rewardGift(label, reward = {}){
  return `<button class="combat-firm-reward-gift" data-firm-reward-gift type="button" aria-label="Voir le lot ${escapeHtml(label)}">
    <img src="assets/icons/season-gift.svg" alt="">
    <span class="combat-firm-reward-tooltip-source" hidden>
      <strong>${escapeHtml(label)}</strong>
      ${rewardHtml(reward)}
      <small>Un seul lot individuel est verse : celui du meilleur palier atteint.</small>
    </span>
  </button>`;
}

function questObjectiveImages(quest = {}){
  if(quest.type === "portal") return QUEST_OBJECTIVE_ASSETS.portal;
  if(quest.type === "pvp") return QUEST_OBJECTIVE_ASSETS.pvp;
  const target = String(quest.target || "");
  if(target === "*") return QUEST_OBJECTIVE_ASSETS.monster;
  return QUEST_OBJECTIVE_ASSETS[target] || QUEST_OBJECTIVE_ASSETS.monster.slice(0, 1);
}

function objectiveImageClass(quest, src){
  const target = String(quest?.target || "");
  return hasCompactQuestAsset(target) || /(?:low_orbe|low_vorak)/.test(String(src || "")) ? "large" : "";
}

function renderObjectiveVisual(quest){
  const images = questObjectiveImages(quest);
  return `<div class="combat-firm-objective ${images.length > 1 ? "multi" : ""}">
    ${images.map((src, index)=>`<img class="${objectiveImageClass(quest, src)}" src="${escapeHtml(src)}" alt="${escapeHtml(index === 0 ? quest.targetLabel || quest.label || "" : "")}">`).join("")}
    ${quest.locked ? `<span><b>OUVRE</b>${duration(Number(quest.opensAt || quest.startedAt || 0) - Date.now())}</span>` : ""}
  </div>`;
}

function renderFirms(snapshot){
  const ownFirmId = normalizeFirmId(snapshot.personal?.firmId || "astra");
  return `<div class="combat-firm-list">${(snapshot.firms || []).map(firm=>`
    <article class="${firm.id === ownFirmId ? "own" : ""}" style="--firm-color:${escapeHtml(firm.color || getFirmDefinition(firm.id).color)}">
      <b>${firm.rank || "-"}</b><img src="${badge(firm.id)}" alt=""><div><strong>${escapeHtml(firm.label || firm.id)}</strong><span>${fmt(firm.points)} points</span></div>
    </article>`).join("")}</div>`;
}

function renderRankings(snapshot){
  return `<div class="combat-firm-player-head"><span>#</span><span>Joueur</span><span>Points</span><span>Top</span></div>
    <div class="combat-firm-player-list">${(snapshot.individualRanking || []).slice(0, 40).map(row=>`
      <article class="${row.key === snapshot.personal?.key ? "own" : ""}">
        <b>${row.rank || "-"}</b><div><img src="${badge(row.firmId)}" alt=""><strong>${escapeHtml(row.name)}</strong></div><span>${fmt(row.points)}</span><em>${escapeHtml(row.rewardLabel || (row.rank ? `Top ${row.rank}` : "Non classe"))}</em>
      </article>`).join("") || `<p class="social-empty">Aucun joueur classe.</p>`}</div>`;
}

function renderQuestModeTabs(activeMode){
  return `<div class="combat-firm-subtabs">
    <button class="${activeMode === "daily" ? "active" : ""}" data-firm-panel-tab="quests" type="button">JOURNALIERES</button>
    <button class="${activeMode === "weekly" ? "active" : ""}" data-firm-panel-tab="weekly-quests" type="button">HEBDO</button>
    <button class="${activeMode === "seasonal" ? "active" : ""}" data-firm-panel-tab="seasonal-objectives" type="button">SAISON</button>
  </div>`;
}

function renderQuestRow(snapshot, quest){
  const firmId = normalizeFirmId(snapshot.personal?.firmId || "astra");
  const own = quest.firms?.[firmId] || {};
  const locked = Boolean(quest.locked);
  const progress = locked ? 0 : Math.max(0, Number(own.progress || 0));
  const goal = Math.max(1, Number(quest.goal || 1));
  const percent = Math.min(100, progress / goal * 100);
  const complete = Boolean(own.completedAt);
  const firmPoints = complete ? Number(own.firmPointsAwarded || 0) : Number(quest.currentFirmPoints || quest.firmPoints || 0);
  const claimFirmatons = Math.max(0, Number(quest.claimFirmatons || 0));
  const action = locked
    ? `<span class="combat-firm-status">Verrouillee</span>`
    : quest.claimable
      ? `<button class="combat-firm-claim small" data-social-action="firm-quest-claim" data-firm-quest-claim="${escapeHtml(quest.id)}" type="button">Reclamer ${firmatonAmount(claimFirmatons)}</button>`
      : quest.claimed
        ? `<span class="combat-firm-status done">Prime recuperee</span>`
        : complete
          ? `<span class="combat-firm-status done">Terminee</span>`
          : `<span class="combat-firm-status">En cours</span>`;
  return `<article class="combat-firm-quest-card ${complete ? "complete" : ""} ${locked ? "locked" : ""}">
    ${renderObjectiveVisual(quest)}
    <div class="combat-firm-quest-main">
      <div class="combat-firm-quest-head">
        <div><strong>${escapeHtml(quest.label)}</strong><span>${questKindLabel(quest)} - ${escapeHtml(quest.targetLabel || "Objectif")}</span></div>
        <b>${locked ? duration(Number(quest.opensAt || quest.startedAt || 0) - Date.now()) : complete ? "OK" : duration(Number(quest.endsAt || 0) - Date.now())}</b>
      </div>
      <div class="combat-firm-progress"><span style="width:${percent}%"></span></div>
      <div class="combat-firm-quest-stats">
        <span>Objectif <b>${fmt(progress)} / ${fmt(goal)}</b></span>
        <span>Actions <b>${fmt(quest.player?.contribution || 0)}</b></span>
        <span>Top quete <b>${quest.player?.rank ? `Top ${fmt(quest.player.rank)}` : "Non classe"}</b></span>
        <span>Firme <b>+${fmt(firmPoints)}</b></span>
      </div>
      <div class="combat-firm-rivals">${(snapshot.firms || []).map(firm=>{
        const data = quest.firms?.[firm.id] || {};
        const rivalProgress = Math.max(0, Number(data.progress || 0));
        return `<span style="--firm-color:${escapeHtml(firm.color || getFirmDefinition(firm.id).color)}"><img src="${badge(firm.id)}" alt=""><b>${fmt(rivalProgress)}</b><i><em style="width:${Math.min(100, rivalProgress / goal * 100)}%"></em></i></span>`;
      }).join("")}</div>
      <div class="combat-firm-actions">${action}</div>
    </div>
  </article>`;
}

function renderQuestList(snapshot, quests, mode){
  return `${renderQuestModeTabs(mode)}
    <div class="combat-firm-quest-list">${quests.map(quest=>renderQuestRow(snapshot, quest)).join("") || `<p class="social-empty">Aucune quete active.</p>`}</div>`;
}

function renderSeasonObjectiveCard(objective){
  const progress = Math.max(0, Number(objective.progress || 0));
  const goal = Math.max(1, Number(objective.goal || 1));
  const percent = Math.min(100, progress / goal * 100);
  const complete = Boolean(objective.completedAt);
  const action = objective.claimable
    ? `<button class="combat-firm-claim small" data-social-action="firm-season-objective-claim" data-firm-season-objective-claim="${escapeHtml(objective.id)}" type="button">Reclamer</button>`
    : objective.claimed
      ? `<span class="combat-firm-status done">Prime recuperee</span>`
      : `<span class="combat-firm-status">${complete ? "Termine" : "En cours"}</span>`;
  return `<article class="combat-firm-season-card ${complete ? "complete" : ""}">
    ${renderObjectiveVisual(objective)}
    <div>
      <strong>${escapeHtml(objective.label)}</strong>
      <span>${escapeHtml(objective.targetLabel || "Objectif saisonnier")}</span>
      <div class="combat-firm-progress"><span style="width:${percent}%"></span></div>
      <small>${fmt(progress)} / ${fmt(goal)} - +${fmt(objective.firmPoints || 0)} points</small>
      <div class="combat-firm-season-reward">${rewardHtml(objective.reward)}</div>
      <div class="combat-firm-actions">${action}</div>
    </div>
  </article>`;
}

function renderSeasonObjectives(snapshot){
  return `${renderQuestModeTabs("seasonal")}
    <div class="combat-firm-season-list">${(snapshot.seasonObjectives || []).map(renderSeasonObjectiveCard).join("") || `<p class="social-empty">Aucun objectif saisonnier synchronise.</p>`}</div>`;
}

function renderRewards(snapshot){
  const ranking = snapshot.individualRanking || [];
  const totalPlayers = Math.max(ranking.length, Number(snapshot.individualPlayerCount || 0));
  const tiers = getFirmIndividualRewardTiers(totalPlayers);
  const fixedTiers = tiers.filter(tier=>tier.kind === "fixed");
  const percentTiers = tiers.filter(tier=>tier.kind !== "fixed");
  const personal = snapshot.personal || {};
  const contribution = Math.max(0, Number(personal.contribution || 0));
  const threshold = Math.max(1, Number(snapshot.collectiveMinimumContribution || 10_000));
  const thresholdPercent = Math.min(100, contribution / threshold * 100);
  const ownFirm = (snapshot.firms || []).find(firm=>firm.id === normalizeFirmId(personal.firmId || "astra"));
  const pending = personal.pendingRewards || [];
  return `<div class="combat-firm-reward-summary">
      <article><span>Ta position</span><strong>${escapeHtml(personal.rewardLabel || "Non classe")}</strong><small>${rewardHtml(personal.expectedReward || {})}</small></article>
      <article><span>Seuil collectif</span><strong>${personal.collectiveEligible ? "Eligible" : "Non eligible"}</strong><small>${fmt(contribution)} / ${fmt(threshold)} points</small><i><em style="width:${thresholdPercent}%"></em></i></article>
      <article><span>Lot collectif actuel</span><strong>Top ${ownFirm?.rank || "-"}</strong><small>${rewardHtml(ownFirm?.collectiveReward || {})}</small></article>
    </div>
    <div class="combat-firm-reward-board">
      <div class="combat-firm-reward-title"><span>Top</span><span>Joueur</span><span>Lot</span></div>
      ${fixedTiers.map(tier=>{
        const player = ranking.find(row=>Number(row.rank) === tier.rankStart);
        return `<article class="${personal.rewardLabel === tier.label ? "own" : ""}"><b>${escapeHtml(tier.label)}</b><span>${player ? `${escapeHtml(player.name)} - ${fmt(player.points)} pts` : "Place non occupee"}</span>${rewardGift(tier.label, tier.reward)}</article>`;
      }).join("")}
    </div>
    <div class="combat-firm-percent-board">
      ${percentTiers.map(tier=>`<article class="${personal.rewardLabel === tier.label || (tier.kind === "classified" && personal.rewardLabel === "Joueur classe") ? "own" : ""}">
        <div><b>${escapeHtml(tier.label)}</b><span>${tier.playerCount > 0 ? `Rangs ${fmt(tier.rankStart)} a ${fmt(tier.rankEnd)}` : "Aucun pilote"}</span></div>
        ${rewardGift(tier.label, tier.reward)}
      </article>`).join("")}
    </div>
    <div class="combat-firm-pending">${pending.map(entry=>`<article><strong>${escapeHtml(entry.label || "Gain de firme")}</strong><span>${rewardHtml(entry.reward)}</span></article>`).join("") || `<p class="social-empty">Aucune recompense en attente.</p>`}</div>
    <button class="combat-firm-claim" data-social-action="firm-reward-claim" type="button" ${pending.length ? "" : "disabled"}>Recuperer les recompenses</button>`;
}

function renderOverview(snapshot){
  const firm = snapshot.firms?.find(entry=>entry.id === snapshot.personal?.firmId) || snapshot.firms?.[0];
  const quests = [...(snapshot.dailyQuests || []), ...(snapshot.seasonalQuests || [])].filter(entry=>!entry.locked);
  const quest = quests.find(entry=>!entry.firms?.[snapshot.personal?.firmId]?.completedAt) || quests[0];
  return `<div class="combat-firm-overview">
    <section style="--firm-color:${escapeHtml(firm?.color || "#38bdf8")}"><img src="${badge(firm?.id)}" alt=""><div><span>Ta firme</span><strong>${escapeHtml(firm?.label || "Firme")}</strong><b>Top ${firm?.rank || "-"} - ${fmt(firm?.points)} pts</b></div></section>
    <section><div><span>Contribution</span><strong>${fmt(snapshot.personal?.contribution || 0)} pts</strong><b>${snapshot.personal?.rank ? `Top ${snapshot.personal.rank} global` : "Non classe"}</b></div></section>
    <section><div><span>Gain actuel</span><strong>${escapeHtml(snapshot.personal?.rewardLabel || "Non classe")}</strong><b>${snapshot.personal?.collectiveEligible ? "Collectif eligible" : `${fmt(snapshot.collectiveMinimumContribution || 10_000)} pts requis`}</b></div></section>
  </div>
  ${quest ? `<div class="combat-firm-focus">${renderQuestRow(snapshot, quest)}</div>` : ""}
  ${renderFirms(snapshot)}`;
}

export function renderCombatFirmPanel({snapshot, selectedTab = "overview"} = {}){
  const data = snapshot || {firms:[], individualRanking:[], dailyQuests:[], seasonalQuests:[], seasonObjectives:[], personal:{}};
  const tab = ["overview", "firms", "players", "rankings", "quests", "weekly-quests", "seasonal-objectives", "rewards"].includes(selectedTab) ? selectedTab : "overview";
  const tabs = [
    {id:"overview", label:"Resume"},
    {id:"firms", label:"Firmes"},
    {id:"rankings", label:"Classements"},
    {id:"quests", label:"Quetes"},
    {id:"rewards", label:"Recompenses"}
  ];
  const content = tab === "firms"
    ? renderFirms(data)
    : tab === "players" || tab === "rankings"
      ? renderRankings(data)
      : tab === "quests"
        ? renderQuestList(data, data.dailyQuests || [], "daily")
        : tab === "weekly-quests"
          ? renderQuestList(data, data.seasonalQuests || [], "weekly")
          : tab === "seasonal-objectives"
            ? renderSeasonObjectives(data)
            : tab === "rewards"
              ? renderRewards(data)
              : renderOverview(data);
  return `<div class="combat-firm-season"><span>Saison en cours</span><strong>${duration(Number(data.seasonEndsAt || 0) - Date.now())}</strong></div>
    <div class="firm-tabs combat-firm-tabs">${tabs.map(entry=>`<button class="${(entry.id === "quests" ? ["quests", "weekly-quests", "seasonal-objectives"].includes(tab) : tab === entry.id) ? "active" : ""}" data-firm-panel-tab="${entry.id}" type="button">${entry.label}</button>`).join("")}</div>
    <div class="combat-firm-content">${content}</div>`;
}
