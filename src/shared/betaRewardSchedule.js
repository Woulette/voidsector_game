export const BETA_REWARD_TIME_ZONE = "Europe/Paris";
export const BETA_REWARD_RESET_HOUR = 8;

const parisClock = new Intl.DateTimeFormat("en-CA", {
  timeZone:BETA_REWARD_TIME_ZONE,
  year:"numeric", month:"2-digit", day:"2-digit",
  hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
});

function utcCivilTime({year, month, day, hour = 0, minute = 0, second = 0}){
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function parisParts(at){
  return Object.fromEntries(parisClock.formatToParts(at)
    .filter(part=>part.type !== "literal")
    .map(part=>[part.type, Number(part.value)]));
}

function dateKey({year, month, day}){
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeBetaRewardDateKey(value){
  const key = typeof value === "string" ? value : "";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  const [year, month, day] = key.split("-").map(Number);
  const at = utcCivilTime({year, month, day});
  return Number.isFinite(at) && dateKey({
    year:new Date(at).getUTCFullYear(),
    month:new Date(at).getUTCMonth() + 1,
    day:new Date(at).getUTCDate()
  }) === key ? key : "";
}

function shiftDate(key, days){
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(utcCivilTime({year, month, day:day + days}));
  return dateKey({year:date.getUTCFullYear(), month:date.getUTCMonth() + 1, day:date.getUTCDate()});
}

// Convert the civil Paris reset to an instant; a fixed 24-hour addition would
// make the reward arrive an hour early or late on clock-change weekends.
export function getBetaRewardResetAt(key){
  const validKey = normalizeBetaRewardDateKey(key);
  if(!validKey) return null;
  const [year, month, day] = validKey.split("-").map(Number);
  const civil = utcCivilTime({year, month, day, hour:BETA_REWARD_RESET_HOUR});
  let at = civil;
  for(let attempt = 0; attempt < 3; attempt += 1){
    const offset = utcCivilTime(parisParts(at)) - at;
    const corrected = civil - offset;
    if(corrected === at) break;
    at = corrected;
  }
  return at;
}

export function getBetaRewardSchedule(now = Date.now()){
  const provided = Number(now);
  const at = Number.isFinite(provided) && Number.isFinite(new Date(provided).getTime()) ? Math.trunc(provided) : Date.now();
  const parts = parisParts(at);
  const civilDate = dateKey(parts);
  const periodDate = parts.hour < BETA_REWARD_RESET_HOUR ? shiftDate(civilDate, -1) : civilDate;
  return {
    now:at,
    dateKey:periodDate,
    periodStartAt:getBetaRewardResetAt(periodDate),
    nextResetAt:getBetaRewardResetAt(shiftDate(periodDate, 1)),
    scheduleTimeZone:BETA_REWARD_TIME_ZONE,
    resetHour:BETA_REWARD_RESET_HOUR
  };
}

export function getBetaRewardResetAfterDate(key){
  const validKey = normalizeBetaRewardDateKey(key);
  return validKey ? getBetaRewardResetAt(shiftDate(validKey, 1)) : null;
}
