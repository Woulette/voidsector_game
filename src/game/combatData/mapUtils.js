import { getFirmIdFromMapName, getFirmMapName } from "../../data/firms.js";
import { FIRM_ID_BY_INTERNAL_KEY, FIRM_PORTAL_POINT, FIRM_VISUALS } from "./mapConstants.js";

export function cloneData(value){
  return JSON.parse(JSON.stringify(value));
}

export function getAstraTemplate(maps, num){
  return maps.find(map=>map.name === `Helion-${String(num).padStart(2, "0")}`);
}

export function getInternalFirmMapName(firm, num){
  return getFirmMapName(FIRM_ID_BY_INTERNAL_KEY[firm] || firm, num);
}

export function getInternalFirmKeyFromMapName(name){
  const firmId = getFirmIdFromMapName(name);
  return Object.keys(FIRM_ID_BY_INTERNAL_KEY).find(key=>FIRM_ID_BY_INTERNAL_KEY[key] === firmId) || null;
}

export function firmMapId(firm, num){
  return FIRM_VISUALS[firm].baseId + num - 1;
}

export function portalFromDir({from, toMap, to, label}){
  const p = FIRM_PORTAL_POINT[from];
  const target = FIRM_PORTAL_POINT[to];
  return {x:p.x,y:p.y,r:95,safeRadius:230,targetMap:toMap,targetX:target.x,targetY:target.y,label};
}

function themedString(value, firm){
  const visual = FIRM_VISUALS[firm];
  return visual.replacements.reduce((text, [from, to])=>text.split(from).join(to), value);
}

export function themeObject(value, firm){
  return JSON.parse(themedString(JSON.stringify(value), firm));
}