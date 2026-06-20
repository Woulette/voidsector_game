import assert from "node:assert/strict";
import test from "node:test";
import { createCombatCooldownTracker } from "../src/combat/damage.js";
import { createAccountActionLocks } from "../src/security/accountActionLocks.js";
import { createSocketRateLimiter } from "../src/socket/rateLimit.js";

test("socket rate-limit buckets are released when a socket disconnects", ()=>{
  let currentTime = 1000;
  const limiter = createSocketRateLimiter({
    limits:{default:{limit:2, windowMs:10000}},
    now:()=>currentTime
  });
  const socket = {id:"socket-1"};

  assert.equal(limiter(socket, "event:a"), true);
  assert.equal(limiter(socket, "event:b"), true);
  assert.equal(limiter.size(), 2);
  assert.equal(limiter.releaseSocket(socket), 2);
  assert.equal(limiter.size(), 0);

  limiter({id:"socket-2"}, "event:a");
  currentTime += 10001;
  limiter.prune();
  assert.equal(limiter.size(), 0);
});

test("account action locks survive reconnects and prune stale accounts", ()=>{
  let currentTime = 1000;
  const players = new Map([
    ["socket-a", {accountId:"account-1"}],
    ["socket-b", {accountId:"account-1"}]
  ]);
  const locks = createAccountActionLocks({
    rules:{
      "shop:buy":{minIntervalMs:1000, limit:10, windowMs:10000}
    },
    players,
    now:()=>currentTime,
    staleAfterMs:2000,
    pruneIntervalMs:1000
  });

  assert.equal(locks({id:"socket-a"}, "shop:buy"), true);
  assert.equal(locks({id:"socket-b"}, "shop:buy"), false);
  assert.equal(locks.size(), 1);

  currentTime += 2001;
  locks.prune();
  assert.equal(locks.size(), 0);
});

test("combat cooldown follows the account across socket reconnects", ()=>{
  let currentTime = 1000;
  const cooldowns = createCombatCooldownTracker({
    now:()=>currentTime,
    pruneIntervalMs:1000
  });

  assert.deepEqual(
    cooldowns.check({id:"socket-a", accountId:"account-1"}, "laser", 1000),
    {ok:true}
  );
  assert.deepEqual(
    cooldowns.check({id:"socket-b", accountId:"account-1"}, "laser", 1000),
    {ok:false, reason:"Arme en recharge."}
  );
  assert.equal(cooldowns.size(), 1);

  currentTime += 1000;
  cooldowns.prune();
  assert.equal(cooldowns.size(), 0);
  assert.deepEqual(
    cooldowns.check({id:"socket-b", accountId:"account-1"}, "laser", 1000),
    {ok:true}
  );
});
