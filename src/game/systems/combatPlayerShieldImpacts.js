import {SHIELD_VISUAL_SPEC} from "../combatData/weaponVisuals.js";

export function queuePlayerShieldImpact(player,event,now=performance.now()){
  if(!player || player.isDead || Number(event.hp)<=0 || event.bypassShield || event.damageType==="poison"
    || !(Number(event.amount)>0) || (Number(event.at)>1e12 && Date.now()-Number(event.at)>2500)) return false;
  const before=Number.isFinite(Number(event.shieldBefore)) ? Number(event.shieldBefore)
    : Math.max(Number(player.shield||0),Number(event.shield||0));
  if(before<=0) return false;
  const ageLimit=SHIELD_VISUAL_SPEC.duration*1000;
  const previous=(player.shieldHitVisuals||[]).filter(hit=>now-hit.receivedAt<ageLimit && now>=hit.receivedAt);
  const key=String(event.shotId || `${event.at??event.receivedAt??now}:${event.enemyId||event.sourceId||""}:${event.amount}`);
  if(previous.some(hit=>hit.key===key)) return false;
  previous.push({key,receivedAt:now,angle:Math.atan2(Number(event.fromY??event.y??player.y)-player.y,Number(event.fromX??event.x??player.x-1)-player.x)});
  player.shieldHitVisuals=previous.slice(-6);
  return true;
}
