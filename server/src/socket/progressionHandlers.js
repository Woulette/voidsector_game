import { applyProfileTitleSelection } from "../players/profileTitles.js";
import { confirmProfileSave } from "./profileSaveGuard.js";

export function registerProgressionHandlers(socket, context){
  const {emitProfileSync, guard, players, profileManager} = context;

  async function ensureSaved(result, eventName){
    return confirmProfileSave(socket, result, {eventName});
  }

  socket.on("skill:upgrade", async payload=>{
    if(!guard("skill:upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"skill-upgrade", id:payload?.id}
    });
    if(!result.ok){
      socket.emit("skill:error", {message:result.reason || "Competence impossible."});
      return;
    }
    if(!await ensureSaved(result, "skill:error")) return;
    socket.emit("skill:upgraded", {
      skill:result.skill || null,
      level:result.level,
      nodeIndex:result.nodeIndex,
      rank:result.rank,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("portal:unlock", async payload=>{
    if(!guard("portal:unlock")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"portal-unlock", id:payload?.id, method:payload?.method}
    });
    if(!result.ok){
      socket.emit("portal:error", {message:result.reason || "Portail impossible."});
      return;
    }
    if(!await ensureSaved(result, "portal:error")) return;
    socket.emit("portal:unlocked", {
      portal:result.portal || null,
      method:result.method,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("prestige:perform", async ()=>{
    if(!guard("prestige:perform")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"prestige"}
    });
    if(!result.ok){
      socket.emit("prestige:error", {message:result.reason || "Prestige impossible."});
      return;
    }
    if(!await ensureSaved(result, "prestige:error")) return;
    socket.emit("prestige:performed", {
      prestige:result.prestige,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("profile:title-set", async payload=>{
    if(!guard("profile:title-set")) return;
    const player = players.get(socket.id);
    if(!player?.accountId){
      socket.emit("profile:title-error", {message:"Compte MMO requis."});
      return;
    }
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>applyProfileTitleSelection(profile, {
        titleId:Object.hasOwn(payload || {}, "titleId") ? payload.titleId : undefined,
        visible:Object.hasOwn(payload || {}, "visible") ? payload.visible : undefined
      })
    });
    if(!result.ok){
      socket.emit("profile:title-error", {message:result.reason || "Titre impossible."});
      return;
    }
    if(!await ensureSaved(result, "profile:title-error")) return;
    socket.emit("profile:title-updated", {
      titleId:result.titleId,
      visible:result.visible,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });
}
