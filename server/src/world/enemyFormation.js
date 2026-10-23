const TAU = Math.PI * 2;
const MEMBER_TIMEOUT_MS = 2500;
const CLEANUP_INTERVAL_MS = 1000;

function findFreeAngle(members, preferredAngle){
  if(!members.size) return (preferredAngle + TAU) % TAU;
  const angles = [...members.values()].map(member=>member.angle).sort((a,b)=>a-b);
  let largestGap = -1;
  let result = preferredAngle;
  for(let i=0;i<angles.length;i++){
    const next = i+1<angles.length ? angles[i+1] : angles[0]+TAU;
    const gap = next-angles[i];
    if(gap>largestGap){
      largestGap = gap;
      result = (angles[i]+gap/2) % TAU;
    }
  }
  return result;
}

export function createEnemyFormationManager(){
  const groups = new Map();
  const memberships = new WeakMap();
  let nextCleanupAt = 0;

  function release(enemy){
    const member = memberships.get(enemy);
    if(!member) return;
    if(member.group.members.get(enemy.id)===member) member.group.members.delete(enemy.id);
    if(!member.group.members.size && groups.get(member.key)===member.group) groups.delete(member.key);
    memberships.delete(enemy);
  }

  function cleanup(now){
    if(now<nextCleanupAt) return;
    nextCleanupAt = now+CLEANUP_INTERVAL_MS;
    for(const group of groups.values()){
      for(const member of group.members.values()){
        if(member.enemy.hp<=0 || member.enemy.lockedPlayerId!==group.targetId || now-member.lastSeenAt>MEMBER_TIMEOUT_MS){
          release(member.enemy);
        }
      }
    }
  }

  function getAngle(enemy, map, target, now){
    cleanup(now);
    const key = `${map.room || map.id}:${target.id}`;
    let member = memberships.get(enemy);
    if(member && member.key!==key){
      release(enemy);
      member = null;
    }
    if(member){
      member.lastSeenAt = now;
      return member.angle;
    }
    let group = groups.get(key);
    if(!group){
      group = {targetId:target.id,members:new Map()};
      groups.set(key,group);
    }
    const replaced = group.members.get(enemy.id);
    if(replaced) release(replaced.enemy);
    // New members fill the largest free arc; existing monsters keep their place.
    const preferred = Math.atan2(enemy.y-Number(target.state.y || 0),enemy.x-Number(target.state.x || 0));
    member = {enemy,key,group,angle:findFreeAngle(group.members,preferred),lastSeenAt:now};
    group.members.set(enemy.id,member);
    groups.set(key,group);
    memberships.set(enemy,member);
    return member.angle;
  }

  return {getAngle,release};
}
