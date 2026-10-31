import { getActiveQuest, getActiveQuests, getQuestObjectiveProgress, getShip, store } from "../core/store.js?v=20260726-kharon1";
import { multiplayer } from "../multiplayer/client.js?v=20261018-map-transfer1";
import { fmt } from "../core/utils.js";
import { getQuestObjectiveKey } from "../core/questProgressStore.js?v=20260726-kharon1";
import { buildHomeQuest, buildHomeRanking } from "./homePresentation.js?v=20261024-home1";
import { getRankById, getRankForScore } from "../data/ranks.js";
import { getServerRankAssignment } from "../core/rankAuthorityStore.js";
import { rankIcon } from "./renderShared.js?v=20260726-kharon1";

let eventsInstalled = false;
let lastMarkup = "";
let lastDialogMarkup = "";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
}

function icon(name){
  const paths = {
    trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v5m-4 3h8m-8-3h8v3H8Z"/>',
    target:'<circle cx="12" cy="12" r="8"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
}

function pilotRankIcon(row){
  const assignment = getServerRankAssignment(row.key);
  const rankId = assignment?.rankId || row.rankId;
  return rankIcon(rankId ? getRankById(rankId) : getRankForScore(row.points));
}

function rankingHtml(){
  const ranking = buildHomeRanking(multiplayer.leaderboardRanking, {
    accountId:multiplayer.auth?.account?.id,
    name:store.state?.player?.name,
    connected:multiplayer.connected
  });
  const rows = ranking.top.map(row=>`<tr${row.isPlayer ? ' class="home-ranking-self"' : ""}>
    <td>${fmt(row.position)}</td><th scope="row"><span class="home-ranking-pilot">${pilotRankIcon(row)}<span>${escapeHtml(row.pilot)}</span></span></th><td>${fmt(row.points)}</td></tr>`).join("");
  const empty = ranking.status === "loading" ? "Chargement du classement…"
    : ranking.status === "offline" ? "Le classement sera disponible à la reconnexion."
    : "Aucun pilote classé pour le moment.";
  const player = ranking.player;
  return `<section class="home-panel home-ranking" aria-labelledby="homeRankingTitle">
    <header class="home-panel-head">${icon("trophy")}<h3 id="homeRankingTitle">Classement</h3><span>Top 3</span></header>
    ${rows ? `<table class="home-ranking-table" aria-label="Les trois premiers pilotes"><thead><tr><th scope="col">#</th><th scope="col">Pilote</th><th scope="col">Points</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="home-empty" role="status">${empty}</p>`}
    ${player ? `<div class="home-player-position"><b>${fmt(player.position)}<small>${player.position === 1 ? "er" : "e"}</small></b>${pilotRankIcon(player)}<div><strong>${escapeHtml(player.pilot)}</strong><span>Votre position</span></div><span class="home-player-points">${fmt(player.points)} pts</span></div>`
      : rows ? '<p class="home-ranking-note">Votre position apparaîtra après votre classement par le serveur.</p>' : ""}
    ${ranking.status === "cached" && rows ? '<p class="home-ranking-note">Dernier classement reçu · connexion interrompue</p>' : ""}
    <button type="button" class="home-link" data-view="leaderboard">Voir le classement complet ${icon("arrow")}</button>
  </section>`;
}

function activeQuestModels(){
  return getActiveQuests().map(quest=>buildHomeQuest(quest, (id, objective, index)=>getQuestObjectiveProgress(id, getQuestObjectiveKey(objective, index))));
}

function questMeter(quest){
  if(!quest?.current) return "";
  const objective = quest.current;
  return `<div class="home-objective-progress"><span>${escapeHtml(objective.label)}</span><b>${fmt(objective.progress)} / ${fmt(objective.target)}</b></div>
    <div class="home-progress" role="progressbar" aria-label="Progression de ${escapeHtml(quest.title)}" aria-valuenow="${quest.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${quest.percent}%"></span></div>`;
}

function objectiveHtml(){
  const quests = activeQuestModels();
  const selected = getActiveQuest();
  const quest = quests.find(entry=>entry.id === selected?.id) || quests[0];
  return `<section class="home-panel home-objective" aria-labelledby="homeObjectiveTitle">
    <header class="home-panel-head">${icon("target")}<h3 id="homeObjectiveTitle">Votre objectif</h3></header>
    ${quest ? `<h4>${escapeHtml(quest.title)}</h4>${questMeter(quest)}${quest.complete ? '<p class="home-quest-complete">Objectifs terminés · retournez au relais de commandement.</p>' : ""}`
      : '<h4>Aucune quête en cours</h4><p class="home-empty">Acceptez une mission au relais de commandement de votre station.</p>'}
    <button type="button" class="home-link" data-home-quests>Voir mes quêtes ${icon("arrow")}</button>
  </section>`;
}

function shipHtml(){
  const ship = getShip(store.state?.activeShip);
  return `<section class="home-panel home-ship" aria-label="Vaisseau actif">
    ${ship ? `<div class="home-ship-art"><img src="${escapeHtml(ship.img)}" alt="${escapeHtml(ship.name)}"></div><div class="home-ship-copy"><span>Vaisseau actif</span><h3>${escapeHtml(ship.name)}</h3><p>${escapeHtml(ship.className)}</p><button type="button" class="home-link" data-view="hangar">Ouvrir le hangar ${icon("arrow")}</button></div>`
      : `<div class="home-ship-copy"><span>Vaisseau actif</span><h3>Aucun vaisseau équipé</h3><button type="button" class="home-link" data-view="hangar">Ouvrir le hangar ${icon("arrow")}</button></div>`}
  </section>`;
}

function renderQuestDialog(){
  const content = document.getElementById("homeQuestsContent");
  if(!content) return;
  const quests = activeQuestModels();
  const markup = quests.length ? quests.map(quest=>`<article class="home-quest-summary"><h3>${escapeHtml(quest.title)}</h3>
    ${quest.objectives.map(objective=>`<div class="home-objective-progress"><span>${escapeHtml(objective.label)}</span><b>${fmt(objective.progress)} / ${fmt(objective.target)}</b></div>`).join("")}
    ${quest.complete ? '<p class="home-quest-complete">Objectifs terminés · retournez au relais de commandement.</p>' : ""}</article>`).join("")
    : '<p class="home-empty">Aucune quête en cours. Le relais de commandement de votre station propose vos prochaines missions.</p>';
  if(markup !== lastDialogMarkup){ content.innerHTML = markup; lastDialogMarkup = markup; }
}

function installEvents(){
  if(eventsInstalled) return;
  eventsInstalled = true;
  document.addEventListener("click", event=>{
    if(!event.target.closest("[data-home-quests]")) return;
    renderQuestDialog();
    const dialog = document.getElementById("homeQuestsDialog");
    if(dialog && !dialog.open) dialog.showModal();
  });
}

export function renderHome(){
  const container = document.getElementById("homeDashboard");
  if(!container || !store.state) return;
  installEvents();
  const name = store.state.player?.name || "pilote";
  const markup = `<header class="home-heading"><div><span>Tableau de bord</span><h2>Bienvenue à bord, ${escapeHtml(name)}.</h2></div><p>Le classement et votre prochaine sortie,<br>en un coup d’œil.</p></header>
    <div class="home-layout">${rankingHtml()}<div class="home-side">${objectiveHtml()}${shipHtml()}</div></div>`;
  if(markup !== lastMarkup){ container.innerHTML = markup; lastMarkup = markup; }
  if(document.getElementById("homeQuestsDialog")?.open) renderQuestDialog();
}
