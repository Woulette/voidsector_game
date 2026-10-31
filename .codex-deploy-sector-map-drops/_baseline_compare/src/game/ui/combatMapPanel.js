import { getMapDisplayName } from "../../data/firms.js";

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

function renderGameMapNode({maps, getCurrentMap, sector, cell, mode, playerLevel}){
  const mapName = `${sector.name}-${String(cell.n).padStart(2, "0")}`;
  const existing = getMapByName(maps, mapName);
  const displayName = existing?.displayName || getMapDisplayName(mapName);
  const current = getCurrentMapName(getCurrentMap) === mapName.toUpperCase();
  const portgunMode = mode === "portgun";
  const requirement = getPortgunMapLevelRequirement(existing || {name:mapName});
  const level = Math.max(1, Math.floor(Number(playerLevel || 1)));
  const unlocked = !existing || level >= requirement;
  const selectable = Boolean(portgunMode && existing && unlocked);
  const status = portgunMode && existing
    ? current ? "Position actuelle" : unlocked ? "Destination" : `LV ${requirement}`
    : displayName;
  const classes = [
    "sector-map-node",
    sector.theme,
    existing ? "available" : "future",
    current ? "current" : "",
    cell.bridge ? "bridge" : "",
    portgunMode ? "portgun-select" : "",
    portgunMode && existing && !unlocked ? "locked" : ""
  ].filter(Boolean).join(" ");
  const targetAttr = selectable ? ` data-portgun-target-map="${escapeHtml(existing.id)}"` : "";
  return `<button class="${classes}" style="--grid-x:${cell.x};--grid-y:${cell.y}" type="button"${targetAttr} ${selectable ? "" : "disabled"}>
    <span>${cell.n}</span>
    <small>${escapeHtml(status)}</small>
    ${renderGameMapPortals(existing, cell)}
  </button>`;
}

function renderCoreNode({maps, getCurrentMap, mode, playerLevel}){
  const existing = getMapByName(maps, "CORE");
  const current = getCurrentMapName(getCurrentMap) === "CORE";
  const portgunMode = mode === "portgun";
  const requirement = getPortgunMapLevelRequirement(existing || {name:"CORE"});
  const level = Math.max(1, Math.floor(Number(playerLevel || 1)));
  const unlocked = !existing || level >= requirement;
  const selectable = Boolean(portgunMode && existing && unlocked);
  const classes = [
    "sector-core-node",
    existing ? "available" : "future",
    current ? "current" : "",
    portgunMode ? "portgun-select" : "",
    portgunMode && existing && !unlocked ? "locked" : ""
  ].filter(Boolean).join(" ");
  const targetAttr = selectable ? ` data-portgun-target-map="${escapeHtml(existing.id)}"` : "";
  const label = portgunMode && existing
    ? current ? "Position actuelle" : "Destination"
    : "Carte speciale";
  return `<button class="${classes}" style="--grid-x:5.15;--grid-y:4.1" type="button"${targetAttr} ${selectable ? "" : "disabled"}><span>CORE</span><small>${escapeHtml(label)}</small>${renderGameMapPortals(existing)}</button>`;
}

export function renderCombatMapPanel({maps = [], getCurrentMap, mode = "view", playerLevel = 1} = {}){
  const current = getCurrentMap?.();
  const currentName = current?.displayName || current?.name || "Hors secteur";
  const mapCount = GAME_MAP_SECTORS.reduce((sum, sector)=>sum + sector.cells.length, 0) + 1;
  const existingCount = GAME_MAP_SECTORS.reduce((sum, sector)=>sum + sector.cells.filter(cell=>getMapByName(maps, `${sector.name}-${String(cell.n).padStart(2, "0")}`)).length, 0) + (getMapByName(maps, "CORE") ? 1 : 0);
  const portgunMode = mode === "portgun";
  return `<div class="sector-map-card">
    <div class="combat-map-head">
      <div><span>${portgunMode ? "Selection Portgun" : "Reseau territorial"}</span><strong>${escapeHtml(currentName)}</strong></div>
      <small>${portgunMode ? "1 fluide sera consomme a l'arrivee" : `${existingCount}/${mapCount} secteurs actifs`}</small>
    </div>
    <div class="sector-map-board" aria-label="Carte des firmes">
      ${renderCoreNode({maps, getCurrentMap, mode, playerLevel})}
      ${GAME_MAP_SECTORS.map(sector=>sector.cells.map(cell=>renderGameMapNode({maps, getCurrentMap, sector, cell, mode, playerLevel})).join("")).join("")}
    </div>
    <div class="sector-map-legend">
      <span class="astra">HELION</span>
      <span class="cyan">NEREID</span>
      <span class="auric">AUREON</span>
      <span class="verdant">SYLVA</span>
      <span class="future">A creer</span>
    </div>
    <div class="sector-map-routes">
      ${GAME_MAP_BRIDGES.map(route=>`<div><b>${escapeHtml(route.from)}</b><span>${escapeHtml(route.label)}</span><b>${escapeHtml(route.to)}</b></div>`).join("")}
    </div>
  </div>`;
}
