export const MAX_SERVER_ACTION_REPEAT = 20;

export function normalizeServerActionRepeat(value = 1){
  const repeat = Number(value);
  if(!Number.isInteger(repeat) || repeat < 1 || repeat > MAX_SERVER_ACTION_REPEAT) return 0;
  return repeat;
}
