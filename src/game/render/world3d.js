import { setScene3dFrame, getScene3dFrame } from "./scene3dFrame.js";
import { drawSpawnStationPrompts } from "./spawnHub.js?v=20261022-helion-hub1";
import { drawSpawnStationHoverLabel } from "./spawnStationHighlight.js";
import { drawQuestNpcs } from "./world.js";
import { drawMapPortals } from "./mapPortals.js?v=20261022-helion-hub1";
import { isWorld3dEnabled } from "./scene3dPolicy.js";

let renderer = null, loading = null, failed = false;

export function canUseWorld3d(currentMap, graphicsEffects){
  return isWorld3dEnabled(currentMap,graphicsEffects) && !failed && !renderer?.isContextLost();
}

function loadRenderer(){
  return loading ??= import("./world3dRenderer.js").then(module=>{
    renderer = module.createWorld3dRenderer();
    return renderer;
  });
}

export async function prepareWorld3dScene(options){
  if(!canUseWorld3d(options.currentMap,options.graphicsEffects)) return false;
  try{
    const readyRenderer = await loadRenderer();
    if(readyRenderer.isContextLost() || !await readyRenderer.prepare(options)) throw new Error("Ressources du secteur 3D indisponibles.");
    return true;
  }catch(error){
    failed = true;renderer?.hide();
    console.warn("[Avosoma] Le secteur utilise le rendu classique.",error);
    return false;
  }
}

export function beginWorld3dFrame(options){
  setScene3dFrame(null);
  const enabled = canUseWorld3d(options.currentMap,options.graphicsEffects) && typeof document !== "undefined";
  if(!enabled || failed || renderer?.isContextLost()){
    renderer?.hide();
    return false;
  }
  if(!renderer){
    options.canvas.dataset.world3d = "loading";
    loadRenderer().catch(error=>{
      failed = true;
      options.canvas.dataset.world3d = "error";
      console.warn("[Avosoma] Le secteur 3D est indisponible, rendu classique conservé.",error);
    });
    return false;
  }
  try{
    renderer.begin(options);
    setScene3dFrame(renderer);
    return true;
  }catch(error){
    failed = true;renderer.hide();
    console.warn("[Avosoma] Retour au secteur classique.",error);
    return false;
  }
}

export function endWorld3dFrame(){
  const frame = getScene3dFrame();
  setScene3dFrame(null);
  if(!frame) return;
  try{frame.finish();}catch(error){
    failed = true;frame.hide();
    console.warn("[Avosoma] Le rendu du secteur 3D a été interrompu.",error);
  }
}

export function drawWorld3dNavigation({ctx,camera,currentMap,stations,hoveredStation,portals,cache,graphicsEffects,player,portalTransition}){
  ctx.save();ctx.translate(-camera.x,-camera.y);
  drawQuestNpcs({ctx,cache,currentMap,graphicsEffects});
  const special = portals.filter(portal=>portal.prepared || portal.azuronGate);
  drawMapPortals({ctx,cache,currentMap,getMapPortals:()=>special,player,portalTransition,simplified:graphicsEffects.portalEffects === false});
  ctx.save();ctx.textAlign="center";ctx.font="700 16px Rajdhani,Arial";
  for(const portal of portals){
    if(special.includes(portal)) continue;
    const safeR=portal.safeRadius || Math.max(180,(portal.r || 90)*2.2);
    ctx.fillStyle=portal.closed ? "#f0a3a3" : "#e9d5ff";
    ctx.fillText(portal.closed ? (portal.label || "PORTAIL FERMÉ") : `${portal.displayLabel || portal.label} · APPUIE J`,portal.x,portal.y-safeR-16);
  }
  ctx.restore();
  drawSpawnStationPrompts({ctx,stations});
  if(hoveredStation) drawSpawnStationHoverLabel({ctx,station:hoveredStation,alpha:1,camera});
  const hub = currentMap.spawn?.visual;
  if(hub){
    ctx.textAlign = "center";ctx.font = "600 14px Rajdhani,Arial";
    ctx.fillStyle = "#d8c4ba";ctx.fillText(hub.title,hub.x,hub.y + hub.height * .43);
  }
  ctx.restore();
}
