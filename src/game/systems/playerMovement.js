export function worldFromScreen({sx, sy, camera}){
  const zoom = camera?.zoom || 1;
  return {x:sx / zoom + camera.x, y:sy / zoom + camera.y};
}

export function clampPlayerToMap({player, map, padding = 65}){
  const halfW = map.width / 2;
  const halfH = map.height / 2;
  player.x = Math.max(-halfW + padding, Math.min(halfW - padding, player.x));
  player.y = Math.max(-halfH + padding, Math.min(halfH - padding, player.y));
}

export function updatePlayerMovement({player, moveTarget, dt, map, clampToMap = true}){
  let movedX = 0;
  let movedY = 0;
  let nextMoveTarget = moveTarget;

  if(nextMoveTarget){
    const dx = nextMoveTarget.x - player.x;
    const dy = nextMoveTarget.y - player.y;
    const distance = Math.hypot(dx, dy);
    if(distance < 8){
      nextMoveTarget = null;
    }else{
      const step = Math.min(player.speed * dt, distance);
      movedX = dx / distance * step;
      movedY = dy / distance * step;
      player.x += movedX;
      player.y += movedY;
      player.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  const movedDist = Math.hypot(movedX, movedY);
  player.vx = dt > 0 ? movedX / dt : 0;
  player.vy = dt > 0 ? movedY / dt : 0;
  if(movedDist > 0.01) player.engineAngle = Math.atan2(movedY, movedX) + Math.PI / 2;

  const targetEnginePower = movedDist > 0.01 ? 1 : 0;
  const engineResponse = targetEnginePower > (player.enginePower || 0) ? 12 : 5;
  player.enginePower = (player.enginePower || 0) + (targetEnginePower - (player.enginePower || 0)) * Math.min(1, dt * engineResponse);

  if(clampToMap) clampPlayerToMap({player, map});
  return nextMoveTarget;
}

export function updateCamera({camera, player, canvas, follow = 1}){
  const width = canvas.__viewWidth || canvas.clientWidth || canvas.width;
  const height = canvas.__viewHeight || canvas.clientHeight || canvas.height;
  const zoom = camera.zoom || 1;
  const targetX = player.x - width / (2 * zoom);
  const targetY = player.y - height / (2 * zoom);
  if(follow >= 1){
    camera.x = targetX;
    camera.y = targetY;
    return;
  }
  camera.x += (targetX - camera.x) * follow;
  camera.y += (targetY - camera.y) * follow;
}
