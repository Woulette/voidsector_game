export function getSlowedMovementSpeed(baseSpeed, effect){
  const base = Math.max(1, Number(baseSpeed) || 1);
  const amount = Math.max(0, Number(effect?.amount) || 0);
  const ratio = Math.max(0, Math.min(1, Number(effect?.ratio) || 0));
  // Repeated bombs refresh the status; reductions do not multiply each other.
  return Math.max(1, base - Math.max(amount, base * ratio));
}
