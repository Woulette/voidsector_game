import { fmt } from "../../core/utils.js";
import { basePriceLabel, hasCurrencyDiscount, priceLabel } from "../../core/store.js";

function priceHtml(priceType, price){
  const current = `<strong class="${priceType === "premium" ? "shop-price premium" : "shop-price credits"}">${priceLabel(priceType, price)}</strong>`;
  if(!hasCurrencyDiscount(priceType, price)) return current;
  return `<span class="shop-price-discount"><s>${basePriceLabel(priceType, price)}</s>${current}</span>`;
}

function renderCpuPanel({missileState}){
  const state = missileState || {};
  if(!state.launcher) return `<div class="combat-empty">Aucun lance-missile équipé sur le vaisseau.</div>`;
  const progress = Math.max(0, Math.min(100, Number(state.progress || 0)));
  const ready = !!state.ready;
  const ammoName = state.ammo ? state.ammo.name : "Aucun missile sélectionné";
  const stock = state.ammo ? fmt(state.stock || 0) : "0";
  const damage = state.ammo ? `${fmt((state.ammo.damageMin ?? state.ammo.damage ?? 0) * (state.capacity || 1))}-${fmt((state.ammo.damageMax ?? state.ammo.damage ?? 0) * (state.capacity || 1))}` : "0";
  const status = state.ammo
    ? ready ? "Charge complète" : `Chargement ${state.loaded || 0}/${state.capacity || 3}`
    : "Choisis Missile 1 ou Missile 2 dans Munitions.";
  return `<div class="combat-panel-grid cpu-panel-grid">
    <article class="combat-pick-card missile-launcher-card ${ready ? "ready" : ""}" draggable="true" data-combat-missile-cpu="1">
      <img class="combat-extra-icon" src="${state.launcher.img}" alt="${state.launcher.name}">
      <div>
        <strong>${state.launcher.name}</strong>
        <span>${ammoName} · stock ${stock}</span>
        <small>${status} · salve ${damage} dégâts</small>
        <div class="missile-charge-bar"><i style="width:${progress}%"></i></div>
      </div>
      <small>Glisse ce CPU dans un slot 1-9 pour tirer.</small>
    </article>
  </div>`;
}

function renderExtrasPanel({extras, repairState, repairBotActive, extraBonus, repairBotDelay}){
  if(!extras.length) return `<div class="combat-empty">Aucun extra équipé sur le vaisseau.</div>`;
  return `<div class="combat-panel-grid">${extras.map(item=>{
    const effect = item.effect || {};
    if(effect.repairBot){
      const status = repairBotActive ? "Actif" : repairState.ok ? "Prêt à réparer" : repairState.reason;
      const buttonLabel = repairBotActive ? "En cours" : "Activer";
      const disabled = repairBotActive || !repairState.ok;
      return `<article class="combat-pick-card ${disabled ? "disabled" : ""}" draggable="true" data-combat-extra-slot="${item.id}">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div><strong>${item.name}</strong><span>${item.stats?.extra || "Répare la coque"}</span><small>${status}</small></div>
        <div class="slot-actions"><button class="blue-button small" data-combat-extra-use="${item.id}" ${disabled ? "disabled" : ""}>${buttonLabel}</button><button class="blue-button small secondary" data-combat-extra-slot="${item.id}" type="button">Slot</button></div>
      </article>`;
    }
    if(effect.repairBotAuto){
      const status = extraBonus?.repairBot ? `Surveille le Drone de Réparation IA · délai ${repairBotDelay}s` : "Équipe aussi le Drone de Réparation IA pour l'utiliser.";
      return `<article class="combat-pick-card">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div><strong>${item.name}</strong><span>${item.stats?.extra || "Activation automatique"}</span><small>${status}</small></div>
        <button class="blue-button small" type="button" disabled>Passif</button>
      </article>`;
    }
    if(effect.portgun){
      return `<article class="combat-pick-card" draggable="true" data-combat-extra-slot="${item.id}">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div><strong>${item.name}</strong><span>${item.stats?.extra || "Teleportation avec fluide"}</span><small>Ouvre la carte secteur pour choisir une destination.</small></div>
        <div class="slot-actions"><button class="blue-button small" data-combat-extra-use="${item.id}" type="button">Carte</button><button class="blue-button small secondary" data-combat-extra-slot="${item.id}" type="button">Slot</button></div>
      </article>`;
    }
    return `<article class="combat-pick-card">
      <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
      <div><strong>${item.name}</strong><span>${item.stats?.extra || "Bonus passif"}</span><small>Effet passif actif.</small></div>
      <button class="blue-button small" type="button" disabled>Passif</button>
    </article>`;
  }).join("")}</div>`;
}

function renderFormationsPanel({droneFormations, ownedDroneFormations, activeDroneFormation}){
  return `<div class="combat-panel-grid">${droneFormations.map(formation=>{
    const owned = ownedDroneFormations?.includes(formation.id);
    const active = activeDroneFormation === formation.id;
    const disabled = !owned;
    const status = active ? "Actif" : owned ? "Désactivé" : "À acheter au magasin drones";
    return `<button class="combat-pick-card ${disabled ? "disabled" : ""}" draggable="${owned ? "true" : "false"}" data-combat-drone-formation="${formation.id}" type="button">
      <img class="combat-extra-icon" src="${formation.img}" alt="${formation.name}">
      <div><strong>${formation.name}</strong><span>${formation.stats?.bonus || "Aucun bonus"}</span><small>${status} · ${formation.stats?.malus || "Aucun malus"}</small></div>
      <span class="badge">${active ? "ACTIF" : owned ? "DÉSACTIVÉ" : "LOCK"}</span>
    </button>`;
  }).join("")}</div>`;
}

function renderShopPanel({ammoTypes, canAfford, getAmmoCount}){
  const purchasableAmmo = ammoTypes.filter(ammo=>ammo.shop !== false);
  return `<div class="combat-panel-grid combat-shop-grid">${purchasableAmmo.map(ammo=>{
    const purchaseMultiplier = ammo.weaponClass === "laser" ? 1 : 100;
    const packAmount = Math.max(1, Number(ammo.amount || 1)) * purchaseMultiplier;
    const packPrice = Math.max(0, Number(ammo.price || 0)) * purchaseMultiplier;
    return `<article class="combat-pick-card combat-shop-card">
      ${ammo.img ? `<img class="combat-ammo-icon" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>`}
      <div class="combat-shop-copy"><strong>${ammo.name}</strong><span>Pack ${fmt(packAmount)}</span><small>${priceHtml(ammo.priceType, packPrice)}</small></div>
      <button class="combat-buy-icon" data-combat-buy-ammo="${ammo.id}" data-combat-buy-multiplier="${purchaseMultiplier}" ${(!canAfford(ammo.priceType, packPrice)) ? "disabled" : ""} aria-label="Acheter ${ammo.name}" title="Acheter">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-2 8H8L6 3H3"/><path d="M8 18a1.4 1.4 0 1 0 0 .1M18 18a1.4 1.4 0 1 0 0 .1"/></svg>
      </button>
    </article>`;
  }).join("")}</div>`;
}

function renderAmmoPanel({ammoTypes, getAmmoCount}){
  return `<div class="combat-panel-grid combat-ammo-grid">${ammoTypes.map(ammo=>{
    const count = getAmmoCount(ammo.id);
    return `<button class="combat-pick-card combat-ammo-card ${count ? "" : "disabled"}" draggable="${count ? "true" : "false"}" data-combat-ammo-id="${ammo.id}" data-combat-ammo-class="${ammo.weaponClass}" type="button">
      ${ammo.img ? `<img class="combat-ammo-icon" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>`}
      <div class="combat-ammo-copy"><strong>${ammo.name}</strong><span>Stock ${fmt(count)}</span></div>
    </button>`;
  }).join("")}</div>`;
}

export function renderQuickPanelContent({tab, ammoTypes, extras, droneFormations, ownedDroneFormations, activeDroneFormation, repairState, repairBotActive, extraBonus, repairBotDelay, canAfford, getAmmoCount, laserVolleyCount, missileState}){
  if(tab === "skills") return `<div class="combat-empty">Les compétences de vaisseau seront branchées ici.</div>`;
  if(tab === "cpu") return renderCpuPanel({missileState});
  if(tab === "extras") return renderExtrasPanel({extras, repairState, repairBotActive, extraBonus, repairBotDelay});
  if(tab === "formations") return renderFormationsPanel({droneFormations, ownedDroneFormations, activeDroneFormation});
  if(tab === "shop") return renderShopPanel({ammoTypes, canAfford, getAmmoCount});
  return renderAmmoPanel({ammoTypes, getAmmoCount, laserVolleyCount});
}

export function updateQuickPanelTabs(panel, activeTab, tabOffset = 0){
  const tabs = Array.from(panel.querySelectorAll("[data-combat-panel-tab]"));
  const start = Math.min(Math.max(0, tabOffset), Math.max(0, tabs.length - 5));
  tabs.forEach((btn,index)=>{
    btn.classList.toggle("active", btn.dataset.combatPanelTab === activeTab);
    btn.classList.toggle("hidden", index < start || index >= start + 5);
  });
}
