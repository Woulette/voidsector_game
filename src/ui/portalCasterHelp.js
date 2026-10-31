import { getPortalAccess } from "./portalPresentation.js?v=20261023-portals-ui1";

// Presentation of the existing server pool; verified against actual server rolls.
const CASTER_LOOT = Object.freeze([
  {id:"ammo_x2", label:"Munitions ×2", amount:250, weight:23},
  {id:"ammo_x3", label:"Munitions ×3", amount:100, weight:12},
  {id:"ammo_x4", label:"Munitions ×4", amount:35, weight:5},
  {id:"rocket_r1", label:"Roquettes R-1", amount:12, weight:27},
  {id:"rocket_r2", label:"Roquettes R-2", amount:6, weight:14},
  {id:"rocket_r3", label:"Roquettes R-3", amount:2, weight:6},
  {id:"missile_m1", label:"Missiles MS-1", amount:5, weight:5},
  {id:"missile_m2", label:"Missiles MS-2", amount:2, weight:4}
]);
const percent = new Intl.NumberFormat("fr-FR", {maximumFractionDigits:2});

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

export function getPortalCasterHelpData(portal, state){
  const access = getPortalAccess(portal, state);
  const piecesFull = access.pieces >= access.required && access.clears <= 0;
  const fragmentWeight = piecesFull ? 0 : 4;
  const total = fragmentWeight + CASTER_LOOT.reduce((sum, entry)=>sum + entry.weight, 0);
  return {
    piecesFull,
    mapChance:Math.max(0, Number(portal.dropChance || 0)),
    zones:Array.isArray(portal.dropZones) ? portal.dropZones : [],
    rewards:[
      {id:portal.id, kind:"piece", label:portal.pieceName || "Fragment de portail", amount:1, chance:fragmentWeight / total},
      ...CASTER_LOOT.map(entry=>({...entry, kind:"ammo", chance:entry.weight / total}))
    ]
  };
}

export function renderPortalCasterHelp(portal, state){
  const data = getPortalCasterHelpData(portal, state);
  const zones = data.zones.length ? data.zones.join(" · ") : "Zones à définir";
  return `<details class="portal-caster-help"><summary aria-label="Chances de butin et fragments" title="Chances de butin et fragments" data-portal-focus="help"><span aria-hidden="true">?</span></summary>
    <div class="portal-caster-help-content">
      <h3>Chances de butin</h3><p>Un butin par tirage. Les lots ×10 et ×100 enchaînent des tirages individuels.</p>
      <table><caption>Chances du prochain tirage</caption><thead><tr><th scope="col">Butin</th><th scope="col">Quantité</th><th scope="col">Chance</th></tr></thead><tbody>${data.rewards.map(entry=>`<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${entry.amount}</td><td>${percent.format(entry.chance * 100)} %</td></tr>`).join("")}</tbody></table>
      ${data.piecesFull ? `<p class="portal-caster-help-note">Réserve complète : les fragments sont suspendus et les chances des autres butins sont recalculées.</p>` : ""}
      <h4>Où trouver les fragments ?</h4><p><strong>${escapeHtml(portal.pieceLabel || "Fragments du portail")}</strong><br>${escapeHtml(zones)}<br><strong>${percent.format(data.mapChance * 100)} %</strong> par ennemi éligible, en plus du Space Caster.</p>
      <p class="portal-caster-help-note">Au Space Caster, les fragments sont suspendus lorsque la réserve est complète avant la première victoire. Les drops sur les maps restent possibles.</p>
    </div>
  </details>`;
}
