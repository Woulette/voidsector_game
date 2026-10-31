import { prepareCombatImages, getCombatMapAssetPaths, releaseCombatImages } from "../combatAssets.js?v=20261022-helion-hub1";
import { getReplacedMapImages } from "./scene3dPolicy.js";
import { prepareWorld3dScene, canUseWorld3d } from "./world3d.js";
import { prepareShipModel3d, prepareShipOffscreenRenderer, releaseShipOffscreenRenderer, getShipModel3dStatus } from "./ship3d.js";
import { ENGINE_TEXTURE_PATH, releaseShipEngineTextures } from "./shipEngines.js";
import { createSceneLoadingGate } from "../systems/sceneLoadingGate.js";
import { createSceneLoadingScreen } from "../ui/sceneLoadingScreen.js";
import { supportsShipThruster3d } from "./shipThruster3dMotion.js";

export function getCombatSceneLoadingKey({currentMap,ship,graphicsEffects}){
  return JSON.stringify([currentMap?.id,currentMap?.name,ship?.id,
    canUseWorld3d(currentMap,graphicsEffects),graphicsEffects.shipModels3d !== false,getShipModel3dStatus(ship) === "error"]);
}

export function createCombatSceneLoading({canvas,cache}){
  if(typeof document === "undefined") return {begin:()=>true,completeFrame(){},reset(){},show(){}};
  const screen = createSceneLoadingScreen(canvas);
  const gate = createSceneLoadingGate({...screen, prepare:async (options,isCurrent)=>{
    const {currentMap,ship,graphicsEffects,initialImages=[]} = options;
    const ships=[...new Map([ship,...(options.getSceneShips?.() || [])].map(value=>[value.id,value])).values()];
    const [world3d,readyShips] = await Promise.all([
      prepareWorld3dScene(options),
      Promise.all(ships.map(value=>graphicsEffects.shipModels3d !== false ? prepareShipModel3d(value) : false))
    ]);
    if(!isCurrent()) return;
    if(world3d || graphicsEffects.shipModels3d === false) releaseShipOffscreenRenderer();
    const rendererReady=readyShips.some(Boolean) && (world3d || await prepareShipOffscreenRenderer());
    if(!isCurrent()) return;
    const paths = [...getCombatMapAssetPaths(currentMap,{world3d}),...initialImages];
    if(!world3d && currentMap.spawn && currentMap.spawn.kind !== "portal" && !currentMap.spawn.visual){
      paths.push("assets/spawn/spawn_dock.png","assets/spawn/spawn_quest_relay.png","assets/spawn/spawn_refinery.png");
    }
    for(let i=0;i<ships.length;i++){
      const currentShip=ships[i],ship3d=readyShips[i] && rendererReady;
      if(graphicsEffects.shipEngineTrail !== false && !(ship3d && supportsShipThruster3d(currentShip))) paths.push(ENGINE_TEXTURE_PATH);
      if(ship3d){
        releaseCombatImages(cache,[currentShip.img,currentShip.combatImg]);
        if(supportsShipThruster3d(currentShip)) releaseShipEngineTextures(currentShip.id);
      }else paths.push(currentShip.combatImg || currentShip.img);
    }
    if(world3d){
      releaseCombatImages(cache,[...getReplacedMapImages(currentMap),
        "assets/spawn/spawn_dock.png","assets/spawn/spawn_quest_relay.png","assets/spawn/spawn_refinery.png"]);
    }
    await prepareCombatImages(cache,paths);
  }});
  return Object.assign(gate,{show:screen.show});
}
