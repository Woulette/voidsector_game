import { ammoTypes, droneCatalog, equipment, pageText, portals, ships, skills } from "../data/catalog.js";
import { FIRMS, normalizeFirmId } from "../data/firms.js";
import { fmt } from "../core/utils.js";
import { DEFAULT_SLOT_KEYBINDS, keyCodeToLabel } from "../core/keybinds.js";
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
  priceLabel,
  saveState,
  setGraphicsQuality,
  store
} from "../core/store.js";
import { ENEMY_TYPES } from "../game/combatData.js";

import { locationLabel, rankIcon, statLabelForItem, statLine } from "./renderShared.js";
import { renderShop } from "./renderShop.js";
import { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js";
import { renderRefinery } from "./renderRefinery.js";
import { multiplayer } from "../multiplayer/client.js";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function maxShipStat(key, fallback = 1){
  return Math.max(fallback, ...ships.map(ship=>Number(ship.stats?.[key] || 0)));
}

export function renderTop(){
  const { state } = store;
  const rank = getCurrentRank();
  const rankProgress = getRankProgress();
  const nextRank = getNextRank();
  document.getElementById("pilotName").textContent = state.player.name;
  document.getElementById("levelText").textContent = `NIV. ${state.player.level}`;
  document.getElementById("xpText").textContent = `XP ${fmt(state.player.xp)} / ${fmt(state.player.xpNext)}`;
  document.getElementById("xpFill").style.width = `${Math.min(100, state.player.xp / state.player.xpNext * 100)}%`;
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
    statLine("Vie", ship.stats.vie, maxShipStat("vie")),
    statLine("Vitesse réelle", stats.vitesseReelle, Math.max(maxShipStat("vitesse"), stats.vitesseReelle)),
    statLine("Cargo", ship.stats.cargo, maxShipStat("cargo")),
    statLine("Slots lasers", ship.stats.maxLasers, maxShipStat("maxLasers")),
    statLine("Slots générateurs", ship.stats.maxGenerators, maxShipStat("maxGenerators")),
    statLine("Slots extras", ship.stats.maxExtras || 3, maxShipStat("maxExtras")),
    `<div class="stat-line special-line"><span>Sort spécial</span><b>Aucun</b></div>`,
    `<div class="stat-line special-line"><span>Avec équipement</span><b>${fmt(stats.vie)} PV · ${fmt(stats.bouclier)} bouclier · Vitesse ${fmt(stats.vitesseReelle)}</b></div>`
  ].join("");
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
  const selected = store.selectedInventoryUid === entry.uid;
  const badge = equipmentInventoryBadge(entry.item);
  return `<button class="inventory-cell ${selected ? "selected" : ""} ${isHere ? "equipped-here" : ""} ${isElsewhere ? "equipped-elsewhere" : ""}"
      draggable="true"
      data-inventory-uid="${entry.uid}"
      data-inventory-category="${entry.item.category}"
      title="${entry.item.name}${equipped ? ` · ${locationLabel(equipped)}` : " · disponible"}">
      <img src="${entry.item.img}" alt="${entry.item.name}">
      <span class="inventory-kind-label">${badge}</span>
      ${Number(entry.quantity || 1) > 1 ? `<b class="inventory-quantity">x${Number(entry.quantity)}</b>` : ""}
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

function equipmentSlotBadge(item){
  if(item?.category === "canon") return equipmentInventoryBadge(item);
  if(item?.slotType === "missileLauncher") return "LM";
  if(item?.slotType === "rocketLauncher") return "LR";
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
  const selectedEntry = getInventoryItem(store.selectedInventoryUid);
  const selectedItem = selectedEntry ? getItem(selectedEntry.itemId) : null;
  const selectedEquipped = selectedEntry ? findEquippedSlot(selectedEntry.uid) : null;
  if(!selectedItem){
    store.selectedInventoryUid = null;
    return `<div class="selected-item-copy"><span class="tiny">Aucun objet sélectionné</span><h3>Sélectionne un équipement</h3><p>Clique sur un laser ou un générateur dans l'inventaire pour afficher ses détails. Double-clique pour l'équiper dans le premier slot libre du panneau actif.</p></div>`;
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
  return `
    <div class="selected-item-art"><img src="${selectedItem.img}" alt="${selectedItem.name}"></div>
    <div class="selected-item-copy">
      <span class="tiny">${selectedItem.category}</span>
      <h3>${selectedItem.name}</h3>
      ${selectedItemStatsHtml(selectedItem)}
      <small>${locationLabel(selectedEquipped)}</small>
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
    return `<button class="equip-slot-tile ${type}-slot ${item ? "filled" : ""}" data-drop-part="${type}" data-drop-index="${index}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""} title="${item ? item.name : "Slot vide"}">
      ${item ? `<img src="${item.img}" alt="${item.name}"><b>${equipmentSlotBadge(item)}</b>` : `<span>${label}${index+1}</span><i>+</i>`}
    </button>`;
  };
  const inventoryEntries = [
    ...getInventoryByCategory("canon"),
    ...getInventoryByCategory("generateur"),
    ...getInventoryByCategory("module"),
    ...getInventoryByCategory("extra"),
    ...getInventoryByCategory("quest_item")
  ].filter(entry=>!entry.equipped);
  const emptyCells = Array.from({length:Math.max(0, 48 - inventoryEntries.length)}, (_,i)=>`<div class="inventory-cell empty" aria-hidden="true"><span>${i+1}</span></div>`).join("");
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
        <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryEntries.length} objets</span></div>
        <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, ship.id)).join("")}${emptyCells}</div>
      </section>
      <section class="selected-item-panel">${renderSelectedInventoryDetail()}</section>
    </div>`;
}

function renderDroneSlot(uid, index){
  const item = getItemFromInventoryUid(uid);
  const upgraded = Boolean(getDronePermanentUpgrade(index));
  return `<article class="drone-slot-card ${upgraded ? "upgraded" : ""}" data-drop-part="drone" data-drop-index="${index}" ${item ? `data-slot-uid="${uid}" draggable="true"` : ""}>
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
  const inventoryEntries = [...getInventoryByCategory("canon"), ...getInventoryByCategory("generateur"), ...getInventoryByCategory("drone_upgrade")]
    .filter(entry=>!entry.equipped)
    .filter(entry=>isDroneCompatibleEquipment(entry.item) || isDronePermanentUpgradeItem(entry.item));
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
          <div class="stat-line special-line"><span>Compatibilité</span><b>Laser, bouclier ou overdrive</b></div>
          <div class="stat-line special-line"><span>Prix suivant</span><b>${nextPrice ? priceLabel(droneDef.priceType, nextPrice) : "MAX"}</b></div>
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
            <div class="compact-section-head"><h3>Inventaire</h3><span>${inventoryEntries.length} objets</span></div>
            <div class="rpg-inventory-grid">${inventoryEntries.map(entry=>renderInventoryCell(entry, null)).join("")}${emptyCells}</div>
          </section>
          <section class="selected-item-panel">${renderSelectedInventoryDetail()}</section>
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

function renderMmoAccountCard(){
  const account = multiplayer.auth?.account;
  const pending = Boolean(multiplayer.auth?.pending);
  const error = multiplayer.auth?.error ? `<p class="account-error">${escapeHtml(multiplayer.auth.error)}</p>` : "";
  if(account){
    return `<section class="profile-card profile-wide mmo-account-card">
      <div class="profile-card-head"><span class="tiny">MMO</span><h3>Compte connecte</h3></div>
      <div class="profile-stat-grid">
        <div><span>Pseudo</span><b>${escapeHtml(account.username)}</b></div>
        <div><span>Email</span><b>${escapeHtml(account.email)}</b></div>
      </div>
      <p>La progression serveur sera maintenant liee a ce compte.</p>
      <button class="blue-button secondary small" data-auth-action="logout" type="button">DECONNEXION</button>
    </section>`;
  }
  const serverControls = multiplayer.connected
    ? `<span class="badge">Serveur connecte</span>`
    : `<div class="account-form-row" data-mp-form>
        <input data-mp-player-name type="text" maxlength="24" value="${escapeHtml(multiplayer.name || store.state?.player?.name || "NOVA-37")}" placeholder="Pseudo multi">
        <input data-mp-server-url type="text" value="${escapeHtml(multiplayer.serverUrl)}" placeholder="URL serveur">
        <button class="blue-button small" data-mp-action="connect" type="button">${multiplayer.connecting ? "CONNEXION" : "CONNECTER SERVEUR"}</button>
      </div>`;
  return `<section class="profile-card profile-wide mmo-account-card">
    <div class="profile-card-head"><span class="tiny">MMO</span><h3>Compte serveur</h3>${serverControls}</div>
    ${error}
    <div class="account-form-grid">
      <div class="account-form-box">
        <strong>Connexion</strong>
        <input id="authLogin" type="text" autocomplete="username" placeholder="Email ou pseudo">
        <input id="authPassword" type="password" autocomplete="current-password" placeholder="Mot de passe">
        <button class="blue-button small" data-auth-action="login" type="button" ${pending ? "disabled" : ""}>${pending ? "..." : "CONNECTER"}</button>
      </div>
      <div class="account-form-box">
        <strong>Inscription</strong>
        <input id="authRegisterEmail" type="email" autocomplete="email" placeholder="Email">
        <input id="authRegisterUsername" type="text" maxlength="24" autocomplete="username" placeholder="Pseudo public">
        <input id="authRegisterPassword" type="password" autocomplete="new-password" placeholder="Mot de passe">
        <button class="blue-button small" data-auth-action="register" type="button" ${pending ? "disabled" : ""}>${pending ? "..." : "CREER COMPTE"}</button>
      </div>
    </div>
    <p>${multiplayer.connected ? "Cree un compte ou connecte-toi pour lier la sauvegarde MMO au serveur." : "Tu peux creer un compte directement : le jeu connectera le serveur avant l'inscription."}</p>
  </section>`;
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
      <div><span class="tiny">COMMANDANT</span><h3>${player.name}</h3><p>${activeTitle ? `${activeTitle.name} · ` : ""}${rank.name} · Niveau ${fmt(player.level)}</p></div>
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
    ${renderMmoAccountCard()}
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
    gate.className = "firm-setup-gate";
    document.body.appendChild(gate);
  }
  const selectedFirm = normalizeFirmId(store.pendingFirmId || store.state.player.firmId || "astra");
  const defaultName = store.state.player.name && store.state.player.name !== "NOVA-37"
    ? store.state.player.name
    : (account.username || "");
  gate.innerHTML = `
    <div class="firm-setup-panel frame">
      <span class="tiny">PREMIERE CONNEXION MMO</span>
      <h2>Choisis ton identite pilote</h2>
      <p>Cette firme fixe ta base, tes maps de depart et tes quetes. Elle ne pourra plus etre changee ensuite.</p>
      <label class="firm-setup-name">
        <span>Nom du joueur</span>
        <input id="firmSetupName" maxlength="24" value="${escapeHtml(defaultName)}" placeholder="Ton pseudo en jeu">
      </label>
      <div class="firm-choice-grid">
        ${FIRMS.map(firm=>`
          <button type="button" class="firm-choice ${selectedFirm === firm.id ? "active" : ""}" data-firm-choice="${firm.id}" style="--firm-color:${firm.color}">
            <strong>${escapeHtml(firm.label)}</strong>
            <span>Base ${escapeHtml(firm.homeMapName)}</span>
          </button>
        `).join("")}
      </div>
      <button type="button" class="blue-button firm-setup-confirm" data-firm-setup-confirm>VALIDER ET ENTRER EN MMO</button>
    </div>`;
}

export { renderShop } from "./renderShop.js";
export { renderLeaderboard, renderPortals, renderSkills } from "./renderProgression.js";
export { renderRefinery } from "./renderRefinery.js";

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
  renderSettingsSection();
  renderLeaderboard();
  renderShop();
  renderPortals();
  renderSkills();
  renderRefinery();
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
