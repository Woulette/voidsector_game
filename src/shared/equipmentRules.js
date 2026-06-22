export function getExtraEquipGroup(item){
  if(item?.category !== "extra") return "";
  return String(item.equipGroup || item.id || "");
}

export function findMatchingExtraGroupIndex(extras, item, getItemFromUid, ignoredUid = ""){
  const group = getExtraEquipGroup(item);
  if(!group || !Array.isArray(extras)) return -1;
  return extras.findIndex(uid=>{
    if(!uid || uid === ignoredUid) return false;
    return getExtraEquipGroup(getItemFromUid?.(uid)) === group;
  });
}
