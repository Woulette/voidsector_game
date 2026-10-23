import { fmt } from "../core/utils.js";

export const REFINERY_TREE_POSITIONS = Object.freeze({
  cuivre_orbital:[108, 60], zinc_spatial:[108, 180], nickel_brut:[108, 300],
  titane_fissure:[108, 420], silice_conductrice:[108, 540],
  alliage_cuivre_zinc:[420, 120], catalyseur_quantique:[420, 300],
  plaque_nickel_titane:[420, 480], conducteur_renforce:[760, 210],
  blindage_composite:[760, 390], noyau_astra:[1080, 300]
});

export function refineryEscape(value){
  return String(value ?? "").replace(/[&<>"']/g, character=>({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[character]);
}

export function refineryMaterialName(material){
  if(material?.id === "catalyseur_quantique") return "Catalyseur";
  if(material?.id === "noyau_astra") return "Noyau Astra";
  return material?.name || "Matériau";
}

export function refineryKindLabel(kind){
  return ({raw:"Minerai brut", refined:"Matériau raffiné", special:"Composant spécial",
    advanced:"Composant avancé", final:"Matériau final"})[kind] || "Matériau";
}

export function refineryArt(material, className = ""){
  if(!material) return "";
  return `<span class="rf-art ${refineryEscape(className)}"><img src="${refineryEscape(material.img)}" alt="${refineryEscape(refineryMaterialName(material))}" loading="eager" draggable="false"></span>`;
}

export function refineryDuration(ms){
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if(hours) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  if(minutes) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
  return `${seconds} s`;
}

export function refineryPercent(value, max){
  return Math.max(0, Math.min(100, Number(max) > 0 ? Number(value) / Number(max) * 100 : 0));
}

export function refineryAncestors(selectedId, recipes){
  const nodes = new Set();
  const edges = new Set();
  function visit(id){
    if(nodes.has(id)) return;
    nodes.add(id);
    const recipe = recipes.find(entry=>entry.outputId === id);
    for(const inputId of Object.keys(recipe?.costs || {})){
      edges.add(`${inputId}:${id}`);
      visit(inputId);
    }
  }
  visit(selectedId);
  return {nodes, edges};
}

// These are capacities configured by the player's levels and power switches,
// not measurements of completed production or predictions of available inputs.
export function refineryTheoreticalFlows(materials, recipes, getRate){
  const flows = new Map(materials.map(material=>[material.id, {
    produced:Math.max(0, Number(getRate(material.id) || 0)), consumed:0, uses:[]
  }]));
  for(const recipe of recipes){
    const outputRate = flows.get(recipe.outputId)?.produced || 0;
    const crafts = outputRate / Math.max(1, Number(recipe.outputAmount || 1));
    if(!crafts) continue;
    for(const [inputId, quantity] of Object.entries(recipe.costs || {})){
      const input = flows.get(inputId);
      if(!input) continue;
      const amount = Math.max(0, Number(quantity || 0)) * crafts;
      input.consumed += amount;
      input.uses.push({outputId:recipe.outputId, amount});
    }
  }
  return flows;
}

export function refineryProductionStatus({level, enabled, stock, cap, recipe, getStock}){
  if(level <= 0) return {key:"locked", text:"À débloquer"};
  if(!enabled) return {key:"paused", text:"En pause"};
  if(cap > 0 && stock >= cap) return {key:"full", text:"Stock plein"};
  if(recipe && Object.entries(recipe.costs || {}).some(([id, amount])=>getStock(id) < Number(amount))){
    return {key:"waiting", text:"Ingrédients manquants"};
  }
  return {key:"active", text:"En production"};
}

export function refineryTreeHtml(materials, recipes, selectedId, readMaterial){
  const ancestors = refineryAncestors(selectedId, recipes);
  const links = recipes.flatMap(recipe=>Object.entries(recipe.costs || {}).map(([inputId, amount])=>({
    inputId, outputId:recipe.outputId, amount
  })));
  const wires = links.map(link=>{
    const start = REFINERY_TREE_POSITIONS[link.inputId];
    const end = REFINERY_TREE_POSITIONS[link.outputId];
    if(!start || !end) return "";
    const x1 = start[0] + 102, x2 = end[0] - 102, dx = x2 - x1;
    const active = ancestors.edges.has(`${link.inputId}:${link.outputId}`);
    const key = refineryEscape(`${link.inputId}:${link.outputId}`);
    return `<g class="rf-tree-link ${active ? "is-ancestor" : ""}" data-refinery-link="${key}" data-refinery-from="${refineryEscape(link.inputId)}" data-refinery-to="${refineryEscape(link.outputId)}" data-refinery-key="link:${key}"><path d="M${x1},${start[1]} C${x1 + dx * .46},${start[1]} ${x2 - dx * .46},${end[1]} ${x2},${end[1]}" marker-end="url(#${active ? "rf-arrow-active" : "rf-arrow"})"></path><g class="rf-link-quantity" transform="translate(${(x1 + x2) / 2},${(start[1] + end[1]) / 2})"><rect x="-18" y="-10" width="36" height="20" rx="3"></rect><text text-anchor="middle" y="4">×${Number(link.amount)}</text></g></g>`;
  }).join("");
  const nodes = materials.map(material=>{
    const position = REFINERY_TREE_POSITIONS[material.id];
    if(!position) return "";
    const current = readMaterial(material.id);
    const selected = material.id === selectedId;
    return `<button type="button" class="rf-tree-node ${refineryEscape(material.kind)} ${selected ? "is-selected" : ""} ${ancestors.nodes.has(material.id) ? "is-ancestor" : ""}" data-refinery-select-material="${refineryEscape(material.id)}" data-refinery-node="${refineryEscape(material.id)}" data-refinery-key="node:${refineryEscape(material.id)}" style="--node-x:${position[0] / 12}%;--node-y:${position[1] / 6}%" aria-pressed="${selected}" aria-label="${refineryEscape(refineryMaterialName(material))}, niveau ${current.level}, ${fmt(current.stock)} en station, ${refineryEscape(current.status.text)}"><span class="rf-node-status ${current.status.key}">${current.status.text}</span><span class="rf-node-body">${refineryArt(material)}<span class="rf-node-copy"><strong>${refineryEscape(refineryMaterialName(material))}</strong><span>${fmt(current.stock)} <small>Stock en station</small></span></span></span><span class="rf-node-footer"><span>Niveau ${current.level} / ${material.maxLevel || 20}</span><span>${current.level > 0 ? `+ ${fmt(current.rate)} / h` : "Voir la recette"}</span></span>${current.job ? `<span class="rf-node-upgrade" title="Amélioration en cours"><i style="width:${current.job.percent}%"></i></span>` : ""}</button>`;
  }).join("");
  return `<section class="rf-tree-panel" aria-label="Arbre complet de la raffinerie"><div class="rf-tree-scroll" data-refinery-key="tree-scroll"><div class="rf-tree-canvas"><div class="rf-tree-columns"><div><b>01</b><span>EXTRACTION<small>5 minerais bruts</small></span></div><div><b>02</b><span>TRANSFORMATION<small>Alliage · Catalyseur · Plaque</small></span></div><div><b>03</b><span>COMPOSANTS<small>Conducteur · Blindage</small></span></div><div><b>04</b><span>NOYAU<small>Matériau final</small></span></div></div><div class="rf-tree-surface"><svg class="rf-tree-wires" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-label="Les quantités sont les ingrédients nécessaires par recette"><defs><marker id="rf-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#6b92a6" stroke-width="1.3"></path></marker><marker id="rf-arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#e6ad57" stroke-width="1.5"></path></marker></defs>${wires}</svg>${nodes}</div></div></div><div class="rf-tree-legend"><span><i></i>Toutes les recettes</span><span class="is-active"><i></i>Chaîne du matériau sélectionné</span><small>Quantités pour une recette · débits théoriques</small></div></section>`;
}
