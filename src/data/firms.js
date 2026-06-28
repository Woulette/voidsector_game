export const FIRMS = [
  {id:"astra", label:"Astra", mapPrefix:"Helion", legacyMapPrefix:"ASTRA", homeMapName:"Helion-01", baseMapId:0, color:"#ef4444", spawn:{x:-4300, y:3300}},
  {id:"cyan", label:"Cygnus", mapPrefix:"Nereid", legacyMapPrefix:"CYAN", homeMapName:"Nereid-01", baseMapId:20, color:"#22d3ee", spawn:{x:-4300, y:-3300}},
  {id:"jaune", label:"Solarys", mapPrefix:"Aureon", legacyMapPrefix:"JAUNE", homeMapName:"Aureon-01", baseMapId:30, color:"#facc15", spawn:{x:4300, y:-3300}},
  {id:"verte", label:"Verdantis", mapPrefix:"Sylva", legacyMapPrefix:"VERTE", homeMapName:"Sylva-01", baseMapId:40, color:"#22c55e", spawn:{x:4300, y:3300}}
];

const FIRM_ALIASES = new Map();
for(const firm of FIRMS){
  FIRM_ALIASES.set(firm.id, firm.id);
  FIRM_ALIASES.set(firm.label.toLowerCase(), firm.id);
  FIRM_ALIASES.set(firm.mapPrefix.toLowerCase(), firm.id);
  FIRM_ALIASES.set(firm.legacyMapPrefix.toLowerCase(), firm.id);
}
FIRM_ALIASES.set("vert", "verte");
FIRM_ALIASES.set("green", "verte");
FIRM_ALIASES.set("yellow", "jaune");

export function normalizeFirmId(value){
  const key = String(value || "astra").trim().toLowerCase();
  return FIRM_ALIASES.get(key) || "astra";
}

export function getFirmDefinition(value){
  const id = normalizeFirmId(value);
  return FIRMS.find(firm=>firm.id === id) || FIRMS[0];
}

export function getFirmMapPrefix(value){
  return getFirmDefinition(value).mapPrefix;
}

export function getFirmMapId(value, num = 1){
  const firm = getFirmDefinition(value);
  return firm.baseMapId + Math.max(1, Math.floor(Number(num || 1))) - 1;
}

export function getFirmMapName(value, num = 1){
  const firm = getFirmDefinition(value);
  return `${firm.mapPrefix}-${String(Math.max(1, Math.floor(Number(num || 1)))).padStart(2, "0")}`;
}

export function getFirmMapDisplayName(value, num = 1){
  return getFirmMapName(value, num);
}

export function getMapDisplayName(mapOrName){
  if(mapOrName && typeof mapOrName === "object"){
    if(mapOrName.displayName) return String(mapOrName.displayName);
    return getMapDisplayName(mapOrName.name);
  }
  const name = String(mapOrName || "");
  const match = name.match(/^([A-Z]+)-(\d+)$/i);
  if(!match) return name;
  const firmId = getFirmIdFromMapName(name);
  if(!firmId) return name;
  return getFirmMapDisplayName(firmId, Number(match[2]));
}

export function getCanonicalMapName(mapOrName){
  const name = String(mapOrName && typeof mapOrName === "object" ? mapOrName.name : mapOrName || "");
  if(name.toUpperCase() === "CORE") return "CORE";
  const match = name.match(/^([A-Z]+)-(\d+)$/i);
  if(!match) return name;
  const firmId = getFirmIdFromMapName(name);
  return firmId ? getFirmMapName(firmId, Number(match[2])) : name;
}

export function getFirmHomeMapName(value){
  return getFirmDefinition(value).homeMapName;
}

export function getFirmIdFromMapName(name){
  const prefix = String(name || "").split("-")[0]?.toLowerCase();
  return FIRM_ALIASES.get(prefix) || null;
}

export function getFirmBadgeAsset(value){
  return `assets/firms/${normalizeFirmId(value)}.svg`;
}
