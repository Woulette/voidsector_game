export function updateEnemyAi({enemies, player, dt, safeMode, aggroRange, leashRange, playerCollisionRadius, onEnemyAttack}){
  for(const enemy of enemies){
    const dx = player.x-enemy.x;
    const dy = player.y-enemy.y;
    const distance = Math.hypot(dx,dy) || 1;
    const range = enemy.attackRange || 600;
    if(safeMode) enemy.aggro = false;
    else if(!enemy.aggro && distance < Math.max(aggroRange, range + 120)) enemy.aggro = true;

    let returningHome = false;
    if(enemy.aggro && distance > leashRange){
      returningHome = true;
      const homeDistance = Math.hypot(enemy.x-enemy.homeX, enemy.y-enemy.homeY);
      if(homeDistance < 30){
        enemy.aggro = false;
        returningHome = false;
      }
    }

    let targetX = enemy.homeX;
    let targetY = enemy.homeY;
    let speed = enemy.speed * .35;
    if(enemy.aggro && !returningHome){
      const preferredDistance = range * .72;
      if(distance > preferredDistance){
        targetX = player.x;
        targetY = player.y;
        speed = enemy.speed;
      }else if(distance < Math.max(120, enemy.radius + playerCollisionRadius + 40)){
        targetX = enemy.x - dx;
        targetY = enemy.y - dy;
        speed = enemy.speed * .75;
      }else{
        targetX = enemy.x;
        targetY = enemy.y;
        speed = 0;
      }
    }

    const ex = targetX-enemy.x;
    const ey = targetY-enemy.y;
    const ed = Math.hypot(ex,ey) || 1;
    if(speed > 0 && ed > 12){
      enemy.x += ex/ed*speed*dt;
      enemy.y += ey/ed*speed*dt;
    }
    enemy.angle = Math.atan2(dy,dx)+Math.PI/2;
    enemy.hitT -= dt;
    if(!safeMode && enemy.aggro && distance <= range && enemy.hitT <= 0){
      onEnemyAttack(enemy, dx, dy, distance);
      enemy.hitT = enemy.attackCooldown || 1.4;
    }
  }
}
