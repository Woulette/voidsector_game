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
