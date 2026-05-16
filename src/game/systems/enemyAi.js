function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function isFinitePoint(x, y){
  return Number.isFinite(x) && Number.isFinite(y);
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
  if(map.portal){
    const radius = (map.portal.safeRadius || map.portal.r || 120) + 170;
    if(Math.hypot(x - map.portal.x, y - map.portal.y) < radius) return false;
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

export function updateEnemyAi({enemies, player, dt, map, safeMode, aggroRange, leashRange, playerCollisionRadius, onEnemyAttack}){
  for(const enemy of enemies){
    const dx = player.x-enemy.x;
    const dy = player.y-enemy.y;
    const distance = Math.hypot(dx,dy) || 1;
    const range = enemy.attackRange || 600;
    if(safeMode) enemy.aggro = false;
    else if(!enemy.aggro && enemy.kind !== "drone_pirate" && distance < Math.max(aggroRange, range + 120)) enemy.aggro = true;

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
      if(enemy.kind === "drone_pirate"){
        const preferredDistance = Math.max(80, range - 10);
        const orbit = Math.sin((enemy.id * 1.7) + performance.now() / 620) > 0 ? 1 : -1;
        if(distance > preferredDistance + 34){
          targetX = player.x - dirX * preferredDistance + sideX * orbit * 90;
          targetY = player.y - dirY * preferredDistance + sideY * orbit * 90;
          speed = enemy.speed;
        }else if(distance < preferredDistance - 70){
          targetX = enemy.x - dirX * 180 + sideX * orbit * 80;
          targetY = enemy.y - dirY * 180 + sideY * orbit * 80;
          speed = enemy.speed;
        }else{
          targetX = enemy.x + sideX * orbit * 120;
          targetY = enemy.y + sideY * orbit * 120;
          speed = enemy.speed;
        }
      }else if(enemy.kind === "raider_astral"){
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
      }else if(enemy.kind === "chasseur_spectral"){
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
    enemy.angle = Math.atan2(dy,dx)+Math.PI/2;
    enemy.hitT -= dt;
    if(!safeMode && enemy.aggro && distance <= range && enemy.hitT <= 0){
      onEnemyAttack(enemy, dx, dy, distance);
      enemy.hitT = enemy.attackCooldown || 1.4;
    }
  }
}
