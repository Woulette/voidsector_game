import { ammoTypes, droneCatalog, equipment, pageText, portals, ships, skills } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import { DEFAULT_SLOT_KEYBINDS, keyCodeToLabel } from "../core/keybinds.js";
import {
  RANK_TABLE,
  RANK_POINT_RULES,
  addAmmo,
  canAfford,
  findEquippedSlot,
  getAmmoCount,
  getCurrentRank,
  getDroneCatalog,
  getDroneLoadout,
  getDronePurchasePrice,
  getInventoryByCategory,
  getInventoryCount,
  getInventoryItem,
  getSkillLevel,
  getSkillUpgradeData,
  getLeaderboardRows,
  getItem,
  getItemFromInventoryUid,
  getLoadout,
  getNextRank,
  getPortalPieces,
  getRankAssetPath,
  getRankBreakdown,
  getRankProgress,
  getShip,
  getShipCombatStats,
  isPortalUnlocked,
  priceLabel,
  saveState,
  store
} from "../core/store.js";

import { locationLabel, rankIcon, statLabelForItem, statLine } from "./renderShared.js";
import { renderShop } from "./renderShop.js";
import { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js";
export function renderTop(){
  const { state } = store;
  const rank = getCurrentRank();
  const rankProgress = getRankProgress();
  const nextRank = getNextRank();
  document.getElementById("pilotName").textContent = state.player.name;
  document.getElementById("levelText").textContent = `NIV. ${state.player.level}`;
  document.getElementById("xpText").textContent = `${fmt(state.player.xp)} / ${fmt(state.player.xpNext)}`;
  document.getElementById("xpFill").style.width = `${Math.min(100, state.player.xp / state.player.xpNext * 100)}%`;
  document.getElementById("creditsValue").textContent = fmt(state.player.credits);
  document.getElementById("premiumValue").textContent = fmt(state.player.premium);
  const skillPoints = document.getElementById("skillPointsValue");
  if(skillPoints) skillPoints.textContent = state.player.skillPoints;
  const pilotRank = document.getElementById("pilotRank");
  if(pilotRank) pilotRank.textContent = rank.name;
  const pilotStats = document.getElementById("pilotStats");
  if(pilotStats) pilotStats.textContent = `${fmt(state.player.totalKills || 0)} kills · score ${fmt(rankProgress.score)}`;
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
  document.getElementById("selectedShipStats").innerHTML = [
    statLine("Vie", ship.stats.vie, 5000),
    statLine("Vitesse réelle", stats.vitesseReelle, 520),
    statLine("Cargo", ship.stats.cargo, 100),
    statLine("Slots lasers", ship.stats.maxLasers, 8),
    statLine("Slots générateurs", ship.stats.maxGenerators, 10),
    statLine("Slots extras", ship.stats.maxExtras || 3, 5),
    `<div class="stat-line special-line"><span>Sort spécial</span><b>Aucun</b></div>`,
    `<div class="stat-line special-line"><span>Avec équipement</span><b>${fmt(stats.vie)} PV · ${fmt(stats.bouclier)} bouclier · Vitesse ${fmt(stats.vitesseReelle)}</b></div>`
  ].join("");
  const btn = document.getElementById("selectedShipAction");
  btn.textContent = active ? "DÉSÉQUIPER CE VAISSEAU" : "ÉQUIPER CE VAISSEAU";
  btn.classList.toggle("danger", active);
  btn.disabled = false;
}

function renderInventoryCell(entry, shipId = null){
  const equipped = entry.equipped;
  const isHere = shipId ? equipped?.location === "ship" && equipped?.shipId === shipId : equipped?.location === "drone";
  const isElsewhere = equipped && !isHere;
  const selected = store.selectedInventoryUid === entry.uid;
  const badge = equipmentInventoryBadge(entry.item);
  return `<button class="inventory-cell ${selected ? "selected" : ""} ${isHere ? "equipped-here" : ""} ${isElsewhere ? "equipped-elsewhere" : ""}"
      draggable="${isElsewhere ? "false" : "true"}"
      data-inventory-uid="${entry.uid}"
      data-inventory-category="${entry.item.category}"
      title="${entry.item.name}${equipped ? ` · ${locationLabel(equipped)}` : " · disponible"}">
    <img src="${entry.item.img}" alt="${entry.item.name}">
    <span class="inventory-kind-label">${badge}</span>
  </button>`;
}

function equipmentInventoryBadge(item){
  if(item.category === "canon"){
    const mk = String(item.id || "").match(/mk(\d+)/i)?.[1];
    const roman = {1:"I", 2:"II", 3:"III", 4:"IV"}[mk];
    return roman ? `MK-${roman}` : "MK";
  }
  if(item.category === "generateur") return "G";
  return "E";
}

function renderSelectedInventoryDetail(){
  const selectedEntry = getInventoryItem(store.selectedInventoryUid);
  const selectedItem = selectedEntry ? getItem(selectedEntry.itemId) : null;
  const selectedEquipped = selectedEntry ? findEquippedSlot(selectedEntry.uid) : null;
  if(!selectedItem){
    store.selectedInventoryUid = null;
    return `<div class="selected-item-copy"><span class="tiny">Aucun objet sélectionné</span><h3>Sélectionne un équipement</h3><p>Clique sur un laser ou un générateur dans l'inventaire pour afficher ses détails. Double-clique pour l'équiper dans le premier slot libre du panneau actif.</p></div>`;
  }
  return `
    <div class="selected-item-art"><img src="${selectedItem.img}" alt="${selectedItem.name}"></div>
    <div class="selected-item-copy">
      <span class="tiny">${selectedItem.category}</span>
      <h3>${selectedItem.name}</h3>
      <p>${statLabelForItem(selectedItem)}</p>
      <small>${locationLabel(selectedEquipped)}</small>
      <div class="selected-item-actions">
        ${selectedEquipped
          ? `<button class="blue-button secondary small" data-inventory-unequip="${selectedEntry.uid}">Retirer</button>`
          : `<button class="blue-button small" data-inventory-equip="${selectedEntry.uid}">Équiper</button>`}
      </div>
    </div>`;
}

export function renderLoadout(){
  const { state } = store;
  const ship = getShip(state.selectedShip);
  const loadout = getLoadout(ship.id);
  const stats = getShipCombatStats(ship.id);
  const renderSlot = (type, index, uid) => {
    const item = getItemFromInventoryUid(uid);
    const label = type === "laser" ? "L" : type === "generator" ? "G" : "E";
    return `<button class="equip-slot-tile ${item ? "filled" : ""}" data-drop-part="${type}" data-drop-index="${index}" title="${item ? item.name : "Slot vide"}">
      <span>${label}${index+1}</span>
      ${item ? `<img src="${item.img}" alt="${item.name}"><b>${item.short || item.name}</b><em data-unequip-part="${type}" data-unequip-index="${index}">×</em>` : `<i>+</i>`}
    </button>`;
  };
  const inventoryEntries = [...getInventoryByCategory("canon"), ...getInventoryByCategory("generateur"), ...getInventoryByCategory("extra")];
  const emptyCells = Array.from({length:Math.max(0, 48 - inventoryEntries.length)}, (_,i)=>`<div class="inventory-cell empty" aria-hidden="true"><span>${i+1}</span></div>`).join("");
  const panel = document.getElementById("loadoutPanel");
  if(!panel) return;
  panel.innerHTML = `
    <div class="loadout-summary compact">
      <div><span class="tiny">VAISSEAU CONFIGURÉ</span><h3>${ship.name}</h3></div>
      <div class="summary-stats">
        <span>PV <b>${fmt(stats.vie)}</b></span>
        <span>Bouclier <b>${fmt(stats.bouclier)}</b></span>
        <span>Vitesse <b>${fmt(stats.vitesseReelle)}</b></span>
      </div>
    </div>
    <div class="ship-equipment-layout">
      <section class="equipped-compact-panel">
        <div class="compact-section-head"><h3>Lasers</h3><span>${loadout.lasers.filter(Boolean).length}/${ship.stats.maxLasers}</span></div>
        <div class="compact-slot-grid laser-slots">${loadout.lasers.map((id,i)=>renderSlot("laser", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Générateurs</h3><span>${loadout.generators.filter(Boolean).length}/${ship.stats.maxGenerators}</span></div>
        <div class="compact-slot-grid generator-slots">${loadout.generators.map((id,i)=>renderSlot("generator", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Extras</h3><span>${loadout.extras.filter(Boolean).length}/${ship.stats.maxExtras || 3}</span></div>
        <div class="compact-slot-grid extra-slots">${loadout.extras.map((id,i)=>renderSlot("extra", i, id)).join("")}</div>
      </section>
      <section class="rpg-inventory-panel">
        <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryEntries.length} objets</span></div>
        <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, ship.id)).join("")}${emptyCells}</div>
      </section>
      <section class="selected-item-panel">${renderSelectedInventoryDetail()}</section>
    </div>`;
}

function renderDroneSlot(uid, index){
  const item = getItemFromInventoryUid(uid);
  return `<article class="drone-slot-card">
    <div class="drone-slot-head"><span class="badge">Drone ${index+1}</span><span>${item ? item.category.toUpperCase() : "VIDE"}</span></div>
    <div class="drone-slot-body" data-drop-part="drone" data-drop-index="${index}">
      <img class="drone-preview" src="assets/equipment/drone_orbital.svg" alt="Drone ${index+1}">
      <div class="drone-module ${item ? "filled" : ""}">
        ${item ? `<img src="${item.img}" alt="${item.name}"><b>${item.short || item.name}</b><em data-unequip-part="drone" data-unequip-index="${index}">×</em>` : `<i>+</i><span>Ajouter un laser ou un générateur</span>`}
      </div>
    </div>
  </article>`;
}

export function renderDroneSection(){
  const section = document.getElementById("droneSection");
  if(!section) return;
  const droneDef = getDroneCatalog();
  const drones = getDroneLoadout();
  const inventoryEntries = [...getInventoryByCategory("canon"), ...getInventoryByCategory("generateur")];
  const emptyCells = Array.from({length:Math.max(0, 40 - inventoryEntries.length)}, (_,i)=>`<div class="inventory-cell empty" aria-hidden="true"><span>${i+1}</span></div>`).join("");
  const nextPrice = drones.length >= droneDef.maxOwned ? null : getDronePurchasePrice(drones.length);
  section.innerHTML = `
    <div class="drone-layout">
      <aside class="panel frame drone-summary-panel">
        <div class="panel-head compact"><div><span class="tiny">DRONES</span><h2>${droneDef.name}</h2></div><span class="rank">${drones.length}/${droneDef.maxOwned}</span></div>
        <div class="selected-ship-art drone-art-large"><img src="${droneDef.img}" alt="${droneDef.name}"></div>
        <div class="stats-list">
          ${statLine("Drones possédés", drones.length, droneDef.maxOwned)}
          ${statLine("Max drones", droneDef.maxOwned, droneDef.maxOwned)}
          <div class="stat-line special-line"><span>Emplacements</span><b>1 par drone</b></div>
          <div class="stat-line special-line"><span>Compatibilité</span><b>Laser ou générateur</b></div>
          <div class="stat-line special-line"><span>Prix suivant</span><b>${nextPrice ? priceLabel(droneDef.priceType, nextPrice) : "MAX"}</b></div>
        </div>
        <button class="blue-button" data-buy-combat-drone ${(!nextPrice || !canAfford(droneDef.priceType, nextPrice)) ? "disabled" : ""}>${nextPrice ? "ACHETER UN DRONE" : "MAX DRONES"}</button>
        <p class="panel-note">${droneDef.desc}</p>
      </aside>
      <section class="panel frame drone-loadout-panel">
        <div class="panel-head"><div><span class="tiny">HANGAR DRONE</span><h2>Slots & inventaire</h2></div><span class="badge">Même logique que le vaisseau</span></div>
        <div class="ship-equipment-layout drone-equipment-layout">
          <section class="equipped-compact-panel">
            <div class="compact-section-head"><h3>Drone Bay</h3><span>${drones.length}/${droneDef.maxOwned}</span></div>
            <div class="drone-bay-grid">${drones.length ? drones.map((uid,i)=>renderDroneSlot(uid, i)).join("") : `<div class="empty-msg">Aucun drone acheté pour le moment.</div>`}</div>
          </section>
          <section class="rpg-inventory-panel">
            <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryEntries.length} objets</span></div>
            <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, null)).join("")}${emptyCells}</div>
          </section>
          <section class="selected-item-panel">${renderSelectedInventoryDetail()}</section>
        </div>
      </section>
    </div>`;
}

export function renderSettingsSection(){
  const settings = document.getElementById("settingsPanel");
  if(!settings) return;
  const keys = store.state.slotKeybinds || DEFAULT_SLOT_KEYBINDS;
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
    <div class="settings-note">Les lasers restent en tir automatique. Les roquettes restent manuelles sauf si tu équipes un extra d'auto-lancement.</div>
    <div class="danger-zone">
      <div>
        <span class="tiny">SAUVEGARDE</span>
        <h3>Remettre la progression a zero</h3>
        <p>Supprime credits, achats, inventaire, niveaux, quetes, portails et configuration du compte local.</p>
      </div>
      <button class="blue-button danger" data-reset-save type="button">RESET JEU</button>
    </div>`;
}

export function renderExtraSection(){
  const extra = document.getElementById("extraSection");
  if(extra) extra.innerHTML = "";
}

export { renderShop } from "./renderShop.js";
export { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js";

export function renderAll(){
  if(store.currentView !== "hangar") store.hangarDetailOpen = false;
  renderTop();
  renderHangarTabs();
  renderHangarMode();
  renderShips();
  renderSelectedShip();
  renderLoadout();
  renderDroneSection();
  renderExtraSection();
  renderSettingsSection();
  renderLeaderboard();
  renderShop();
  renderPortals();
  renderSkills();
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
  if(extraSection) extraSection.classList.add("hidden");
}

export function setView(view){
  if(!pageText[view]) view = "hangar";
  store.currentView = view;
  if(view !== "hangar") store.hangarDetailOpen = false;
  renderHangarMode();
  document.querySelectorAll(".nav-tab").forEach(b=>b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".page-view").forEach(p=>p.classList.toggle("active", p.dataset.page === view));
  document.getElementById("pageTitle").textContent = pageText[view].title;
  document.getElementById("pageSubtitle").textContent = pageText[view].subtitle;
  window.scrollTo({top:0, behavior:"smooth"});
}
