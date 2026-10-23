export const NPC_ELITE_LASER_CHARGE_SECONDS = 5;
export const NPC_ELITE_LASER_RESET_MS = 10_000;
export const NPC_ELITE_GREEN_LIFESTEAL_PER_LASER = .01;
export const NPC_ELITE_GREEN_LIFESTEAL_MAX = .25;
export const NPC_ELITE_RED_DAMAGE_PER_LASER = .01;
export const NPC_ELITE_RED_DAMAGE_MAX = .25;
export const NPC_ELITE_BLUE_CADENCE_PER_LASER = .005;
export const NPC_ELITE_BLUE_CADENCE_MAX = .15;

function clampCharge(value){
  return Math.max(0, Math.min(NPC_ELITE_LASER_CHARGE_SECONDS, Number(value || 0)));
}

function normalizedColor(value){
  const color = String(value || "").toLowerCase();
  return color === "green" || color === "red" || color === "blue" ? color : "";
}

function blankState(){
  return {
    lastShotAt:0,
    charge:0,
    phase:"charge"
  };
}

function normalizeState(value){
  const state = value && typeof value === "object" ? value : {};
  return {
    lastShotAt:Math.max(0, Number(state.lastShotAt || 0)),
    charge:clampCharge(state.charge),
    phase:state.phase === "discharge" ? "discharge" : "charge"
  };
}

function advanceBlue(state, elapsedSeconds){
  let charge = clampCharge(state.charge);
  let phase = state.phase === "discharge" ? "discharge" : "charge";
  let remaining = Math.max(0, Number(elapsedSeconds || 0));
  if(phase === "discharge"){
    if(remaining < charge){
      return {charge:clampCharge(charge - remaining), phase:"discharge"};
    }
    remaining -= charge;
    charge = 0;
    phase = "charge";
  }
  charge = clampCharge(charge + remaining);
  return {charge, phase};
}

export function prepareNpcEliteLaserAttack(enemy, {
  amount,
  cooldownMs,
  now = Date.now()
} = {}){
  const color = normalizedColor(enemy?.eclaniteLaser?.color || enemy?.npcEliteLaser?.color);
  const count = Math.max(0, Math.floor(Number(
    enemy?.eclaniteLaser?.count
      ?? enemy?.npcEliteLaser?.count
      ?? 0
  )));
  const baseAmount = Math.max(0, Number(amount || 0));
  const baseCooldownMs = Math.max(1, Number(cooldownMs || 1));
  if(!color || count <= 0){
    return {
      amount:baseAmount,
      cooldownMs:baseCooldownMs,
      eliteLaser:null
    };
  }

  const previous = normalizeState(enemy.npcEliteLaserState);
  const reset = previous.lastShotAt <= 0 || now - previous.lastShotAt > NPC_ELITE_LASER_RESET_MS;
  const elapsedSeconds = reset
    ? 0
    : Math.max(0, Math.min(NPC_ELITE_LASER_RESET_MS, now - previous.lastShotAt)) / 1000;
  const next = reset ? blankState() : previous;
  let triggered = false;
  let lifeStealPercent = 0;
  let damageBonus = 0;
  let cadenceBonus = 0;

  if(color === "blue"){
    const advanced = advanceBlue(next, elapsedSeconds);
    next.charge = advanced.charge;
    next.phase = advanced.phase;
    if(next.phase !== "discharge" && next.charge >= NPC_ELITE_LASER_CHARGE_SECONDS){
      next.phase = "discharge";
      next.charge = NPC_ELITE_LASER_CHARGE_SECONDS;
      triggered = true;
    }
    if(next.phase === "discharge"){
      cadenceBonus = Math.min(count * NPC_ELITE_BLUE_CADENCE_PER_LASER, NPC_ELITE_BLUE_CADENCE_MAX);
    }
  }else{
    next.charge = clampCharge(next.charge + elapsedSeconds);
    triggered = next.charge >= NPC_ELITE_LASER_CHARGE_SECONDS;
    if(triggered) next.charge = 0;
    if(color === "green" && triggered){
      lifeStealPercent = Math.min(count * NPC_ELITE_GREEN_LIFESTEAL_PER_LASER, NPC_ELITE_GREEN_LIFESTEAL_MAX);
    }
    if(color === "red" && triggered){
      damageBonus = Math.min(count * NPC_ELITE_RED_DAMAGE_PER_LASER, NPC_ELITE_RED_DAMAGE_MAX);
    }
  }

  next.lastShotAt = Number(now || Date.now());
  enemy.npcEliteLaserState = next;
  const cooldownMultiplier = cadenceBonus > 0 ? 1 / (1 + cadenceBonus) : 1;
  return {
    amount:baseAmount * (1 + damageBonus),
    cooldownMs:baseCooldownMs * cooldownMultiplier,
    eliteLaser:{
      color,
      count,
      triggered,
      charge:next.charge,
      phase:next.phase,
      lifeStealPercent,
      damageBonus,
      cadenceBonus,
      cooldownMultiplier,
      updatedAt:next.lastShotAt
    }
  };
}
