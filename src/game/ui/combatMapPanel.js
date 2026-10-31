import { getMapDisplayName } from "../../data/firms.js";
import { getSectorMapPortals, getStellarMapConnections, getStellarMapPosition, getStellarTravelRoute } from "./sectorMapPresentation.js";

export const GAME_MAP_SECTORS = [
  {
    id:"cyan",
    name:"Nereid",
    theme:"cyan",
    label:"Cygnus",
    cells:[
      {n:1, x:1.05, y:.9, portals:["bottom-right"]},
      {n:2, x:2.25, y:2.15, portals:["top-left","bottom-left","right"]},
      {n:4, x:3.5, y:2.15, portals:["left","top-right"]},
      {n:3, x:2.25, y:3.4, bridge:"astra", portals:["bottom-left","top-left","right"]},
      {n:5, x:3.5, y:3.4, portals:["left","right"]}
    ],
    links:[[1,2],[2,3],[2,4],[3,5],[4,5]]
  },
  {
    id:"astra",
    name:"Helion",
    theme:"astra",
    label:"Astra",
    cells:[
      {n:3, x:2.25, y:4.85, bridge:"cyan", portals:["top-left","bottom-left","bottom-right","top-right"]},
      {n:5, x:3.5, y:4.85, portals:["top-left","bottom-left","right"]},
      {n:2, x:2.25, y:6.1, portals:["bottom-left","top-left","bottom-right"]},
      {n:4, x:3.5, y:6.1, portals:["bottom-left","top-left","top-right"]},
      {n:1, x:1.05, y:7.2, portals:["top-right"]}
    ],
    links:[[1,2],[2,3],[2,4],[3,5],[4,5],[3,4]]
  },
  {
    id:"yellow",
    name:"Aureon",
    theme:"auric",
    label:"Solarys",
    cells:[
      {n:1, x:9.2, y:.9, portals:["bottom-left"]},
      {n:4, x:6.85, y:2.15, portals:["left","right","bottom-left"]},
      {n:2, x:8.1, y:2.15, portals:["left","top-right","bottom-right"]},
      {n:5, x:6.85, y:3.4, portals:["left","top-right","right"]},
      {n:3, x:8.1, y:3.4, portals:["top-right","bottom-right","left"]}
    ],
    links:[[1,2],[2,3],[2,4],[3,5],[4,5]]
  },
  {
    id:"green",
    name:"Sylva",
    theme:"verdant",
    label:"Verdantis",
    cells:[
      {n:5, x:6.85, y:4.85, portals:["left","right","bottom-right"]},
      {n:3, x:8.1, y:4.85, portals:["top-left","left","top-right"]},
      {n:4, x:6.85, y:6.1, portals:["left","right","top-left"]},
      {n:2, x:8.1, y:6.1, portals:["left","bottom-right","top-right"]},
      {n:1, x:9.2, y:7.2, portals:["top-left"]}
    ],
    links:[[1,2],[2,3],[2,4],[3,5],[4,5]]
  }
];

export const GAME_MAP_BRIDGES = [
  {from:"Nereid-04", to:"Aureon-04", label:"Liaison nord"},
  {from:"Nereid-03", to:"Helion-03", label:"Nereid-03 / Helion-03"},
  {from:"Nereid-05", to:"Helion-05", label:"Liaison verticale"},
  {from:"Helion-04", to:"Sylva-04", label:"Helion-04 / Sylva-04"},
  {from:"Helion-05", to:"CORE", label:"Acces noyau Helion"},
  {from:"Nereid-05", to:"CORE", label:"Acces noyau Nereid"},
  {from:"Aureon-05", to:"CORE", label:"Acces noyau Aureon"},
  {from:"Aureon-05", to:"Sylva-05", label:"Liaison verticale"},
  {from:"Aureon-03", to:"Sylva-03", label:"Liaison verticale"},
  {from:"Sylva-05", to:"CORE", label:"Acces noyau Sylva"}
];

const DEFAULT_ENEMY_LEVELS_BY_MAP_NUMBER = Object.freeze({
  1:Object.freeze([1, 4]),
  2:Object.freeze([5, 9]),
  3:Object.freeze([10, 14]),
  4:Object.freeze([15, 19]),
  5:Object.freeze([20, 24])
});
const DEFAULT_CORE_ENEMY_LEVELS = Object.freeze([25, 34]);

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function getMapByName(maps, name){
  const upper = String(name || "").toUpperCase();
  return maps.find(map=>String(map.name || "").toUpperCase() === upper) || null;
}

function getCurrentMapName(getCurrentMap){
  return String(getCurrentMap?.()?.name || "").toUpperCase();
}

export function getMapEnemyLevelRange(map, fallbackMapNumber = 0){
  const source = Array.isArray(map?.enemyLevel)
    ? map.enemyLevel
    : Array.isArray(map?.level)
      ? map.level
      : String(map?.name || "").toUpperCase() === "CORE"
        ? DEFAULT_CORE_ENEMY_LEVELS
        : DEFAULT_ENEMY_LEVELS_BY_MAP_NUMBER[Number(fallbackMapNumber)] || [];
  if(source.length < 2) return [];
  const min = Math.max(1, Math.floor(Number(source[0] || 1)));
  const max = Math.max(min, Math.floor(Number(source[1] || min)));
  return [min, max];
}

function renderEnemyLevelLabel(range){
  if(!Array.isArray(range) || range.length < 2) return "";
  return `<em class="sector-map-level">LV ${range[0]}&ndash;${range[1]}</em>`;
}

export function getPortgunMapLevelRequirement(map){
  const name = String(map?.name || "").toUpperCase();
  if(name === "CORE") return 0;
  const match = name.match(/-(\d+)$/);
  const num = match ? Number(match[1]) : 0;
  if(num === 3) return 5;
  if(num === 4) return 10;
  if(num === 5) return 15;
  return 0;
}

function getStellarNodes(maps){
  const nodes = GAME_MAP_SECTORS.flatMap(sector=>sector.cells.map(cell=>{
    const name = `${sector.name}-${String(cell.n).padStart(2, "0")}`;
    return {name, map:getMapByName(maps, name), theme:sector.theme, number:cell.n, region:sector.label};
  }));
  nodes.push({name:"CORE", map:getMapByName(maps, "CORE"), theme:"violet", number:0, region:"Noyau central"});
  return nodes;
}

function mapMatches(map, value){
  return value != null && (map?.id != null && String(map.id) === String(value) || String(map?.name || "").toUpperCase() === String(value).toUpperCase());
}

function nodeDisplayName(node){
  return node.map?.displayName || getMapDisplayName(node.name);
}

function renderPlanet(theme){
  return `<i class="stellar-planet ${theme}" aria-hidden="true"></i>`;
}

function renderStellarConnections(maps, selectedMap, travelState){
  const route = getStellarTravelRoute(travelState);
  const lines = getStellarMapConnections(maps).map(({from, to})=>{
    const a = getStellarMapPosition(from.name);
    const b = getStellarMapPosition(to.name);
    const external = from.name.split("-")[0] !== to.name.split("-")[0];
    const related = selectedMap && (mapMatches(from, selectedMap.id ?? selectedMap.name) || mapMatches(to, selectedMap.id ?? selectedMap.name));
    const active = route.some((id, index)=>index > 0 &&
      (mapMatches(from, id) && mapMatches(to, route[index - 1]) || mapMatches(to, id) && mapMatches(from, route[index - 1])));
    return `<line class="sector-route${external ? " bridge" : ""}${related ? " related" : ""}${active ? " travel-active" : ""}" data-sector-link="${escapeHtml(from.id)}:${escapeHtml(to.id)}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" vector-effect="non-scaling-stroke"></line>`;
  }).join("");
  const stars = Array.from({length:64}, (_, i)=>`<circle cx="${((i * 37.79 + 4) % 100).toFixed(2)}" cy="${((i * 57.13 + 3) % 100).toFixed(2)}" r="${i % 3 === 0 ? .15 : .08}"></circle>`).join("");
  return `<svg class="sector-map-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g class="stellar-stars">${stars}</g>${lines}</svg>`;
}

function renderRegionLabels(){
  return `<div class="sector-map-regions" aria-hidden="true">${GAME_MAP_SECTORS.map(sector=>`<span class="${sector.theme}">${escapeHtml(sector.name)}</span>`).join("")}</div>`;
}

// Portal directions remain available to assistive/legacy consumers. The stellar
// design represents their connections with the lines instead of glowing dots.
function renderPortalDirections(map){
  const directions = new Set(getSectorMapPortals(map).map(portal=>{
    const x = Number(portal?.x || 0), y = Number(portal?.y || 0);
    return [y <= -3000 ? "top" : y >= 3000 ? "bottom" : "", x <= -4000 ? "left" : x >= 4000 ? "right" : ""].filter(Boolean).join("-");
  }).filter(Boolean));
  return `<i class="sector-map-portals" aria-hidden="true">${[...directions].map(direction=>`<b class="portal-dot ${direction}"></b>`).join("")}</i>`;
}

function renderStellarNode({node, currentName, selected, mode, playerLevel, travelState}){
  const {map, name, number, theme} = node;
  const current = currentName === name.toUpperCase();
  const portgunMode = mode === "portgun";
  const requirement = getPortgunMapLevelRequirement(map || {name});
  const unlocked = Number(playerLevel || 1) >= requirement;
  const available = Boolean(map);
  const selectable = available && map.id != null && (!portgunMode || unlocked);
  const selectedNode = selected?.name === name;
  const onJourney = getStellarTravelRoute(travelState).some(id=>mapMatches(map, id));
  const classes = [number ? "sector-map-node" : "sector-core-node", theme, available ? "available" : "future", current ? "current" : "", selectedNode ? "selected" : "", portgunMode ? "portgun-select" : "", portgunMode && !unlocked ? "locked" : "", onJourney ? "on-journey" : ""].filter(Boolean).join(" ");
  const position = getStellarMapPosition(name);
  const range = getMapEnemyLevelRange(map || {name}, number);
  const display = nodeDisplayName(node);
  const status = portgunMode && !unlocked ? ` · Accès Portgun LV ${requirement}` : current ? " · Vous êtes ici" : "";
  const target = selectable ? ` ${portgunMode ? "data-portgun-target-map" : "data-sector-map-select"}="${escapeHtml(map.id)}"` : "";
  return `<button type="button" class="${classes}" style="--stellar-x:${position.x}%;--stellar-y:${position.y}%"${target} ${selectable ? "" : "disabled"} aria-pressed="${selectedNode}" aria-label="${escapeHtml(display)} · Ennemis LV ${range[0]}-${range[1]}${escapeHtml(status)}" title="${escapeHtml(display)}${escapeHtml(status)}">
    ${renderPlanet(theme)}<small>${escapeHtml(display)}</small>${renderEnemyLevelLabel(range)}${renderPortalDirections(map)}
  </button>`;
}

function getTravelSummary(travelState, maps){
  if(!travelState?.active) return "";
  const destination = maps.find(map=>mapMatches(map, travelState.targetMapId ?? travelState.targetMap));
  const route = getStellarTravelRoute(travelState);
  const names = route.map(id=>maps.find(map=>mapMatches(map, id))).filter(Boolean).map(map=>map.displayName || map.name);
  const title = destination ? `Voyage vers ${destination.displayName || destination.name}` : "Voyage automatique en cours";
  return `<div class="stellar-travel-status" role="status"><div><strong>${escapeHtml(title)}</strong><span>${names.length ? escapeHtml(names.join(" → ")) : "Traversée des secteurs en cours"}</span><small>Clique dans l’espace pour reprendre les commandes et arrêter le voyage.</small></div><button type="button" class="stellar-action stellar-cancel" data-sector-travel-cancel>Arrêter</button></div>`;
}

function renderSelectedMap({selected, currentName, premiumActive, mode, connections, travelState}){
  if(!selected) return "";
  const map = selected.map;
  const sameMap = currentName === selected.name.toUpperCase();
  const levelRange = getMapEnemyLevelRange(map || {name:selected.name}, selected.number);
  const neighbours = connections.filter(edge=>edge.from === map || edge.to === map).map(edge=>edge.from === map ? edge.to : edge.from);
  const unavailable = !map || map.id == null;
  const currentTarget = travelState?.active && mapMatches(map, travelState.targetMapId ?? travelState.targetMap);
  const disabled = !premiumActive || sameMap || unavailable || currentTarget;
  const actionLabel = !premiumActive ? "Voyage automatique · Premium" : currentTarget ? "Voyage en cours" : "Voyage automatique";
  const title = sameMap ? "Vous êtes déjà dans ce secteur" : !premiumActive ? "Un abonnement Premium actif est nécessaire" : unavailable ? "Ce secteur est indisponible" : "Rejoindre ce secteur en passant automatiquement les portails";
  const button = mode === "portgun" ? "" : `<button type="button" class="stellar-action" ${map?.id != null ? `data-sector-travel-target-map="${escapeHtml(map.id)}"` : ""} ${disabled ? "disabled" : ""} title="${title}">${actionLabel}</button>`;
  return `<div class="stellar-selection" aria-live="polite">${renderPlanet(selected.theme)}<div class="stellar-selection-copy"><strong>${escapeHtml(nodeDisplayName(selected))}</strong><span>Ennemis LV ${levelRange[0]}–${levelRange[1]} · ${neighbours.length} portail${neighbours.length === 1 ? "" : "s"}${sameMap ? " · Vous êtes ici" : ""}</span></div>${button}</div>
    <div class="stellar-connections">${mode === "portgun" ? "Sélectionne un secteur accessible pour utiliser le Portgun." : neighbours.length ? `Liaisons : ${neighbours.map(other=>escapeHtml(other.displayName || other.name)).join(" · ")}` : "Aucune liaison disponible"}</div>`;
}

export function renderCombatMapPanel({maps = [], getCurrentMap, mode = "view", playerLevel = 1, premiumActive = false, selectedMapId = null, travelState = null} = {}){
  const current = getCurrentMap?.();
  const currentName = getCurrentMapName(getCurrentMap);
  const nodes = getStellarNodes(maps);
  const selected = nodes.find(node=>node.map && mapMatches(node.map, selectedMapId)) || nodes.find(node=>node.name.toUpperCase() === currentName) || nodes.find(node=>node.map) || nodes[0];
  const existingCount = nodes.filter(node=>node.map).length;
  const portgunMode = mode === "portgun";
  const connections = getStellarMapConnections(maps);
  return `<div class="sector-map-card stellar-sector-map${portgunMode ? " stellar-portgun" : ""}">
    <div class="stellar-map-header"><div><span class="stellar-kicker">AVOSOMA / NAVIGATION</span><h3>${portgunMode ? "Selection Portgun" : "Carte stellaire"}</h3></div><div class="stellar-location"><i aria-hidden="true"></i><div><span>Position actuelle</span><strong>${escapeHtml(current?.displayName || current?.name || "Hors secteur")}</strong></div></div></div>
    ${portgunMode ? `<div class="stellar-mode-note">1 fluide sera consommé à l’arrivée · Accès selon ton niveau</div>` : ""}
    <div class="sector-map-board" role="group" aria-label="Carte des firmes : ${existingCount} secteurs et leurs portails">
      ${renderStellarConnections(maps, selected?.map, travelState)}${renderRegionLabels()}
      ${nodes.map(node=>renderStellarNode({node, currentName, selected, mode, playerLevel, travelState})).join("")}
    </div>
    ${renderSelectedMap({selected, currentName, premiumActive, mode, connections, travelState})}
    ${portgunMode ? "" : getTravelSummary(travelState, maps)}
    <div class="sector-map-legend"><span class="stellar-current-key">● Position actuelle</span><span>${existingCount}/${nodes.length} secteurs actifs · ${connections.length} liaisons</span><span class="level-key">LV = NIVEAU DES ENNEMIS</span></div>
  </div>`;
}
