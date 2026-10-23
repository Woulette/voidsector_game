import {
  canAfford, getCurrencyPrice, getDroneCatalog, getDroneLoadout,
  getDronePermanentUpgrade, getDronePurchasePrice, getInventoryByCategory, getItem,
  getShip, isDroneCompatibleEquipment, isDronePermanentUpgradeItem, store
} from "../core/store.js?v=20260726-kharon1";
import { currencyAmountHtml } from "./currencyIcons.js?v=20260726-kharon1";
import { getRarityLabel, rarityClass } from "../shared/rarities.js";
import {
  createDroneBayModel, DRONE_BAY_FILTERS, droneBayEquipAction, droneEquipmentKind, droneEquipmentStats,
  resolveDroneBaySelection
} from "./droneBayModel.js?v=20261023-dronebay1";
import { droneBayIcon } from "./droneBayIcons.js?v=20261023-dronebay1";

const ui = {selectedDroneIndex:0, filter:"all", expandedGroups:new Set()};
const renderedMarkup = new WeakMap();
const fmt = value=>Math.max(0, Number(value) || 0).toLocaleString("fr-FR");
const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);

function locationLabel(equipped){
  if(!equipped) return "Disponible";
  if(equipped.location === "drone") return `Drone ${String(equipped.index + 1).padStart(2, "0")}`;
  return getShip(equipped.shipId)?.name || "Vaisseau";
}

export function getDroneBayPresentationModel({filter = ui.filter} = {}){
  const drone = getDroneCatalog();
  const drones = getDroneLoadout();
  const inventoryEntries = ["canon", "generateur", "drone_upgrade"].flatMap(category=>getInventoryByCategory(category));
  const nextPrice = getDronePurchasePrice(drones.length);
  return createDroneBayModel({
    drone, drones, inventoryEntries, ...ui, filter, expandedGroups:[...ui.expandedGroups],
    selectedUid:store.selectedInventoryUid, selectedUids:store.selectedInventoryUids,
    portalComplete:Math.max(0, Number(store.state?.completedPortals?.violet || 0)) > 0,
    getPermanentUpgrade:getDronePermanentUpgrade, getItem, getLocationLabel:locationLabel,
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
  const entry = model.groups.flatMap(group=>group.copies).find(copy=>copy.uid === uid);
  const action = droneBayEquipAction(entry, model.selectedDrone, model.portalComplete);
  if(action.allowed) equipPart?.("drone", model.selectedDroneIndex, entry.uid);
  return true;
}

function rarity(item){
  return `<span class="db-rarity ${rarityClass(item)}">${escapeHtml(getRarityLabel(item))}</span>`;
}

function itemStats(item){
  return `<dl class="db-item-stats">${droneEquipmentStats(item).map(stat=>`<div><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>`).join("")}</dl>`;
}

function renderOverview(model){
  const selectedUpgrade = !!model.selectedDrone?.upgrade;
  return `<aside class="db-overview">
    <header class="db-heading"><span class="tiny">Hangar</span><h2>Mes drones</h2><p>Équipez votre escadrille.</p></header>
    <div class="db-art${selectedUpgrade ? " vesper-active" : ""}"><i aria-hidden="true"></i><img src="${escapeHtml(model.drone.img)}" alt="${escapeHtml(model.drone.name)}" draggable="false"></div>
    <div class="db-identity"><h3>${escapeHtml(model.drone.name)}</h3>${rarity(model.drone)}</div>
    <ul class="db-overview-stats"><li>${droneBayIcon("drone")}<span><b>${model.standardOwned} / ${model.maxStandard}</b> drones standards${model.legacyOwned ? `<small>+ ${model.legacyOwned} drone${model.legacyOwned > 1 ? "s" : ""} historique${model.legacyOwned > 1 ? "s" : ""} conservé${model.legacyOwned > 1 ? "s" : ""}</small>` : ""}</span></li><li>${droneBayIcon("chip")}<span>${Number(model.drone.slots) || 1} emplacement par drone</span></li><li>${droneBayIcon("shield")}<span>Laser ou générateur de bouclier</span></li></ul>
    <div class="db-purchase"><h4>${model.nextPrice ? "Prochain drone" : "Drones standards au maximum"}</h4>${model.nextPrice ? `<div class="db-next-price">${currencyAmountHtml(model.drone.priceType, model.nextPrice)} <span>crédits</span></div>` : ""}<button class="blue-button db-buy" type="button" data-buy-combat-drone${model.canPurchase ? "" : " disabled"}>${droneBayIcon("cart")}<span>${model.nextPrice ? "Acheter un drone" : "Limite standard atteinte"}</span>${droneBayIcon("arrow")}</button>${model.nextPrice && !model.canPurchase ? `<small class="db-purchase-reason">Crédits insuffisants.</small>` : ""}<p class="db-ammo-note">Un laser de drone consomme une munition supplémentaire par tir.</p></div>
  </aside>`;
}

function renderSlot(slot, model){
  if(!slot.owned){
    return `<div class="${slot.reserved ? "db-special-tile reserved" : "db-drone-tile unowned"}" aria-label="${slot.reserved ? "Place spéciale à venir" : `Drone ${slot.number} non possédé`}"><span class="db-drone-number">${slot.reserved ? "" : slot.number}</span><span class="db-unowned-icon">${droneBayIcon(slot.reserved ? "lock" : "plus")}</span><strong>${slot.reserved ? "À venir" : "Non possédé"}</strong>${slot.reserved ? `<small>Emplacement spécial</small>` : ""}</div>`;
  }
  const kind = droneEquipmentKind(slot.item);
  const equipped = slot.item
    ? `<span class="db-drone-equipment ${rarityClass(slot.item)}${slot.multiSelected ? " multi-selected" : ""}${slot.itemSelected ? " selected" : ""}" data-slot-uid="${escapeHtml(slot.uid)}" data-drop-part="drone" data-drop-index="${slot.index}" draggable="true" title="${escapeHtml(`${slot.item.name} · Ctrl + clic pour présélectionner`)}"><img src="${escapeHtml(slot.item.img)}" alt=""><span>${escapeHtml(slot.item.short || slot.item.name)}</span></span>`
    : `<span class="db-drone-equipment empty">${droneBayIcon("plus")}<span>Emplacement libre</span></span>`;
  return `<button class="db-drone-tile owned${slot.reserved ? " db-special-tile legacy-owned" : ""}${slot.selected ? " selected" : ""}${slot.upgrade ? " vesper-active" : ""}" type="button" data-drone-select="${slot.index}" data-drop-part="drone" data-drop-index="${slot.index}" data-drone-slot-number="${slot.index + 1}" aria-pressed="${slot.selected}" aria-label="Drone ${slot.number}${slot.item ? `, ${escapeHtml(slot.item.name)}` : ", emplacement libre"}${slot.upgrade ? ", Noyau Overdrive actif" : ""}">
    <span class="db-drone-number">${slot.number}</span><span class="db-drone-status">${slot.upgrade ? "Overdrive" : slot.item ? "Équipé" : "Libre"}</span><span class="db-drone-art"><img src="${escapeHtml(model.drone.img)}" alt="" draggable="false"></span>${equipped}${slot.reserved ? `<small class="db-legacy-label">Drone historique</small>` : ""}
  </button>`;
}

function renderHangar(model){
  return `<section class="db-hangar equipped-compact-panel"><header class="db-panel-head"><h3>Baie de drones</h3><p>${droneBayIcon("info")}<span>Sélectionnez un drone pour modifier son équipement.</span></p></header><div class="drone-bay-grid" data-db-scroll="bay">${model.standardSlots.map(slot=>renderSlot(slot, model)).join("")}</div><h4 class="db-special-heading">${model.legacyOwned ? "Places supplémentaires" : "Places spéciales — à venir"}</h4><div class="db-special-grid">${model.specialSlots.map(slot=>renderSlot(slot, model)).join("")}</div>${model.owned ? "" : `<p class="db-first-drone-note">Achetez votre premier drone pour commencer à l’équiper.</p>`}</section>`;
}

function renderEquipment(model){
  const slot = model.selectedDrone;
  const item = slot?.item;
  const core = slot?.upgrade || getItem("drone_overdrive_chip");
  return `<section class="db-equipment-panel"><h3>${slot ? `Drone ${slot.number} — équipement` : "Équipement du drone"}</h3>
    ${slot ? item ? `<article class="db-equipped-card ${rarityClass(item)}"><div class="db-equipped-art" data-slot-uid="${escapeHtml(slot.uid)}" data-drop-part="drone" data-drop-index="${slot.index}" draggable="true"><img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}"></div><div class="db-equipped-copy"><h4>${escapeHtml(item.name)}</h4>${rarity(item)}${itemStats(item)}<small>1 / 1 emplacement</small></div><button type="button" class="db-remove" data-drone-unequip="${slot.index}" aria-label="Retirer ${escapeHtml(item.name)} du Drone ${slot.number}">${droneBayIcon("remove")}<span>Retirer</span></button></article>` : `<div class="db-equipped-card empty" data-drop-part="drone" data-drop-index="${slot.index}"><span class="db-equipped-art">${droneBayIcon("plus")}</span><div class="db-equipped-copy"><h4>Emplacement libre</h4><p>Sélectionnez un laser ou un bouclier dans l’inventaire.</p><small>0 / 1 emplacement</small></div></div>` : `<div class="db-equipped-card empty"><span class="db-equipped-art">${droneBayIcon("drone")}</span><p>Aucun drone possédé pour le moment.</p></div>`}
    <div class="db-overdrive-card${slot?.upgrade ? " active" : model.portalComplete ? " available" : " locked"}">${core ? `<img src="${escapeHtml(core.img)}" alt="${escapeHtml(core.name)}">` : droneBayIcon("chip")}<div><h4>Noyau Overdrive${slot?.upgrade ? `<span>${droneBayIcon("check")} Actif</span>` : ""}</h4><p>${slot?.upgrade ? "+50 % dégâts laser ou capacité de bouclier." : model.portalComplete ? "Installation définitive depuis l’inventaire." : "À débloquer dans La Faille de Vesper."}</p><small>${slot?.upgrade ? "Permanent · retrait impossible · régénération inchangée" : model.portalComplete ? "Noyau consommé à l’installation" : "Installation verrouillée"}</small></div>${!model.portalComplete ? droneBayIcon("lock") : ""}</div>
  </section>`;
}

function renderInspection(group, model){
  const entry = group.selectedEntry;
  if(!entry) return "";
  const action = model.action;
  const sell = group.item.shop !== false && Number(group.item.price) > 0
    ? `<button class="blue-button secondary small db-sell-action" type="button" data-inventory-sell="${escapeHtml(entry.uid)}">Vendre cet exemplaire</button>` : "";
  return `<div class="db-inspection"><p class="db-item-description">${escapeHtml(group.item.desc || "")}</p>${itemStats(group.item)}${group.item.stats?.passif ? `<small class="db-item-passive">Passif : ${escapeHtml(group.item.stats.passif)}</small>` : ""}<small class="db-base-stats-note">Caractéristiques de base${droneEquipmentKind(group.item) === "overdrive" ? " · régénération inchangée" : " · bonus de compétences et améliorations non inclus"}.</small><div class="db-inspection-location">${escapeHtml(entry.equipped ? `Équipé sur ${entry.locationLabel}` : "Disponible dans l’inventaire")}</div>${action.permanent ? `<p class="db-permanent-note">Le noyau sera consommé. Installation définitive.</p>` : action.replacing && action.allowed ? `<p class="db-replace-note">Le module actuel retournera dans l’inventaire.</p>` : ""}<div class="db-item-actions"><button class="blue-button db-equip-action" type="button" data-drone-equip-uid="${escapeHtml(entry.uid)}"${action.allowed ? "" : " disabled"}>${droneBayIcon(action.permanent ? "chip" : "arrow")}<span>${escapeHtml(action.label || "Équiper")}</span></button>${sell}</div>${!action.allowed && action.reason ? `<small class="db-action-reason">${escapeHtml(action.reason)}</small>` : ""}</div>`;
}

function renderGroup(group, model){
  const copies = group.expanded;
  return `<article class="db-inventory-group ${group.rarityClass}${group.selected ? " selected" : ""}${group.expanded ? " expanded" : ""}"><button type="button" class="db-group-heading" data-drone-group="${escapeHtml(group.id)}" aria-expanded="${copies}"><span class="db-item-image"><img src="${escapeHtml(group.item.img)}" alt="" draggable="false"></span><span class="db-group-name"><strong>${escapeHtml(group.item.name)}</strong>${rarity(group.item)}<small>${fmt(group.available)} disponible${group.available > 1 ? "s" : ""} · ${fmt(group.equipped)} équipé${group.equipped > 1 ? "s" : ""}</small></span><span class="db-group-counts"><b>×${fmt(group.total)}</b>${droneBayIcon("chevron")}</span></button>${copies ? `<div class="db-group-copies" role="group" aria-label="Exemplaires de ${escapeHtml(group.item.name)}">${group.copies.map((entry, index)=>`<button type="button" class="db-copy inventory-cell${entry.uid === model.selectedUid ? " selected" : ""}${model.selectedUids.has(entry.uid) ? " multi-selected" : ""}${entry.equipped ? " equipped-elsewhere" : ""}" data-inventory-uid="${escapeHtml(entry.uid)}" data-inventory-category="${escapeHtml(group.item.category)}" draggable="true" title="${escapeHtml(`${group.item.name} · ${entry.locationLabel}`)}"><span>Exemplaire ${String(index + 1).padStart(2, "0")}</span><small>${escapeHtml(entry.locationLabel)}</small>${entry.uid === model.selectedUid ? droneBayIcon("check") : ""}</button>`).join("")}</div>` : ""}${renderInspection(group, model)}</article>`;
}

function renderInventory(model){
  return `<section class="db-inventory-panel rpg-inventory-panel"><header class="db-inventory-heading"><h3>Inventaire</h3><span>${fmt(model.totalItems)} module${model.totalItems > 1 ? "s" : ""} · ${fmt(model.availableItems)} libre${model.availableItems > 1 ? "s" : ""}</span></header><div class="db-inventory-filters" role="group" aria-label="Filtrer les équipements compatibles">${DRONE_BAY_FILTERS.map(filter=>`<button type="button" data-drone-filter="${filter.id}" class="${model.filter === filter.id ? "active" : ""}" aria-pressed="${model.filter === filter.id}">${filter.label}</button>`).join("")}</div><div class="db-inventory-list rpg-inventory-grid" data-db-scroll="inventory">${model.groups.length ? model.groups.map(group=>renderGroup(group, model)).join("") : `<p class="db-empty-inventory">${model.totalItems ? "Aucun module dans cette catégorie." : "Aucun équipement compatible possédé. Les lasers et générateurs de bouclier apparaîtront ici."}</p>`}</div><p class="db-inventory-note">Cliquez pour inspecter · Double clic sur un exemplaire : drone sélectionné.</p></section>`;
}

export function renderDroneBayMarkup(model){
  return `<div class="drone-bay-layout ship-equipment-layout">${renderOverview(model)}${renderHangar(model)}<aside class="db-detail">${renderEquipment(model)}${renderInventory(model)}</aside></div>`;
}

export function updateDroneBayPresentation(section, model){
  const markup = renderDroneBayMarkup(model);
  if(renderedMarkup.get(section) === markup) return false;
  const scrolls = [...section.querySelectorAll("[data-db-scroll]")].map(element=>({id:element.dataset.dbScroll, top:element.scrollTop, left:element.scrollLeft}));
  const active = section.contains(document.activeElement) ? document.activeElement : null;
  const attributes = ["data-drone-select", "data-drone-filter", "data-drone-group", "data-inventory-uid", "data-drone-equip-uid", "data-drone-unequip", "data-buy-combat-drone"];
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
export function handleDroneBayInteraction(event, {equipPart, unequipPart} = {}){
  if(!event.target?.closest?.("#droneSection")) return false;
  const equip = event.target.closest("[data-drone-equip-uid]");
  if(equip){
    const model = getDroneBayPresentationModel();
    if(!equip.disabled && model.action.allowed && model.selectedEntry?.uid === equip.dataset.droneEquipUid){
      equipPart?.("drone", model.selectedDroneIndex, model.selectedEntry.uid);
    }
    return true;
  }
  const remove = event.target.closest("[data-drone-unequip]");
  if(remove){
    const model = getDroneBayPresentationModel();
    const index = Number(remove.dataset.droneUnequip);
    if(!remove.disabled && model.selectedDrone?.index === index && model.selectedDrone.uid) unequipPart?.("drone", index);
    return true;
  }
  const filter = event.target.closest("[data-drone-filter]");
  if(filter){ if(setDroneBayFilter(filter.dataset.droneFilter)) renderDroneSection(); return true; }
  const groupButton = event.target.closest("[data-drone-group]");
  if(groupButton){
    const model = getDroneBayPresentationModel();
    const group = model.groups.find(entry=>entry.id === groupButton.dataset.droneGroup);
    if(group){
      const selected = group.copies.find(entry=>entry.uid === store.selectedInventoryUid);
      const entry = selected || group.copies.find(copy=>!copy.equipped) || group.copies[0];
      store.selectedInventoryUid = entry.uid;
      store.selectedInventoryResourceId = null;
      store.selectedInventoryUids = [];
      if(ui.expandedGroups.has(group.id) && selected) ui.expandedGroups.delete(group.id);
      else ui.expandedGroups.add(group.id);
      renderDroneSection();
    }
    return true;
  }
  const tile = event.target.closest("[data-drone-select]");
  if(tile){
    const selected = selectDroneBayDrone(Number(tile.dataset.droneSelect));
    if(event.target.closest("[data-slot-uid][data-drop-part]")) return false;
    if(selected) renderDroneSection();
    return true;
  }
  return false;
}
