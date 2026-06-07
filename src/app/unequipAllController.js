function countLoadoutItems(loadout){
  return [
    ...(Array.isArray(loadout?.lasers) ? loadout.lasers : []),
    loadout?.missileLauncher,
    loadout?.rocketLauncher,
    ...(Array.isArray(loadout?.generators) ? loadout.generators : []),
    ...(Array.isArray(loadout?.extras) ? loadout.extras : [])
  ].filter(Boolean).length;
}

export function createUnequipAllController({
  store,
  getShip,
  getLoadout,
  unequipSelectedShipLoadout,
  showToast
}){
  function close(){
    document.getElementById("unequipAllModal")?.remove();
  }

  function open(){
    close();
    const ship = getShip(store.state.selectedShip);
    if(!ship) return false;
    const count = countLoadoutItems(getLoadout(ship.id));
    if(!count){
      showToast(`Aucun equipement a retirer sur ${ship.name}.`);
      return true;
    }
    const modal = document.createElement("div");
    modal.id = "unequipAllModal";
    modal.className = "unequip-all-modal";
    modal.innerHTML = `
      <section class="unequip-all-dialog frame" role="dialog" aria-modal="true" aria-labelledby="unequipAllTitle">
        <button type="button" class="unequip-all-close" data-unequip-all-close aria-label="Fermer">x</button>
        <span class="tiny">HANGAR</span>
        <h3 id="unequipAllTitle">D&eacute;s&eacute;quiper tous les &eacute;quipements ?</h3>
        <p>Cette action retire tout l'equipement du vaisseau ${ship.name} et le remet disponible dans l'inventaire.</p>
        <div class="unequip-all-summary"><span>Equipements concernes</span><strong>${count}</strong></div>
        <div class="unequip-all-actions">
          <button type="button" class="blue-button secondary" data-unequip-all-close>ANNULER</button>
          <button type="button" class="blue-button danger" data-unequip-all-confirm>TOUT RETIRER</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    return true;
  }

  function confirm(){
    const sent = unequipSelectedShipLoadout();
    if(sent) close();
    return true;
  }

  function handleClick(event){
    if(event.target.closest("[data-unequip-all-open]")) return open();
    if(event.target.closest("[data-unequip-all-confirm]")) return confirm();
    if(event.target.closest("[data-unequip-all-close]") || event.target.id === "unequipAllModal"){
      close();
      return true;
    }
    return false;
  }

  return {handleClick, close};
}
