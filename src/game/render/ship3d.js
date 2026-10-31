import { getShipModel3d } from "../../data/shipModels3d.js";
import { advanceShipFlightMotion, getShipFlightPose } from "./ship3dProjection.js";
import { getScene3dFrame } from "./scene3dFrame.js";

const models = new Map();
const flightMotions = new WeakMap();
let rendererPromise = null;

function getRenderer(){
  return rendererPromise ??= import("./ship3dRenderer.js").then(module=>module.createShip3dRenderer());
}

export function getShipModel3dStatus(ship){
  if(!getShipModel3d(ship)) return "unavailable";
  return models.get(ship.id)?.status || "idle";
}

export function getActiveShipFlightPose(ship, player, enabled = true){
  const entry = models.get(ship?.id);
  if(!enabled || entry?.status !== "ready" || entry.renderer.isContextLost()){
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
  const entry = {status:"loading", renderer:null, model:null, promise:null};
  models.set(ship.id, entry);
  entry.promise = getRenderer().then(async renderer=>{
    entry.model = await renderer.loadModel(definition);
    entry.renderer = renderer;
    entry.status = "ready";
    return true;
  }).catch(error=>{
    entry.status = "error";
    console.warn("[Avosoma] Le modèle 3D est indisponible, affichage 2D conservé.", error);
    return false;
  });
  return entry.promise;
}

export function drawShipModel3d({ctx, camera, player, ship, position, enabled = true, inspection = null, flightPose = null}){
  if(!enabled || !getShipModel3d(ship)) return false;
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
  if(entry?.status !== "ready" || entry.renderer.isContextLost()) return false;
  try{
    const frame = !inspection && getScene3dFrame();
    if(frame){
      frame.enqueueShip({key:player.engineVfxState,template:entry.model.yaw,position,
        size:Math.max(96,Number(ship.renderHeight || 96)),
        steeringAngle:Number(player.angle || 0),
        pose:flightPose || getActiveShipFlightPose(ship,player,enabled)});
      return true;
    }
    const pixelRatio = Math.min(2, Math.max(1, Number(canvas?.__dpr || 1)));
    const resolution = Math.min(inspection ? 1024 : 512, Math.max(128, Math.ceil(size * pixelRatio * (camera.zoom || 1))));
    const source = entry.renderer.render(entry.model, {
      angle:Number(player.angle || 0) + Number(ship.renderAngleOffset || 0),
      flightPose:inspection ? null : flightPose || getActiveShipFlightPose(ship, player, enabled),
      resolution,
      inspection
    });
    ctx.drawImage(source, x - size / 2, y - size / 2, size, size);
    return true;
  }catch(error){
    entry.status = "error";
    console.warn("[Avosoma] Retour à l’affichage 2D du vaisseau.", error);
    return false;
  }
}
