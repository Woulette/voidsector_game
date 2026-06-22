export const SHIP_ABILITY_DEFINITIONS = Object.freeze({
  vesperion:Object.freeze([
    Object.freeze({
      id:"absorbing_fire",
      shipId:"vesperion",
      name:"Tir absorbant",
      shortName:"ABSORPTION",
      description:"Pendant 20 secondes, 50 % des dégâts laser réellement infligés restaurent la coque.",
      icon:"assets/icons/absorbing_fire.svg",
      durationMs:20_000,
      cooldownMs:180_000,
      lifeStealRatio:0.5,
      weaponClass:"laser"
    })
  ])
});

export function getShipAbilityDefinitions(shipId){
  const definitions = SHIP_ABILITY_DEFINITIONS[String(shipId || "")];
  return Array.isArray(definitions) ? definitions : [];
}

export function getShipAbilityDefinition(shipId, abilityId = ""){
  const definitions = getShipAbilityDefinitions(shipId);
  if(!abilityId) return definitions[0] || null;
  return definitions.find(definition=>definition.id === String(abilityId)) || null;
}

export function normalizeShipAbilityState(value = {}){
  return {
    activeUntil:Math.max(0, Number(value?.activeUntil || 0)),
    cooldownUntil:Math.max(0, Number(value?.cooldownUntil || 0))
  };
}

function getAbilityStateValue(value, abilityId){
  if(value && typeof value === "object" && !Array.isArray(value)){
    if(Object.hasOwn(value, "activeUntil") || Object.hasOwn(value, "cooldownUntil")) return value;
    if(value[abilityId] && typeof value[abilityId] === "object") return value[abilityId];
  }
  return {};
}

export function getShipAbilityStatus(shipId, value = {}, now = Date.now(), abilityId = ""){
  const definition = getShipAbilityDefinition(shipId, abilityId);
  const state = normalizeShipAbilityState(getAbilityStateValue(value, definition?.id || abilityId));
  return {
    shipId:String(shipId || ""),
    abilityId:definition?.id || "",
    name:definition?.name || "",
    shortName:definition?.shortName || definition?.name || "",
    description:definition?.description || "",
    icon:definition?.icon || "",
    weaponClass:definition?.weaponClass || "",
    activeUntil:state.activeUntil,
    cooldownUntil:state.cooldownUntil,
    active:Boolean(definition && state.activeUntil > now),
    activeRemainingMs:Math.max(0, state.activeUntil - now),
    cooldownRemainingMs:Math.max(0, state.cooldownUntil - now),
    durationMs:Number(definition?.durationMs || 0),
    cooldownMs:Number(definition?.cooldownMs || 0),
    lifeStealRatio:Number(definition?.lifeStealRatio || 0)
  };
}

export function getShipAbilityStatuses(shipId, value = {}, now = Date.now()){
  return getShipAbilityDefinitions(shipId).map(definition=>getShipAbilityStatus(shipId, value, now, definition.id));
}
