import { ammoTypes, droneCatalog, droneFormations, equipment, ships } from "../data/catalog.js";
import { isPremiumActive, premiumRemainingLabel, premiumShopPacks } from "../data/premium.js";
import { fmt } from "../core/utils.js";
import {
  canAfford,
  getAmmoCount,
  getCurrencyPrice,
  getDronePurchasePrice,
  getInventoryCount,
  getShipPurchaseLockReason,
  hasCurrencyDiscount,
  store
} from "../core/store.js";
import { statLabelForItem } from "./renderShared.js";
import { S1_BOOSTER_SHOP } from "../shared/firmBoosters.js";
import { currencyAmountHtml } from "./currencyIcons.js";

function shopCatalog(){
  return [
    ...ships.map(ship=>({kind:"ship", category:"vaisseau", id:ship.id, data:ship})),
    ...equipment.filter(item=>item.shop !== false && (item.shopCategory || item.category) !== "module").map(item=>({kind:"item", category:item.shopCategory || item.category, id:item.id, data:item})),
    ...ammoTypes.map(ammo=>({kind:"ammo", category:"munition", id:ammo.id, data:ammo})),
    ...droneCatalog.map(drone=>({kind:"drone", category:"drone", id:drone.id, data:drone})),
    ...droneFormations.map(formation=>({kind:"droneFormation", category:"drone", id:formation.id, data:formation})),
    ...S1_BOOSTER_SHOP.map(booster=>({kind:"booster", category:"booster", id:booster.id, data:booster})),
    ...premiumShopPacks.map(pack=>({kind:"premiumPack", category:"premium", id:pack.id, data:pack}))
  ];
}

function productIsOwned(product){
  if(product.kind === "premiumPack") return false;
  if(product.kind === "ship") return store.state.ownedShips.includes(product.id);
  if(product.kind === "ammo") return getAmmoCount(product.id) > 0;
  if(product.kind === "drone") return (store.state.ownedDroneCount || 0) > 0;
  if(product.kind === "droneFormation") return store.state.ownedDroneFormations?.includes(product.id);
  if(product.kind === "booster") return Number(store.state.boosters?.s1?.[product.data.type]?.remainingMs || 0) > 0;
  return getInventoryCount(product.id) > 0;
}

function productMatchesFilter(product){
  if(store.shopFilter === "owned") return productIsOwned(product);
  return product.category === store.shopFilter;
}

function productLockLabel(product){
  if(product.kind === "ship") return getShipPurchaseLockReason(product.data);
  return "";
}
function productUnlocked(product){ return !productLockLabel(product); }

const SHOP_FILTER_META = {
  vaisseau:{title:"Vaisseaux", empty:"Aucun vaisseau à afficher."},
  canon:{title:"Armes", empty:"Aucune arme disponible."},
  munition:{title:"Munitions / Roquettes / Missiles", empty:"Aucune munition disponible."},
  generateur:{title:"Générateurs", empty:"Aucun générateur disponible."},
  drone:{title:"Drones", empty:"Aucun drone dans cette catégorie."},
  extra:{title:"Extras", empty:"Aucun extra disponible."},
  booster:{title:"Boosters", empty:"Aucun booster disponible."},
  premium:{title:"Packs Premium", empty:"Aucun pack premium."},
  owned:{title:"Possédé", empty:"Tu ne possèdes encore rien dans ce filtre."}
};

function productKey(product){ return `${product.kind}:${product.id}`; }
function shopAmmoMultiplier(){ return [1, 10, 100, 1000].includes(Number(store.selectedShopAmmoMultiplier)) ? Number(store.selectedShopAmmoMultiplier) : 1; }
function shopBoosterMultiplier(){ return [1, 10, 50, 100].includes(Number(store.selectedShopBoosterMultiplier)) ? Number(store.selectedShopBoosterMultiplier) : 1; }
function shopPriceClass(priceType){
  return priceType === "premium" ? "shop-price premium" : "shop-price credits";
}
function shopPriceHtml(priceType, price){
  const current = `<strong class="${shopPriceClass(priceType)}">${currencyAmountHtml(priceType, getCurrencyPrice(priceType, price))}</strong>`;
  if(!hasCurrencyDiscount(priceType, price)) return current;
  return `<span class="shop-price-discount"><s>${currencyAmountHtml(priceType, price)}</s>${current}</span>`;
}
function renderAmmoPurchaseControls(ammo){
  const selected = shopAmmoMultiplier();
  return `<div class="shop-ammo-buy-options">
    ${[1,10,100,1000].map(value=>`<button type="button" class="${selected === value ? "active" : ""}" data-shop-ammo-multiplier="${value}">x${fmt(value)}</button>`).join("")}
    <small>${fmt(ammo.amount * selected)} unités</small>
  </div>`;
}
function renderItemPurchaseControls(item){
  if(item.id !== "teleportation_fluid") return "";
  const selected = shopAmmoMultiplier();
  return `<div class="shop-ammo-buy-options">
    ${[1,10,100,1000].map(value=>`<button type="button" class="${selected === value ? "active" : ""}" data-shop-ammo-multiplier="${value}">x${fmt(value)}</button>`).join("")}
    <small>${fmt(selected)} unité${selected > 1 ? "s" : ""}</small>
  </div>`;
}
function renderBoosterPurchaseControls(){
  const selected = shopBoosterMultiplier();
  return `<div class="shop-ammo-buy-options shop-booster-buy-options">
    ${[1,10,50,100].map(value=>`<button type="button" class="${selected === value ? "active" : ""}" data-shop-booster-multiplier="${value}">x${fmt(value)}</button>`).join("")}
    <small>${fmt(selected * 5)} h</small>
  </div>`;
}
function boosterRemainingLabel(booster){
  const milliseconds = Math.max(0, Number(store.state.boosters?.s1?.[booster.type]?.remainingMs || 0));
  if(milliseconds <= 0) return "Inactif";
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  return `${fmt(hours)} h ${minutes} min`;
}
function shipStateLabel(ship){ return store.state.activeShip === ship.id ? "ACTIF" : store.state.ownedShips.includes(ship.id) ? "POSSÉDÉ" : "DISPONIBLE"; }

function productDetailStats(product){
  if(product.kind === "ship"){
    const ship = product.data;
    return [
      `VIE ${fmt(ship.stats.vie)}`,
      `VITESSE ${fmt(ship.stats.vitesse)}`,
      `CARGO ${fmt(ship.stats.cargo)}`,
      `LASERS ${fmt(ship.stats.maxLasers)}`,
      `GÉNÉRATEURS ${fmt(ship.stats.maxGenerators)}`,
      `EXTRAS ${fmt(ship.stats.maxExtras || 3)}`,
      `LANCE-ROQUETTES ${fmt(ship.stats.maxRocketLaunchers ?? 1)}`,
      `LANCE-MISSILES ${fmt(ship.stats.maxMissileLaunchers ?? 1)}`,
      `SPÉCIAL ${ship.special || "Aucun"}`
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
      `Prix suivant ${next ? currencyAmountHtml(drone.priceType, getCurrencyPrice(drone.priceType, next)) : "MAX"}`
    ];
  }
  if(product.kind === "premiumPack"){
    const pack = product.data;
    return [
      `Duree ${pack.days} jours`,
      `Prix boutique ${pack.realPrice}`,
      `Statut ${isPremiumActive(store.state?.player) ? premiumRemainingLabel(store.state.player) : "Inactif"}`,
      ...pack.features
    ];
  }
  if(product.kind === "booster"){
    const booster = product.data;
    return [
      `BONUS +${Math.round(Number(booster.percent || 0) * 100)}% ${booster.type === "hull" ? "vie" : booster.type}`,
      `DURÉE ${shopBoosterMultiplier() * 5} h`,
      `RÉSERVE ${boosterRemainingLabel(booster)}`
    ];
  }
  const item = product.data;
  const stockLine = `Stock ${fmt(getInventoryCount(item.id))}`;
  if(item.category === "canon" && item.weapon){
    const min = item.weapon.minDamage ?? item.weapon.damage ?? 0;
    const max = item.weapon.maxDamage ?? item.weapon.damage ?? min;
    return [
      `DÉGÂTS ${min}-${max}`,
      `PORTÉE ${item.weapon.range}`,
      `CADENCE ${item.weapon.cooldown.toFixed(2)}s`,
      stockLine
    ];
  }
  if(item.slotType === "rocketLauncher"){
    return [
      `DÉGÂTS ROQUETTE ${item.stats?.degats || "100%"}`,
      `PORTÉE ${item.stats?.portee || 0}`,
      `CADENCE ${item.stats?.cadence || "0.00s"}`,
      stockLine
    ];
  }
  if(item.slotType === "missileLauncher"){
    return [
      `DÉGÂTS MISSILE ${item.stats?.degats || "100%"}`,
      `PORTÉE ${item.stats?.portee || 0}`,
      `RECHARGE ${item.stats?.recharge || "0.00s"}`,
      `CAPACITÉ ${item.stats?.missiles || 0}`,
      `RECHARGE TOTALE ${item.stats?.rechargeTotale || "0.00s"}`,
      stockLine
    ];
  }
  if(item.category === "generateur"){
    const lines = [];
    if(Number(item.stats?.bouclier || 0) > 0) lines.push(`BOUCLIER +${fmt(item.stats.bouclier)}`);
    if(Number(item.stats?.regen || 0) > 0) lines.push(`REGENERATION +${fmt(item.stats.regen)}/s`);
    if(item.stats?.absorption) lines.push(`ABSORPTION ${item.stats.absorption}`);
    if(Number(item.stats?.vitesse || 0) > 0) lines.push(`VITESSE +${fmt(item.stats.vitesse)}`);
    lines.push("SLOT VAISSEAU / DRONE");
    lines.push(stockLine);
    return lines;
  }
  if(item.category === "extra"){
    return [
      `EFFET ${item.stats?.extra || "Bonus passif"}`,
      "SLOT EXTRA VAISSEAU",
      stockLine
    ];
  }
  if(item.category === "quest_item"){
    return [
      `EFFET ${item.stats?.extra || "Objet de quete"}`,
      stockLine
    ];
  }
  return [...statLabelForItem(item).split(" · "), stockLine];
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
    if(item.stats?.absorption) lines.push(`<span><b>Absorption</b>${item.stats.absorption}</span>`);
    if(Number(item.stats?.vitesse || 0) > 0) lines.push(`<span><b>Vitesse</b>+${fmt(item.stats.vitesse)}</span>`);
    return `<div class="shop-item-stat-lines">${lines.join("")}</div>`;
  }
  if(item.category === "extra"){
    return `<div class="shop-item-stat-lines">
      <span><b>Effet</b>${item.stats?.extra || "Bonus passif"}</span>
      <span><b>Slot</b>Extra vaisseau</span>
    </div>`;
  }
  if(item.category === "quest_item"){
    return `<div class="shop-item-stat-lines">
      <span><b>Effet</b>${item.stats?.extra || "Objet de quete"}</span>
      <span><b>Stock</b>${fmt(getInventoryCount(item.id))}</span>
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

function shopShipStatsHtml(ship){
  return `<div class="shop-item-stat-lines">
      <span><b>Vie</b>${fmt(ship.stats.vie)}</span>
      <span><b>Vitesse</b>${fmt(ship.stats.vitesse)}</span>
      <span><b>Lasers</b>${fmt(ship.stats.maxLasers)}</span>
      <span><b>Générateurs</b>${fmt(ship.stats.maxGenerators)}</span>
      <span><b>Extras</b>${fmt(ship.stats.maxExtras || 3)}</span>
    </div>`;
}

function renderShopDetailStat(line){
  const absorptionMatch = String(line).match(/^(ABSORPTION)\s+(.+)$/i);
  if(absorptionMatch){
    return `<div class="shop-detail-stat featured"><b>ABSORPTION</b><strong>${absorptionMatch[2]}</strong></div>`;
  }
  const match = String(line).match(/^(VIE|BOUCLIER|REGENERATION|VITESSE|CARGO|LASERS|GÉNÉRATEURS|EXTRAS|LANCE-ROQUETTES|LANCE-MISSILES|SPÉCIAL|PACK|MULTIPLICATEUR|STOCK|EFFET|SLOT|BONUS|DURÉE|RÉSERVE)\s+(.+)$/i) || String(line).match(/^(D\S+(?:\s+ROQUETTE|\s+MISSILE)?|PORT\S+[E\u00c9]|CADENCE|RECHARGE|CAPACIT\S+|RECHARGE TOTALE)\s+(.+)$/);
  if(match){
    return `<div class="shop-detail-stat featured"><b>${String(match[1]).toUpperCase()}</b><strong>${match[2]}</strong></div>`;
  }
  return `<div class="shop-detail-stat"><span>${line}</span></div>`;
}
function productStatusText(product){
  if(!productUnlocked(product)) return productLockLabel(product);
  if(product.kind === "premiumPack") return isPremiumActive(store.state?.player) ? `Actif ${premiumRemainingLabel(store.state.player)}` : "Non actif";
  if(product.kind === "ship") return shipStateLabel(product.data);
  if(product.kind === "ammo") return `Stock ${fmt(getAmmoCount(product.id))}`;
  if(product.kind === "drone") return `${store.state.ownedDroneCount || 0} possédé(s)`;
  if(product.kind === "droneFormation") return store.state.activeDroneFormation === product.id ? "ACTIVE" : store.state.ownedDroneFormations?.includes(product.id) ? "POSSÉDÉE" : "DISPONIBLE";
  if(product.kind === "booster") return boosterRemainingLabel(product.data);
  const ownedCount = getInventoryCount(product.id);
  return ownedCount > 0 ? `${ownedCount} possédé${ownedCount > 1 ? "s" : ""}` : "Non possédé";
}

function renderShopListCard(product, selected){
  const unlocked = productUnlocked(product);
  const lockBadge = unlocked ? "" : `<span class="badge lock">${productLockLabel(product)}</span>`;
  if(product.kind === "ship"){
    const ship = product.data;
    const owned = store.state.ownedShips.includes(ship.id);
    const lockReason = productLockLabel(product);
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${owned ? "owned" : ""} ${unlocked ? "" : "locked"}" data-select-shop="${productKey(product)}" ${lockReason ? `title="${lockReason}"` : ""}>
      <div class="shop-list-art"><img src="${ship.img}" alt="${ship.name}">${unlocked ? "" : `<span class="shop-ship-lock" aria-hidden="true">🔒</span>`}</div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${ship.name}</h4><span class="badge">${ship.className}</span></div>
        ${shopShipStatsHtml(ship)}
        <div class="shop-list-meta"><span>${productStatusText(product)}</span>${owned ? "<strong>OK</strong>" : shopPriceHtml(ship.priceType, ship.price)}</div>
        ${lockBadge ? `<div class="shop-list-meta">${lockBadge}</div>` : ""}
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
        <div class="shop-list-meta"><span>${productStatusText(product)}</span>${shopPriceHtml(ammo.priceType, ammo.price)}</div>
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
        <div class="shop-list-meta"><span>${productStatusText(product)}</span>${next ? shopPriceHtml(drone.priceType, next) : "<strong>MAX</strong>"}</div>
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
        <div class="shop-list-meta"><span>${productStatusText(product)}</span>${owned ? "<strong>OK</strong>" : shopPriceHtml(formation.priceType, formation.price)}</div>
      </div>
    </article>`;
  }
  if(product.kind === "premiumPack"){
    const pack = product.data;
    return `<article class="shop-list-card premium-pack ${selected ? "selected" : ""}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art premium"><img src="${pack.img}" alt="${pack.name}"></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${pack.name}</h4><span class="badge">${pack.days} JOURS</span></div>
        <p>${pack.desc}</p>
        <div class="shop-item-stat-lines"><span><b>Bonus</b>Reduction NOVA 5%</span><span><b>Drone</b>Soin +50%</span></div>
        <div class="shop-list-meta"><span>${productStatusText(product)}</span>${shopPriceHtml(pack.priceType, pack.price)}</div>
      </div>
    </article>`;
  }
  if(product.kind === "booster"){
    const booster = product.data;
    const multiplier = shopBoosterMultiplier();
    return `<article class="shop-list-card ${selected ? "selected" : ""} ${productIsOwned(product) ? "owned" : ""}" data-select-shop="${productKey(product)}">
      <div class="shop-list-art"><img src="${booster.img}" alt="${booster.name}"></div>
      <div class="shop-list-copy">
        <div class="shop-list-head"><h4>${booster.name}</h4><span class="badge">+${Math.round(booster.percent * 100)}%</span></div>
        <div class="shop-item-stat-lines"><span><b>Unité</b>5 h</span><span><b>Réserve</b>${boosterRemainingLabel(booster)}</span></div>
        <div class="shop-list-meta"><span>x${multiplier} · ${multiplier * 5} h</span>${shopPriceHtml(booster.priceType, booster.price * multiplier)}</div>
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
      <div class="shop-list-meta"><span>Stock ${fmt(ownedCount)}</span>${shopPriceHtml(item.priceType, item.price)}</div>
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
  if(product.kind === "premiumPack"){
    const pack = product.data;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">PASS PREMIUM</span><span class="badge">${pack.days} JOURS</span></div>
      <div class="shop-detail-art premium"><img src="${pack.img}" alt="${pack.name}"></div>
      <h3>${pack.name}</h3>
      <p class="shop-detail-copy">${pack.desc} Statut actuel : ${premiumRemainingLabel(store.state.player)}.</p>
      <div class="shop-premium-features">${pack.features.map(feature=>`<span>${feature}</span>`).join("")}</div>
      <div class="shop-detail-stats">${productDetailStats(product).slice(0, 3).map(renderShopDetailStat).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix</small>${shopPriceHtml(pack.priceType, pack.price)}</div><button class="blue-button" data-buy-premium-pack="${pack.id}" ${(!canAfford(pack.priceType, pack.price)) ? "disabled" : ""}>ACTIVER</button></div>`;
    return;
  }
  if(product.kind === "booster"){
    const booster = product.data;
    const multiplier = shopBoosterMultiplier();
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">BOOSTER</span><span class="badge">5 H</span></div>
      <div class="shop-detail-art"><img src="${booster.img}" alt="${booster.name}"></div>
      <h3>${booster.name}</h3>
      <p class="shop-detail-copy">${booster.desc} Plusieurs achats prolongent la réserve sans augmenter le bonus.</p>
      ${renderBoosterPurchaseControls()}
      <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix x${multiplier}</small>${shopPriceHtml(booster.priceType, booster.price * multiplier)}</div><button class="blue-button" data-buy-booster="${booster.id}" data-buy-booster-quantity="${multiplier}" ${(!canAfford(booster.priceType, booster.price * multiplier)) ? "disabled" : ""}>ACHETER ${multiplier * 5} H</button></div>`;
    return;
  }
  if(product.kind === "ship"){
    const ship = product.data;
    const owned = store.state.ownedShips.includes(ship.id);
    const active = store.state.activeShip === ship.id;
    detail.innerHTML = `
      <div class="shop-detail-top"><span class="badge">VAISSEAU</span><span class="badge">${ship.className}</span></div>
      <div class="shop-detail-art ${unlocked ? "" : "locked"}"><img src="${ship.img}" alt="${ship.name}">${unlocked ? "" : `<span class="shop-ship-lock detail" aria-hidden="true">🔒</span>`}</div>
      <h3>${ship.name}</h3>
      <p class="shop-detail-copy">${ship.desc}</p>
      ${lockHtml}
      <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Statut</small>${active ? "<strong>Actif</strong>" : owned ? "<strong>Possédé</strong>" : shopPriceHtml(ship.priceType, ship.price)}</div><button class="blue-button" data-buy-shop-ship="${ship.id}" ${(owned || !unlocked || !canAfford(ship.priceType, ship.price)) ? "disabled" : ""}>${owned ? "DÉJÀ ACHETÉ" : "ACHETER"}</button></div>`;
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
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix</small>${shopPriceHtml(ammo.priceType, ammo.price * shopAmmoMultiplier())}</div><button class="blue-button" data-buy-ammo="${ammo.id}" data-buy-ammo-multiplier="${shopAmmoMultiplier()}" ${(!canAfford(ammo.priceType, ammo.price * shopAmmoMultiplier())) ? "disabled" : ""}>ACHETER</button></div>`;
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
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Suivant</small>${next ? shopPriceHtml(drone.priceType, next) : "<strong>MAX</strong>"}</div><button class="blue-button" data-buy-combat-drone ${(!next || !canAfford(drone.priceType, next)) ? "disabled" : ""}>${next ? "ACHETER" : "MAX"}</button></div>`;
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
      <div class="shop-detail-footer"><div class="shop-detail-price"><small>Statut</small>${active ? "<strong>ACTIVE</strong>" : owned ? "<strong>POSSÉDÉE</strong>" : shopPriceHtml(formation.priceType, formation.price)}</div><button class="blue-button" data-buy-drone-formation="${formation.id}" ${(!owned && !canAfford(formation.priceType, formation.price)) ? "disabled" : ""}>${active ? "ACTIVE" : owned ? "ACTIVER" : "ACHETER"}</button></div>`;
    return;
  }
  const item = product.data;
  const itemMultiplier = item.id === "teleportation_fluid" ? shopAmmoMultiplier() : 1;
  detail.innerHTML = `
    <div class="shop-detail-top"><span class="badge">${(item.shopCategory || item.category).toUpperCase()}</span><span class="badge">${item.rarity}</span></div>
    <div class="shop-detail-art"><img src="${item.img}" alt="${item.name}"></div>
    <h3>${item.name}</h3>
    <p class="shop-detail-copy">${item.desc}</p>
    ${lockHtml}
    <div class="shop-detail-stats">${productDetailStats(product).map(renderShopDetailStat).join("")}</div>
    ${renderItemPurchaseControls(item)}
    <div class="shop-detail-footer"><div class="shop-detail-price"><small>Prix${itemMultiplier > 1 ? ` x${fmt(itemMultiplier)}` : ""}</small>${shopPriceHtml(item.priceType, item.price * itemMultiplier)}</div><button class="blue-button" data-buy-item="${item.id}" data-buy-item-multiplier="${itemMultiplier}" ${(!canAfford(item.priceType, item.price * itemMultiplier)) ? "disabled" : ""}>ACHETER</button></div>`;
}

export function renderShop(){
  const grid = document.getElementById("shopGrid");
  const title = document.getElementById("shopSectionTitle");
  const count = document.getElementById("shopResultCount");
  const meta = SHOP_FILTER_META[store.shopFilter] || SHOP_FILTER_META.vaisseau;
  const list = shopCatalog().filter(productMatchesFilter);
  if(title) title.textContent = meta.title;
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
