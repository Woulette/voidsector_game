import { ammoTypes, droneCatalog, equipment, pageText, portals, rawMaterialCatalog, ships, skills } from "../data/catalog.js";
import { FIRMS, normalizeFirmId } from "../data/firms.js";
import { creditCurrencyPacks, getPremiumRewardStatus, hasStarterPackPurchase, isPremiumActive, novaCurrencyPacks, premiumRemainingLabel, premiumRewardCalendar, premiumShopPacks, starterPacks, storeTabs } from "../data/premium.js";
import { fmt } from "../core/utils.js";
import { DEFAULT_ABILITY_KEYBINDS, DEFAULT_SLOT_KEYBINDS, keyCodeToLabel } from "../core/keybinds.js";
import {
  RANK_TABLE,
  RANK_POINT_RULES,
  GRAPHICS_QUALITY_PRESETS,
  addAmmo,
  applyDronePermanentUpgrade,
  canAfford,
  findEquippedSlot,
  getAmmoCount,
  getCurrentRank,
  getCompletedPortalCount,
  getDroneCatalog,
  getDroneLoadout,
  getDronePermanentUpgrade,
  getDronePurchasePrice,
  getCurrencyPrice,
  getInventoryByCategory,
  getInventoryCount,
  getInventoryItem,
  getSkillLevel,
  getSkillUpgradeData,
  getLeaderboardRows,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getLoadout,
  getNextRank,
  getPortalPieces,
  getPrestigeStatus,
  getRankAssetPath,
  getRankBreakdown,
  getRankProgress,
  getShip,
  getShipCombatStats,
  getSkillBonus,
  getSkillProgress,
  getRealSpeedFromStat,
  getGraphicsQuality,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem,
  isPortalUnlocked,
  saveState,
  setGraphicsQuality,
  store
} from "../core/store.js";
import { ENEMY_TYPES } from "../game/combatData.js";

import { locationLabel, rankIcon, statLabelForItem, statLine } from "./renderShared.js";
import { renderShop } from "./renderShop.js";
import { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js?v=currency-icons-1";
import { renderRefinery } from "./renderRefinery.js";
import { renderFirm } from "./renderFirm.js";
import { multiplayer } from "../multiplayer/client.js";
import { renderAdminPanel } from "./adminPanel.js?v=currency-icons-2";
import { currencyAmountHtml, currencyIconHtml } from "./currencyIcons.js";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

const RESOURCE_RARITY_META = {
  common:{label:"Commune", short:"COM"},
  rare:{label:"Rare", short:"RAR"},
  veryRare:{label:"Tres rare", short:"T-R"},
  elite:{label:"Elite", short:"ELI"},
  mythic:{label:"Mythique", short:"MYT"}
};

const INVENTORY_FILTERS = [
  {id:"all", label:"TOUT"},
  {id:"equipment", label:"EQUIPEMENT"},
  {id:"resources", label:"RESSOURCES"}
];
const RESOURCE_ITEM_IDS = new Set(["teleportation_fluid", "portal_anchor_key"]);

function currentInventoryFilter(){
  return INVENTORY_FILTERS.some(filter=>filter.id === store.inventoryFilter) ? store.inventoryFilter : "all";
}

function isInventoryResourceEntry(entry){
  return RESOURCE_ITEM_IDS.has(entry?.item?.id || entry?.itemId || "");
}

function filterInventoryContent(inventoryEntries = [], resourceEntries = []){
  const filter = currentInventoryFilter();
  if(filter === "equipment"){
    return {
      inventoryEntries:inventoryEntries.filter(entry=>!isInventoryResourceEntry(entry)),
      resourceEntries:[]
    };
  }
  if(filter === "resources"){
    return {
      inventoryEntries:inventoryEntries.filter(isInventoryResourceEntry),
      resourceEntries
    };
  }
  return {inventoryEntries, resourceEntries};
}

function renderInventoryFilterTabs(){
  const active = currentInventoryFilter();
  return `<div class="inventory-filter-tabs">
    ${INVENTORY_FILTERS.map(filter=>`<button class="${active === filter.id ? "active" : ""}" type="button" data-inventory-filter="${filter.id}">${filter.label}</button>`).join("")}
  </div>`;
}

export function renderTop(){
  const { state } = store;
  const rank = getCurrentRank();
  const rankProgress = getRankProgress();
  const nextRank = getNextRank();
  document.getElementById("pilotName").textContent = state.player.name;
  document.getElementById("levelText").textContent = fmt(state.player.level);
  document.getElementById("xpText").textContent = `XP ${fmt(state.player.xp)} / ${fmt(state.player.xpNext)}`;
  document.getElementById("xpFill").style.width = `${Math.min(100, state.player.xp / state.player.xpNext * 100)}%`;
  const pilotPlayTime = document.getElementById("pilotPlayTime");
  if(pilotPlayTime) pilotPlayTime.textContent = formatDuration(state.player.totalPlaySeconds);
  document.getElementById("creditsValue").textContent = fmt(state.player.credits);
  document.getElementById("premiumValue").textContent = fmt(state.player.premium);
  const pilotRankIcon = document.getElementById("pilotRankIcon");
  if(pilotRankIcon){
    pilotRankIcon.src = getRankAssetPath(rank);
    pilotRankIcon.alt = rank.name;
    pilotRankIcon.title = rank.name;
  }
  document.querySelectorAll("[data-skill-points], #skillPointsValue").forEach(skillPoints=>{
    skillPoints.textContent = state.player.skillPoints;
  });
  const pilotRankLabel = document.getElementById("pilotRankLabel");
  if(pilotRankLabel) pilotRankLabel.textContent = rank.name;
  const gradeBox = document.getElementById("gradeCard");
  if(gradeBox){
    gradeBox.innerHTML = `
      <div class="grade-card-head">
        ${rankIcon(rank, rank.name)}
        <div>
          <span>GRADE ACTUEL</span>
          <strong>${rank.name}</strong>
        </div>
      </div>
      <div class="mini-bar"><span style="width:${rankProgress.progress}%"></span></div>
      <small>${nextRank ? `Prochain : ${nextRank.name} · reste ${fmt(rankProgress.remaining)}` : "Grade maximum atteint"}</small>`;
  }
  renderPremiumHomeStatus();
}

export function renderPremiumHomeStatus(now = Date.now()){
  const status = document.getElementById("launcherPremiumStatus");
  if(!status) return;
  const active = isPremiumActive(store.state?.player, now);
  status.classList.toggle("hidden", !active);
  status.setAttribute("aria-hidden", active ? "false" : "true");
  if(!active) return;
  const remainingNode = status.querySelector("[data-premium-home-remaining]");
  if(!remainingNode) return;
  const remaining = premiumRemainingLabel(store.state.player, now);
  remainingNode.textContent = remaining === "Inactif" ? "ACTIF" : remaining;
}

export function renderShips(){
  const { state } = store;
  const grid = document.getElementById("shipGrid");
  if(!grid) return;
  const list = state.ownedShips.map(getShip).filter(Boolean);
  grid.innerHTML = list.map(ship=>{
    const active = state.activeShip === ship.id;
    const selected = state.selectedShip === ship.id;
    const loadout = getLoadout(ship.id);
    return `<article class="ship-card ${selected ? "selected" : ""} ${active ? "active" : ""}" data-ship-id="${ship.id}">
      <span class="badge">${active ? "ACTIF" : selected ? "SÉLECTIONNÉ" : "POSSÉDÉ"}</span>
      <img src="${ship.img}" alt="${ship.name}">
      <div class="ship-meta">
        <div><h3>${ship.name}</h3></div>
        <span class="badge">${loadout.lasers.filter(Boolean).length}/${ship.stats.maxLasers} lasers</span>
      </div>
      <button class="ship-open-button" type="button">Ouvrir l'inventaire</button>
    </article>`;
  }).join("");
}

export function renderSelectedShip(){
  const { state } = store;
  const ship = getShip(state.selectedShip);
  const active = state.activeShip === ship.id;
  const stats = getShipCombatStats(ship.id);
  const loadout = getLoadout(ship.id);
  const currentRank = getCurrentRank();
  document.getElementById("selectedShipName").textContent = ship.name;
  document.getElementById("selectedShipImage").src = ship.img;
  const shipRankBadge = document.getElementById("selectedShipRankBadge");
  if(shipRankBadge){
    shipRankBadge.innerHTML = `
      ${rankIcon(currentRank, currentRank.name)}
      <div>
        <span class="tiny">GRADE PILOTE</span>
        <strong>${currentRank.name}</strong>
      </div>`;
  }
  const statCard = (className, label, value, detail = "")=>`
    <article class="ship-live-stat ${className}">
      <span>${label}</span>
      <strong>${value}</strong>
      ${detail ? `<small>${detail}</small>` : ""}
    </article>`;
  document.getElementById("selectedShipStats").innerHTML = `
    <div class="ship-live-primary">
      ${statCard("hull", "Vie actuelle", fmt(Math.round(stats.vie)), "PV")}
      ${statCard("shield", "Bouclier actuel", fmt(Math.round(stats.bouclier)), stats.bouclier > 0 ? `Régénération ${fmt(Math.round(stats.regen))}/s` : "Aucun bouclier équipé")}
      ${statCard("speed", "Vitesse actuelle", fmt(Math.round(stats.vitesseReelle)), "Vitesse réelle")}
      ${statCard("cargo", "Soute actuelle", fmt(Math.round(stats.cargo)), "Capacité cargo")}
    </div>
    <div class="ship-live-slots">
      ${statCard("laser-slots", "Slots lasers", fmt(stats.maxLasers), `${loadout.lasers.filter(Boolean).length} équipé${loadout.lasers.filter(Boolean).length > 1 ? "s" : ""}`)}
      ${statCard("generator-slots", "Slots générateurs", fmt(stats.maxGenerators), `${loadout.generators.filter(Boolean).length} équipé${loadout.generators.filter(Boolean).length > 1 ? "s" : ""}`)}
      ${statCard("extra-slots", "Slots extras", fmt(stats.maxExtras), `${loadout.extras.filter(Boolean).length} équipé${loadout.extras.filter(Boolean).length > 1 ? "s" : ""}`)}
    </div>
    <article class="ship-special-stat">
      <span>Sort spécial</span>
      <strong>${ship.special || "Aucun"}</strong>
    </article>`;
  const btn = document.getElementById("selectedShipAction");
  btn.textContent = active ? "DÉSÉQUIPER CE VAISSEAU" : "ÉQUIPER CE VAISSEAU";
  btn.classList.toggle("danger", active);
  btn.disabled = false;
  btn.textContent = active ? "VAISSEAU EQUIPE" : "EQUIPER CE VAISSEAU";
  btn.classList.toggle("danger", false);
  btn.disabled = active;
}

function renderInventoryCell(entry, shipId = null){
  const equipped = entry.equipped;
  const isHere = shipId ? equipped?.location === "ship" && equipped?.shipId === shipId : equipped?.location === "drone";
  const isElsewhere = equipped && !isHere;
  const multiSelected = selectedEquipmentUidSet().has(entry.uid);
  const selected = multiSelected || store.selectedInventoryUid === entry.uid;
  const resourceLike = isInventoryResourceEntry(entry);
  const badge = resourceLike ? "RES" : equipmentInventoryBadge(entry.item);
  return `<button class="inventory-cell ${resourceLike ? "inventory-resource-item" : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""} ${isHere ? "equipped-here" : ""} ${isElsewhere ? "equipped-elsewhere" : ""}"
      draggable="${resourceLike ? "false" : "true"}"
      data-inventory-uid="${entry.uid}"
      data-inventory-category="${entry.item.category}"
      title="${entry.item.name}${equipped ? ` · ${locationLabel(equipped)}` : " · disponible"}">
      <img src="${entry.item.img}" alt="${entry.item.name}">
      <span class="inventory-kind-label">${badge}</span>
      ${Number(entry.quantity || 1) > 1 ? `<b class="inventory-quantity">x${Number(entry.quantity)}</b>` : ""}
    </button>`;
}

function getInventoryResourceEntries(){
  const order = {common:1, rare:2, veryRare:3, elite:4, mythic:5};
  return rawMaterialCatalog
    .filter(material=>material.rarity)
    .map(material=>({material, quantity:getMaterialCount(material.id)}))
    .filter(entry=>entry.quantity > 0)
    .sort((a, b)=>(order[a.material.rarity] || 99) - (order[b.material.rarity] || 99) || a.material.name.localeCompare(b.material.name));
}

function renderInventoryResourceCell(entry){
  const {material, quantity} = entry;
  const rarity = RESOURCE_RARITY_META[material.rarity] || {label:material.rarity || "Ressource", short:"RES"};
  const selected = store.selectedInventoryResourceId === material.id;
  return `<button class="inventory-cell resource-cell rarity-${escapeHtml(material.rarity)} ${selected ? "selected" : ""}"
      type="button"
      draggable="false"
      data-inventory-resource-id="${escapeHtml(material.id)}"
      title="${escapeHtml(material.name)} - ${escapeHtml(rarity.label)} - x${fmt(quantity)}">
      <img src="${escapeHtml(material.img)}" alt="${escapeHtml(material.name)}">
      <span class="inventory-kind-label">${escapeHtml(rarity.short)}</span>
      <b class="inventory-quantity">x${fmt(quantity)}</b>
    </button>`;
}

function equipmentInventoryBadge(item){
  if(item.category === "canon"){
    const mk = String(item.id || "").match(/mk(\d+)/i)?.[1];
    const roman = {1:"I", 2:"II", 3:"III", 4:"IV"}[mk];
    return roman ? `MK-${roman}` : "MK";
  }
  if(item.slotType === "missileLauncher") return "LM";
  if(item.slotType === "rocketLauncher") return "LR";
  if(isDronePermanentUpgradeItem(item)) return "DR+";
  if(item.category === "generateur") return "G";
  return "E";
}

function selectedEquipmentUidSet(){
  return new Set(Array.isArray(store.selectedInventoryUids) ? store.selectedInventoryUids : []);
}

function equipmentSlotBadge(item){
  if(item?.category === "canon") return equipmentInventoryBadge(item);
  if(item?.slotType === "missileLauncher") return "LM";
  if(item?.slotType === "rocketLauncher") return "LR";
  if(item?.category === "generateur"){
    const shieldTier = String(item.name || "").match(/\bA\s+([IVX]+)$/i)?.[1];
    if(shieldTier) return `A ${shieldTier.toUpperCase()}`;
    const speedTier = String(item.name || "").match(/\bMK-([IVX]+)$/i)?.[1];
    if(speedTier) return `V ${speedTier.toUpperCase()}`;
    return "G";
  }
  return item?.short || item?.name || "";
}

function selectedItemStatsHtml(item){
  if(item?.category === "canon" && item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    return `<div class="selected-item-stat-lines">
      <span><b>Dégâts</b><strong>${min}-${max}</strong></span>
      <span><b>Portée</b><strong>${item.weapon.range}</strong></span>
      <span><b>Cadence</b><strong>${item.weapon.cooldown.toFixed(2)}s</strong></span>
    </div>`;
  }
  if(item?.slotType === "rocketLauncher"){
    return `<div class="selected-item-stat-lines">
      <span><b>Dégâts roquette</b><strong>${item.stats?.degats || "100%"}</strong></span>
      <span><b>Portée</b><strong>${item.stats?.portee || 0}</strong></span>
      <span><b>Cadence</b><strong>${item.stats?.cadence || "0.00s"}</strong></span>
    </div>`;
  }
  if(item?.slotType === "missileLauncher"){
    return `<div class="selected-item-stat-lines">
      <span><b>Dégâts missile</b><strong>${item.stats?.degats || "100%"}</strong></span>
      <span><b>Portée</b><strong>${item.stats?.portee || 0}</strong></span>
      <span><b>Recharge</b><strong>${item.stats?.recharge || "0.00s"}</strong></span>
    </div>`;
  }
  if(isDronePermanentUpgradeItem(item)){
    return `<div class="selected-item-stat-lines">
      <span><b>Drone</b><strong>+50% degats laser</strong></span>
      <span><b>Statut</b><strong>Permanent</strong></span>
      <span><b>Retrait</b><strong>Impossible</strong></span>
    </div>`;
  }
  return `<p>${statLabelForItem(item)}</p>`;
}

function renderSelectedInventoryDetail(){
  const selectedResource = store.selectedInventoryResourceId
    ? rawMaterialCatalog.find(material=>material.id === store.selectedInventoryResourceId && material.rarity)
    : null;
  if(selectedResource){
    const quantity = getMaterialCount(selectedResource.id);
    if(quantity > 0){
      const rarity = RESOURCE_RARITY_META[selectedResource.rarity] || {label:selectedResource.rarity || "Ressource", short:"RES"};
      return `
    <div class="selected-item-art resource-art rarity-${escapeHtml(selectedResource.rarity)}"><img src="${escapeHtml(selectedResource.img)}" alt="${escapeHtml(selectedResource.name)}"></div>
    <div class="selected-item-copy">
      <span class="tiny">RESSOURCE ${escapeHtml(rarity.label)}</span>
      <h3>${escapeHtml(selectedResource.name)}</h3>
      <div class="selected-item-stat-lines">
        <span><b>Rarete</b><strong>${escapeHtml(rarity.label)}</strong></span>
        <span><b>Stack</b><strong>x${fmt(quantity)}</strong></span>
        <span><b>Usage</b><strong>Fabrication</strong></span>
      </div>
      <p>${escapeHtml(selectedResource.desc || "Ressource de fabrication stockee dans l'inventaire.")}</p>
      <small>Ressource stackable - hors raffinerie</small>
    </div>`;
    }
    store.selectedInventoryResourceId = null;
  }
  const selectedEntry = getInventoryItem(store.selectedInventoryUid);
  const selectedItem = selectedEntry ? getItem(selectedEntry.itemId) : null;
  const selectedEquipped = selectedEntry ? findEquippedSlot(selectedEntry.uid) : null;
  if(selectedEntry && selectedItem && isInventoryResourceEntry({...selectedEntry, item:selectedItem})){
    return `
    <div class="selected-item-art resource-art"><img src="${escapeHtml(selectedItem.img)}" alt="${escapeHtml(selectedItem.name)}"></div>
    <div class="selected-item-copy">
      <span class="tiny">RESSOURCE</span>
      <h3>${escapeHtml(selectedItem.name)}</h3>
      <div class="selected-item-stat-lines">
        <span><b>Stack</b><strong>x${fmt(Number(selectedEntry.quantity || 1))}</strong></span>
        <span><b>Usage</b><strong>Quete</strong></span>
        <span><b>Equipement</b><strong>Non</strong></span>
      </div>
      <p>${escapeHtml(selectedItem.stats?.extra || "Ressource stockee dans l'inventaire.")}</p>
      <small>Ressource speciale - non montable sur le vaisseau</small>
    </div>`;
  }
  if(!selectedItem){
    store.selectedInventoryUid = null;
    return "";
  }
  const equippedInActivePanel = store.hangarTab === "drone"
    ? selectedEquipped?.location === "drone"
    : selectedEquipped?.location === "ship" && selectedEquipped?.shipId === store.state.selectedShip;
  const compatibleWithActivePanel = store.hangarTab === "drone"
    ? isDroneCompatibleEquipment(selectedItem) || isDronePermanentUpgradeItem(selectedItem)
    : ["canon", "generateur", "extra"].includes(selectedItem.category) || ["missileLauncher", "rocketLauncher"].includes(selectedItem.slotType);
  const actionButtons = selectedEquipped
    ? `${!equippedInActivePanel && compatibleWithActivePanel ? `<button class="blue-button small" data-inventory-equip="${selectedEntry.uid}">Déplacer ici</button>` : ""}
       <button class="blue-button secondary small" data-inventory-unequip="${selectedEntry.uid}">Retirer</button>`
    : `<button class="blue-button small" data-inventory-equip="${selectedEntry.uid}">Équiper</button>`;
  const saleButton = selectedItem.shop !== false && Number(selectedItem.price || 0) > 0
    ? `<button class="blue-button secondary small" data-inventory-sell="${selectedEntry.uid}">Vendre</button>`
    : "";
  const bulkSelectionCount = selectedEquipmentUidSet().size;
  return `
    <div class="selected-item-art"><img src="${selectedItem.img}" alt="${selectedItem.name}"></div>
    <div class="selected-item-copy">
      <span class="tiny">${selectedItem.category}</span>
      <h3>${selectedItem.name}</h3>
      ${selectedItemStatsHtml(selectedItem)}
      <small>${locationLabel(selectedEquipped)}</small>
      ${bulkSelectionCount > 1 ? `<small class="bulk-selection-count">${bulkSelectionCount} équipements présélectionnés</small>` : ""}
      <div class="selected-item-actions">
        ${actionButtons}
        ${saleButton}
      </div>
    </div>`;
}

export function renderLoadout(){
  const { state } = store;
  const ship = getShip(state.selectedShip);
  const loadout = getLoadout(ship.id);
  const title = document.getElementById("loadoutShipTitle");
  if(title) title.textContent = ship.name;
  const renderSlot = (type, index, uid) => {
    const item = getItemFromInventoryUid(uid);
    const label = type === "laser" ? "L" : type === "generator" ? "G" : type === "missileLauncher" ? "LM" : type === "rocketLauncher" ? "LR" : "E";
    const multiSelected = item && selectedEquipmentUidSet().has(uid);
    const selected = item && (multiSelected || store.selectedInventoryUid === uid);
    return `<button class="equip-slot-tile ${type}-slot ${item ? "filled" : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""}" data-drop-part="${type}" data-drop-index="${index}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""} title="${item ? item.name : "Slot vide"}">
      ${item ? `<img src="${item.img}" alt="${item.name}"><b>${equipmentSlotBadge(item)}</b>` : `<span>${label}${index+1}</span><i>+</i>`}
    </button>`;
  };
  const allInventoryEntries = [
    ...getInventoryByCategory("canon"),
    ...getInventoryByCategory("generateur"),
    ...getInventoryByCategory("module"),
    ...getInventoryByCategory("extra"),
    ...getInventoryByCategory("quest_item")
  ].filter(entry=>!entry.equipped);
  const allResourceEntries = getInventoryResourceEntries();
  const {inventoryEntries, resourceEntries} = filterInventoryContent(allInventoryEntries, allResourceEntries);
  const inventoryCount = inventoryEntries.length + resourceEntries.length;
  const emptyCells = Array.from({length:Math.max(0, 48 - inventoryCount)}, (_,i)=>`<div class="inventory-cell empty" aria-hidden="true"><span>${i+1}</span></div>`).join("");
  const selectedDetail = renderSelectedInventoryDetail();
  const panel = document.getElementById("loadoutPanel");
  if(!panel) return;
  panel.innerHTML = `
    <div class="ship-equipment-layout">
      <section class="equipped-compact-panel">
        <div class="compact-section-head"><h3>Lasers</h3><span>${loadout.lasers.filter(Boolean).length}/${ship.stats.maxLasers}</span></div>
        <div class="compact-slot-grid laser-slots">${loadout.lasers.map((id,i)=>renderSlot("laser", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Lance missile</h3><span>${loadout.missileLauncher ? "1/1" : "0/1"}</span></div>
        <div class="compact-slot-grid launcher-slots">${renderSlot("missileLauncher", 0, loadout.missileLauncher)}</div>
        <div class="compact-section-head"><h3>Lance roquette</h3><span>${loadout.rocketLauncher ? "1/1" : "0/1"}</span></div>
        <div class="compact-slot-grid launcher-slots">${renderSlot("rocketLauncher", 0, loadout.rocketLauncher)}</div>
        <div class="compact-section-head"><h3>Générateurs</h3><span>${loadout.generators.filter(Boolean).length}/${ship.stats.maxGenerators}</span></div>
        <div class="compact-slot-grid generator-slots">${loadout.generators.map((id,i)=>renderSlot("generator", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Extras</h3><span>${loadout.extras.filter(Boolean).length}/${ship.stats.maxExtras || 3}</span></div>
        <div class="compact-slot-grid extra-slots">${loadout.extras.map((id,i)=>renderSlot("extra", i, id)).join("")}</div>
      </section>
      <section class="rpg-inventory-panel">
        <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryCount} objets</span></div>
        ${renderInventoryFilterTabs()}
        <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, ship.id)).join("")}${resourceEntries.map(renderInventoryResourceCell).join("")}${emptyCells}</div>
      </section>
      ${selectedDetail ? `<section class="selected-item-panel">${selectedDetail}</section>` : ""}
    </div>`;
}

function renderDroneSlot(uid, index){
  const item = getItemFromInventoryUid(uid);
  const upgraded = Boolean(getDronePermanentUpgrade(index));
  const multiSelected = item && selectedEquipmentUidSet().has(uid);
  const selected = item && (multiSelected || store.selectedInventoryUid === uid);
  return `<article class="drone-slot-card ${upgraded ? "upgraded" : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""}" data-drop-part="drone" data-drop-index="${index}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""}>
    <div class="drone-slot-head"><span class="badge">Drone ${index+1}</span><span>${upgraded ? "ROUGE +50%" : item ? item.category.toUpperCase() : "VIDE"}</span></div>
    <div class="drone-slot-body" data-drop-part="drone" data-drop-index="${index}">
      <img class="drone-preview" src="assets/drones/drone_test_sprite.webp" alt="Drone ${index+1}">
      <div class="drone-module ${item ? "filled" : ""}">
        ${item ? `<img src="${item.img}" alt="${item.name}"><b>${equipmentSlotBadge(item)}</b><em data-unequip-part="drone" data-unequip-index="${index}">x</em>` : `<i>+</i><span>Ajouter un laser ou un générateur</span>`}
      </div>
    </div>
  </article>`;
}

export function renderDroneSection(){
  const section = document.getElementById("droneSection");
  if(!section) return;
  const droneDef = getDroneCatalog();
  const drones = getDroneLoadout();
  const allInventoryEntries = [...getInventoryByCategory("canon"), ...getInventoryByCategory("generateur"), ...getInventoryByCategory("drone_upgrade"), ...getInventoryByCategory("quest_item")]
    .filter(entry=>!entry.equipped)
    .filter(entry=>isInventoryResourceEntry(entry) || isDroneCompatibleEquipment(entry.item) || isDronePermanentUpgradeItem(entry.item));
  const allResourceEntries = getInventoryResourceEntries();
  const {inventoryEntries, resourceEntries} = filterInventoryContent(allInventoryEntries, allResourceEntries);
  const inventoryCount = inventoryEntries.length + resourceEntries.length;
  const emptyCells = Array.from({length:Math.max(0, 40 - inventoryCount)}, (_,i)=>`<div class="inventory-cell empty" aria-hidden="true"><span>${i+1}</span></div>`).join("");
  const nextPrice = drones.length >= droneDef.maxOwned ? null : getDronePurchasePrice(drones.length);
  const selectedDetail = renderSelectedInventoryDetail();
  section.innerHTML = `
    <div class="drone-layout">
      <aside class="panel frame drone-summary-panel">
        <div class="panel-head compact"><div><span class="tiny">DRONES</span><h2>${droneDef.name}</h2></div><span class="rank">${drones.length}/${droneDef.maxOwned}</span></div>
        <div class="selected-ship-art drone-art-large"><img src="${droneDef.img}" alt="${droneDef.name}"></div>
        <div class="stats-list">
          ${statLine("Drones possédés", drones.length, droneDef.maxOwned)}
          ${statLine("Max drones", droneDef.maxOwned, droneDef.maxOwned)}
          <div class="stat-line special-line"><span>Emplacements</span><b>1 par drone</b></div>
          <div class="stat-line special-line"><span>Compatibilité</span><b>Laser, bouclier ou overdrive</b></div>
          <div class="stat-line special-line"><span>Prix suivant</span><b>${nextPrice ? currencyAmountHtml(droneDef.priceType, getCurrencyPrice(droneDef.priceType, nextPrice)) : "MAX"}</b></div>
        </div>
        <button class="blue-button" data-buy-combat-drone ${(!nextPrice || !canAfford(droneDef.priceType, nextPrice)) ? "disabled" : ""}>${nextPrice ? "ACHETER UN DRONE" : "MAX DRONES"}</button>
        <p class="panel-note">${droneDef.desc}</p>
      </aside>
      <section class="panel frame drone-loadout-panel">
        <div class="panel-head drone-loadout-head"><div><h2>DRONE</h2></div></div>
        <div class="ship-equipment-layout drone-equipment-layout">
          <section class="equipped-compact-panel">
            <div class="compact-section-head"><h3>Drone Bay</h3><span>${drones.length}/${droneDef.maxOwned}</span></div>
            <div class="drone-bay-grid">${drones.length ? drones.map((uid,i)=>renderDroneSlot(uid, i)).join("") : `<div class="empty-msg">Aucun drone acheté pour le moment.</div>`}</div>
          </section>
          <section class="rpg-inventory-panel">
            <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryCount} objets</span></div>
            ${renderInventoryFilterTabs()}
            <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, null)).join("")}${resourceEntries.map(renderInventoryResourceCell).join("")}${emptyCells}</div>
          </section>
          ${selectedDetail ? `<section class="selected-item-panel">${selectedDetail}</section>` : ""}
        </div>
      </section>
    </div>`;
}

function formatDuration(seconds){
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if(hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(total % 60).padStart(2, "0")}s`;
}

function formatPercentFromMultiplier(multiplier){
  return `${Math.round((Number(multiplier || 1) - 1) * 100)}%`;
}

function profileCompareRow(label, before, after, suffix = ""){
  const fmtValue = value=>typeof value === "number" ? fmt(Math.round(value)) : value;
  const improved = Number(after || 0) > Number(before || 0);
  return `<div class="profile-compare-row ${improved ? "improved" : ""}">
    <span>${label}</span><b>${fmtValue(before)}${suffix}</b><i></i><strong>${fmtValue(after)}${suffix}</strong>
  </div>`;
}

function getProfileStatsRows(){
  const stats = getShipCombatStats(store.state.activeShip);
  const skill = getSkillBonus();
  const safeMultiplier = key=>Math.max(0.0001, Number(skill[key] || 1));
  const speedStat = Math.max(0, (Number(stats.vitesseReelle || 0) - 120) / 2.15);
  const beforeSpeed = getRealSpeedFromStat(speedStat / safeMultiplier("speedMultiplier"));
  return [
    profileCompareRow("Vie", stats.vie / safeMultiplier("hullMultiplier"), stats.vie, " PV"),
    profileCompareRow("Bouclier", stats.bouclier / safeMultiplier("shieldMultiplier"), stats.bouclier),
    profileCompareRow("Absorption bouclier", `${Math.round((Number(stats.shieldAbsorbRatio || 0) - Number(skill.shieldAbsorbBonus || 0)) * 100)}%`, `${Math.round(Number(stats.shieldAbsorbRatio || 0) * 100)}%`),
    profileCompareRow("Régénération", stats.regen / safeMultiplier("regenMultiplier"), stats.regen, "/s"),
    profileCompareRow("Vitesse réelle", beforeSpeed, stats.vitesseReelle),
    profileCompareRow("Soute", stats.cargo / safeMultiplier("cargoMultiplier"), stats.cargo),
    profileCompareRow("Dégâts laser", "0%", formatPercentFromMultiplier(skill.weaponDamageMultiplier || 1)),
    profileCompareRow("Dégâts roquette", "0%", formatPercentFromMultiplier(skill.rocketDamageMultiplier || 1)),
    profileCompareRow("Dégâts missile", "0%", formatPercentFromMultiplier(skill.missileDamageMultiplier || 1)),
    profileCompareRow("Crédits gagnés", "0%", formatPercentFromMultiplier(skill.lootMultiplier || 1)),
    profileCompareRow("NOVA gagnés", "0%", formatPercentFromMultiplier(skill.novaMultiplier || 1)),
    profileCompareRow("Esquive", "0%", `${Math.round(Number(skill.evasionChance || 0) * 100)}%`),
    profileCompareRow("Conversion vie", "0%", `${Math.round(Number(skill.damageToHpChance || 0) * 100)}%`)
  ].join("");
}

function profileAchievements(){
  const player = store.state.player;
  const completedPortals = getCompletedPortalCount();
  const completedQuests = Object.keys(store.state.completedQuestClaims || {}).length;
  const spentSkills = skills.reduce((sum, skill)=>sum + Number(getSkillProgress(skill.id).completedRanks || 0), 0);
  const weaponAchievement = (id, name, label, current, target, title)=>({
    id,
    name,
    desc:`${label} ${fmt(target)} fois. Progression : ${fmt(current)} / ${fmt(target)}.`,
    done:Number(current || 0) >= target,
    title
  });
  const laserShots = Number(player.laserShotsFired || 0);
  const rocketShots = Number(player.rocketShotsFired || 0);
  const missileShots = Number(player.missileShotsFired || 0);
  return [
    {id:"first_contact", name:"Premier contact", desc:"Détruire ton premier monstre.", done:Number(player.totalKills || 0) >= 1, title:"Premier sang"},
    {id:"hunter_100", name:"Chasseur confirmé", desc:"Détruire 100 monstres.", done:Number(player.totalKills || 0) >= 100, title:"Traqueur spatial"},
    {id:"veteran_25", name:"Pilote vétéran", desc:"Atteindre le niveau 25.", done:Number(player.level || 1) >= 25, title:"Vétéran d'Astra"},
    {id:"portal_mastery", name:"Maîtrise des portails", desc:"Terminer au moins un portail.", done:completedPortals > 0, title:"Nettoyeur d'Astra"},
    {id:"quest_5", name:"Mercenaire fiable", desc:"Réclamer 5 récompenses de quête.", done:completedQuests >= 5, title:"Mercenaire fiable"},
    {id:"inventory_30", name:"Ingénieur de bord", desc:"Posséder 30 objets d'équipement.", done:(store.state.inventoryItems || []).length >= 30, title:"Ingénieur de bord"},
    {id:"skill_15", name:"Spécialiste", desc:"Investir 15 rangs de compétences.", done:spentSkills >= 15, title:"Spécialiste"},
    {id:"drone_5", name:"Escadron drone", desc:"Posséder 5 drones.", done:Number(store.state.ownedDroneCount || 0) >= 5, title:"Chef d'escadron"},
    {id:"hunter_500", name:"Chasseur abyssal", desc:"Détruire 500 monstres.", done:Number(player.totalKills || 0) >= 500, title:"Chasseur abyssal"},
    weaponAchievement("laser_100k", "Canon chaud", "Tirer au laser", laserShots, 100000, "Canonnier laser"),
    weaponAchievement("laser_1m", "Rideau laser", "Tirer au laser", laserShots, 1000000, "Deluge photonique"),
    weaponAchievement("laser_10m", "Faisceau massif", "Tirer au laser", laserShots, 10000000, "Architecte de faisceaux"),
    weaponAchievement("laser_100m", "Tempete laser", "Tirer au laser", laserShots, 100000000, "Tempete laser"),
    weaponAchievement("laser_1b", "Milliard photonique", "Tirer au laser", laserShots, 1000000000, "Legende photonique"),
    weaponAchievement("rocket_25k", "Soute explosive", "Utiliser une roquette", rocketShots, 25000, "Artilleur orbital"),
    weaponAchievement("rocket_250k", "Salves lourdes", "Utiliser une roquette", rocketShots, 250000, "Maitre roquettes"),
    weaponAchievement("rocket_25m", "Barrage orbital", "Utiliser une roquette", rocketShots, 25000000, "Barrage orbital"),
    weaponAchievement("missile_10k", "Verrouillage", "Utiliser un missile", missileShots, 10000, "Artilleur guide"),
    weaponAchievement("missile_1m", "Pluie guidee", "Utiliser un missile", missileShots, 1000000, "Commandant missile"),
    weaponAchievement("missile_100m", "Doctrine orbitale", "Utiliser un missile", missileShots, 100000000, "Doctrine orbitale")
  ];
}

function profileTitles(){
  return profileAchievements()
    .filter(achievement=>achievement.title)
    .map(achievement=>({
      id:achievement.id,
      name:achievement.title,
      desc:`Titre obtenu avec le succès : ${achievement.name}.`,
      unlocked:achievement.done
    }));
}

function getActiveProfileTitle(){
  const player = store.state.player;
  if(player.titleVisible === false || !player.activeTitleId) return null;
  return profileTitles().find(title=>title.id === player.activeTitleId && title.unlocked) || null;
}

function renderProfileTabContent(tab){
  const player = store.state.player;
  const rank = getCurrentRank();
  const nextRank = getNextRank();
  const rankProgress = getRankProgress();
  const activeShip = getShip(store.state.activeShip);
  const stats = getShipCombatStats(store.state.activeShip);
  const completedPortals = getCompletedPortalCount();
  const prestige = getPrestigeStatus();
  if(tab === "stats"){
    return `<section class="profile-card profile-wide">
      <div class="profile-card-head"><span class="tiny">AVANT / APRÈS</span><h3>Impact des compétences</h3></div>
      <div class="profile-compare-head"><span>Stat</span><b>Sans compétences</b><strong>Actuel</strong></div>
      <div class="profile-compare-list">${getProfileStatsRows()}</div>
    </section>`;
  }
  if(tab === "titles"){
    const activeTitle = getActiveProfileTitle();
    const titles = profileTitles();
    return `<section class="profile-card profile-wide">
      <div class="profile-card-head">
        <span class="tiny">TITRES</span>
        <h3>Identité pilote</h3>
        <button class="blue-button small" data-profile-title-visibility type="button">${player.titleVisible === false ? "Afficher en jeu" : "Masquer en jeu"}</button>
      </div>
      <div class="profile-list">${titles.map(title=>{
        const equipped = activeTitle?.id === title.id;
        const state = equipped ? "Équipé" : (title.unlocked ? "Débloqué" : "Verrouillé");
        const action = title.unlocked
          ? `<button class="blue-button small" data-profile-title="${equipped ? "" : title.id}" type="button">${equipped ? "Retirer" : "Activer"}</button>`
          : "";
        return `<article><strong>${title.name}</strong><span>${state}</span><p>${title.desc}</p>${action}</article>`;
      }).join("")}</div>
    </section>`;
  }
  if(tab === "achievements"){
    return `<section class="profile-card profile-wide"><div class="profile-card-head"><span class="tiny">SUCCÈS</span><h3>Achievements</h3></div><div class="profile-achievement-grid">${profileAchievements().map(achievement=>`<article class="${achievement.done ? "done" : ""}"><b>${achievement.done ? "OK" : "--"}</b><strong>${achievement.name}</strong><span>${achievement.desc}</span></article>`).join("")}</div></section>`;
  }
  if(tab === "bestiary"){
    const entries = Object.entries(ENEMY_TYPES).map(([id, enemy])=>({id, name:enemy.name, count:Number(store.state.killStats?.[id] || 0)})).sort((a,b)=>b.count - a.count || a.name.localeCompare(b.name));
    return `<section class="profile-card profile-wide"><div class="profile-card-head"><span class="tiny">BESTIAIRE</span><h3>Monstres détruits</h3></div><div class="profile-kill-table">${entries.map(entry=>`<div><span>${entry.name}</span><strong>${fmt(entry.count)}</strong></div>`).join("")}</div></section>`;
  }
  const activeTitle = getActiveProfileTitle();
  return `<div class="profile-overview-grid">
    <section class="profile-card hero">
      <div class="profile-rank">${rankIcon(rank, rank.name)}</div>
      <div><span class="tiny">COMMANDANT</span><h3>${escapeHtml(player.name)}</h3><p>${activeTitle ? `${activeTitle.name} · ` : ""}${rank.name} · Niveau ${fmt(player.level)}</p></div>
      <div class="mini-bar"><span style="width:${rankProgress.progress}%"></span></div>
      <small>${nextRank ? `Prochain grade : ${nextRank.name} · ${fmt(rankProgress.remaining)} points restants` : "Grade maximum atteint"}</small>
    </section>
    <section class="profile-card"><div class="profile-card-head"><span class="tiny">VAISSEAU</span><h3>${activeShip.name}</h3></div><div class="profile-stat-grid">
      <div><span>PV</span><b>${fmt(stats.vie)}</b></div><div><span>Bouclier</span><b>${fmt(stats.bouclier)}</b></div><div><span>Vitesse</span><b>${fmt(stats.vitesseReelle)}</b></div><div><span>Soute</span><b>${fmt(stats.cargo)}</b></div>
    </div></section>
    <section class="profile-card"><div class="profile-card-head"><span class="tiny">PROGRESSION</span><h3>Compte</h3></div><div class="profile-stat-grid">
      <div><span>Temps en jeu</span><b>${formatDuration(player.totalPlaySeconds)}</b></div><div><span>Reputation</span><b>${fmt(player.reputation || 0)}</b></div><div><span>Kills monstres</span><b>${fmt(player.totalKills || 0)}</b></div><div><span>Kills joueurs</span><b>${fmt(player.totalPlayerKills || 0)}</b></div><div><span>Portails finis</span><b>${fmt(completedPortals)}</b></div><div><span>Quêtes finies</span><b>${fmt(Object.keys(store.state.completedQuestClaims || {}).length)}</b></div><div><span>Prestige</span><b>${fmt(store.state.prestigeCount || 0)}</b></div>
    </div></section>
    <section class="profile-card"><div class="profile-card-head"><span class="tiny">PRESTIGE</span><h3>Boucle suivante</h3></div>
      <p>${prestige.ok ? "Pret : retour niveau 1, competences conservees, cap niveau 100." : prestige.reason}</p>
      <button class="blue-button" data-prestige type="button" ${prestige.ok ? "" : "disabled"}>PRESTIGE</button>
    </section>
  </div>`;
}

export function renderProfile(){
  const section = document.getElementById("profileSection");
  if(!section) return;
  const tabs = [
    {id:"overview", label:"Vue"},
    {id:"stats", label:"Stats"},
    {id:"titles", label:"Titres"},
    {id:"achievements", label:"Succès"},
    {id:"bestiary", label:"Bestiaire"}
  ];
  if(!tabs.some(tab=>tab.id === store.profileTab)) store.profileTab = "overview";
  section.innerHTML = `
    <div class="panel-head">
      <div><span class="tiny">PILOTE</span><h2>Profil</h2></div>
      <span class="badge">Dossier commandant</span>
    </div>
    <div class="profile-layout">
      <nav class="profile-tabs">${tabs.map(tab=>`<button class="${store.profileTab === tab.id ? "active" : ""}" data-profile-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}</nav>
      <div class="profile-content">${renderProfileTabContent(store.profileTab)}</div>
    </div>`;
}

export function renderSettingsSection(){
  const settings = document.getElementById("settingsPanel");
  if(!settings) return;
  const keys = store.state.slotKeybinds || DEFAULT_SLOT_KEYBINDS;
  const abilityKeys = store.state.abilityKeybinds || DEFAULT_ABILITY_KEYBINDS;
  const quality = getGraphicsQuality();
  settings.innerHTML = `
    <div class="panel-head">
      <div><span class="tiny">PARAMÈTRES</span><h2>Touches des slots</h2></div>
      <button class="blue-button small" data-reset-keybinds>Réinitialiser</button>
    </div>
    <p class="settings-help">Clique sur "Modifier", puis appuie sur la touche voulue. Exemple : R, A, V, Espace, etc.</p>
    <div class="keybind-grid">
      ${Array.from({length:9}, (_,i)=>`
        <div class="keybind-row">
          <span>Slot ${i+1}</span>
          <b>${keyCodeToLabel(keys[i])}</b>
          <button class="blue-button small" data-change-slot-key="${i}">Modifier</button>
        </div>
      `).join("")}
    </div>
    <div class="panel-head compact settings-ability-head">
      <div><span class="tiny">VAISSEAU</span><h2>Touches des compétences</h2></div>
      <button class="blue-button small" data-reset-ability-keybinds>Réinitialiser</button>
    </div>
    <div class="keybind-grid">
      ${Array.from({length:3}, (_,i)=>`
        <div class="keybind-row">
          <span>Compétence ${i+1}</span>
          <b>${keyCodeToLabel(abilityKeys[i])}</b>
          <button class="blue-button small" data-change-ability-key="${i}">Modifier</button>
        </div>
      `).join("")}
    </div>
    <div class="settings-note">Les lasers restent en tir automatique. Les roquettes restent manuelles sauf si tu équipes un extra d'auto-lancement.</div>
    <div class="settings-block">
      <div class="panel-head compact">
        <div><span class="tiny">RENDU</span><h2>Qualite graphique</h2></div>
      </div>
      <div class="quality-option-grid">
        ${GRAPHICS_QUALITY_PRESETS.map(preset=>`
          <button class="quality-option ${quality === preset.id ? "active" : ""}" data-set-graphics-quality="${preset.id}" type="button">
            <strong>${preset.name}</strong>
            <span>${preset.desc}</span>
          </button>
        `).join("")}
      </div>
      <p class="settings-help">Moyenne retire les nuages proches et reduit les etoiles. Basse garde surtout la planete et les etoiles.</p>
    </div>
    <div class="danger-zone">
      <div>
        <span class="tiny">SAUVEGARDE</span>
        <h3>Remettre la progression a zero</h3>
        <p>Supprime credits, achats, inventaire, niveaux, quetes, portails et configuration du compte local.</p>
      </div>
      <button class="blue-button danger" data-reset-save type="button">RESET JEU</button>
    </div>`;
}

const STORE_TAB_IDS = storeTabs.map(tab=>tab.id);

function rewardAmountLabel(id, amount){
  const cleanAmount = Math.max(0, Number(amount || 0));
  if(id === "credits" || id === "premium") return fmt(cleanAmount);
  return `${fmt(cleanAmount)} ${String(id || "").replaceAll("_", " ").toUpperCase()}`;
}

function rewardLines(reward = {}){
  const lines = [];
  if(reward.credits) lines.push({kind:"credits", label:rewardAmountLabel("credits", reward.credits), img:"assets/icons/credits.svg"});
  if(reward.premium) lines.push({kind:"nova", label:rewardAmountLabel("premium", reward.premium), img:"assets/icons/premium.svg"});
  for(const [id, amount] of Object.entries(reward.ammo || {})){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    lines.push({kind:"ammo", label:rewardAmountLabel(id, amount), img:ammo?.img || "assets/equipment/ammo_laser_x2_same_preview.png"});
  }
  for(const [id, amount] of Object.entries(reward.itemCounts || {})){
    const item = getItem(id);
    lines.push({kind:"item", label:`${fmt(amount)} ${item?.name || id}`, img:item?.img || "assets/equipment/module_munitions.svg"});
  }
  for(const id of reward.items || []){
    const item = getItem(id);
    lines.push({kind:"item", label:item?.name || id, img:item?.img || "assets/equipment/module_munitions.svg"});
  }
  return lines;
}

function rewardPills(reward = {}){
  return rewardLines(reward).map(line=>`
    <span class="store-reward-pill ${escapeHtml(line.kind)}">
      <img src="${escapeHtml(line.img)}" alt="">
      <b>${escapeHtml(line.label)}</b>
    </span>
  `).join("");
}

function renderPremiumStoreCard(pack){
  return `<article class="store-offer-card store-premium-card" data-store-offer-kind="premium" data-store-offer="${escapeHtml(pack.id)}">
    <div class="store-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
    <div class="store-offer-copy">
      <div class="store-offer-head"><strong>${escapeHtml(pack.name)}</strong><span>${currencyAmountHtml("premium", pack.price)}</span></div>
      <p>${escapeHtml(pack.desc)} Clique pour voir les bonus inclus.</p>
      <div class="store-offer-foot"><b>${escapeHtml(pack.realPrice)}</b><button class="gold-button small" type="button">DETAILS</button></div>
    </div>
  </article>`;
}

function renderCurrencyStoreCard(pack){
  const isNova = pack.tag === "NOVA";
  const currencyType = isNova ? "premium" : "credits";
  return `<article class="store-offer-card ${isNova ? "store-nova-card" : "store-credit-card"}">
    <div class="store-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
    <div class="store-offer-copy">
      <div class="store-offer-head"><strong>${escapeHtml(pack.name)}</strong><span>${currencyIconHtml(currencyType)}</span></div>
      <p>${escapeHtml(pack.desc || "")}</p>
      <div class="store-offer-foot"><b>${pack.amount ? currencyAmountHtml(currencyType, pack.amount) : escapeHtml(pack.price || "A definir")}</b><button class="gold-button small" type="button" disabled>${escapeHtml(pack.price || "Bientot")}</button></div>
    </div>
  </article>`;
}

function renderStarterContentIcon(item){
  if(typeof item === "string"){
    return `<span class="store-starter-content-chip text-only" data-tooltip="${escapeHtml(item)}"><b>${escapeHtml(item)}</b></span>`;
  }
  const label = item?.label || "Contenu";
  const quantity = item?.quantity || "x1";
  const img = item?.img || "assets/icons/premium.svg";
  const kind = item?.kind || "item";
  return `<span class="store-starter-content-chip ${escapeHtml(kind)}" data-tooltip="${escapeHtml(label)}" title="${escapeHtml(label)}">
    <img src="${escapeHtml(img)}" alt="${escapeHtml(label)}">
    <b>${escapeHtml(quantity)}</b>
  </span>`;
}

function renderStarterContentStrip(pack){
  return `<div class="store-starter-strip">${(pack.contents || []).map(renderStarterContentIcon).join("")}</div>`;
}

function renderStarterStoreCard(pack){
  const purchased = hasStarterPackPurchase(store.state, pack.id);
  return `<article class="store-offer-card store-starter-card ${purchased ? "purchased" : ""}" data-store-offer-kind="starter" data-store-offer="${escapeHtml(pack.id)}">
    <div class="store-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
    <div class="store-offer-copy">
      <div class="store-offer-head"><strong>${escapeHtml(pack.name)}</strong><span>${purchased ? "DEJA ACHETE" : escapeHtml(pack.tag || "STARTER")}</span></div>
      <p>${escapeHtml(pack.desc || "")}</p>
      ${renderStarterContentStrip(pack)}
      <div class="store-offer-foot"><b>${purchased ? "Achat unique utilise" : escapeHtml(pack.price || "A definir")}</b><button class="gold-button small" type="button">${purchased ? "VOIR" : "DETAILS"}</button></div>
    </div>
  </article>`;
}

function renderPremiumRewards(){
  const status = getPremiumRewardStatus(store.state || {});
  const claimed = new Set(status.claimedDays || []);
  const nextDay = status.nextDay;
  return `<section class="store-rewards-panel">
    <div class="store-reward-summary">
      <div><span class="tiny">CALENDRIER ${escapeHtml(status.monthKey)}</span><h3>${fmt(status.claimedCount)} / 28 jours</h3><p>${status.canClaim ? "Une recompense premium est disponible aujourd'hui." : escapeHtml(status.reason || "Reviens demain pour la suite.")}</p></div>
      <button class="gold-button" data-claim-premium-reward type="button" ${status.canClaim ? "" : "disabled"}>${status.canClaim ? `RECLAMER JOUR ${nextDay}` : "BLOQUE"}</button>
    </div>
    <div class="store-reward-grid">
      ${premiumRewardCalendar.map(entry=>{
        const isClaimed = claimed.has(entry.day);
        const isNext = !isClaimed && entry.day === nextDay && !status.completed;
        const locked = !isClaimed && entry.day > nextDay;
        return `<article class="store-reward-day ${isClaimed ? "claimed" : ""} ${isNext ? "next" : ""} ${locked ? "locked" : ""}">
          <div class="store-reward-day-head"><span>Jour ${entry.day}</span><b>${isClaimed ? "RECU" : isNext ? "SUIVANT" : "A VENIR"}</b></div>
          <strong>${escapeHtml(entry.label)}</strong>
          <div class="store-reward-pills">${rewardPills(entry.reward)}</div>
        </article>`;
      }).join("")}
    </div>
  </section>`;
}

function renderStoreTabContent(activeTab){
  if(activeTab === "premium"){
    return `<div class="store-offer-grid premium-grid">${premiumShopPacks.map(renderPremiumStoreCard).join("")}</div>`;
  }
  if(activeTab === "currencies"){
    return `<div class="store-offer-grid currency-grid">${[...novaCurrencyPacks, ...creditCurrencyPacks].map(renderCurrencyStoreCard).join("")}</div>`;
  }
  if(activeTab === "starters"){
    return `<div class="store-offer-grid starter-grid">${starterPacks.map(renderStarterStoreCard).join("")}</div>`;
  }
  return renderPremiumRewards();
}

function renderStoreModal(){
  const modal = store.storeModal || null;
  if(!modal?.id) return "";
  if(modal.kind === "premium"){
    const pack = premiumShopPacks.find(entry=>entry.id === modal.id);
    if(!pack) return "";
    return `<div class="store-modal-backdrop" data-store-modal-backdrop>
      <section class="store-modal">
        <button class="store-modal-close" data-store-modal-close type="button">x</button>
        <div class="store-modal-head"><span class="tiny">PACK PREMIUM</span><h3>${escapeHtml(pack.name)}</h3><b>${escapeHtml(pack.realPrice)}</b></div>
        <div class="store-modal-body">
          <div class="store-modal-art premium"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
          <div class="store-modal-copy">
            <p>${escapeHtml(pack.desc)} Peut aussi etre active dans le magasin contre ${currencyAmountHtml("premium", pack.price)}.</p>
            <div class="store-modal-features">${pack.features.map(feature=>`<span>${escapeHtml(feature)}</span>`).join("")}</div>
          </div>
        </div>
        <div class="store-modal-actions">
          <button class="gold-button" type="button" disabled>PAIEMENT BIENTOT</button>
          <button class="blue-button small" data-buy-premium-pack="${escapeHtml(pack.id)}" type="button">ACHETER ${currencyIconHtml("premium")}</button>
        </div>
      </section>
    </div>`;
  }
  if(modal.kind === "starter"){
    const pack = starterPacks.find(entry=>entry.id === modal.id);
    if(!pack) return "";
    const purchased = hasStarterPackPurchase(store.state, pack.id);
    return `<div class="store-modal-backdrop" data-store-modal-backdrop>
      <section class="store-modal">
        <button class="store-modal-close" data-store-modal-close type="button">x</button>
        <div class="store-modal-head"><span class="tiny">STARTER PACK</span><h3>${escapeHtml(pack.name)}</h3><b>${purchased ? "DEJA ACHETE" : escapeHtml(pack.price)}</b></div>
        <div class="store-modal-body">
          <div class="store-modal-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
          <div class="store-modal-copy">
            <p>${escapeHtml(pack.desc || "")}${purchased ? " Ce starter pack est un achat unique deja utilise sur ce compte." : " Ce starter pack ne pourra etre achete qu'une seule fois par compte."}</p>
            <div class="store-starter-contents">${(pack.contents || []).map(renderStarterContentIcon).join("")}</div>
          </div>
        </div>
        <div class="store-modal-actions"><button class="gold-button" type="button" disabled>${purchased ? "DEJA ACHETE" : "PAIEMENT BIENTOT"}</button></div>
      </section>
    </div>`;
  }
  return "";
}

export function renderStoreSection(){
  const panel = document.getElementById("premiumStorePanel");
  if(!panel) return;
  const premiumActive = isPremiumActive(store.state?.player);
  const activeTab = STORE_TAB_IDS.includes(store.storeTab) ? store.storeTab : "premium";
  const tabMeta = storeTabs.find(tab=>tab.id === activeTab) || storeTabs[0];
  panel.innerHTML = `
    <div class="panel-head store-head">
      <div>
        <span class="tiny">BOUTIQUE</span>
        <h2>Packs de soutien</h2>
        <p class="shop-intro">Achats en euros pour soutenir le jeu : premium, NOVA, credits, starters et recompenses premium.</p>
      </div>
      <div class="store-premium-status ${premiumActive ? "active" : ""}">
        <span>Premium</span>
        <strong>${premiumActive ? "ACTIF" : "INACTIF"}</strong>
        <small>${premiumRemainingLabel(store.state.player)}</small>
      </div>
    </div>
    <div class="store-layout">
      <nav class="store-tab-nav">
        ${storeTabs.map(tab=>`<button class="${activeTab === tab.id ? "active" : ""}" data-store-tab="${escapeHtml(tab.id)}" type="button">${escapeHtml(tab.label)}</button>`).join("")}
      </nav>
      <section class="store-tab-panel">
        <div class="store-section-head">
          <span class="tiny">${escapeHtml(tabMeta.id)}</span>
          <h3>${escapeHtml(tabMeta.title)}</h3>
          <p>${escapeHtml(tabMeta.subtitle)}</p>
        </div>
        ${renderStoreTabContent(activeTab)}
      </section>
    </div>
    ${renderStoreModal()}`;
}

export function renderExtraSection(){
  const extra = document.getElementById("extraSection");
  if(extra) extra.innerHTML = "";
}

function renderFirmSetupGate(){
  const account = multiplayer.auth?.account || null;
  const needsSetup = Boolean(account && store.state?.player && store.state.player.firmSelected !== true);
  let gate = document.getElementById("firmSetupGate");
  if(!needsSetup){
    gate?.remove();
    return;
  }
  if(!gate){
    gate = document.createElement("div");
    gate.id = "firmSetupGate";
    document.body.appendChild(gate);
  }
  const firmPresentations = {
    astra:{
      asset:"assets/firms/representatives/astra.png",
      badge:"assets/firms/astra.svg",
      role:"Commandement offensif",
      motto:"Frapper vite. Tenir toujours.",
      speech:"Astra ne recule devant aucun secteur hostile. Rejoins-nous et transforme chaque bataille en territoire conquis."
    },
    cyan:{
      asset:"assets/firms/representatives/cygnus.png",
      badge:"assets/firms/cyan.svg",
      role:"Strategie et maitrise",
      motto:"Voir plus loin. Agir avec precision.",
      speech:"Cygnus gagne avant le premier tir. Nos pilotes dominent par la discipline, la technologie et une strategie sans faille."
    },
    verte:{
      asset:"assets/firms/representatives/verdantis.png",
      badge:"assets/firms/verte.svg",
      role:"Expansion et resilience",
      motto:"Grandir. Proteger. Perseverer.",
      speech:"Verdantis transforme les mondes hostiles en bastions vivants. Ensemble, nous survivons, progressons et ne cedons rien."
    },
    jaune:{
      asset:"assets/firms/representatives/solarys.png",
      badge:"assets/firms/jaune.svg",
      role:"Prestige et puissance",
      motto:"Rayonner au-dessus des autres.",
      speech:"Solarys rassemble les pilotes qui refusent l'ordinaire. Porte nos couleurs et grave ton nom dans la lumiere des etoiles."
    }
  };
  const selectedFirmId = store.pendingFirmId ? normalizeFirmId(store.pendingFirmId) : null;
  const selectedFirm = FIRMS.find(firm=>firm.id === selectedFirmId) || null;
  const selectedPresentation = selectedFirm ? firmPresentations[selectedFirm.id] : null;
  const profileName = store.state.player.name && store.state.player.name !== "NOVA-37"
    ? store.state.player.name
    : (account.username || "");
  const defaultName = store.pendingFirmName || profileName;
  gate.className = `firm-setup-gate ${selectedFirm ? "has-selection" : ""}`;
  gate.innerHTML = `
    <main class="firm-selection-shell">
      <header class="firm-selection-head">
        <div class="firm-selection-title">
          <span class="tiny">PREMIERE CONNEXION MMO / AFFECTATION DEFINITIVE</span>
          <h1>Quel territoire defendras-tu ?</h1>
          <p>Choisis ton commandement. Ta firme fixe ta base, tes secteurs de depart et tes alliances.</p>
        </div>
        <label class="firm-setup-name">
          <span>Identite pilote</span>
          <input id="firmSetupName" data-firm-setup-name maxlength="24" value="${escapeHtml(defaultName)}" placeholder="Ton pseudo en jeu" autocomplete="off">
        </label>
      </header>
      <section class="firm-choice-grid" aria-label="Choix de la firme">
        ${FIRMS.map(firm=>`
          <button type="button" class="firm-choice ${selectedFirmId === firm.id ? "active" : ""}" data-firm-choice="${firm.id}" style="--firm-color:${firm.color}" aria-pressed="${selectedFirmId === firm.id}">
            <img class="firm-choice-scene" src="${firmPresentations[firm.id].asset}" alt="Representant de ${escapeHtml(firm.label)}">
            <span class="firm-choice-shade" aria-hidden="true"></span>
            ${selectedFirmId === firm.id ? `
              <span class="firm-choice-speech">
                <small>TRANSMISSION DU COMMANDEMENT</small>
                <strong>${escapeHtml(firmPresentations[firm.id].speech)}</strong>
              </span>` : ""}
            <span class="firm-choice-identity">
              <img src="${firmPresentations[firm.id].badge}" alt="">
              <span>
                <strong>${escapeHtml(firm.label)}</strong>
                <small>${escapeHtml(firmPresentations[firm.id].role)}</small>
              </span>
            </span>
            <span class="firm-choice-base">Base ${escapeHtml(firm.homeMapName)}</span>
          </button>
        `).join("")}
      </section>
      <footer class="firm-selection-footer" style="--firm-color:${selectedFirm?.color || "#38bdf8"}">
        <div class="firm-selection-summary">
          <span>${selectedFirm ? `FIRME SELECTIONNEE / ${escapeHtml(selectedFirm.homeMapName)}` : "EN ATTENTE DE TON CHOIX"}</span>
          <strong>${selectedFirm ? escapeHtml(selectedFirm.label) : "QUATRE FIRMES. UNE SEULE ALLEGEANCE."}</strong>
          <small>${selectedPresentation ? escapeHtml(selectedPresentation.motto) : "Selectionne un representant pour recevoir sa transmission."}</small>
        </div>
        <div class="firm-selection-warning">
          <b>CHOIX DEFINITIF</b>
          <span>Cette affectation ne pourra plus etre changee apres validation.</span>
        </div>
        <div class="firm-selection-actions">
          ${selectedFirm ? `<button type="button" class="firm-selection-reset" data-firm-choice-reset>VOIR LES QUATRE FIRMES</button>` : ""}
          <button type="button" class="firm-setup-confirm" data-firm-setup-confirm ${selectedFirm ? "" : "disabled"}>REJOINDRE ${selectedFirm ? escapeHtml(selectedFirm.label).toUpperCase() : "UNE FIRME"}</button>
        </div>
      </footer>
    </main>`;
}

export { renderShop } from "./renderShop.js";
export { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js?v=currency-icons-1";
export { renderRefinery } from "./renderRefinery.js";
export { renderFirm } from "./renderFirm.js";

export function renderAll(){
  if(store.currentView !== "hangar") store.hangarDetailOpen = false;
  renderTop();
  renderHangarTabs();
  renderHangarMode();
  renderShips();
  renderSelectedShip();
  renderLoadout();
  renderDroneSection();
  renderProfile();
  renderExtraSection();
  renderStoreSection();
  renderSettingsSection();
  renderLeaderboard();
  renderShop();
  renderPortals();
  renderSkills();
  renderRefinery();
  renderFirm();
  renderAdminPanel();
  renderFirmSetupGate();
  saveState();
}

export function renderHangarTabs(){
  document.querySelectorAll("[data-hangar-tab]").forEach(btn=>btn.classList.toggle("active", btn.dataset.hangarTab === store.hangarTab));
}

export function renderHangarMode(){
  const hangarView = document.querySelector(".hangar-view");
  const listPanel = document.getElementById("hangarListPanel");
  const detailPanel = document.getElementById("shipDetailPanel");
  const loadoutPanel = document.getElementById("shipLoadoutPanel");
  const droneSection = document.getElementById("droneSection");
  const hangarSkillsSection = document.getElementById("hangarSkillsSection");
  const profileSection = document.getElementById("profileSection");
  const extraSection = document.getElementById("extraSection");
  if(store.hangarTab === "extra") store.hangarTab = "vaisseau";
  const shipMode = store.hangarTab === "vaisseau";
  if(hangarView){
    hangarView.classList.toggle("hangar-list-mode", shipMode && !store.hangarDetailOpen);
    hangarView.classList.toggle("hangar-detail-mode", shipMode && store.hangarDetailOpen);
  }
  if(listPanel) listPanel.classList.toggle("hidden", !shipMode || store.hangarDetailOpen);
  if(detailPanel) detailPanel.classList.toggle("hidden", !shipMode || !store.hangarDetailOpen);
  if(loadoutPanel) loadoutPanel.classList.toggle("hidden", !shipMode || !store.hangarDetailOpen);
  if(droneSection) droneSection.classList.toggle("hidden", store.hangarTab !== "drone");
  if(hangarSkillsSection) hangarSkillsSection.classList.toggle("hidden", store.hangarTab !== "skills");
  if(profileSection) profileSection.classList.toggle("hidden", store.hangarTab !== "profile");
  if(extraSection) extraSection.classList.add("hidden");
}

export function setView(view){
  if(!pageText[view]) view = "hangar";
  store.currentView = view;
  if(view === "hangar"){
    store.hangarTab = "vaisseau";
    store.hangarDetailOpen = false;
  }else{
    store.hangarDetailOpen = false;
  }
  renderHangarTabs();
  renderHangarMode();
  document.querySelectorAll(".nav-tab").forEach(b=>b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".page-view").forEach(p=>p.classList.toggle("active", p.dataset.page === view));
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if(pageTitle) pageTitle.textContent = pageText[view].title;
  if(pageSubtitle) pageSubtitle.textContent = pageText[view].subtitle;
  window.scrollTo({top:0, behavior:"smooth"});
}
