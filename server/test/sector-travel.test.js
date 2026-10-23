import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData/maps.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getTrustedMovementSpeed, validatePlayerState } from "../src/players/playerStateValidation.js";
import { createSectorTravelRoutes } from "../src/travel/sectorTravelRoutes.js";
import { createSectorTravelManager, SECTOR_TRAVEL_ARRIVAL_GUARD_MS } from "../src/travel/sectorTravel.js";
import { registerTravelHandlers } from "../src/socket/travelHandlers.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";

function fixture({premium = true} = {}){
  let clock = 1000;
  let id = 0;
  const events = [];
  const saves = [];
  const transfers = [];
  const profile = createDefaultProfile();
  profile.player.premiumUntil = premium ? 1_000_000 : 0;
  profile.player.premiumActive = false;
  const player = {
    id:"pilot", accountId:"account-pilot", connected:true, clientMode:"game",
    mapId:"0", mapRoom:"map:0", state:{
      mapId:"0", x:0, y:0, vx:0, vy:0, hp:5000, maxHp:5000,
      shield:0, maxShield:0, shipId:"orion", updatedAt:clock, moveTarget:null
    }
  };
  const maps = [
    {id:0, portals:[{targetMap:1, x:100, y:0, targetX:-100, targetY:0, activationRadius:5}]},
    {id:1, portals:[{targetMap:2, x:100, y:0, targetX:-100, targetY:0, activationRadius:5}]},
    {id:2, portals:[]}
  ];
  const routes = createSectorTravelRoutes({maps, worldMaps:{"0":{}, "1":{}, "2":{}}});
  const socket = {id:player.id};
  const players = new Map([[player.id, player]]);
  const io = {
    sockets:{sockets:new Map([[player.id, socket]])},
    to:room=>({emit:(event, payload)=>events.push({room, event, payload:structuredClone(payload)})})
  };
  const profileManager = {
    getProfileSnapshotForPlayer:()=>profile,
    saveWorldSession:entry=>saves.push(structuredClone(entry.state))
  };
  const manager = createSectorTravelManager({
    players, profileManager, routes, io, now:()=>clock, makeId:()=>`journey-${++id}`,
    setPlayerMap:(_socket, mapId)=>{transfers.push(mapId); player.mapRoom = `map:${mapId}`;},
    publicPlayer:entry=>({id:entry.id, state:entry.state})
  });
  function tick(milliseconds = 50){
    clock += milliseconds;
    manager.update(milliseconds / 1000, clock);
  }
  function until(predicate, maxTicks = 100){
    for(let i = 0; i < maxTicks && !predicate(); i += 1) tick();
    assert.ok(predicate(), "expected state reached before timeout");
  }
  return {manager, player, profile, maps, players, io, events, saves, transfers, profileManager,
    tick, until, now:()=>clock, last:()=>events.filter(entry=>entry.event === "travel:state").at(-1)?.payload};
}

test("automatic travel requires the canonical subscription and ignores client entitlement claims", ()=>{
  const f = fixture({premium:false});
  const result = f.manager.start(f.player, {targetMapId:2, requestId:"request-a", premiumActive:true});
  assert.equal(result.ok, false);
  assert.equal(result.code, "premium-required");
  assert.equal(f.manager.isActive(f.player), false);
  assert.deepEqual(f.transfers, []);
});

test("the route graph contains only real open sector portals, including CORE", ()=>{
  const routes = createSectorTravelRoutes();
  assert.deepEqual(routes.find("0", "2"), ["0", "1", "2"]);
  assert.equal(routes.find("portal-blue", "0"), null);
  assert.equal(routes.find("0", "not-created"), null);
  const core = MAPS.find(map=>map.name === "CORE");
  const route = routes.find("0", core.id);
  assert.ok(route.length > 2);
  for(let index = 0; index < route.length - 1; index += 1){
    const leg = routes.leg(route[index], route[index + 1]);
    const source = MAPS.find(map=>String(map.id) === route[index]);
    assert.ok(source.portals.some(portal=>String(portal.targetMap) === leg.toMapId
      && portal.x === leg.x && portal.y === leg.y
      && portal.targetX === leg.targetX && portal.targetY === leg.targetY));
  }
});

test("closed, special and nonexistent destinations never form a travel leg", ()=>{
  const portals = [
    {targetMap:1, x:1, y:1, targetX:1, targetY:1, closed:true},
    {targetMap:1, x:2, y:2, targetX:2, targetY:2, dungeonPortal:true},
    {targetMap:2, x:3, y:3, targetX:3, targetY:3},
    {targetMap:1, x:4, y:4, targetX:4, targetY:4, locked:true}
  ];
  const routes = createSectorTravelRoutes({maps:[{id:0, portals}, {id:1}, {id:2}], worldMaps:{"0":{}, "1":{}}});
  assert.equal(routes.find(0, 1), null);
  assert.equal(routes.find(0, 2), null);
});

test("the server pilots at the trusted ship speed, even without client snapshots", ()=>{
  const f = fixture();
  f.player.state.speed = 99999;
  f.manager.start(f.player, {targetMapId:2, requestId:"request-speed"});
  f.tick();
  assert.equal(f.player.state.x, getTrustedMovementSpeed(f.profile) * .05);
  assert.equal(f.player.state.vx, getTrustedMovementSpeed(f.profile));
  assert.equal(f.player.state.y, 0);
  assert.equal(f.player.state.mapId, "0");
  assert.equal(f.last().requestId, "request-speed");
  assert.deepEqual(f.last().route, ["0", "1", "2"]);
});

test("automatic movement keeps the existing slow effect", ()=>{
  const f = fixture();
  f.player.statusEffects = {slow:{amount:100, expiresAt:2000}};
  f.manager.start(f.player, {targetMapId:1});
  f.tick();
  assert.equal(f.player.state.x, (getTrustedMovementSpeed(f.profile) - 100) * .05);
});

test("each real portal waits four seconds before the authoritative transfer and arrival", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2});
  f.until(()=>f.last().status === "transferring");
  const transferAt = f.last().transition.completeAt;
  while(f.now() < transferAt - 50) f.tick();
  assert.equal(f.player.state.mapId, "0");
  assert.deepEqual(f.transfers, []);
  f.tick();
  assert.equal(f.player.state.mapId, "1");
  assert.equal(f.player.state.x, -100);
  assert.equal(f.last().index, 1);
  assert.deepEqual(f.transfers, ["1"]);
  f.until(()=>f.last().status === "arrived", 120);
  assert.deepEqual(f.transfers, ["1", "2"]);
  assert.equal(f.player.state.mapId, "2");
  assert.equal(f.player.state.moveTarget, null);
  assert.equal(f.player.state.vx, 0);
  assert.equal(f.manager.isActive(f.player), false);
  assert.ok(f.saves.some(state=>state.mapId === "1"));
  assert.ok(f.saves.some(state=>state.mapId === "2"));
});

test("manual cancellation during a transfer prevents any later map change", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2, requestId:"cancel-me"});
  f.until(()=>f.last().status === "transferring");
  assert.equal(f.manager.cancel(f.player, {requestId:"cancel-me"}), true);
  assert.equal(f.last().status, "cancelled");
  f.tick(5000);
  assert.equal(f.player.state.mapId, "0");
  assert.deepEqual(f.transfers, []);
  const manual = {x:77, y:25, moveTarget:{x:300, y:200}};
  assert.equal(f.manager.preparePlayerState(f.player, manual), manual);
});

test("a stale cancellation cannot interrupt a more recent destination", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:1, requestId:"old"});
  const oldId = f.last().id;
  f.manager.start(f.player, {targetMapId:2, requestId:"new"});
  assert.equal(f.manager.cancel(f.player, {journeyId:oldId}), false);
  assert.equal(f.manager.cancel(f.player, {requestId:"old"}), false);
  assert.equal(f.manager.isActive(f.player), true);
  assert.equal(f.last().requestId, "new");
});

test("arrival guard blocks in-flight source snapshots without blocking manual movement on the new map", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:1});
  f.until(()=>f.last().status === "arrived");
  const old = {mapId:"0", x:100, y:0, moveTarget:{x:100, y:0}, sourceSeq:1};
  const protectedPayload = f.manager.preparePlayerState(f.player, old, f.now());
  assert.equal(protectedPayload.mapId, "1");
  assert.equal(protectedPayload.x, -100);
  assert.ok(f.events.some(entry=>entry.event === "player:state-correction" && entry.payload.mapId === "1"));
  const manual = {mapId:"1", x:-95, y:0, moveTarget:{x:100, y:200}, sourceSeq:2};
  assert.equal(f.manager.preparePlayerState(f.player, manual), manual);
  // A merely presented packet does not release the guard before its normal
  // source sequence/timestamp validator actually accepts it.
  f.manager.confirmPlayerState(f.player, manual);
  assert.equal(f.manager.preparePlayerState(f.player, old).mapId, "1");
  f.player.lastClientStateSourceSeq = 2;
  f.manager.confirmPlayerState(f.player, manual);
  assert.equal(f.manager.preparePlayerState(f.player, old), old);
});

test("arrival guard survives cancellation after a commit and has a bounded lifetime", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2});
  f.until(()=>f.last().index === 1);
  f.manager.cancel(f.player);
  const old = {mapId:"0", x:100, y:0};
  assert.equal(f.manager.preparePlayerState(f.player, old).mapId, "1");
  assert.equal(f.manager.preparePlayerState(f.player, old, f.now() + SECTOR_TRAVEL_ARRIVAL_GUARD_MS + 1), old);
});

test("active snapshots cannot override canonical position, movement, or the sector", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2});
  const merged = f.manager.preparePlayerState(f.player, {
    x:4300, y:3300, mapId:"2", vx:100000, moveTarget:{x:999, y:999}, sourceSeq:17,
    hp:100000, attackTargetId:"enemy"
  });
  assert.equal(merged.x, 0);
  assert.equal(merged.y, 0);
  assert.equal(merged.mapId, "0");
  assert.equal(merged.vx, 0);
  assert.deepEqual(merged.moveTarget, {x:100, y:0});
  assert.equal(merged.sourceSeq, 17);
  assert.equal(merged.attackTargetId, "enemy");
  const validated = validatePlayerState({player:f.player, profile:f.profile, payload:merged, groups:new Map(), now:1050});
  assert.equal(validated.state.mapId, "0");
  assert.equal(validated.state.x, 0);
  assert.ok(validated.state.hp < 100000);
});

for(const [label, mutate, reason] of [
  ["Premium expiry", f=>{f.profile.player.premiumUntil = f.now() + 1;}, "premium-required"],
  ["death", f=>{f.player.state.hp = 0;}, "dead"],
  ["disconnect", f=>{f.player.connected = false;}, "disconnected"],
  ["replaced socket", f=>{f.players.set(f.player.id, {...f.player});}, "disconnected"],
  ["changed ship", f=>{f.player.state.shipId = "astralis";}, "session-changed"],
  ["unexpected sector", f=>{f.player.state.mapId = "2";}, "map-changed"],
  ["Portgun activation", f=>{f.player.pendingPortgunTeleport = {id:"portgun"};}, "busy"]
]){
  test(`${label} interrupts travel before the next movement or portal transfer`, ()=>{
    const f = fixture();
    f.manager.start(f.player, {targetMapId:2});
    mutate(f);
    const position = f.player.state.x;
    f.tick();
    assert.equal(f.manager.isActive(f.player), false);
    assert.equal(f.last().status, "cancelled");
    assert.equal(f.last().reason, reason);
    assert.equal(f.player.state.x, position);
    assert.deepEqual(f.transfers, []);
  });
}

test("background movement does not advance an automatically piloted ship a second time", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2});
  f.player.clientPageHidden = true;
  f.player.lastClientStateAt = 1;
  f.tick();
  const position = f.player.state.x;
  const activity = createPlayerActivityManager({
    io:f.io, players:f.players, profileManager:f.profileManager,
    isAutomaticTravelActive:f.manager.isActive
  });
  activity.updatePlayerActivity(.05, 5000);
  assert.equal(f.player.state.x, position);
});

test("a socket takeover cannot inherit a journey or persist over the newer session", ()=>{
  const f = fixture();
  f.manager.start(f.player, {targetMapId:2});
  const replacement = {...f.player, state:{...f.player.state, moveTarget:{x:300, y:0}},
    clientPageHidden:true, lastClientStateAt:1};
  f.players.set(f.player.id, replacement);
  f.tick();
  assert.equal(f.manager.isActive(replacement), false);
  assert.equal(f.saves.length, 0);
  const activity = createPlayerActivityManager({
    io:f.io, players:f.players, profileManager:f.profileManager,
    isAutomaticTravelActive:f.manager.isActive
  });
  activity.updatePlayerActivity(.05, 5000);
  assert.ok(replacement.state.x > 0);
  assert.deepEqual(replacement.state.moveTarget, {x:300, y:0});
});

test("socket handlers retain the gameplay guard and cancel on disconnect", ()=>{
  const callbacks = new Map();
  const events = [];
  const calls = [];
  let allowed = false;
  const player = {id:"pilot"};
  const socket = {id:player.id, on:(name, callback)=>callbacks.set(name, callback), emit:(name, payload)=>events.push({name, payload})};
  registerTravelHandlers(socket, {
    players:new Map([[player.id, player]]), guard:()=>allowed, now:()=>1000,
    travelManager:{
      start:(entry, payload)=>{calls.push({entry, payload}); return {ok:false, code:"premium-required"};},
      cancel:(entry, options)=>calls.push({entry, options})
    }
  });
  callbacks.get("travel:start")({targetMapId:2});
  assert.equal(calls.length, 0);
  allowed = true;
  callbacks.get("travel:start")({targetMapId:2});
  assert.equal(events[0].name, "travel:error");
  assert.equal(events[0].payload.code, "premium-required");
  callbacks.get("travel:cancel")({requestId:"manual"});
  assert.equal(calls.at(-1).options.requestId, "manual");
  callbacks.get("disconnect")();
  assert.equal(calls.at(-1).options.reason, "disconnected");
});
