import { rawMaterialCatalog, skills } from "../data/catalog.js?v=20260726-kharon1";
import { canAffordSkillCost, getSkillNodeLockReason, getSkillNodePortalRequirement, getSkillProgress, getSkillUpgradeData, hasCompletedSkillNodePortal, isSkillNodeUnlocked, store } from "../core/store.js?v=20260726-kharon1";
import { currencyIconHtml } from "./currencyIcons.js";
import { createSkillTreeModel, resolveSkillTreeSelection, skillTreeRoman } from "./skillTreeModel.js?v=20261023-skills1";
import { skillTreeBranchIcon, skillTreeIcon } from "./skillTreeIcons.js?v=20261023-skillemblems1";

let selectedSkillNode = null;
const renderedMarkup = new WeakMap();
const fmt = value=>Math.max(0, Number(value) || 0).toLocaleString("fr-FR");
const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);

export function selectSkillNode(branchId, nodeIndex){
  const selection = {branchId, nodeIndex:Number(nodeIndex)};
  const valid = resolveSkillTreeSelection(skills, selection);
  if(!valid || valid.branchId !== branchId || valid.nodeIndex !== selection.nodeIndex) return false;
  selectedSkillNode = valid;
  return true;
}

function rankDots(rank, maxRank){
  return `<span class="skill-tree-rank-dots" aria-hidden="true">${Array.from({length:maxRank}, (_, index)=>`<i class="${index < rank ? "filled" : ""}"></i>`).join("")}</span>`;
}

function renderNode(node){
  const classes = ["skill-tree-node", node.selected && "selected", node.done && "done", node.locked && "locked", node.available && "available"].filter(Boolean).join(" ");
  const status = node.done ? "rang maximum" : node.reason || "amélioration disponible";
  return `<button class="${classes}" type="button" data-skill-select="${escapeHtml(node.branchId)}" data-skill-node="${node.index}" aria-pressed="${node.selected}" aria-label="${escapeHtml(`${node.name}, rang ${node.rank} sur ${node.maxRank}, ${status}`)}">
    <span class="skill-tree-node-tile">${skillTreeIcon(node.locked ? "lock" : node.icon)}${rankDots(node.rank, node.maxRank)}<b>${node.rank} / ${node.maxRank}</b></span>
    <span class="skill-tree-node-label">${escapeHtml(node.name)}</span>
  </button>`;
}

function renderBranch(branch){
  return `<section class="skill-tree-lane ${escapeHtml(branch.id)}" data-skill-branch="${escapeHtml(branch.id)}" aria-label="Branche ${escapeHtml(branch.label)}">
    <aside class="skill-tree-branch-info">${skillTreeBranchIcon(branch.icon)}<div><h3>${escapeHtml(branch.label)}</h3><p>${escapeHtml(branch.description)}</p></div></aside>
    <div class="skill-tree-node-rail">${branch.nodes.map(renderNode).join("")}</div>
  </section>`;
}

function renderCost(entry){
  const icon = entry.currency ? currencyIconHtml(entry.currency)
    : entry.image ? `<img src="${escapeHtml(entry.image)}" alt="" loading="lazy">` : skillTreeIcon(entry.icon);
  const label = entry.id === "points" ? `${fmt(entry.amount)} point${entry.amount > 1 ? "s" : ""}` : fmt(entry.amount);
  return `<div class="skill-tree-cost-entry${entry.insufficient ? " insufficient" : ""}" title="Disponible : ${escapeHtml(fmt(entry.available))}${entry.baseAmount > entry.amount ? ` · Prix initial : ${escapeHtml(fmt(entry.baseAmount))} NOVA` : ""}">
    ${icon}<div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(entry.label)}</small></div>
  </div>`;
}

function renderDetail(node){
  if(!node) return `<aside class="skill-tree-detail"><p>Aucune compétence disponible.</p></aside>`;
  return `<aside class="skill-tree-detail ${escapeHtml(node.branchId)}" aria-label="Détail de la compétence sélectionnée">
    <header class="skill-tree-detail-heading"><span class="skill-tree-detail-icon">${skillTreeIcon(node.icon)}</span><div><h3>${escapeHtml(node.name)}</h3><p>Branche ${escapeHtml(node.branchLabel)}</p><div class="skill-tree-detail-rank"><span>Rang <strong>${node.rank} / ${node.maxRank}</strong></span>${rankDots(node.rank, node.maxRank)}</div></div></header>
    <p class="skill-tree-description">${escapeHtml(node.description)}</p>
    <section class="skill-tree-effect"><h4>Effet actuel / prochain rang</h4><div class="skill-tree-effect-box"><div><span>Niveau actuel</span><strong>${escapeHtml(node.currentLabel)}</strong></div>${skillTreeIcon("arrow")}<div><span>${node.done ? "Compétence terminée" : "Prochain rang"}</span><strong>${escapeHtml(node.nextLabel)}</strong></div></div></section>
    <section class="skill-tree-cost"><h4>Coût</h4>${node.costs.length ? `<div class="skill-tree-cost-grid">${node.costs.map(renderCost).join("")}</div>` : `<p class="skill-tree-complete-label">Tous les rangs sont acquis.</p>`}</section>
    <button class="skill-tree-upgrade" type="button" ${node.canUpgrade ? `data-unlock-skill="${escapeHtml(node.branchId)}"` : "disabled"} ${node.reason ? `aria-describedby="skill-tree-upgrade-reason"` : ""}>${skillTreeIcon(node.done ? "check" : "gear")}<span>${node.done ? "Rang maximum" : "Améliorer"}</span></button>
    ${node.reason ? `<p class="skill-tree-upgrade-reason" id="skill-tree-upgrade-reason" role="status">${escapeHtml(node.reason)}</p>` : ""}
    <section class="skill-tree-ranks"><h4>Rangs</h4>${node.ranks.map(rank=>`<div class="skill-tree-rank-row${rank.earned ? " earned" : rank.next ? " next" : ""}"><b>${skillTreeRoman(rank.index)}</b><span>${escapeHtml(rank.label)}</span>${skillTreeIcon(rank.earned ? "check" : rank.next ? "circle" : "lock")}</div>`).join("")}</section>
  </aside>`;
}

export function renderSkillTreeMarkup(model){
  return `<div class="skill-tree-layout"><section class="skill-tree-main" aria-label="Arbre des compétences du pilote">
    <header class="skill-tree-heading"><div class="skill-tree-heading-title"><span class="tiny">Hangar</span><h2>Compétences du pilote</h2><p>Développez votre spécialisation.</p></div><div class="skill-tree-points"><strong data-skill-points>${fmt(model.points)}</strong><span>point${model.points > 1 ? "s" : ""} disponible${model.points > 1 ? "s" : ""}</span></div><div class="skill-tree-access ${model.portal.completed ? "complete" : "locked"}">${skillTreeIcon(model.portal.completed ? "check" : "lock")}<span>${escapeHtml(model.portal.label)} ${model.portal.completed ? "terminé" : "à terminer"}</span></div></header>
    <div class="skill-tree-board"><div class="skill-tree-tier-head" aria-hidden="true"><span class="skill-tree-tier-spacer"></span>${Array.from({length:model.tierCount}, (_, index)=>`<span>Palier ${skillTreeRoman(index)}</span>`).join("")}</div><div class="skill-tree-lanes">${model.branches.map(renderBranch).join("")}</div></div>
    <p class="skill-tree-prerequisite">${skillTreeIcon("info")}<span>Le palier suivant exige 3/3 dans les trois branches du palier précédent.</span></p>
  </section>${renderDetail(model.selected)}</div>`;
}

export function updateSkillTree(grid, model){
  const markup = renderSkillTreeMarkup(model);
  if(renderedMarkup.get(grid) === markup) return;
  const focused = grid.contains(document.activeElement) ? document.activeElement : null;
  const focusBranch = focused?.getAttribute("data-skill-select");
  const focusNode = focused?.getAttribute("data-skill-node");
  const focusUpgrade = focused?.classList.contains("skill-tree-upgrade");
  const scrollSelectors = [".skill-tree-main", ".skill-tree-board", ".skill-tree-detail"];
  const scrolls = scrollSelectors.map(selector=>{
    const element = grid.querySelector(selector);
    return {selector, top:element?.scrollTop || 0, left:element?.scrollLeft || 0};
  });
  grid.innerHTML = markup;
  renderedMarkup.set(grid, markup);
  for(const scroll of scrolls){
    const element = grid.querySelector(scroll.selector);
    if(element){ element.scrollTop = scroll.top; element.scrollLeft = scroll.left; }
  }
  const nextFocus = focusBranch
    ? [...grid.querySelectorAll("[data-skill-select]")].find(button=>button.dataset.skillSelect === focusBranch && button.dataset.skillNode === focusNode)
    : focusUpgrade ? grid.querySelector(".skill-tree-upgrade:not(:disabled)") || grid.querySelector('[data-skill-select][aria-pressed="true"]') : null;
  nextFocus?.focus({preventScroll:true});
}

export function renderSkills(){
  const grids = document.querySelectorAll("[data-skill-grid], #skillGrid");
  if(!grids.length || !store.state?.player) return;
  const model = createSkillTreeModel({
    catalog:skills, selection:selectedSkillNode, player:store.state.player, cargoHold:store.state.cargoHold,
    materials:rawMaterialCatalog, getProgress:getSkillProgress, getUpgradeData:getSkillUpgradeData,
    getLockReason:getSkillNodeLockReason, isUnlocked:isSkillNodeUnlocked, canAffordCost:canAffordSkillCost,
    portalRequirement:getSkillNodePortalRequirement(0), portalComplete:hasCompletedSkillNodePortal(0)
  });
  selectedSkillNode = model.selection;
  grids.forEach(grid=>{ grid.classList.add("skill-tree-grid"); updateSkillTree(grid, model); });
}
