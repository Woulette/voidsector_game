import { portals } from "../data/catalog.js";
import { getEnemyAssetRotationStyle } from "../data/enemyVisuals.js";
import { ENEMY_TYPES, MAPS } from "../game/combatData.js";
import { fmt } from "../core/utils.js";
import {
  RANK_TABLE,
  getCurrentRank,
  calculateMonsterKillRankPoints,
  getLeaderboardRows,
  getNextRank,
  getRankBreakdown,
  getRankProgress,
  store
} from "../core/store.js";
import { rankIcon, rankInline } from "./renderShared.js";

let rankDetailsOpen = false;
let rankDetailsEventsInstalled = false;

function getEnemyLevelRange(kind){
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

function getCurrentEnemyLevelForRate(playerLevel, range){
  const [min, max] = range;
  return Math.max(min, Math.min(max, Math.floor(Number(playerLevel || 1))));
}

function getCurrentMonsterRateLabel(playerLevel, range){
  const enemyLevel = getCurrentEnemyLevelForRate(playerLevel, range);
  const points = calculateMonsterKillRankPoints(playerLevel, enemyLevel);
  const denominator = Math.max(1, Math.round(1 / Math.max(points, 0.000001)));
  return `1 / ${fmt(denominator)}`;
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
  const playerLevel = Math.max(1, Number(player.level || 1));
  const completedPortals = store.state.completedPortals || {};
  const rankKillStats = store.state.rankKillStats || {};
  const xpRow = breakdown.find(row=>row.id === "xp") || {};
  const reputationRow = breakdown.find(row=>row.id === "reputation") || {};
  const killRow = breakdown.find(row=>row.id === "kill") || {};
  const levelRow = breakdown.find(row=>row.id === "level") || {};
  const portalRow = breakdown.find(row=>row.id === "portal") || {};
  const monsterRows = Object.entries(rankKillStats)
    .map(([kind, entry])=>({
      kind,
      name:ENEMY_TYPES[kind]?.name || kind,
      img:ENEMY_TYPES[kind]?.img || "",
      levelRange:getEnemyLevelRange(kind),
      kills:Math.max(0, Number(entry?.kills || 0)),
      points:Math.max(0, Number(entry?.points || 0)),
      lastPlayerLevel:Math.max(1, Number(entry?.lastPlayerLevel || 1)),
      lastEnemyLevel:Math.max(1, Number(entry?.lastEnemyLevel || 1))
    }))
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
            <div class="rank-monster-head"><span>Monstre</span><span>Kills</span><span>Taux actuel</span><span>Dernier niveau</span><span>Points</span></div>
            ${monsterRows.map(row=>`<div>
              <span class="rank-monster-name">${monsterImageHtml(row)}<span><b>${row.name}</b><small>Niv. ${fmt(row.levelRange[0])} a ${fmt(row.levelRange[1])}</small></span></span>
              <b>${fmt(row.kills)}</b>
              <em>${getCurrentMonsterRateLabel(playerLevel, row.levelRange)}</em>
              <small>Joueur ${fmt(row.lastPlayerLevel)} / ennemi ${fmt(row.lastEnemyLevel)}</small>
              <strong>${fmt(row.points)} pts</strong>
            </div>`).join("")}
          </div>` : `<p class="rank-detail-empty">Aucun monstre comptabilise pour le moment.</p>`}
        </section>
      </section>
    </div>
  `;
}

export function renderLeaderboard(){
  installRankDetailsEvents();
  const panel = document.getElementById("leaderboardPanel");
  if(!panel) return;
  const rows = getLeaderboardRows();
  const self = rows.find(row=>row.isPlayer) || rows[0];
  const rank = getCurrentRank();
  const next = getNextRank();
  const progress = getRankProgress();
  const breakdown = getRankBreakdown();
  const totalBreakdownPoints = breakdown.reduce((sum,row)=>sum + row.points, 0);

  panel.innerHTML = `
    <div class="leaderboard-summary-grid">
      <article class="leaderboard-summary-card">
        <span class="tiny">TA POSITION</span>
        <strong>#${self.position || "—"}</strong>
        <small>${self.pilot || store.state.player.name}</small>
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
            <span class="tiny">CLASSEMENT LOCAL</span>
            <h3>Prévisualisation MMO</h3>
          </div>
          <span class="badge">Backend plus tard</span>
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
              ${rows.map(row=>`<tr class="${row.isPlayer ? "is-player" : ""}">
                <td>${row.position}</td>
                <td><strong>${row.pilot}</strong>${row.isPlayer ? `<span class="you-badge">TOI</span>` : ""}</td>
                <td>${rankInline({id:row.rankId, name:row.grade})}</td>
                <td>${fmt(row.points)}</td>
                <td>${fmt(row.level)}</td>
                <td>${fmt(row.kills)}</td>
                <td>${fmt(row.portals)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="leaderboard-note">Pour le moment ce classement mélange ton vrai pilote sauvegardé en local avec des pilotes de démonstration. Plus tard, les lignes pourront venir d'une API serveur MMO.</p>
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
  `;
}
