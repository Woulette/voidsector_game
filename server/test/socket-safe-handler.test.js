import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { installSafeSocketHandlers } from "../src/socket/safeSocketHandler.js";

class FakeSocket extends EventEmitter {
  constructor(){
    super();
    this.id = "socket-1";
    this.clientEvents = [];
  }

  emit(eventName, payload){
    this.clientEvents.push({eventName, payload});
    return super.emit(eventName, payload);
  }
}

test("safe socket handler logs server details and hides them from the client", async ()=>{
  const socket = new FakeSocket();
  const errors = [];
  const runtimeErrors = [];
  installSafeSocketHandlers(socket, {
    logger:{
      error:(message, meta)=>errors.push({message, meta})
    },
    getPlayer:()=>({
      id:"player-1",
      accountId:"account-1",
      state:{mapId:"2"}
    }),
    now:()=>123,
    onError:error=>runtimeErrors.push(error)
  });

  socket.on("combat:fire", ()=>{
    throw new Error("internal boom");
  });

  socket.emit("combat:fire", {bad:true});
  await Promise.resolve();

  assert.equal(errors.length, 1);
  assert.equal(runtimeErrors.length, 1);
  assert.equal(runtimeErrors[0].source, "socket");
  assert.equal(runtimeErrors[0].eventName, "combat:fire");
  assert.equal(errors[0].message, "[socket] handler failed");
  assert.equal(errors[0].meta.eventName, "combat:fire");
  assert.equal(errors[0].meta.socketId, "socket-1");
  assert.equal(errors[0].meta.accountId, "account-1");
  assert.equal(errors[0].meta.playerId, "player-1");
  assert.equal(errors[0].meta.mapId, "2");
  assert.match(errors[0].meta.error, /internal boom/);

  const serverError = socket.clientEvents.find(event=>event.eventName === "server:error");
  assert.deepEqual(serverError.payload, {
    eventName:"combat:fire",
    message:"Erreur serveur sur cette action.",
    at:123
  });
  assert.equal(JSON.stringify(serverError.payload).includes("internal boom"), false);
});

test("disconnect handlers are logged without sending a client error", async ()=>{
  const socket = new FakeSocket();
  const errors = [];
  installSafeSocketHandlers(socket, {
    logger:{
      error:(message, meta)=>errors.push({message, meta})
    },
    now:()=>456
  });

  socket.on("disconnect", ()=>{
    throw new Error("disconnect boom");
  });

  assert.doesNotThrow(()=>socket.emit("disconnect"));
  await Promise.resolve();

  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "[socket] handler failed");
  assert.equal(errors[0].meta.eventName, "disconnect");
  assert.match(errors[0].meta.error, /disconnect boom/);
  assert.equal(socket.clientEvents.some(event=>event.eventName === "server:error"), false);
});
