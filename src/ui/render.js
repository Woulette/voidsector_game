import { ammoTypes, droneCatalog, equipment, pageText, portals, rawMaterialCatalog, ships, skills } from "../data/catalog.js?v=20260726-ancient1";
import { FIRMS, normalizeFirmId } from "../data/firms.js";
import { betaLaunchMessage, betaPacks, betaRewardCalendar, creditCurrencyPacks, getBetaRewardStatus, getPremiumRewardStatus, hasBetaPackPurchase, hasStarterPackPurchase, isPremiumActive, novaCurrencyPacks, premiumRemainingLabel, premiumRewardCalendar, premiumShopPacks, starterPacks, storeTabs } from "../data/premium.js?v=20260726-kharon1";
import { fmt } from "../core/utils.js";
import { updateLauncherCurrency } from "./launcherCurrency.js?v=20261023-hangar1";
import { DEFAULT_ABILITY_KEYBINDS, DEFAULT_SLOT_KEYBINDS, keyCodeToLabel } from "../core/keybinds.js?v=20260726-kharon1";
import {
  RANK_TABLE,
  RANK_POINT_RULES,
  GRAPHICS_QUALITY_PRESETS,
  addAmmo,
  applyDronePermanentUpgrade,
  canAfford,
  findEquippedSlot,
  getAmmoCount,
  getActiveDroneFormation,
  getCurrentRank,
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
  getPlayerLevelCap,
  getPortalPieces,
  getPrestigeStatus,
  getRankAssetPath,
  getRankBreakdown,
  getRankProgress,
  getShip,
  getShipCombatStats,
  getSkillProgress,
  getGraphicsQuality,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem,
  isPortalUnlocked,
  saveState,
  setGraphicsQuality,
  store
} from "../core/store.js?v=20260726-kharon1";
import { FIRM_REPRESENTATIVES } from "../data/firmRepresentatives.js";

import { locationLabel, rankIcon, statLabelForItem, statLine } from "./renderShared.js?v=20260726-kharon1";
import { renderShop } from "./renderShop.js?v=20261018-map-transfer1";
import { updateHangarShowcase } from "./renderHangarShowcase.js?v=20261023-hangar1";
import { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js?v=20261023-skills1";
import { renderRefinery } from "./renderRefinery.js?v=20260726-kharon1";
import { renderFirm } from "./renderFirm.js?v=20261018-map-transfer1";
import { formatFirmRewardNotificationCount, getFirmRewardNotificationCounts } from "./firmRewardNotifications.js";
import { multiplayer } from "../multiplayer/client.js?v=20261018-map-transfer1";
import { renderAdminPanel } from "./adminPanel.js?v=20261018-map-transfer1";
import { currencyAmountHtml, currencyIconHtml, realMoneyPriceHtml } from "./currencyIcons.js?v=20260726-kharon1";
import { getRarityLabel, getRarityOrder, getRarityShort, getRarityTier, rarityClass } from "../shared/rarities.js";
import { hasCompletedProgressionPortal, STELLAR_SYSTEM_TITLE } from "../shared/progressionUnlocks.js?v=20260726-kharon1";
import { canAccountRoleAccessShip } from "../data/ships.js?v=20260726-imperial2";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

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
  document.getElementById("pilotName").title = state.player.name;
  document.getElementById("levelText").textContent = fmt(state.player.level);
  document.getElementById("xpText").textContent = `XP ${fmt(state.player.xp)} / ${fmt(state.player.xpNext)}`;
  document.getElementById("xpFill").style.width = `${Math.min(100, state.player.xp / state.player.xpNext * 100)}%`;
  const pilotPlayTime = document.getElementById("pilotPlayTime");
  if(pilotPlayTime) pilotPlayTime.textContent = formatDuration(state.player.totalPlaySeconds);
  updateLauncherCurrency(document.getElementById("creditsValue"), state.player.credits, "crédits");
  updateLauncherCurrency(document.getElementById("premiumValue"), state.player.premium, "NOVA");
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
  const firmNotificationBadge = document.querySelector("[data-firm-nav-badge]");
  if(firmNotificationBadge){
    const count = getFirmRewardNotificationCounts(multiplayer.firmSnapshot).total;
    firmNotificationBadge.textContent = formatFirmRewardNotificationCount(count);
    firmNotificationBadge.hidden = count <= 0;
    firmNotificationBadge.closest("[data-view='firm']")?.classList.toggle("has-claimable", count > 0);
  }
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
  const list = state.ownedShips
    .map(id=>ships.find(ship=>ship.id === id))
    .filter(ship=>ship && canAccountRoleAccessShip(ship, multiplayer.auth.account?.role));
  const count = new Set(list.map(ship=>ship.id)).size;
  const countNode = document.getElementById("hangarOwnedCount");
  if(countNode) countNode.textContent = `${fmt(count)} vaisseau${count > 1 ? "x" : ""} possédé${count > 1 ? "s" : ""}`;
  updateHangarShowcase(grid, {
    ownedShips:list,
    selectedShipId:state.selectedShip,
    activeShipId:state.activeShip,
    getStats:getShipCombatStats,
    getLoadout
  });
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
  return `<button class="inventory-cell ${rarityClass(entry.item)} ${resourceLike ? "inventory-resource-item" : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""} ${isHere ? "equipped-here" : ""} ${isElsewhere ? "equipped-elsewhere" : ""}"
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
  return rawMaterialCatalog
    .filter(material=>material.rarity)
    .map(material=>({material, quantity:getMaterialCount(material.id)}))
    .filter(entry=>entry.quantity > 0)
    .sort((a, b)=>getRarityOrder(a.material) - getRarityOrder(b.material) || a.material.name.localeCompare(b.material.name));
}

function renderInventoryResourceCell(entry){
  const {material, quantity} = entry;
  const rarityTier = getRarityTier(material);
  const selected = store.selectedInventoryResourceId === material.id;
  return `<button class="inventory-cell resource-cell rarity-${escapeHtml(rarityTier)} ${selected ? "selected" : ""}"
      type="button"
      draggable="false"
      data-inventory-resource-id="${escapeHtml(material.id)}"
      title="${escapeHtml(material.name)} - ${escapeHtml(getRarityLabel(material, "Ressource"))} - x${fmt(quantity)}">
      <img src="${escapeHtml(material.img)}" alt="${escapeHtml(material.name)}">
      <span class="inventory-kind-label">${escapeHtml(getRarityShort(material))}</span>
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

function eliteLaserEffectStats(item){
  const color = String(item?.effect?.eliteLaserColor || "");
  if(color === "green"){
    return [
      ["Bonus", "+1% vol de vie / laser"],
      ["Max", "25%"],
      ["Effet", "Toutes les 5 secondes"]
    ];
  }
  if(color === "blue"){
    return [
      ["Bonus", "+0,5% cadence / laser"],
      ["Max", "15%"],
      ["Effet", "Toutes les 5 secondes"]
    ];
  }
  if(color === "red"){
    return [
      ["Bonus", "+1% dégâts / laser"],
      ["Max", "25%"],
      ["Effet", "Toutes les 5 secondes"]
    ];
  }
  return [];
}

function selectedItemStatsHtml(item){
  if(item?.category === "canon" && item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    const effectStats = eliteLaserEffectStats(item)
      .map(([label, value])=>`<span><b>${label}</b><strong>${value}</strong></span>`)
      .join("");
    return `<div class="selected-item-stat-lines">
      <span><b>Dégâts</b><strong>${min}-${max}</strong></span>
      <span><b>Portée</b><strong>${item.weapon.range}</strong></span>
      <span><b>Cadence</b><strong>${item.weapon.cooldown.toFixed(2)}s</strong></span>
      ${effectStats}
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
      const rarityLabel = getRarityLabel(selectedResource, "Ressource");
      return `
    <div class="selected-item-art resource-art ${rarityClass(selectedResource)}"><img src="${escapeHtml(selectedResource.img)}" alt="${escapeHtml(selectedResource.name)}"></div>
    <div class="selected-item-copy">
      <span class="tiny">RESSOURCE ${escapeHtml(rarityLabel)}</span>
      <h3>${escapeHtml(selectedResource.name)}</h3>
      <div class="selected-item-stat-lines">
        <span><b>Rarete</b><strong>${escapeHtml(rarityLabel)}</strong></span>
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
    const rarityLabel = getRarityLabel(selectedItem, "Ressource");
    return `
    <div class="selected-item-art resource-art ${rarityClass(selectedItem)}"><img src="${escapeHtml(selectedItem.img)}" alt="${escapeHtml(selectedItem.name)}"></div>
    <div class="selected-item-copy">
      <span class="tiny">RESSOURCE ${escapeHtml(rarityLabel)}</span>
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
    <div class="selected-item-art ${rarityClass(selectedItem)}"><img src="${selectedItem.img}" alt="${selectedItem.name}"></div>
    <div class="selected-item-copy">
      <span class="tiny">${selectedItem.category} · ${escapeHtml(getRarityLabel(selectedItem))}</span>
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
    return `<button class="equip-slot-tile ${type}-slot ${item ? `filled ${rarityClass(item)}` : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""}" data-drop-part="${type}" data-drop-index="${index}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""} title="${item ? item.name : "Slot vide"}">
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
  const vesperUnlocked = Math.max(0, Number(store.state?.completedPortals?.violet || 0)) > 0;
  const vesperActive = vesperUnlocked && Boolean(getDronePermanentUpgrade(index));
  const multiSelected = item && selectedEquipmentUidSet().has(uid);
  const selected = item && (multiSelected || store.selectedInventoryUid === uid);
  const vesperState = vesperUnlocked ? (vesperActive ? "active" : "available") : "locked";
  const vesperTitle = vesperActive
    ? "Noyau Overdrive actif : drone rouge, +50 % au laser ou au bouclier équipé"
    : vesperUnlocked
      ? "Emplacement de Noyau Overdrive disponible"
      : "Termine La Faille de Vesper pour débloquer cet emplacement";
  const vesperSlotContent = vesperActive
    ? `<img src="assets/drone_skins/puce_vesper.png?v=20260726-kharon1" alt="Noyau Overdrive Drone" draggable="false"><small>OVER</small>`
    : `<i aria-hidden="true">${vesperUnlocked ? "+" : "×"}</i><small>${vesperUnlocked ? "NOYAU" : "LOCK"}</small>`;
  return `<article class="drone-slot-card ${vesperActive ? "vesper-active" : ""} ${!vesperUnlocked ? "vesper-locked" : ""} ${selected ? "selected" : ""} ${multiSelected ? "multi-selected" : ""}" data-drop-part="drone" data-drop-index="${index}" data-drone-slot-number="${index + 1}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""}>
    <div class="drone-slot-head"><span class="badge">Drone ${index+1}</span><span>${vesperActive ? "NOYAU OVERDRIVE" : item ? item.category.toUpperCase() : "VIDE"}</span></div>
    <div class="drone-slot-body" data-drop-part="drone" data-drop-index="${index}">
      <img class="drone-preview" src="assets/drones/drone_test_sprite.webp" alt="Drone ${index+1}">
      <div class="drone-cosmetic-slot ${vesperState}" data-drop-part="drone" data-drop-index="${index}" aria-label="${vesperTitle}" title="${vesperTitle}">
        ${vesperSlotContent}
      </div>
      <div class="drone-module ${item ? `filled ${rarityClass(item)}` : ""}">
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
  const nextPrice = drones.length >= droneDef.maxStandardOwned ? null : getDronePurchasePrice(drones.length);
  const visibleDroneSlots = drones.slice(0, 10);
  const selectedDetail = renderSelectedInventoryDetail();
  section.innerHTML = `
    <div class="drone-layout">
      <aside class="panel frame drone-summary-panel">
        <div class="panel-head compact"><div><span class="tiny">DRONES</span><h2>${droneDef.name}</h2></div><span class="rank">${drones.length}/${droneDef.maxOwned}</span></div>
        <div class="selected-ship-art drone-art-large"><img src="${droneDef.img}" alt="${droneDef.name}"></div>
        <div class="stats-list">
          ${statLine("Drones possédés", drones.length, droneDef.maxOwned)}
          ${statLine("Max drones", droneDef.maxOwned, droneDef.maxOwned)}
          <div class="stat-line special-line"><span>Drones standards</span><b>${droneDef.maxStandardOwned} maximum</b></div>
          <div class="stat-line special-line"><span>Drones spéciaux</span><b>2 places réservées</b></div>
          <div class="stat-line special-line"><span>Emplacements</span><b>1 par drone</b></div>
          <div class="stat-line special-line"><span>Compatibilité</span><b>Laser, bouclier ou Noyau Overdrive</b></div>
          <div class="stat-line special-line"><span>Prix suivant</span><b>${nextPrice ? currencyAmountHtml(droneDef.priceType, getCurrencyPrice(droneDef.priceType, nextPrice)) : "MAX"}</b></div>
        </div>
        <button class="blue-button" data-buy-combat-drone ${(!nextPrice || !canAfford(droneDef.priceType, nextPrice)) ? "disabled" : ""}>${nextPrice ? "ACHETER UN DRONE" : "MAX DRONES STANDARDS"}</button>
        <p class="panel-note">${droneDef.desc}</p>
      </aside>
      <section class="panel frame drone-loadout-panel">
        <div class="panel-head drone-loadout-head"><div><h2>DRONE</h2></div></div>
        <div class="ship-equipment-layout drone-equipment-layout">
          <section class="equipped-compact-panel">
            <div class="compact-section-head"><h3>Drone Bay</h3><span>${drones.length}/${droneDef.maxOwned}</span></div>
            <div class="drone-bay-grid">${visibleDroneSlots.length ? visibleDroneSlots.map((uid,i)=>renderDroneSlot(uid, i)).join("") : `<div class="empty-msg">Aucun drone acheté pour le moment.</div>`}</div>
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

function profileStatTile(label, value, suffix = ""){
  return `<div class="profile-live-stat"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}${suffix}</b></div>`;
}

function profileDetailRow(label, value, detail = ""){
  return `<div class="profile-detail-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
}

function renderProfileShipVisual(ship){
  return `<div class="profile-ship-visual">
    <div class="profile-ship-aura" aria-hidden="true"></div>
    <img src="${escapeHtml(ship.img)}" alt="${escapeHtml(ship.name)}">
    <div class="profile-ship-caption"><span>Vaisseau actuellement utilisé</span><strong>${escapeHtml(ship.name)}</strong><small>${escapeHtml(ship.className || "")}</small></div>
  </div>`;
}

function activeProfileDrones(){
  return getDroneLoadout()
    .map((uid, index)=>({uid, index}))
    .filter(entry=>Boolean(entry.uid));
}

function renderProfileDroneVisual(){
  const drone = getDroneCatalog();
  const activeDrones = activeProfileDrones();
  const formation = getActiveDroneFormation();
  if(!activeDrones.length){
    return `<div class="profile-drone-empty"><img src="${escapeHtml(drone.img)}" alt=""><strong>Aucun drone utilisé</strong><span>Équipe un module sur un drone pour l'activer.</span></div>`;
  }
  return `<div class="profile-drone-visual">
    <div class="profile-drone-summary"><span>Formation active</span><strong>${escapeHtml(formation?.name || "Formation Base")}</strong><b>${fmt(activeDrones.length)} actif${activeDrones.length > 1 ? "s" : ""}</b></div>
    <div class="profile-drone-grid">${activeDrones.map(({uid, index})=>{
      const item = getItemFromInventoryUid(uid);
      const upgraded = Boolean(getDronePermanentUpgrade(index));
      return `<article class="${upgraded ? "upgraded" : ""}">
        <img src="${escapeHtml(drone.img)}" alt="Drone ${index + 1}">
        <div><span>Drone ${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item?.short || item?.name || "Module inconnu")}</strong><small>${upgraded ? "Noyau Overdrive actif · rouge" : escapeHtml(getRarityLabel(item))}</small></div>
      </article>`;
    }).join("")}</div>
  </div>`;
}

function renderAscensionCallout(status){
  const requirements = [
    {label:"Niveau 50", done:status.levelOk},
    {label:"9 portails terminés", done:status.portalOk}
  ];
  return `<section class="profile-ascension-callout">
    <div class="profile-ascension-symbol" aria-hidden="true"><i></i><b>A</b></div>
    <div><span>ASCENSION UNIQUE</span><strong>Ouvre la progression jusqu'au niveau 100</strong><p>Ton niveau revient à 1, tes compétences sont conservées et ton dossier obtient un statut visuel permanent.</p></div>
    <div class="profile-ascension-requirements">${requirements.map(requirement=>`<span class="${requirement.done ? "done" : ""}"><i>${requirement.done ? "OK" : "--"}</i>${requirement.label}</span>`).join("")}</div>
    <button class="blue-button" data-prestige type="button" ${status.ok ? "" : "disabled"}>ACCOMPLIR L'ASCENSION</button>
  </section>`;
}

function renderStellarSystemTitleControl(){
  const unlocked = hasCompletedProgressionPortal(store.state, STELLAR_SYSTEM_TITLE.portalId);
  const equipped = unlocked && store.state.player.activeTitleId === STELLAR_SYSTEM_TITLE.id;
  const visible = store.state.player.titleVisible !== false;
  const status = !unlocked ? "VERROUILLÉ" : equipped ? (visible ? "ÉQUIPÉ · VISIBLE" : "ÉQUIPÉ · MASQUÉ") : "DÉBLOQUÉ";
  return `<section class="profile-title-control ${unlocked ? "unlocked" : "locked"} ${equipped ? "equipped" : ""}">
    <div class="profile-title-ornament" aria-hidden="true"><i></i><b>S</b></div>
    <div class="profile-title-copy">
      <span>TITRE DE CONQUÊTE · ${status}</span>
      <strong>${escapeHtml(STELLAR_SYSTEM_TITLE.name)}</strong>
      <p>${unlocked
        ? "Bonus serveur équipé : +5 % de dégâts pour les lasers, roquettes et missiles."
        : "Termine le portail niveau 50, Le Cœur de l’Éternel, pour obtenir ce titre."}</p>
    </div>
    <div class="profile-title-actions">
      ${unlocked ? `<button class="blue-button small" data-profile-title-toggle="${equipped ? "" : STELLAR_SYSTEM_TITLE.id}" type="button">${equipped ? "Retirer" : "Équiper"}</button>` : ""}
      ${equipped ? `<button class="blue-button small" data-profile-title-visibility type="button">${visible ? "Masquer en jeu" : "Afficher en jeu"}</button>` : ""}
    </div>
  </section>`;
}

export function renderProfile(){
  const section = document.getElementById("profileSection");
  if(!section) return;
  const player = store.state.player;
  const rank = getCurrentRank();
  const nextRank = getNextRank();
  const rankProgress = getRankProgress();
  const activeShip = getShip(store.state.activeShip);
  const stats = getShipCombatStats(store.state.activeShip);
  const ascension = getPrestigeStatus();
  const ascended = Number(store.state.prestigeCount || 0) > 0;
  const displayMode = store.profileDisplay === "drones" ? "drones" : "ship";
  const completedQuests = Object.keys(store.state.completedQuestClaims || {}).length;
  const xp = Math.max(0, Number(player.xp || 0));
  const xpNext = Math.max(1, Number(player.xpNext || 1));
  const xpPercent = Math.max(0, Math.min(100, xp / xpNext * 100));
  section.innerHTML = `
    <div class="panel-head profile-panel-heading">
      <div><span class="tiny">PILOTE</span><h2>Profil</h2></div>
      <span class="badge">${ascended ? "Dossier ascendant" : "Dossier commandant"}</span>
    </div>
    <div class="profile-command-sheet ${ascended ? "ascended" : ""}">
      ${ascended ? `<div class="profile-ascended-seal"><i></i><span>ASCENSION</span><b>ACCOMPLIE</b></div>` : ""}
      <div class="profile-command-grid">
        <section class="profile-visual-card">
          <div class="profile-identity-lockup">
            <div class="profile-rank-emblem">${rankIcon(rank, rank.name)}</div>
            <span class="profile-grade-name">${escapeHtml(rank.name)}</span>
            <h3>${escapeHtml(player.name)}</h3>
            <p>Niveau ${fmt(player.level)} / ${fmt(getPlayerLevelCap())}</p>
            <div class="mini-bar"><span style="width:${rankProgress.progress}%"></span></div>
            <small>${nextRank ? `Prochain grade : ${escapeHtml(nextRank.name)} · ${fmt(rankProgress.remaining)} points` : "Grade maximum atteint"}</small>
          </div>
          <div class="profile-display-switch" role="group" aria-label="Affichage du profil">
            <button class="${displayMode === "ship" ? "active" : ""}" data-profile-display="ship" type="button">Vaisseau</button>
            <button class="${displayMode === "drones" ? "active" : ""}" data-profile-display="drones" type="button">Drones utilisés <b>${fmt(activeProfileDrones().length)}</b></button>
          </div>
          ${displayMode === "drones" ? renderProfileDroneVisual() : renderProfileShipVisual(activeShip)}
        </section>
        <section class="profile-live-stats">
          <header><span>VAISSEAU ACTUEL</span><strong>STATISTIQUES</strong><small>Compétences, équipement et bonus actifs inclus</small></header>
          <div class="profile-live-stat-grid">
            ${profileStatTile("Points de vie", fmt(Math.round(stats.vie || 0)), " PV")}
            ${profileStatTile("Bouclier", fmt(Math.round(stats.bouclier || 0)))}
            ${profileStatTile("Régénération", fmt(Math.round(stats.regen || 0)), " /s")}
            ${profileStatTile("Absorption", `${Math.round(Number(stats.shieldAbsorbRatio || 0) * 100)}%`)}
            ${profileStatTile("Vitesse", fmt(Math.round(stats.vitesseReelle || 0)))}
            ${profileStatTile("Soute", fmt(Math.round(stats.cargo || 0)))}
          </div>
        </section>
        <aside class="profile-dossier">
          <header><span>DÉTAILS PILOTE</span><strong>DOSSIER</strong></header>
          <div class="profile-detail-list">
            ${profileDetailRow("Temps de jeu", formatDuration(player.totalPlaySeconds))}
            ${profileDetailRow("Kills monstres", fmt(player.totalKills || 0))}
            ${profileDetailRow("Quêtes finies", fmt(completedQuests))}
            ${profileDetailRow("Niveau du joueur", `${fmt(player.level)} / ${fmt(getPlayerLevelCap())}`, ascended ? "Progression ascendante" : "Première progression")}
            ${profileDetailRow("Réputation", fmt(player.reputation || 0))}
            ${profileDetailRow("Expérience", `${fmt(xp)} / ${fmt(xpNext)}`, `${fmt(player.totalXp || 0)} XP cumulée`)}
          </div>
          <div class="profile-xp-track"><span style="width:${xpPercent}%"></span></div>
        </aside>
      </div>
      ${renderStellarSystemTitleControl()}
      ${ascended ? "" : renderAscensionCallout(ascension)}
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
  for(const rewardLine of reward.specialRewards || []){
    lines.push({kind:"special", label:rewardLine.label || "Recompense speciale", img:rewardLine.img || "assets/icons/premium.svg"});
  }
  if(reward.shipRandom){
    const shipIds = Array.isArray(reward.shipRandom.shipIds) ? reward.shipRandom.shipIds : [];
    const firstShip = ships.find(ship=>shipIds.includes(ship.id));
    lines.push({kind:"ship", label:reward.shipRandom.label || "Vaisseau aleatoire", img:firstShip?.img || "assets/ships/Vesperion.png"});
  }
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
      <div class="store-offer-foot"><b>${pack.days} jours premium</b>${realMoneyPriceHtml(pack.realPrice)}</div>
    </div>
  </article>`;
}

function renderBetaPackCard(pack){
  const purchased = hasBetaPackPurchase(store.state, pack.id);
  return `<article class="store-offer-card store-beta-card ${purchased ? "purchased" : ""}" data-store-offer-kind="beta" data-store-offer="${escapeHtml(pack.id)}">
    <div class="store-offer-art beta"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
    <div class="store-offer-copy">
      <div class="store-offer-head"><strong>${escapeHtml(pack.name)}</strong><span>${purchased ? "DEJA ACHETE" : escapeHtml(pack.tag || "BETA")}</span></div>
      <p>${escapeHtml(pack.desc || "")}</p>
      ${renderStarterContentStrip(pack)}
      <div class="store-offer-foot"><b>${escapeHtml(pack.officialReward || "Bonus officiel inclus")}</b>${realMoneyPriceHtml(purchased ? "DEJA ACHETE" : pack.price, {className:purchased ? "muted" : ""})}</div>
    </div>
  </article>`;
}

function renderBetaRewards(){
  const status = getBetaRewardStatus(store.state || {});
  const claimed = new Set(status.claimedDays || []);
  return `<section class="store-rewards-panel beta-rewards-panel">
    <div class="store-reward-summary beta-reward-summary">
      <div><span class="tiny">CALENDRIER BETA</span><h3>${fmt(status.claimedCount)} / 25 jours</h3><p>${status.canClaim ? "Une recompense beta est disponible aujourd'hui." : escapeHtml(status.reason || "Reviens demain pour la suite.")}</p></div>
      <button class="gold-button" data-claim-beta-reward type="button" ${status.canClaim ? "" : "disabled"}>${status.canClaim ? `RECLAMER JOUR ${status.nextDay}` : "BLOQUE"}</button>
    </div>
    <div class="store-reward-grid beta-reward-grid">
      ${betaRewardCalendar.map(entry=>{
        const isClaimed = claimed.has(entry.day);
        const isNext = !isClaimed && entry.day === status.nextDay && !status.completed;
        const locked = !isClaimed && entry.day > status.nextDay;
        return `<article class="store-reward-day ${isClaimed ? "claimed" : ""} ${isNext ? "next" : ""} ${locked ? "locked" : ""}">
          <div class="store-reward-day-head"><span>Jour ${entry.day}</span><b>${isClaimed ? "RECU" : isNext ? "A RECLAMER" : "A VENIR"}</b></div>
          <strong>${escapeHtml(entry.label)}</strong>
          <div class="store-reward-pills">${rewardPills(entry.reward)}</div>
        </article>`;
      }).join("")}
    </div>
  </section>`;
}

function renderBetaStore(){
  return `<div class="beta-store-shell">
    <section class="beta-store-message">
      <span class="tiny">ACCES BETA</span>
      <h3>Packs beta a prix reduit</h3>
      <p>${escapeHtml(betaLaunchMessage)}</p>
    </section>
    <div class="store-offer-grid beta-grid">${betaPacks.map(renderBetaPackCard).join("")}</div>
    ${renderBetaRewards()}
  </div>`;
}

function renderCurrencyStoreCard(pack){
  const isNova = pack.tag === "NOVA";
  const currencyType = isNova ? "premium" : "credits";
  return `<article class="store-offer-card ${isNova ? "store-nova-card" : "store-credit-card"}">
    <div class="store-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
    <div class="store-offer-copy">
      <div class="store-offer-head"><strong>${escapeHtml(pack.name)}</strong><span>${currencyIconHtml(currencyType)}</span></div>
      <p>${escapeHtml(pack.desc || "")}</p>
      <div class="store-offer-foot"><b>${pack.amount ? currencyAmountHtml(currencyType, pack.amount) : escapeHtml(pack.price || "A definir")}</b>${realMoneyPriceHtml(pack.price)}</div>
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
      <div class="store-offer-foot"><b>${purchased ? "Achat unique utilise" : "Contenu inclus"}</b>${realMoneyPriceHtml(purchased ? "DEJA ACHETE" : pack.price, {className:purchased ? "muted" : ""})}</div>
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
  if(activeTab === "beta"){
    return renderBetaStore();
  }
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
  if(modal.kind === "beta"){
    const pack = betaPacks.find(entry=>entry.id === modal.id);
    if(!pack) return "";
    const purchased = hasBetaPackPurchase(store.state, pack.id);
    const selectedChoice = pack.choices?.some(choice=>choice.id === modal.shipChoice)
      ? modal.shipChoice
      : (pack.choices?.[0]?.id || "");
    return `<div class="store-modal-backdrop" data-store-modal-backdrop>
      <section class="store-modal beta-modal">
        <button class="store-modal-close" data-store-modal-close type="button">x</button>
        <div class="store-modal-head"><span class="tiny">PACK BETA</span><h3>${escapeHtml(pack.name)}</h3>${realMoneyPriceHtml(purchased ? "DEJA ACHETE" : pack.price, {className:purchased ? "muted" : ""})}</div>
        <div class="store-modal-body">
          <div class="store-modal-art premium"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div>
          <div class="store-modal-copy">
            <p>${escapeHtml(pack.desc || "")}</p>
            <div class="store-modal-features beta-official-reward"><span>${escapeHtml(pack.officialReward || "")}</span></div>
            ${pack.choices ? `<div class="beta-ship-choice-grid">${pack.choices.map(choice=>`
              <button class="beta-ship-choice ${selectedChoice === choice.id ? "active" : ""}" data-beta-ship-choice="${escapeHtml(choice.id)}" type="button">
                <img src="${escapeHtml(choice.img)}" alt="${escapeHtml(choice.label)}">
                <b>${escapeHtml(choice.label)}</b>
              </button>
            `).join("")}</div>` : ""}
            <div class="store-starter-contents">${(pack.contents || []).map(renderStarterContentIcon).join("")}</div>
          </div>
        </div>
        <div class="store-modal-actions"><button class="gold-button" data-buy-beta-pack="${escapeHtml(pack.id)}" data-beta-pack-ship-choice="${escapeHtml(selectedChoice)}" type="button" ${purchased ? "disabled" : ""}>${purchased ? "DEJA ACHETE" : "ACTIVER PACK BETA"}</button></div>
      </section>
    </div>`;
  }
  if(modal.kind === "premium"){
    const pack = premiumShopPacks.find(entry=>entry.id === modal.id);
    if(!pack) return "";
    return `<div class="store-modal-backdrop" data-store-modal-backdrop>
      <section class="store-modal">
        <button class="store-modal-close" data-store-modal-close type="button">x</button>
        <div class="store-modal-head"><span class="tiny">PACK PREMIUM</span><h3>${escapeHtml(pack.name)}</h3>${realMoneyPriceHtml(pack.realPrice)}</div>
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
        <div class="store-modal-head"><span class="tiny">STARTER PACK</span><h3>${escapeHtml(pack.name)}</h3>${realMoneyPriceHtml(purchased ? "DEJA ACHETE" : pack.price, {className:purchased ? "muted" : ""})}</div>
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
  const activeTab = STORE_TAB_IDS.includes(store.storeTab) ? store.storeTab : "beta";
  const tabMeta = storeTabs.find(tab=>tab.id === activeTab) || storeTabs[0];
  panel.innerHTML = `
    <div class="panel-head store-head">
      <div>
        <span class="tiny">BOUTIQUE</span>
        <h2>Packs de soutien</h2>
        <p class="shop-intro">Achats en euros pour soutenir le jeu : beta, premium, NOVA, credits, starters et recompenses premium.</p>
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
  const firmPresentations = FIRM_REPRESENTATIVES;
  const selectedFirmId = store.pendingFirmId ? normalizeFirmId(store.pendingFirmId) : null;
  const selectedFirm = FIRMS.find(firm=>firm.id === selectedFirmId) || null;
  const selectedPresentation = selectedFirm ? firmPresentations[selectedFirm.id] : null;
  const setupPending = Boolean(store.pendingFirmSetup);
  const setupMessage = String(store.pendingFirmSetupMessage || "");
  const defaultName = store.pendingFirmName || "";
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
          ${setupMessage ? `<p class="firm-selection-server-status">${escapeHtml(setupMessage)}</p>` : ""}
          ${selectedFirm ? `<button type="button" class="firm-selection-reset" data-firm-choice-reset>VOIR LES QUATRE FIRMES</button>` : ""}
          <button type="button" class="firm-setup-confirm" data-firm-setup-confirm ${(selectedFirm && !setupPending) ? "" : "disabled"}>${setupPending ? "AFFECTATION EN COURS..." : `REJOINDRE ${selectedFirm ? escapeHtml(selectedFirm.label).toUpperCase() : "UNE FIRME"}`}</button>
        </div>
      </footer>
    </main>`;
}

export { renderShop } from "./renderShop.js?v=20261018-map-transfer1";
export { renderLeaderboard, renderPortals, renderSkills, selectSkillNode } from "./renderProgression.js?v=20261023-skills1";
export { renderRefinery } from "./renderRefinery.js?v=20260726-kharon1";
export { renderFirm } from "./renderFirm.js?v=20261018-map-transfer1";

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
