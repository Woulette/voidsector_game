import assert from "node:assert/strict";
import test from "node:test";
import { createGracefulShutdown } from "../src/lifecycle/gracefulShutdown.js";

test("graceful shutdown stops the tick, saves live sessions, flushes, then closes storage", async ()=>{
  const calls = [];
  const players = new Map([
    ["player-1", {id:"player-1", state:{mapId:"0", x:1, y:2}}],
    ["launcher", {id:"launcher", state:null}]
  ]);
  const shutdown = createGracefulShutdown({
    io:{
      close(callback){
        calls.push("io-close");
        callback();
      }
    },
    tickHandle:{id:"tick"},
    players,
    profileManager:{
      saveWorldSession({player, force}){
        calls.push(`save:${player.id}:${force}`);
      },
      async flushPersistence(){
        calls.push("flush");
      }
    },
    async closeDatabase(){
      calls.push("database-close");
    },
    logger:{info(){}},
    clearIntervalFn(){
      calls.push("tick-clear");
    }
  });

  const first = shutdown("SIGTERM");
  const second = shutdown("SIGINT");
  assert.equal(first, second);
  await first;

  assert.deepEqual(calls, [
    "tick-clear",
    "io-close",
    "save:player-1:true",
    "flush",
    "database-close"
  ]);
});

test("graceful shutdown still flushes and closes storage after earlier shutdown errors", async ()=>{
  const calls = [];
  const errors = [];
  const players = new Map([
    ["broken-player", {id:"broken-player", state:{mapId:"0", x:1, y:2}}],
    ["saved-player", {id:"saved-player", state:{mapId:"0", x:3, y:4}}]
  ]);
  const shutdown = createGracefulShutdown({
    io:{
      close(){
        calls.push("io-close");
        throw new Error("socket close failed");
      }
    },
    tickHandle:{id:"tick"},
    players,
    profileManager:{
      saveWorldSession({player}){
        calls.push(`save:${player.id}`);
        if(player.id === "broken-player") throw new Error("save failed");
      },
      async flushPersistence(){
        calls.push("flush");
      }
    },
    async closeDatabase(){
      calls.push("database-close");
    },
    logger:{info(){}, error:(message, meta)=>errors.push({message, meta})},
    clearIntervalFn(){
      calls.push("tick-clear");
    }
  });

  await assert.rejects(shutdown("SIGTERM"), /Graceful shutdown failed/);

  assert.deepEqual(calls, [
    "tick-clear",
    "io-close",
    "save:broken-player",
    "save:saved-player",
    "flush",
    "database-close"
  ]);
  assert.equal(errors.filter(entry=>entry.message === "Graceful shutdown step failed.").length, 2);
  assert.equal(errors.some(entry=>entry.meta.step === "socket-close"), true);
  assert.equal(errors.some(entry=>entry.meta.step === "save-world-session:broken-player"), true);
  assert.equal(errors.some(entry=>entry.message === "Graceful shutdown completed with errors."), true);
});
