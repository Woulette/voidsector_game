import assert from "node:assert/strict";
import test from "node:test";
import { createEquipmentLocationManager } from "../src/players/equipmentLocation.js";

function createProfileStore(){
  let profile = {
    activeShip:"velox",
    selectedShip:"velox",
    ownedShips:["velox", "test_runner"],
    shipWorldSessions:{}
  };
  return {
    get profile(){ return profile; },
    manager:{
      getProfileForPlayer(){ return profile; },
      getWorldSessionForPlayer(){ return profile.worldSession || null; },
      getShipWorldSessionForPlayer(_player, shipId){ return profile.shipWorldSessions?.[shipId] || null; },
      setActiveShipForPlayer({shipId, worldSession}){
        profile = {
          ...profile,
          activeShip:shipId,
          selectedShip:shipId,
          worldSession,
          shipWorldSessions:{
            ...profile.shipWorldSessions,
            [worldSession.shipId]:worldSession
          }
        };
        return {ok:true, shipId, profile};
      },
      saveWorldSession({state}){
        profile = {
          ...profile,
          worldSession:state,
          shipWorldSessions:{
            ...profile.shipWorldSessions,
            [state.shipId]:state
          }
        };
        return profile;
      }
    }
  };
}

test("ship switch emits a profile containing the saved source and target ship sessions", ()=>{
  const emitted = [];
  const socket = {emit:(eventName, payload)=>emitted.push({eventName, payload})};
  const player = {
    id:"game-socket",
    accountId:"account-1",
    clientMode:"game",
    connected:true,
    state:{mapId:"0", x:-4300, y:3300, hp:926, maxHp:15000, shield:0, maxShield:0, shipId:"velox"}
  };
  const players = new Map([[player.id, player]]);
  const store = createProfileStore();
  const manager = createEquipmentLocationManager({
    io:{sockets:{sockets:new Map([[player.id, socket]])}},
    players,
    profileManager:store.manager,
    setPlayerMap(){}
  });
  const location = manager.canChangeActiveShipAtFirmSpawn(player);
  assert.equal(location.ok, true);

  store.manager.saveWorldSession({state:player.state});
  const spawnSession = manager.buildFirmSpawnSession({
    shipId:"test_runner",
    firmId:location.firmId,
    state:player.state,
    savedSession:store.manager.getShipWorldSessionForPlayer(player, "test_runner")
  });
  const result = store.manager.setActiveShipForPlayer({player, shipId:"test_runner", worldSession:spawnSession});
  player.state = {...player.state, ...spawnSession, shipId:result.shipId};
  const syncedProfile = store.manager.saveWorldSession({state:player.state});
  socket.emit("player:resume", spawnSession);
  socket.emit("profile:sync", syncedProfile);

  assert.equal(syncedProfile.shipWorldSessions.velox.hp, 926);
  assert.equal(syncedProfile.shipWorldSessions.velox.maxHp, 15000);
  assert.equal(syncedProfile.shipWorldSessions.test_runner.hp, 20000);
  assert.equal(syncedProfile.shipWorldSessions.test_runner.maxHp, 20000);
  assert.equal(emitted.at(-1).payload.shipWorldSessions.velox.hp, 926);
});

test("ship switch is refused from an enemy firm base", ()=>{
  const player = {
    id:"game-socket",
    accountId:"account-1",
    account:{firmId:"astra"},
    clientMode:"game",
    connected:true,
    state:{mapId:"20", x:-4300, y:-3300, hp:5000, maxHp:15000, shipId:"velox"}
  };
  const players = new Map([[player.id, player]]);
  const store = createProfileStore();
  store.profile.player = {firmId:"astra"};
  const manager = createEquipmentLocationManager({
    io:{sockets:{sockets:new Map()}},
    players,
    profileManager:store.manager,
    setPlayerMap(){}
  });

  const location = manager.canChangeActiveShipAtFirmSpawn(player);
  assert.equal(location.ok, false);
  assert.match(location.reason, /Helion-01/);
});
