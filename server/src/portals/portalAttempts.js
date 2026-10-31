import { isFragmentPortal,sanitizePortalAttempt } from "../../../src/shared/portalAttempts.js";
import { getServerPortalDefinition } from "./portalDefinitions.js";
import { getPreparedPortalPlacement,PREPARED_PORTAL_RADIUS,PREPARED_PORTAL_SAFE_RADIUS,PREPARED_PORTAL_INTERACTION_RADIUS } from "./portalPreparation.js";

export function createAttemptEntry(attempt,profile,now = Date.now()){
  const valid=sanitizePortalAttempt(attempt),definition=getServerPortalDefinition(valid?.portalId);
  if(!valid || !definition) return null;
  return {id:valid.id,portalId:valid.portalId,portal:{id:valid.portalId,name:definition.name,totalWaves:definition.totalWaves || 30},
    ...getPreparedPortalPlacement(profile.player?.firmId || "astra"),r:PREPARED_PORTAL_RADIUS,safeRadius:PREPARED_PORTAL_SAFE_RADIUS,
    activationRadius:PREPARED_PORTAL_INTERACTION_RADIUS,preparedAt:now};
}

export function invokeFragmentAttempt(profile,prepared){
  if(!isFragmentPortal(prepared?.portalId)) return {ok:false,reason:"Portail introuvable."};
  if(sanitizePortalAttempt(profile.portalAttempt)) return {ok:false,reason:"Un portail est deja invoque. Termine-le ou utilise ses trois vies."};
  if(!profile.unlockedPortals?.includes(prepared.portalId)) return {ok:false,reason:"Assemble une nouvelle tentative avec les fragments requis."};
  profile.unlockedPortals=profile.unlockedPortals.filter(id=>id!==prepared.portalId);
  profile.portalAttempt={id:prepared.id,portalId:prepared.portalId,lives:3,phase:"prepared",invokedAt:prepared.preparedAt};
  profile.preparedPortal=prepared;
  return {ok:true};
}

export function finishFragmentAttempt(profile,portalId){
  if(!isFragmentPortal(portalId)) return;
  if(profile.portalAttempt?.portalId===portalId) profile.portalAttempt=null;
  if(profile.preparedPortal?.portalId===portalId) profile.preparedPortal=null;
  if(String(profile.azuronProgress?.portalId || "blue")===portalId) profile.azuronProgress=null;
}

export function parkFragmentAttempt(profile,portalId,lives,now = Date.now()){
  if(profile.portalAttempt?.portalId!==portalId) return null;
  profile.portalAttempt={...profile.portalAttempt,lives,phase:"parked"};
  profile.preparedPortal=createAttemptEntry(profile.portalAttempt,profile,now);
  return profile.preparedPortal;
}

export function activateFragmentAttempt({profileManager,player,group,socket,activate}){
  const instance=group.instance;
  const result=profileManager.updateProfileForPlayer({player,update:profile=>{
    const attempt=sanitizePortalAttempt(profile.portalAttempt);
    if(!attempt || attempt.portalId!==instance.portal.id) return {ok:false,reason:"Aucune tentative invoquee pour ce portail."};
    instance.playerLives[player.id]=attempt.lives;
    profile.portalAttempt={...attempt,phase:"active"};return {ok:true};
  }});
  const failed=()=>{if(group.instance===instance) group.instance=null;
    socket.emit("portal:error",{message:result?.reason || "Sauvegarde indisponible : le portail reste invoque."});return false;};
  if(result?.ok===false) return failed();
  const ready=()=>group.instance===instance ? activate() : false;
  return result?.save?.then ? result.save.then(ready,failed) : ready();
}
