const directory = "assets/equipment/repair-drones-native-v1";

export const REPAIR_DRONE_VISUALS = Object.freeze({
  blue:Object.freeze({id:"blue", body:`${directory}/blue.webp`, icon:`${directory}/blue.webp`, color:"#5de3ff", rgb:"93,227,255", size:66}),
  yellow:Object.freeze({id:"yellow", body:`${directory}/yellow.webp`, icon:`${directory}/yellow.webp`, color:"#ffd36b", rgb:"255,211,107", size:66}),
  red:Object.freeze({id:"red", body:`${directory}/red.webp`, icon:`${directory}/red.webp`, color:"#ff777d", rgb:"255,119,125", size:66})
});

// Resolve both current artwork and older canonical snapshots without changing equipment.
export function getRepairDroneVisual(extraBonus = {}){
  const source = String(extraBonus.repairBotImg || "").toLowerCase();
  if(source.includes("yellow")) return REPAIR_DRONE_VISUALS.yellow;
  if(source.includes("red")) return REPAIR_DRONE_VISUALS.red;
  if(source.includes("blue") || source.includes("starter")) return REPAIR_DRONE_VISUALS.blue;
  const rate = Number(extraBonus.repairBotHealRate || 0);
  return rate >= .02 ? REPAIR_DRONE_VISUALS.red : rate >= .015 ? REPAIR_DRONE_VISUALS.yellow : REPAIR_DRONE_VISUALS.blue;
}
