export function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

export function fmt(n){
  return new Intl.NumberFormat("fr-FR").format(Math.floor(n || 0));
}

export function fmtCompact(n){
  const value = Math.floor(n || 0);
  if(Math.abs(value) < 1_000_000) return fmt(value);
  return new Intl.NumberFormat("fr-FR", {notation:"compact", maximumFractionDigits:1}).format(value);
}
