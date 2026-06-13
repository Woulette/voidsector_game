import { FIRMS, getFirmDefinition, normalizeFirmId } from "../../data/firms.js";

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

function rewardText(reward = {}){
  const parts = [];
  if(reward.premium) parts.push(`${fmt(reward.premium)} NOVA`);
  for(const [id, amount] of Object.entries(reward.ammo || {})) parts.push(`${fmt(amount)} ${id}`);
  for(const [rarity, amount] of Object.entries(reward.boxes || {})) parts.push(`${fmt(amount)} coffre(s) ${rarity}`);
  if(reward.firmatons) parts.push("gain FIRME visible dans la page FIRME");
  return parts.join(" + ") || "Aucun gain";
}

function questKindLabel(quest){
  if(quest.kind === "weekly" || quest.kind === "seasonal") return "Hebdo";
  return "Jour";
}

function renderFirms(snapshot){
  return `<div class="combat-firm-list">${(snapshot.firms || []).map(firm=>`
    <article class="${firm.id === snapshot.personal?.firmId ? "own" : ""}" style="--firm-color:${escapeHtml(firm.color || getFirmDefinition(firm.id).color)}">
      <b>${firm.rank}</b><img src="${badge(firm.id)}" alt=""><div><strong>${escapeHtml(firm.label || firm.id)}</strong><span>${fmt(firm.points)} points</span></div>
    </article>`).join("")}</div>`;
}

function renderPlayers(snapshot){
  return `<div class="combat-firm-player-head"><span>#</span><span>Joueur</span><span>Points</span><span>Gain</span></div>
    <div class="combat-firm-player-list">${(snapshot.individualRanking || []).slice(0, 40).map(row=>`
      <article class="${row.key === snapshot.personal?.key ? "own" : ""}">
        <b>${row.rank}</b><div><img src="${badge(row.firmId)}" alt=""><strong>${escapeHtml(row.name)}</strong></div><span>${fmt(row.points)}</span><em>${escapeHtml(row.rewardLabel)}</em>
      </article>`).join("") || `<p class="social-empty">Aucun joueur classe.</p>`}</div>`;
}

function renderQuests(snapshot){
  const firmId = normalizeFirmId(snapshot.personal?.firmId || "astra");
  const quests = [
    ...(snapshot.dailyQuests || []),
    ...(snapshot.seasonalQuests || [])
  ].filter(quest=>!quest.locked);
  return `<div class="combat-firm-quest-list">${quests.map(quest=>{
    const own = quest.firms?.[firmId] || {};
    const percent = Math.min(100, Number(own.progress || 0) / Math.max(1, Number(quest.goal || 1)) * 100);
    return `<article class="${own.completedAt ? "complete" : ""}">
      <div class="combat-firm-quest-head"><div><strong>${escapeHtml(quest.label)}</strong><span>${questKindLabel(quest)} - ${escapeHtml(quest.targetLabel)} - ${duration(Number(quest.endsAt || 0) - Date.now())}</span></div><b>${fmt(own.progress)} / ${fmt(quest.goal)}</b></div>
      <div class="combat-firm-progress"><span style="width:${percent}%"></span></div>
      <div class="combat-firm-quest-personal"><span>Participation quete : <b>${fmt(quest.player?.contribution || 0)}</b></span><span>Rang quete : ${escapeHtml(quest.player?.rewardLabel || "Non classe")}</span></div>
    </article>`;
  }).join("") || `<p class="social-empty">Aucune quete active.</p>`}</div>`;
}

function renderRewards(snapshot){
  const pending = snapshot.personal?.pendingRewards || [];
  return `<div class="combat-firm-reward-summary">
      <article><span>Rang individuel</span><strong>${escapeHtml(snapshot.personal?.rewardLabel || "Non classe")}</strong><small>${escapeHtml(rewardText(snapshot.personal?.expectedReward || {}))}</small></article>
      <article><span>Recompense collective</span><strong>${snapshot.personal?.collectiveEligible ? "ELIGIBLE" : "SEUIL NON ATTEINT"}</strong><small>${fmt(snapshot.personal?.contribution || 0)} / ${fmt(snapshot.collectiveMinimumContribution || 10_000)} points</small></article>
    </div>
    <div class="combat-firm-pending">${pending.map(entry=>`<article><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(rewardText(entry.reward))}</span></article>`).join("") || `<p class="social-empty">Aucune recompense en attente.</p>`}</div>
    <button class="combat-firm-claim" data-social-action="firm-reward-claim" type="button" ${pending.length ? "" : "disabled"}>RECUPERER LES RECOMPENSES</button>`;
}

function renderOverview(snapshot){
  const firm = snapshot.firms?.find(entry=>entry.id === snapshot.personal?.firmId) || snapshot.firms?.[0];
  const quest = [...(snapshot.dailyQuests || []), ...(snapshot.seasonalQuests || [])].find(entry=>!entry.locked);
  return `<div class="combat-firm-overview">
    <section style="--firm-color:${escapeHtml(firm?.color || "#38bdf8")}"><img src="${badge(firm?.id)}" alt=""><div><span>Ta firme</span><strong>${escapeHtml(firm?.label || "Firme")}</strong><b>Top ${firm?.rank || "-"} - ${fmt(firm?.points)} pts</b></div></section>
    <section><div><span>Contribution saisonniere</span><strong>${fmt(snapshot.personal?.contribution || 0)} pts</strong><b>${snapshot.personal?.rank ? `Top ${snapshot.personal.rank} mondial` : "Non classe"}</b></div></section>
    <section><div><span>Prochaine mission</span><strong>${escapeHtml(quest?.label || "Synchronisation")}</strong><b>${quest ? duration(Number(quest.endsAt || 0) - Date.now()) : "--"}</b></div></section>
  </div>
  ${renderFirms(snapshot)}`;
}

export function renderCombatFirmPanel({snapshot, selectedTab = "overview"} = {}){
  const data = snapshot || {firms:[], individualRanking:[], dailyQuests:[], seasonalQuests:[], personal:{}};
  const tabs = [
    {id:"overview", label:"Resume"},
    {id:"firms", label:"Firmes"},
    {id:"players", label:"Joueurs"},
    {id:"quests", label:"Quetes"},
    {id:"rewards", label:"Gains"}
  ];
  const content = selectedTab === "firms"
    ? renderFirms(data)
    : selectedTab === "players"
      ? renderPlayers(data)
      : selectedTab === "quests"
        ? renderQuests(data)
        : selectedTab === "rewards"
          ? renderRewards(data)
          : renderOverview(data);
  return `<div class="combat-firm-season"><span>Saison en cours</span><strong>${duration(Number(data.seasonEndsAt || 0) - Date.now())}</strong></div>
    <div class="firm-tabs combat-firm-tabs">${tabs.map(tab=>`<button class="${selectedTab === tab.id ? "active" : ""}" data-firm-panel-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}</div>
    <div class="combat-firm-content">${content}</div>`;
}
