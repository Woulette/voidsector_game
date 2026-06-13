export function createFirmCommands({multiplayer, toast}){
  function emit(event, payload = {}){
    if(!multiplayer.connected || !multiplayer.socket){
      toast("Connecte-toi au serveur pour utiliser les fonctions de firme.");
      return false;
    }
    multiplayer.socket.emit(event, payload);
    return true;
  }

  return {
    requestFirmSync:({includeShop = false} = {})=>emit("firm:sync", {includeShop}),
    buyFirmShopItem:id=>id ? emit("firm:shop-buy", {id}) : false,
    openFirmBox:rarity=>rarity ? emit("firm:box-open", {rarity}) : false,
    claimFirmRewards:()=>emit("firm:reward-claim"),
    claimFirmQuest:id=>id ? emit("firm:quest-claim", {id}) : false,
    acceptFirmQuest:id=>id ? emit("firm:quest-accept", {id}) : false
  };
}
