import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config.js";
import { createAccountActionLocks } from "../src/security/accountActionLocks.js";
import { createSocketRateLimiter } from "../src/socket/rateLimit.js";
import { createLootCollectionManager } from "../src/world/lootCollection.js";
import { LOOT_COLLECTION_DURATION_MS, getLootCollectionHoverPoint } from "../../src/shared/lootCollection.js";

function fixture(){
  let clock = Date.now();
  const initial = clock, rejected = [], events = [], drops = new Map(), rewards = [];
  const player = {id:"pilot-a",accountId:"account-pilot",mapId:"0",connected:true,clientMode:"game",
    state:{mapId:"0",hp:100,x:100,y:152}};
  const players = new Map([[player.id,player]]);
  const socket = {id:player.id,emit:(event,payload)=>events.push({event,payload})};
  const socketLimiter = createSocketRateLimiter({limits:config.socketRateLimits,now:()=>clock,
    onReject:entry=>rejected.push({scope:"socket",...entry})});
  const accountLocks = createAccountActionLocks({rules:config.accountActionLocks,players,now:()=>clock,
    onReject:entry=>rejected.push({scope:"account",...entry})});
  const collection = createLootCollectionManager({players,getDrop:id=>drops.get(id),now:()=>clock,
    complete:(s,p,drop)=>{drops.delete(drop.id);rewards.push(drop.id);}});
  function request(phase,id,attemptId){
    if(!socketLimiter(socket,"loot:pickup") || !accountLocks(socket,"loot:pickup"))return false;
    collection.handle(socket,{id,phase,attemptId});return true;
  }
  function addDrop(id){
    const drop = {id,ownerId:player.id,kind:"material",mapId:"0",x:100,y:200,expiresAt:initial+60000};
    drops.set(id,drop);Object.assign(player.state,getLootCollectionHoverPoint(drop));return drop;
  }
  return {initial,player,players,socket,rejected,events,drops,rewards,collection,socketLimiter,accountLocks,request,addDrop,
    at:elapsed=>clock=initial+elapsed};
}

test("real socket and account budgets allow fourteen complete 700 ms collections inside ten seconds", ()=>{
  const f = fixture();
  for(let index=0;index<14;index++){
    const id = `material-${index}`, attemptId = `attempt-${index}`;
    f.addDrop(id);f.at(index*LOOT_COLLECTION_DURATION_MS);
    assert.equal(f.request("start",id,attemptId),true,`start ${index+1} is not rate limited`);
    f.collection.tick(f.at((index+1)*LOOT_COLLECTION_DURATION_MS-1));
    assert.equal(f.rewards.length,index,"no collection is awarded before its deadline and finish request");
    f.at((index+1)*LOOT_COLLECTION_DURATION_MS);
    assert.equal(f.request("finish",id,attemptId),true,`finish ${index+1} is not rate limited`);
    assert.equal(f.rewards.length,index+1);
  }
  assert.equal(14*LOOT_COLLECTION_DURATION_MS,9800);
  assert.deepEqual(f.rejected,[]);

  // A movement cancellation and immediate restart share the same timestamp.
  const next = f.addDrop("cancel-and-retry");
  assert.equal(f.request("start",next.id,"cancelled-attempt"),true);
  assert.equal(f.request("cancel",next.id,"cancelled-attempt"),true);
  assert.equal(f.request("start",next.id,"new-attempt"),true);
  assert.equal(f.events.at(-1).payload.status,"started");
  assert.equal(f.events.at(-1).payload.attemptId,"new-attempt");
  assert.equal(f.rewards.length,14);
  assert.deepEqual(f.rejected,[]);
});

test("the real socket pickup budget rejects request sixty-one and recovers after its ten-second window", ()=>{
  const f = fixture();
  for(let count=0;count<60;count++)assert.equal(f.socketLimiter(f.socket,"loot:pickup"),true);
  assert.equal(f.socketLimiter(f.socket,"loot:pickup"),false);
  assert.equal(f.rejected.at(-1).scope,"socket");
  assert.equal(f.rejected.at(-1).eventName,"loot:pickup");
  f.at(10000);assert.equal(f.socketLimiter(f.socket,"loot:pickup"),true);
});

test("the real account pickup budget limits bursts across sockets of the same account", ()=>{
  const f = fixture();
  const second = {id:"pilot-b"}, third = {id:"pilot-c"};
  f.players.set(second.id,{accountId:f.player.accountId});
  f.players.set(third.id,{accountId:f.player.accountId});
  for(let count=0;count<60;count++){
    const socket = count%2 ? second : f.socket;
    assert.equal(f.socketLimiter(socket,"loot:pickup"),true);
    assert.equal(f.accountLocks(socket,"loot:pickup"),true);
  }
  assert.equal(f.socketLimiter(third,"loot:pickup"),true,"a fresh socket cannot bypass the account budget");
  assert.equal(f.accountLocks(third,"loot:pickup"),false);
  assert.equal(f.rejected.at(-1).scope,"account");
  const other = {id:"another-account"};f.players.set(other.id,{accountId:"other-account"});
  assert.equal(f.accountLocks(other,"loot:pickup"),true);
  f.at(10000);assert.equal(f.accountLocks(third,"loot:pickup"),true);
});
