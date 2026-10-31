import assert from "node:assert/strict";
import test from "node:test";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";

function install(result){
  const handlers = new Map(), events = [], requests = [];
  const socket = {id:"drone-socket",on:(e,h)=>handlers.set(e,h),emit:(e,p)=>events.push({event:e,payload:p})};
  registerEconomyHandlers(socket,{guard:()=>true,players:new Map([[socket.id,{id:socket.id,accountId:"one"}]]),
    profileManager:{addDronePurchase:request=>{requests.push(request);return result;}},
    emitProfileSync:(_player,profile)=>socket.emit("profile:sync",profile)});
  return {events,requests,buy:payload=>handlers.get("shop:buy-drone")(payload)};
}

test("drone acknowledgement waits for saving and reports only the canonical purchase",async()=>{
  let resolve;
  const save = new Promise(done=>{resolve=done;});
  const profile = {ownedDroneCount:6};
  const socket = install({ok:true,profile,save,purchase:{id:"combat_drone",name:"Drone",ownedCount:5,nextCount:6,priceType:"credits",totalPrice:6_400_000}});
  const pending = socket.buy({id:"combat_drone",ownedCount:5,expectedPrice:6_400_000,nextCount:10,totalPrice:0});
  assert.equal(socket.events.length,0);
  assert.deepEqual(socket.requests[0],{player:{id:"drone-socket",accountId:"one"},id:"combat_drone",expectedPrice:6_400_000,expectedCount:5});
  resolve(); await pending;
  assert.deepEqual(socket.events.map(e=>e.event),["shop:drone-bought","profile:sync"]);
  assert.equal(socket.events[0].payload.nextCount,6); assert.equal(socket.events[0].payload.price,6_400_000);
});

test("failed drone storage sends no success or purchased profile",async()=>{
  const socket = install({ok:true,save:Promise.reject(new Error("unavailable"))});
  await socket.buy({id:"combat_drone"});
  assert.deepEqual(socket.events.map(e=>e.event),["shop:error"]);
});

test("stale drone quotes refresh the displayed profile before showing the error",async()=>{
  const profile = {ownedDroneCount:8};
  const socket = install({ok:false,profile,reason:"Limite atteinte."});
  await socket.buy({});
  assert.deepEqual(socket.events.map(e=>e.event),["profile:sync","shop:error"]);
  assert.equal(socket.events[0].payload,profile);
});

test("the client sends an ID and displayed-price assertion without a possession or grant count",()=>{
  const events = [];
  const multiplayer = {connected:true,auth:{account:{id:"one"},profileReady:true},socket:{emit:(e,p)=>events.push({event:e,payload:p})}};
  const commands = createSocketCommands({multiplayer});
  assert.equal(commands.buyServerDrone({id:"combat_drone",expectedPrice:25_600_000,ownedCount:7,nextCount:10}),true);
  assert.deepEqual(events,[{event:"shop:buy-drone",payload:{id:"combat_drone",expectedPrice:25_600_000}}]);
});
