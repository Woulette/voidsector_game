import { store, getAmmoCount, getDronePurchasePrice, getInventoryCount, getShipPurchaseLockReason } from "../core/store.js?v=20260726-kharon1";
import { multiplayer } from "../multiplayer/client.js?v=20261018-map-transfer1";
import { SHOP_CATEGORIES, buildShopCatalog, filterShopProducts } from "./shopCatalog.js";
import { createShopProductModel } from "./shopProductModel.js";
import { shopIcon } from "./shopIcons.js";
import { renderShopCardMarkup, renderShopDetailMarkup } from "./shopMarkup.js?v=20261024-shop4";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const rendered = new WeakMap(), wired = new WeakSet();
let previousCategory = "", previousCatalogue = "", weaponFilter = "all";

function updateHtml(element, html){
  if(!element || rendered.get(element) === html) return;
  element.innerHTML = html;
  rendered.set(element,html);
}

function focusSnapshot(){
  const element = document.activeElement;
  if(!element?.matches?.("button") || !element.closest(".shop-view"))return null;
  return {
    element, detail:Boolean(element.closest("#shopDetailPanel")),
    key:element.closest("[data-shop-product]")?.dataset.shopProduct,
    attributes:[...element.attributes].filter(a=>a.name.startsWith("data-")).map(a=>[a.name,a.value])
  };
}

function restoreFocus(snapshot){
  if(!snapshot || document.contains(snapshot.element) || !snapshot.attributes.length)return;
  const root = snapshot.detail ? document.getElementById("shopDetailPanel")
    : [...document.querySelectorAll("#shopGrid [data-shop-product]")].find(el=>el.dataset.shopProduct === snapshot.key);
  const next = [...(root?.querySelectorAll("button") || [])].find(el=>snapshot.attributes.every(([name,value])=>el.getAttribute(name) === value));
  if(next && !next.disabled)next.focus({preventScroll:true});
}

function selectQuantity(button){
  const quantity = Number(button.dataset.shopAmmoMultiplier), key = button.dataset.shopQuantityFor;
  if(!key || ![1,10,100,1000].includes(quantity))return;
  store.shopQuantities ||= {};
  store.shopQuantities[key] = quantity;
  store.selectedShopProduct = key;
  store.selectedShopAmmoMultiplier = quantity;
  renderShop();
}

function wireShop(){
  const detail = document.getElementById("shopDetailPanel");
  if(detail && !wired.has(detail)){
    detail.addEventListener("click",event=>{
      const quantity = event.target.closest("[data-shop-ammo-multiplier]");
      if(quantity){event.stopPropagation();selectQuantity(quantity);return;}
      const benefits = detail.querySelector(".shop-benefits-dialog");
      if(event.target.closest("[data-shop-show-benefits]") && !benefits?.open)benefits?.showModal();
      if(event.target.closest("[data-shop-close-benefits]") || event.target === benefits)benefits?.close();
    });
    wired.add(detail);
  }
  const grid = document.getElementById("shopGrid");
  if(grid && !wired.has(grid)){
    grid.addEventListener("click",event=>{
      const quantity = event.target.closest("[data-shop-ammo-multiplier]");
      if(quantity){event.stopPropagation();selectQuantity(quantity);return;}
      const open = event.target.closest("[data-shop-open-detail]");
      const select = event.target.closest("[data-select-shop]");
      if(!open && !select)return;
      event.stopPropagation();
      store.selectedShopProduct = open?.dataset.shopOpenDetail || select.dataset.selectShop;
      store.selectedShopAmmoMultiplier = store.shopQuantities?.[store.selectedShopProduct] || 1;
      renderShop();
      if(window.matchMedia?.("(max-width:760px)").matches){
        detail?.scrollIntoView({block:"start",behavior:"instant"});
        detail?.focus({preventScroll:true});
      }
    });
    wired.add(grid);
  }
  const input = document.getElementById("shopSearch");
  if(input && !wired.has(input)){
    input.addEventListener("input",()=>{store.shopSearchQuery = input.value.slice(0,120);renderShop();});
    wired.add(input);
  }
  for(const button of document.querySelectorAll("[data-filter-shop]")){
    const category = SHOP_CATEGORIES.find(c=>c.id === button.dataset.filterShop);
    if(category && !wired.has(button)){
      button.innerHTML = shopIcon(category.icon)+"<span>"+category.label+(category.id === "drone" ? "<small>Drones et formations</small>" : "")+"</span>";
      button.addEventListener("click",()=>{store.shopSearchQuery = "";weaponFilter = "all";});
      wired.add(button);
    }
  }
  for(const button of document.querySelectorAll("[data-shop-weapon-filter]")){
    if(wired.has(button))continue;
    button.addEventListener("click",()=>{
      weaponFilter = button.dataset.shopWeaponFilter;
      renderShop();
    });
    wired.add(button);
  }
}

function catalogueMarkup(products, category, currentKey){
  const cards = list=>list.map(product=>renderShopCardMarkup(product,product.key === store.selectedShopProduct,product.key === currentKey)).join("");
  if(category === "owned"){
    return SHOP_CATEGORIES.filter(c=>c.id !== "owned").map(c=>({label:c.title,items:products.filter(p=>p.category === c.id)}))
      .filter(group=>group.items.length).map(group=>'<h4 class="shop-group-title">'+escapeHtml(group.label)+"</h4>"+cards(group.items)).join("");
  }
  return cards(products);
}

export function renderShop(){
  wireShop();
  if(!SHOP_CATEGORIES.some(c=>c.id === store.shopFilter))store.shopFilter = "vaisseau";
  const categoryChanged = Boolean(previousCategory && previousCategory !== store.shopFilter);
  if(categoryChanged){
    store.shopSearchQuery = "";store.shopQuantities = {};store.selectedShopAmmoMultiplier = 1;
    weaponFilter = "all";
  }
  previousCategory = store.shopFilter;
  const shopActive = Boolean(document.querySelector(".shop-view.active"));
  const input = document.getElementById("shopSearch");
  if(input && input.value !== (store.shopSearchQuery || ""))input.value = store.shopSearchQuery || "";
  if(input)input.placeholder = store.shopFilter === "vaisseau" ? "Rechercher un vaisseau…" : store.shopFilter === "canon" ? "Rechercher une arme…" : "Rechercher un article…";
  const role = multiplayer.auth.account?.role;
  const products = buildShopCatalog(role).map(product=>createShopProductModel(product,{
    state:store.state, inventoryCount:getInventoryCount, ammoCount:getAmmoCount, dronePrice:getDronePurchasePrice,
    shipLock:ship=>getShipPurchaseLockReason(ship,role), multiplier:store.shopQuantities?.[product.kind+":"+product.id] || 1
  }));
  let list = filterShopProducts(products,store.shopFilter,store.shopSearchQuery);
  if(store.shopFilter === "canon" && weaponFilter !== "all")list = list.filter(p=>Boolean(p.data.weapon) === (weaponFilter === "laser"));
  const filters = document.getElementById("shopWeaponFilters");
  if(filters)filters.hidden = store.shopFilter !== "canon";
  for(const button of document.querySelectorAll("[data-shop-weapon-filter]")){
    const active = button.dataset.shopWeaponFilter === weaponFilter;
    button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
  }
  const category = SHOP_CATEGORIES.find(c=>c.id === store.shopFilter);
  const title = document.getElementById("shopSectionTitle"), count = document.getElementById("shopResultCount");
  if(title)title.textContent = category.title;
  if(count)count.textContent = list.length+" "+(store.shopFilter === "vaisseau" ? "modèle"+(list.length > 1 ? "s" : "") : "article"+(list.length > 1 ? "s" : ""));
  for(const button of document.querySelectorAll("[data-filter-shop]")){
    const active = button.dataset.filterShop === store.shopFilter;
    button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
  }
  if(!list.some(p=>p.key === store.selectedShopProduct))store.selectedShopProduct = null;
  // The default sheet is a preview: tutorial selection still requires the player's click.
  const selected = list.find(p=>p.key === store.selectedShopProduct) || list[0] || null;
  const grid = document.getElementById("shopGrid"), detail = document.getElementById("shopDetailPanel");
  const focused = focusSnapshot();
  const catalogueKey = JSON.stringify([store.shopFilter,store.shopSearchQuery || "",weaponFilter]);
  const catalogueScroll = catalogueKey === previousCatalogue ? grid?.scrollTop || 0 : 0;
  if(grid)grid.dataset.category = store.shopFilter;
  updateHtml(grid,list.length ? catalogueMarkup(list,store.shopFilter,selected?.key) : '<div class="shop-no-results">'+shopIcon("search")+"<h4>Aucun résultat</h4><p>"+(store.shopSearchQuery ? "Aucun article pour « "+escapeHtml(store.shopSearchQuery)+" » dans cette catégorie." : "Aucun article dans cette catégorie.")+"</p></div>");
  if(grid)grid.scrollTop = catalogueScroll;
  previousCatalogue = catalogueKey;
  const pagination = document.getElementById("shopPagination");
  if(pagination){pagination.hidden = true;updateHtml(pagination,"");}
  if(detail){
    const sameProduct = detail.dataset.shopProduct === selected?.key;
    const benefitsOpen = shopActive && sameProduct && detail.querySelector(".shop-benefits-dialog")?.open;
    if(!shopActive)detail.querySelector(".shop-benefits-dialog[open]")?.close();
    const scrollTop = sameProduct ? detail.querySelector(".shop-detail-scroll")?.scrollTop || 0 : 0;
    updateHtml(detail,renderShopDetailMarkup(selected));
    detail.dataset.shopProduct = selected?.key || "";
    detail.dataset.rarity = selected?.rarityClass || "";
    detail.classList.toggle("premium-selected",selected?.kind === "premiumPack");
    detail.classList.toggle("ship-selected",selected?.kind === "ship");
    const scroll = detail.querySelector(".shop-detail-scroll");
    if(scroll)scroll.scrollTop = scrollTop;
    const benefits = detail.querySelector(".shop-benefits-dialog");
    if(benefitsOpen && benefits && !benefits.open)benefits.showModal();
  }
  restoreFocus(focused);
  const catalogue = document.querySelector(".shop-catalog-panel");
  if(categoryChanged && window.matchMedia?.("(max-width:760px)").matches && catalogue?.getBoundingClientRect().top < 16)catalogue.scrollIntoView({block:"start",behavior:"instant"});
}
