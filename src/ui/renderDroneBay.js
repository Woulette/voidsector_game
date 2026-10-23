import {
  canAfford, getCurrencyPrice, getDroneCatalog, getDroneLoadout,
  getDroneSkinLoadout, getDronePurchasePrice, getInventoryByCategory,
  getShip, isDroneCompatibleEquipment, isDronePermanentUpgradeItem, store
} from "../core/store.js?v=20260726-kharon1";
import { currencyAmountHtml } from "./currencyIcons.js?v=20260726-kharon1";
import { getRarityLabel, rarityClass } from "../shared/rarities.js";
import {
  createDroneBayModel, DRONE_BAY_FILTERS, droneBayEquipAction, droneEquipmentKind, droneEquipmentStats,
  resolveDroneBaySelection
} from "./droneBayModel.js?v=20261023-droneskin1";
import { droneBayIcon } from "./droneBayIcons.js?v=20261023-droneskin1";

const ui = {selectedDroneIndex:0, filter:"all"};
const renderedMarkup = new WeakMap();
const fmt = value=>Math.max(0, Number(value) || 0).toLocaleString("fr-FR");
const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);

function locationLabel(equipped){
  if(!equipped) return "Disponible";
  if(equipped.location === "drone") return `Drone ${String(equipped.index + 1).padStart(2, "0")}${equipped.type === "droneSkin" ? " · skin" : ""}`;
  return getShip(equipped.shipId)?.name || "Vaisseau";
}

export function getDroneBayPresentationModel({filter = ui.filter} = {}){
  const drone = getDroneCatalog();
  const drones = getDroneLoadout();
  const inventoryEntries = ["canon", "generateur", "drone_upgrade"].flatMap(category=>getInventoryByCategory(category));
  const nextPrice = getDronePurchasePrice(drones.length);
  return createDroneBayModel({
    drone, drones, droneSkins:getDroneSkinLoadout(), inventoryEntries, ...ui, filter,
    selectedUid:store.selectedInventoryUid, selectedUids:store.selectedInventoryUids,
    portalComplete:Math.max(0, Number(store.state?.completedPortals?.violet || 0)) > 0,
    getLocationLabel:locationLabel,
    compatible:item=>isDroneCompatibleEquipment(item) || isDronePermanentUpgradeItem(item),
    nextPrice:nextPrice == null ? null : getCurrencyPrice(drone.priceType, nextPrice),
    canPurchase:nextPrice != null && canAfford(drone.priceType, nextPrice)
  });
}

export function selectDroneBayDrone(index){
  const requested = Number(index);
  const selected = resolveDroneBaySelection(getDroneLoadout().length, requested);
  if(selected == null || selected !== requested) return false;
  ui.selectedDroneIndex = selected;
  return true;
}

export function setDroneBayFilter(filter){
  if(!DRONE_BAY_FILTERS.some(entry=>entry.id === filter)) return false;
  ui.filter = filter;
  return true;
}

// A single-copy shortcut targets the inspected drone. Returning true on a refusal prevents
// the legacy auto-equip path from silently choosing a different drone.
export function equipDroneBayInventoryItem(uid, {equipPart} = {}){
  const section = globalThis.document?.getElementById?.("droneSection");
  if(!section || section.hidden || section.classList?.contains("hidden")) return false;
  const model = getDroneBayPresentationModel({filter:"all"});
  const entry = model.inventoryEntries.find(copy=>copy.uid === uid);
  const action = droneBayEquipAction(entry, model.selectedDrone, model.portalComplete);
  if(action.allowed) equipPart?.(action.targetType, model.selectedDroneIndex, entry.uid);
  return true;
}

function rarity(item){
  return `<span class="db-rarity ${rarityClass(item)}">${escapeHtml(getRarityLabel(item))}</span>`;
}

function itemStats(item){
  return `<dl class="db-item-stats">${droneEquipmentStats(item).map(stat=>`<div><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>`).join("")}</dl>`;
}

function renderOverview(model){
  const selectedUpgrade = !!model.selectedDrone?.skinActive;
  return `<aside class="db-overview">
    <header class="db-heading"><span class="tiny">Hangar</span><h2>Mes drones</h2><p>Équipez votre escadrille.</p></header>
    <div class="db-art${selectedUpgrade ? " vesper-active" : ""}"><i aria-hidden="true"></i><img src="${escapeHtml(model.drone.img)}" alt="${escapeHtml(model.drone.name)}" draggable="false"></div>
    <div class="db-identity"><h3>${escapeHtml(model.drone.name)}</h3>${rarity(model.drone)}</div>
    <ul class="db-overview-stats"><li>${droneBayIcon("drone")}<span><b>${model.standardOwned} / ${model.maxStandard}</b> drones standards${model.legacyOwned ? `<small>+ ${model.legacyOwned} drone${model.legacyOwned > 1 ? "s" : ""} historique${model.legacyOwned > 1 ? "s" : ""} conservé${model.legacyOwned > 1 ? "s" : ""}</small>` : ""}</span></li><li>${droneBayIcon("chip")}<span>${Number(model.drone.slots) || 1} module + 1 skin par drone</span></li><li>${droneBayIcon("shield")}<span>Laser ou générateur de bouclier</span></li></ul>
    <div class="db-purchase"><h4>${model.nextPrice ? "Prochain drone" : "Drones standards au maximum"}</h4>${model.nextPrice ? `<div class="db-next-price">${currencyAmountHtml(model.drone.priceType, model.nextPrice)} <span>crédits</span></div>` : ""}<button class="blue-button db-buy" type="button" data-buy-combat-drone${model.canPurchase ? "" : " disabled"}>${droneBayIcon("cart")}<span>${model.nextPrice ? "Acheter un drone" : "Limite standard atteinte"}</span>${droneBayIcon("arrow")}</button>${model.nextPrice && !model.canPurchase ? `<small class="db-purchase-reason">Crédits insuffisants.</small>` : ""}<p class="db-ammo-note">Un laser de drone consomme une munition supplémentaire par tir.</p></div>
  </aside>`;
}

function renderSlot(slot, model){
  if(!slot.owned){
    return `<div class="${slot.reserved ? "db-special-tile reserved" : "db-drone-tile unowned"}" aria-label="${slot.reserved ? "Place spéciale à venir" : `Drone ${slot.number} non possédé`}"><span class="db-drone-number">${slot.reserved ? "" : slot.number}</span><span class="db-unowned-icon">${droneBayIcon(slot.reserved ? "lock" : "plus")}</span><strong>${slot.reserved ? "À venir" : "Non possédé"}</strong>${slot.reserved ? `<small>Emplacement spécial</small>` : ""}</div>`;
  }
  const equipped = slot.item
    ? `<span class="db-drone-equipment ${rarityClass(slot.item)}${slot.multiSelected ? " multi-selected" : ""}${slot.itemSelected ? " selected" : ""}" data-slot-uid="${escapeHtml(slot.uid)}" data-drop-part="drone" data-drop-index="${slot.index}" draggable="true" title="${escapeHtml(`${slot.item.name} · Ctrl + clic pour présélectionner`)}"><img src="${escapeHtml(slot.item.img)}" alt=""><span>${escapeHtml(slot.item.short || slot.item.name)}</span></span>`
    : `<span class="db-drone-equipment empty">${droneBayIcon("plus")}<span>Emplacement libre</span></span>`;
  const skin = `<span class="db-drone-skin${slot.skin ? " filled" : " empty"}${slot.skinMultiSelected ? " multi-selected" : ""}${slot.skinSelected ? " selected" : ""}" data-drop-part="droneSkin" data-drop-index="${slot.index}"${slot.skinUid ? ` data-slot-uid="${escapeHtml(slot.skinUid)}" draggable="true"` : ""} title="${slot.skin ? escapeHtml(`${slot.skin.name} · skin du Drone ${slot.number}`) : "Skin du drone : emplacement libre"}">${slot.skin ? `<img src="${escapeHtml(slot.skin.img)}" alt="${escapeHtml(slot.skin.name)}" draggable="false">` : droneBayIcon("plus")}</span>`;
  return `<button class="db-drone-tile owned${slot.reserved ? " db-special-tile legacy-owned" : ""}${slot.selected ? " selected" : ""}${slot.skinActive ? " vesper-active" : ""}" type="button" data-drone-select="${slot.index}" data-drop-part="drone" data-drop-index="${slot.index}" data-drone-slot-number="${slot.index + 1}" aria-pressed="${slot.selected}" aria-label="Drone ${slot.number}${slot.item ? `, ${escapeHtml(slot.item.name)}` : ", emplacement libre"}${slot.skinActive ? ", skin Overdrive actif" : ""}">
    <span class="db-drone-number">${slot.number}</span><span class="db-drone-status">${slot.skinActive ? "Overdrive" : slot.item ? "Équipé" : "Libre"}</span><span class="db-drone-art"><img src="${escapeHtml(model.drone.img)}" alt="" draggable="false"></span>${equipped}${skin}${slot.reserved ? `<small class="db-legacy-label">Drone historique</small>` : ""}
  </button>`;
}

function renderHangar(model){
  return `<section class="db-hangar equipped-compact-panel"><header class="db-panel-head"><h3>Baie de drones</h3><p>${droneBayIcon("info")}<span>Sélectionnez un drone pour modifier son équipement.</span></p></header><div class="drone-bay-grid" data-db-scroll="bay">${model.standardSlots.map(slot=>renderSlot(slot, model)).join("")}</div><h4 class="db-special-heading">${model.legacyOwned ? "Places supplémentaires" : "Places spéciales — à venir"}</h4><div class="db-special-grid">${model.specialSlots.map(slot=>renderSlot(slot, model)).join("")}</div>${model.owned ? "" : `<p class="db-first-drone-note">Achetez votre premier drone pour commencer à l’équiper.</p>`}</section>`;
}

function renderEquipment(model){
  const slot = model.selectedDrone;
  const item = slot?.item;
  return `<section class="db-equipment-panel"><h3>${slot ? `Drone ${slot.number} — équipement` : "Équipement du drone"}</h3>
    ${slot ? item ? `<article class="db-equipped-card ${rarityClass(item)}"><div class="db-equipped-art" data-slot-uid="${escapeHtml(slot.uid)}" data-drop-part="drone" data-drop-index="${slot.index}" draggable="true"><img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}"></div><div class="db-equipped-copy"><small class="db-slot-label">Arme ou bouclier</small><h4>${escapeHtml(item.name)}</h4>${rarity(item)}${itemStats(item)}</div><button type="button" class="db-remove" data-drone-unequip="${slot.index}" data-drone-unequip-type="drone" aria-label="Retirer ${escapeHtml(item.name)} du Drone ${slot.number}">${droneBayIcon("remove")}<span>Retirer</span></button></article>` : `<div class="db-equipped-card empty" data-drop-part="drone" data-drop-index="${slot.index}"><span class="db-equipped-art">${droneBayIcon("plus")}</span><div class="db-equipped-copy"><small class="db-slot-label">Arme ou bouclier</small><h4>Emplacement libre</h4><p>Glissez un laser ou un bouclier ici.</p></div></div>` : `<div class="db-equipped-card empty"><span class="db-equipped-art">${droneBayIcon("drone")}</span><p>Aucun drone possédé pour le moment.</p></div>`}
    ${slot ? renderSkinSlot(slot) : ""}
  </section>`;
}

function renderSkinSlot(slot){
  if(!slot.skin) return `<div class="db-equipped-card db-skin-card empty" data-drop-part="droneSkin" data-drop-index="${slot.index}"><span class="db-equipped-art">${droneBayIcon("plus")}</span><div class="db-equipped-copy"><small class="db-slot-label">Skin du drone</small><h4>Aucun skin équipé</h4><p>Glissez un skin depuis l’inventaire.</p></div></div>`;
  return `<article class="db-equipped-card db-skin-card ${rarityClass(slot.skin)}${slot.skinActive ? " active" : ""}"><div class="db-equipped-art" data-slot-uid="${escapeHtml(slot.skinUid)}" data-drop-part="droneSkin" data-drop-index="${slot.index}" draggable="true"><img src="${escapeHtml(slot.skin.img)}" alt="${escapeHtml(slot.skin.name)}"></div><div class="db-equipped-copy"><small class="db-slot-label">Skin du drone · ${escapeHtml(getRarityLabel(slot.skin))}</small><h4>${escapeHtml(slot.skin.name)}</h4><p class="db-skin-bonus">${slot.skinActive ? "+50 % dégâts laser ou capacité de bouclier." : "Bonus verrouillé avant La Faille de Vesper."}</p></div><button type="button" class="db-remove" data-drone-unequip="${slot.index}" data-drone-unequip-type="droneSkin" aria-label="Retirer le skin ${escapeHtml(slot.skin.name)} du Drone ${slot.number}">${droneBayIcon("remove")}<span>Retirer</span></button></article>`;
}

function inventoryBadge(item){
  if(item.category === "canon"){
    const mk = String(item.id || "").match(/mk(\d+)/i)?.[1];
    return mk ? `MK-${{1:"I", 2:"II", 3:"III", 4:"IV"}[mk] || mk}` : "ÉLITE";
  }
  if(droneEquipmentKind(item) === "overdrive") return "SKIN";
  return String(item.name || "").match(/\bA\s+([IVX]+)$/i)?.[0] || "G";
}

function renderInventoryCell(entry, model){
  const multiSelected = model.selectedUids.has(entry.uid);
  return `<button class="db-inventory-cell inventory-cell ${entry.rarityClass}${entry.uid === model.selectedUid ? " selected" : ""}${multiSelected ? " multi-selected" : ""}" type="button" data-inventory-uid="${escapeHtml(entry.uid)}" data-inventory-category="${escapeHtml(entry.item.category)}" draggable="true" aria-label="${escapeHtml(`${entry.item.name} · ${entry.rarity} · disponible`)}" title="${escapeHtml(`${entry.item.name} · ${entry.rarity}`)}"><img src="${escapeHtml(entry.item.img)}" alt="${escapeHtml(entry.item.name)}" draggable="false"><small class="db-inventory-badge">${escapeHtml(inventoryBadge(entry.item))}</small></button>`;
}

function renderInventory(model){
  const emptyCells = Array.from({length:Math.max(0, 40 - model.visibleInventoryEntries.length)}, ()=>`<div class="db-inventory-cell inventory-cell empty" aria-hidden="true"></div>`).join("");
  return `<section class="db-inventory-panel rpg-inventory-panel"><header class="db-inventory-heading"><h3>Inventaire</h3><span>${fmt(model.availableItems)} équipement${model.availableItems > 1 ? "s" : ""} disponible${model.availableItems > 1 ? "s" : ""}</span></header><div class="db-inventory-filters" role="group" aria-label="Filtrer les équipements compatibles">${DRONE_BAY_FILTERS.map(filter=>`<button type="button" data-drone-filter="${filter.id}" class="${model.filter === filter.id ? "active" : ""}" aria-pressed="${model.filter === filter.id}">${filter.label}</button>`).join("")}</div><div class="db-inventory-list db-inventory-grid rpg-inventory-grid" data-db-scroll="inventory" aria-label="Équipements disponibles">${model.visibleInventoryEntries.map(entry=>renderInventoryCell(entry, model)).join("")}${emptyCells}</div><p class="db-inventory-note">Double clic ou glisser-déposer pour équiper le drone sélectionné.</p></section>`;
}

export function renderDroneBayMarkup(model){
  return `<div class="drone-bay-layout ship-equipment-layout">${renderOverview(model)}${renderHangar(model)}<aside class="db-detail">${renderEquipment(model)}${renderInventory(model)}</aside></div>`;
}

export function updateDroneBayPresentation(section, model){
  const markup = renderDroneBayMarkup(model);
  if(renderedMarkup.get(section) === markup) return false;
  const scrolls = [...section.querySelectorAll("[data-db-scroll]")].map(element=>({id:element.dataset.dbScroll, top:element.scrollTop, left:element.scrollLeft}));
  const active = section.contains(document.activeElement) ? document.activeElement : null;
  const attributes = ["data-drone-select", "data-drone-filter", "data-inventory-uid", "data-drone-unequip", "data-buy-combat-drone"];
  const attribute = attributes.find(name=>active?.hasAttribute(name));
  const value = attribute ? active.getAttribute(attribute) : null;
  section.innerHTML = markup;
  renderedMarkup.set(section, markup);
  for(const scroll of scrolls){
    const element = [...section.querySelectorAll("[data-db-scroll]")].find(entry=>entry.dataset.dbScroll === scroll.id);
    if(element){ element.scrollTop = scroll.top; element.scrollLeft = scroll.left; }
  }
  if(attribute){
    const target = [...section.querySelectorAll(`[${attribute}]`)].find(element=>element.getAttribute(attribute) === value);
    target?.focus({preventScroll:true});
  }
  return true;
}

export function renderDroneSection(){
  const section = document.getElementById("droneSection");
  if(!section || !store.state?.player) return;
  const model = getDroneBayPresentationModel();
  ui.selectedDroneIndex = model.selectedDroneIndex ?? 0;
  updateDroneBayPresentation(section, model);
}

// Runs before generic inventory handlers. UID copies and equipment footers deliberately fall through
// to the existing Ctrl selection, double-click and drag/drop controllers.
export function handleDroneBayInteraction(event, {unequipPart} = {}){
  if(!event.target?.closest?.("#droneSection")) return false;
  const remove = event.target.closest("[data-drone-unequip]");
  if(remove){
    const model = getDroneBayPresentationModel();
    const index = Number(remove.dataset.droneUnequip);
    const type = remove.dataset.droneUnequipType === "droneSkin" ? "droneSkin" : "drone";
    const uid = type === "droneSkin" ? model.selectedDrone?.skinUid : model.selectedDrone?.uid;
    if(!remove.disabled && model.selectedDrone?.index === index && uid) unequipPart?.(type, index);
    return true;
  }
  const filter = event.target.closest("[data-drone-filter]");
  if(filter){ if(setDroneBayFilter(filter.dataset.droneFilter)) renderDroneSection(); return true; }
  const tile = event.target.closest("[data-drone-select]");
  if(tile){
    const selected = selectDroneBayDrone(Number(tile.dataset.droneSelect));
    if(event.target.closest("[data-slot-uid][data-drop-part]")) return false;
    if(selected) renderDroneSection();
    return true;
  }
  return false;
}
