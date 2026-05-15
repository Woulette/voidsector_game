import { portals, skills } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import {
  RANK_POINT_RULES,
  RANK_TABLE,
  canAfford,
  getAllRawMaterials,
  getCurrentRank,
  getLeaderboardRows,
  getMaterialCount,
  getNextRank,
  getPortalPieces,
  getRankBreakdown,
  getRankProgress,
  getRawMaterial,
  getMaterialStorageCap,
  getMaterialStorageCapAt,
  getRefineryShipmentData,
  getRefineryShipmentProgress,
  getRefineryShipmentRushCost,
  getRefineryProductionRate,
  getRefineryProductionRateAt,
  getRefineryRecipes,
  getRefineryModuleLevel,
  getRefineryModuleUpgradeData,
  getRefineryMaterialLevel,
  getRefineryRushCost,
  getRefineryTransportCapacity,
  getRefineryTransportCapacityAt,
  getRefineryUpgradeProgress,
  getRefineryUpgradeData,
  getShippableRefineryMaterials,
  getSkillLevel,
  getSkillUpgradeData,
  isRefineryProductionEnabled,
  isPortalUnlocked,
  priceLabel,
  store
} from "../core/store.js";
import { rankIcon, rankInline } from "./renderShared.js";

export function renderPortals(){
  const grid = document.getElementById("portalGrid");
  if(!grid) return;
  grid.innerHTML = portals.map(p=>{
    const pieces = getPortalPieces(p.id);
    const unlocked = isPortalUnlocked(p.id);
    const reqLevelOk = store.state.player.level >= p.requirement.level;
    const canEnter = unlocked && reqLevelOk && !!store.state.activeShip;
    const canUnlockPieces = !unlocked && pieces >= p.piecesRequired;
    const canUnlockNova = !unlocked && canAfford("premium", p.novaCost);
    const clearCount = Math.max(0, Number(store.state.completedPortals?.[p.id] || 0));
    const actionHtml = unlocked
      ? `<button class="blue-button small" data-start-portal="${p.id}" ${canEnter ? "" : "disabled"}>${canEnter ? "Entrer" : !store.state.activeShip ? "Équiper un vaisseau" : "Prérequis manquants"}</button>`
      : `<button class="blue-button secondary small" data-unlock-portal-pieces="${p.id}" ${canUnlockPieces ? "" : "disabled"}>Utiliser ${fmt(p.piecesRequired)} pièces</button><button class="blue-button small" data-unlock-portal-nova="${p.id}" ${canUnlockNova ? "" : "disabled"}>Payer ${fmt(p.novaCost)} NOVA</button>`;
    return `<article class="portal-card ${canEnter ? "ready" : unlocked ? "unlocked" : "locked"}">
      <img src="${p.img}" alt="${p.name}">
      <div class="portal-card-head"><h3>${p.name}</h3><span class="badge">${p.level}</span></div>
      <div class="portal-state">${unlocked ? "DÉVERROUILLÉ" : "SCELLÉ"} · ${reqLevelOk ? "Niveau OK" : `Niv ${p.requirement.level}`}</div>
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
  const grids = document.querySelectorAll("[data-skill-grid], #skillGrid");
  if(!grids.length) return;
  const html = skills.map(skill=>{
    const level = getSkillLevel(skill.id);
    const maxLevel = Number(skill.maxLevel || skill.levels.length || 0);
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
  grids.forEach(grid=>{ grid.innerHTML = html; });
}

export function renderRefinery(){
  const panel = document.getElementById("refineryPanel");
  if(!panel) return;
  const materials = getAllRawMaterials();
  const nodePositions = {
    cuivre_orbital:[13, 8],
    zinc_spatial:[9, 24],
    nickel_brut:[8, 47],
    titane_fissure:[8, 72],
    silice_conductrice:[13, 88],
    alliage_cuivre_zinc:[34, 24],
    catalyseur_quantique:[30, 47],
    plaque_nickel_titane:[34, 72],
    conducteur_renforce:[58, 36],
    blindage_composite:[58, 58],
    noyau_astra:[88, 47]
  };
  const modulePositions = {
    transport:[86, 16],
    storage:[86, 80]
  };
  const labelForKind = kind => ({
    raw:"BRUT",
    refined:"RAFFINE",
    advanced:"AVANCE",
    special:"SPECIAL",
    final:"FINAL"
  }[kind] || "MAT");
  const costText = costs => Object.entries(costs || {}).map(([id, amount])=>{
    const material = getRawMaterial(id);
    return `${fmt(amount)} ${material?.short || id.toUpperCase()}`;
  }).join(" + ");
  const upgradeText = data => {
    if(!data) return "MAX";
    const matText = costText(data.materials);
    return `${fmt(data.credits)} CR${matText ? ` + ${matText}` : ""}`;
  };
  const durationText = ms => {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if(hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    if(minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
    return `${seconds}s`;
  };
  const stockBar = materials.map(material=>{
    const count = getMaterialCount(material.id);
    const cap = getMaterialStorageCap(material.id);
    const fill = Math.max(0, Math.min(100, cap ? (count / cap) * 100 : 0));
    return `<article class="sky-stock ${material.kind || ""}">
      <span>${material.name}</span>
      <strong>${fmt(count)}</strong>
      <div class="sky-stock-meter"><i style="width:${fill}%"></i></div>
      <small>${fmt(cap)}</small>
    </article>`;
  }).join("");
  const refineryTab = ["forge", "shipment", "stats"].includes(store.selectedRefineryTab) ? store.selectedRefineryTab : "forge";
  const refineryTabs = `<div class="sky-refinery-tabs">
    <button class="${refineryTab === "forge" ? "active" : ""}" data-refinery-tab="forge">Raffinerie</button>
    <button class="shipment ${refineryTab === "shipment" ? "active" : ""}" data-refinery-tab="shipment">Expedition</button>
    <button class="stats ${refineryTab === "stats" ? "active" : ""}" data-refinery-tab="stats">Stats</button>
  </div>`;
  const panelHead = panel.closest(".refinery-panel")?.querySelector(".panel-head");
  if(panelHead){
    panelHead.querySelector(".sky-refinery-tabs")?.remove();
    panelHead.insertAdjacentHTML("beforeend", refineryTabs);
  }
  const shippableMaterials = getShippableRefineryMaterials();
  const selectedShipmentMaterial = shippableMaterials.some(material=>material.id === store.selectedRefineryShipmentMaterial)
    ? store.selectedRefineryShipmentMaterial
    : shippableMaterials[0]?.id;
  if(selectedShipmentMaterial && store.selectedRefineryShipmentMaterial !== selectedShipmentMaterial){
    store.selectedRefineryShipmentMaterial = selectedShipmentMaterial;
  }
  const shipmentAmount = Math.max(1, Math.ceil(Number(store.selectedRefineryShipmentAmount || 30)));
  const shipmentData = selectedShipmentMaterial ? getRefineryShipmentData(selectedShipmentMaterial, shipmentAmount) : null;
  const shipmentJob = getRefineryShipmentProgress();
  const shipmentRush = shipmentJob ? getRefineryShipmentRushCost() : null;
  const shipmentMaterialOptions = shippableMaterials.map(material=>{
    const selected = material.id === selectedShipmentMaterial ? "selected" : "";
    return `<option value="${material.id}" ${selected}>${material.name} - ${fmt(getMaterialCount(material.id))}</option>`;
  }).join("");
  const shipmentCards = shippableMaterials.map(material=>{
    const count = getMaterialCount(material.id);
    const cap = getMaterialStorageCap(material.id);
    const fill = Math.max(0, Math.min(100, cap ? (count / cap) * 100 : 0));
    const selected = material.id === selectedShipmentMaterial ? "selected" : "";
    return `<button class="sky-shipment-material ${material.kind || ""} ${selected}" data-refinery-shipment-pick="${material.id}">
      <img src="${material.img}" alt="${material.name}">
      <span>${labelForKind(material.kind)}</span>
      <strong>${material.name}</strong>
      <b>${fmt(count)}</b>
      <i><em style="width:${fill}%"></em></i>
    </button>`;
  }).join("");
  const shipmentPanel = `<section class="sky-shipment-page">
    <div class="sky-shipment-page-head">
      <div>
        <span class="tiny">EXPEDITION</span>
        <h3>Envoyer des materiaux vers ${shipmentJob?.shipName || shipmentData?.ship?.name || "le vaisseau"}</h3>
      </div>
      <div class="sky-shipment-cap">
        <span>Module transport</span>
        <strong>${fmt(getRefineryTransportCapacity())} / envoi</strong>
      </div>
    </div>
    ${shipmentJob ? `<section class="sky-shipment-current">
      <div>
        <span>Expedition en cours</span>
        <strong>${fmt(shipmentJob.amount)} ${shipmentJob.materialName}</strong>
        <small>Destination : ${shipmentJob.shipName}</small>
      </div>
      <div class="sky-shipment-meter"><i style="width:${shipmentJob.percent}%"></i></div>
      <div class="sky-shipment-current-meta">
        <span>Temps restant <b>${durationText(shipmentJob.remaining)}</b></span>
        <span>Terminer <b>${fmt(shipmentRush?.cost || 0)} NOVA</b></span>
      </div>
      <button class="sky-shipment-btn" ${shipmentRush?.canAfford ? "" : "disabled"} data-rush-refinery-shipment>Terminer maintenant</button>
    </section>` : `<section class="sky-shipment-builder">
      <div class="sky-shipment-material-grid">${shipmentCards}</div>
      <aside class="sky-shipment-order">
        <span class="tiny">ORDRE D'ENVOI</span>
        <h3>${shipmentData?.material?.name || "Materiau"}</h3>
        <label>
          <span>Materiau</span>
          <select data-refinery-shipment-material>${shipmentMaterialOptions}</select>
        </label>
        <label>
          <span>Quantite</span>
          <input data-refinery-shipment-amount type="number" min="1" max="${fmt(shipmentData?.maxAmount || 0).replace(/\s/g, "")}" step="1" value="${shipmentData?.amount || shipmentAmount}">
        </label>
        <div class="sky-shipment-summary">
          <span>Max possible <b>${fmt(shipmentData?.maxAmount || 0)}</b></span>
          <span>Cout <b>${fmt(shipmentData?.credits || 0)} CR</b></span>
          <span>Duree <b>${durationText(shipmentData?.duration || 0)}</b></span>
          <span>Soute libre <b>${fmt(shipmentData?.shipFree || 0)}</b></span>
        </div>
        <button class="sky-shipment-btn" ${shipmentData?.ok ? "" : "disabled"} data-start-refinery-shipment>${shipmentData?.ok ? "Lancer l'expedition" : shipmentData?.reason || "Indisponible"}</button>
      </aside>
    </section>`}
  </section>`;
  const recipes = getRefineryRecipes();
  const consumptionByMaterial = materials.reduce((acc, material)=>{
    acc[material.id] = {total:0, uses:[]};
    return acc;
  }, {});
  for(const recipe of recipes){
    const outputRate = getRefineryProductionRate(recipe.outputId);
    if(outputRate <= 0) continue;
    const craftsPerHour = outputRate / Math.max(1, Number(recipe.outputAmount || 1));
    const outputMaterial = getRawMaterial(recipe.outputId);
    for(const [inputId, amount] of Object.entries(recipe.costs || {})){
      if(!consumptionByMaterial[inputId]) consumptionByMaterial[inputId] = {total:0, uses:[]};
      const perHour = Number(amount || 0) * craftsPerHour;
      consumptionByMaterial[inputId].total += perHour;
      consumptionByMaterial[inputId].uses.push({
        output:outputMaterial?.name || recipe.outputId,
        amount:perHour
      });
    }
  }
  const statRows = materials.map(material=>{
    const stock = getMaterialCount(material.id);
    const cap = getMaterialStorageCap(material.id);
    const level = getRefineryMaterialLevel(material.id);
    const produced = getRefineryProductionRate(material.id);
    const consumed = consumptionByMaterial[material.id]?.total || 0;
    const net = produced - consumed;
    const fill = Math.max(0, Math.min(100, cap ? stock / cap * 100 : 0));
    const useText = consumptionByMaterial[material.id]?.uses?.length
      ? consumptionByMaterial[material.id].uses.map(use=>`${use.output} -${fmt(Math.ceil(use.amount))}/h`).join(" · ")
      : "Aucune consommation";
    const state = net < 0 ? "negative" : net > 0 ? "positive" : "neutral";
    return `<tr class="${state}">
      <td class="mat">
        <img src="${material.img}" alt="${material.name}">
        <div><strong>${material.name}</strong><span>LV ${level}/${material.maxLevel || 20}</span></div>
      </td>
      <td>${fmt(Math.floor(stock))} / ${fmt(cap)}<i><em style="width:${fill}%"></em></i></td>
      <td class="gain">+${fmt(Math.ceil(produced))}/h</td>
      <td class="loss">-${fmt(Math.ceil(consumed))}/h</td>
      <td class="net ${state}">${net >= 0 ? "+" : "-"}${fmt(Math.ceil(Math.abs(net)))}/h</td>
      <td class="uses">${useText}</td>
    </tr>`;
  }).join("");
  const totalProduced = materials.reduce((sum, material)=>sum + getRefineryProductionRate(material.id), 0);
  const totalConsumed = Object.values(consumptionByMaterial).reduce((sum, entry)=>sum + entry.total, 0);
  const totalNegative = materials.filter(material=>getRefineryProductionRate(material.id) - (consumptionByMaterial[material.id]?.total || 0) < 0).length;
  const statsPanel = `<section class="sky-stats-page">
    <div class="sky-stats-head">
      <div>
        <span class="tiny">BILAN DE PRODUCTION</span>
        <h3>Flux des materiaux par heure</h3>
      </div>
      <div class="sky-stats-summary">
        <span>Produit <b>+${fmt(Math.ceil(totalProduced))}/h</b></span>
        <span>Consomme <b>-${fmt(Math.ceil(totalConsumed))}/h</b></span>
        <span class="${totalNegative ? "negative" : "positive"}">Deficits <b>${fmt(totalNegative)}</b></span>
      </div>
    </div>
    <div class="sky-stats-table-wrap">
      <table class="sky-stats-table">
        <thead>
          <tr>
            <th>Materiau</th>
            <th>Stock</th>
            <th>Produit</th>
            <th>Consomme</th>
            <th>Net</th>
            <th>Utilise par</th>
          </tr>
        </thead>
        <tbody>${statRows}</tbody>
      </table>
    </div>
  </section>`;
  const node = (id, x, y)=>{
    const material = getRawMaterial(id);
    if(!material) return "";
    const level = getRefineryMaterialLevel(id);
    const upgrade = getRefineryUpgradeData(id);
    const job = getRefineryUpgradeProgress("material", id);
    const locked = level <= 0;
    const disabled = !job && !upgrade;
    const productionEnabled = isRefineryProductionEnabled(id);
    return `<article class="sky-node ${material.kind || ""} ${locked ? "locked" : "online"} ${productionEnabled ? "production-on" : "production-off"}" style="--x:${x};--y:${y}">
      <div class="sky-node-frame">
        <button type="button" class="sky-node-power ${productionEnabled ? "on" : "off"}" data-toggle-refinery-production="${id}" title="${productionEnabled ? "Production active" : "Production coupee"}">${productionEnabled ? "ON" : "OFF"}</button>
        <img src="${material.img}" alt="${material.name}">
        <div>
          <span>${labelForKind(material.kind)}</span>
          <strong>${material.name}</strong>
          <div class="sky-node-controls">
            <b>LV ${level}/${material.maxLevel || 20}</b>
            <button data-upgrade-refinery="${id}" ${disabled ? "disabled" : ""} title="${job ? "Amelioration en cours" : upgradeText(upgrade)}">${job ? "En cours" : locked ? "Debloquer" : "Ameliorer"}</button>
          </div>
          ${job ? `<div class="sky-node-progress"><i style="width:${job.percent}%"></i></div>` : ""}
        </div>
      </div>
    </article>`;
  };
  const moduleCard = (id, x, y)=>{
    const level = getRefineryModuleLevel(id);
    const upgrade = getRefineryModuleUpgradeData(id);
    const job = getRefineryUpgradeProgress("module", id);
    const isStorage = id === "storage";
    return `<article class="sky-utility-node ${id}" style="--x:${x};--y:${y}">
      <div class="sky-utility-icon">${isStorage ? "S" : "T"}</div>
      <div>
        <span>${isStorage ? "MODULE" : "SOUTE"}</span>
        <strong>${isStorage ? "Stockage" : "Transport"}</strong>
        <small>${isStorage ? `Bruts ${fmt(getMaterialStorageCap("cuivre_orbital"))} max` : `${fmt(getRefineryTransportCapacity())} / envoi`}</small>
        <div class="sky-node-controls">
          <b>LV ${level}/20</b>
          <button data-upgrade-refinery-module="${id}" ${!job && !upgrade ? "disabled" : ""} title="${job ? "Amelioration en cours" : upgrade ? `${fmt(upgrade.credits)} CR` : "MAX"}">${job ? "En cours" : upgrade ? "Ameliorer" : "MAX"}</button>
        </div>
        ${job ? `<div class="sky-node-progress"><i style="width:${job.percent}%"></i></div>` : ""}
      </div>
    </article>`;
  };
  const costList = data => {
    if(!data) return "";
    const creditOk = store.state.player.credits >= Number(data.credits || 0);
    const materialRows = Object.entries(data.materials || {}).map(([id, amount])=>{
      const material = getRawMaterial(id);
      const have = getMaterialCount(id);
      return `<span class="${have >= amount ? "ok" : "missing"}">${material?.name || id} <b>${fmt(have)} / ${fmt(amount)}</b></span>`;
    }).join("");
    return `<div class="sky-upgrade-costs">
      <span class="${creditOk ? "ok" : "missing"}">Credits <b>${fmt(store.state.player.credits)} / ${fmt(data.credits)}</b></span>
      ${materialRows || `<span class="ok">Materiaux <b>Aucun</b></span>`}
    </div>`;
  };
  const selectedUpgrade = store.selectedRefineryUpgrade;
  const upgradePopover = (() => {
    if(!selectedUpgrade) return "";
    const isModule = selectedUpgrade.type === "module";
    const pos = isModule ? modulePositions[selectedUpgrade.id] : nodePositions[selectedUpgrade.id];
    if(!pos) return "";
    const job = getRefineryUpgradeProgress(selectedUpgrade.type, selectedUpgrade.id);
    const data = isModule ? getRefineryModuleUpgradeData(selectedUpgrade.id) : getRefineryUpgradeData(selectedUpgrade.id);
    const rush = job ? getRefineryRushCost(selectedUpgrade.type, selectedUpgrade.id) : null;
    const material = isModule ? null : getRawMaterial(selectedUpgrade.id);
    const currentLevel = isModule ? getRefineryModuleLevel(selectedUpgrade.id) : getRefineryMaterialLevel(selectedUpgrade.id);
    const nextLevel = data?.nextLevel || job?.toLevel || currentLevel;
    const title = isModule ? data?.name || job?.name || selectedUpgrade.id : material?.name || selectedUpgrade.id;
    const beforeAfter = isModule
      ? selectedUpgrade.id === "storage"
        ? `<span>Cap bruts <b>${fmt(getMaterialStorageCapAt("cuivre_orbital", currentLevel))} -> ${fmt(getMaterialStorageCapAt("cuivre_orbital", nextLevel))}</b></span>`
        : `<span>Transport / envoi <b>${fmt(getRefineryTransportCapacityAt(currentLevel))} -> ${fmt(getRefineryTransportCapacityAt(nextLevel))}</b></span>`
      : `<span>Production <b>${fmt(getRefineryProductionRate(selectedUpgrade.id))}/h -> ${fmt(getRefineryProductionRateAt(selectedUpgrade.id, nextLevel))}/h</b></span>`;
    return `<div class="sky-upgrade-overlay">
    <aside class="sky-upgrade-popover">
      <button class="sky-upgrade-close" data-close-refinery-upgrade aria-label="Fermer">x</button>
      <span class="tiny">${job ? "AMELIORATION EN COURS" : "CONFIRMER"}</span>
      <h3>${title}</h3>
      <div class="sky-upgrade-level">LV ${currentLevel} -> ${nextLevel}</div>
      <div class="sky-upgrade-delta">${beforeAfter}</div>
      ${job ? `<div class="sky-upgrade-timer">
        <div><span>Temps restant</span><b>${durationText(job.remaining)}</b></div>
        <div class="sky-upgrade-meter"><i style="width:${job.percent}%"></i></div>
        <div><span>Terminer maintenant</span><b>${fmt(rush?.cost || 0)} NOVA</b></div>
        <button class="sky-upgrade-confirm" ${rush?.canAfford ? "" : "disabled"} data-rush-refinery-upgrade="${selectedUpgrade.id}" data-rush-refinery-type="${selectedUpgrade.type}">Terminer</button>
      </div>` : `${costList(data)}
        <div class="sky-upgrade-duration"><span>Duree</span><b>${durationText(data?.duration || 0)}</b></div>
        <button class="sky-upgrade-confirm" ${data?.canAfford ? "" : "disabled"} ${isModule ? `data-confirm-refinery-module-upgrade="${selectedUpgrade.id}"` : `data-confirm-refinery-upgrade="${selectedUpgrade.id}"`}>Lancer</button>`}
    </aside>
    </div>`;
  })();
  const forgeHtml = `
      <div class="sky-stock-row">${stockBar}</div>
      <div class="sky-map">
        <svg class="sky-flow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M20 8 H34 V18.5" />
          <path d="M16 24 H27" />
          <path d="M16 24 H21 V35.5 H30 V41.5" />
          <path d="M15 47 H23.5" />
          <path d="M15 72 H21 V59.5 H30 V52.5" />
          <path d="M15 72 H27" />
          <path d="M20 88 H34 V77.5" />
          <path d="M41 24 H49 V36 H51" />
          <path d="M41 72 H49 V58 H51" />
          <path d="M37 47 H49 V36 H51" />
          <path d="M37 47 H49 V58 H51" />
          <path d="M37 47 H80" />
          <path d="M65 36 H74 V47 H80" />
          <path d="M65 58 H74 V47 H80" />
        </svg>
        ${Object.entries(nodePositions).map(([id, pos])=>node(id, pos[0], pos[1])).join("")}
        ${moduleCard("transport", modulePositions.transport[0], modulePositions.transport[1])}
        ${moduleCard("storage", modulePositions.storage[0], modulePositions.storage[1])}
        ${upgradePopover}
      </div>
  `;
  panel.innerHTML = `
    <div class="sky-refinery ${refineryTab === "shipment" ? "shipment-mode" : refineryTab === "stats" ? "stats-mode" : ""}">
      ${refineryTab === "shipment" ? shipmentPanel : refineryTab === "stats" ? statsPanel : forgeHtml}
    </div>`;
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
        <strong>#${self.position || "—"}</strong>
        <small>${self.pilot || store.state.player.name}</small>
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
