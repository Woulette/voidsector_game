import { portals, skills } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import {
  RANK_POINT_RULES,
  RANK_TABLE,
  canAfford,
  getCurrentRank,
  getLeaderboardRows,
  getNextRank,
  getPortalPieces,
  getRankBreakdown,
  getRankProgress,
  getSkillLevel,
  getSkillUpgradeData,
  isPortalUnlocked,
  priceLabel,
  store
} from "../core/store.js";
import { rankIcon, rankInline } from "./renderShared.js";

export function renderPortals(){
  const grid = document.getElementById("portalGrid");
  if(!grid) return;
  grid.innerHTML = portals.map(p=>{
    const pieces = getPortalPieces(p.id);
    const unlocked = isPortalUnlocked(p.id);
    const reqLevelOk = store.state.player.level >= p.requirement.level;
    const canEnter = unlocked && reqLevelOk && !!store.state.activeShip;
    const canUnlockPieces = !unlocked && pieces >= p.piecesRequired;
    const canUnlockNova = !unlocked && canAfford("premium", p.novaCost);
    const clearCount = Math.max(0, Number(store.state.completedPortals?.[p.id] || 0));
    const actionHtml = unlocked
      ? `<button class="blue-button small" data-start-portal="${p.id}" ${canEnter ? "" : "disabled"}>${canEnter ? "Entrer" : !store.state.activeShip ? "Équiper un vaisseau" : "Prérequis manquants"}</button>`
      : `<button class="blue-button secondary small" data-unlock-portal-pieces="${p.id}" ${canUnlockPieces ? "" : "disabled"}>Utiliser ${fmt(p.piecesRequired)} pièces</button><button class="blue-button small" data-unlock-portal-nova="${p.id}" ${canUnlockNova ? "" : "disabled"}>Payer ${fmt(p.novaCost)} NOVA</button>`;
    return `<article class="portal-card ${canEnter ? "ready" : unlocked ? "unlocked" : "locked"}">
      <img src="${p.img}" alt="${p.name}">
      <div class="portal-card-head"><h3>${p.name}</h3><span class="badge">${p.level}</span></div>
      <div class="portal-state">${unlocked ? "DÉVERROUILLÉ" : "SCELLÉ"} · ${reqLevelOk ? "Niveau OK" : `Niv ${p.requirement.level}`}</div>
      <div class="portal-piece-row"><span>Pièces</span><strong>${fmt(pieces)} / ${fmt(p.piecesRequired)}</strong></div>
      <div class="stat-track compact"><span style="width:${Math.min(100, pieces / p.piecesRequired * 100)}%"></span></div>
      <p class="portal-copy">Drop : ${p.dropZones.join(", ")} · taux ${p.dropChance ? (p.dropChance * 100).toFixed(2).replace('.', ',') : '0,00'}%</p>
      <p class="portal-copy reward">Récompense : ${p.reward}</p>
      <div class="portal-actions">${actionHtml}</div>
      <small class="portal-history">${clearCount ? `${clearCount} nettoyage(s)` : "Jamais terminé"}</small>
    </article>`;
  }).join("");
}

export function renderSkills(){
  const grid = document.getElementById("skillGrid");
  if(!grid) return;
  grid.innerHTML = skills.map(skill=>{
    const level = getSkillLevel(skill.id);
    const maxLevel = Number(skill.maxLevel || skill.levels.length || 0);
    const next = getSkillUpgradeData(skill.id);
    const currentBonus = skill.levels.slice(0, level).map(step=>step.label).join(" · ");
    const can = !!next && store.state.player.skillPoints >= Number(next.skillPoints || 0) && canAfford(next.priceType, next.price);
    const price = next ? priceLabel(next.priceType, next.price) : "MAX";
    return `<article class="skill-card branch ${skill.theme || ""} ${level >= maxLevel ? "unlocked" : ""}">
      <div class="skill-card-head">
        <div class="skill-icon">${skill.icon}</div>
        <div>
          <h3>${skill.name}</h3>
          <small>Niveau ${level}/${maxLevel}</small>
        </div>
      </div>
      <p>${skill.desc}</p>
      <div class="skill-progress-row"><span>Progression</span><span>${level}/${maxLevel}</span></div>
      <div class="mini-bar"><span style="width:${maxLevel ? (level / maxLevel) * 100 : 0}%"></span></div>
      <div class="skill-bonus-box">
        <strong>Bonus actuels</strong>
        <small>${currentBonus || "Aucun bonus actif pour le moment."}</small>
      </div>
      <div class="skill-next-box">
        <strong>${next ? `Niveau ${level + 1}` : "Compétence terminée"}</strong>
        <small>${next ? `${next.label} · ${next.skillPoints} pt${next.skillPoints > 1 ? "s" : ""} · ${price}` : "Tous les paliers sont débloqués."}</small>
      </div>
      <button class="blue-button small" data-unlock-skill="${skill.id}" ${!next || !can ? "disabled" : ""}>${next ? `Améliorer (${price})` : "MAX"}</button>
    </article>`;
  }).join("");
}


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
        <p class="leaderboard-note">Pour le moment ce classement mélange ton vrai pilote sauvegardé en local avec des pilotes de démonstration. Plus tard, les lignes pourront venir d’une API serveur MMO.</p>
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
