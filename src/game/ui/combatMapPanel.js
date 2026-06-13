import { getMapDisplayName } from "../../data/firms.js";

export const GAME_MAP_SECTORS = [
  {
    id:"cyan",
    name:"CYAN",
    theme:"cyan",
    label:"Firme bleue",
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
    name:"ASTRA",
    theme:"astra",
    label:"Firme rouge",
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
    name:"JAUNE",
    theme:"auric",
    label:"Firme jaune",
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
    name:"VERTE",
    theme:"verdant",
    label:"Firme verte",
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
  {from:"CYAN-04", to:"JAUNE-04", label:"Liaison nord"},
  {from:"CYAN-03", to:"ASTRA-03", label:"CYAN-03 / ASTRA-03"},
  {from:"CYAN-05", to:"ASTRA-05", label:"Liaison verticale"},
  {from:"ASTRA-04", to:"VERTE-04", label:"ASTRA-04 / VERTE-04"},
  {from:"ASTRA-05", to:"CORE", label:"Acces noyau ASTRA"},
  {from:"CYAN-05", to:"CORE", label:"Acces noyau CYAN"},
  {from:"JAUNE-05", to:"CORE", label:"Acces noyau jaune"},
  {from:"JAUNE-05", to:"VERTE-05", label:"Liaison verticale"},
  {from:"JAUNE-03", to:"VERTE-03", label:"Liaison verticale"},
  {from:"VERTE-05", to:"CORE", label:"Acces noyau vert"}
];

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

function getDisplayMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

function getPortalDirection(portal){
  const left = Number(portal?.x || 0) <= -4000;
  const right = Number(portal?.x || 0) >= 4000;
  const top = Number(portal?.y || 0) <= -3000;
  const bottom = Number(portal?.y || 0) >= 3000;
  if(top && left) return "top-left";
  if(top && right) return "top-right";
  if(bottom && left) return "bottom-left";
  if(bottom && right) return "bottom-right";
  if(top) return "top";
  if(bottom) return "bottom";
  if(left) return "left";
  if(right) return "right";
  return "";
}

function renderGameMapPortals(map, cell){
  const directions = new Set(getDisplayMapPortals(map).map(getPortalDirection).filter(Boolean));
  if(!directions.size && cell) (cell.portals || []).forEach(direction=>directions.add(direction));
  if(!directions.size) return "";
  return `<i class="sector-map-portals" aria-hidden="true">${[...directions].map(direction=>`<b class="portal-dot ${direction}"></b>`).join("")}</i>`;
}

function renderGameMapNode({maps, getCurrentMap, sector, cell}){
  const mapName = `${sector.name}-${String(cell.n).padStart(2, "0")}`;
  const existing = getMapByName(maps, mapName);
  const displayName = existing?.displayName || getMapDisplayName(mapName);
  const current = getCurrentMapName(getCurrentMap) === mapName;
  const classes = [
    "sector-map-node",
    sector.theme,
    existing ? "available" : "future",
    current ? "current" : "",
    cell.bridge ? "bridge" : ""
  ].filter(Boolean).join(" ");
  return `<button class="${classes}" style="--grid-x:${cell.x};--grid-y:${cell.y}" type="button" disabled>
    <span>${cell.n}</span>
    <small>${escapeHtml(displayName)}</small>
    ${renderGameMapPortals(existing, cell)}
  </button>`;
}

export function renderCombatMapPanel({maps = [], getCurrentMap} = {}){
  const current = getCurrentMap?.();
  const currentName = current?.displayName || current?.name || "Hors secteur";
  const mapCount = GAME_MAP_SECTORS.reduce((sum, sector)=>sum + sector.cells.length, 0) + 1;
  const existingCount = GAME_MAP_SECTORS.reduce((sum, sector)=>sum + sector.cells.filter(cell=>getMapByName(maps, `${sector.name}-${String(cell.n).padStart(2, "0")}`)).length, 0) + (getMapByName(maps, "CORE") ? 1 : 0);
  return `<div class="sector-map-card">
    <div class="combat-map-head">
      <div><span>Reseau territorial</span><strong>${escapeHtml(currentName)}</strong></div>
      <small>${existingCount}/${mapCount} secteurs actifs</small>
    </div>
    <div class="sector-map-board" aria-label="Carte des firmes">
      <div class="sector-core-node" style="--grid-x:5.15;--grid-y:4.1"><span>CORE</span><small>Carte speciale</small>${renderGameMapPortals(getMapByName(maps, "CORE"))}</div>
      ${GAME_MAP_SECTORS.map(sector=>sector.cells.map(cell=>renderGameMapNode({maps, getCurrentMap, sector, cell})).join("")).join("")}
    </div>
    <div class="sector-map-legend">
      <span class="astra">ASTRA</span>
      <span class="cyan">CYAN</span>
      <span class="auric">JAUNE</span>
      <span class="verdant">VERTE</span>
      <span class="future">A creer</span>
    </div>
    <div class="sector-map-routes">
      ${GAME_MAP_BRIDGES.map(route=>`<div><b>${escapeHtml(route.from)}</b><span>${escapeHtml(route.label)}</span><b>${escapeHtml(route.to)}</b></div>`).join("")}
    </div>
  </div>`;
}
