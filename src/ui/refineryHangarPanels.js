import { fmt } from "../core/utils.js";
import {
  getMaterialCount, getRawMaterial, getRefineryModuleLevel, getRefineryProductionRate,
  getRefineryShipmentData, getRefineryShipmentProgress, getRefineryShipmentRushCost,
  getRefineryTransportCapacity, getShippableRefineryMaterials, getShip, store
} from "../core/store.js?v=20260726-kharon1";
import { isPremiumActive } from "../data/premium.js";
import { currencyAmountHtml } from "./currencyIcons.js";
import {
  refineryArt, refineryDuration, refineryEscape as esc, refineryMaterialName as name,
  refineryPercent, refineryTheoreticalFlows
} from "./refineryPresentation.js";

export function refineryShipmentPanel(){
  const materials = getShippableRefineryMaterials();
  const selectedId = materials.some(material=>material.id === store.selectedRefineryShipmentMaterial)
    ? store.selectedRefineryShipmentMaterial : materials[0]?.id;
  if(selectedId) store.selectedRefineryShipmentMaterial = selectedId;
  const requested = Math.max(1, Math.ceil(Number(store.selectedRefineryShipmentAmount || 30)));
  const data = selectedId ? getRefineryShipmentData(selectedId, requested) : null;
  const job = getRefineryShipmentProgress();
  const rush = job ? getRefineryShipmentRushCost() : null;
  const ship = job ? getShip(job.shipId) : data?.ship;
  const material = job ? getRawMaterial(job.materialId) : data?.material;
  const max = Math.max(0, Number(data?.maxAmount || 0));
  const amount = Math.max(0, Number(data?.amount || 0));
  const capacity = Math.max(0, Number(data?.shipCapacity || ship?.stats?.cargo || 0));
  const used = Math.max(0, Number(data?.shipUsed || 0));
  const cards = materials.map(entry=>`<button type="button" class="rf-shipment-material ${entry.id === selectedId ? "is-selected" : ""}" data-refinery-shipment-pick="${esc(entry.id)}" data-refinery-key="shipment-material:${esc(entry.id)}" aria-pressed="${entry.id === selectedId}">
    <span class="rf-selection-check" aria-hidden="true">${entry.id === selectedId ? "✓" : ""}</span>${refineryArt(entry)}<strong>${esc(name(entry))}</strong><b>${fmt(getMaterialCount(entry.id))}</b><small>en station</small></button>`).join("");
  const route = `<div class="rf-route"><div><span class="rf-route-station" aria-hidden="true">▤</span><span><strong>Stock de la station</strong><small>Raffinerie orbitale</small></span></div><span class="rf-route-connector"><i></i><span>${job ? "EXPÉDITION EN COURS" : "TRANSFERT DE MATÉRIAUX"}</span><i></i><b aria-hidden="true">→</b></span><div>${ship?.img ? `<img src="${esc(ship.img)}" alt="${esc(ship.name)}">` : ""}<span><strong>${esc(job?.shipName || ship?.name || "Aucun vaisseau actif")}</strong><small>Soute du vaisseau ${job ? "destinataire" : "actif"}</small></span></div></div>`;
  if(job) return `<section class="rf-shipment-page" data-refinery-key="shipment">${route}<section class="rf-shipment-current">
    <span class="rf-eyebrow">CHARGEMENT EN TRANSIT</span><div class="rf-current-material">${refineryArt(material)}<div><h3>${fmt(job.amount)} ${esc(name(material))}</h3><p>Destination : ${esc(job.shipName)}</p></div></div>
    <div class="rf-progress"><i style="width:${refineryPercent(job.percent, 100)}%"></i></div><div class="rf-shipment-current-meta"><span>Temps restant <b>${refineryDuration(job.remaining)}</b></span><span>Terminer maintenant <b>${currencyAmountHtml("premium", rush?.effectiveCost ?? rush?.cost ?? 0)}</b></span></div>
    <button type="button" class="rf-primary" data-rush-refinery-shipment ${rush?.canAfford ? "" : "disabled"}>Terminer maintenant</button><p class="rf-page-note">Une seule expédition peut être active. Les matériaux sont livrés automatiquement à la fin du trajet.</p></section></section>`;
  return `<section class="rf-shipment-page" data-refinery-key="shipment">${route}<div class="rf-shipment-layout">
    <section class="rf-shipment-selection"><div class="rf-section-head"><h3>Matériaux disponibles</h3><span>${materials.length} MATIÈRES EXPÉDIABLES</span></div><div class="rf-shipment-grid">${cards}</div><p class="rf-shipment-explainer"><strong>De la station à votre vaisseau.</strong> Le nickel et le catalyseur restent à la station. Le chargement dépend du stock, du transport et de la place en soute.</p></section>
    <section class="rf-shipment-order"><span class="rf-eyebrow">ORDRE D’EXPÉDITION</span><h3>Votre chargement</h3><div class="rf-order-material">${refineryArt(material)}<div><h4>${esc(name(material))}</h4><span>${fmt(data?.stock || 0)} disponibles en station</span></div></div>
    <label class="rf-field-label" for="refinery-shipment-material">Matériau</label><select id="refinery-shipment-material" data-refinery-shipment-material data-refinery-key="shipment-select">${materials.map(entry=>`<option value="${esc(entry.id)}" ${entry.id === selectedId ? "selected" : ""}>${esc(name(entry))}</option>`).join("")}</select>
    <div class="rf-amount-label"><label for="refinery-shipment-quantity">Quantité à expédier</label><span>${fmt(max)} maximum</span></div><div class="rf-amount-control"><input id="refinery-shipment-quantity" data-refinery-shipment-amount data-refinery-key="shipment-quantity" type="number" min="${max > 0 ? 1 : 0}" max="${max}" step="1" value="${amount}" ${max > 0 ? "" : "disabled"}><button type="button" data-refinery-shipment-max ${max > 0 ? "" : "disabled"}>MAX</button></div>
    <input class="rf-shipment-range" data-refinery-shipment-amount data-refinery-key="shipment-range" type="range" min="${max > 0 ? 1 : 0}" max="${Math.max(1, max)}" step="1" value="${amount}" aria-label="Quantité à expédier" ${max > 0 ? "" : "disabled"}>
    <div class="rf-shipment-summary"><div><span>Module transport · niv. ${getRefineryModuleLevel("transport")}</span><b>${fmt(getRefineryTransportCapacity())} / envoi</b></div><div><span>Soute après réception</span><b>${fmt(used + amount)} / ${fmt(capacity)}</b></div><div class="rf-cargo-preview"><i style="width:${refineryPercent(used, capacity)}%"></i><em style="width:${refineryPercent(amount, capacity)}%"></em></div><div><span>Soute libre actuellement</span><b>${fmt(data?.shipFree || 0)}</b></div><div><span>Durée estimée${isPremiumActive(store.state.player) ? `<small class="rf-premium-note">Premium actif · durée ÷ 2</small>` : ""}</span><b>${refineryDuration(data?.duration || 0)}</b></div><div class="rf-order-price"><span>Coût d’expédition</span><b>${currencyAmountHtml("credits", data?.credits || 0)}</b></div></div>
    <button type="button" class="rf-primary" data-start-refinery-shipment ${data?.ok ? "" : "disabled"}>${data?.ok ? "Lancer l’expédition ↗" : esc(data?.reason || "Expédition indisponible")}</button></section></div></section>`;
}

export function refineryStatsPanel(materials, recipes, read){
  const flows = refineryTheoreticalFlows(materials, recipes, getRefineryProductionRate);
  const totalProduced = [...flows.values()].reduce((sum, flow)=>sum + flow.produced, 0);
  const totalConsumed = [...flows.values()].reduce((sum, flow)=>sum + flow.consumed, 0);
  const deficits = [...flows.values()].filter(flow=>flow.produced - flow.consumed < 0).length;
  const largest = Math.max(1, ...[...flows.values()].flatMap(flow=>[flow.produced, flow.consumed]));
  const rows = materials.map(material=>{
    const current = read(material.id), flow = flows.get(material.id), net = flow.produced - flow.consumed;
    const sign = net < 0 ? "negative" : net > 0 ? "positive" : "neutral";
    const uses = flow.uses.map(use=>`${esc(name(getRawMaterial(use.outputId)))} −${fmt(Math.ceil(use.amount))}/h`).join(" · ");
    return `<tr data-refinery-stat="${esc(material.id)}" data-refinery-key="stat:${esc(material.id)}"><td><div class="rf-stat-material">${refineryArt(material)}<div><strong>${esc(name(material))}</strong><small>Niv. ${current.level} / ${material.maxLevel || 20} · ${current.status.text}</small></div></div></td><td><strong>${fmt(current.stock)}</strong><small>/ ${fmt(current.cap)}</small><span class="rf-stock-meter"><i style="width:${refineryPercent(current.stock, current.cap)}%"></i></span></td><td class="rf-stat-gain" data-refinery-produced="${flow.produced}">${fmt(Math.ceil(flow.produced))}<span class="rf-flow-meter"><i style="width:${refineryPercent(flow.produced, largest)}%"></i></span></td><td class="rf-stat-loss" data-refinery-consumed="${flow.consumed}">${fmt(Math.ceil(flow.consumed))}<span class="rf-flow-meter is-consumption"><i style="width:${refineryPercent(flow.consumed, largest)}%"></i></span></td><td class="rf-stat-net ${sign}" data-refinery-net="${net}">${net > 0 ? "+" : net < 0 ? "−" : ""}${fmt(Math.ceil(Math.abs(net)))}</td><td class="rf-stat-uses">${uses || "Aucune consommation"}</td></tr>`;
  }).join("");
  return `<section class="rf-stats-page" data-refinery-key="stats"><div class="rf-stats-summary"><div><span>Production théorique</span><strong>+ ${fmt(Math.ceil(totalProduced))}<small>/ h</small></strong></div><div><span>Consommation théorique</span><strong>− ${fmt(Math.ceil(totalConsumed))}<small>/ h</small></strong></div><div><span>Matières en déficit théorique</span><strong class="${deficits ? "negative" : "positive"}">${deficits}<small>/ ${materials.length}</small></strong></div></div><div class="rf-stats-notice"><b>Des débits théoriques, pas un historique.</b><p>Les chiffres dépendent des niveaux et des productions actives. Ils supposent des ingrédients disponibles et de la place en sortie. Le solde correspond à la production moins la consommation des recettes.</p></div><div class="rf-stats-table-scroll" data-refinery-key="stats-scroll"><table class="rf-stats-table"><thead><tr><th>Matériau</th><th>Stock station</th><th>Production / h</th><th>Consommation / h</th><th>Solde / h</th><th>Utilisé par</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
