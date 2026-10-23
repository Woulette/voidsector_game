import { fmt } from "../core/utils.js";
import { getRarityLabel, rarityClass } from "../shared/rarities.js";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  }[char]));
}

const ICON_PATHS = {
  hull:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  shield:'<path d="m12 3 8 3v6c0 4.5-4.8 7.8-8 9-3.2-1.2-8-4.5-8-9V6l8-3Z"/><path d="M12 3v18"/>',
  speed:'<path d="m13 4 8 8-8 8M8 5l7 7-7 7M3 8l4 4-4 4"/>',
  cargo:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v10l9 5 9-5V8M12 13v10M7 5l10 6"/>',
  laser:'<path d="m5 19 8-8 3 3-8 8-3-3ZM11 9l4-4 4 4-4 4M17 3l4-2M19 5l3-1M3 21l2-2"/>',
  generator:'<path d="M14 2 5 14h6l-1 8 9-12h-6l1-8Z"/>',
  extra:'<path d="m10 3-1 3-3 1-3-1-1 4 3 2v3l-2 2 3 3 3-1 2 2 4-1 1-3 3-1 2-4-3-2V7l-3-1-2-3-3 1Z"/><circle cx="12" cy="12" r="3"/>',
  inventory:'<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M9 10v11M7 2h10M13 14h4M13 17h4"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  arrow:'<path d="m6 5 7 7-7 7M13 5l7 7-7 7"/>'
};

function icon(name){
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ""}</svg>`;
}

function slotCount(loadout, key){
  return Array.isArray(loadout?.[key]) ? loadout[key].filter(Boolean).length : 0;
}

// Selection is presentation only. This model never equips, purchases or edits a loadout.
export function createHangarShowcaseModel({ ownedShips = [], selectedShipId, activeShipId, getStats, getLoadout }){
  const uniqueShips = [...new Map(ownedShips.filter(ship=>ship?.id).map(ship=>[ship.id, ship])).values()];
  const selected = uniqueShips.find(ship=>ship.id === selectedShipId)
    || uniqueShips.find(ship=>ship.id === activeShipId)
    || uniqueShips[0]
    || null;
  return {
    ships:uniqueShips,
    selected,
    active:selected?.id === activeShipId,
    stats:selected ? getStats(selected.id) : null,
    loadout:selected ? getLoadout(selected.id) : null,
    activeShipId
  };
}

function renderOwnedShip(ship, model, getLoadout){
  const selected = model.selected?.id === ship.id;
  const active = model.activeShipId === ship.id;
  const lasers = slotCount(getLoadout(ship.id), "lasers");
  return `<article class="ship-card hangar-owned-card ${rarityClass(ship)} ${selected ? "selected" : ""} ${active ? "active" : ""}" data-ship-id="${escapeHtml(ship.id)}">
    <button class="hangar-ship-select" type="button" data-hangar-select-ship="${escapeHtml(ship.id)}" aria-pressed="${selected}" aria-label="Voir ${escapeHtml(ship.name)}${active ? ", vaisseau actif" : ""}">
      <span class="hangar-owned-art"><img src="${escapeHtml(ship.img)}" alt="" loading="lazy"></span>
      <span class="hangar-owned-copy">
        <strong>${escapeHtml(ship.name)}</strong>
        <span class="hangar-owned-class">${escapeHtml(ship.className)}</span>
        <span class="hangar-status ${active ? "is-active" : ""}">${active ? "Actif" : "Possédé"}</span>
        <span class="hangar-owned-slots">${icon("laser")} ${fmt(lasers)} / ${fmt(ship.stats.maxLasers)} laser${ship.stats.maxLasers > 1 ? "s" : ""}</span>
      </span>
    </button>
  </article>`;
}

function statRow(name, label, value, detail = ""){
  return `<div class="hangar-stat-row"${detail ? ` title="${escapeHtml(detail)}"` : ""}>
    <dt>${icon(name)}<span>${label}</span></dt><dd>${value}</dd>
  </div>`;
}

export function renderHangarShowcase(options){
  const model = createHangarShowcaseModel(options);
  if(!model.selected){
    return '<div class="hangar-showcase-empty"><p>Aucun vaisseau disponible dans ce hangar.</p><button type="button" class="blue-button" data-view="shop">Voir les vaisseaux au magasin</button></div>';
  }
  const { selected:ship, stats, loadout, active } = model;
  const count = model.ships.length;
  return `<div class="hangar-showcase">
    <div class="hangar-owned-list" aria-label="Vaisseaux possédés">
      ${model.ships.map(owned=>renderOwnedShip(owned, model, options.getLoadout)).join("")}
      ${count > 2 ? '<span class="hangar-list-hint">Faites défiler pour voir vos autres vaisseaux</span>' : ""}
    </div>
    <section class="hangar-ship-stage ${rarityClass(ship)}" aria-label="Présentation de ${escapeHtml(ship.name)}">
      <div class="hangar-stage-grid" aria-hidden="true"></div>
      <div class="hangar-stage-radar" aria-hidden="true"><i></i><i></i></div>
      <div class="hangar-stage-heading">
        <span class="hangar-status ${active ? "is-active" : ""}">${active ? "Vaisseau actif" : "Vaisseau sélectionné"}</span>
        <h3>${escapeHtml(ship.name)}</h3>
        <p>${escapeHtml(ship.className)}</p>
      </div>
      <img class="hangar-stage-ship" src="${escapeHtml(ship.img)}" alt="${escapeHtml(ship.name)}">
      <span class="hangar-stage-rarity">${escapeHtml(getRarityLabel(ship))}</span>
    </section>
    <aside class="hangar-showcase-info" aria-label="Statistiques et équipement de ${escapeHtml(ship.name)}">
      <section class="hangar-showcase-statistics">
        <h3>Statistiques</h3>
        <dl>
          ${statRow("hull", "Points de vie", fmt(Math.round(stats.vie)))}
          ${statRow("shield", "Bouclier", fmt(Math.round(stats.bouclier)), stats.bouclier > 0 ? `Régénération : ${fmt(Math.round(stats.regen))}/s` : "Aucun bouclier équipé")}
          ${statRow("speed", "Vitesse réelle", fmt(Math.round(stats.vitesseReelle)), `Statistique de vitesse : ${fmt(Math.round(stats.vitesse))}`)}
          ${statRow("cargo", "Soute", fmt(Math.round(stats.cargo)), "Capacité cargo")}
        </dl>
      </section>
      <section class="hangar-showcase-equipment">
        <h3>Équipement</h3>
        <dl>
          ${statRow("laser", "Lasers", `${fmt(slotCount(loadout, "lasers"))} <span>/ ${fmt(stats.maxLasers)}</span>`)}
          ${statRow("generator", "Générateurs", `${fmt(slotCount(loadout, "generators"))} <span>/ ${fmt(stats.maxGenerators)}</span>`)}
          ${statRow("extra", "Extras", `${fmt(slotCount(loadout, "extras"))} <span>/ ${fmt(stats.maxExtras)}</span>`)}
        </dl>
      </section>
      <div class="hangar-showcase-actions">
        <button class="ship-open-button hangar-inventory-cta" type="button" data-ship-id="${escapeHtml(ship.id)}">${icon("inventory")}<span>Ouvrir l'inventaire</span>${icon("arrow")}</button>
        ${active
          ? `<p class="hangar-equipped-state">${icon("check")} Vaisseau équipé</p>`
          : `<button class="hangar-equip-cta" type="button" data-hangar-equip-ship="${escapeHtml(ship.id)}">Équiper ce vaisseau</button>`}
      </div>
    </aside>
  </div>`;
}

const renderedMarkup = new WeakMap();

export function updateHangarShowcase(container, options){
  const markup = renderHangarShowcase(options);
  if(renderedMarkup.get(container) === markup) return;
  const previousList = container.querySelector(".hangar-owned-list");
  const scroll = {top:previousList?.scrollTop || 0, left:previousList?.scrollLeft || 0};
  const focused = container.contains(document.activeElement) ? document.activeElement : null;
  const selectionId = focused?.getAttribute("data-hangar-select-ship");
  const equipId = focused?.getAttribute("data-hangar-equip-ship");
  const inventoryFocused = focused?.classList.contains("ship-open-button");
  container.innerHTML = markup;
  renderedMarkup.set(container, markup);
  const list = container.querySelector(".hangar-owned-list");
  if(list){
    list.scrollTop = scroll.top;
    list.scrollLeft = scroll.left;
  }
  const nextFocus = selectionId
    ? [...container.querySelectorAll("[data-hangar-select-ship]")].find(button=>button.dataset.hangarSelectShip === selectionId)
    : equipId
      ? container.querySelector("[data-hangar-equip-ship], .ship-open-button")
      : inventoryFocused ? container.querySelector(".ship-open-button") : null;
  nextFocus?.focus({preventScroll:true});
}
