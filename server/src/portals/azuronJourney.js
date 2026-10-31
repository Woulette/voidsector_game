import { randomUUID } from "node:crypto";
import { getAzuronStageGates } from "../../../src/data/azuronPortal.js";
import { sanitizeAzuronProgress } from "../../../src/shared/azuronProgress.js";
import { parkFragmentAttempt } from "./portalAttempts.js";
import { PORTAL_EXIT_DURATION_MS } from "../../../src/shared/portalAttempts.js";
import { getPlayerInstanceGroup, releasePersonalPortalGroup } from "./portalSessions.js";
import { getServerPortalDefinition } from "./portalDefinitions.js";
import { getPreparedPortalPlacement } from "./portalPreparation.js";
import { isWavePortal } from "../../../src/data/wavePortalTiers.js";

function afterSave(result, done, failed){
  if(result?.ok === false) return failed();
  return result?.save && typeof result.save.then === "function" ? result.save.then(done,failed) : done();
}

export function createAzuronJourney({io,players,groups,profileManager,emitProfileSync,emitInstance,
  setPlayerMap,cancelPendingAttacksForRoom,cancelRuntime,continueBatch,now = ()=>Date.now(),setTimeoutFn = setTimeout}){
  function owner(group){
    const instance=group?.instance;
    return (instance?.joinedMemberIds || []).map(id=>players.get(id)).find(player=>player && (
      String(player.accountId || player.account?.id || "")===String(instance.ownerAccountId || "")
      || player.id===instance.ownerPlayerId || !instance.privateOwner));
  }

  function saveBatch(group,nextWave){
    const instance=group?.instance,player=owner(group);
    if(!player || !instance) return;
    const result=profileManager.updateProfileForPlayer({player,update:profile=>{
      profile.azuronProgress={version:1,...(instance.portal.id!=="blue" ? {portalId:instance.portal.id} : {}),runId:instance.azuronRunId,nextWave,
        lives:Number(instance.playerLives?.[player.id] ?? 3),phase:"ready",defeated:[],updatedAt:now()};
      return {ok:true};
    }});
    instance.azuronCheckpointSave=Promise.resolve(result?.save).then(()=>{
      if(result?.ok===false) throw new Error(result.reason || "Sauvegarde indisponible.");
      if(group.instance===instance) emitProfileSync?.(player,result.profile);
    });
    instance.azuronCheckpointSave.catch(()=>{
      if(group.instance!==instance) return;
      instance.objective.saveError=true;
      io.to(player.id).emit("portal:error",{message:"Point de reprise non sauvegarde. Reessaie la porte."});
      emitInstance?.(group);
    });
  }

  function begin(player,group,activate,socket){
    const instance=group.instance;
    const portalId=instance.portal.id;
    const stored=sanitizeAzuronProgress(profileManager.getProfileForPlayer?.(player)?.azuronProgress);
    const saved=String(stored?.portalId || "blue")===portalId ? stored : null;
    const progress={...(saved || {version:1,...(portalId!=="blue" ? {portalId} : {}),runId:randomUUID(),nextWave:1,lives:3,defeated:[]}),phase:"active",updatedAt:now()};
    const result=profileManager.updateProfileForPlayer({player,update:profile=>{
      if(profile.portalAttempt?.portalId===portalId) profile.portalAttempt={...profile.portalAttempt,lives:progress.lives,phase:"active"};
      profile.azuronProgress=progress;return {ok:true};
    }});
    return afterSave(result,()=>{
      if(group.instance!==instance) return false;
      instance.playerLives[player.id]=progress.lives;
      emitProfileSync?.(player,result.profile);activate(progress);return true;
    },()=>{
      if(group.instance===instance) group.instance=null;
      socket.emit("portal:error",{message:"Sauvegarde indisponible : le portail n'a pas demarre."});return false;
    });
  }

  function validInteraction(player,group,instance,action){
    if(!player || players.get(player.id)!==player || player.connected===false || player.deathState || Number(player.state?.hp || 0)<=0 || group?.instance!==instance
      || !isWavePortal(instance?.portal) || !instance.joinedMemberIds?.includes(player.id)
      || String(player.mapId ?? player.state?.mapId)!==`portal-${instance.portal.id}`) return false;
    if(instance.waveState!=="batch_ready" && !(instance.completed && action==="exit")) return false;
    const gate=getAzuronStageGates({nextWave:instance.objective?.nextWave,completed:instance.completed,portalId:instance.portal.id}).find(item=>item.action===action);
    return Boolean(gate && Math.hypot(Number(player.state.x || 0)-gate.x,Number(player.state.y || 0)-gate.y)<=gate.activationRadius);
  }

  async function interact(socket,action){
    if(!["continue","exit"].includes(action)) return false;
    const player=players.get(socket.id),group=getPlayerInstanceGroup(player,groups),instance=group?.instance;
    const reject=message=>{socket.emit("portal:error",{message,code:"AZURON_TRANSFER_CANCELLED"});return false;};
    if(!validInteraction(player,group,instance,action)) return reject("Approche de la porte ouverte apres la serie.");
    if(instance.azuronTransitionPending) return false;
    instance.azuronTransitionPending=true;
    try{
      if(instance.azuronCheckpointSave){
        try{await instance.azuronCheckpointSave;}
        catch{saveBatch(group,instance.objective.nextWave);await instance.azuronCheckpointSave;}
      }
      if(!validInteraction(player,group,instance,action)) return false;
      if(action==="continue"){
        const result=profileManager.updateProfileForPlayer({player,update:profile=>{
          const progress=sanitizeAzuronProgress(profile.azuronProgress);
          if(!progress || String(progress.portalId || "blue")!==instance.portal.id || progress.runId!==instance.azuronRunId || progress.nextWave!==instance.objective.nextWave){
            return {ok:false,reason:"Point de reprise indisponible."};
          }
          profile.azuronProgress={...progress,phase:"active",lives:instance.playerLives[player.id],updatedAt:now()};
          return {ok:true};
        }});
        if(result?.ok===false) return reject(result.reason);
        await result?.save;
        if(!validInteraction(player,group,instance,action)) return false;
        instance.azuronCheckpointSave=null;
        emitProfileSync?.(player,result.profile);
        return continueBatch(group);
      }
      const profile=profileManager.getProfileForPlayer(player);
      const placement=getPreparedPortalPlacement(profile.player?.firmId || player.account?.firmId || "astra");
      const definition=getServerPortalDefinition(instance.portal.id);
      io.to(player.id).emit("portal:azuron-transfer",{durationMs:PORTAL_EXIT_DURATION_MS,
        portal:{...getAzuronStageGates({nextWave:instance.objective?.nextWave,completed:instance.completed,portalId:instance.portal.id}).find(gate=>gate.action==="exit"),
          targetMap:placement.mapId,targetX:placement.x,targetY:placement.y},at:now()});
      await new Promise(resolve=>{const timer=setTimeoutFn(resolve,PORTAL_EXIT_DURATION_MS);timer?.unref?.();});
      if(!validInteraction(player,group,instance,action)) return reject("Transfert annule : reste pres de la porte.");
      const state={...player.state,mapId:String(placement.mapId),x:placement.x,y:placement.y,
        vx:0,vy:0,moving:false,enginePower:0,moveTarget:null,attackTargetId:"",attackAmmoId:"",attackWeaponClass:"",updatedAt:now()};
      const result=profileManager.updateProfileForPlayer({player,update:draft=>{
        if(!instance.completed){
          const progress=sanitizeAzuronProgress(draft.azuronProgress);
          if(!progress || String(progress.portalId || "blue")!==instance.portal.id || progress.runId!==instance.azuronRunId) return {ok:false,reason:"Point de reprise indisponible."};
          draft.azuronProgress={...progress,phase:"parked",lives:instance.playerLives[player.id],updatedAt:now()};
        }
        if(!instance.completed) parkFragmentAttempt(draft,instance.portal.id,instance.playerLives[player.id],now());
        draft.worldSession={...state};
        if(state.shipId) draft.shipWorldSessions={...(draft.shipWorldSessions || {}),[state.shipId]:{...state}};
        return {ok:true};
      }});
      if(result?.ok===false) return reject(result.reason);
      await result?.save;
      if(!validInteraction(player,group,instance,action)) return false;
      state.hp=player.state.hp;state.shield=player.state.shield;
      cancelRuntime(instance);cancelPendingAttacksForRoom?.(`instance:${instance.id}`);
      releasePersonalPortalGroup(groups,group);
      Object.assign(player.state,state);player.mapId=state.mapId;
      player.deathState=null;player.statusEffects={};player.radiationStartedAt=0;
      const prepared=result.profile?.preparedPortal || null;
      const ownerAccountId=String(player.accountId || player.account?.id || "");
      for(const candidate of players.values()){
        if(String(candidate.accountId || candidate.account?.id || "")!==ownerAccountId) continue;
        candidate.preparedPortal=prepared;io.to(candidate.id).emit("portal:prepared",{preparedPortal:prepared});
      }
      setPlayerMap?.(socket,state.mapId);
      profileManager.saveWorldSession?.({player,state:player.state,force:true});
      emitProfileSync?.(player,result.profile);
      io.to(player.id).emit("portal:paused",{portal:{id:instance.portal.id,name:definition.name},state,
        spawn:{...placement},nextWave:result.profile?.azuronProgress?.nextWave || 0,completed:Boolean(instance.completed),at:now()});
      return true;
    }catch{return reject("Sauvegarde indisponible : la porte reste ouverte, reessaie.");}
    finally{instance.azuronTransitionPending=false;}
  }

  return {begin,saveBatch,interact};
}
