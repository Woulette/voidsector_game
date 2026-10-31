import {
  isRickyPortalInstance,
  RICKY_ALLY_ID,
  RICKY_HEAL_BEACON_AMOUNT,
  RICKY_HEAL_BEACON_DURATION_MS,
  RICKY_HEAL_BEACON_INTERVAL_MS,
  RICKY_HEAL_BEACON_RADIUS,
  RICKY_HEAL_COOLDOWN_MS
} from "./rickyPortalState.js";

export const RICKY_AUTO_HEAL_HP_RATIO = .75;

export function createRickyHealBeaconRuntime({io,profileManager,getPlayers,getInstanceMapId,emitProfileSync,emitInstance}){
  function targets(group){
    const ships=[...getPlayers(group,{requireMap:true,aliveOnly:true})];
    const ally=group.instance?.ally;
    if(ally?.alive !== false && Number(ally?.hp || 0)>0) ships.push({id:RICKY_ALLY_ID,state:ally});
    return ships;
  }

  function healTargets(group,beacon,now){
    for(const target of targets(group)){
      const state=target.state;
      if(Math.hypot(Number(state.x || 0)-beacon.x,Number(state.y || 0)-beacon.y)>beacon.radius) continue;
      const before=Math.max(0,Number(state.hp || 0));
      const maxHp=Math.max(before,Number(state.maxHp || before));
      state.hp=Math.min(maxHp,before+beacon.heal);
      const healed=state.hp-before;
      if(healed<=0) continue;
      if(target.id!==RICKY_ALLY_ID){
        profileManager.saveWorldSession?.({player:target,state,force:false});
        emitProfileSync?.(target,profileManager.getProfileForPlayer?.(target));
      }
      io.to(target.id===RICKY_ALLY_ID ? `instance:${group.instance.id}` : target.id).emit("player:healed",{
        targetId:target.id,sourceId:RICKY_ALLY_ID,amount:healed,hp:state.hp,maxHp:state.maxHp,
        mapId:getInstanceMapId(group.instance),x:Number(state.x ?? beacon.x),y:Number(state.y ?? beacon.y),at:now
      });
    }
  }

  function update(group,now){
    const instance=group?.instance;
    if(!isRickyPortalInstance(instance) || instance.completed) return;
    instance.beacons=(instance.beacons || []).filter(beacon=>Number(beacon.expiresAt)>now);
    for(const beacon of instance.beacons){
      if(now<Number(beacon.nextTickAt || 0)) continue;
      beacon.lastPulseAt=now;
      healTargets(group,beacon,now);
      beacon.nextTickAt=now+RICKY_HEAL_BEACON_INTERVAL_MS;
    }
    const ally=instance.ally;
    if(!ally || ally.alive===false || Number(ally.hp || 0)<=0 || now<Number(ally.healCooldownUntil || 0)) return;
    if(instance.beacons.length || !getPlayers(group,{requireMap:true,aliveOnly:true}).length) return;
    const needsHealing=targets(group).some(({state})=>{
      const hp=Number(state.hp || 0),maxHp=Number(state.maxHp || hp);
      return hp>0 && hp<maxHp && hp<=maxHp*RICKY_AUTO_HEAL_HP_RATIO
        && Math.hypot(Number(state.x || 0)-ally.x,Number(state.y || 0)-ally.y)<=RICKY_HEAL_BEACON_RADIUS;
    });
    if(!needsHealing) return;
    ally.healCooldownUntil=now+RICKY_HEAL_COOLDOWN_MS;
    const beacon={
      id:`RB-${now.toString(36)}-${Math.random().toString(36).slice(2,7)}`,
      sourceId:RICKY_ALLY_ID,x:Number(ally.x || 0),y:Number(ally.y || 0),
      radius:RICKY_HEAL_BEACON_RADIUS,heal:RICKY_HEAL_BEACON_AMOUNT,
      createdAt:now,lastPulseAt:now,pulseIntervalMs:RICKY_HEAL_BEACON_INTERVAL_MS,
      nextTickAt:now+RICKY_HEAL_BEACON_INTERVAL_MS,expiresAt:now+RICKY_HEAL_BEACON_DURATION_MS
    };
    instance.beacons.push(beacon);
    io.to(`instance:${instance.id}`).emit("portal:ricky-heal",{sourceId:RICKY_ALLY_ID,beacon,cooldown:RICKY_HEAL_COOLDOWN_MS/1000,at:now});
    healTargets(group,beacon,now);
    emitInstance(group);
  }

  function rejectManualActivation(socket){
    socket.emit("portal:error",{message:"Ricky pose automatiquement sa balise lorsqu'un allié proche ou lui-même a besoin de soins."});
    return false;
  }

  return {update,rejectManualActivation};
}
