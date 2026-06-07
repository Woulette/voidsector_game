import { getServerItem } from "./equipment.js";

export function isStackableInventoryItem(itemId){
  return getServerItem(itemId)?.category === "quest_item";
}

export function getInventoryEntryQuantity(entry){
  return Math.max(1, Math.floor(Number(entry?.quantity || 1)));
}

export function getInventoryItemCount(profile, itemId){
  return (profile?.inventoryItems || []).reduce((total, entry)=>
    entry?.itemId === itemId ? total + getInventoryEntryQuantity(entry) : total, 0);
}

export function addInventoryItemAmount(profile, itemId, amount = 1){
  if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
  const count = Math.max(0, Math.floor(Number(amount || 0)));
  if(count <= 0) return null;
  if(isStackableInventoryItem(itemId)){
    const existing = profile.inventoryItems.find(entry=>entry?.itemId === itemId);
    if(existing){
      existing.quantity = getInventoryEntryQuantity(existing) + count;
      return existing;
    }
  }
  const nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
  const entry = {uid:`inv_${itemId}_${nextUid}`, itemId};
  if(isStackableInventoryItem(itemId)) entry.quantity = count;
  profile.inventoryItems.push(entry);
  profile.nextInventoryUid = nextUid + 1;
  return entry;
}

export function consumeInventoryItemAmount(profile, itemId, amount){
  let remaining = Math.max(0, Math.floor(Number(amount || 0)));
  if(remaining <= 0) return true;
  if(getInventoryItemCount(profile, itemId) < remaining) return false;
  profile.inventoryItems = profile.inventoryItems.filter(entry=>{
    if(entry?.itemId !== itemId || remaining <= 0) return true;
    const quantity = getInventoryEntryQuantity(entry);
    const consumed = Math.min(quantity, remaining);
    remaining -= consumed;
    if(consumed >= quantity) return false;
    entry.quantity = quantity - consumed;
    return true;
  });
  return remaining <= 0;
}
