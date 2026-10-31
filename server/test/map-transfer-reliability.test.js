import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData.js";
import { getFirmIdFromMapName } from "../../src/data/firms.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";
import { installPlayerSocketListeners } from "../../src/multiplayer/playerSocketListeners.js";
import { createCombatFrameUpdateSystem } from "../../src/game/systems/combatFrameUpdate.js";
import { createCombatSessionController } from "../../src/game/systems/combatSession.js";
import { createMapPortalTransition, advanceMapPortalTransition } from "../../src/game/systems/mapPortalTransfer.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";

function baseState(mapId, point){
  return {...point, mapId:String(mapId), shipId:"orion", angle:0, vx:0, vy:0, enginePower:0,
    hp:5000, maxHp:5000, shield:0, maxShield:0, updatedAt:Date.now() - 100};
}

function serverFixture(map, portal){
  const handlers = new Map();
  const emitted = [];
  const profile = createDefaultProfile();
  profile.player.firmId = getFirmIdFromMapName(map.name) || "astra";
  const player = {id:"transfer-player", clientMode:"game", connected:true, mapId:String(map.id),
    mapRoom:`map:${map.id}`, state:baseState(map.id, portal)};
  const broadcast = {emit(){}};
  broadcast.volatile = broadcast;
  const socket = {id:player.id, on:(event, fn)=>handlers.set(event, fn),
    emit:(event, payload)=>emitted.push({event, payload}), to:()=>broadcast};
  registerPlayerHandlers(socket, {
    players:new Map([[player.id, player]]), groups:new Map(), guard:()=>true,
    publicPlayer:target=>({id:target.id, state:target.state}), logger:{warn(){}},
    presence:{markActivity(){}, syncMovementLogoutState(){}},
    profileManager:{getProfileSnapshotForPlayer:()=>profile, saveWorldSession(){}},
    setPlayerMap:(_, id)=>{ player.mapId = String(id); player.mapRoom = `map:${id}`; }
  });
  return {player, emitted, send:payload=>handlers.get("player:state")(payload)};
}

test("a map transfer remains validated when the game tab becomes hidden", ()=>{
  const failures = [];
  for(const map of MAPS){
    for(const portal of map.portals || []){
      if(portal.targetMap == null) continue;
      const fixture = serverFixture(map, portal);
      fixture.send({...fixture.player.state, mapId:String(portal.targetMap), x:portal.targetX, y:portal.targetY,
        sourceSeq:1, sourceAt:100, pageHidden:true});
      if(fixture.player.state.mapId !== String(portal.targetMap)) failures.push(`${map.name}:${portal.targetMap}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("hidden-tab map requests still reject a transfer away from a portal", ()=>{
  const map = MAPS.find(entry=>entry.id === 0);
  const portal = map.portals[0];
  const fixture = serverFixture(map, portal);
  Object.assign(fixture.player.state, {x:0, y:0});
  fixture.send({...fixture.player.state, mapId:String(portal.targetMap), x:portal.targetX, y:portal.targetY,
    sourceSeq:1, sourceAt:100, pageHidden:true, portalTransfer:true});
  assert.equal(fixture.player.state.mapId, "0");
  assert.ok(fixture.emitted.some(event=>event.event === "player:state-correction"));
});

test("transfer animation sends a reliable stop, heartbeats and an immediate arrival", async ()=>{
  const previousPerformance = globalThis.performance;
  const previousDocument = globalThis.document;
  let clock = 0;
  globalThis.performance = {now:()=>clock};
  globalThis.document = {hidden:false};
  try{
    const snapshots = [];
    const socket = {id:"transfer-client", emit:(event, payload)=>snapshots.push({event, payload})};
    socket.volatile = {emit:()=>assert.fail("transfer snapshots must be reliable")};
    const multiplayer = {connected:true, socket, auth:{account:{id:"transfer-account"}, profileReady:true}};
    const commands = createCombatCommands({multiplayer});
    const sourceMap = MAPS.find(entry=>entry.id === 0);
    const portal = sourceMap.portals[0];
    const state = {
      player:{...baseState(0, portal), speed:300}, currentMap:sourceMap,
      store:{state:{activeShip:"orion", player:{level:1}}}, camera:{x:0, y:0},
      mouseMoveHeld:true, moveTarget:{x:portal.x + 1000, y:portal.y}, bullets:[],
      portalTransition:createMapPortalTransition(portal), teleportLock:0
    };
    commands.sendPlayerSnapshot({...state.player, moveTarget:state.moveTarget}, {active:true});
    const frame = createCombatFrameUpdateSystem({
      multiplayer, getState:()=>state, setState:patch=>Object.assign(state, patch),
      advancePortalTransition:advanceMapPortalTransition,
      loadMap:(id, x, y)=>{
        state.currentMap = MAPS.find(entry=>entry.id === id);
        Object.assign(state.player, {x, y, vx:0, vy:0});
        state.portalTransition = null;
      },
      sendPlayerSnapshot:commands.sendPlayerSnapshot,
      getCurrentRank:()=>({name:"Recruit"}), getActiveShip:()=>({id:"orion", stats:{vitesse:300}}),
      getRankAssetPath:()=>"", getActiveLaserSlot:()=>null, validSelectedEnemy:()=>null,
      updateParticles(){}, updateCamera(){}, updateHud(){}, getCanvas:()=>({}), beams:{clear(){}}
    });
    for(let step = 1; step <= 40; step++){
      clock = step * 100;
      frame.update(.1);
      await Promise.resolve();
    }
    const sent = snapshots.filter(event=>event.event === "player:state").map(event=>event.payload);
    const stop = sent[1];
    assert.equal(stop.portalTransfer, true);
    assert.equal(stop.moveTarget, null);
    assert.equal(state.mouseMoveHeld, false);
    const arrival = sent.at(-1);
    assert.equal(String(arrival.mapId), String(portal.targetMap));
    assert.equal(arrival.x, portal.targetX);
    assert.equal(arrival.y, portal.targetY);
    assert.ok(sent.length >= 5);
    assert.ok(sent.length <= 7, "the transfer should keep a low-rate heartbeat");
  }finally{
    globalThis.performance = previousPerformance;
    if(previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("an immediate transfer supersedes a queued snapshot and bypasses the send interval", async ()=>{
  const previousPerformance = globalThis.performance;
  globalThis.performance = {now:()=>100};
  try{
    const sent = [];
    const socket = {id:"urgent-transfer", emit:(event, payload)=>sent.push(payload)};
    socket.volatile = {emit:()=>assert.fail("the transfer must be reliable")};
    const multiplayer = {connected:true, socket, auth:{account:{id:"pilot"}, profileReady:true}};
    const commands = createCombatCommands({multiplayer});
    const departure = baseState(0, {x:4300, y:-3300});
    const arrival = baseState(1, {x:-4300, y:3300});
    commands.sendPlayerSnapshot(departure);
    commands.sendPlayerSnapshot(departure, {coalesce:true});
    assert.equal(commands.sendPlayerSnapshot(arrival, {force:true, coalesce:true}), true);
    await Promise.resolve();
    assert.equal(sent.length, 2);
    assert.equal(sent.at(-1).mapId, "1");
    assert.ok(sent[1].sourceAt > sent[0].sourceAt, "even immediate snapshots need increasing source timestamps");
    assert.equal(multiplayer.lastPlayerMapChange.sourceSeq, sent[1].sourceSeq);
    multiplayer.connected = false;
    commands.sendPlayerSnapshot(arrival);
    assert.equal(multiplayer.lastPlayerMapChange, null);
  }finally{
    globalThis.performance = previousPerformance;
  }
});

test("a hidden-tab transfer stop clears the server's old movement target", ()=>{
  const map = MAPS.find(entry=>entry.id === 0);
  const portal = map.portals[0];
  const fixture = serverFixture(map, portal);
  fixture.player.state.moveTarget = {x:portal.x + 1000, y:portal.y};
  fixture.send({...fixture.player.state, vx:0, vy:0, moveTarget:null,
    sourceSeq:1, sourceAt:100, pageHidden:true, portalTransfer:true});
  assert.equal(fixture.player.state.moveTarget, null);
});

test("a delayed source-map correction cannot undo a transfer but a current rejection still applies", ()=>{
  const previousWindow = globalThis.window;
  const previousPerformance = globalThis.performance;
  const handlers = new Map();
  let clock = 0;
  globalThis.performance = {now:()=>clock};
  globalThis.window = new EventTarget();
  try{
    const socket = {id:"map-race", emit(){}, on:(event, fn)=>handlers.set(event, fn)};
    const multiplayer = {connected:true, socket, auth:{account:{id:"pilot"}, profileReady:true}};
    const commands = createCombatCommands({multiplayer});
    commands.sendPlayerSnapshot(baseState(0, {x:4300, y:-3300}), {active:true});
    clock = 100;
    commands.sendPlayerSnapshot(baseState(1, {x:-4300, y:3300}), {force:true});
    const state = {currentMap:{id:1}, player:{...baseState(1, {x:-4300, y:3300})}};
    const controller = createCombatSessionController({
      store:{state:{activeShip:"orion"}}, getRunning:()=>true, getState:()=>state,
      loadMap:(id, x, y)=>{ state.currentMap = {id}; Object.assign(state.player, {x, y}); }, updateHud(){}
    });
    window.addEventListener("voidsector:player-resume", event=>controller.resumeWorldSession(event.detail.session));
    installPlayerSocketListeners({socket, multiplayer, emitChange(){}, toast(){}});
    handlers.get("player:state-correction")({...baseState(0, {x:4300, y:-3300}), source:"state-correction", sourceSeq:1});
    assert.equal(state.currentMap.id, 1, "a correction produced before the transfer must be ignored");
    handlers.get("player:state-correction")({...baseState(0, {x:4300, y:-3300}), source:"state-correction", sourceSeq:2});
    assert.equal(state.currentMap.id, 0, "the server must still be able to reject the current request");
    state.currentMap = {id:1};
    handlers.get("player:state-correction")({...baseState(0, {x:4300, y:-3300}), source:"state-correction"});
    assert.equal(state.currentMap.id, 0, "a correction without sequence evidence remains authoritative");
    state.currentMap = {id:1};
    handlers.get("player:state-correction")({...baseState(0, {x:4300, y:-3300}), source:"state-correction", sourceSeq:1, hp:0, isDead:true});
    assert.equal(state.currentMap.id, 0, "a server death must never be hidden by the stale-position filter");
    state.currentMap = {id:1};
    multiplayer.lastPlayerMapChange.socketId = "previous-connection";
    handlers.get("player:state-correction")({...baseState(0, {x:4300, y:-3300}), source:"state-correction", sourceSeq:1});
    assert.equal(state.currentMap.id, 0, "a previous socket's sequence cannot hide the new server state");
  }finally{
    globalThis.performance = previousPerformance;
    if(previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
