export function installCombatDebugCommands({mapList, getMapPortals, isRunning, getPlayer, loadMap, showToast}){
  function normalizeMapToken(value){
    return String(value ?? "").trim().toUpperCase().replace(/[\s_-]+/g, "");
  }

  function resolveDebugMap(value){
    const token = normalizeMapToken(value);
    const asNumber = Number(token);
    if(Number.isFinite(asNumber)){
      const astraName = `ASTRA-${String(asNumber).padStart(2, "0")}`;
      return mapList.find(map=>map.name === astraName) || mapList.find(map=>map.id === asNumber) || null;
    }
    return mapList.find(map=>normalizeMapToken(map.name) === token)
      || mapList.find(map=>normalizeMapToken(map.name).includes(token))
      || null;
  }

  function getDebugMapEntryPoint(map, xOrPreset, y){
    if(Number.isFinite(Number(xOrPreset)) && Number.isFinite(Number(y))) return {x:Number(xOrPreset), y:Number(y)};
    const preset = normalizeMapToken(xOrPreset);
    if(preset === "CENTER" || preset === "CENTRE") return {x:0, y:0};
    if(preset === "PORTAL"){
      const portal = getMapPortals(map)[0];
      if(portal) return {x:portal.x, y:portal.y};
    }
    if(map?.spawn) return {x:map.spawn.x, y:map.spawn.y};
    const portal = getMapPortals(map)[0];
    return portal ? {x:portal.x, y:portal.y} : {x:0, y:0};
  }

  function debugTeleportMap(value, xOrPreset, y){
    if(!isRunning() || !getPlayer()) return "Le combat n'est pas lance.";
    const map = resolveDebugMap(value);
    if(!map){
      const names = mapList.map(entry=>entry.name).join(", ");
      showToast("Map introuvable.");
      return `Map introuvable. Maps disponibles: ${names}`;
    }
    const point = getDebugMapEntryPoint(map, xOrPreset, y);
    loadMap(map.id, point.x, point.y);
    return `Teleportation debug: ${map.name} (${Math.round(point.x)}, ${Math.round(point.y)})`;
  }

  window.voidMap = debugTeleportMap;
  window.voidMaps = ()=>mapList.map(map=>({name:map.name, id:map.id}));
}
