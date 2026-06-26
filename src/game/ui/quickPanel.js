import { fmt } from "../../core/utils.js";
import { getCurrencyPrice, hasCurrencyDiscount } from "../../core/store.js";
import { currencyAmountHtml } from "../../ui/currencyIcons.js";

function priceHtml(priceType, price){
  const tone = priceType === "premium" ? "premium" : "credits";
  const current = `<strong class="combat-shop-price-current ${tone}">${currencyAmountHtml(priceType, getCurrencyPrice(priceType, price))}</strong>`;
  if(!hasCurrencyDiscount(priceType, price)) return `<span class="combat-shop-price-single">${current}</span>`;
  return `<span class="combat-shop-price-discount">
    <del class="combat-shop-price-old">${currencyAmountHtml(priceType, price)}</del>
    ${current}
  </span>`;
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

function formatPercentValue(value){
  return new Intl.NumberFormat("fr-FR", {maximumFractionDigits:1}).format(Math.max(0, Number(value || 0)));
}

function formatDurationLabel(milliseconds){
  const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  if(seconds >= 60 && seconds % 60 === 0){
    const minutes = seconds / 60;
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
}

function renderCardFacts(facts = []){
  return `<div class="combat-card-facts">${facts.map(([label, value])=>`
    <span class="combat-card-fact-label">${label}</span>
    <span class="combat-card-fact-value">${value}</span>
  `).join("")}</div>`;
}

function renderFormationSections(formation){
  const labels = {
    shieldMultiplier:"bouclier",
    regenMultiplier:"régénération",
    laserDamageMultiplier:"dégâts laser",
    speedMultiplier:"vitesse",
    rocketDamageMultiplier:"dégâts roquettes",
    missileDamageMultiplier:"dégâts missiles"
  };
  const lines = Object.entries(formation?.effect || {})
    .filter(([key, value])=>labels[key] && Number(value || 1) !== 1)
    .map(([key, value])=>{
      const percent = Math.round((Number(value || 1) - 1) * 100);
      return {
        tone:percent > 0 ? "bonus" : "malus",
        text:`${percent > 0 ? "+" : ""}${percent} % ${labels[key]}`
      };
    });
  const section = (label, values, tone)=>`<div class="combat-card-section ${tone}">
    <b>${label}</b>
    <div>${values.length ? values.map(value=>`<span>${value.text}</span>`).join("") : "<span>Aucun</span>"}</div>
  </div>`;
  return [
    section("Bonus :", lines.filter(line=>line.tone === "bonus"), "bonus"),
    section("Malus :", lines.filter(line=>line.tone === "malus"), "malus")
  ].join("");
}

function getExtraCardDetails(item, repairBotDelay){
  const effect = item?.effect || {};
  if(effect.repairBot){
    return [
      ["Effet", `Répare ${formatPercentValue(Number(effect.repairBotHealRate || 0) * 100)} % coque / s`],
      ["Délai", `${Math.max(1, Number(effect.repairBotDelay || 5))} secondes`]
    ];
  }
  if(effect.repairBotAuto){
    return [
      ["Effet", "Active le drone automatiquement"],
      ["Délai", `${Math.max(1, Number(repairBotDelay || 5))} secondes`]
    ];
  }
  if(effect.autoRocket) return [["Effet", "Tir automatique roquettes"], ["Type", "Passif"]];
  if(effect.autoMissile) return [["Effet", "Tir automatique missiles"], ["Type", "Passif"]];
  if(effect.rocketCooldownMultiplier){
    return [
      ["Effet", `Recharge roquettes -${Math.round((1 - Number(effect.rocketCooldownMultiplier)) * 100)} %`],
      ["Type", "Passif"]
    ];
  }
  if(effect.portgun) return [["Effet", "Téléportation de secteur"], ["Coût", "1 fluide"]];
  return [["Effet", item?.stats?.extra || "Bonus actif"], ["Type", "Passif"]];
}

function renderExtrasPanel({extras, repairState, repairBotActive, extraBonus, repairBotDelay}){
  if(!extras.length) return `<div class="combat-empty">Aucun extra équipé sur le vaisseau.</div>`;
  return `<div class="combat-panel-grid combat-info-grid combat-extras-grid">${extras.map(item=>{
    const effect = item.effect || {};
    const facts = renderCardFacts(getExtraCardDetails(item, repairBotDelay));
    if(effect.repairBot){
      const buttonLabel = repairBotActive ? "EN COURS" : repairState.ok ? "ACTIVER" : "ATTENTE";
      const disabled = repairBotActive || !repairState.ok;
      return `<article class="combat-info-card ${disabled ? "disabled" : ""}" draggable="true" data-combat-extra-slot="${item.id}">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div class="combat-info-copy"><strong title="${item.name}">${item.name}</strong>${facts}</div>
        <div class="combat-card-actions">
          <button class="blue-button small" data-combat-extra-use="${item.id}" title="${repairState.reason || ""}" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
          <button class="blue-button small secondary" data-combat-extra-slot="${item.id}" type="button">SLOT</button>
        </div>
      </article>`;
    }
    if(effect.repairBotAuto){
      return `<article class="combat-info-card ${extraBonus?.repairBot ? "" : "disabled"}">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div class="combat-info-copy"><strong title="${item.name}">${item.name}</strong>${facts}</div>
        <span class="combat-card-status">PASSIF</span>
      </article>`;
    }
    if(effect.portgun){
      return `<article class="combat-info-card" draggable="true" data-combat-extra-slot="${item.id}">
        <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
        <div class="combat-info-copy"><strong title="${item.name}">${item.name}</strong>${facts}</div>
        <div class="combat-card-actions">
          <button class="blue-button small" data-combat-extra-use="${item.id}" type="button">CARTE</button>
          <button class="blue-button small secondary" data-combat-extra-slot="${item.id}" type="button">SLOT</button>
        </div>
      </article>`;
    }
    return `<article class="combat-info-card">
      <img class="combat-extra-icon" src="${item.img}" alt="${item.name}">
      <div class="combat-info-copy"><strong title="${item.name}">${item.name}</strong>${facts}</div>
      <span class="combat-card-status">PASSIF</span>
    </article>`;
  }).join("")}</div>`;
}

function renderFormationsPanel({droneFormations, ownedDroneFormations, activeDroneFormation}){
  const ownedIds = new Set(Array.isArray(ownedDroneFormations) ? ownedDroneFormations : []);
  const ownedFormations = droneFormations.filter(formation=>ownedIds.has(formation.id));
  if(!ownedFormations.length) return `<div class="combat-empty">Aucune formation de drones achetée.</div>`;
  return `<div class="combat-panel-grid combat-info-grid combat-formations-grid">${ownedFormations.map(formation=>{
    const active = activeDroneFormation === formation.id;
    return `<article class="combat-info-card combat-formation-card ${active ? "active" : ""}" draggable="true" data-combat-drone-formation="${formation.id}">
      <img class="combat-extra-icon" src="${formation.img}" alt="${formation.name}">
      <div class="combat-info-copy">
        <strong title="${formation.name}">${formation.name}</strong>
        <div class="combat-formation-stats">${renderFormationSections(formation)}</div>
      </div>
      <button class="combat-formation-toggle ${active ? "active" : ""}" ${active ? "" : `data-combat-formation-use="${formation.id}"`} type="button" aria-label="${active ? "Formation active" : `Activer ${formation.name}`}" title="${active ? "Formation active" : "Activer cette formation"}" ${active ? "disabled" : ""}>
        ${active
          ? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m7.8 12.2 2.7 2.7 5.8-6.1"></path></svg>`
          : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"></path><path d="M7.1 5.8a8 8 0 1 0 9.8 0"></path></svg>`}
      </button>
    </article>`;
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

function renderShipSkillsPanel({shipAbilityStates}){
  const states = Array.isArray(shipAbilityStates) ? shipAbilityStates.slice(0, 3) : [];
  if(!states.length) return `<div class="combat-empty">Ce vaisseau ne possède aucune compétence active.</div>`;
  const effectLabel = state=>{
    if(state.effectType === "enemy_poison_bomb"){
      return `${fmt(Number(state.radius || 0))} portee, ${fmt(Number(state.poisonDamagePerSecond || 0))} HP/s`;
    }
    if(state.effectType === "laser_double_strike"){
      const chargeSeconds = Math.max(1, Number(state.chargeMs || 3_000) / 1000);
      return `Charge ${fmt(chargeSeconds)} s, prochain tir laser double`;
    }
    return `${formatPercentValue(Number(state.lifeStealRatio || 0) * 100)} % vol de vie (${state.weaponClass === "laser" ? "laser" : state.weaponClass || "arme"})`;
  };
  return `<div class="combat-panel-grid combat-info-grid combat-skill-grid">${states.map((state, index)=>{
    const activeSeconds = Math.ceil(Math.max(0, Number(state.activeRemainingMs || 0)) / 1000);
    const cooldownSeconds = Math.ceil(Math.max(0, Number(state.cooldownRemainingMs || 0)) / 1000);
    const disabled = activeSeconds > 0 || cooldownSeconds > 0;
    const actionLabel = activeSeconds > 0
      ? `ACTIF ${activeSeconds} S`
      : cooldownSeconds > 0
        ? `RECHARGE ${cooldownSeconds} S`
        : "ACTIVER";
    const facts = renderCardFacts([
      ["Effet", effectLabel(state)],
      ["Durée", formatDurationLabel(state.durationMs)],
      ["Recharge", formatDurationLabel(state.cooldownMs)]
    ]);
    return `<article class="combat-info-card combat-skill-card ${disabled ? "disabled" : "ready"}">
      <img class="combat-extra-icon" src="${state.icon || "assets/icons/absorbing_fire.svg"}" alt="">
      <div class="combat-info-copy"><strong title="${state.name}">${state.name}</strong>${facts}</div>
      <button class="blue-button small combat-skill-action" data-use-ship-ability="${index}" type="button" ${disabled ? "disabled" : ""}>${actionLabel}</button>
    </article>`;
  }).join("")}</div>`;
}

export function renderQuickPanelContent({tab, ammoTypes, extras, droneFormations, ownedDroneFormations, activeDroneFormation, repairState, repairBotActive, extraBonus, repairBotDelay, canAfford, getAmmoCount, laserVolleyCount, missileState, shipAbilityStates}){
  if(tab === "skills") return renderShipSkillsPanel({shipAbilityStates});
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
