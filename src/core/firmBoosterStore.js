import {
  getActiveFirmBoosterValues,
  getActivePlayerBoosterValues,
  mergeBoosterValues,
  sanitizePlayerBoosterState
} from "../shared/firmBoosters.js";

let personalSeasonBoosterReward = null;
let personalPlayerBoosters = sanitizePlayerBoosterState();
let playerBoostersReceivedAt = Date.now();

export function setPersonalFirmBoosterReward(reward = null){
  const source = reward?.season && typeof reward.season === "object" ? reward.season : reward;
  personalSeasonBoosterReward = source && typeof source === "object" ? source : null;
}

export function setPersonalPlayerBoosters(value = null){
  personalPlayerBoosters = sanitizePlayerBoosterState(value);
  playerBoostersReceivedAt = Date.now();
}

export function getPersonalFirmBoosterReward(){
  return personalSeasonBoosterReward;
}

export function getActivePersonalFirmBoosters(now = Date.now()){
  const connectedElapsedMs = Math.max(0, Number(now) - playerBoostersReceivedAt);
  return mergeBoosterValues(
    getActivePlayerBoosterValues(personalPlayerBoosters, now, connectedElapsedMs),
    getActiveFirmBoosterValues({
      endsAt:personalSeasonBoosterReward?.endsAt,
      boosters:personalSeasonBoosterReward?.values
    }, now)
  );
}
