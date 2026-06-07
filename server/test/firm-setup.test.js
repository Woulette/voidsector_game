import assert from "node:assert/strict";
import test from "node:test";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";

function makeSocket(id){
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    handlers,
    emitted,
    handshake:{address:"127.0.0.1"},
    conn:{remoteAddress:"127.0.0.1"},
    on:(event, handler)=>handlers.set(event, handler),
    emit:(event, payload)=>emitted.push({event, payload}),
    broadcast:{emit(){}}
  };
}

test("changing firm moves every live game socket to the new firm home map", ()=>{
  const launcherSocket = makeSocket("launcher");
  const gameSocket = makeSocket("game");
  const launcherPlayer = {
    id:"launcher",
    accountId:"account-1",
    account:{id:"account-1", firmId:"astra"},
    clientMode:"launcher",
    mapId:"0",
    state:null
  };
  const gamePlayer = {
    id:"game",
    accountId:"account-1",
    account:{id:"account-1", firmId:"astra"},
    clientMode:"game",
    mapId:"0",
    state:{mapId:"33", x:1200, y:-900, hp:4000, maxHp:5000, shipId:"orion"}
  };
  const players = new Map([
    [launcherPlayer.id, launcherPlayer],
    [gamePlayer.id, gamePlayer]
  ]);
  const profile = {
    activeShip:"orion",
    player:{name:"Pilote Cyan", firmId:"cyan", firmSelected:true}
  };
  const mapChanges = [];

  registerPlayerHandlers(launcherSocket, {
    buildFirmSpawnSession:()=>({
      source:"ship-change",
      mapId:"20",
      x:-4300,
      y:-3300,
      hp:5000,
      maxHp:5000,
      shield:0,
      maxShield:0,
      shipId:"orion"
    }),
    cleanName:value=>String(value || "Pilote"),
    emitPlayers(){},
    emitProfileSync(){},
    groups:new Map(),
    guard:()=>true,
    io:{sockets:{sockets:new Map([["game", gameSocket]])}},
    logger:{warn(){}},
    players,
    presence:{syncMovementLogoutState(){}, markCombat(){}, startLogout(){}},
    profileManager:{
      setupProfileForPlayer:()=>({
        ok:true,
        profile,
        firm:{id:"cyan", label:"Cyan", baseMapId:20, homeMapName:"CYAN-01"},
        firmChanged:true
      }),
      saveWorldSession:()=>profile
    },
    publicPlayer:player=>player,
    setPlayerMap:(socket, mapId)=>mapChanges.push({socketId:socket.id, mapId})
  });

  launcherSocket.handlers.get("profile:setup")({name:"Pilote Cyan", firmId:"cyan"});

  assert.equal(gamePlayer.mapId, "20");
  assert.equal(gamePlayer.state.mapId, "20");
  assert.equal(gamePlayer.account.firmId, "cyan");
  assert.deepEqual(mapChanges, [{socketId:"game", mapId:"20"}]);
  const resume = gameSocket.emitted.find(event=>event.event === "player:resume");
  assert.equal(resume?.payload?.source, "firm-change");
  assert.equal(resume?.payload?.mapId, "20");
});
