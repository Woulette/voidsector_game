import { ammoTypes } from "./data/catalog.js";
import {
  addAmmo,
  addInventoryItem,
  canAfford,
  ensureShipLoadout,
  findEquippedSlot,
  getDroneCatalog,
  getDroneLoadout,
  getDronePurchasePrice,
  getInventoryItem,
  getItem,
  getItemFromInventoryUid,
  getLoadout,
  getPortal,
  getPortalPieces,
  getShip,
  isPortalUnlocked,
  loadState,
  saveState,
  spend,
  store,
  unequipInventoryItem,
  upgradeSkill,
  unlockPortal
} from "./core/store.js";
import { createCombatGame } from "./game/combat.js";
import { renderAll, renderLoadout, renderShop, setView } from "./ui/render.js";
import { showToast } from "./ui/toast.js";
import { DEFAULT_SLOT_KEYBINDS, eventToCode, keyCodeToLabel, normalizeSlotKeybinds } from "./core/keybinds.js";

const Game = createCombatGame({renderAll, showToast});
let inventoryClickTimer = null;
let pendingKeybindSlot = null;

function equipSelectedShip(){
  const ship = getShip(store.state.selectedShip);
  if(store.state.activeShip === ship.id){
    store.state.activeShip = null;
    showToast(`${ship.name} déséquipé.`);
    renderAll();
    return;
  }
  ensureShipLoadout(ship.id);
  store.state.activeShip = ship.id;
  showToast(`${ship.name} équipé.`);
  renderAll();
}

function buyShip(id){
  const ship = getShip(id);
  if(store.state.ownedShips.includes(id)) return;
  if(!canAfford(ship.priceType, ship.price)) return showToast("Fonds insuffisants.");
  spend(ship.priceType, ship.price);
  store.state.ownedShips.push(id);
  ensureShipLoadout(id);
  showToast(`${ship.name} acheté. Il est disponible dans ton hangar.`);
  renderAll();
}

function buyItem(id){
  const item = getItem(id);
  if(!item) return;
  if(!canAfford(item.priceType, item.price)) return showToast("Fonds insuffisants.");
  spend(item.priceType, item.price);
  addInventoryItem(id);
  showToast(`${item.name} acheté. Un exemplaire a été ajouté à l'inventaire.`);
  renderAll();
}

function buyAmmo(id){
  const ammo = ammoTypes.find(a=>a.id === id);
  if(!ammo) return;
  if(!canAfford(ammo.priceType, ammo.price)) return showToast("Fonds insuffisants.");
  spend(ammo.priceType, ammo.price);
  addAmmo(ammo.id, ammo.amount);
  showToast(`${ammo.name} achetée : +${ammo.amount} munitions.`);
  renderAll();
}

function buyCombatDrone(){
  const drone = getDroneCatalog();
  const count = store.state.ownedDroneCount || 0;
  if(count >= drone.maxOwned) return showToast("Nombre maximum de drones atteint.");
  const price = getDronePurchasePrice(count);
  if(!canAfford(drone.priceType, price)) return showToast("Fonds insuffisants.");
  spend(drone.priceType, price);
  store.state.ownedDroneCount = count + 1;
  const loadout = getDroneLoadout();
  while(loadout.length < store.state.ownedDroneCount) loadout.push(null);
  store.hangarTab = "drone";
  showToast(`Drone ${store.state.ownedDroneCount} acheté pour ${price.toLocaleString("fr-FR")} crédits.`);
  renderAll();
}

function canMoveInventoryItemToTarget(inventoryUid, target){
  const equipped = findEquippedSlot(inventoryUid);
  if(!equipped) return true;
  if(target.location === "ship" && equipped.location === "ship" && equipped.shipId === target.shipId) return true;
  if(target.location === "drone" && equipped.location === "drone" && equipped.index === target.index) return true;
  const label = equipped.location === "drone" ? `Drone ${equipped.index+1}` : getShip(equipped.shipId).name;
  showToast(`Cet exemplaire est déjà équipé sur ${label}. Déséquipe-le d'abord.`);
  return false;
}

function equipPart(type, index, inventoryUid){
  const item = getItemFromInventoryUid(inventoryUid);
  if(!item) return;
  if(type === "laser" || type === "generator" || type === "extra"){
    const ship = getShip(store.state.selectedShip);
    const loadout = getLoadout(ship.id);
    if(type === "laser"){
      if(item.category !== "canon") return showToast("Ce n'est pas un canon.");
      if(index >= ship.stats.maxLasers) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.lasers = loadout.lasers.map(uid => uid === inventoryUid ? null : uid);
      loadout.lasers[index] = inventoryUid;
    }else if(type === "generator"){
      if(item.category !== "generateur") return showToast("Ce n'est pas un générateur.");
      if(index >= ship.stats.maxGenerators) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.generators = loadout.generators.map(uid => uid === inventoryUid ? null : uid);
      loadout.generators[index] = inventoryUid;
    }else{
      if(item.category !== "extra") return showToast("Ce n'est pas un extra.");
      if(index >= (ship.stats.maxExtras || 3)) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.extras = loadout.extras.map(uid => uid === inventoryUid ? null : uid);
      loadout.extras[index] = inventoryUid;
    }
    store.state.shipLoadouts[ship.id] = loadout;
    showToast(`${item.name} équipé sur ${ship.name}.`);
    renderAll();
    return;
  }

  if(type === "drone"){
    const drones = getDroneLoadout();
    if(index >= drones.length) return showToast("Aucun drone à cet emplacement.");
    if(!["canon","generateur"].includes(item.category)) return showToast("Un drone accepte uniquement un laser ou un générateur.");
    if(!canMoveInventoryItemToTarget(inventoryUid, {location:"drone", index})) return;
    for(let i=0;i<drones.length;i++) if(drones[i] === inventoryUid) drones[i] = null;
    drones[index] = inventoryUid;
    showToast(`${item.name} équipé sur Drone ${index+1}.`);
    renderAll();
  }
}

function autoEquipInventoryItem(inventoryUid){
  store.selectedInventoryUid = inventoryUid;
  const item = getItemFromInventoryUid(inventoryUid);
  if(!item) return;

  if(store.hangarTab === "drone"){
    const drones = getDroneLoadout();
    if(!drones.length) return showToast("Achète d'abord un drone.");
    if(!["canon","generateur"].includes(item.category)) return showToast("Cet équipement n'est pas compatible avec les drones.");
    const currentIndex = drones.indexOf(inventoryUid);
    let index = currentIndex >= 0 ? currentIndex : drones.findIndex(uid=>!uid);
    if(index < 0) index = 0;
    equipPart("drone", index, inventoryUid);
    return;
  }

  const ship = getShip(store.state.selectedShip);
  if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
  const loadout = getLoadout(ship.id);
  const type = item.category === "canon" ? "laser" : item.category === "generateur" ? "generator" : item.category === "extra" ? "extra" : null;
  if(!type) return showToast("Cet équipement n'est pas montable sur un vaisseau pour le moment.");
  const slots = type === "laser" ? loadout.lasers : type === "generator" ? loadout.generators : loadout.extras;
  const currentIndex = slots.indexOf(inventoryUid);
  let index = currentIndex >= 0 ? currentIndex : slots.findIndex(uid=>!uid);
  if(index < 0) index = 0;
  equipPart(type, index, inventoryUid);
}

function unequipPart(type, index){
  if(type === "drone"){
    const drones = getDroneLoadout();
    if(index >= 0 && index < drones.length) drones[index] = null;
    showToast(`Drone ${index+1} vidé.`);
    renderAll();
    return;
  }
  const ship = getShip(store.state.selectedShip);
  const loadout = getLoadout(ship.id);
  if(type === "laser") loadout.lasers[index] = null;
  else if(type === "generator") loadout.generators[index] = null;
  else if(type === "extra") loadout.extras[index] = null;
  store.state.shipLoadouts[ship.id] = loadout;
  showToast(`Slot ${index+1} vidé sur ${ship.name}.`);
  renderAll();
}


function unlockPortalWithPieces(id){
  const portal = getPortal(id);
  if(!portal) return;
  if(isPortalUnlocked(id)) return showToast(`${portal.name} est déjà déverrouillé.`);
  if(getPortalPieces(id) < portal.piecesRequired) return showToast(`Il faut ${portal.piecesRequired} pièces.`);
  store.state.portalPieces[id] = Math.max(0, getPortalPieces(id) - portal.piecesRequired);
  unlockPortal(id);
  showToast(`${portal.name} déverrouillé avec des pièces.`);
  renderAll();
}

function unlockPortalWithNova(id){
  const portal = getPortal(id);
  if(!portal) return;
  if(isPortalUnlocked(id)) return showToast(`${portal.name} est déjà déverrouillé.`);
  if(!canAfford("premium", portal.novaCost)) return showToast("Pas assez de NOVA.");
  spend("premium", portal.novaCost);
  unlockPortal(id);
  showToast(`${portal.name} déverrouillé avec ${portal.novaCost.toLocaleString("fr-FR")} NOVA.`);
  renderAll();
}

function unlockSkill(id){
  const result = upgradeSkill(id);
  if(!result?.ok) return showToast(result?.reason || "Impossible d'améliorer cette compétence.");
  showToast(`${result.skill.name} niveau ${result.level} atteint.`);
  renderAll();
}

document.addEventListener("click", (e)=>{
  const shipCard = e.target.closest("[data-ship-id]");
  if(shipCard){
    store.hangarTab = "vaisseau";
    store.state.selectedShip = shipCard.dataset.shipId;
    store.hangarDetailOpen = true;
    renderAll();
    return;
  }

  const hangarTab = e.target.closest("[data-hangar-tab]");
  if(hangarTab){
    store.hangarTab = hangarTab.dataset.hangarTab === "extra" ? "vaisseau" : hangarTab.dataset.hangarTab;
    store.hangarDetailOpen = store.hangarTab === "vaisseau" ? store.hangarDetailOpen : false;
    renderAll();
    return;
  }

  const changeKeyBtn = e.target.closest("[data-change-slot-key]");
  if(changeKeyBtn){
    pendingKeybindSlot = Number(changeKeyBtn.dataset.changeSlotKey);
    showToast(`Appuie sur la nouvelle touche pour le slot ${pendingKeybindSlot + 1}.`);
    return;
  }

  const resetKeyBtn = e.target.closest("[data-reset-keybinds]");
  if(resetKeyBtn){
    store.state.slotKeybinds = [...DEFAULT_SLOT_KEYBINDS];
    pendingKeybindSlot = null;
    saveState();
    showToast("Touches des slots réinitialisées.");
    renderAll();
    return;
  }

  const resetSaveBtn = e.target.closest("[data-reset-save]");
  if(resetSaveBtn){
    const ok = window.confirm("Remettre VoidSector a zero  Toute la progression locale sera supprimee.");
    if(!ok) return;
    window.__voidsectorResetInProgress = true;
    sessionStorage.setItem("voidsector-reset-requested", "1");
    localStorage.removeItem("voidsector-prototype-state");
    window.location.reload();
    return;
  }

  const itemBtn = e.target.closest("[data-buy-item]");
  if(itemBtn){ buyItem(itemBtn.dataset.buyItem); return; }

  const ammoBtn = e.target.closest("[data-buy-ammo]");
  if(ammoBtn){ buyAmmo(ammoBtn.dataset.buyAmmo); return; }

  const shipBuy = e.target.closest("[data-buy-shop-ship]");
  if(shipBuy){ buyShip(shipBuy.dataset.buyShopShip); return; }

  const droneBuy = e.target.closest("[data-buy-combat-drone]");
  if(droneBuy){ buyCombatDrone(); return; }

  const skillCard = e.target.closest("[data-unlock-skill]");
  if(skillCard){ unlockSkill(skillCard.dataset.unlockSkill); return; }

  const nav = e.target.closest("[data-view]");
  if(nav){ setView(nav.dataset.view); return; }

  const portalUnlockPieces = e.target.closest("[data-unlock-portal-pieces]");
  if(portalUnlockPieces){ unlockPortalWithPieces(portalUnlockPieces.dataset.unlockPortalPieces); return; }

  const portalUnlockNova = e.target.closest("[data-unlock-portal-nova]");
  if(portalUnlockNova){ unlockPortalWithNova(portalUnlockNova.dataset.unlockPortalNova); return; }

  const portalBtn = e.target.closest("[data-start-portal]");
  if(portalBtn){
    if(!store.state.activeShip) return showToast("Équipe un vaisseau avant d'entrer dans un portail.");
    Game.start(`portal:${portalBtn.dataset.startPortal}`);
    return;
  }

  const shopFilterBtn = e.target.closest("[data-filter-shop]");
  if(shopFilterBtn){
    store.shopFilter = shopFilterBtn.dataset.filterShop;
    store.selectedShopProduct = null;
    renderShop();
    return;
  }

  const shopSelect = e.target.closest("[data-select-shop]");
  if(shopSelect){
    store.selectedShopProduct = shopSelect.dataset.selectShop;
    renderShop();
    return;
  }

  const inventoryCard = e.target.closest("[data-inventory-uid]");
  if(inventoryCard){
    const uid = inventoryCard.dataset.inventoryUid;
    clearTimeout(inventoryClickTimer);
    if(e.detail > 1) return;
    inventoryClickTimer = setTimeout(()=>{
      store.selectedInventoryUid = uid;
      renderAll();
    }, 180);
    return;
  }

  const inventoryEquipBtn = e.target.closest("[data-inventory-equip]");
  if(inventoryEquipBtn){
    autoEquipInventoryItem(inventoryEquipBtn.dataset.inventoryEquip);
    return;
  }

  const inventoryUnequipBtn = e.target.closest("[data-inventory-unequip]");
  if(inventoryUnequipBtn){
    const uid = inventoryUnequipBtn.dataset.inventoryUnequip;
    if(!unequipInventoryItem(uid)) return showToast("Objet déjà retiré.");
    showToast("Équipement retiré.");
    renderAll();
    return;
  }

  const equip = e.target.closest("[data-equip-part]");
  if(equip){ equipPart(equip.dataset.equipPart, Number(equip.dataset.equipIndex), equip.dataset.equipItem); return; }

  const unequip = e.target.closest("[data-unequip-part]");
  if(unequip){ unequipPart(unequip.dataset.unequipPart, Number(unequip.dataset.unequipIndex)); return; }
});

document.addEventListener("dblclick", (e)=>{
  const inventoryCard = e.target.closest("[data-inventory-uid]");
  if(!inventoryCard) return;
  clearTimeout(inventoryClickTimer);
  store.selectedInventoryUid = inventoryCard.dataset.inventoryUid;
  autoEquipInventoryItem(inventoryCard.dataset.inventoryUid);
});

document.addEventListener("dragstart", (e)=>{
  const inventoryCard = e.target.closest("[data-inventory-uid]");
  if(!inventoryCard) return;
  e.dataTransfer.setData("text/plain", inventoryCard.dataset.inventoryUid);
  e.dataTransfer.effectAllowed = "move";
});

document.addEventListener("dragover", (e)=>{
  if(e.target.closest("[data-drop-part]")) e.preventDefault();
});

document.addEventListener("drop", (e)=>{
  const slot = e.target.closest("[data-drop-part]");
  if(!slot) return;
  e.preventDefault();
  const uid = e.dataTransfer.getData("text/plain");
  equipPart(slot.dataset.dropPart, Number(slot.dataset.dropIndex), uid);
});

document.getElementById("selectedShipAction").addEventListener("click", equipSelectedShip);
document.getElementById("backToShipsBtn").addEventListener("click", ()=>{
  store.hangarDetailOpen = false;
  store.hangarTab = "vaisseau";
  renderAll();
});
document.getElementById("startGameBtn").addEventListener("click", ()=>{
  if(!store.state.activeShip) return showToast("Équipe un vaisseau avant de lancer la mission.");
  Game.start();
});
document.getElementById("returnDashboardBtn").addEventListener("click", ()=>Game.stop(true));
document.addEventListener("keydown", e=>{
  if(pendingKeybindSlot !== null){
    e.preventDefault();
    const code = eventToCode(e);
    if(code === "Escape"){
      pendingKeybindSlot = null;
      showToast("Modification de touche annulée.");
      return;
    }
    const next = normalizeSlotKeybinds(store.state.slotKeybinds);
    const duplicate = next.findIndex((value, index)=>value === code && index !== pendingKeybindSlot);
    if(duplicate >= 0){
      showToast(`La touche ${keyCodeToLabel(code)} est déjà utilisée par le slot ${duplicate + 1}.`);
      return;
    }
    next[pendingKeybindSlot] = code;
    store.state.slotKeybinds = normalizeSlotKeybinds(next);
    showToast(`Slot ${pendingKeybindSlot + 1} assigné à ${keyCodeToLabel(code)}.`);
    pendingKeybindSlot = null;
    saveState();
    renderAll();
    return;
  }
});

window.addEventListener("beforeunload", ()=>{
  try{ saveState(); }catch(e){}
});

if(sessionStorage.getItem("voidsector-reset-requested") === "1"){
  sessionStorage.removeItem("voidsector-reset-requested");
  localStorage.removeItem("voidsector-prototype-state");
}
loadState();
setView("hangar");
renderAll();
showToast("Hangar vaisseaux / drones chargé.");
