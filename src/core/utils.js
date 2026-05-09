export function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

export function fmt(n){
  return new Intl.NumberFormat("fr-FR").format(Math.floor(n || 0));
}
