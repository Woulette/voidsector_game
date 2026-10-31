import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileManager } from "../src/players/profiles.js";
import { createGameplayAccountGuard } from "../src/security/gameplayAccountGuard.js";
import { createAccountActionLocks } from "../src/security/accountActionLocks.js";
import { createSocketRateLimiter } from "../src/socket/rateLimit.js";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";

async function fixture(t,{authenticated = true} = {}){
  let currentTime = Date.now();
  t.mock.method(Date,"now",()=>currentTime);
  const initial = createDefaultProfile();
  initial.player = {...initial.player,name:"Pilot",firmSelected:true};
  const originalPreferences = structuredClone({actionSlots:initial.actionSlots,actionSlotsByShip:initial.actionSlotsByShip,
    actionSlotsUpdatedAt:initial.actionSlotsUpdatedAt,lastLaserAmmoId:initial.lastLaserAmmoId});
  let saves = 0;
  let reads = 0;
  const manager = createProfileManager({
    cleanName:value=>String(value || "Pilot"),
    loadProfileEntries:async()=>[["account:pilot",initial]],
    persistProfileEntries:async()=>{ saves++; }
  });
  await manager.load();
  const emitted = [];
  const players = new Map();
  const socketRateRejections = [];
  const accountRejections = [];
  const limiter = createSocketRateLimiter({limits:config.socketRateLimits,now:()=>currentTime,onReject:event=>socketRateRejections.push(event)});
  const accountGuard = createGameplayAccountGuard({players,now:()=>currentTime});
  const accountLocks = createAccountActionLocks({rules:config.accountActionLocks,players,now:()=>currentTime,onReject:event=>accountRejections.push(event)});
  const sockets = [];
  for(const id of ["launcher","same-account","other-account"]){
    const handlers = new Map();
    const socket = {id,on:(event,handler)=>handlers.set(event,handler),emit:(event,payload)=>emitted.push({socketId:id,event,payload}),handlers};
    const player = {id,accountId:authenticated ? (id === "other-account" ? "someone-else" : "pilot") : null,
      clientMode:"launcher",connected:true,name:"Pilot"};
    players.set(id,player);
    sockets.push(socket);
    registerPlayerHandlers(socket,{
      players,
      guard:event=>limiter(socket,event) && accountGuard(socket,event) && accountLocks(socket,event),
      profileManager:{getProfileForPlayer(current){ reads++; return manager.getProfileForPlayer(current); }},
      emitProfileSync(current,profile){
        for(const recipient of sockets){
          if(players.get(recipient.id)?.accountId === current.accountId) recipient.emit("profile:sync",profile);
        }
      }
    });
  }
  return {manager,players,sockets,emitted,originalPreferences,accountRejections,socketRateRejections,
    advance(ms){ currentTime += ms; },get saves(){ return saves; },get reads(){ return reads; }};
}

test("profile refresh requires an authenticated account before reading or emitting a profile", async t=>{
  const current = await fixture(t,{authenticated:false});
  current.sockets[0].handlers.get("profile:refresh")();
  assert.equal(current.reads,0);
  assert.equal(current.saves,0);
  assert.equal(current.emitted.some(event=>event.event === "profile:sync"),false);
  assert.equal(current.emitted[0].event,"auth:required");
});

test("idle refinery production refreshes from server time and ignores supplied client preferences or resources", async t=>{
  const current = await fixture(t);
  const refresh = current.sockets[0].handlers.get("profile:refresh");
  refresh();
  assert.equal(current.saves,0);
  current.advance(120_000);
  refresh({profile:{cargoHold:{titane_fissure:999999},actionSlots:["forged"]}});
  await current.manager.flushPersistence();
  const updates = current.emitted.filter(event=>event.event === "profile:sync");
  const profile = updates.at(-1).payload;
  assert.equal(profile.cargoHold.titane_fissure,50);
  assert.equal(profile.cargoHold.silice_conductrice,50);
  assert.deepEqual({actionSlots:profile.actionSlots,actionSlotsByShip:profile.actionSlotsByShip,
    actionSlotsUpdatedAt:profile.actionSlotsUpdatedAt,lastLaserAmmoId:profile.lastLaserAmmoId},current.originalPreferences);
  assert.equal(current.saves,1);
  assert.deepEqual([...new Set(updates.map(event=>event.socketId))].sort(),["launcher","same-account"]);
});

test("profile refresh is limited across sockets of the account and also has a socket burst limit", async t=>{
  const current = await fixture(t);
  const refresh = current.sockets[0].handlers.get("profile:refresh");
  refresh();
  current.sockets[1].handlers.get("profile:refresh")();
  assert.equal(current.reads,1);
  assert.equal(current.accountRejections.length,1);
  current.advance(1999);
  refresh();
  assert.equal(current.reads,1);
  current.advance(1);
  refresh();
  assert.equal(current.reads,2);
  for(let index=0;index<6;index++) refresh();
  assert.equal(current.reads,2);
  assert.ok(current.socketRateRejections.length > 0);
});
