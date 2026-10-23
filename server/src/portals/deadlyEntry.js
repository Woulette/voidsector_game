import { getFirmMapId } from "../../../src/data/firms.js";
import { WORLD_MAPS } from "../world/definitions.js";
import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import { RICKY_PORTAL_KEY_ITEM_ID } from "./rickyPortalState.js";

export function isAtDeadlyEntrance(player, profile){
  const mapId = String(getFirmMapId(profile?.player?.firmId || player?.account?.firmId || "astra",2));
  if(String(player?.state?.mapId ?? player?.mapId ?? "") !== mapId) return false;
  const gate = WORLD_MAPS[mapId]?.closedPortals?.[0];
  return Boolean(gate) && Math.hypot(Number(player.state?.x)-gate.x, Number(player.state?.y)-gate.y) <= 340;
}

export function createDeadlyEntryGate({players, groups, profileManager, emitProfileSync}){
  const pending = new Set();
  function run({socket, player, group, consume, enter, joining = false}){
    const key = String(player.accountId || player.id);
    if(pending.has(key)){
      socket.emit("portal:error",{message:"Une entree dans Deadly est deja en cours."});
      return false;
    }
    const before = profileManager.getProfileForPlayer(player);
    if(!isAtDeadlyEntrance(player,before)){
      socket.emit("portal:error",{message:"Approche du portail Deadly sur ta map 2 puis appuie sur J."});
      return false;
    }
    pending.add(key);
    const expectedInstance = group.instance;
    let payment;
    try{payment = consume();}catch(error){pending.delete(key);throw error;}
    if(!payment?.ok){
      pending.delete(key);
      socket.emit("portal:error",{message:payment?.reason || "Entree impossible."});
      return false;
    }
    const admit = ()=>{
      const current = profileManager.getProfileForPlayer(player);
      const valid = players.get(player.id) === player && groups.get(group.id) === group
        && player.groupId === group.id && group.members.includes(player.id)
        && group.instance === expectedInstance && (!joining || !expectedInstance?.completed)
        && (joining || group.leaderId === player.id)
        && !player.deathState && Number(player.state?.hp || 0) > 0 && isAtDeadlyEntrance(player,current);
      if(valid){
        emitProfileSync?.(player,current);
        return enter();
      }
      // The saved key pays for an admission. If its context changed, return it once.
      const refund = profileManager.updateProfileForPlayer({player,update:profile=>{
        addInventoryItemAmount(profile,RICKY_PORTAL_KEY_ITEM_ID,1);
        return {ok:true};
      }});
      const notify = ()=>{
        if(refund?.ok) emitProfileSync?.(player,refund.profile);
        socket.emit("portal:error",{message:refund?.ok
          ? "Entree annulee : le groupe ou la position a change. Cle restituee."
          : "Entree annulee. Restitution de la cle indisponible."});
        return false;
      };
      return refund?.save ? refund.save.then(notify) : notify();
    };
    const failed = ()=>{
      socket.emit("portal:error",{message:"Sauvegarde temporairement indisponible. Entree refusee."});
      return false;
    };
    if(payment.save) return Promise.resolve(payment.save).then(admit).catch(failed).finally(()=>pending.delete(key));
    try{return admit();}finally{pending.delete(key);}
  }
  return {run};
}
