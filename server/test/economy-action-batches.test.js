import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MAX_SERVER_ACTION_REPEAT } from "../src/economy/actionBatch.js";
import { getAmmoPurchase, getBoosterPurchase, getItemPurchase, SERVER_BOOSTER_SHOP } from "../src/economy/shop.js";
import { runServerSpaceCaster } from "../src/economy/spaceCaster.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createServerActionBurstQueue } from "../../src/app/serverActionBurstQueue.js";

test("server-authoritative shop batches scale price and delivery together", ()=>{
  const ammo = getAmmoPurchase("ammo_x1", 10, 7);
  assert.equal(ammo.repeat, 7);
  assert.equal(ammo.totalAmount, 70_000);
  assert.equal(ammo.totalPrice, 700_000);

  const item = getItemPurchase("laser_mk1", 1000, 5);
  assert.equal(item.multiplier, 1);
  assert.equal(item.repeat, 5);
  assert.equal(item.quantity, 5);
  assert.equal(item.totalPrice, 125_000);

  const boosterId = Object.keys(SERVER_BOOSTER_SHOP)[0];
  const booster = getBoosterPurchase(boosterId, 1, 3);
  assert.equal(booster.repeat, 3);
  assert.equal(booster.quantity, 3);
  assert.equal(booster.totalPrice, SERVER_BOOSTER_SHOP[boosterId].price * 3);
});

test("forged or oversized server batches are rejected", ()=>{
  assert.equal(getAmmoPurchase("ammo_x1", 1, 0), null);
  assert.equal(getItemPurchase("laser_mk1", 1, MAX_SERVER_ACTION_REPEAT + 1), null);
  assert.equal(getBoosterPurchase(Object.keys(SERVER_BOOSTER_SHOP)[0], 1, 1.5), null);

  const profile = createDefaultProfile();
  profile.player.premium = 1_000_000;
  const before = profile.player.premium;
  const result = runServerSpaceCaster(profile, {
    portalId:"blue",
    count:100,
    repeat:MAX_SERVER_ACTION_REPEAT + 1,
    random:()=>.5
  });
  assert.equal(result.ok, false);
  assert.equal(profile.player.premium, before);
});

test("Space Caster batches every accepted click into one authoritative mutation", ()=>{
  const profile = createDefaultProfile();
  profile.player.premium = 100_000;
  const result = runServerSpaceCaster(profile, {
    portalId:"blue",
    count:10,
    repeat:5,
    random:()=>.5
  });
  assert.equal(result.ok, true);
  assert.equal(result.repeat, 5);
  assert.equal(result.count, 50);
  assert.equal(result.cost, 5_000);
  assert.equal(profile.player.premium, 95_000);
  assert.equal(result.rewards.reduce((total, reward)=>total + reward.amount, 0) > 0, true);
});

test("client burst queue keeps rapid clicks and emits bounded batches in FIFO order", ()=>{
  let currentTime = 0;
  let timer = null;
  const sent = [];
  const queue = createServerActionBurstQueue({
    intervalMs:450,
    maxRepeat:20,
    now:()=>currentTime,
    setTimer(callback, delay){
      timer = {callback, delay};
      return timer;
    },
    clearTimer(){ timer = null; }
  });
  const sendLaser = repeat=>{
    sent.push({key:"laser", repeat});
    return true;
  };
  const sendShield = repeat=>{
    sent.push({key:"shield", repeat});
    return true;
  };

  queue.enqueue({channel:"shop:buy-item", key:"laser:1", send:sendLaser});
  for(let index = 0; index < 4; index += 1){
    queue.enqueue({channel:"shop:buy-item", key:"laser:1", send:sendLaser});
  }
  queue.enqueue({channel:"shop:buy-item", key:"shield:1", send:sendShield});

  assert.deepEqual(sent, [{key:"laser", repeat:1}]);
  assert.equal(queue.pending("shop:buy-item"), 5);
  assert.equal(timer.delay, 450);

  currentTime = 450;
  timer.callback();
  assert.deepEqual(sent, [{key:"laser", repeat:1}, {key:"laser", repeat:4}]);
  assert.equal(queue.pending("shop:buy-item"), 1);

  currentTime = 900;
  timer.callback();
  assert.deepEqual(sent, [
    {key:"laser", repeat:1},
    {key:"laser", repeat:4},
    {key:"shield", repeat:1}
  ]);
  assert.equal(queue.pending("shop:buy-item"), 0);
});

test("Space Caster UI shows the selected portal's live fragments and keeps delayed results scoped", async ()=>{
  const [renderSource, styleSource, eventSource] = await Promise.all([
    readFile(new URL("../../src/ui/renderPortals.js", import.meta.url), "utf8"),
    readFile(new URL("../../src/styles/hangar.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/serverEventController.js", import.meta.url), "utf8")
  ]);
  assert.match(renderSource, /portal-caster-piece-count/);
  assert.match(renderSource, /fmt\(getPortalPieces\(portal\.id\)\).*fmt\(portal\.piecesRequired\)/s);
  assert.match(styleSource, /\.portal-caster-piece-count/);
  assert.match(eventSource, /portalCasterResultsByPortal\[portalId\] = results/);
});
