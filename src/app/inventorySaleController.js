import { currencyAmountHtml } from "../ui/currencyIcons.js";

function getSaleValue(item){
  const price = Math.max(0, Math.round(Number(item?.price || 0)));
  if(!item || item.shop === false || item.category === "quest_item" || price <= 0) return null;
  return {
    priceType:item.priceType === "premium" ? "premium" : "credits",
    amount:Math.max(1, Math.floor(price * 0.35))
  };
}

export function createInventorySaleController({
  multiplayer,
  getInventoryItem,
  getItem,
  findEquippedSlot,
  sellServerInventoryItem,
  showToast
}){
  let pendingInventoryUid = null;

  function close(){
    document.getElementById("inventorySaleModal")?.remove();
    pendingInventoryUid = null;
  }

  function open(inventoryUid){
    close();
    const entry = getInventoryItem(inventoryUid);
    const item = entry ? getItem(entry.itemId) : null;
    const value = getSaleValue(item);
    if(!entry || !item || !value) return showToast("Cet objet ne peut pas etre vendu.");
    pendingInventoryUid = entry.uid;
    const equipped = Boolean(findEquippedSlot(entry.uid));
    const modal = document.createElement("div");
    modal.id = "inventorySaleModal";
    modal.className = "inventory-sale-modal";
    modal.innerHTML = `
      <section class="inventory-sale-dialog frame" role="dialog" aria-modal="true" aria-labelledby="inventorySaleTitle">
        <button type="button" class="inventory-sale-close" data-inventory-sale-close aria-label="Fermer">x</button>
        <span class="tiny">VENTE D'EQUIPEMENT</span>
        <div class="inventory-sale-item">
          <img src="${item.img}" alt="${item.name}">
          <div><h3 id="inventorySaleTitle">${item.name}</h3><p>Cette vente est definitive.</p></div>
        </div>
        <div class="inventory-sale-price">
          <span>Prix de vente</span>
          <strong>${currencyAmountHtml(value.priceType, value.amount)}</strong>
        </div>
        ${equipped ? `<p class="inventory-sale-warning">Retire cet objet de son emplacement avant de le vendre.</p>` : ""}
        <div class="inventory-sale-actions">
          <button type="button" class="blue-button secondary" data-inventory-sale-close>ANNULER</button>
          <button type="button" class="blue-button danger" data-inventory-sale-confirm ${equipped ? "disabled" : ""}>VENDRE</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
  }

  function confirm(){
    if(!pendingInventoryUid) return;
    if(!multiplayer.connected) return showToast("La vente est disponible uniquement en mode MMO.");
    if(findEquippedSlot(pendingInventoryUid)) return showToast("Retire l'objet avant de le vendre.");
    if(!sellServerInventoryItem(pendingInventoryUid)) return showToast("Vente impossible.");
    close();
    showToast("Vente envoyee au serveur.");
  }

  function handleClick(event){
    const openButton = event.target.closest("[data-inventory-sell]");
    if(openButton){
      open(openButton.dataset.inventorySell);
      return true;
    }
    if(event.target.closest("[data-inventory-sale-confirm]")){
      confirm();
      return true;
    }
    if(event.target.closest("[data-inventory-sale-close]") || event.target.id === "inventorySaleModal"){
      close();
      return true;
    }
    return false;
  }

  return {handleClick, close};
}
