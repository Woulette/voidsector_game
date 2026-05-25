import { skills } from "../data/catalog.js";
import { canAffordSkillCost, getNodeMaxRank, getSkillLevel, getSkillProgress, getSkillUpgradeData, skillCostLabel, store } from "../core/store.js";

const BRANCH_META = {
  damage:{label:"Dégâts", code:"DMG", desc:"Armes laser, cadence offensive et rendement des tirs."},
  shield:{label:"Bouclier", code:"BCL", desc:"Absorption, générateurs, recharge et survie du vaisseau."},
  utility:{label:"Utilitaire", code:"UTL", desc:"Mobilité, soute, soutien et logistique de combat."}
};

function branchMeta(skill){
  return BRANCH_META[skill.id] || {label:skill.short || skill.name, code:skill.id.slice(0, 3).toUpperCase(), desc:skill.desc};
}

function roman(index){
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][index] || String(index + 1);
}

function currentNodeLabel(node, rank){
  if(!node) return "Palier vide";
  const ranks = Array.isArray(node.ranks) ? node.ranks : [node];
  if(rank <= 0) return ranks[0]?.label || "Aucun bonus";
  return ranks[Math.min(rank, ranks.length) - 1]?.label || "Aucun bonus";
}

function nodePriceLabel(node, rank){
  const ranks = Array.isArray(node?.ranks) ? node.ranks : [node];
  const next = ranks[rank] || null;
  if(!next) return "MAX";
  if(next.skillPoints === undefined || (!next.priceType && !next.costs)) return "Prix à définir";
  return `${next.skillPoints} pt${next.skillPoints > 1 ? "s" : ""} · ${skillCostLabel(next)}`;
}

function renderRankDots(rank, maxRank){
  return `<span class="skill-rank-dots">${Array.from({length:maxRank}, (_,index)=>`<i class="${index < rank ? "filled" : ""}"></i>`).join("")}</span>`;
}

function renderSkillNode(skill, node, index, progress, canUpgrade){
  const rank = progress.ranks[index] || 0;
  const maxRank = getNodeMaxRank(node);
  const done = rank >= maxRank;
  const available = index === progress.nodeIndex && !done && canUpgrade;
  const locked = index > progress.nodeIndex || (index === progress.nodeIndex && !done && !canUpgrade);
  const nodeName = node?.name || `Palier ${index + 1}`;
  return `<button class="skill-node ${done ? "done" : ""} ${available ? "available" : ""} ${locked ? "locked" : ""}" type="button" ${available ? `data-unlock-skill="${skill.id}"` : "disabled"}>
    <span class="skill-node-core">${done ? "✓" : roman(index)}</span>
    <span class="skill-node-title">${nodeName}</span>
    ${renderRankDots(rank, maxRank)}
    <small>Rang ${rank}/${maxRank} · ${currentNodeLabel(node, rank)}</small>
    <em>${done ? "Débloqué" : nodePriceLabel(node, rank)}</em>
  </button>`;
}

function activeBonuses(skill, progress){
  const labels = skill.levels
    .map((node, index)=>({node, rank:progress.ranks[index] || 0}))
    .filter(entry=>entry.rank > 0)
    .map(entry=>`${entry.node.name} ${entry.rank}/${getNodeMaxRank(entry.node)}`);
  return labels.join("<br>");
}

function renderBranch(skill){
  const meta = branchMeta(skill);
  const level = getSkillLevel(skill.id);
  const progress = getSkillProgress(skill.id);
  const maxLevel = Number(skill.maxLevel || skill.levels.length || 0);
  const next = getSkillUpgradeData(skill.id);
  const canUpgrade = !!next && store.state.player.skillPoints >= Number(next.skillPoints || 0) && canAffordSkillCost(next);
  const percent = progress.totalRanks ? Math.round(progress.completedRanks / progress.totalRanks * 100) : 0;
  const activeBonus = activeBonuses(skill, progress);

  return `<section class="skill-tree-branch ${skill.theme || ""}">
    <aside class="skill-branch-info">
      <span>${meta.code}</span>
      <h3>${meta.label}</h3>
      <p>${meta.desc}</p>
      <div class="skill-branch-progress"><b>${level}/${maxLevel}</b><i><span style="width:${percent}%"></span></i></div>
    </aside>
    <div class="skill-node-rail">
      ${skill.levels.map((node, index)=>renderSkillNode(skill, node, index, progress, canUpgrade)).join("")}
    </div>
    <aside class="skill-branch-summary">
      <strong>${level >= maxLevel ? "Branche terminée" : `${next?.node?.name || "Prochain palier"} · rang ${(next?.rankIndex ?? 0) + 1}/${getNodeMaxRank(next?.node)}`}</strong>
      <small>${level >= maxLevel ? "Tous les paliers sont débloqués." : (next?.label || "Aucun palier disponible.")}</small>
      <span>${activeBonus || "Aucun bonus actif."}</span>
    </aside>
  </section>`;
}

export function renderSkills(){
  const grids = document.querySelectorAll("[data-skill-grid], #skillGrid");
  if(!grids.length) return;
  const ordered = ["damage", "shield", "utility"].map(id=>skills.find(skill=>skill.id === id)).filter(Boolean);
  const otherSkills = skills.filter(skill=>!ordered.includes(skill));
  const html = `<div class="skill-tree-board">
    <div class="skill-tree-lanes">
      ${[...ordered, ...otherSkills].map(renderBranch).join("")}
    </div>
  </div>`;
  grids.forEach(grid=>{
    grid.classList.add("skill-tree-grid");
    grid.innerHTML = html;
  });
}
