import { getInternalFirmKeyFromMapName } from "./mapUtils.js";

const RICKY_PORTAL_BY_FIRM = {
  ASTRA:{map:"Helion-02", npcId:"astra02_portal_mechanic", portal:{x:4300, y:-3300}, npc:{x:4470, y:-3180}},
  CYAN:{map:"Nereid-02", npcId:"cyan02_portal_mechanic", portal:{x:4300, y:3300}, npc:{x:4470, y:3180}},
  JAUNE:{map:"Aureon-02", npcId:"jaune02_portal_mechanic", portal:{x:-4300, y:3300}, npc:{x:-4470, y:3180}},
  VERTE:{map:"Sylva-02", npcId:"verte02_portal_mechanic", portal:{x:-4300, y:-3300}, npc:{x:-4470, y:-3180}}
};

const RICKY_PORTAL_UNLOCK_QUEST_BASE_ID = "quest_lv10_maintenance_impossible";
const RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM = {
  ASTRA:"",
  CYAN:"_cyan",
  JAUNE:"_jaune",
  VERTE:"_verte"
};

function getMapFirmAndZone(map){
  const match = String(map?.name || "").match(/^([A-Z]+)-(\d+)$/i);
  if(!match) return null;
  const firm = getInternalFirmKeyFromMapName(map?.name);
  return firm ? {firm, zone:Number(match[2])} : null;
}

function getRickyPortalQuestId(firm){
  if(!Object.hasOwn(RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM, firm)) return null;
  return `${RICKY_PORTAL_UNLOCK_QUEST_BASE_ID}${RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM[firm]}`;
}

export function isRickyPortalUnlocked(map, completedQuestClaims = {}, questProgress = {}){
  const info = getMapFirmAndZone(map);
  if(!info || info.zone !== 2) return false;
  const questId = getRickyPortalQuestId(info.firm);
  return Boolean(questId && completedQuestClaims?.[questId]);
}

export function getRickyUnlockedPortal(map){
  const info = getMapFirmAndZone(map);
  if(!info || info.zone !== 2) return null;
  const config = RICKY_PORTAL_BY_FIRM[info.firm];
  if(!config) return null;
  return {
    ...config.portal,
    r:95,
    safeRadius:230,
    activationRadius:340,
    label:"PORTAIL DE RICKY",
    displayLabel:"PORTAIL DE RICKY",
    portalId:"ricky",
    rickyPortal:true,
    dungeonPortal:true
  };
}

export function installFirmRickyPortals(maps){
  const rickyTemplate = {
    npcImg:"assets/ships/npc/npc_saucer.png",
    radius:82,
    size:132,
    marker:"!",
    label:"RICKY",
    ...(maps.find(entry=>entry.name === "Helion-02")?.questNpcs?.find(npc=>npc.id === "astra02_portal_mechanic") || {})
  };
  for(const config of Object.values(RICKY_PORTAL_BY_FIRM)){
    const map = maps.find(entry=>entry.name === config.map);
    if(!map) continue;
    map.closedPortals = [{...config.portal, r:95, safeRadius:230, label:"PORTAIL FERME", damaged:true, closed:true}];
    map.questNpcs = [{
      ...rickyTemplate,
      id:config.npcId,
      name:"Ricky",
      x:config.npc.x,
      y:config.npc.y,
      interactionRadius:260,
      text:"Le portail est ferme. J'ai besoin de fluides et de renforts pour le stabiliser."
    }];
  }
}