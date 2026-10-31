const PURSUIT_STOP_DISTANCE = 48;
const PURSUIT_RESUME_MARGIN = 24;
const STATIONARY_MAX_DISTANCE = 200;
const STATIONARY_RANGE_RATIO = .7;
const STATIONARY_ARRIVAL_DISTANCE = 8;
const PURSUIT_REACTION_MIN_MS = 800;
const PURSUIT_REACTION_MAX_MS = 1500;
const PURSUIT_REACTION_STEP_MS = 50;
const DISTANCE_EPSILON = .000001;

function getPursuitReactionDelay(enemy){
  let hash = 2166136261;
  for(const char of String(enemy.id || enemy.kind || "enemy")){
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const steps = (PURSUIT_REACTION_MAX_MS - PURSUIT_REACTION_MIN_MS) / PURSUIT_REACTION_STEP_MS + 1;
  return PURSUIT_REACTION_MIN_MS + ((hash >>> 0) % steps) * PURSUIT_REACTION_STEP_MS;
}

function getStationaryPoint(target, attackRange, stationaryRingRadius){
  const requestedRadius = Number(stationaryRingRadius);
  const customRadius = Number.isFinite(requestedRadius) && requestedRadius > 0;
  const maxDistance = customRadius ? requestedRadius : STATIONARY_MAX_DISTANCE;
  const rangeLimit = customRadius ? attackRange : attackRange*STATIONARY_RANGE_RATIO;
  let radius = Math.min(maxDistance,rangeLimit);
  const minX = -target.mapWidth/2+70;
  const maxX = target.mapWidth/2-70;
  const minY = -target.mapHeight/2+70;
  const maxY = target.mapHeight/2-70;
  if(customRadius){
    let angle = Number(target.formationAngle || 0);
    if(Math.min(target.x-minX,maxX-target.x,target.y-minY,maxY-target.y)<radius){
      // Fit the formation into inward-facing quarter-circles at an edge.
      // Keep each monster's requested distance instead of shrinking the ring.
      const quarters = [0,1,2,3].filter(quarter=>{
        const x = target.x + (quarter === 0 || quarter === 3 ? radius : -radius);
        const y = target.y + (quarter < 2 ? radius : -radius);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      });
      const turn = ((angle / (Math.PI*2)) % 1 + 1) % 1;
      const slot = turn * quarters.length;
      if(quarters.length) angle = (quarters[Math.floor(slot)] + slot % 1) * Math.PI/2;
    }
    return {x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius};
  }
  if(Math.min(target.x-minX,maxX-target.x,target.y-minY,maxY-target.y)<radius){
    // Move/shrink the ring inward at map edges; clamping individual places
    // would collapse several monsters onto the exact same corner point.
    const edgeDistance = attackRange*.9;
    radius = Math.min(radius,edgeDistance/(1+Math.SQRT2));
  }
  const centerX = Math.max(minX+radius,Math.min(maxX-radius,target.x));
  const centerY = Math.max(minY+radius,Math.min(maxY-radius,target.y));
  const angle = Number(target.formationAngle || 0);
  return {x:centerX+Math.cos(angle)*radius,y:centerY+Math.sin(angle)*radius};
}

function stopEnemy(enemy){
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.moving = false;
}

export function resetEnemyPursuit(enemy){
  enemy.pursuitTargetId = "";
  enemy.pursuitHolding = false;
  enemy.pursuitPoint = null;
  enemy.pursuitObservedTarget = null;
  enemy.pursuitMoving = false;
  enemy.nextPursuitAt = 0;
}

export function moveEnemyToward(enemy, target, speed, dt, stopDistance = 8){
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if(!Number.isFinite(distance) || distance <= stopDistance + DISTANCE_EPSILON || speed <= 0 || dt <= 0){
    stopEnemy(enemy);
    return distance;
  }
  const step = Math.min(distance - stopDistance, speed * dt);
  const nx = dx / distance;
  const ny = dy / distance;
  enemy.x += nx * step;
  enemy.y += ny * step;
  enemy.angle = Math.atan2(ny, nx) + Math.PI / 2;
  const remaining = distance - step;
  if(remaining <= stopDistance + DISTANCE_EPSILON){
    stopEnemy(enemy);
  }else{
    enemy.vx = nx * step / dt;
    enemy.vy = ny * step / dt;
    enemy.moving = true;
  }
  return remaining;
}

export function updateEnemyPursuit(enemy, target, speed, attackRange, dt, now){
  if(enemy.pursuitTargetId !== target.id){
    resetEnemyPursuit(enemy);
    enemy.pursuitTargetId = target.id;
  }
  if(!enemy.pursuitPoint || now >= enemy.nextPursuitAt){
    const previous = enemy.pursuitObservedTarget;
    const changedPosition = previous && Math.hypot(target.x-previous.x,target.y-previous.y)>4;
    enemy.pursuitMoving = typeof target.moving === "boolean" ? target.moving : Boolean(changedPosition);
    enemy.pursuitObservedTarget = {x:target.x,y:target.y};
    enemy.pursuitPoint = enemy.pursuitMoving ? {x:target.x,y:target.y} : getStationaryPoint(target,attackRange,enemy.stationaryRingRadius);
    enemy.nextPursuitAt = now + getPursuitReactionDelay(enemy);
  }
  // Keep moving smoothly between reactions, toward the last sampled position.
  const point = enemy.pursuitPoint;
  // Moving targets can gather a pack; stationary targets get separate positions
  // in a firing ring so each monster remains identifiable and selectable.
  const exactRing = Number.isFinite(Number(enemy.stationaryRingRadius)) && Number(enemy.stationaryRingRadius) > 0;
  const stopDistance = enemy.pursuitMoving ? Math.min(PURSUIT_STOP_DISTANCE,attackRange*.5) : exactRing ? 0 : STATIONARY_ARRIVAL_DISTANCE;
  const resumeDistance = stopDistance + (exactRing && !enemy.pursuitMoving ? 1 : PURSUIT_RESUME_MARGIN);
  const dx = point.x - enemy.x;
  const dy = point.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if(enemy.pursuitHolding && distance <= resumeDistance){
    stopEnemy(enemy);
    return;
  }
  if(distance > DISTANCE_EPSILON) enemy.angle = Math.atan2(dy, dx) + Math.PI / 2;
  // Steer toward the sampled point. Blending opposite velocity vectors
  // can preserve the old heading forever on a perfectly aligned U-turn.
  const remaining = moveEnemyToward(enemy, point, speed, dt, stopDistance);
  enemy.pursuitHolding = remaining <= stopDistance + DISTANCE_EPSILON;
}
