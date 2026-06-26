import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountActionLimitWarning, buildAuthRequiredWarning, buildSocketRateLimitWarning } from "../src/monitoring/runtimeWarnings.js";

test("runtime warning builders include socket and player context without secrets", ()=>{
  const socket = {id:"socket-1"};
  const players = new Map([["socket-1", {
    id:"socket-1",
    accountId:"account-1",
    mapId:"2",
    state:{mapId:"3"}
  }]]);

  assert.deepEqual(buildSocketRateLimitWarning({
    socket,
    eventName:"profile:save",
    count:7,
    limit:6,
    windowMs:10000,
    players,
    now:()=>111
  }), {
    source:"socket-rate-limit",
    severity:"warning",
    eventName:"profile:save",
    socketId:"socket-1",
    accountId:"account-1",
    playerId:"socket-1",
    mapId:"3",
    error:"Socket event rate limit exceeded: profile:save.",
    context:{
      count:7,
      limit:6,
      windowMs:10000
    },
    at:111
  });

  assert.deepEqual(buildAccountActionLimitWarning({
    socket,
    eventName:"shop:buy-item",
    accountKey:"account:account-1",
    count:2,
    limit:16,
    windowMs:10000,
    retryAfterMs:250,
    players,
    now:()=>222
  }), {
    source:"account-action-lock",
    severity:"warning",
    eventName:"shop:buy-item",
    socketId:"socket-1",
    accountId:"account-1",
    playerId:"socket-1",
    mapId:"3",
    error:"Account action limited: shop:buy-item.",
    context:{
      accountKey:"account:account-1",
      count:2,
      limit:16,
      windowMs:10000,
      retryAfterMs:250
    },
    at:222
  });

  assert.deepEqual(buildAuthRequiredWarning({
    socket,
    eventName:"combat:fire",
    players,
    now:()=>333
  }), {
    source:"auth-required",
    severity:"warning",
    eventName:"combat:fire",
    socketId:"socket-1",
    accountId:"account-1",
    playerId:"socket-1",
    mapId:"3",
    error:"Unauthenticated gameplay event rejected: combat:fire.",
    context:{},
    at:333
  });
});
