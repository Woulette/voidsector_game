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
  ]),
  nyxaris:Object.freeze([
    Object.freeze({
      id:"poison_bomb",
      shipId:"nyxaris",
      name:"Bombe poison",
      shortName:"POISON",
      description:"Projette 5 vagues toxiques autour du vaisseau : immediatement, puis a 2,5 s, 5 s, 7,5 s et 10 s. Chaque vague suit le vaisseau pendant 1 seconde. Les monstres touches subissent 10 000 HP/s pendant 10 secondes. Une nouvelle touche rafraichit le poison sans le cumuler.",
      icon:"assets/icons/poison_bomb.svg",
      durationMs:10_000,
      cooldownMs:180_000,
      effectType:"enemy_poison_bomb",
      radius:300,
      pulseCount:5,
      pulseIntervalMs:2_500,
      pulseDurationMs:1_000,
      poisonDamagePerSecond:10_000,
      poisonDurationMs:10_000,
      poisonTickMs:1_000
    })
  ]),
  asterion:Object.freeze([
    Object.freeze({
      id:"spectral_double_shot",
      shipId:"asterion",
      name:"Salve spectrale",
      shortName:"SALVE",
      description:"Pendant 30 secondes, une charge spectrale se prepare en 3 secondes. Quand elle est prete, le prochain tir laser declenche un second impact violet plus large et agressif, puis la charge recommence.",
      icon:"assets/icons/spectral_double_shot.svg",
      durationMs:30_000,
      cooldownMs:180_000,
      effectType:"laser_double_strike",
      weaponClass:"laser",
      chargeMs:3_000,
      chargeSegments:3,
      bonusHitMultiplier:1
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
    cooldownUntil:Math.max(0, Number(value?.cooldownUntil || 0)),
    chargeStartedAt:Math.max(0, Number(value?.chargeStartedAt || 0)),
    chargeReadyAt:Math.max(0, Number(value?.chargeReadyAt || 0))
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
  const active = Boolean(definition && state.activeUntil > now);
  const chargeMs = Math.max(0, Number(definition?.chargeMs || 0));
  const chargeStartedAt = state.chargeStartedAt;
  const chargeReadyAt = state.chargeReadyAt || (chargeMs > 0 && chargeStartedAt > 0 ? chargeStartedAt + chargeMs : 0);
  const chargeProgressMs = active && chargeMs > 0 && chargeStartedAt > 0
    ? Math.max(0, Math.min(chargeMs, now - chargeStartedAt))
    : 0;
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
    active,
    activeRemainingMs:Math.max(0, state.activeUntil - now),
    cooldownRemainingMs:Math.max(0, state.cooldownUntil - now),
    durationMs:Number(definition?.durationMs || 0),
    cooldownMs:Number(definition?.cooldownMs || 0),
    lifeStealRatio:Number(definition?.lifeStealRatio || 0),
    effectType:definition?.effectType || "",
    radius:Number(definition?.radius || 0),
    pulseCount:Number(definition?.pulseCount || 0),
    pulseIntervalMs:Number(definition?.pulseIntervalMs || 0),
    pulseDurationMs:Number(definition?.pulseDurationMs || 0),
    poisonDamagePerSecond:Number(definition?.poisonDamagePerSecond || 0),
    poisonDurationMs:Number(definition?.poisonDurationMs || 0),
    poisonTickMs:Number(definition?.poisonTickMs || 0),
    triggerEvery:Number(definition?.triggerEvery || 0),
    chargeMs,
    chargeSegments:Math.max(0, Number(definition?.chargeSegments || 0)),
    chargeStartedAt,
    chargeReadyAt,
    chargeProgressMs,
    chargeReady:Boolean(active && chargeMs > 0 && chargeReadyAt > 0 && chargeReadyAt <= now),
    bonusHitMultiplier:Number(definition?.bonusHitMultiplier || 0)
  };
}

export function getShipAbilityStatuses(shipId, value = {}, now = Date.now()){
  return getShipAbilityDefinitions(shipId).map(definition=>getShipAbilityStatus(shipId, value, now, definition.id));
}
