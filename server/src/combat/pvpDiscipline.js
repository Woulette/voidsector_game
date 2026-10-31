import { normalizeFirmId } from "../../../src/data/firms.js";
import { isReputationOutlaw } from "../../../src/shared/reputation.js";

export function playerFirm(player, profile){
  return normalizeFirmId(profile?.player?.firmId || player?.account?.firmId || "astra");
}

// Retaliation belongs to the attacked account. Returning fire never reverses it.
export function createPvpAggressionTracker({getPlayerKey, combatRecentMs = 15_000, onDefenseRight = ()=>{}} = {}){
  const encounters = new Map();
  const lifetime = Math.max(5_000, Number(combatRecentMs) || 15_000);
  let lastPrunedAt = 0;
  const keyFor = player=>String(getPlayerKey?.(player) || player?.accountId || player?.id || "");
  const pairFor = (left, right)=>JSON.stringify([keyFor(left), keyFor(right)].sort());

  function recordShot(attacker, target, now = Date.now()){
    if(now - lastPrunedAt >= lifetime){
      for(const [key, value] of encounters) if(now - value.lastAt >= lifetime) encounters.delete(key);
      lastPrunedAt = now;
    }
    const key = pairFor(attacker, target);
    let current = encounters.get(key);
    if(!current || now - current.lastAt >= lifetime){
      current = {aggressor:keyFor(attacker), defender:keyFor(target), lastAt:now};
      encounters.set(key, current);
    }else current.lastAt = now;
    const defenderIsAttacker = current.defender === keyFor(attacker);
    onDefenseRight(defenderIsAttacker ? attacker : target, defenderIsAttacker ? target : attacker, now + lifetime);
  }

  function canRetaliate(attacker, target, now = Date.now()){
    const encounter = encounters.get(pairFor(attacker, target));
    return Boolean(encounter && now - encounter.lastAt < lifetime
      && encounter.aggressor === keyFor(target) && encounter.defender === keyFor(attacker));
  }

  function classifyKill(attacker, target, attackerProfile, targetProfile, now = Date.now()){
    if(keyFor(attacker) === keyFor(target)) return "same-account";
    if(playerFirm(attacker, attackerProfile) !== playerFirm(target, targetProfile)) return "enemy";
    if(isReputationOutlaw(targetProfile?.player)) return "outlaw";
    if(canRetaliate(attacker, target, now)) return "self-defense";
    return "friendly";
  }

  function finishLife(player){
    const playerKey = keyFor(player);
    for(const [key, encounter] of encounters){
      if(encounter.aggressor === playerKey || encounter.defender === playerKey) encounters.delete(key);
    }
  }

  return {recordShot, canRetaliate, classifyKill, finishLife};
}
