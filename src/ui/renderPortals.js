import { portals } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import { canAfford, getPortalPieces, isPortalUnlocked, store } from "../core/store.js";
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
