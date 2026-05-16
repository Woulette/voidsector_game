import { fmt } from "../../core/utils.js";

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
      const status = extraBonus?.repairBot ? `Surveille le Robot Réparateur · délai ${repairBotDelay}s` : "Équipe aussi le Robot Réparateur pour l'utiliser.";
      return `<article class="combat-pick-card">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div><strong>${item.name}</strong><span>${item.stats?.extra || "Activation automatique"}</span><small>${status}</small></div>
        <button class="blue-button small" type="button" disabled>Passif</button>
      </article>`;
    }
    return `<article class="combat-pick-card">
      <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
      <div><strong>${item.name}</strong><span>${item.stats?.extra || "Bonus passif"}</span><small>Effet passif actif.</small></div>
      <button class="blue-button small" type="button" disabled>Passif</button>
    </article>`;
  }).join("")}</div>`;
}

function renderShopPanel({ammoTypes, canAfford, getAmmoCount}){
  return `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
    const stock = getAmmoCount ? getAmmoCount(ammo.id) : 0;
    const subtitle = ammo.weaponClass === "missile"
      ? `${fmt(ammo.damageMin)}-${fmt(ammo.damageMax)} dégâts - ${ammo.range} portée - 3 missiles / salve`
      : ammo.weaponClass === "rocket"
      ? `${ammo.damageMin}-${ammo.damageMax} - ${ammo.range} portée - 1 roquette / tir`
      : `Multiplicateur x${ammo.multiplier}`;
    const meta = ammo.weaponClass === "laser"
      ? `Stock ${fmt(stock)} - Pack ${fmt(ammo.amount)} - ${fmt(ammo.price)} ${ammo.priceType === "premium" ? "NOVA" : "CR"}`
      : `Pack ${fmt(ammo.amount)} - ${fmt(ammo.price)} ${ammo.priceType === "premium" ? "NOVA" : "CR"}`;
    return `<article class="combat-pick-card">
      ${ammo.img ? `<img class="combat-ammo-icon" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>`}
      <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>${meta}</small></div>
      <button class="blue-button small" data-combat-buy-ammo="${ammo.id}" ${(!canAfford(ammo.priceType, ammo.price)) ? "disabled" : ""}>Acheter</button>
    </article>`;
  }).join("")}</div>`;
}

function renderAmmoPanel({ammoTypes, getAmmoCount, laserVolleyCount}){
  return `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
    const count = getAmmoCount(ammo.id);
    const subtitle = ammo.weaponClass === "missile"
      ? `Stock ${fmt(count)} · charge le lance-missile`
      : ammo.weaponClass === "rocket"
      ? `Stock ${fmt(count)} · 1 roquette / tir · ${ammo.cooldown.toFixed(0)}s`
      : `Stock ${fmt(count)} · ${laserVolleyCount || 1} conso / salve`;
    const detail = ammo.weaponClass === "missile"
      ? `${fmt(ammo.damageMin)}-${fmt(ammo.damageMax)} dégâts par missile · 3 consommés par salve`
      : ammo.weaponClass === "rocket"
        ? `${ammo.damageMin}-${ammo.damageMax} dégâts · ${ammo.range} portée`
        : `Glisse dans un slot 1-9 - Multiplicateur x${ammo.multiplier} - Pack ${fmt(ammo.amount)}`;
    return `<button class="combat-pick-card ${count ? "" : "disabled"}" draggable="${count ? "true" : "false"}" data-combat-ammo-id="${ammo.id}" data-combat-ammo-class="${ammo.weaponClass}" type="button">
      ${ammo.img ? `<img class="combat-ammo-icon" src="${ammo.img}" alt="${ammo.name}">` : `<div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>`}
      <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>${detail}</small></div>
    </button>`;
  }).join("")}</div>`;
}

export function renderQuickPanelContent({tab, ammoTypes, extras, repairState, repairBotActive, extraBonus, repairBotDelay, canAfford, getAmmoCount, laserVolleyCount, missileState}){
  if(tab === "skills") return `<div class="combat-empty">Les compétences de vaisseau seront branchées ici.</div>`;
  if(tab === "cpu") return renderCpuPanel({missileState});
  if(tab === "extras") return renderExtrasPanel({extras, repairState, repairBotActive, extraBonus, repairBotDelay});
  if(tab === "shop") return renderShopPanel({ammoTypes, canAfford, getAmmoCount});
  return renderAmmoPanel({ammoTypes, getAmmoCount, laserVolleyCount});
}

export function updateQuickPanelTabs(panel, activeTab){
  panel.querySelectorAll("[data-combat-panel-tab]").forEach(btn=>btn.classList.toggle("active", btn.dataset.combatPanelTab === activeTab));
}
