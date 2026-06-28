import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createGameplayAccountGuard, isPublicSocketEvent } from "../src/security/gameplayAccountGuard.js";

function makeSocket(id = "socket-1"){
  const emitted = [];
  return {
    id,
    emitted,
    emit:(event, payload)=>emitted.push({event, payload})
  };
}

test("authentication and handshake events remain public", ()=>{
  for(const eventName of [
    "auth:register",
    "auth:login",
    "auth:session",
    "auth:logout",
    "player:hello",
    "leaderboard:sync"
  ]){
    assert.equal(isPublicSocketEvent(eventName), true, eventName);
  }
});

test("gameplay events and unknown future events require an account by default", ()=>{
  const socket = makeSocket();
  const players = new Map([[socket.id, {id:socket.id, accountId:null}]]);
  const warnings = [];
  const rejections = [];
  const guard = createGameplayAccountGuard({
    players,
    logger:{warn:(message, data)=>warnings.push({message, data})},
    onReject:payload=>rejections.push(payload),
    now:()=>12345
  });

  for(const eventName of [
    "player:state",
    "combat:fire",
    "loot:pickup",
    "shop:buy-item",
    "equipment:equip",
    "quest:claim",
    "refinery:job-start",
    "portal:prepare",
    "portal:start",
    "firm:shop-buy",
    "group:create",
    "chat:send",
    "future:new-gameplay-event"
  ]){
    assert.equal(guard(socket, eventName), false, eventName);
  }

  assert.equal(socket.emitted.length, 1);
  assert.equal(socket.emitted[0].event, "auth:required");
  assert.equal(socket.emitted[0].payload.eventName, "player:state");
  assert.equal(warnings.length, 1);
  assert.equal(rejections.length, 1);
  assert.equal(rejections[0].eventName, "player:state");
  assert.equal(rejections[0].at, 12345);
});

test("an authenticated account can use protected gameplay events", ()=>{
  const socket = makeSocket();
  const players = new Map([[socket.id, {id:socket.id, accountId:"account-1"}]]);
  const guard = createGameplayAccountGuard({players});

  assert.equal(guard(socket, "combat:fire"), true);
  assert.equal(guard(socket, "future:new-gameplay-event"), true);
  assert.deepEqual(socket.emitted, []);
});

test("every incoming socket event except disconnect passes through the central guard", ()=>{
  const socketDirectory = new URL("../src/socket/", import.meta.url);
  const files = fs.readdirSync(socketDirectory).filter(file=>file.endsWith(".js"));
  const missingGuards = [];

  for(const file of files){
    const source = fs.readFileSync(new URL(file, socketDirectory), "utf8");
    const matches = [...source.matchAll(/socket\.on\("([^"]+)"/g)];
    for(let index = 0; index < matches.length; index++){
      const eventName = matches[index][1];
      if(eventName === "disconnect") continue;
      const start = matches[index].index;
      const end = matches[index + 1]?.index ?? source.length;
      const handlerSource = source.slice(start, end);
      if(!handlerSource.includes(`guard("${eventName}")`)) missingGuards.push(`${file}:${eventName}`);
    }
  }

  assert.deepEqual(missingGuards, []);
});
