import assert from "node:assert/strict";
import test from "node:test";
import { createServerErrorLog } from "../src/monitoring/serverErrorLog.js";

test("server error log keeps a bounded newest-first list", ()=>{
  let current = 100;
  const log = createServerErrorLog({limit:2, now:()=>current});

  log.record({source:"tick", error:"first"});
  current = 200;
  log.record({source:"socket", eventName:"combat:fire", error:"second"});
  current = 300;
  log.record({source:"socket", eventName:"loot:pickup", error:"third"});

  assert.deepEqual(log.list(), [
    {
      id:log.list()[0].id,
      source:"socket",
      eventName:"loot:pickup",
      socketId:"",
      accountId:"",
      playerId:"",
      mapId:"",
      severity:"danger",
      error:"third",
      context:{},
      at:300
    },
    {
      id:log.list()[1].id,
      source:"socket",
      eventName:"combat:fire",
      socketId:"",
      accountId:"",
      playerId:"",
      mapId:"",
      severity:"danger",
      error:"second",
      context:{},
      at:200
    }
  ]);
});

test("server error log keeps warning severity and small context fields", ()=>{
  const log = createServerErrorLog({now:()=>500});

  log.record({
    source:"socket-rate-limit",
    severity:"warning",
    eventName:"profile:save",
    error:"too many saves",
    context:{
      count:7,
      limit:6,
      windowMs:10000,
      nested:{ignored:false}
    }
  });

  assert.deepEqual(log.list(), [{
    id:log.list()[0].id,
    source:"socket-rate-limit",
    eventName:"profile:save",
    socketId:"",
    accountId:"",
    playerId:"",
    mapId:"",
    severity:"warning",
    error:"too many saves",
    context:{
      count:7,
      limit:6,
      windowMs:10000,
      nested:"{\"ignored\":false}"
    },
    at:500
  }]);
});
