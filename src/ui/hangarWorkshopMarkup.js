import { fmt } from "../core/utils.js";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

const paths = {
  hull:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 8 8 14 8-6 12-10 8-14Z"/>',
  shield:'<path d="m12 3 8 3v6c0 4-5 7-8 9-3-2-8-5-8-9V6Z"/><path d="M12 3v18"/>',
  speed:'<path d="M4 18a9 9 0 1 1 16 0M12 13l5-5"/><circle cx="12" cy="13" r="2"/>',
  cargo:'<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7 5l10 6"/>',
  mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
  unequip:'<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h9m-3-3 3 3-3 3M10 20V4l5 2v12Z"/>'
};

export function workshopIcon(name){
  return `<svg class="workshop-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.mouse}</svg>`;
}

export function renderShipWorkshopStats(stats, ship){
  const fields = [
    ["hull", "Points de vie", stats.vie, "PV"],
    ["shield", "Bouclier", stats.bouclier, stats.bouclier > 0 ? `Régénération ${fmt(Math.round(stats.regen))}/s` : "Aucun bouclier équipé"],
    ["speed", "Vitesse", stats.vitesseReelle, "Vitesse réelle"],
    ["cargo", "Soute", stats.cargo, "Capacité cargo"]
  ];
  return `<div class="ship-live-primary">${fields.map(([kind, label, value, detail])=>`
    <article class="ship-live-stat ${kind}"><span>${workshopIcon(kind)}${label}</span><strong>${fmt(Math.round(Number(value) || 0))}</strong><small>${detail}</small></article>`).join("")}</div>
    ${ship.special ? `<article class="ship-special-stat"><span>Sort spécial</span><strong>${escapeHtml(ship.special)}</strong></article>` : ""}`;
}

export function renderShipEquipmentMarkup({loadout, renderSlot, inventoryCount,
  inventoryMarkup, resourceMarkup, emptyCells, filters, selectedDetail}){
  const parts = [loadout.lasers, loadout.generators, loadout.extras];
  const equipped = parts.reduce((sum, entries)=>sum + entries.filter(Boolean).length, 0)
    + Number(Boolean(loadout.missileLauncher)) + Number(Boolean(loadout.rocketLauncher));
  const capacity = parts.reduce((sum, entries)=>sum + entries.length, 2);
  const group = (label, values, type, className)=>`<section class="workshop-equipment-group">
    <div class="compact-section-head"><h3>${label}</h3><span>${values.filter(Boolean).length} / ${values.length}</span></div>
    <div class="compact-slot-grid ${className}">${values.map((uid, index)=>renderSlot(type, index, uid)).join("")}</div></section>`;
  return `<div class="ship-equipment-layout workshop-ship-layout">
    <section class="equipped-compact-panel">
      <header class="workshop-panel-head"><h2 id="loadoutShipTitle">Équipement</h2><div class="workshop-head-actions"><span>${equipped} / ${capacity} emplacements</span>
        <button id="unequipAllShipBtn" class="unequip-all-button" type="button" data-unequip-all-open title="Tout déséquiper" aria-label="Tout desequiper le vaisseau">${workshopIcon("unequip")}</button></div></header>
      <div class="workshop-equipment-scroll">
        ${group("Lasers", loadout.lasers, "laser", "laser-slots")}
        <div class="workshop-launchers">${group("Lance-missiles", [loadout.missileLauncher], "missileLauncher", "launcher-slots")}${group("Lance-roquettes", [loadout.rocketLauncher], "rocketLauncher", "launcher-slots")}</div>
        ${group("Générateurs", loadout.generators, "generator", "generator-slots")}
        ${group("Extras", loadout.extras, "extra", "extra-slots")}
      </div>
      <p class="workshop-help">${workshopIcon("mouse")}Sélectionnez un objet pour voir sa fiche.</p>
    </section>
    <section class="rpg-inventory-panel">
      <header class="compact-section-head workshop-panel-head"><h3>Inventaire</h3><span>${inventoryCount} objets</span></header>
      ${filters}
      <div class="rpg-inventory-grid" aria-label="Inventaire à cinq colonnes">${inventoryMarkup}${resourceMarkup}${emptyCells}</div>
      ${selectedDetail ? `<section class="selected-item-panel">${selectedDetail}</section>` : ""}
      <p class="workshop-help">${workshopIcon("mouse")}Double clic pour équiper · Glisser pour déplacer</p>
    </section>
  </div>`;
}
