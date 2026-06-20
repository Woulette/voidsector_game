function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function isFinitePoint(x, y){
  return Number.isFinite(x) && Number.isFinite(y);
}

function getMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

const PASSIVE_UNTIL_ATTACKED = new Set(["drone_pirate", "raider_astral"]);
const CHARGING_ENEMIES = new Set(["raider_astral", "deadly_intercepteur", "deadly_ravageur"]);

function getEnemyAiKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

function requiresPlayerAttack(enemy){
  return PASSIVE_UNTIL_ATTACKED.has(getEnemyAiKind(enemy?.kind));
}

function isValidPatrolPoint(map, x, y, player){
  if(!map?.width || !map?.height) return false;
  const margin = 90;
  if(x < -map.width / 2 + margin || x > map.width / 2 - margin) return false;
  if(y < -map.height / 2 + margin || y > map.height / 2 - margin) return false;
  if(map.spawn){
    const radius = (map.spawn.safeRadius || map.spawn.r || 260) + 220;
    if(Math.hypot(x - map.spawn.x, y - map.spawn.y) < radius) return false;
  }
  for(const portal of getMapPortals(map)){
    const radius = (portal.safeRadius || portal.r || 120) + 170;
    if(Math.hypot(x - portal.x, y - portal.y) < radius) return false;
  }
  if(player && Math.hypot(x - player.x, y - player.y) < 360) return false;
  return true;
}

function pickPatrolDestination(enemy, map, player){
  if(!map?.width || !map?.height) return {x:enemy.homeX, y:enemy.homeY};
  const margin = 90;
  const minX = -map.width / 2 + margin;
  const maxX = map.width / 2 - margin;
  const minY = -map.height / 2 + margin;
  const maxY = map.height / 2 - margin;
  for(let tries = 0; tries < 18; tries++){
    const angle = Math.random() * Math.PI * 2;
    const step = 260 + Math.random() * 620;
    const x = clamp(enemy.x + Math.cos(angle) * step, minX, maxX);
    const y = clamp(enemy.y + Math.sin(angle) * step, minY, maxY);
    if(isValidPatrolPoint(map, x, y, player)) return {x, y};
  }
  for(let tries = 0; tries < 8; tries++){
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if(isValidPatrolPoint(map, x, y, player)) return {x, y};
  }
  return {
    x:clamp(enemy.x, minX, maxX),
    y:clamp(enemy.y, minY, maxY)
  };
}

function resolveEnemyOverlap(enemies, map){
  if(!Array.isArray(enemies) || enemies.length < 2) return;
  for(let pass = 0; pass < 2; pass++){
    for(let i = 0; i < enemies.length; i++){
      const a = enemies[i];
      if(!a) continue;
      for(let j = i + 1; j < enemies.length; j++){
        const b = enemies[j];
        if(!b) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = Math.max(28, ((a.radius || 24) + (b.radius || 24)) * .78);
        if(distance >= minDistance) continue;
        if(distance < .001){
          const angle = ((a.id || i) * 2.399 + (b.id || j)) % (Math.PI * 2);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = (minDistance - distance) * .5;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
  if(map?.width && map?.height){
    for(const enemy of enemies){
      enemy.x = clamp(enemy.x, -map.width / 2 + 40, map.width / 2 - 40);
      enemy.y = clamp(enemy.y, -map.height / 2 + 40, map.height / 2 - 40);
    }
  }
}

export function updateEnemyAi({enemies, player, dt, map, safeMode, aggroRange, leashRange, playerCollisionRadius, onEnemyAttack}){
  for(const enemy of enemies){
    const beforeX = enemy.x;
    const beforeY = enemy.y;
    const dx = player.x-enemy.x;
    const dy = player.y-enemy.y;
    const distance = Math.hypot(dx,dy) || 1;
    const range = enemy.attackRange || 600;
    if(safeMode){
      enemy.aggro = false;
      enemy.hitT = Math.max(enemy.hitT || 0, enemy.attackCooldown || 1.4);
    }else if(!enemy.aggro && !requiresPlayerAttack(enemy) && distance < Math.max(aggroRange, range + 120)) enemy.aggro = true;

    let returningHome = false;
    if(enemy.aggro && distance > leashRange){
      returningHome = true;
      const homeDistance = Math.hypot(enemy.x-enemy.homeX, enemy.y-enemy.homeY);
      if(homeDistance < 30){
        enemy.aggro = false;
        returningHome = false;
      }
    }
    if(enemy.aggro || returningHome){
      enemy.wanderPauseT = 0;
      enemy.wanderNeedsNewDestination = false;
    }

    let targetX = enemy.homeX;
    let targetY = enemy.homeY;
    let speed = (enemy.aggro || returningHome) ? enemy.speed : enemy.speed * .35;
    if(!enemy.aggro && !returningHome){
      enemy.wanderT = Math.max(0, Number(enemy.wanderT || 0) - dt);
      enemy.wanderPauseT = Math.max(0, Number(enemy.wanderPauseT || 0) - dt);
      const wanderDistance = Math.hypot((enemy.wanderX ?? enemy.x) - enemy.x, (enemy.wanderY ?? enemy.y) - enemy.y);
      const hasDestination = isFinitePoint(enemy.wanderX, enemy.wanderY);
      const needsDestination = !hasDestination || enemy.wanderT <= 0 || wanderDistance < 28;
      if(enemy.wanderPauseT > 0){
        targetX = enemy.x;
        targetY = enemy.y;
        speed = 0;
      }else if(needsDestination){
        const canPause = !enemy.wanderNeedsNewDestination && hasDestination && (enemy.wanderT <= 0 || wanderDistance < 28);
        if(canPause && Math.random() < .42){
          enemy.wanderPauseT = 5 + Math.random() * 10;
          enemy.wanderNeedsNewDestination = true;
          targetX = enemy.x;
          targetY = enemy.y;
          speed = 0;
        }else{
          const point = pickPatrolDestination(enemy, map, player);
          enemy.wanderX = point.x;
          enemy.wanderY = point.y;
          enemy.wanderT = 8 + Math.random() * 10;
          enemy.wanderNeedsNewDestination = false;
          targetX = enemy.wanderX;
          targetY = enemy.wanderY;
          speed = enemy.speed;
        }
      }else{
        targetX = enemy.wanderX;
        targetY = enemy.wanderY;
        speed = enemy.speed;
      }
    }
    if(enemy.aggro && !returningHome){
      const dirX = dx / distance;
      const dirY = dy / distance;
      const sideX = -dirY;
      const sideY = dirX;
      if(enemy.kind === "drone_pirate" || enemy.kind === "deadly_eclaireur"){
        const preferredDistance = Math.max(110, range - 45);
        if(distance > range - 20){
          targetX = player.x - dirX * preferredDistance;
          targetY = player.y - dirY * preferredDistance;
          speed = enemy.speed;
        }else{
          targetX = enemy.x;
          targetY = enemy.y;
          speed = 0;
        }
      }else if(CHARGING_ENEMIES.has(getEnemyAiKind(enemy.kind))){
        const contactDistance = Math.max(70, enemy.radius + playerCollisionRadius + 22);
        if(distance > contactDistance){
          targetX = player.x;
          targetY = player.y;
          speed = enemy.speed;
        }else{
          targetX = enemy.x - dirX * 42;
          targetY = enemy.y - dirY * 42;
          speed = enemy.speed;
        }
      }else if(enemy.kind === "chasseur_spectral" || enemy.kind === "deadly_traqueur"){
        const preferredDistance = range * .62;
        const drift = Math.sin(performance.now() / 760 + enemy.id) * 115;
        if(distance > preferredDistance + 45){
          targetX = player.x - dirX * preferredDistance + sideX * drift;
          targetY = player.y - dirY * preferredDistance + sideY * drift;
          speed = enemy.speed;
        }else if(distance < preferredDistance - 55){
          targetX = enemy.x - dirX * 150 + sideX * drift * .45;
          targetY = enemy.y - dirY * 150 + sideY * drift * .45;
          speed = enemy.speed;
        }else{
          targetX = enemy.x + sideX * drift;
          targetY = enemy.y + sideY * drift;
          speed = enemy.speed;
        }
      }else{
        const preferredDistance = range * .72;
        if(distance > preferredDistance){
          targetX = player.x;
          targetY = player.y;
          speed = enemy.speed;
        }else if(distance < Math.max(120, enemy.radius + playerCollisionRadius + 40)){
          targetX = enemy.x - dx;
          targetY = enemy.y - dy;
          speed = enemy.speed;
        }else{
          targetX = enemy.x;
          targetY = enemy.y;
          speed = 0;
        }
      }
    }

    if(map?.width && map?.height){
      targetX = Math.max(-map.width / 2 + 80, Math.min(map.width / 2 - 80, targetX));
      targetY = Math.max(-map.height / 2 + 80, Math.min(map.height / 2 - 80, targetY));
    }
    const clampedX = targetX-enemy.x;
    const clampedY = targetY-enemy.y;
    const ed = Math.hypot(clampedX,clampedY) || 1;
    if(speed > 0 && ed > 12){
      enemy.x += clampedX/ed*speed*dt;
      enemy.y += clampedY/ed*speed*dt;
    }
    if(map?.width && map?.height){
      enemy.x = clamp(enemy.x, -map.width / 2 + 40, map.width / 2 - 40);
      enemy.y = clamp(enemy.y, -map.height / 2 + 40, map.height / 2 - 40);
    }
    const moveDx = enemy.x - beforeX;
    const moveDy = enemy.y - beforeY;
    if(enemy.aggro && !safeMode) enemy.angle = Math.atan2(dy,dx)+Math.PI/2;
    else if(Math.hypot(moveDx, moveDy) > .5) enemy.angle = Math.atan2(moveDy, moveDx)+Math.PI/2;
    enemy.hitT -= dt;
    if(!safeMode && enemy.aggro && distance <= range && enemy.hitT <= 0){
      onEnemyAttack(enemy, dx, dy, distance);
      enemy.hitT = enemy.attackCooldown || 1.4;
    }
  }
  resolveEnemyOverlap(enemies, map);
}
