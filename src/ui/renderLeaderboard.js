import { fmt } from "../core/utils.js";
import {
  RANK_POINT_RULES,
  RANK_TABLE,
  getCurrentRank,
  getLeaderboardRows,
  getNextRank,
  getRankBreakdown,
  getRankProgress,
  store
} from "../core/store.js";
import { rankIcon, rankInline } from "./renderShared.js";
export function renderLeaderboard(){
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
              <small>${row.formula}</small>
            </div>
            <b>${fmt(row.points)}</b>
          </article>`).join("")}
        </div>
        <div class="rank-total-line">
          <span>Total calculé</span>
          <strong>${fmt(totalBreakdownPoints)}</strong>
        </div>
        <div class="rank-rules-mini">
          ${RANK_POINT_RULES.map(rule=>`<div><b>${rule.label}</b><span>${rule.rate}</span></div>`).join("")}
        </div>
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
  `;
}
