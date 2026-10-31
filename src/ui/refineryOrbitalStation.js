import { fmt } from "../core/utils.js";
import {
  refineryAncestors, refineryArt, refineryDuration, refineryEscape as esc,
  refineryMaterialName as name
} from "./refineryPresentation.js";
import {
  refineryStationPosition as position, refineryStationLinkPlacement,
  refineryStationArtHtml, REFINERY_STATION_MODULES
} from "./refineryStationLayout.js";
export { REFINERY_STATION_ART, REFINERY_STATION_MODULES } from "./refineryStationLayout.js";

export const REFINERY_STATION_MATERIAL_ORDER = Object.freeze(
  Object.keys(REFINERY_STATION_MODULES).filter(id=>id !== "storage" && id !== "transport")
);

function materialButton(material, current, selectedId, mobile = false){
  const id = esc(material.id), label = esc(name(material));
  const module = REFINERY_STATION_MODULES[material.id];
  const status = current.job ? `Amélioration · ${refineryDuration(current.job.remaining)}` : current.status.text;
  const extra = current.job || current.status.key !== "active" ? `<small>${esc(status)}</small>` : "";
  return `<button type="button" class="${mobile ? "rf-station-index-item" : "rf-station-hit"} rf-station-${module.family} ${current.status.key === "locked" ? "is-locked" : ""} ${material.id === selectedId ? "is-selected" : ""}" ${mobile ? "" : `style="${position(module)}"`} data-refinery-select-material="${id}" ${mobile ? "" : `data-refinery-node="${id}"`} data-refinery-key="${mobile ? "index" : "station"}:${id}" aria-pressed="${material.id === selectedId}" aria-label="${label}, niveau ${current.level}, ${esc(status)}"><span class="rf-station-bracket" aria-hidden="true"></span><span class="rf-station-label"><span><strong>${label}</strong><b>· Niv. ${current.level}</b></span>${extra}</span></button>`;
}

function infrastructureButton(id, current, mobile = false){
  const label = id === "storage" ? "Stockage" : "Transport";
  const module = REFINERY_STATION_MODULES[id];
  return `<button type="button" class="${mobile ? "rf-station-index-item" : "rf-station-hit"} rf-station-utility" ${mobile ? "" : `style="${position(module)}"`} data-upgrade-refinery-module="${id}" data-refinery-key="${mobile ? "index" : "station"}:module:${id}" aria-label="${label}, niveau ${current.level}${current.job ? ", amélioration en cours" : ""}"><span class="rf-station-bracket" aria-hidden="true"></span><span class="rf-station-label"><span><strong>${label}</strong><b>· Niv. ${current.level}</b></span>${current.job ? `<small>Amélioration · ${refineryDuration(current.job.remaining)}</small>` : ""}</span></button>`;
}

function stationConnections(recipes, selectedId, showConnections){
  const selected = refineryAncestors(selectedId, recipes);
  const links = recipes.flatMap(recipe=>Object.entries(recipe.costs || {}).map(([from,amount],index,inputs)=>{
    const source = REFINERY_STATION_MODULES[from], target = REFINERY_STATION_MODULES[recipe.outputId];
    if(!source || !target) return "";
    const placement = refineryStationLinkPlacement(source,target,index,inputs.length);
    const active = showConnections ? selected.edges.has(`${from}:${recipe.outputId}`) : recipe.outputId === selectedId;
    return `<div class="rf-station-link rf-station-${source.family} ${active ? "is-ancestor" : ""}" style="${placement.style}" data-refinery-link="${esc(from)}:${esc(recipe.outputId)}" data-refinery-from="${esc(from)}" data-refinery-to="${esc(recipe.outputId)}" data-refinery-key="station-link:${esc(from)}:${esc(recipe.outputId)}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${placement.path}"></path></svg><i class="rf-station-link-arrow" style="top:${placement.arrowY}%" aria-hidden="true"></i><span class="rf-station-link-amount">×${Number(amount)}</span></div>`;
  })).join("");
  return `<div class="rf-station-connections" role="img" aria-label="Les quatorze liaisons de fabrication et leurs ingrédients">${links}</div>`;
}

function selectedControls(material, current, recipes, materialById){
  const id = esc(material.id), label = esc(name(material));
  const family = REFINERY_STATION_MODULES[material.id].family;
  const recipe = recipes.find(recipe=>recipe.outputId === material.id);
  const title = material.kind === "raw" ? `Collecteur de ${label.toLowerCase()}` : label;
  const powerOn = current.level > 0 && current.enabled !== false;
  const canUpgrade = Boolean(current.job || current.upgrade);
  const upgradeText = current.job ? "Voir l’amélioration" : current.level <= 0 ? "Débloquer" : canUpgrade ? "Améliorer" : "Niveau maximum";
  const inputs = Object.entries(recipe?.costs || {}).map(([inputId, amount])=>{
    const input = materialById.get(inputId);
    return `<button type="button" class="rf-station-ingredient" data-refinery-select-material="${esc(inputId)}" data-refinery-key="ingredient:${esc(inputId)}" aria-label="Sélectionner ${esc(name(input))}, ${Number(amount)} par recette">${refineryArt(input)}<span><b>${Number(amount)}</b> ${esc(name(input))}</span></button>`;
  }).join(`<span class="rf-station-plus" aria-hidden="true">+</span>`);
  return `<section class="rf-station-order rf-station-${family}" aria-label="Production de ${label}" data-refinery-key="station-order"><div class="rf-station-order-main">${refineryArt(material)}<div class="rf-station-order-copy"><h3>${title}</h3><p>Niveau ${current.level} / ${material.maxLevel || 20}<span>Débit théorique : <b>+ ${fmt(current.rate)} / h</b></span></p><small class="rf-station-production ${current.status.key}">${esc(current.status.text)}${current.job ? ` · Amélioration : ${refineryDuration(current.job.remaining)}` : ""}</small></div><div class="rf-station-actions"><button type="button" class="rf-station-improve" data-upgrade-refinery="${id}" ${canUpgrade ? "" : "disabled"}>${upgradeText}</button><button type="button" class="rf-station-power" data-toggle-refinery-production="${id}" aria-pressed="${powerOn}" ${current.level > 0 ? "" : "disabled"}>${powerOn ? "Mettre en pause" : "Activer la production"}</button></div></div>${current.job ? `<div class="rf-station-job" role="progressbar" aria-label="Amélioration de ${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${current.job.percent}"><i style="width:${current.job.percent}%"></i></div>` : ""}<div class="rf-station-recipe" data-refinery-key="station-recipe">${recipe ? `<span class="rf-station-recipe-caption">Pour ${Number(recipe.outputAmount || 1)} ${label}</span>${inputs}` : `<span>Production directe de minerai · Stock en station : <b>${fmt(current.stock)}</b> / ${fmt(current.cap)}</span>`}</div></section>`;
}

export function refineryOrbitalStationHtml({materials, recipes, selectedId, readMaterial, readModule, showConnections = false}){
  const materialById = new Map(materials.map(material=>[material.id,material]));
  const selected = materialById.get(selectedId) || materialById.get("cuivre_orbital") || materials[0];
  if(!selected) return "";
  const current = new Map(materials.map(material=>[material.id,readMaterial(material.id)]));
  const modules = Object.fromEntries(["storage","transport"].map(id=>[id,readModule(id)]));
  return `<section class="rf-orbital ${showConnections ? "show-connections" : ""}" aria-label="Station de raffinage orbitale" data-refinery-key="orbital-station"><div class="rf-station-toolbar"><span>Raffinerie orbitale</span><label><input type="checkbox" data-refinery-connections ${showConnections ? "checked" : ""}> Liaisons de fabrication</label></div><div class="rf-station-viewport" data-refinery-key="station-viewport"><div class="rf-station-scene" data-refinery-key="station-scene">${refineryStationArtHtml()}${stationConnections(recipes,selected.id,showConnections)}${materials.map(material=>materialButton(material,current.get(material.id),selected.id)).join("")}${["storage","transport"].map(id=>infrastructureButton(id,modules[id])).join("")}</div></div><div class="rf-station-mobile-index" aria-label="Modules de la station">${materials.map(material=>materialButton(material,current.get(material.id),selected.id,true)).join("")}${["storage","transport"].map(id=>infrastructureButton(id,modules[id],true)).join("")}</div>${selectedControls(selected,current.get(selected.id),recipes,materialById)}</section>`;
}
