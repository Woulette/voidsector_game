import { DAMAGE_FEEDBACK_SPEC as SPEC } from "../combatData/damageFeedback.js";

const MAX_GROUPS = 256;
const MAX_SHOTS = 1024;

export function createCombatDamageFeedback({getState, pushDamageText, now = ()=>performance.now(), mergeWindowMs = SPEC.mergeWindowMs}){
  const groups = [];
  const shots = new Map();
  const windowMs = Math.max(0, Math.min(350, Number(mergeWindowMs) || 0));
  let textList = null;
  let mapToken = null;

  function clear(){
    groups.length = 0;
    shots.clear();
  }

  function update(){
    const state = getState();
    const nextMap = String(state.currentMap?.id ?? "");
    if((textList && state.damageTexts && textList !== state.damageTexts) || (mapToken !== null && mapToken !== nextMap)) clear();
    textList = state.damageTexts || null;
    mapToken = nextMap;
    const time = now();
    for(let index = groups.length - 1; index >= 0; index -= 1){
      const group = groups[index];
      if(time - group.createdAt > SPEC.maxGroupAgeMs){
        groups.splice(index, 1);
        continue;
      }
      if(time >= group.waitUntil) group.pending.clear();
      if(group.pending.size && group.text?.life > 0){
        group.text.life = Math.max(group.text.life, group.text.max * .7);
      }
    }
    for(const [key, shot] of shots){
      if(time - shot.receivedAt > SPEC.maxGroupAgeMs) shots.delete(key);
    }
  }

  function keyFor(event){
    return JSON.stringify([
      String(event.mapId ?? ""),
      String(event.enemyId || event.targetId || event.targetPlayerId || ""),
      String(event.attackerId || event.sourceId || ""),
      event.damageType === "poison" ? "poison" : "direct"
    ]);
  }

  function shotKey(event){
    return event.shotId ? `${keyFor(event)}:${String(event.shotId)}` : null;
  }

  function launchTime(event, phase){
    const at = Number(event.at);
    if(!Number.isFinite(at) || at <= 0) return now();
    if(phase === "shot") return at;
    // Older snapshots may lack combat:shot; use their authoritative travel duration.
    return at - Math.max(0, Math.min(SPEC.maxProjectileMs, Number(event.travelTimeMs || 0)));
  }

  function findGroup(event, phase){
    const id = shotKey(event);
    const known = id ? shots.get(id) : null;
    if(known) return known.group;
    const key = keyFor(event);
    const at = launchTime(event, phase);
    let group = groups.find(entry=>entry.key === key && Math.max(entry.lastLaunch, at) - Math.min(entry.firstLaunch, at) <= windowMs);
    if(group){
      group.firstLaunch = Math.min(group.firstLaunch, at);
      group.lastLaunch = Math.max(group.lastLaunch, at);
    }else{
      group = {key, firstLaunch:at, lastLaunch:at, createdAt:now(), waitUntil:0, pending:new Set(), damage:0, misses:0, text:null};
      groups.push(group);
      if(groups.length > MAX_GROUPS) groups.shift();
    }
    if(id){
      shots.set(id, {group, resolved:false, receivedAt:now()});
      if(shots.size > MAX_SHOTS) shots.delete(shots.keys().next().value);
    }
    return group;
  }

  function observeShot(event){
    update();
    if(event.accepted === false || event.outcome === "rejected" || !event.shotId) return;
    const group = findGroup(event, "shot");
    const id = shotKey(event);
    if(!shots.get(id)?.resolved) group.pending.add(id);
    const travel = Math.max(0, Math.min(SPEC.maxProjectileMs, Number(event.travelTimeMs ?? Number(event.travelTime || 0) * 1000)));
    group.waitUntil = Math.max(group.waitUntil, now() + travel + SPEC.impactGraceMs);
  }

  function publish(group, target){
    const list = getState().damageTexts;
    const visible = group.text?.life > 0 && (!Array.isArray(list) || list.includes(group.text));
    if(!visible){
      const others = groups.filter(entry=>entry !== group && entry.key === group.key && entry.text?.life > 0);
      while(others.length >= 2) others.shift().text.life = 0;
      for(const other of others) other.text.y -= 30;
      const payload = {
        x:target.x, y:target.y - 30,
        value:group.damage > 0 ? group.damage : "MISS",
        kind:"damage", direction:"outgoing", life:SPEC.textLife, max:SPEC.textLife,
        color:SPEC.outgoing, shadowColor:SPEC.outgoingGlow
      };
      const created = pushDamageText(payload);
      group.text = created && typeof created === "object" ? created : payload;
    }else{
      if(group.target){
        group.text.x += target.x - group.target.x;
        group.text.y += target.y - group.target.y;
      }
      group.text.value = group.damage > 0 ? group.damage : "MISS";
      group.text.life = group.text.max = SPEC.textLife;
    }
    group.target = {x:target.x, y:target.y};
  }

  function addHit(event, target){
    update();
    if(event.accepted === false || event.outcome === "rejected") return;
    const damage = Math.max(0, Math.round(Number(event.damage || 0)));
    const miss = event.hit === false && Number(event.consumed || 0) > 0;
    if(damage <= 0 && !miss) return;
    const group = findGroup(event, "hit");
    const id = shotKey(event);
    if(id){
      const shot = shots.get(id);
      if(shot.resolved) return;
      shot.resolved = true;
      group.pending.delete(id);
    }
    if(damage > 0) group.damage += damage;
    else group.misses += 1;
    // A MISS applies to the burst only after all its known projectiles resolve.
    if(group.damage > 0 || group.pending.size === 0) publish(group, target);
    return group.text;
  }

  return {observeShot, addHit, update, clear};
}
