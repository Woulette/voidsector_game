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
  getPowerScore,
  getRankAssetPath,
  getRankBreakdown,
  getRankProgress,
  getRequiredLevel,
  getShip,
  getShipCombatStats,
  isPortalUnlocked,
  isUnlockedForPlayer,
  priceLabel,
  saveState,
  store
} from "../core/store.js";

export function statLine(label, value, max=700){
  return `<div class="stat-line"><span>${label}</span><div class="stat-track"><span style="width:${Math.min(100, Number(value)/max*100)}%"></span></div><b>${value}</b></div>`;
}

export function statLabelForItem(item){
  const parts = [];
  for(const [k,v] of Object.entries(item.stats || {})) parts.push(`${k.toUpperCase()} ${typeof v === "number" ? "+"+v : v}`);
  if(item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    parts.unshift(`DÉGÂTS ${min}-${max}`);
    parts.push(`PORTÉE ${item.weapon.range}`);
    parts.push(`AUTO ${item.weapon.cooldown.toFixed(2)}s`);
  }
  if(item.unlockLevel) parts.push(`NIV. ${item.unlockLevel}`);
  if(item.category === "generateur") parts.push("ÉQUIPABLE HANGAR / DRONE");
  if(item.category === "extra") parts.push("ÉQUIPABLE EN SLOT EXTRA");
  return parts.join(" · ");
}

function locationLabel(equipped){
  if(!equipped) return "Disponible dans l'inventaire";
  if(equipped.location === "drone") return `Équipé sur Drone ${equipped.index+1}`;
  return `Équipé sur ${getShip(equipped.shipId).name}`;
}

function rankIcon(rankLike, label = "Grade"){
  const asset = getRankAssetPath(rankLike);
  const rankName = typeof rankLike === "string" ? rankLike : rankLike?.name || label;
  return `<img class="rank-icon" src="${asset}" alt="${rankName}" title="${rankName}">`;
}

function rankInline(rankLike){
  const rankName = typeof rankLike === "string" ? rankLike : rankLike?.name || "Aucun grade";
  return `<span class="rank-inline">${rankIcon(rankLike, rankName)}<span>${rankName}</span></span>`;
}

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
        <div><span class="rank">${ship.tier}</span><h3>${ship.name}</h3></div>
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
  document.getElementById("selectedShipTier").textContent = ship.tier;
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
    statLine("Slots lasers", ship.stats.maxLasers, 4),
    statLine("Slots générateurs", ship.stats.maxGenerators, 3),
    statLine("Slots extras", 3, 3),
    `<div class="stat-line special-line"><span>Déblocage</span><b>NIV. ${getRequiredLevel(ship)}</b></div>`,
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
  return `<button class="inventory-cell ${selected ? "selected" : ""} ${isHere ? "equipped-here" : ""} ${isElsewhere ? "equipped-elsewhere" : ""}"
      draggable="${isElsewhere ? "false" : "true"}"
      data-inventory-uid="${entry.uid}"
      data-inventory-category="${entry.item.category}"
      title="${entry.item.name}${equipped ? ` · ${locationLabel(equipped)}` : " · disponible"}">
    <img src="${entry.item.img}" alt="${entry.item.name}">
    <span>${entry.item.category === "canon" ? "L" : entry.item.category === "generateur" ? "G" : "E"}</span>
  </button>`;
}

function renderSelectedInventoryDetail(){
  const selectedEntry = getInventoryItem(store.selectedInventoryUid);
  const selectedItem = getItem(selectedEntry?.itemId);
  const selectedEquipped = selectedEntry ? findEquippedSlot(selectedEntry.uid) : null;
  if(!selectedItem){
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
        <span>Puissance <b>${fmt(getPowerScore(ship.id))}</b></span>
      </div>
    </div>
    <div class="ship-equipment-layout">
      <section class="equipped-compact-panel">
        <div class="compact-section-head"><h3>Lasers</h3><span>${loadout.lasers.filter(Boolean).length}/${ship.stats.maxLasers}</span></div>
        <div class="compact-slot-grid laser-slots">${loadout.lasers.map((id,i)=>renderSlot("laser", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Générateurs</h3><span>${loadout.generators.filter(Boolean).length}/${ship.stats.maxGenerators}</span></div>
        <div class="compact-slot-grid generator-slots">${loadout.generators.map((id,i)=>renderSlot("generator", i, id)).join("")}</div>
        <div class="compact-section-head"><h3>Extras</h3><span>${loadout.extras.filter(Boolean).length}/3</span></div>
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
          <div class="stat-line special-line"><span>Déblocage</span><b>NIV. ${getRequiredLevel(droneDef)}</b></div>
        </div>
        <button class="blue-button" data-buy-combat-drone ${(!isUnlockedForPlayer(droneDef) || !nextPrice || !canAfford(droneDef.priceType, nextPrice)) ? "disabled" : ""}>${nextPrice ? "ACHETER UN DRONE" : "MAX DRONES"}</button>
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
    <p class="settings-help">Clique sur “Modifier”, puis appuie sur la touche voulue. Exemple : R, A, V, Espace, etc.</p>
    <div class="keybind-grid">
      ${Array.from({length:9}, (_,i)=>`
        <div class="keybind-row">
          <span>Slot ${i+1}</span>
          <b>${keyCodeToLabel(keys[i])}</b>
          <button class="blue-button small" data-change-slot-key="${i}">Modifier</button>
        </div>
      `).join("")}
    </div>
    <div class="settings-note">Les lasers restent en tir automatique. Les roquettes restent manuelles sauf si tu équipes un extra d'auto-lancement.</div>`;
}

export function renderExtraSection(){
  const extra = document.getElementById("extraSection");
  if(extra) extra.innerHTML = "";
}

function shopCatalog(){
  return [
    ...ships.map(ship=>({kind:"ship", category:"vaisseau", id:ship.id, data:ship})),
    ...equipment.map(item=>({kind:"item", category:item.category, id:item.id, data:item})),
    ...ammoTypes.map(ammo=>({kind:"ammo", category:"munition", id:ammo.id, data:ammo})),
    ...droneCatalog.map(drone=>({kind:"drone", category:"drone", id:drone.id, data:drone}))
  ];
}

function productIsOwned(product){
  if(product.kind === "ship") return store.state.ownedShips.includes(product.id);
  if(product.kind === "ammo") return getAmmoCount(product.id) > 0;
  if(product.kind === "drone") return (store.state.ownedDroneCount || 0) > 0;
  return getInventoryCount(product.id) > 0;
}

function productMatchesFilter(product){
  if(store.shopFilter === "owned") return productIsOwned(product);
  if(store.shopFilter === "premium") return product.data.priceType === "premium";
  return product.category === store.shopFilter;
}

function productUnlockLevel(product){ return getRequiredLevel(product.data); }
function productUnlocked(product){ return isUnlockedForPlayer(product.data); }
function productLockLabel(product){ return `NIV. ${productUnlockLevel(product)} requis`; }

const SHOP_FILTER_META = {
  vaisseau:{title:"Vaisseaux", subtitle:"Flotte disponible à l'achat : châssis progressifs avec déblocage par niveau.", empty:"Aucun vaisseau à afficher."},
  canon:{title:"Armes", subtitle:"Trois générations de lasers, avec progression par niveau.", empty:"Aucune arme disponible."},
  munition:{title:"Munitions / Roquettes", subtitle:"Munitions laser et roquettes à placer en slot 1-9 en combat.", empty:"Aucune munition disponible."},
  generateur:{title:"Générateurs", subtitle:"Boucliers, régénération et vitesse pour ton vaisseau ou tes drones.", empty:"Aucun générateur disponible."},
  drone:{title:"Drones", subtitle:"Drones orbitaux : achat progressif, un slot par drone, max 8.", empty:"Aucun drone dans cette catégorie."},
  extra:{title:"Extras", subtitle:"Modules extra à placer dans les 3 slots extras du vaisseau.", empty:"Aucun extra disponible."},
  module:{title:"Modules", subtitle:"Modules spéciaux et améliorations de munitions.", empty:"Aucun module disponible."},
  premium:{title:"Premium", subtitle:"Articles premium disponibles pour le compte pilote.", empty:"Aucun article premium."},
  owned:{title:"Possédé", subtitle:"Retrouve rapidement tout ce que tu as déjà acheté.", empty:"Tu ne possèdes encore rien dans ce filtre."}
};

function productKey(product){ return `${product.kind}:${product.id}`; }
function shipStateLabel(ship){ return store.state.activeShip === ship.id ? "ACTIF" : store.state.ownedShips.includes(ship.id) ? "POSSÉDÉ" : "DISPONIBLE"; }

function productDetailStats(product){
  if(product.kind === "ship"){
    const ship = product.data;
    return [
      `Niveau requis ${getRequiredLevel(ship)}`,
      `Vie ${ship.stats.vie}`,
      `Vitesse réelle ${getShipCombatStats(ship.id).vitesseReelle}`,
      `Cargo ${ship.stats.cargo}`,
      `Lasers ${ship.stats.maxLasers}`,
      `Générateurs ${ship.stats.maxGenerators}`,
      `Spécial Aucun`
    ];
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    if(ammo.weaponClass === "rocket"){
      return [
        `Niveau requis ${getRequiredLevel(ammo)}`,
        `Pack ${fmt(ammo.amount)} unités`,
        `Dégâts ${ammo.damageMin}-${ammo.damageMax}`,
        `Portée ${ammo.range}`,
        `Cadence ${ammo.cooldown.toFixed(2)}s`,
        `Stock ${fmt(getAmmoCount(ammo.id))}`
      ];
    }
    return [
      `Niveau requis ${getRequiredLevel(ammo)}`,
      `Pack ${fmt(ammo.amount)} unités`,
      `Multiplicateur x${ammo.multiplier}`,
      `Cadence ${ammo.cooldown.toFixed(2)}s`,
      `Stock ${fmt(getAmmoCount(ammo.id))}`
    ];
  }
  if(product.kind === "drone"){
    const drone = product.data;
    const count = store.state.ownedDroneCount || 0;
    const next = count < drone.maxOwned ? getDronePurchasePrice(count) : 0;
    return [
      `Niveau requis ${getRequiredLevel(drone)}`,
      `Drones possédés ${count}/${drone.maxOwned}`,
      `Emplacements 1 par drone`,
      `Compatibilité laser / générateur`,
      `Prix suivant ${next ? priceLabel(drone.priceType, next) : "MAX"}`
    ];
  }
  const item = product.data;
  const parts = statLabelForItem(item).split(" · ");
  parts.unshift(`Niveau requis ${getRequiredLevel(item)}`);
  return parts;
}

function productStatusText(product){
  if(!productUnlocked(product)) return productLockLabel(product);
  if(product.kind === "ship") return shipStateLabel(product.data);
  if(product.kind === "ammo") return `Stock ${fmt(getAmmoCount(product.id))}`;
  if(product.kind === "drone") return `${store.state.ownedDroneCount || 0} possédé(s)`;
  const ownedCount = getInventoryCount(product.id);
  return ownedCount > 0 ? `${ownedCount} possédé${ownedCount > 1 ? "s" : ""}` : "Non possédé";
}

function renderShopListCard(product, selected){
  const unlocked = productUnlocked(product);
  const lockBadge = unlocked ? "" : `<span class="badge lock">${productLockLabel(product)}</span>`;
  if(product.kind === "ship"){
    const ship = product.data;
    const owned = store.state.ownedShips.includes(ship.id);
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${owned ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art"><img src="${ship.img}" alt="${ship.name}"></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${ship.name}</h4><span class="badge">TIER ${ship.tier}</span></div>
        <p>${ship.className}</p>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${owned ? "OK" : priceLabel(ship.priceType, ship.price)}</strong></div>
        <div class="shop-list-meta"><span>${ship.stats.vie} PV · ${getShipCombatStats(ship.id).vitesseReelle} vitesse</span>${lockBadge}</div>
      </div>
    </article>`;
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    const secondary = ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax} dmg · ${ammo.range} portée` : `x${ammo.multiplier} dégâts lasers · ${ammo.cooldown.toFixed(2)}s`;
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${getAmmoCount(ammo.id) ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art ammo"><div class="ammo-product-art" style="--ammo-color:${ammo.color}"><b>${ammo.short}</b><span>${ammo.weaponClass === "rocket" ? "RKT" : `x${ammo.multiplier}`}</span></div></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${ammo.name}</h4><span class="badge">${ammo.rarity}</span></div>
        <p>${secondary}</p>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${priceLabel(ammo.priceType, ammo.price)}</strong></div>
        <div class="shop-list-meta"><span>Pack ${fmt(ammo.amount)}</span>${lockBadge}</div>
      </div>
    </article>`;
  }
  if(product.kind === "drone"){
    const drone = product.data;
    const count = store.state.ownedDroneCount || 0;
    const next = count < drone.maxOwned ? getDronePurchasePrice(count) : null;
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${(count>0) ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art"><img src="${drone.img}" alt="${drone.name}"></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${drone.name}</h4><span class="badge">${drone.rarity}</span></div>
        <p>1 slot par drone · max ${drone.maxOwned}</p>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${next ? priceLabel(drone.priceType, next) : "MAX"}</strong></div>
        <div class="shop-list-meta"><span>Prix x2 à chaque achat</span>${lockBadge}</div>
      </div>
    </article>`;
  }
  const item = product.data;
  const ownedCount = getInventoryCount(item.id);
  return `<article class="shop-list-card ${selected ? "selected" : ""} ${ownedCount ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
    <div class="shop-list-art"><img src="${item.img}" alt="${item.name}"></div>
    <div class="shop-list-copy">
      <div class="shop-list-head"><h4>${item.name}</h4><span class="badge">${item.rarity}</span></div>
      <p>${statLabelForItem(item)}</p>
      <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${priceLabel(item.priceType, item.price)}</strong></div>
      <div class="shop-list-meta"><span>${item.category.toUpperCase()}</span>${lockBadge}</div>
    </div>
  </article>`;
}

function renderShopDetail(product){
  const detail = document.getElementById("shopDetailPanel");
  if(!detail) return;
  if(!product){
    detail.innerHTML = `<div class="shop-detail-empty"><span class="tiny">Aucun article</span><h3>Choisis une catégorie</h3><p>Aucun résultat pour ce filtre.</p></div>`;
    return;
  }
  const unlocked = productUnlocked(product);
  const lockHtml = unlocked ? "" : `<div class="shop-detail-lock">🔒 ${productLockLabel(product)}</div>`;
  if(product.kind === "ship"){
    const ship = product.data;
    const owned = store.state.ownedShips.includes(ship.id);
    const active = store.state.activeShip === ship.id;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">VAISSEAU ${ship.tier}</span><span class="badge">${ship.className}</span></div>
      <div class="shop-detail-art"><img src="${ship.img}" alt="${ship.name}"></div>
      <h3>${ship.name}</h3>
      <p class="shop-detail-copy">${ship.className}. ${ship.special ? `Aptitude : ${ship.special}.` : "Aucun sort spécial."}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(line=>`<div class="shop-detail-stat"><span>${line}</span></div>`).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Statut</small><strong>${active ? "Actif" : owned ? "Possédé" : priceLabel(ship.priceType, ship.price)}</strong></div><button class="blue-button" data-buy-shop-ship="${ship.id}" ${(owned || !unlocked || !canAfford(ship.priceType, ship.price)) ? "disabled" : ""}>${owned ? "DÉJÀ ACHETÉ" : unlocked ? "ACHETER" : `NIV. ${getRequiredLevel(ship)}`}</button></div>`;
    return;
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    const ammoBadge = ammo.weaponClass === "rocket" ? "ROQUETTE" : "MUNITION LASER";
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">${ammoBadge}</span><span class="badge">${ammo.rarity}</span></div>
      <div class="shop-detail-art compact"><div class="ammo-product-art" style="--ammo-color:${ammo.color}"><b>${ammo.short}</b><span>${ammo.weaponClass === "rocket" ? "RKT" : `x${ammo.multiplier}`}</span></div></div>
      <h3>${ammo.name}</h3>
      <p class="shop-detail-copy">${ammo.desc}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(line=>`<div class="shop-detail-stat"><span>${line}</span></div>`).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix</small><strong>${priceLabel(ammo.priceType, ammo.price)}</strong></div><button class="blue-button" data-buy-ammo="${ammo.id}" ${(!unlocked || !canAfford(ammo.priceType, ammo.price)) ? "disabled" : ""}>${unlocked ? "ACHETER" : `NIV. ${getRequiredLevel(ammo)}`}</button></div>`;
    return;
  }
  if(product.kind === "drone"){
    const drone = product.data;
    const count = store.state.ownedDroneCount || 0;
    const next = count < drone.maxOwned ? getDronePurchasePrice(count) : null;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">DRONE</span><span class="badge">${drone.rarity}</span></div>
      <div class="shop-detail-art"><img src="${drone.img}" alt="${drone.name}"></div>
      <h3>${drone.name}</h3>
      <p class="shop-detail-copy">${drone.desc}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(line=>`<div class="shop-detail-stat"><span>${line}</span></div>`).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Suivant</small><strong>${next ? priceLabel(drone.priceType, next) : "MAX"}</strong></div><button class="blue-button" data-buy-combat-drone ${(!unlocked || !next || !canAfford(drone.priceType, next)) ? "disabled" : ""}>${next ? "ACHETER" : "MAX"}</button></div>`;
    return;
  }
  const item = product.data;
  const ownedCount = getInventoryCount(item.id);
  const equipText = item.category === "canon" ? "Peut être équipé dans un slot laser de vaisseau ou de drone." : item.category === "generateur" ? "Peut être équipé dans un slot générateur de vaisseau ou dans un drone." : item.category === "extra" ? "Peut être équipé dans un slot extra du vaisseau." : "Prévu pour une future étape de gameplay.";
  detail.innerHTML = `
    <div class="shop-detail-top"><span class="badge">${item.category.toUpperCase()}</span><span class="badge">${item.rarity}</span></div>
    <div class="shop-detail-art"><img src="${item.img}" alt="${item.name}"></div>
    <h3>${item.name}</h3>
    <p class="shop-detail-copy">${equipText}</p>
    ${lockHtml}
    <div class="shop-detail-stats">${productDetailStats(product).map(line=>`<div class="shop-detail-stat"><span>${line}</span></div>`).join("")}</div>
    <div class="shop-detail-footer"><div class="shop-detail-price"><small>Possession</small><strong>${ownedCount}</strong></div><button class="blue-button" data-buy-item="${item.id}" ${(!unlocked || !canAfford(item.priceType, item.price)) ? "disabled" : ""}>${unlocked ? "ACHETER" : `NIV. ${getRequiredLevel(item)}`}</button></div>`;
}

export function renderShop(){
  const grid = document.getElementById("shopGrid");
  const title = document.getElementById("shopSectionTitle");
  const subtitle = document.getElementById("shopSectionSubtitle");
  const count = document.getElementById("shopResultCount");
  const meta = SHOP_FILTER_META[store.shopFilter] || SHOP_FILTER_META.vaisseau;
  const list = shopCatalog().filter(productMatchesFilter);
  if(title) title.textContent = meta.title;
  if(subtitle) subtitle.textContent = meta.subtitle;
  if(count) count.textContent = `${list.length} ARTICLE${list.length > 1 ? "S" : ""}`;
  document.querySelectorAll("[data-filter-shop]").forEach(btn=>btn.classList.toggle("active", btn.dataset.filterShop === store.shopFilter));

  if(!list.length){
    store.selectedShopProduct = null;
    if(grid) grid.innerHTML = `<div class="empty-msg">${meta.empty}</div>`;
    renderShopDetail(null);
    return;
  }

  if(!store.selectedShopProduct || !list.some(product=>productKey(product) === store.selectedShopProduct)){
    store.selectedShopProduct = productKey(list[0]);
  }
  const selectedProduct = list.find(product=>productKey(product) === store.selectedShopProduct) || list[0];
  store.selectedShopProduct = productKey(selectedProduct);
  if(grid) grid.innerHTML = list.map(product=>renderShopListCard(product, productKey(product) === store.selectedShopProduct)).join("");
  renderShopDetail(selectedProduct);
}

export function renderPortals(){
  const grid = document.getElementById("portalGrid");
  if(!grid) return;
  const power = store.state.activeShip ? getPowerScore() : 0;
  grid.innerHTML = portals.map(p=>{
    const pieces = getPortalPieces(p.id);
    const unlocked = isPortalUnlocked(p.id);
    const reqLevelOk = store.state.player.level >= p.requirement.level;
    const reqPowerOk = power >= p.requirement.power;
    const canEnter = unlocked && reqLevelOk && reqPowerOk && !!store.state.activeShip;
    const canUnlockPieces = !unlocked && pieces >= p.piecesRequired;
    const canUnlockNova = !unlocked && canAfford("premium", p.novaCost);
    const clearCount = Math.max(0, Number(store.state.completedPortals?.[p.id] || 0));
    const actionHtml = unlocked
      ? `<button class="blue-button small" data-start-portal="${p.id}" ${canEnter ? "" : "disabled"}>${canEnter ? "Entrer" : !store.state.activeShip ? "Équiper un vaisseau" : "Prérequis manquants"}</button>`
      : `<button class="blue-button secondary small" data-unlock-portal-pieces="${p.id}" ${canUnlockPieces ? "" : "disabled"}>Utiliser ${fmt(p.piecesRequired)} pièces</button><button class="blue-button small" data-unlock-portal-nova="${p.id}" ${canUnlockNova ? "" : "disabled"}>Payer ${fmt(p.novaCost)} NOVA</button>`;
    return `<article class="portal-card ${canEnter ? "ready" : unlocked ? "unlocked" : "locked"}">
      <img src="${p.img}" alt="${p.name}">
      <div class="portal-card-head"><h3>${p.name}</h3><span class="badge">${p.level}</span></div>
      <div class="portal-state">${unlocked ? "DÉVERROUILLÉ" : "SCELLÉ"} · ${reqLevelOk ? "Niveau OK" : `Niv ${p.requirement.level}`}${p.requirement.power ? ` · ${reqPowerOk ? "Puissance OK" : `Puissance ${p.requirement.power}`}` : ""}</div>
      <div class="portal-piece-row"><span>Pièces</span><strong>${fmt(pieces)} / ${fmt(p.piecesRequired)}</strong></div>
      <div class="stat-track compact"><span style="width:${Math.min(100, pieces / p.piecesRequired * 100)}%"></span></div>
      <p class="portal-copy">Drop : ${p.dropZones.join(", ")} · taux ${p.dropChance ? (p.dropChance * 100).toFixed(2).replace('.', ',') : '0,00'}%</p>
      <p class="portal-copy reward">Récompense : ${p.reward}</p>
      <div class="portal-actions">${actionHtml}</div>
      <small class="portal-history">${clearCount ? `${clearCount} nettoyage(s)` : "Jamais terminé"}</small>
    </article>`;
  }).join("");
}

export function renderSkills(){
  const grid = document.getElementById("skillGrid");
  if(!grid) return;
  grid.innerHTML = skills.map(skill=>{
    const level = getSkillLevel(skill.id);
    const maxLevel = Number(skill.maxLevel || skill.levels?.length || 0);
    const next = getSkillUpgradeData(skill.id);
    const currentBonus = skill.levels.slice(0, level).map(step=>step.label).join(" · ");
    const can = !!next && store.state.player.skillPoints >= Number(next.skillPoints || 0) && canAfford(next.priceType, next.price);
    const price = next ? priceLabel(next.priceType, next.price) : "MAX";
    return `<article class="skill-card branch ${skill.theme || ""} ${level >= maxLevel ? "unlocked" : ""}">
      <div class="skill-card-head">
        <div class="skill-icon">${skill.icon}</div>
        <div>
          <h3>${skill.name}</h3>
          <small>Niveau ${level}/${maxLevel}</small>
        </div>
      </div>
      <p>${skill.desc}</p>
      <div class="skill-progress-row"><span>Progression</span><span>${level}/${maxLevel}</span></div>
      <div class="mini-bar"><span style="width:${maxLevel ? (level / maxLevel) * 100 : 0}%"></span></div>
      <div class="skill-bonus-box">
        <strong>Bonus actuels</strong>
        <small>${currentBonus || "Aucun bonus actif pour le moment."}</small>
      </div>
      <div class="skill-next-box">
        <strong>${next ? `Niveau ${level + 1}` : "Compétence terminée"}</strong>
        <small>${next ? `${next.label} · ${next.skillPoints} pt${next.skillPoints > 1 ? "s" : ""} · ${price}` : "Tous les paliers sont débloqués."}</small>
      </div>
      <button class="blue-button small" data-unlock-skill="${skill.id}" ${!next || !can ? "disabled" : ""}>${next ? `Améliorer (${price})` : "MAX"}</button>
    </article>`;
  }).join("");
}


export function renderLeaderboard(){
  const panel = document.getElementById("leaderboardPanel");
  if(!panel) return;
  const rows = getLeaderboardRows();
  const self = rows.find(row=>row.isPlayer) || rows[0];
  const rank = getCurrentRank();
  const next = getNextRank();
  const progress = getRankProgress();
  const breakdown = getRankBreakdown();
  const totalBreakdownPoints = breakdown.reduce((sum,row)=>sum + row.points, 0);

  panel.innerHTML = `
    <div class="leaderboard-summary-grid">
      <article class="leaderboard-summary-card">
        <span class="tiny">TA POSITION</span>
        <strong>#${self?.position || "—"}</strong>
        <small>${self?.pilot || store.state.player.name}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">GRADE</span>
        <div class="leaderboard-rank-summary">${rankIcon(rank, rank.name)}<strong>${rank.name}</strong></div>
        <small>${next ? `Prochain : ${next.name}` : "Grade maximum"}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">POINTS TOTAUX</span>
        <strong>${fmt(progress.score)}</strong>
        <small>${next ? `${fmt(progress.remaining)} points restants` : "Progression terminée"}</small>
      </article>
      <article class="leaderboard-summary-card">
        <span class="tiny">PROGRESSION</span>
        <strong>${Math.round(progress.progress)}%</strong>
        <div class="mini-bar leaderboard-progress"><span style="width:${progress.progress}%"></span></div>
      </article>
    </div>

    <div class="leaderboard-layout">
      <section class="leaderboard-table-card frame">
        <div class="leaderboard-section-head">
          <div>
            <span class="tiny">CLASSEMENT LOCAL</span>
            <h3>Prévisualisation MMO</h3>
          </div>
          <span class="badge">Backend plus tard</span>
        </div>
        <div class="leaderboard-table-wrap">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pilote</th>
                <th>Grade</th>
                <th>Points</th>
                <th>Niv.</th>
                <th>Kills</th>
                <th>Portails</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row=>`<tr class="${row.isPlayer ? "is-player" : ""}">
                <td>${row.position}</td>
                <td><strong>${row.pilot}</strong>${row.isPlayer ? `<span class="you-badge">TOI</span>` : ""}</td>
                <td>${rankInline({id:row.rankId, name:row.grade})}</td>
                <td>${fmt(row.points)}</td>
                <td>${fmt(row.level)}</td>
                <td>${fmt(row.kills)}</td>
                <td>${fmt(row.portals)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="leaderboard-note">Pour le moment ce classement mélange ton vrai pilote sauvegardé en local avec des pilotes de démonstration. Plus tard, les lignes pourront venir d’une API serveur MMO.</p>
      </section>

      <aside class="leaderboard-rules-card frame">
        <div class="leaderboard-section-head">
          <div>
            <span class="tiny">SCORE DE GRADE</span>
            <h3>Comment gagner des points</h3>
          </div>
        </div>
        <div class="rank-breakdown-list">
          ${breakdown.map(row=>`<article class="rank-breakdown-row">
            <div>
              <strong>${row.label}</strong>
              <span>${row.source}</span>
              <small>${row.formula}</small>
            </div>
            <b>${fmt(row.points)}</b>
          </article>`).join("")}
        </div>
        <div class="rank-total-line">
          <span>Total calculé</span>
          <strong>${fmt(totalBreakdownPoints)}</strong>
        </div>
        <div class="rank-rules-mini">
          ${RANK_POINT_RULES.map(rule=>`<div><b>${rule.label}</b><span>${rule.rate}</span></div>`).join("")}
        </div>
      </aside>
    </div>

    <section class="rank-table-card frame">
      <div class="leaderboard-section-head">
        <div>
          <span class="tiny">TABLE DES GRADES</span>
          <h3>Seuils de progression</h3>
        </div>
        <span class="badge">${RANK_TABLE.length} grades</span>
      </div>
      <div class="rank-table-grid">
        ${RANK_TABLE.map((grade,index)=>`<article class="rank-threshold ${grade.id === rank.id ? "current" : ""}">
          <span>#${index+1}</span>
          ${rankIcon(grade, grade.name)}
          <strong>${grade.name}</strong>
          <small>${fmt(grade.score)} pts</small>
        </article>`).join("")}
      </div>
    </section>
  `;
}


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
