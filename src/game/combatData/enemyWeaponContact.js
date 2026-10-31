// Presentation geometry only. Shield absorption and damage stay on the server.
export function getEnemyWeaponContact({target, fromX, fromY, shield = target?.shield} = {}){
  if(!target || target.isPlayerTarget || target.shipId || target.owner === "player") return null;
  const x = Number(target.x), y = Number(target.y);
  if(!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const angle = Math.atan2(Number(fromY ?? y) - y, Number(fromX ?? x - 1) - x);
  const bodyRadius = Math.max(8, Number(target.radius) || Math.max(Number(target.width || 72), Number(target.height || 72)) * .23);
  const shieldRadius = Math.max(bodyRadius + 12, Math.max(Number(target.width || 72), Number(target.height || 72)) * .5 + 4);
  const surface = Number(shield) > 0 ? "shield" : "hull";
  const radius = surface === "shield" ? shieldRadius : bodyRadius;
  return {surface, angle, radius, x:x + Math.cos(angle) * radius, y:y + Math.sin(angle) * radius,
    centerX:x, centerY:y};
}
