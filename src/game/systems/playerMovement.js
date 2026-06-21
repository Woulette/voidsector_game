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

export function updatePlayerMovement({player, moveTarget, dt, map, clampToMap = true, resolvePosition = null}){
  let movedX = 0;
  let movedY = 0;
  let nextMoveTarget = moveTarget;
  const previous = {x:player.x, y:player.y};

  if(nextMoveTarget){
    const dx = nextMoveTarget.x - player.x;
    const dy = nextMoveTarget.y - player.y;
    const distance = Math.hypot(dx, dy);
    if(distance < 8){
      nextMoveTarget = null;
    }else{
      const activeSlow = Number(player.slowEffect?.remaining || 0) > 0
        ? Math.max(0, Number(player.slowEffect?.amount || 0))
        : 0;
      const movementSpeed = Math.max(1, Number(player.speed || 0) - activeSlow);
      const step = Math.min(movementSpeed * dt, distance);
      movedX = dx / distance * step;
      movedY = dy / distance * step;
      player.x += movedX;
      player.y += movedY;
      player.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  if(resolvePosition){
    const resolved = resolvePosition(previous, {x:player.x, y:player.y});
    player.x = Number(resolved?.x ?? player.x);
    player.y = Number(resolved?.y ?? player.y);
    movedX = player.x - previous.x;
    movedY = player.y - previous.y;
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
