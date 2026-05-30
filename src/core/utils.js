export function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

export function fmt(n){
  return new Intl.NumberFormat("fr-FR").format(Math.floor(n || 0));
}

export function fmtRankPoints(n){
  const value = Math.max(0, Number(n || 0));
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits:value > 0 && value < 1 ? 3 : 0,
    maximumFractionDigits:value < 1 ? 3 : 2
  }).format(value);
}

export function fmtCompact(n){
  const value = Math.floor(n || 0);
  if(Math.abs(value) < 1_000_000) return fmt(value);
  return new Intl.NumberFormat("fr-FR", {notation:"compact", maximumFractionDigits:1}).format(value);
}
