import { fmt } from "../../core/utils.js";

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

function renderShopPanel({ammoTypes, canAfford}){
  return `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
    const subtitle = ammo.weaponClass === "rocket"
      ? `${ammo.damageMin}-${ammo.damageMax} · ${ammo.range} portée · 1 roquette / tir`
      : `x${ammo.multiplier} dégâts lasers · ${ammo.cooldown.toFixed(2)}s`;
    return `<article class="combat-pick-card">
      <div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>
      <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>Pack ${fmt(ammo.amount)} · ${fmt(ammo.price)} ${ammo.priceType === "premium" ? "NOVA" : "CR"}</small></div>
      <button class="blue-button small" data-combat-buy-ammo="${ammo.id}" ${(!canAfford(ammo.priceType, ammo.price)) ? "disabled" : ""}>Acheter</button>
    </article>`;
  }).join("")}</div>`;
}

function renderAmmoPanel({ammoTypes, getAmmoCount, laserVolleyCount}){
  return `<div class="combat-panel-grid">${ammoTypes.map(ammo=>{
    const count = getAmmoCount(ammo.id);
    const subtitle = ammo.weaponClass === "rocket"
      ? `Stock ${fmt(count)} · 1 roquette / tir · ${ammo.cooldown.toFixed(0)}s`
      : `Stock ${fmt(count)} · ${laserVolleyCount || 1} conso / salve`;
    return `<button class="combat-pick-card ${count ? "" : "disabled"}" draggable="${count ? "true" : "false"}" data-combat-ammo-id="${ammo.id}" type="button">
      <div class="ammo-glyph" style="--ammo-color:${ammo.color}">${ammo.short}</div>
      <div><strong>${ammo.name}</strong><span>${subtitle}</span><small>${ammo.weaponClass === "rocket" ? `${ammo.damageMin}-${ammo.damageMax} dégâts · ${ammo.range} portée` : `Glisse dans un slot 1-9 · dégâts lasers x${ammo.multiplier}`}</small></div>
    </button>`;
  }).join("")}</div>`;
}

export function renderQuickPanelContent({tab, ammoTypes, extras, repairState, repairBotActive, extraBonus, repairBotDelay, canAfford, getAmmoCount, laserVolleyCount}){
  if(tab === "skills") return `<div class="combat-empty">Les compétences de vaisseau seront branchées ici.</div>`;
  if(tab === "extras") return renderExtrasPanel({extras, repairState, repairBotActive, extraBonus, repairBotDelay});
  if(tab === "shop") return renderShopPanel({ammoTypes, canAfford});
  return renderAmmoPanel({ammoTypes, getAmmoCount, laserVolleyCount});
}

export function updateQuickPanelTabs(panel, activeTab){
  panel.querySelectorAll("[data-combat-panel-tab]").forEach(btn=>btn.classList.toggle("active", btn.dataset.combatPanelTab === activeTab));
}
