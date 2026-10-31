export function getAmmoCooldownKey(ammo){
  if(ammo?.weaponClass === "laser" && ammo.id === "ammo_x6") return "laser_x6";
  return ammo?.weaponClass || "laser";
}
