import { FIRMS, getFirmDefinition, normalizeFirmId } from "../data/firms.js";
import { ammoTypes, rawMaterialCatalog } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import { multiplayer } from "../multiplayer/client.js?v=firm-shop-sync-1";
import { store } from "../core/store.js";
import { hasCompactQuestAsset } from "../data/enemyVisuals.js";
import { FIRM_BOOSTER_DEFINITIONS, getFirmBoostersForRank } from "../shared/firmBoosters.js?v=firm-nova-10-1";
import { getFirmIndividualRewardTiers } from "../shared/firmSeasonRewards.js";
import { buildFallbackPilotProfile, installPilotProfileModal, registerPilotProfile } from "./playerProfileModal.js";
import { formatFirmRewardNotificationCount, getFirmRewardNotificationCounts } from "./firmRewardNotifications.js";

const FIRM_TABS = [
  {id:"overview", label:"Vue d'ensemble"},
  {id:"shop", label:"Boutique"},
  {id:"quests", label:"Quêtes"},
  {id:"rankings", label:"Classements"},
  {id:"rewards", label:"Récompenses"}
];

const FIRM_SHOP_RARITIES = [
  {id:"common", label:"Commun", color:"#94a3b8"},
  {id:"rare", label:"Rare", color:"#38bdf8"},
  {id:"veryRare", label:"Très rare", color:"#a78bfa"},
  {id:"elite", label:"Elite", color:"#fb923c"},
  {id:"mythic", label:"Mythique", color:"#facc15"}
];

const FIRM_CHEST_ASSETS = {
  common:"assets/firm/chests/chest_common.svg",
  rare:"assets/firm/chests/chest_rare.svg",
  veryRare:"assets/firm/chests/chest_veryRare.svg",
  elite:"assets/firm/chests/chest_elite.svg",
  mythic:"assets/firm/chests/chest_mythic.svg"
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

function durationLabel(ms){
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if(days) return `${days}j ${hours}h`;
  if(hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isSameLocalDay(time, reference = Date.now()){
  const date = new Date(Number(time || 0));
  const current = new Date(Number(reference || Date.now()));
  return date.getFullYear() === current.getFullYear()
    && date.getMonth() === current.getMonth()
    && date.getDate() === current.getDate();
}

function firmBadge(firmId){
  return `assets/firms/${normalizeFirmId(firmId || "astra")}.svg`;
}

function firmatonIcon(className = "firmaton-icon"){
  return `<img class="${className}" src="assets/icons/firmaton.svg" alt="">`;
}

function firmChestAsset(rarity){
  return FIRM_CHEST_ASSETS[rarity] || FIRM_CHEST_ASSETS.common;
}

function firmatonAmount(value, className = ""){
  return `<span class="firmaton-amount ${className}">${fmt(value)}${firmatonIcon("firmaton-icon firmaton-icon-inline")}</span>`;
}

function notificationBadge(count){
  return count > 0
    ? `<span class="firm-notification-badge">${formatFirmRewardNotificationCount(count)}</span>`
    : "";
}

function rewardItems(reward = {}){
  const items = [];
  if(reward.premium) items.push({id:"premium", label:"NOVA", amount:reward.premium, asset:"assets/icons/premium.svg"});
  if(reward.firmatons) items.push({id:"firmatons", label:"Firmatons", amount:reward.firmatons, asset:"assets/icons/firmaton.svg"});
  for(const [id, amount] of Object.entries(reward.ammo || {})){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    items.push({id, label:ammo?.short || ammo?.name || id, amount, asset:ammo?.img || "assets/equipment/module_munitions.svg"});
  }
  for(const [rarity, amount] of Object.entries(reward.boxes || {})){
    const rarityMeta = FIRM_SHOP_RARITIES.find(entry=>entry.id === rarity);
    items.push({id:`box-${rarity}`, label:`Coffre ${rarityMeta?.label || rarity}`, amount, asset:firmChestAsset(rarity)});
  }
  for(const [id, amount] of Object.entries(reward.materials || {})){
    const material = rawMaterialCatalog.find(entry=>entry.id === id);
    items.push({id, label:material?.name || id.replaceAll("_", " "), amount, asset:material?.img || "assets/materials/cargo_box.svg"});
  }
  return items;
}

function rewardHtml(reward = {}, {compact = false} = {}){
  const items = rewardItems(reward);
  if(!items.length) return `<span class="firm-reward-empty">Aucune récompense</span>`;
  return `<span class="firm-reward-items ${compact ? "compact" : ""}">${items.map(item=>`
    <span class="firm-reward-item" title="${escapeHtml(item.label)}">
      <img src="${escapeHtml(item.asset)}" alt="">
      <span><b>${fmt(item.amount)}</b><small>${escapeHtml(item.label)}</small></span>
    </span>`).join("")}</span>`;
}

function firmBoxRewardView(reward = {}){
  if(reward.kind === "ammo"){
    const ammo = ammoTypes.find(entry=>entry.id === reward.id);
    return {
      title:ammo?.name || reward.label || "Munitions",
      amount:Math.max(0, Number(reward.amount || 0)),
      asset:ammo?.img || "assets/equipment/ammo_laser_x2_same_preview.png",
      detail:`${ammo?.name || reward.label || "Munition"} x ${fmt(reward.amount || 0)}`
    };
  }
  if(reward.kind === "material"){
    const material = rawMaterialCatalog.find(entry=>entry.id === reward.id);
    return {
      title:material?.name || reward.label || "Ressource",
      amount:Math.max(0, Number(reward.amount || 0)),
      asset:material?.img || "assets/materials/cargo_box.svg",
      detail:`${material?.name || reward.label || "Ressource"} x ${fmt(reward.amount || 0)}`
    };
  }
  if(reward.kind === "premium"){
    return {
      title:"Monnaie",
      amount:Math.max(0, Number(reward.amount || 0)),
      asset:"assets/icons/premium.svg",
      detail:`x ${fmt(reward.amount || 0)}`
    };
  }
  return {
    title:reward.label || "Récompense",
    amount:Math.max(0, Number(reward.amount || 0)),
    asset:"assets/materials/cargo_box.svg",
    detail:reward.label || "Récompense obtenue"
  };
}

function renderFirmOpeningChestSvg(rarity){
  return `<svg class="firm-box-opening-chest-svg" style="color:${escapeHtml(rarity.color)}" viewBox="0 0 128 128" aria-hidden="true">
    <ellipse cx="64" cy="108" rx="46" ry="10" fill="#020617" opacity=".55"/>
    <path class="firm-box-opening-light" d="M31 58h66l13 50H18z" fill="currentColor" opacity=".68"/>
    <g class="firm-box-opening-lid">
      <path d="M24 35l15-18h50l15 18v26H24z" fill="currentColor" stroke="#e0f2fe" stroke-width="3"/>
      <path d="M36 27h56l8 11H28z" fill="#020617" opacity=".68"/>
      <path d="M57 38h14v13H57z" fill="#facc15" stroke="#020617" stroke-width="3"/>
    </g>
    <path d="M20 54h88l-8 52H28z" fill="currentColor" stroke="#e0f2fe" stroke-width="3"/>
    <path d="M29 64h70l-5 31H34z" fill="#020617" opacity=".68"/>
    <path d="M57 59h14v20H57z" fill="#facc15" stroke="#020617" stroke-width="3"/>
    <path d="M21 73h86M30 96h68" stroke="#f8fafc" stroke-opacity=".62" stroke-width="3"/>
  </svg>`;
}

function renderFirmBoxOpening(){
  const event = store.firmBoxOpening;
  if(!event) return "";
  const rarityId = event.boxRarity || event.rewardRarity || "common";
  const rarity = FIRM_SHOP_RARITIES.find(entry=>entry.id === rarityId) || FIRM_SHOP_RARITIES[0];
  const reward = firmBoxRewardView(event.reward || {});
  return `<div class="firm-box-opening-overlay" style="--rarity-color:${rarity.color}">
    <section class="firm-box-opening-modal" aria-live="polite">
      <button class="firm-box-opening-close" data-firm-box-opening-close type="button">FERMER</button>
      <span class="tiny">OUVERTURE DE COFFRE</span>
      <h3>Coffre ${escapeHtml(rarity.label)}</h3>
      <div class="firm-box-opening-scene">
        ${renderFirmOpeningChestSvg(rarity)}
      </div>
      <div class="firm-box-opening-reward">
        <span>Récompense obtenue</span>
        <img src="${escapeHtml(reward.asset)}" alt="${escapeHtml(reward.title)}">
        <h4>${escapeHtml(reward.title)}</h4>
        <strong>${escapeHtml(reward.detail)}</strong>
      </div>
    </section>
  </div>`;
}

const QUEST_OBJECTIVE_ASSETS = {
  portal:["assets/portals/portail_bleu.svg"],
  portals:["assets/portals/portail_bleu.svg"],
  drone_pirate:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png"],
  sentinel_orb:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png"],
  raider_astral:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png"],
  pondeuse_astrale:["assets/enemies/generated/astra4_astral_brood.png"],
  monster:["assets/enemies/generated/orbe_vorak_lowlevel_01/low_orbe_01.png", "assets/enemies/generated/orbe_vorak_lowlevel_01/low_vorak_03.png", "assets/enemies/enemy_green_parasite.png"],
  pvp:["assets/ships/Razorion.png"]
};

function questObjectiveImages(quest){
  if(quest.type === "portal") return QUEST_OBJECTIVE_ASSETS.portal;
  if(quest.type === "pvp") return QUEST_OBJECTIVE_ASSETS.pvp;
  const target = String(quest.target || "");
  if(target === "*") return QUEST_OBJECTIVE_ASSETS.monster;
  return QUEST_OBJECTIVE_ASSETS[target] || QUEST_OBJECTIVE_ASSETS.monster.slice(0, 1);
}

function objectiveImageClass(quest, src){
  const target = String(quest?.target || "");
  return hasCompactQuestAsset(target) || /(?:low_orbe|low_vorak)/.test(String(src || "")) ? "quest-enemy-art-large" : "";
}

function lockSvg(){
  return `<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
    <path d="M18 28v-8c0-8 6-14 14-14s14 6 14 14v8" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <rect x="12" y="26" width="40" height="30" rx="4" fill="currentColor" opacity=".92"/>
    <path d="M32 36a5 5 0 0 0-3 9l-1 6h8l-1-6a5 5 0 0 0-3-9z" fill="#03111f"/>
  </svg>`;
}

function renderQuestObjectiveVisual(quest){
  const images = questObjectiveImages(quest);
  const locked = Boolean(quest.locked);
  return `<div class="firm-quest-objectives ${images.length > 1 ? "multi" : ""}">
    ${images.map((src, index)=>`<img class="${objectiveImageClass(quest, src)}" src="${escapeHtml(src)}" alt="${escapeHtml(index === 0 ? quest.targetLabel || quest.label : "")}">`).join("")}
    ${locked ? `<span class="firm-quest-lock-overlay">${lockSvg()}<b>OUVERTURE<br>${durationLabel(Number(quest.opensAt || quest.startedAt || 0) - Date.now())}</b></span>` : ""}
  </div>`;
}

function medalTheme(rank){
  if(rank === 1){
    return {
      tone:"gold",
      face:["#fff8c7", "#facc15", "#b77905", "#5f3300"],
      rim:["#fff7ad", "#f59e0b", "#7c3f00"],
      stroke:"#5f3300",
      shine:"#fff8c7",
      numberFill:"#141006",
      numberStroke:"#fff6b8"
    };
  }
  if(rank === 2){
    return {
      tone:"silver",
      face:["#ffffff", "#dbeafe", "#8ca3bd", "#334155"],
      rim:["#f8fafc", "#94a3b8", "#475569"],
      stroke:"#334155",
      shine:"#ffffff",
      numberFill:"#0f172a",
      numberStroke:"#ffffff"
    };
  }
  if(rank === 3){
    return {
      tone:"bronze",
      face:["#ffe0b2", "#fb923c", "#a14610", "#431407"],
      rim:["#fed7aa", "#c2410c", "#5c1d07"],
      stroke:"#431407",
      shine:"#ffe0b2",
      numberFill:"#170804",
      numberStroke:"#ffd7a3"
    };
  }
  return null;
}

function renderRankMark(rank, scope = "rank"){
  const safeRank = Number(rank || 0);
  const theme = medalTheme(safeRank);
  if(!theme) return `<b class="firm-rank-plain">${safeRank || "-"}</b>`;
  const id = `firm-medal-${scope}-${safeRank}`.replace(/[^a-z0-9_-]/gi, "");
  return `<span class="firm-rank-medal firm-rank-medal-${theme.tone}" aria-label="Top ${safeRank}">
    <svg viewBox="0 0 74 86" focusable="false" aria-hidden="true">
      <defs>
        <radialGradient id="${id}-face" cx="38%" cy="28%" r="70%">
          <stop offset="0" stop-color="${theme.face[0]}"/>
          <stop offset=".3" stop-color="${theme.face[1]}"/>
          <stop offset=".68" stop-color="${theme.face[2]}"/>
          <stop offset="1" stop-color="${theme.face[3]}"/>
        </radialGradient>
        <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${theme.rim[0]}"/>
          <stop offset=".48" stop-color="${theme.rim[1]}"/>
          <stop offset="1" stop-color="${theme.rim[2]}"/>
        </linearGradient>
      </defs>
      <path d="M18 2h15l8 28H25z" class="firm-rank-ribbon-left"/>
      <path d="M41 2h15L49 30H32z" class="firm-rank-ribbon-right"/>
      <circle cx="37" cy="48" r="29" fill="url(#${id}-rim)"/>
      <circle cx="37" cy="48" r="23.5" fill="url(#${id}-face)" stroke="${theme.shine}" stroke-width="1.3"/>
      <path d="M22 44c5-13 24-20 36-8" fill="none" stroke="${theme.shine}" stroke-width="3.5" stroke-linecap="round" opacity=".42"/>
      <circle cx="37" cy="48" r="16" fill="none" stroke="${theme.stroke}" stroke-opacity=".38" stroke-width="2"/>
      <text x="37" y="60" text-anchor="middle" fill="${theme.numberFill}" font-family="Arial Black, Arial, sans-serif" font-size="32" font-weight="900" stroke="${theme.numberStroke}" stroke-width="3" style="paint-order:stroke fill">${safeRank}</text>
    </svg>
  </span>`;
}

function fallbackSnapshot(){
  return {
    seasonEndsAt:0,
    collectiveMinimumContribution:10_000,
    firms:FIRMS.map((firm, index)=>({...firm, rank:index + 1, points:0, collectiveReward:{}})),
    individualRanking:[],
    dailyQuests:[],
    seasonalQuests:[],
    seasonObjectives:[],
    personal:{
      firmId:normalizeFirmId(store.state?.player?.firmId || "astra"),
      contribution:0,
      rank:null,
      rewardLabel:"Non classé",
      collectiveEligible:false,
      pendingRewards:[],
      firmatons:Number(store.state?.firmatons || 0),
      boxes:store.state?.firmBoxes || {},
      rewardHistory:store.state?.firmRewardHistory || [],
      reputation:Number(store.state?.player?.reputation || 0)
    },
    shop:[]
  };
}

function allQuests(snapshot){
  return [
    ...(snapshot.dailyQuests || []),
    ...(snapshot.seasonalQuests || [])
  ];
}

function renderFirmRow(firm, ownFirmId){
  const isOwn = firm.id === ownFirmId;
  return `<article class="firm-main-ranking-row ${firm.id === ownFirmId ? "own" : ""}" style="--firm-color:${escapeHtml(firm.color || getFirmDefinition(firm.id).color)}">
    ${renderRankMark(firm.rank, `firm-${firm.id}`)}
    <img src="${firmBadge(firm.id)}" alt="">
    <div><strong>${escapeHtml(firm.label || firm.id)}</strong>${isOwn ? `<span>Ta firme</span>` : ""}</div>
    <em>${fmt(firm.points || 0)} pts</em>
  </article>`;
}

function renderOverview(snapshot){
  const personal = snapshot.personal || {};
  const ownFirmId = normalizeFirmId(personal.firmId || store.state?.player?.firmId || "astra");
  const ownFirm = snapshot.firms?.find(firm=>firm.id === ownFirmId) || getFirmDefinition(ownFirmId);
  const quests = allQuests(snapshot).filter(quest=>!quest.locked);
  const nextQuest = quests.find(quest=>!quest.firms?.[ownFirmId]?.completedAt) || quests[0];
  const progress = nextQuest?.firms?.[ownFirmId]?.progress || 0;
  return `
    <div class="firm-main-overview-grid">
      <section class="firm-command-card">
        <span class="tiny">SITUATION DE FIRME</span>
        <div class="firm-command-identity">
          <img src="${firmBadge(ownFirmId)}" alt="">
          <div><h3>${escapeHtml(ownFirm?.label || ownFirmId)}</h3><p>Classement saisonnier : Top ${ownFirm?.rank || "-"}</p></div>
        </div>
        <div class="firm-command-score"><span>Points de firme</span><strong>${fmt(ownFirm?.points || 0)}</strong></div>
      </section>
      <section class="firm-personal-card">
        <span class="tiny">TA CONTRIBUTION</span>
        <strong>${fmt(personal.contribution || 0)} pts</strong>
        <p>${personal.rank ? `Top ${personal.rank} mondial` : "Participe pour entrer dans le classement individuel."}</p>
        <div class="firm-threshold-track"><span style="width:${Math.min(100, Number(personal.contribution || 0) / Number(snapshot.collectiveMinimumContribution || 10_000) * 100)}%"></span></div>
        <small>${personal.collectiveEligible ? "Seuil collectif atteint" : `${fmt(snapshot.collectiveMinimumContribution || 10_000)} points requis pour la récompense collective`}</small>
      </section>
      <section class="firm-quest-focus-card">
        <span class="tiny">MISSION COLLECTIVE ACTIVE</span>
        <h3>${escapeHtml(nextQuest?.label || "Synchronisation des missions")}</h3>
        <p>${escapeHtml(nextQuest?.targetLabel || "Connecte-toi au serveur pour recevoir les missions.")}</p>
        <div class="firm-threshold-track"><span style="width:${nextQuest ? Math.min(100, progress / nextQuest.goal * 100) : 0}%"></span></div>
        <small>${fmt(progress)} / ${fmt(nextQuest?.goal || 0)}</small>
      </section>
    </div>
    <div class="firm-main-two-columns">
      <section class="firm-main-block">
        <div class="firm-main-block-head"><div><span class="tiny">GUERRE DES FIRMES</span><h3>Classement actuel</h3></div><b>${durationLabel(Number(snapshot.seasonEndsAt || 0) - Date.now())}</b></div>
        <div class="firm-main-ranking-list">${(snapshot.firms || []).map(firm=>renderFirmRow(firm, ownFirmId)).join("")}</div>
      </section>
      <section class="firm-main-block">
        <div class="firm-main-block-head"><div><span class="tiny">OBJECTIFS</span><h3>Quêtes en cours</h3></div></div>
        <div class="firm-compact-quest-list">${quests.map(quest=>{
          const data = quest.firms?.[ownFirmId] || {};
          return `<article><div><strong>${escapeHtml(quest.label)}</strong><span>${escapeHtml(questKindLabel(quest))} - ${fmt(data.progress || 0)} / ${fmt(quest.goal || 0)}</span></div><b>${quest.player?.contribution ? `Quête : ${fmt(quest.player.contribution)}` : "Non classé"}</b></article>`;
        }).join("") || `<p class="firm-empty">Aucune quête synchronisée.</p>`}</div>
      </section>
    </div>`;
}

function renderShop(snapshot){
  const personal = snapshot.personal || {};
  const boxes = personal.boxes || {};
  const shop = snapshot.shop || [];
  const validFilters = ["global", ...FIRM_SHOP_RARITIES.map(rarity=>rarity.id)];
  const filter = validFilters.includes(store.firmShopFilter) ? store.firmShopFilter : "global";
  const visibleRarities = FIRM_SHOP_RARITIES.filter(rarity=>filter === "global" || filter === rarity.id);
  const renderOffer = item=>`
    <article class="firm-shop-offer ${item.locked ? "locked" : ""}" data-kind="${escapeHtml(item.kind)}">
      <div class="firm-shop-offer-visual">
        <img src="${escapeHtml(item.kind === "box" ? firmChestAsset(item.rarity) : item.asset || "assets/materials/cargo_box.svg")}" alt="">
        <span>${item.kind === "box" ? "COFFRE" : item.kind === "ammo" ? "MUNITIONS" : "RESSOURCE"}</span>
      </div>
      <div class="firm-shop-offer-copy">
        <h4>${escapeHtml(item.label)}</h4>
        <p>${escapeHtml(item.description || "")}</p>
        <strong class="firm-shop-price">${firmatonAmount(item.price)}${item.basePrice && item.basePrice !== item.price ? ` <small>${firmatonAmount(item.basePrice)}</small>` : ""}</strong>
      </div>
      <button data-firm-shop-buy="${escapeHtml(item.id)}" type="button" ${item.locked ? "disabled" : ""}>${item.locked ? "VERROUILLE" : "ACHETER"}</button>
    </article>`;
  const renderRarityZone = rarity=>{
    const items = shop.filter(item=>item.rarity === rarity.id);
    const stages = [1, 2, 3].map(stage=>({
      stage,
      items:items.filter(item=>Number(item.stage || 1) === stage)
    }));
    return `<section class="firm-shop-rarity-zone" style="--rarity-color:${rarity.color}">
      <header>
        <div><span>ZONE DE RARETE</span><h3>${rarity.label}</h3></div>
        <b>${items.length} OFFRES</b>
      </header>
      <div class="firm-shop-stage-list">${stages.map(({stage, items:stageItems})=>{
        const threshold = stageItems.length ? Math.min(...stageItems.map(item=>Number(item.reputationRequired || 0))) : 0;
        const unlocked = Number(personal.reputation || 0) >= threshold;
        return `<div class="firm-shop-stage ${unlocked ? "unlocked" : "locked"}">
          <aside><span>PALIER ${stage}</span><strong>${fmt(threshold)}</strong><small>REPUTATION</small><b>${unlocked ? "DEBLOQUE" : "VERROUILLE"}</b></aside>
          <div class="firm-shop-stage-offers">${stageItems.map(renderOffer).join("")}</div>
        </div>`;
      }).join("")}</div>
    </section>`;
  };
  return `
    <div class="firm-shop-header">
      <div><span class="tiny">MONNAIE DE FIRME</span><strong class="firm-shop-currency">${firmatonAmount(personal.firmatons || 0)}</strong><p>Reputation : ${fmt(personal.reputation || 0)}</p></div>
      <div class="firm-box-vault">${FIRM_SHOP_RARITIES.map(rarity=>`
        <article style="--rarity-color:${rarity.color}"><img src="${firmChestAsset(rarity.id)}" alt=""><span>${escapeHtml(rarity.label)}</span><b>${fmt(boxes[rarity.id] || 0)}</b><button data-firm-box-open="${rarity.id}" type="button" ${Number(boxes[rarity.id] || 0) > 0 ? "" : "disabled"}>OUVRIR</button></article>
      `).join("")}</div>
    </div>
    <nav class="firm-shop-filters">
      <button class="${filter === "global" ? "active" : ""}" data-firm-shop-filter="global" type="button">GLOBAL</button>
      ${FIRM_SHOP_RARITIES.map(rarity=>`<button class="${filter === rarity.id ? "active" : ""}" style="--rarity-color:${rarity.color}" data-firm-shop-filter="${rarity.id}" type="button">${rarity.label}</button>`).join("")}
    </nav>
    <div class="firm-shop-catalog">
      ${shop.length ? visibleRarities.map(renderRarityZone).join("") : `<p class="firm-empty">Connecte-toi au serveur pour charger la boutique de firme.</p>`}
    </div>`;
}

function questKindLabel(quest){
  if(quest.kind === "weekly" || quest.kind === "seasonal") return "Hebdomadaire";
  return "Journalière";
}

function renderQuestModeTabs(mode, notificationCounts){
  const counts = notificationCounts || {daily:0, weekly:0, seasonal:0};
  return `<div class="firm-quest-mode-tabs">
    <button class="${mode === "daily" ? "active" : ""}" data-firm-quest-tab="daily" type="button">JOURNALIERES ${notificationBadge(counts.daily)}</button>
    <button class="${mode === "weekly" ? "active" : ""}" data-firm-quest-tab="weekly" type="button">HEBDOMADAIRES ${notificationBadge(counts.weekly)}</button>
    <button class="${mode === "seasonal" ? "active" : ""}" data-firm-quest-tab="seasonal" type="button">SAISONNIERES ${notificationBadge(counts.seasonal)}</button>
  </div>`;
}

function renderQuestRivals(snapshot, quest){
  const firms = snapshot.firms || [];
  const goal = Math.max(1, Number(quest.goal || 1));
  return `<div class="firm-quest-rival-strip">
    ${firms.map(firm=>{
      const data = quest.firms?.[firm.id] || {};
      const progress = Math.max(0, Number(data.progress || 0));
      const percent = Math.min(100, progress / goal * 100);
      return `<div style="--firm-color:${escapeHtml(firm.color || getFirmDefinition(firm.id).color)}">
        <img src="${firmBadge(firm.id)}" alt="">
        <span>${fmt(progress)}</span>
        <i><b style="width:${percent}%"></b></i>
      </div>`;
    }).join("")}
  </div>`;
}

function renderQuestRow(snapshot, quest, ownFirmId){
  const own = quest.firms?.[ownFirmId] || {};
  const locked = Boolean(quest.locked);
  const progress = locked ? 0 : Math.max(0, Number(own.progress || 0));
  const goal = Math.max(1, Number(quest.goal || 1));
  const percent = Math.min(100, progress / goal * 100);
  const playerContribution = Number(quest.player?.contribution || 0);
  const playerRank = quest.player?.rank ? `Top ${quest.player.rank}` : "Non classé";
  const complete = Boolean(own.completedAt);
  const firmPoints = Math.max(0, Number(quest.firmPoints || 0));
  const currentFirmPoints = Math.max(0, Number(quest.currentFirmPoints || firmPoints));
  const claimFirmatons = Math.max(0, Number(quest.claimFirmatons || 0));
  const pointsLabel = complete
    ? `+${fmt(own.firmPointsAwarded || 0)}`
    : `+${fmt(firmPoints)} max`;
  const pointsDetail = !locked && !complete && currentFirmPoints !== firmPoints
    ? `<small>Actuel +${fmt(currentFirmPoints)}</small>`
    : "";
  const timerLabel = locked
    ? `OUVRE DANS ${durationLabel(Number(quest.opensAt || quest.startedAt || 0) - Date.now())}`
    : complete
      ? "TERMINÉE"
      : `Ferme ${durationLabel(Number(quest.endsAt || 0) - Date.now())}`;
  const claimButton = locked
    ? `<span class="firm-quest-status">Verrouillée</span>`
    : quest.claimable
      ? `<button class="firm-quest-claim" data-firm-quest-claim="${escapeHtml(quest.id)}" type="button">RÉCLAMER ${firmatonAmount(claimFirmatons)}</button>`
      : quest.claimed
        ? `<button class="firm-quest-claim claimed" type="button" disabled>RÉCOMPENSE RÉCUPÉRÉE</button>`
        : complete
          ? `<span class="firm-quest-status done">Terminée</span>`
          : `<span class="firm-quest-status">En cours</span>`;
  return `<article class="firm-quest-row ${complete ? "complete" : ""} ${locked ? "locked" : ""}">
    ${renderQuestObjectiveVisual(quest)}
    <div class="firm-quest-row-main">
      <div class="firm-quest-row-head">
        <div><span>${escapeHtml(questKindLabel(quest))} - ${escapeHtml(quest.targetLabel || "Objectif")}</span><h3>${escapeHtml(quest.label)}</h3></div>
        <b>${escapeHtml(timerLabel)}</b>
      </div>
      <div class="firm-quest-progress"><span style="width:${percent}%"></span></div>
      <div class="firm-quest-row-score"><strong>${fmt(progress)} / ${fmt(goal)}</strong><small>${Math.round(percent)}%</small></div>
      <div class="firm-quest-row-stats">
        <span>Actions sur cette quête <b>${fmt(playerContribution)}</b><small>Ne donne pas de point individuel</small></span>
        <span>Rang de la quête <b>${escapeHtml(playerRank)}</b></span>
        <span>Points pour la firme <b>${pointsLabel}</b>${pointsDetail}</span>
        <span>Prime pilote <b>${firmatonAmount(claimFirmatons)}</b><small>0 point individuel</small></span>
      </div>
      ${renderQuestRivals(snapshot, quest)}
      <div class="firm-quest-actions">${claimButton}</div>
    </div>
  </article>`;
}

function renderQuestSessions(quests, ownFirmId){
  return `<div class="firm-open-session-list">
    ${quests.map(quest=>{
      const locked = Boolean(quest.locked);
      const progress = Math.max(0, Number(quest.firms?.[ownFirmId]?.progress || 0));
      const goal = Math.max(1, Number(quest.goal || 1));
      const percent = Math.min(100, progress / goal * 100);
      return `<article>
        <div><strong>${escapeHtml(quest.label)}</strong><span>${locked ? `Dans ${durationLabel(Number(quest.opensAt || quest.startedAt || 0) - Date.now())}` : `${fmt(progress)} / ${fmt(goal)}`}</span></div>
        <div class="firm-open-session-track"><span style="width:${percent}%"></span></div>
      </article>`;
    }).join("") || `<p class="firm-empty">Aucune session aujourd'hui.</p>`}
  </div>`;
}

function renderQuestSummary(snapshot, quests, ownFirmId, mode, notificationCounts){
  const activeQuests = quests.filter(quest=>!quest.locked);
  const lockedQuests = quests
    .filter(quest=>quest.locked)
    .sort((a, b)=>Number(a.opensAt || a.startedAt || 0) - Number(b.opensAt || b.startedAt || 0));
  const summaryQuests = mode === "daily"
    ? quests.filter(quest=>isSameLocalDay(quest.startedAt || quest.opensAt))
    : activeQuests;
  const total = summaryQuests.length;
  const completed = summaryQuests.filter(quest=>quest.firms?.[ownFirmId]?.completedAt).length;
  const nextLocked = lockedQuests[0];
  return `<aside class="firm-quest-summary">
    ${renderQuestModeTabs(mode, notificationCounts)}
    <div class="firm-quest-summary-card">
      <span class="tiny">OBJECTIFS DE FIRME</span>
      <h3>${mode === "weekly" ? "Cycle hebdomadaire" : "Cycle journalier"}</h3>
      <strong>${completed} / ${total}</strong>
      <p>Les missions sont actives automatiquement. Elles donnent des points à la firme, pas de points individuels.</p>
      <span class="firm-open-session-title">${mode === "weekly" ? "Quêtes ouvertes" : "Sessions d'aujourd'hui"}</span>
      ${renderQuestSessions(summaryQuests, ownFirmId)}
    </div>
    <div class="firm-quest-summary-metrics">
      <article><span>Prochaine session</span><b>${nextLocked ? `Dans ${durationLabel(Number(nextLocked.opensAt || nextLocked.startedAt || 0) - Date.now())}` : "--"}</b></article>
    </div>
  </aside>`;
}

function renderSeasonObjectiveVisual(objective){
  const images = questObjectiveImages(objective);
  return `<div class="firm-season-objective-visual ${images.length > 1 ? "multi" : ""}">
    ${images.map((src, index)=>`<img class="${objectiveImageClass(objective, src)}" src="${escapeHtml(src)}" alt="${escapeHtml(index === 0 ? objective.targetLabel || objective.label : "")}">`).join("")}
  </div>`;
}

export function renderSeasonObjectiveCard(objective){
  const progress = Math.max(0, Number(objective.progress || 0));
  const goal = Math.max(1, Number(objective.goal || 1));
  const percent = Math.min(100, progress / goal * 100);
  const complete = Boolean(objective.completedAt);
  const claimControl = objective.claimable
    ? `<button class="firm-season-objective-claim" data-firm-season-objective-claim="${escapeHtml(objective.id)}" type="button">RÉCLAMER</button>`
    : objective.claimed
      ? `<button class="firm-season-objective-claim claimed" type="button" disabled>RÉCOMPENSE RÉCUPÉRÉE</button>`
      : `<span class="firm-season-objective-waiting">Termine l'objectif pour réclamer le lot</span>`;
  return `<article class="firm-season-objective-card ${complete ? "complete" : ""}">
    <div class="firm-season-objective-head">
      <span>${escapeHtml(objective.targetLabel || "Objectif")}</span>
      <b>${complete ? "TERMINÉ" : "EN COURS"}</b>
    </div>
    <div class="firm-season-objective-body">
      ${renderSeasonObjectiveVisual(objective)}
      <div>
        <h3>${escapeHtml(objective.label)}</h3>
        <p>${escapeHtml(objective.description || "")}</p>
        <div class="firm-quest-progress"><span style="width:${percent}%"></span></div>
        <strong>${fmt(progress)} / ${fmt(goal)}</strong>
      </div>
    </div>
    <div class="firm-season-objective-meta">
      <span>Points joueur + firme <b>+${fmt(objective.firmPoints || 0)}</b></span>
      <span>Récompense ${rewardHtml(objective.reward)}</span>
    </div>
    <div class="firm-season-objective-actions">${claimControl}</div>
  </article>`;
}

function renderSeasonObjectives(snapshot, ownFirmId){
  const objectives = snapshot.seasonObjectives || [];
  const notificationCounts = getFirmRewardNotificationCounts(snapshot);
  const completed = objectives.filter(objective=>objective.completedAt).length;
  const nextObjective = objectives.find(objective=>!objective.completedAt) || objectives[0];
  const firmPoints = objectives.filter(objective=>objective.completedAt).reduce((sum, objective)=>sum + Number(objective.firmPoints || 0), 0);
  return `<div class="firm-quest-layout seasonal">
    <aside class="firm-quest-summary">
      ${renderQuestModeTabs("seasonal", notificationCounts)}
      <div class="firm-quest-summary-card">
        <span class="tiny">OBJECTIFS SOLO</span>
        <h3>Cycle saisonnier</h3>
        <strong>${completed} / ${objectives.length || 0}</strong>
        <p>Ces objectifs sont personnels. Ils donnent des points au pilote et à sa firme quand ils sont terminés.</p>
      </div>
      <div class="firm-quest-summary-metrics">
        <article><span>Points déjà obtenus</span><b>${fmt(firmPoints)}</b></article>
        <article><span>Objectif suivi</span><b>${escapeHtml(nextObjective?.label || "--")}</b></article>
        <article><span>Firme associée</span><b>${escapeHtml(getFirmDefinition(ownFirmId).label)}</b></article>
      </div>
    </aside>
    <section class="firm-main-block firm-season-objective-board">
      <div class="firm-main-block-head"><div><span class="tiny">OBJECTIFS SAISONNIERS</span><h3>Défis personnels</h3></div><b>${completed} terminés</b></div>
      <p class="firm-season-objective-note">Chaque objectif terminé ajoute ses points à ton classement et à ta firme. Le lot se récupère directement ici avec le bouton Réclamer.</p>
      <div class="firm-season-objective-grid">${objectives.map(renderSeasonObjectiveCard).join("") || `<p class="firm-empty">Aucun objectif saisonnier synchronisé.</p>`}</div>
    </section>
  </div>`;
}

function renderQuests(snapshot){
  const ownFirmId = normalizeFirmId(snapshot.personal?.firmId || "astra");
  const notificationCounts = getFirmRewardNotificationCounts(snapshot);
  const mode = ["weekly", "seasonal"].includes(store.firmQuestTab) ? store.firmQuestTab : "daily";
  if(mode === "seasonal") return renderSeasonObjectives(snapshot, ownFirmId);
  const quests = mode === "weekly" ? snapshot.seasonalQuests || [] : snapshot.dailyQuests || [];
  const activeCount = quests.filter(quest=>!quest.locked).length;
  const lockedCount = quests.filter(quest=>quest.locked).length;
  return `<div class="firm-quest-layout">
    ${renderQuestSummary(snapshot, quests, ownFirmId, mode, notificationCounts)}
    <section class="firm-main-block firm-quest-board">
      <div class="firm-main-block-head"><div><span class="tiny">MISSIONS COLLECTIVES</span><h3>${mode === "weekly" ? "Quêtes hebdomadaires" : "Quêtes journalières"}</h3></div><b>${mode === "daily" ? `${activeCount} ouvertes / ${lockedCount} verrouillées` : "Auto-actives"}</b></div>
      <div class="firm-quest-wide-list">${quests.map(quest=>renderQuestRow(snapshot, quest, ownFirmId)).join("") || `<p class="firm-empty">Aucune quête active.</p>`}</div>
    </section>
  </div>`;
}

function renderRankings(snapshot){
  const ownKey = snapshot.personal?.key;
  const activeFilter = store.firmRankingFilter && ["global", ...FIRMS.map(firm=>firm.id)].includes(store.firmRankingFilter)
    ? store.firmRankingFilter
    : "global";
  const selectedFirm = activeFilter === "global" ? null : getFirmDefinition(activeFilter);
  const rankingRows = activeFilter === "global"
    ? snapshot.individualRanking || []
    : (snapshot.individualRanking || []).filter(row=>normalizeFirmId(row.firmId) === activeFilter);
  const rows = rankingRows.map((row, index)=>({
    ...row,
    displayRank: activeFilter === "global" ? row.rank : index + 1
  }));
  const title = selectedFirm ? `Contributeurs ${selectedFirm.label}` : "Contributeurs de toutes les firmes";
  const renderPlayerRow = row=>{
    const profile = row.publicProfile
      ? {
        ...row.publicProfile,
        ranking:{
          ...(row.publicProfile.ranking || {}),
          displayRank:row.displayRank,
          contribution:Number(row.points || 0)
        }
      }
      : buildFallbackPilotProfile(row);
    const profileKey = registerPilotProfile(profile);
    return `<article class="${row.key === ownKey ? "own" : ""}">
      ${renderRankMark(row.displayRank, `player-${activeFilter}-${row.key || row.name || row.displayRank}`)}
      <button class="pilot-profile-link firm-player-profile-link" type="button" data-pilot-profile-key="${escapeHtml(profileKey)}">
        <img src="${firmBadge(row.firmId)}" alt=""><strong>${escapeHtml(row.name)}</strong>
      </button>
      <span>${fmt(row.points)} pts</span>
      <em>Top ${row.displayRank}</em>
    </article>`;
  };
  return `<div class="firm-main-two-columns ranking-columns">
    <section class="firm-main-block">
      <div class="firm-main-block-head"><div><span class="tiny">CLASSEMENT COLLECTIF</span><h3>Les quatre firmes</h3></div></div>
      <div class="firm-main-ranking-list">${(snapshot.firms || []).map(firm=>renderFirmRow(firm, snapshot.personal?.firmId)).join("")}</div>
    </section>
    <section class="firm-main-block">
      <div class="firm-main-block-head"><div><span class="tiny">${selectedFirm ? `CLASSEMENT ${selectedFirm.label.toUpperCase()}` : "CLASSEMENT GLOBAL"}</span><h3>${escapeHtml(title)}</h3></div><b>${rows.length} classés</b></div>
      <div class="firm-ranking-filters">
        <button class="${activeFilter === "global" ? "active" : ""}" data-firm-ranking-filter="global" type="button">GLOBAL</button>
        ${FIRMS.map(firm=>`<button class="${activeFilter === firm.id ? "active" : ""}" style="--firm-color:${escapeHtml(firm.color)}" data-firm-ranking-filter="${firm.id}" type="button">${escapeHtml(firm.label)}</button>`).join("")}
      </div>
      <div class="firm-player-ranking-head"><span>Rang</span><span>Joueur</span><span>Contribution</span><span>Top</span></div>
      <div class="firm-player-ranking-list">${rows.map(renderPlayerRow).join("") || `<p class="firm-empty">Aucun joueur classé dans ce filtre pour le moment.</p>`}</div>
    </section>
  </div>`;
}

function renderRewardGift(label, reward){
  return `<button class="firm-reward-gift" type="button" aria-label="Voir le lot ${escapeHtml(label)}">
    <img src="assets/icons/season-gift.svg" alt="">
    <span class="firm-reward-tooltip">
      <strong>${escapeHtml(label)}</strong>
      ${rewardHtml(reward)}
      <small>Un seul lot individuel est attribué : celui du meilleur palier atteint.</small>
    </span>
  </button>`;
}

function renderSeasonBoosterPreview(rank){
  const boosters = Object.entries(getFirmBoostersForRank(rank));
  if(!boosters.length) return `<span class="firm-reward-booster-empty">Aucun booster</span>`;
  return `<span class="firm-reward-booster-list">${boosters.map(([type, percent])=>{
    const booster = FIRM_BOOSTER_DEFINITIONS[type] || {};
    return `<span class="firm-reward-booster" title="${escapeHtml(booster.label || type)}">
      <img src="${escapeHtml(booster.asset || "assets/icons/firmaton.svg")}" alt="">
      <b>+${Math.round(Number(percent || 0) * 100)}%</b>
      <small>${escapeHtml(booster.label || type)}</small>
    </span>`;
  }).join("")}</span>`;
}

function renderCollectiveRewardTier(firm, personalFirmId){
  const rank = Math.max(1, Math.min(4, Math.floor(Number(firm?.rank || 4))));
  return `<article class="firm-reward-collective-row ${normalizeFirmId(firm?.id || "") === normalizeFirmId(personalFirmId || "") ? "own" : ""}">
    <div class="firm-reward-collective-rank"><b>TOP ${rank}</b><span>${escapeHtml(firm?.label || getFirmDefinition(firm?.id).label)}</span></div>
    <img class="firm-reward-collective-badge" src="${firmBadge(firm?.id)}" alt="">
    <div class="firm-reward-collective-boosters"><span>Boosters saison</span>${renderSeasonBoosterPreview(rank)}</div>
    <div class="firm-reward-collective-lot"><span>Lot collectif</span>${rewardHtml(firm?.collectiveReward || {}, {compact:true})}</div>
  </article>`;
}

function renderFixedRewardTier(tier, ranking, personalLabel){
  const player = ranking.find(row=>Number(row.rank) === tier.rankStart) || null;
  return `<article class="firm-reward-rank-row ${personalLabel === tier.label ? "own" : ""}">
    <b class="firm-reward-rank-label">${escapeHtml(tier.label)}</b>
    <div class="firm-reward-rank-player">
      ${player ? `<img src="${firmBadge(player.firmId)}" alt=""><strong>${escapeHtml(player.name)}</strong>` : `<span class="firm-reward-vacant">Place non occupée</span>`}
    </div>
    <span class="firm-reward-rank-points">${player ? `${fmt(player.points)} pts` : "--"}</span>
    ${renderRewardGift(tier.label, tier.reward)}
  </article>`;
}

function renderPercentRewardTier(tier, personalLabel){
  const range = tier.playerCount > 0
    ? tier.rankStart === tier.rankEnd
      ? `Rang ${tier.rankStart}`
      : `Rangs ${tier.rankStart} à ${tier.rankEnd}`
    : "Aucun pilote actuellement";
  return `<article class="firm-reward-percent-row ${personalLabel === tier.label || (tier.kind === "classified" && personalLabel === "Joueur classé") ? "own" : ""}">
    <div><b>${escapeHtml(tier.label)}</b><span>${escapeHtml(range)}</span></div>
    <strong>${fmt(tier.playerCount)} pilote${tier.playerCount > 1 ? "s" : ""}</strong>
    ${renderRewardGift(tier.label, tier.reward)}
  </article>`;
}

export function renderRewards(snapshot){
  const ranking = snapshot.individualRanking || [];
  const totalPlayers = Math.max(ranking.length, Number(snapshot.individualPlayerCount || 0));
  const tiers = getFirmIndividualRewardTiers(totalPlayers);
  const fixedTiers = tiers.filter(tier=>tier.kind === "fixed");
  const percentTiers = tiers.filter(tier=>tier.kind !== "fixed");
  const personal = snapshot.personal || {};
  const personalLabel = personal.rewardLabel || "Non classé";
  const contribution = Math.max(0, Number(personal.contribution || 0));
  const threshold = Math.max(1, Number(snapshot.collectiveMinimumContribution || 10_000));
  const thresholdPercent = Math.min(100, contribution / threshold * 100);
  const ownFirm = (snapshot.firms || []).find(firm=>firm.id === normalizeFirmId(personal.firmId || "astra"));
  const firmRewardRows = [...(snapshot.firms || [])].sort((a, b)=>Number(a.rank || 99) - Number(b.rank || 99)).slice(0, 4);
  const seasonPending = (personal.pendingRewards || []).filter(entry=>entry.source === "season-individual" || entry.source === "season-collective");
  return `<div class="firm-rewards-layout">
    <section class="firm-main-block firm-reward-threshold ${personal.collectiveEligible ? "eligible" : ""}">
      <div class="firm-main-block-head"><div><span class="tiny">À ATTEINDRE EN PRIORITÉ</span><h3>Seuil saisonnier collectif</h3></div><b>${personal.collectiveEligible ? "ÉLIGIBLE" : "NON ÉLIGIBLE"}</b></div>
      <div class="firm-reward-threshold-value"><strong>${fmt(contribution)}</strong><span>/ ${fmt(threshold)} points</span></div>
      <div class="firm-reward-threshold-track"><span style="width:${thresholdPercent}%"></span></div>
      <p>Ce seuil personnel débloque le lot collectif correspondant au rang final de ta firme.</p>
      <div class="firm-reward-collective-preview"><span>Lot collectif actuel · Top ${ownFirm?.rank || "-"}</span>${rewardHtml(ownFirm?.collectiveReward || {}, {compact:true})}</div>
    </section>
    <section class="firm-main-block firm-reward-personal-card">
      <div class="firm-main-block-head"><div><span class="tiny">TA POSITION ACTUELLE</span><h3>${escapeHtml(personalLabel)}</h3></div><b>${personal.rank ? `#${personal.rank}` : "--"}</b></div>
      ${rewardHtml(personal.expectedReward || {})}
      <p>Le classement est global aux quatre firmes. Les lots ne se cumulent pas : seul ton meilleur palier est versé.</p>
      ${seasonPending.length ? `<button class="firm-season-pending-claim" data-firm-reward-claim type="button">RÉCLAMER LES GAINS DE LA SAISON PRÉCÉDENTE</button>` : ""}
    </section>
    <section class="firm-main-block firm-reward-collective-board">
      <div class="firm-main-block-head"><div><span class="tiny">RÃ‰COMPENSES DE FIRME</span><h3>Top 1 Ã  Top 4</h3></div><b>Seuil ${fmt(threshold)} pts</b></div>
      <p class="firm-reward-ranking-note">Ces boosters et lots collectifs sont dÃ©bloquÃ©s uniquement si tu atteins le seuil personnel avant la fin de saison.</p>
      <div class="firm-reward-collective-grid">${firmRewardRows.map(firm=>renderCollectiveRewardTier(firm, personal.firmId)).join("")}</div>
    </section>
    <section class="firm-main-block firm-reward-ranking-board">
      <div class="firm-main-block-head"><div><span class="tiny">RÉCOMPENSES INDIVIDUELLES DE FIN DE SAISON</span><h3>Classement et lots</h3></div><b>${fmt(totalPlayers)} joueurs classés</b></div>
      <p class="firm-reward-ranking-note">Les dix premières places sont fixes. Au-delà, chaque pilote rejoint un seul palier calculé sur le nombre total de joueurs classés.</p>
      <div class="firm-reward-ranking-grid">
        <div class="firm-reward-top-list">
          <div class="firm-reward-list-title"><span>Rang</span><span>Joueur</span><span>Points</span><span>Lot</span></div>
          ${fixedTiers.map(tier=>renderFixedRewardTier(tier, ranking, personalLabel)).join("")}
        </div>
        <div class="firm-reward-percent-list">
          <div class="firm-reward-percent-head"><span>Paliers après le Top 10</span><small>Survoler le cadeau pour voir le lot</small></div>
          ${percentTiers.map(tier=>renderPercentRewardTier(tier, personalLabel)).join("")}
          <div class="firm-reward-noncumul"><strong>Règle de non-cumul</strong><p>Top 1 reçoit uniquement Top 1. Top 7 reçoit uniquement Top 7. Un joueur hors Top 10 reçoit uniquement le meilleur palier en pourcentage atteint.</p></div>
        </div>
      </div>
    </section>
  </div>`;
}

export function renderFirm(){
  installPilotProfileModal();
  const panel = document.getElementById("firmMainPanel");
  if(!panel) return;
  if(!FIRM_TABS.some(tab=>tab.id === store.firmTab)) store.firmTab = "overview";
  const snapshot = multiplayer.firmSnapshot || fallbackSnapshot();
  const notificationCounts = getFirmRewardNotificationCounts(snapshot);
  const firmId = normalizeFirmId(snapshot.personal?.firmId || store.state?.player?.firmId || "astra");
  const firm = getFirmDefinition(firmId);
  const content = store.firmTab === "shop"
    ? renderShop(snapshot)
    : store.firmTab === "quests"
      ? renderQuests(snapshot)
      : store.firmTab === "rankings"
        ? renderRankings(snapshot)
        : store.firmTab === "rewards"
          ? renderRewards(snapshot)
          : renderOverview(snapshot);
  panel.innerHTML = `
    <header class="firm-main-hero" style="--firm-color:${escapeHtml(firm.color)}">
      <div class="firm-main-hero-identity"><img src="${firmBadge(firmId)}" alt=""><div><span class="tiny">CENTRE DE COMMANDEMENT</span><h2>${escapeHtml(firm.label)}</h2><p>Saison inter-firmes - ${durationLabel(Number(snapshot.seasonEndsAt || 0) - Date.now())} restantes</p></div></div>
      <div class="firm-main-hero-metrics">
        <article><span>${firmatonIcon()}Firmatons</span><strong>${fmt(snapshot.personal?.firmatons ?? store.state?.firmatons ?? 0)}</strong></article>
        <article><span>Contribution</span><strong>${fmt(snapshot.personal?.contribution || 0)}</strong></article>
        <article><span>Rang individuel</span><strong>${snapshot.personal?.rank ? `#${snapshot.personal.rank}` : "--"}</strong></article>
      </div>
    </header>
    <nav class="firm-main-tabs">${FIRM_TABS.map(tab=>{
      const count = tab.id === "quests" ? notificationCounts.quests : tab.id === "rewards" ? notificationCounts.rewards : 0;
      return `<button class="${store.firmTab === tab.id ? "active" : ""}" data-firm-main-tab="${tab.id}" type="button">${tab.label} ${notificationBadge(count)}</button>`;
    }).join("")}</nav>
    <div class="firm-main-content">${content}</div>
    ${renderFirmBoxOpening()}`;
}
