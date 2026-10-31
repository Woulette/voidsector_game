import { getShipModel3d } from "../../data/shipModels3d.js";
import { advanceShipFlightMotion, getShipFlightPose } from "./ship3dProjection.js";
import { getScene3dFrame } from "./scene3dFrame.js";

const models = new Map();
const flightMotions = new WeakMap();
let rendererPromise = null, shipRenderer = null, offscreenFailed = false;

function getRenderer(){
  return rendererPromise ??= import("./ship3dRenderer.js").then(module=>(shipRenderer = module.createShip3dRenderer())).catch(error=>{
    offscreenFailed = true;
    console.warn("[Avosoma] Aperçu 3D indisponible.",error);
    return null;
  });
}

export function getShipModel3dStatus(ship){
  if(!getShipModel3d(ship)) return "unavailable";
  return models.get(ship.id)?.status || "idle";
}

export function getActiveShipFlightPose(ship, player, enabled = true){
  const entry = models.get(ship?.id);
  if(!enabled || entry?.status !== "ready" || (!getScene3dFrame() && (offscreenFailed || shipRenderer?.isContextLost()))){
    if(player.engineVfxState) flightMotions.delete(player.engineVfxState);
    return null;
  }
  // Remote players recreate their drawing object every frame but retain this VFX object.
  const key = player.engineVfxState ??= {};
  let motion = flightMotions.get(key);
  if(!motion || motion.shipId !== ship.id){
    motion = {shipId:ship.id};
    flightMotions.set(key, motion);
  }
  const angle = Number(player.angle || 0) + Number(ship.renderAngleOffset || 0);
  advanceShipFlightMotion(motion, angle, performance.now() / 1000);
  return getShipFlightPose({angle:motion.angle, roll:motion.roll, enginePortScale:getShipModel3d(ship).enginePortScale ?? 1});
}

export function prepareShipModel3d(ship){
  const definition = getShipModel3d(ship);
  if(!definition || typeof document === "undefined") return Promise.resolve(false);
  const existing = models.get(ship.id);
  if(existing) return existing.promise;
  const entry = {status:"loading", model:null, promise:null};
  models.set(ship.id, entry);
  entry.promise = import("./ship3dAssets.js").then(async assets=>{
    entry.model = await assets.loadShipModel3d(definition);
    entry.status = "ready";
    return true;
  }).catch(error=>{
    entry.status = "error";
    console.warn("[Avosoma] Le modèle 3D est indisponible, affichage 2D conservé.", error);
    return false;
  });
  return entry.promise;
}

export function drawShipModel3d({ctx, camera, player, ship, position, enabled = true, inspection = null, flightPose = null, engineEnabled = true}){
  if(!enabled || !getShipModel3d(ship) || typeof document === "undefined") return false;
  const x = position.x - camera.x;
  const y = position.y - camera.y;
  const size = Math.max(96, Number(ship.renderHeight || 96)) * 1.64;
  const canvas = ctx.canvas;
  const viewW = canvas?.__renderWidth;
  const viewH = canvas?.__renderHeight;
  if(Number.isFinite(viewW) && Number.isFinite(viewH)
    && (x + size < 0 || y + size < 0 || x - size > viewW || y - size > viewH)) return true;
  prepareShipModel3d(ship);
  const entry = models.get(ship.id);
  if(entry?.status !== "ready") return entry?.status !== "error";
  if(shipRenderer?.isContextLost() && !getScene3dFrame()) return false;
  try{
    const frame = !inspection && getScene3dFrame();
    if(frame){
      frame.enqueueShip({key:player.engineVfxState,template:entry.model.yaw,position,
        size:Math.max(96,Number(ship.renderHeight || 96)),
        shipId:ship.id,enginePower:player.enginePower,engineEnabled,
        steeringAngle:Number(player.angle || 0),
        pose:flightPose || getActiveShipFlightPose(ship,player,enabled)});
      return true;
    }
    const pixelRatio = Math.min(2, Math.max(1, Number(canvas?.__dpr || 1)));
    const resolution = Math.min(inspection ? 1024 : 512, Math.max(128, Math.ceil(size * pixelRatio * (camera.zoom || 1))));
    if(offscreenFailed) return false;
    if(!shipRenderer){getRenderer();return true;}
    const source = shipRenderer.render(entry.model, {
      angle:Number(player.angle || 0) + Number(ship.renderAngleOffset || 0),
      flightPose:inspection ? null : flightPose || getActiveShipFlightPose(ship, player, enabled),
      resolution,
      inspection,shipId:ship.id,engineKey:player.engineVfxState,enginePower:player.enginePower,engineEnabled,
      worldOffset:{x:position.x/Math.max(96,Number(ship.renderHeight || 96)),y:0,
        z:position.y/Math.max(96,Number(ship.renderHeight || 96))/Math.SQRT1_2}
    });
    ctx.drawImage(source, x - size / 2, y - size / 2, size, size);
    return true;
  }catch(error){
    entry.status = "error";
    console.warn("[Avosoma] Retour à l’affichage 2D du vaisseau.", error);
    return false;
  }
}

export async function prepareShipOffscreenRenderer(){
  try{await getRenderer();return Boolean(shipRenderer && !shipRenderer.isContextLost());}
  catch(error){console.warn("[Avosoma] Aperçu 3D indisponible.",error);return false;}
}

export function releaseShipOffscreenRenderer(){
  shipRenderer?.dispose();
  shipRenderer = null;rendererPromise = null;offscreenFailed = false;
}
