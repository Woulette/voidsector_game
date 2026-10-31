import assert from "node:assert/strict";
import test from "node:test";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";
import { createServerEventController } from "../../src/app/serverEventController.js";

function install(result){
  const handlers = new Map(), events = [], requests = [];
  const socket = {id:"craft-socket", on:(e,h)=>handlers.set(e,h), emit:(e,p)=>events.push({event:e,payload:p})};
  registerEconomyHandlers(socket, {guard:()=>true, players:new Map([[socket.id,{id:socket.id,accountId:"one"}]]),
    profileManager:{applyEconomyAction:request=>{requests.push(request);return result;}},
    emitProfileSync:(_player,profile)=>socket.emit("profile:sync", profile)});
  return {events, requests, claim:payload=>handlers.get("craft:claim")(payload)};
}

test("refund acknowledgement waits for storage and only uses server refund amounts", async()=>{
  let resolve;
  const save = new Promise(done=>{resolve=done;});
  const profile = {craftingJob:null,player:{premium:3800}};
  const refund = {premium:3800,credits:0,materials:{plaques_acier:2}};
  const socket = install({ok:true,action:"job-refund",recipe:{name:"Cuirasse"},output:null,refund,profile,save});
  const pending = socket.claim({refund:{credits:9999999},jobId:"forged"});
  assert.equal(socket.events.length,0);
  assert.deepEqual(socket.requests[0].action,{kind:"craft-claim"});
  resolve(); await pending;
  assert.deepEqual(socket.events.map(e=>e.event),["craft:updated","profile:sync"]);
  assert.equal(socket.events[0].payload.action,"job-refund");
  assert.deepEqual(socket.events[0].payload.refund,refund);
  assert.deepEqual(socket.events[1].payload,profile);
});

test("failed refund storage sends no successful refund event or profile", async()=>{
  const save = Promise.reject(new Error("database unavailable"));
  const socket = install({ok:true,action:"job-refund",profile:{craftingJob:null},save});
  await socket.claim();
  assert.deepEqual(socket.events.map(e=>e.event),["craft:error"]);
  assert.match(socket.events[0].payload.message,/sauvegarde/i);
});

test("client refund message does not award currency or advertise delivery of a duplicate", ()=>{
  const messages = [], profile={player:{credits:1234,premium:77}};
  const oldWindow = globalThis.window, oldCustomEvent = globalThis.CustomEvent;
  globalThis.window={dispatchEvent(){}};
  globalThis.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail;}};
  try{
    const multiplayer={craftEvents:[{action:"job-refund",recipe:{name:"Valkyrie"},refund:{credits:1000000}}]};
    const controller=createServerEventController({multiplayer,store:{state:profile},showToast:text=>messages.push(text),renderAll(){}});
    controller.handleChange({detail:{reason:"craft:updated"}});
    assert.equal(profile.player.credits,1234); assert.equal(profile.player.premium,77);
    assert.equal(multiplayer.craftEvents.length,0);
    assert.equal(messages.length,1); assert.match(messages[0],/remboursée.*Valkyrie/);
    assert.doesNotMatch(messages[0],/recuperee/);
  }finally{globalThis.window=oldWindow;globalThis.CustomEvent=oldCustomEvent;}
});
