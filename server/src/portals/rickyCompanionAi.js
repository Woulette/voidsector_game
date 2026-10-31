// The mini-map displays world X/Y divided by 10.
export const RICKY_MAX_LEADER_AXIS_DISTANCE = 200 * 10;
export const RICKY_REGROUP_DISTANCE = 120;
export const RICKY_FOLLOW_START_DISTANCE = 300;
export const RICKY_FOLLOW_TRAIL_DISTANCE = 240;
const LEADER_IDLE_SECONDS = .25;

function stop(ally){
  ally.vx = 0;
  ally.vy = 0;
}

function resetFollow(ally){
  ally.following = false;
  ally.followLeaderX = null;
  ally.followLeaderY = null;
  ally.followIdleSeconds = 0;
}

function isLeaderIdle(ally, leader, dt){
  const moved = Number.isFinite(ally.followLeaderX) && Number.isFinite(ally.followLeaderY)
    && Math.hypot(leader.x - ally.followLeaderX, leader.y - ally.followLeaderY) > .5;
  ally.followIdleSeconds = moved ? 0 : Number(ally.followIdleSeconds || 0) + Math.max(0, Number(dt || 0));
  ally.followLeaderX = leader.x;
  ally.followLeaderY = leader.y;
  return ally.followIdleSeconds >= LEADER_IDLE_SECONDS;
}

function moveTowards(ally, x, y, dt, stopDistance = 0, leader = null){
  const dx = x - ally.x;
  const dy = y - ally.y;
  const distance = Math.hypot(dx, dy);
  const elapsed = Math.max(0, Number(dt || 0));
  const step = Math.min(Math.max(0, distance - stopDistance), Math.max(0, Number(ally.speed || 500)) * elapsed);
  stop(ally);
  if(distance < 1e-6 || step <= 1e-6) return;
  let nextX = ally.x + dx / distance * step;
  let nextY = ally.y + dy / distance * step;
  if(leader){
    nextX = Math.max(leader.x - RICKY_MAX_LEADER_AXIS_DISTANCE, Math.min(leader.x + RICKY_MAX_LEADER_AXIS_DISTANCE, nextX));
    nextY = Math.max(leader.y - RICKY_MAX_LEADER_AXIS_DISTANCE, Math.min(leader.y + RICKY_MAX_LEADER_AXIS_DISTANCE, nextY));
  }
  ally.vx = (nextX - ally.x) / elapsed;
  ally.vy = (nextY - ally.y) / elapsed;
  ally.x = nextX;
  ally.y = nextY;
  ally.angle = Math.atan2(dy, dx) + Math.PI / 2;
}

function findTarget(ally, leader, enemies){
  const range = Math.max(0, Number(ally.attackRange || 600));
  const detectionRange = range * 1.5;
  let nearest = null;
  let nearestDistance = Infinity;
  for(const enemy of enemies || []){
    if(!enemy || Number(enemy.hp || 0) <= 0) continue;
    const x = Number(enemy.x || 0);
    const y = Number(enemy.y || 0);
    const distance = Math.hypot(x - ally.x, y - ally.y);
    if(distance > detectionRange) continue;
    // An enemy must remain reachable without leaving the player's escort area.
    const outsideX = Math.max(0, Math.abs(x - leader.x) - RICKY_MAX_LEADER_AXIS_DISTANCE);
    const outsideY = Math.max(0, Math.abs(y - leader.y) - RICKY_MAX_LEADER_AXIS_DISTANCE);
    if(Math.hypot(outsideX, outsideY) > range) continue;
    if(String(enemy.id) === ally.aiTargetId) return enemy;
    if(distance < nearestDistance){
      nearest = enemy;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// Navigation only. Damage, cooldowns and rewards stay in the portal runtime.
export function updateRickyCompanionNavigation(ally, player, enemies, dt){
  if(!player?.state){
    ally.aiTargetId = "";
    ally.regrouping = false;
    resetFollow(ally);
    stop(ally);
    return null;
  }
  const leader = {x:Number(player.state.x || 0), y:Number(player.state.y || 0)};
  if(ally.followTargetId !== player.id){
    ally.aiTargetId = "";
    ally.regrouping = false;
    ally.followTargetId = player.id;
    resetFollow(ally);
  }
  const leaderIdle = isLeaderIdle(ally, leader, dt);
  const dx = leader.x - ally.x;
  const dy = leader.y - ally.y;
  if(Math.abs(dx) > RICKY_MAX_LEADER_AXIS_DISTANCE || Math.abs(dy) > RICKY_MAX_LEADER_AXIS_DISTANCE){
    ally.regrouping = true;
  }
  if(ally.regrouping){
    ally.aiTargetId = "";
    ally.following = false;
    if(Math.hypot(dx, dy) > RICKY_REGROUP_DISTANCE + 1e-6){
      moveTowards(ally, leader.x, leader.y, dt, RICKY_REGROUP_DISTANCE);
      return null;
    }
    ally.regrouping = false;
  }
  const target = findTarget(ally, leader, enemies);
  ally.aiTargetId = target ? String(target.id) : "";
  if(!target){
    const distance = Math.hypot(leader.x - ally.x, leader.y - ally.y);
    if(distance <= RICKY_REGROUP_DISTANCE + 1e-6){
      ally.following = false;
      stop(ally);
      return null;
    }
    if(distance > RICKY_FOLLOW_START_DISTANCE || leaderIdle) ally.following = true;
    if(ally.following){
      moveTowards(ally, leader.x, leader.y, dt, leaderIdle ? RICKY_REGROUP_DISTANCE : RICKY_FOLLOW_TRAIL_DISTANCE);
    }else{
      stop(ally);
    }
    return null;
  }
  ally.following = false;
  moveTowards(ally, Number(target.x || 0), Number(target.y || 0), dt, Number(ally.attackRange || 600) * .82, leader);
  ally.angle = Math.atan2(Number(target.y || 0) - ally.y, Number(target.x || 0) - ally.x) + Math.PI / 2;
  return target;
}
