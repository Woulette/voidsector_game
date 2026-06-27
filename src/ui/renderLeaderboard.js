import { portals } from "../data/catalog.js";
import { getDeadlyEnemyDisplay } from "../data/deadlyEnemies.js";
import { getEnemyAssetRotationStyle } from "../data/enemyVisuals.js";
import { ENEMY_TYPES, MAPS } from "../game/combatData.js";
import { fmt } from "../core/utils.js";
import {
  RANK_TABLE,
  getCurrentRank,
  getRankForScore,
  getRankById,
  getMonsterRankPointRule,
  getLeaderboardRows,
  getNextRank,
  getRankBreakdown,
  getRankProgress,
  store
} from "../core/store.js";
import { multiplayer } from "../multiplayer/client.js?v=firm-shop-sync-1";
import { rankIcon, rankInline } from "./renderShared.js";
import { buildPreviewPilotProfile, installPilotProfileModal, registerPilotProfile } from "./playerProfileModal.js";
import { getLeaderboardPreviewRows } from "./leaderboardPreview.js";

let rankDetailsOpen = false;
let rankDetailsEventsInstalled = false;
let fullLeaderboardOpen = false;
let fullLeaderboardPage = 0;

const FULL_LEADERBOARD_PAGE_SIZE = 100;

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function activeAccountKey(){
  const id = multiplayer.auth?.account?.id;
  return id ? `account:${String(id)}` : "";
}

function isCurrentPlayerRow(row = {}){
  const accountKey = activeAccountKey();
  const rowKey = String(row.key || row.id || "");
  const rowName = String(row.pilot || row.name || "").trim().toLowerCase();
  const playerName = String(store.state?.player?.name || multiplayer.name || "").trim().toLowerCase();
  return Boolean(
    row.isPlayer
    || (accountKey && rowKey === accountKey)
    || (playerName && rowName === playerName)
  );
}

function normalizeLeaderboardRow(row = {}, index = 0){
  const points = Math.max(0, Number(row.points || 0));
  const rank = row.rankId ? getRankById(row.rankId) : getRankForScore(points);
  const pilot = String(row.pilot || row.name || "Pilote").trim() || "Pilote";
  return {
    ...row,
    id:String(row.id || row.key || pilot || `leaderboard-${index}`),
    key:String(row.key || row.id || ""),
    pilot,
    name:pilot,
    position:Math.max(1, Number(row.position || row.rank || index + 1)),
    points,
    level:Math.max(1, Number(row.level || 1)),
    kills:Math.max(0, Number(row.kills || row.totalKills || 0)),
    portals:Math.max(0, Number(row.portals || row.portalClears || 0)),
    rankId:rank.id,
    grade:row.grade || rank.name,
    isPlayer:isCurrentPlayerRow(row)
  };
}

function getServerLeaderboardRows(){
  const rows = Array.isArray(multiplayer.leaderboardRanking?.rows) ? multiplayer.leaderboardRanking.rows : [];
  return rows
    .map(normalizeLeaderboardRow)
    .sort((a, b)=>a.position - b.position || b.points - a.points || a.pilot.localeCompare(b.pilot))
    .map((row, index)=>({...row, position:index + 1}));
}

function getVisibleLeaderboardRows(){
  const serverRows = getServerLeaderboardRows();
  if(serverRows.length) return serverRows;
  return getLeaderboardRows().map(normalizeLeaderboardRow);
}

function usesServerLeaderboard(){
  return getServerLeaderboardRows().length > 0;
}

function progressForScore(score, rankId = ""){
  const current = rankId ? getRankById(rankId) : getRankForScore(score);
  const next = RANK_TABLE.find(rank=>rank.score > score) || null;
  if(!next) return {score, current, next:null, progress:100, remaining:0};
  const floor = Math.min(score, Math.max(0, current.score || 0));
  const span = Math.max(1, next.score - floor);
  return {
    score,
    current,
    next,
    progress:Math.max(0, Math.min(100, (score - floor) / span * 100)),
    remaining:Math.max(0, next.score - score)
  };
}

function getEnemyLevelRange(kind){
  const deadlyRange = getDeadlyEnemyDisplay(kind)?.levelRange;
  if(Array.isArray(deadlyRange) && deadlyRange.length >= 2) return [Number(deadlyRange[0]), Number(deadlyRange[1])];
  const typeRange = ENEMY_TYPES[kind]?.levelRange;
  if(Array.isArray(typeRange) && typeRange.length >= 2) return [Number(typeRange[0] || 1), Number(typeRange[1] || typeRange[0] || 1)];
  const levels = [];
  for(const map of MAPS){
    const hasEnemy = (map.enemyTypes || []).some(entry=>(entry.id || entry[0]) === kind) || Object.hasOwn(map.fixedEnemyCounts || {}, kind);
    if(hasEnemy && Array.isArray(map.enemyLevel)){
      levels.push(Number(map.enemyLevel[0] || 1), Number(map.enemyLevel[1] || map.enemyLevel[0] || 1));
    }
  }
  if(levels.length) return [Math.min(...levels), Math.max(...levels)];
  return [1, 1];
}

function getMonsterRateLabel(kind){
  const rule = getMonsterRankPointRule(kind);
  if(!rule) return "Aucun point";
  return `${fmt(rule.points)} / ${fmt(rule.kills)}`;
}

function monsterImageHtml(row){
  if(!row.img) return "";
  const rotationStyle = getEnemyAssetRotationStyle(row.kind);
  return `<img src="${row.img}" alt=""${rotationStyle ? ` style="${rotationStyle}"` : ""}>`;
}

function installRankDetailsEvents(){
  if(rankDetailsEventsInstalled) return;
  rankDetailsEventsInstalled = true;
  document.addEventListener("click", e=>{
    if(e.target.closest("[data-leaderboard-full-open]")){
      fullLeaderboardOpen = true;
      fullLeaderboardPage = 0;
      renderLeaderboard();
      return;
    }
    if(e.target.closest("[data-leaderboard-full-close]") || e.target.classList?.contains("leaderboard-full-modal")){
      fullLeaderboardOpen = false;
      renderLeaderboard();
      return;
    }
    const pageButton = e.target.closest("[data-leaderboard-full-page]");
    if(pageButton){
      fullLeaderboardPage = Math.max(0, Number(pageButton.dataset.leaderboardFullPage || 0));
      renderLeaderboard();
      return;
    }
    if(e.target.closest("[data-rank-details-open]")){
      rankDetailsOpen = true;
      renderLeaderboard();
      return;
    }
    if(e.target.closest("[data-rank-details-close]") || e.target.classList?.contains("rank-details-modal")){
      rankDetailsOpen = false;
      renderLeaderboard();
    }
  });
}

function renderRankDetailsModal(breakdown){
  if(!rankDetailsOpen) return "";
  const player = store.state.player || {};
  const completedPortals = store.state.completedPortals || {};
  const rankKillStats = store.state.rankKillStats || {};
  const xpRow = breakdown.find(row=>row.id === "xp") || {};
  const reputationRow = breakdown.find(row=>row.id === "reputation") || {};
  const killRow = breakdown.find(row=>row.id === "kill") || {};
  const levelRow = breakdown.find(row=>row.id === "level") || {};
  const portalRow = breakdown.find(row=>row.id === "portal") || {};
  const monsterRows = Object.entries(rankKillStats)
    .map(([kind, entry])=>{
      const deadly = getDeadlyEnemyDisplay(kind);
      return {
        kind,
        name:deadly?.name || ENEMY_TYPES[kind]?.name || kind,
        img:deadly?.img || ENEMY_TYPES[kind]?.img || "",
        levelRange:getEnemyLevelRange(kind),
        kills:Math.max(0, Number(entry?.kills || 0)),
        points:Math.max(0, Number(entry?.points || 0))
      };
    })
    .filter(row=>row.kills > 0 || row.points > 0)
    .sort((a,b)=>b.points - a.points || b.kills - a.kills || a.name.localeCompare(b.name));
  const portalRows = Object.entries(completedPortals)
    .map(([id, count])=>({
      id,
      name:portals.find(portal=>portal.id === id)?.name || id,
      count:Math.max(0, Number(count || 0)),
      points:Math.max(0, Number(count || 0)) * 2500
    }))
    .filter(row=>row.count > 0)
    .sort((a,b)=>b.points - a.points || a.name.localeCompare(b.name));

  return `
    <div class="rank-details-modal" role="dialog" aria-modal="true" aria-label="Details du score de grade">
      <section class="rank-details-window frame">
        <div class="rank-details-head">
          <div>
            <span class="tiny">SCORE DE GRADE</span>
            <h3>Details du calcul</h3>
          </div>
          <button class="rank-details-close" type="button" data-rank-details-close aria-label="Fermer">×</button>
        </div>
        <div class="rank-details-summary">
          <article><span>XP totale</span><strong>${fmt(player.totalXp || 0)}</strong><small>${fmt(xpRow.points || 0)} pts</small></article>
          <article><span>Reputation</span><strong>${fmt(player.reputation || 0)}</strong><small>${fmt(reputationRow.points || 0)} pts</small></article>
          <article><span>Monstres</span><strong>${fmt(player.totalKills || 0)}</strong><small>${fmt(killRow.points || 0)} pts</small></article>
          <article><span>Niveaux</span><strong>${fmt(Math.max(0, Number(player.level || 1) - 1))}</strong><small>${fmt(levelRow.points || 0)} pts</small></article>
          <article><span>Portails</span><strong>${fmt(portalRow.amount || 0)}</strong><small>${fmt(portalRow.points || 0)} pts</small></article>
        </div>
        <div class="rank-details-grid">
          <section class="rank-detail-panel">
            <span class="tiny">PROGRESSION</span>
            <h4>XP, reputation et niveaux</h4>
            <div class="rank-detail-lines">
              <div><span>XP totale gagnee</span><b>${fmt(player.totalXp || 0)}</b><strong>${fmt(xpRow.points || 0)} pts</strong></div>
              <div><span>Reputation totale</span><b>${fmt(player.reputation || 0)}</b><strong>${fmt(reputationRow.points || 0)} pts</strong></div>
              <div><span>Niveau actuel</span><b>${fmt(player.level || 1)}</b><strong>${fmt(levelRow.points || 0)} pts</strong></div>
            </div>
          </section>
          <section class="rank-detail-panel">
            <span class="tiny">PORTAILS</span>
            <h4>Portails termines</h4>
            ${portalRows.length ? `<div class="rank-detail-table">
              ${portalRows.map(row=>`<div><span>${row.name}</span><b>${fmt(row.count)}</b><strong>${fmt(row.points)} pts</strong></div>`).join("")}
            </div>` : `<p class="rank-detail-empty">Aucun portail termine pour le moment.</p>`}
          </section>
        </div>
        <section class="rank-detail-panel rank-detail-wide">
          <span class="tiny">BESTIAIRE DE GRADE</span>
          <h4>Monstres tues et points gagnes</h4>
          ${monsterRows.length ? `<div class="rank-monster-table">
            <div class="rank-monster-head"><span>Monstre</span><span>Kills</span><span>Barème fixe</span><span>Points</span></div>
            ${monsterRows.map(row=>`<div>
              <span class="rank-monster-name">${monsterImageHtml(row)}<span><b>${row.name}</b><small>Niv. ${fmt(row.levelRange[0])} a ${fmt(row.levelRange[1])}</small></span></span>
              <b>${fmt(row.kills)}</b>
              <em>${getMonsterRateLabel(row.kind)}</em>
              <strong>${fmt(row.points)} pts</strong>
            </div>`).join("")}
          </div>` : `<p class="rank-detail-empty">Aucun monstre comptabilise pour le moment.</p>`}
        </section>
      </section>
    </div>
  `;
}

function buildFullLeaderboardRows(){
  const serverRows = getServerLeaderboardRows();
  if(serverRows.length) return serverRows;
  const baseRows = getLeaderboardRows().map(row=>({
    ...row,
    id:row.id || (row.isPlayer ? "player" : row.pilot),
    points:Math.max(0, Number(row.points || 0)),
    level:Math.max(1, Number(row.level || 1)),
    kills:Math.max(0, Number(row.kills || 0)),
    portals:Math.max(0, Number(row.portals || 0))
  }));
  const usedPilots = new Set(baseRows.map(row=>String(row.pilot || "").toLowerCase()));
  const lowestPoints = Math.min(...baseRows.map(row=>row.points), 9_000);
  const prefixes = ["ASTRA", "CYGNUS", "SOL", "VERD", "NOVA", "ONYX", "LYRA", "DRACO", "VEGA", "ORION"];
  const generated = [];
  for(let index = 0; generated.length < 493; index += 1){
    const pilot = `${prefixes[index % prefixes.length]}-${String(index + 8).padStart(3, "0")}`;
    if(usedPilots.has(pilot.toLowerCase())) continue;
    const points = Math.max(25, Math.floor(lowestPoints - 180 - index * (74 + index % 11 * 9)));
    const rank = getRankForScore(points);
    generated.push({
      id:`generated-${index}`,
      pilot,
      level:Math.max(1, Math.min(75, Math.floor(8 + Math.sqrt(points) / 18 + index % 5))),
      kills:Math.max(0, Math.floor(points / 18 + index * 3)),
      portals:Math.max(0, Math.floor(points / 18_000)),
      points,
      rankId:rank.id,
      grade:rank.name,
      firmId:["astra", "cyan", "jaune", "verte"][index % 4]
    });
  }
  return [...baseRows, ...generated]
    .sort((a, b)=>b.points - a.points || b.level - a.level || a.pilot.localeCompare(b.pilot))
    .map((row, index)=>({...row, position:index + 1}));
}

function renderFullLeaderboardModal(){
  if(!fullLeaderboardOpen) return "";
  const rows = buildFullLeaderboardRows();
  const pageCount = Math.max(1, Math.ceil(rows.length / FULL_LEADERBOARD_PAGE_SIZE));
  const page = Math.max(0, Math.min(pageCount - 1, fullLeaderboardPage));
  fullLeaderboardPage = page;
  const start = page * FULL_LEADERBOARD_PAGE_SIZE;
  const visibleRows = rows.slice(start, start + FULL_LEADERBOARD_PAGE_SIZE);
  const end = start + visibleRows.length;
  const pageButtons = Array.from({length:pageCount}, (_, index)=>`
    <button class="${index === page ? "active" : ""}" type="button" data-leaderboard-full-page="${index}">${index + 1}</button>
  `).join("");
  return `<div class="leaderboard-full-modal" role="dialog" aria-modal="true" aria-label="Classement complet">
    <section class="leaderboard-full-window frame">
      <header class="leaderboard-full-head">
        <div>
          <span class="tiny">CLASSEMENT COMPLET</span>
          <h3>Top ${fmt(start + 1)} à ${fmt(end)}</h3>
          <p>${fmt(rows.length)} pilotes classés</p>
        </div>
        <button class="leaderboard-full-close" type="button" data-leaderboard-full-close aria-label="Fermer">×</button>
      </header>
      <nav class="leaderboard-full-pages">
        <button type="button" data-leaderboard-full-page="${page - 1}" ${page <= 0 ? "disabled" : ""}>Précédent</button>
        <div>${pageButtons}</div>
        <button type="button" data-leaderboard-full-page="${page + 1}" ${page >= pageCount - 1 ? "disabled" : ""}>Suivant</button>
      </nav>
      <div class="leaderboard-full-table-wrap">
        <table class="leaderboard-table leaderboard-full-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Pilote</th>
              <th>Grade</th>
              <th>Points</th>
              <th>Niv.</th>
              <th>Kills</th>
              <th>Portails</th>
            </tr>
          </thead>
          <tbody>
            ${visibleRows.map(row=>`<tr class="${row.isPlayer ? "is-player" : ""}">
              <td>${fmt(row.position)}</td>
              <td>${renderPilotCell(row)}</td>
              <td>${rankInline({id:row.rankId, name:row.grade})}</td>
              <td>${fmt(row.points)}</td>
              <td>${fmt(row.level)}</td>
              <td>${fmt(row.kills)}</td>
              <td>${fmt(row.portals)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function renderPilotCell(row){
  const profile = row.publicProfile
    ? {
      ...row.publicProfile,
      key:String(row.publicProfile.key || row.key || row.id || row.pilot),
      name:row.publicProfile.name || row.pilot,
      sourceLabel:row.publicProfile.sourceLabel || "Profil MMO",
      ranking:{
        ...(row.publicProfile.ranking || {}),
        displayRank:row.position,
        contribution:Number(row.points || 0)
      }
    }
    : buildPreviewPilotProfile(row);
  const profileKey = registerPilotProfile(profile);
  return `<button class="pilot-profile-link leaderboard-pilot-link" type="button" data-pilot-profile-key="${escapeHtml(profileKey)}">
    <strong>${escapeHtml(row.pilot)}</strong>
  </button>${row.isPlayer ? `<span class="you-badge">TOI</span>` : ""}`;
}

export function renderLeaderboard(){
  installRankDetailsEvents();
  installPilotProfileModal();
  const panel = document.getElementById("leaderboardPanel");
  if(!panel) return;
  const rows = getVisibleLeaderboardRows();
  const previewRows = getLeaderboardPreviewRows(rows);
  const serverMode = usesServerLeaderboard();
  const self = rows.find(row=>row.isPlayer) || rows[0];
  const progress = serverMode ? progressForScore(Number(self.points || 0), self.rankId) : getRankProgress();
  const rank = serverMode ? getRankById(self.rankId) : getCurrentRank();
  const next = serverMode ? progress.next : getNextRank();
  const breakdown = getRankBreakdown();
  const totalBreakdownPoints = breakdown.reduce((sum,row)=>sum + row.points, 0);
  const playerCount = Math.max(rows.length, Number(multiplayer.leaderboardRanking?.playerCount || 0));

  panel.innerHTML = `
    <div class="leaderboard-summary-grid">
      <article class="leaderboard-summary-card">
        <span class="tiny">TA POSITION</span>
        <strong>#${self.position || "—"}</strong>
        <small>${escapeHtml(self.pilot || store.state.player.name)}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">GRADE</span>
        <div class="leaderboard-rank-summary">${rankIcon(rank, rank.name)}<strong>${rank.name}</strong></div>
        <small>${next ? `Prochain : ${next.name}` : "Grade maximum"}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">POINTS TOTAUX</span>
        <strong>${fmt(progress.score)}</strong>
        <small>${next ? `${fmt(progress.remaining)} points restants` : "Progression terminée"}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">PROGRESSION</span>
        <strong>${Math.round(progress.progress)}%</strong>
        <div class="mini-bar leaderboard-progress"><span style="width:${progress.progress}%"></span></div>
      </article>
    </div>

    <div class="leaderboard-layout">
      <section class="leaderboard-table-card frame">
        <div class="leaderboard-section-head">
          <div>
            <span class="tiny">${serverMode ? "CLASSEMENT MMO" : "CLASSEMENT LOCAL"}</span>
            <h3>${serverMode ? "Joueurs du serveur" : "Prévisualisation MMO"}</h3>
          </div>
          <div class="leaderboard-section-actions">
            <span class="badge">${serverMode ? `${fmt(playerCount)} joueurs serveur` : "Backend plus tard"}</span>
            <button class="leaderboard-all-button" type="button" data-leaderboard-full-open>TOUT VOIR</button>
          </div>
        </div>
        <div class="leaderboard-table-wrap">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pilote</th>
                <th>Grade</th>
                <th>Points</th>
                <th>Niv.</th>
                <th>Kills</th>
                <th>Portails</th>
              </tr>
            </thead>
            <tbody>
              ${previewRows.map(row=>`<tr class="${row.isPlayer ? "is-player" : ""}">
                <td>${row.position}</td>
                <td>${renderPilotCell(row)}</td>
                <td>${rankInline({id:row.rankId, name:row.grade})}</td>
                <td>${fmt(row.points)}</td>
                <td>${fmt(row.level)}</td>
                <td>${fmt(row.kills)}</td>
                <td>${fmt(row.portals)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="leaderboard-note">${serverMode ? "Classement serveur réel, calculé sur les profils MMO synchronisés et les quotas de grades compétitifs." : "Pour le moment ce classement mélange ton vrai pilote sauvegardé en local avec des pilotes de démonstration. Plus tard, les lignes pourront venir d'une API serveur MMO."}</p>
      </section>

      <aside class="leaderboard-rules-card frame">
        <div class="leaderboard-section-head">
          <div>
            <span class="tiny">SCORE DE GRADE</span>
            <h3>Comment gagner des points</h3>
          </div>
        </div>
        <div class="rank-breakdown-list">
          ${breakdown.map(row=>`<article class="rank-breakdown-row">
            <div>
              <strong>${row.label}</strong>
              <span>${row.source}</span>
            </div>
            <b>${fmt(row.points)}</b>
          </article>`).join("")}
        </div>
        <div class="rank-total-line">
          <span>Total calculé</span>
          <strong>${fmt(totalBreakdownPoints)}</strong>
        </div>
        <button class="rank-details-button" type="button" data-rank-details-open>Détails</button>
      </aside>
    </div>

    <section class="rank-table-card frame">
      <div class="leaderboard-section-head">
        <div>
          <span class="tiny">TABLE DES GRADES</span>
          <h3>Seuils de progression</h3>
        </div>
        <span class="badge">${RANK_TABLE.length} grades</span>
      </div>
      <div class="rank-table-grid">
        ${RANK_TABLE.map((grade,index)=>`<article class="rank-threshold ${grade.id === rank.id ? "current" : ""}">
          <span>#${index+1}</span>
          ${rankIcon(grade, grade.name)}
          <strong>${grade.name}</strong>
          <small>${fmt(grade.score)} pts</small>
        </article>`).join("")}
      </div>
    </section>
    ${renderRankDetailsModal(breakdown)}
    ${renderFullLeaderboardModal()}
  `;
}
