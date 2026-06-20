import crypto from "node:crypto";
import { config } from "../config.js";
import { isLoadTestAccount, provisionLoadTestBotProfile } from "../loadtest/provisionBot.js";

function secretMatches(expected, received){
  const expectedBuffer = Buffer.from(String(expected || ""));
  const receivedBuffer = Buffer.from(String(received || ""));
  if(!expectedBuffer.length || expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function registerLoadTestHandlers(socket, context){
  const {
    emitPlayers,
    emitProfileSync,
    guard,
    players,
    profileManager,
    setPlayerMap
  } = context;

  socket.on("loadtest:provision", payload=>{
    if(!guard("loadtest:provision")) return;
    const player = players.get(socket.id);
    if(!config.loadTest?.enabled
      || !secretMatches(config.loadTest.secret, payload?.secret)
      || !isLoadTestAccount(player?.account)){
      socket.emit("loadtest:error", {
        message:"Provisionnement de charge refuse.",
        at:Date.now()
      });
      return;
    }
    if(!player?.accountId || !profileManager.getProfileForPlayer(player)?.player?.firmSelected){
      socket.emit("loadtest:error", {
        message:"Le compte bot doit avoir un profil et une firme.",
        at:Date.now()
      });
      return;
    }

    let provision = null;
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        provision = provisionLoadTestBotProfile(profile, {
          mapId:payload?.mapId,
          x:payload?.x,
          y:payload?.y,
          resetQuests:payload?.resetQuests !== false
        });
        return provision.ok ? {ok:true, changed:true} : provision;
      }
    });
    if(!result.ok || !provision?.ok){
      socket.emit("loadtest:error", {
        message:result.reason || provision?.reason || "Provisionnement impossible.",
        at:Date.now()
      });
      return;
    }

    player.loadTestBot = true;
    player.state = {...provision.session};
    player.mapId = provision.session.mapId;
    player.lastClientStateAt = Date.now();
    setPlayerMap(socket, player.mapId);
    profileManager.saveWorldSession({
      player,
      state:player.state,
      force:true
    });
    emitProfileSync(player, result.profile);
    socket.emit("player:resume", provision.session);
    socket.emit("loadtest:provisioned", {
      mapId:provision.session.mapId,
      shipId:provision.session.shipId,
      laserCount:8,
      ammoId:"ammo_x1",
      at:Date.now()
    });
    emitPlayers();
  });
}
