import { fmt } from "../core/utils.js";
import { currencyAmountHtml, realMoneyPriceHtml } from "./currencyIcons.js?v=20260726-kharon1";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

function priceHtml(type, value, base = value){
  const price = value === 0 ? "Gratuit" : currencyAmountHtml(type,value);
  const amount = '<strong class="shop-price '+(type === "premium" ? "premium" : "credits")+'">'+price+'</strong>';
  return base > value ? '<span class="shop-price-discount"><s>'+currencyAmountHtml(type,base)+'</s>'+amount+'</span>' : amount;
}

function productArt(model, detail = false){
  if(model.image) return '<img src="'+escapeHtml(model.image)+'" alt="'+escapeHtml(model.name)+'" '+(detail ? "" : 'loading="lazy"')+' decoding="async">';
  return '<span class="shop-ammo-placeholder">'+shopIcon("ammo")+'<b>'+escapeHtml(model.data.short || model.name)+'</b></span>';
}

function purchaseButton(model){
  if(model.kind === "premiumPack"){
    return '<button type="button" class="blue-button shop-purchase-button" disabled>Paiement à venir</button>';
  }
  const action = model.action;
  const extra = model.kind === "ammo" ? ' data-buy-ammo-multiplier="'+model.quantity+'"' : model.kind === "booster" ? ' data-buy-booster-quantity="1"' : model.kind === "item" ? ' data-buy-item-multiplier="'+model.quantity+'"' : "";
  const label = action.label;
  return '<button type="button" class="blue-button shop-purchase-button" '+action.attribute+'="'+escapeHtml(action.value)+'"'+extra+' '+(action.disabled ? "disabled" : "")+'>'+escapeHtml(label)+shopIcon("arrow")+'</button>';
}

function renderQuantity(model){
  if(!model.quantities) return "";
  const units = model.kind !== "ammo" ? "unité" : model.data.weaponClass === "rocket" ? "roquette" : model.data.weaponClass === "missile" ? "missile" : "munition";
  return '<fieldset class="shop-quantity"><legend>Quantité de lots</legend><div class="shop-ammo-buy-options">'+[1,10,100,1000].map(n=>'<button type="button" data-shop-ammo-multiplier="'+n+'" data-shop-quantity-for="'+escapeHtml(model.key)+'" class="'+(model.quantity === n ? "active" : "")+'" aria-pressed="'+(model.quantity === n)+'">×'+fmt(n)+'</button>').join("")+'</div><p>'+fmt(model.units)+' '+units+(model.units > 1 ? "s" : "")+' au total</p></fieldset>';
}

function priceMarkup(model, card = false){
  const noCharge = model.activating || model.owned && model.kind === "ship";
  const label = card ? model.quantities ? "Le lot" : "" : noCharge ? "Statut" : model.priceLabel;
  const value = noCharge ? '<strong class="shop-owned-label">'+escapeHtml(model.status)+'</strong>' : model.kind === "drone" && model.lock ? "<strong>MAX</strong>" : model.priceType === "real" ? '<strong class="shop-price real'+(model.data.tier === "gold" ? ' real-gold' : '')+'">'+realMoneyPriceHtml(String(model.data.realPrice || "").replace(/ EUR$/, " €"))+'</strong>' : priceHtml(model.priceType,card ? model.unitPrice : model.price,card ? model.baseUnitPrice : model.basePrice);
  const tag = card ? "span" : "div";
  return '<'+tag+' class="'+(card ? "shop-card-price" : "shop-detail-price")+'">'+(label ? '<small>'+escapeHtml(label)+'</small>' : "")+value+'</'+tag+'>';
}

function purchaseNotes(model){
  const noCharge = model.activating || model.owned && model.kind === "ship";
  return (model.insufficient && !model.lock && !noCharge ? '<p class="shop-purchase-warning" role="status">'+(model.priceType === "premium" ? "NOVA insuffisantes" : "Crédits insuffisants")+'</p>' : "")
    +(model.pricingNote && !noCharge ? '<p class="shop-pricing-note">'+escapeHtml(model.pricingNote)+'</p>' : "");
}

export function renderShopCardMarkup(model, selected = false, current = selected){
  const status = model.lock || model.kind !== "ship" && (model.owned || ["ammo","drone","booster","premiumPack"].includes(model.kind));
  const statusIcon = model.lock ? "lock" : model.owned || model.active ? "check" : "cargo";
  return '<article class="shop-list-card shop-product-card '+escapeHtml(model.rarityClass)+' '+(current ? "current" : "")+' '+(model.owned ? "owned" : "")+' '+(model.lock ? "locked" : "")+' '+(model.kind === "premiumPack" ? "premium-pack" : "")+'" data-shop-product="'+escapeHtml(model.key)+'" data-shop-kind="'+escapeHtml(model.kind)+'">'
    +'<button type="button" class="shop-card-preview '+(selected ? "selected" : "")+'" data-select-shop="'+escapeHtml(model.key)+'" aria-pressed="'+current+'" aria-controls="shopDetailPanel">'
    +'<span class="shop-card-heading"><strong class="shop-card-title">'+escapeHtml(model.name)+'</strong><span class="badge rarity-badge">'+escapeHtml(model.rarity || model.badge)+'</span></span>'
    +'<span class="shop-list-art '+(model.kind === "ship" ? "ship" : "")+'">'+productArt(model)+'</span>'
    +'<span class="shop-card-footer">'
    +(status ? '<span class="shop-card-status '+(model.lock ? "is-locked" : model.owned || model.active ? "is-owned" : "")+'">'+shopIcon(statusIcon)+'<span>'+escapeHtml(model.lock ? "Accès requis" : model.status)+'</span></span>' : "")
    +priceMarkup(model,true)+'</span></button></article>';
}

export function renderShopDetailMarkup(model){
  if(!model) return '<div class="shop-detail-empty">'+shopIcon("search")+'<h3>Aucun article</h3><p>Modifie la recherche ou choisis une autre catégorie.</p></div>';
  const shipInfo = model.kind === "ship" && Boolean(model.data.special);
  const specialName = shipInfo ? model.data.special.split(/ · | - /)[0] : "";
  return '<header class="shop-detail-heading"><div class="shop-detail-top"><span class="badge rarity-badge '+escapeHtml(model.rarityClass)+'">'+escapeHtml(model.rarity)+'</span><span>'+escapeHtml(model.badge)+'</span></div><h3 id="shopDetailTitle">'+escapeHtml(model.name)+'</h3><p>'+escapeHtml(model.subtitle)+'</p></header>'
    +'<div class="shop-detail-scroll"><div class="shop-detail-overview"><div class="shop-detail-art '+(model.kind === "ship" ? "ship" : "")+' '+escapeHtml(model.rarityClass)+'">'+productArt(model,true)+'</div><div class="shop-detail-information">'
    +'<p class="shop-detail-copy">'+escapeHtml(model.description)+'</p>'
    +(model.lock ? '<div class="shop-detail-lock" role="status">'+shopIcon("lock")+'<span>'+escapeHtml(model.lock)+'</span></div>' : "")
    +(model.kind === "ship" ? '<p class="shop-stats-caption">Capacités de base du vaisseau</p>' : "")
    +'<dl class="shop-detail-stats '+(model.kind === "ship" ? "ship-stats" : "")+'">'+model.stats.filter(s=>!shipInfo || s.label !== "Spécial").map(s=>'<div class="shop-detail-stat featured '+(s.label === "Spécial" ? "special" : "")+' '+(["Bonus","Malus","Effet"].includes(s.label) ? "wide" : "")+'"><dt>'+shopIcon(s.icon)+'<span>'+escapeHtml(s.label)+'</span></dt><dd>'+escapeHtml(s.value)+'</dd></div>').join("")+'</dl>'
    +(shipInfo ? '<button type="button" class="shop-benefits-button" data-shop-show-benefits>Présentation et capacité spéciale '+shopIcon("arrow")+'</button>' : "")
    +(model.features.length ? '<button type="button" class="shop-benefits-button" data-shop-show-benefits>Voir les '+model.features.length+' avantages '+escapeHtml(model.data.tier === "gold" ? "Premium OR" : "Premium")+' '+shopIcon("arrow")+'</button>' : "")
    +(model.note ? '<p class="shop-detail-note">'+escapeHtml(model.note)+'</p>' : "")+'</div></div></div>'
    +'<footer class="shop-detail-footer">'+renderQuantity(model)+'<div class="shop-purchase-row">'+priceMarkup(model)+purchaseButton(model)+'</div>'+purchaseNotes(model)
    +(model.kind === "ship" && !model.owned ? '<p class="shop-purchase-note">'+shopIcon("check")+'Ajouté à votre hangar après achat.</p>' : "")+'</footer>'
    +(model.features.length || shipInfo ? '<dialog class="shop-benefits-dialog" aria-labelledby="shopBenefitsTitle"><header><h3 id="shopBenefitsTitle">'+escapeHtml(model.name)+'</h3><button type="button" data-shop-close-benefits aria-label="Fermer les détails de l’article">×</button></header>'
      +(shipInfo ? '<div class="shop-special-presentation"><p class="shop-detail-copy">'+escapeHtml(model.description)+'</p><h4>'+escapeHtml(specialName)+'</h4><p>'+escapeHtml(model.data.special)+'</p></div>' : '<section class="shop-premium-benefits"><h4>Les '+model.features.length+' avantages du pass</h4><ul>'+model.features.map(f=>'<li>'+shopIcon("check")+'<span>'+escapeHtml(f)+'</span></li>').join("")+'</ul></section>')
      +'<button type="button" class="blue-button" data-shop-close-benefits>Revenir à la fiche</button></dialog>' : "");
}
