import { ammoTypes, droneCatalog, droneFormations, equipment, ships } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import {
  canAfford,
  getAmmoCount,
  getDronePurchasePrice,
  getInventoryCount,
  getShipCombatStats,
  priceLabel,
  store
} from "../core/store.js";
import { statLabelForItem } from "./renderShared.js";

function shopCatalog(){
  return [
    ...ships.map(ship=>({kind:"ship", category:"vaisseau", id:ship.id, data:ship})),
    ...equipment.filter(item=>item.shop !== false).map(item=>({kind:"item", category:item.shopCategory || item.category, id:item.id, data:item})),
    ...ammoTypes.map(ammo=>({kind:"ammo", category:"munition", id:ammo.id, data:ammo})),
    ...droneCatalog.map(drone=>({kind:"drone", category:"drone", id:drone.id, data:drone})),
    ...droneFormations.map(formation=>({kind:"droneFormation", category:"drone", id:formation.id, data:formation}))
  ];
}

function productIsOwned(product){
  if(product.kind === "ship") return store.state.ownedShips.includes(product.id);
  if(product.kind === "ammo") return getAmmoCount(product.id) > 0;
  if(product.kind === "drone") return (store.state.ownedDroneCount || 0) > 0;
  if(product.kind === "droneFormation") return store.state.ownedDroneFormations?.includes(product.id);
  return getInventoryCount(product.id) > 0;
}

function productMatchesFilter(product){
  if(store.shopFilter === "owned") return productIsOwned(product);
  if(store.shopFilter === "premium") return product.data.priceType === "premium";
  return product.category === store.shopFilter;
}

function productUnlocked(product){ return true; }
function productLockLabel(product){ return ""; }

const SHOP_FILTER_META = {
  vaisseau:{title:"Vaisseaux", subtitle:"Flotte disponible à l'achat : châssis progressifs sans verrou de niveau.", empty:"Aucun vaisseau à afficher."},
  canon:{title:"Armes", subtitle:"Générations de lasers disponibles à l'achat.", empty:"Aucune arme disponible."},
  munition:{title:"Munitions / Roquettes / Missiles", subtitle:"Munitions laser et roquettes pour les slots 1-9, missiles pour le module CPU.", empty:"Aucune munition disponible."},
  generateur:{title:"Générateurs", subtitle:"Boucliers, régénération et vitesse pour ton vaisseau ou tes drones.", empty:"Aucun générateur disponible."},
  drone:{title:"Drones", subtitle:"Drones orbitaux : achat progressif, un slot par drone, max 10.", empty:"Aucun drone dans cette catégorie."},
  extra:{title:"Extras", subtitle:"Modules extra à placer dans les 3 slots extras du vaisseau.", empty:"Aucun extra disponible."},
  module:{title:"Modules", subtitle:"Modules spéciaux et améliorations de munitions.", empty:"Aucun module disponible."},
  premium:{title:"Premium", subtitle:"Articles premium disponibles pour le compte pilote.", empty:"Aucun article premium."},
  owned:{title:"Possédé", subtitle:"Retrouve rapidement tout ce que tu as deja acheté.", empty:"Tu ne possèdes encore rien dans ce filtre."}
};

function productKey(product){ return `${product.kind}:${product.id}`; }
function shopAmmoMultiplier(){ return [1, 10, 100, 1000].includes(Number(store.selectedShopAmmoMultiplier)) ? Number(store.selectedShopAmmoMultiplier) : 1; }
function renderAmmoPurchaseControls(ammo){
  const selected = shopAmmoMultiplier();
  return `<div class="shop-ammo-buy-options">
    ${[1,10,100,1000].map(value=>`<button type="button" class="${selected === value ? "active" : ""}" data-shop-ammo-multiplier="${value}">x${fmt(value)}</button>`).join("")}
    <small>${fmt(ammo.amount * selected)} unités</small>
  </div>`;
}
function shipStateLabel(ship){ return store.state.activeShip === ship.id ? "ACTIF" : store.state.ownedShips.includes(ship.id) ? "POSSÉDÉ" : "DISPONIBLE"; }

function productDetailStats(product){
  if(product.kind === "ship"){
    const ship = product.data;
    return [
      `Vie ${ship.stats.vie}`,
      `Vitesse réelle ${getShipCombatStats(ship.id).vitesseReelle}`,
      `Cargo ${ship.stats.cargo}`,
      `Lasers ${ship.stats.maxLasers}`,
      `Générateurs ${ship.stats.maxGenerators}`,
      `Extras ${ship.stats.maxExtras || 3}`,
      `Spécial Aucun`
    ];
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    if(ammo.weaponClass === "missile"){
      return [
        `DÉGÂTS ${fmt(ammo.damageMin)}-${fmt(ammo.damageMax)}`,
        `PORTÉE ${ammo.range}`,
        `Stock ${fmt(getAmmoCount(ammo.id))}`
      ];
    }
    if(ammo.weaponClass === "rocket"){
      return [
        `DÉGÂTS ${ammo.damageMin}-${ammo.damageMax}`,
        `PORTÉE ${ammo.range}`,
        `Stock ${fmt(getAmmoCount(ammo.id))}`
      ];
    }
    return [
      `Pack ${fmt(ammo.amount)} unités`,
      `Multiplicateur x${ammo.multiplier}`,
      `Stock ${fmt(getAmmoCount(ammo.id))}`
    ];
  }
  if(product.kind === "drone"){
    const drone = product.data;
    const count = store.state.ownedDroneCount || 0;
    const next = count < drone.maxOwned ? getDronePurchasePrice(count) : 0;
    return [
      `Drones possédés ${count}/${drone.maxOwned}`,
      `Emplacements 1 par drone`,
      `Compatibilité laser / générateur`,
      `Prix suivant ${next ? priceLabel(drone.priceType, next) : "MAX"}`
    ];
  }
  const item = product.data;
  if(item.category === "canon" && item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    return [
      `DÉGÂTS ${min}-${max}`,
      `PORTÉE ${item.weapon.range}`,
      `CADENCE ${item.weapon.cooldown.toFixed(2)}s`
    ];
  }
  if(item.slotType === "rocketLauncher"){
    return [
      `DÉGÂTS ROQUETTE ${item.stats?.degats || "100%"}`,
      `PORTÉE ${item.stats?.portee || 0}`,
      `CADENCE ${item.stats?.cadence || "0.00s"}`
    ];
  }
  if(item.slotType === "missileLauncher"){
    return [
      `DÉGÂTS MISSILE ${item.stats?.degats || "100%"}`,
      `PORTÉE ${item.stats?.portee || 0}`,
      `RECHARGE ${item.stats?.recharge || "0.00s"}`,
      `CAPACITÉ ${item.stats?.missiles || 0}`,
      `RECHARGE TOTALE ${item.stats?.rechargeTotale || "0.00s"}`
    ];
  }
  if(item.category === "generateur"){
    const lines = [];
    if(Number(item.stats?.bouclier || 0) > 0) lines.push(`BOUCLIER +${fmt(item.stats.bouclier)}`);
    if(Number(item.stats?.regen || 0) > 0) lines.push(`REGENERATION +${fmt(item.stats.regen)}/s`);
    if(Number(item.stats?.vitesse || 0) > 0) lines.push(`VITESSE +${fmt(item.stats.vitesse)}`);
    lines.push("SLOT VAISSEAU / DRONE");
    return lines;
  }
  if(item.category === "extra"){
    return [
      `EFFET ${item.stats?.extra || "Bonus passif"}`,
      "SLOT EXTRA VAISSEAU"
    ];
  }
  return statLabelForItem(item).split(" · ");
}

function shopItemStatsHtml(item){
  if(item.category === "canon" && item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    return `<div class="shop-item-stat-lines">
      <span><b>Dégâts</b>${min}-${max}</span>
      <span><b>Portée</b>${item.weapon.range}</span>
      <span><b>Cadence</b>${item.weapon.cooldown.toFixed(2)}s</span>
    </div>`;
  }
  if(item.slotType === "rocketLauncher"){
    return `<div class="shop-item-stat-lines">
      <span><b>Dégâts roquette</b>${item.stats?.degats || "100%"}</span>
      <span><b>Portée</b>${item.stats?.portee || 0}</span>
      <span><b>Cadence</b>${item.stats?.cadence || "0.00s"}</span>
    </div>`;
  }
  if(item.slotType === "missileLauncher"){
    return `<div class="shop-item-stat-lines">
      <span><b>Dégâts missile</b>${item.stats?.degats || "100%"}</span>
      <span><b>Portée</b>${item.stats?.portee || 0}</span>
      <span><b>Recharge</b>${item.stats?.recharge || "0.00s"}</span>
      <span><b>Capacité</b>${item.stats?.missiles || 0}</span>
    </div>`;
  }
  if(item.category === "generateur"){
    const lines = [];
    if(Number(item.stats?.bouclier || 0) > 0) lines.push(`<span><b>Bouclier</b>+${fmt(item.stats.bouclier)}</span>`);
    if(Number(item.stats?.regen || 0) > 0) lines.push(`<span><b>Regen</b>+${fmt(item.stats.regen)}/s</span>`);
    if(Number(item.stats?.vitesse || 0) > 0) lines.push(`<span><b>Vitesse</b>+${fmt(item.stats.vitesse)}</span>`);
    return `<div class="shop-item-stat-lines">${lines.join("")}</div>`;
  }
  if(item.category === "extra"){
    return `<div class="shop-item-stat-lines">
      <span><b>Effet</b>${item.stats?.extra || "Bonus passif"}</span>
      <span><b>Slot</b>Extra vaisseau</span>
    </div>`;
  }
  return `<p>${statLabelForItem(item)}</p>`;
}

function shopAmmoStatsHtml(ammo){
  if(ammo.weaponClass === "rocket" || ammo.weaponClass === "missile"){
    return `<div class="shop-item-stat-lines">
      <span><b>Dégâts</b>${fmt(ammo.damageMin)}-${fmt(ammo.damageMax)}</span>
      <span><b>Portée</b>${fmt(ammo.range)}</span>
      <span><b>Stock</b>${fmt(getAmmoCount(ammo.id))}</span>
    </div>`;
  }
  if(ammo.weaponClass !== "laser") return "";
  return `<div class="shop-item-stat-lines">
      <span><b>Multiplicateur</b>x${ammo.multiplier}</span>
      <span><b>Pack</b>${fmt(ammo.amount)}</span>
      <span><b>Stock</b>${fmt(getAmmoCount(ammo.id))}</span>
    </div>`;
}

function renderShopDetailStat(line){
  const match = String(line).match(/^(BOUCLIER|REGENERATION|VITESSE|PACK|MULTIPLICATEUR|STOCK|EFFET|SLOT)\s+(.+)$/i) || String(line).match(/^(D\S+(?:\s+ROQUETTE|\s+MISSILE)?|PORT\S+[E\u00c9]|CADENCE|RECHARGE|CAPACIT\S+|RECHARGE TOTALE)\s+(.+)$/);
  if(match){
    return `<div class="shop-detail-stat featured"><b>${String(match[1]).toUpperCase()}</b><strong>${match[2]}</strong></div>`;
  }
  return `<div class="shop-detail-stat"><span>${line}</span></div>`;
}
function productStatusText(product){
  if(!productUnlocked(product)) return productLockLabel(product);
  if(product.kind === "ship") return shipStateLabel(product.data);
  if(product.kind === "ammo") return `Stock ${fmt(getAmmoCount(product.id))}`;
  if(product.kind === "drone") return `${store.state.ownedDroneCount || 0} possédé(s)`;
  if(product.kind === "droneFormation") return store.state.activeDroneFormation === product.id ? "ACTIVE" : store.state.ownedDroneFormations?.includes(product.id) ? "POSSÉDÉE" : "DISPONIBLE";
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
        <div class="shop-list-head"><h4>${ship.name}</h4></div>
        <p>${ship.className}</p>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${owned ? "OK" : priceLabel(ship.priceType, ship.price)}</strong></div>
        <div class="shop-list-meta"><span>${ship.stats.vie} PV · ${getShipCombatStats(ship.id).vitesseReelle} vitesse</span>${lockBadge}</div>
      </div>
    </article>`;
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    const ammoTag = ammo.weaponClass === "missile" ? "MIS" : ammo.weaponClass === "rocket" ? "RKT" : `x${ammo.multiplier}`;
    const ammoStats = shopAmmoStatsHtml(ammo);
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${getAmmoCount(ammo.id) ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art ammo">${ammo.img ? `<img class="ammo-product-img" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-product-art" style="--ammo-color:${ammo.color}"><b>${ammo.short}</b><span>${ammoTag}</span></div>`}</div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${ammo.name}</h4><span class="badge">${ammo.rarity}</span></div>
        ${ammoStats}
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
  if(product.kind === "droneFormation"){
    const formation = product.data;
    const owned = store.state.ownedDroneFormations?.includes(formation.id);
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${owned ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art"><img src="${formation.img}" alt="${formation.name}"></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${formation.name}</h4><span class="badge">${formation.rarity}</span></div>
        <div class="shop-item-stat-lines"><span><b>Bonus</b>${formation.stats.bonus}</span><span><b>Malus</b>${formation.stats.malus}</span></div>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span><strong>${owned ? "OK" : priceLabel(formation.priceType, formation.price)}</strong></div>
      </div>
    </article>`;
  }
  const item = product.data;
  const ownedCount = getInventoryCount(item.id);
  const lockLine = lockBadge ? `<div class="shop-list-meta">${lockBadge}</div>` : "";
  return `<article class="shop-list-card ${selected ? "selected" : ""} ${ownedCount ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}">
    <div class="shop-list-art"><img src="${item.img}" alt="${item.name}"></div>
    <div class="shop-list-copy">
      <div class="shop-list-head"><h4>${item.name}</h4><span class="badge">${item.rarity}</span></div>
      ${shopItemStatsHtml(item)}
      <div class="shop-list-meta"><span>${item.category.toUpperCase()}</span><strong>${priceLabel(item.priceType, item.price)}</strong></div>
      ${lockLine}
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
  const lockHtml = unlocked ? "" : `<div class="shop-detail-lock">${productLockLabel(product)}</div>`;
  if(product.kind === "ship"){
    const ship = product.data;
    const owned = store.state.ownedShips.includes(ship.id);
    const active = store.state.activeShip === ship.id;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">VAISSEAU</span><span class="badge">${ship.className}</span></div>
      <div class="shop-detail-art"><img src="${ship.img}" alt="${ship.name}"></div>
      <h3>${ship.name}</h3>
      <p class="shop-detail-copy">${ship.className}. ${ship.special ? `Aptitude : ${ship.special}.` : "Aucun sort spécial."}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Statut</small><strong>${active ? "Actif" : owned ? "Possédé" : priceLabel(ship.priceType, ship.price)}</strong></div><button class="blue-button" data-buy-shop-ship="${ship.id}" ${(owned || !canAfford(ship.priceType, ship.price)) ? "disabled" : ""}>${owned ? "DÉJÀ ACHETÉ" : "ACHETER"}</button></div>`;
    return;
  }
  if(product.kind === "ammo"){
    const ammo = product.data;
    const ammoBadge = ammo.weaponClass === "missile" ? "MISSILE" : ammo.weaponClass === "rocket" ? "ROQUETTE" : "MUNITION LASER";
    const ammoTag = ammo.weaponClass === "missile" ? "MIS" : ammo.weaponClass === "rocket" ? "RKT" : `x${ammo.multiplier}`;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">${ammoBadge}</span><span class="badge">${ammo.rarity}</span></div>
      <div class="shop-detail-art compact">${ammo.img ? `<img class="ammo-detail-img" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-product-art" style="--ammo-color:${ammo.color}"><b>${ammo.short}</b><span>${ammoTag}</span></div>`}</div>
      <h3>${ammo.name}</h3>
      <p class="shop-detail-copy">${ammo.desc}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
      ${renderAmmoPurchaseControls(ammo)}
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix</small><strong>${priceLabel(ammo.priceType, ammo.price * shopAmmoMultiplier())}</strong></div><button class="blue-button" data-buy-ammo="${ammo.id}" data-buy-ammo-multiplier="${shopAmmoMultiplier()}" ${(!canAfford(ammo.priceType, ammo.price * shopAmmoMultiplier())) ? "disabled" : ""}>ACHETER</button></div>`;
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
      <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Suivant</small><strong>${next ? priceLabel(drone.priceType, next) : "MAX"}</strong></div><button class="blue-button" data-buy-combat-drone ${(!next || !canAfford(drone.priceType, next)) ? "disabled" : ""}>${next ? "ACHETER" : "MAX"}</button></div>`;
    return;
  }
  if(product.kind === "droneFormation"){
    const formation = product.data;
    const owned = store.state.ownedDroneFormations?.includes(formation.id);
    const active = store.state.activeDroneFormation === formation.id;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">FORMATION DRONE</span><span class="badge">${formation.rarity}</span></div>
      <div class="shop-detail-art"><img src="${formation.img}" alt="${formation.name}"></div>
      <h3>${formation.name}</h3>
      <p class="shop-detail-copy">${formation.desc}</p>
      <div class="shop-detail-stats">
        ${renderShopDetailStat(`EFFET ${formation.stats.bonus}`)}
        ${renderShopDetailStat(`MALUS ${formation.stats.malus}`)}
      </div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Statut</small><strong>${active ? "ACTIVE" : owned ? "POSSÉDÉE" : priceLabel(formation.priceType, formation.price)}</strong></div><button class="blue-button" data-buy-drone-formation="${formation.id}" ${(!owned && !canAfford(formation.priceType, formation.price)) ? "disabled" : ""}>${active ? "ACTIVE" : owned ? "ACTIVER" : "ACHETER"}</button></div>`;
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
    <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
    <div class="shop-detail-footer"><div class="shop-detail-price"><small>Possession</small><strong>${ownedCount}</strong></div><button class="blue-button" data-buy-item="${item.id}" ${(!canAfford(item.priceType, item.price)) ? "disabled" : ""}>ACHETER</button></div>`;
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
