import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import {
  PREMIUM_DAY_MS, applyPremiumPackToPlayer, claimPremiumRewardState, getNovaDiscountedPrice,
  getPremiumGoldUntil, getPremiumPack, getPremiumRewardStatus, isPremiumActive,
  isPremiumGoldActive, novaCurrencyPacks, premiumFeatureList, premiumGoldFeatureList, premiumShopPacks
} from "../../src/data/premium.js";
import { createShopActions } from "../../src/app/shopActions.js";
import { normalizeState } from "../../src/core/stateNormalizer.js";
import { getPremiumPackPurchase, SERVER_PREMIUM_PACK_SHOP } from "../src/economy/shop.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { createProfileManager } from "../src/players/profiles.js";
import { getProgressionSnapshot, normalizeProgressionPlayer, preserveProtectedProgression } from "../src/players/progression.js";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";

const NOW = new Date(2026, 9, 24, 12).getTime();
const DAY = PREMIUM_DAY_MS;
const classicWeek = getPremiumPack("premium_classic_week");
const goldWeek = getPremiumPack("premium_week");

test("four EUR-only subscriptions distinguish classic benefits from the OR calendar", ()=>{
  assert.equal(premiumShopPacks.length, 4);
  assert.equal(premiumFeatureList.length, 8);
  assert.deepEqual(premiumGoldFeatureList.slice(0, 8), premiumFeatureList);
  assert.equal(premiumGoldFeatureList.length, 9);
  const expected = [
    ["premium_classic_week", "classic", 7, "1,99 EUR"],
    ["premium_classic_month", "classic", 30, "6,99 EUR"],
    ["premium_week", "gold", 7, "2,99 EUR"],
    ["premium_month", "gold", 30, "10,99 EUR"]
  ];
  for(const [id, tier, days, price] of expected){
    const pack = getPremiumPack(id);
    assert.equal(pack.tier, tier);
    assert.equal(pack.days, days);
    assert.equal(pack.realPrice, price);
    assert.equal(pack.priceType, "real");
    assert.equal(Object.hasOwn(pack, "price"), false, "no residual NOVA price");
    assert.equal(pack.features.length, tier === "gold" ? 9 : 8);
    assert.equal(SERVER_PREMIUM_PACK_SHOP[id].tier, tier);
    assert.equal(Object.hasOwn(SERVER_PREMIUM_PACK_SHOP[id], "price"), false);
    assert.equal(getPremiumPackPurchase(id).locked, true);
  }
});

test("NOVA pack IDs and EUR tariffs stay stable while quantities follow the approved grid", ()=>{
  assert.deepEqual(novaCurrencyPacks.map(pack=>[pack.id, pack.price, pack.amount]), [
    ["nova_5000", "1,99 EUR", 3500], ["nova_15000", "5,99 EUR", 12000],
    ["nova_35000", "10,99 EUR", 24000], ["nova_75000", "24,99 EUR", 60000],
    ["nova_160000", "49,99 EUR", 125000], ["nova_330000", "99,99 EUR", 265000]
  ]);
});

test("historical subscriptions retain OR access until the original expiry", ()=>{
  const legacy = {premiumUntil:NOW + 3 * DAY};
  assert.equal(getPremiumGoldUntil(legacy), legacy.premiumUntil);
  assert.equal(isPremiumGoldActive(legacy, NOW), true);
  assert.equal(isPremiumGoldActive(legacy, NOW + 3 * DAY), false);
  assert.equal(getPremiumRewardStatus({player:legacy}, NOW).canClaim, true);
  assert.equal(isPremiumGoldActive({premiumUntil:0, premiumActive:true}, NOW), true);
});

test("a new classic term grants common Premium benefits without calendar access", ()=>{
  const player = {premiumUntil:0, premiumActive:false};
  applyPremiumPackToPlayer(player, classicWeek, NOW);
  assert.equal(player.premiumUntil, NOW + 7 * DAY);
  assert.equal(player.premiumGoldUntil, 0);
  assert.equal(isPremiumActive(player, NOW), true);
  assert.equal(isPremiumGoldActive(player, NOW), false);
  assert.equal(getNovaDiscountedPrice(1000, player, NOW), 950);
  const status = getPremiumRewardStatus({player}, NOW);
  assert.equal(status.premiumActive, true);
  assert.equal(status.premiumGoldActive, false);
  assert.equal(status.canClaim, false);
  assert.match(status.reason, /Premium OR requis/);
});

test("classic renewals freeze an existing legacy OR expiry instead of extending it", ()=>{
  const player = {premiumUntil:NOW + 3 * DAY};
  applyPremiumPackToPlayer(player, classicWeek, NOW);
  assert.equal(player.premiumUntil, NOW + 10 * DAY);
  assert.equal(player.premiumGoldUntil, NOW + 3 * DAY);
  assert.equal(isPremiumGoldActive(player, NOW + 2 * DAY), true);
  assert.equal(isPremiumGoldActive(player, NOW + 4 * DAY), false);
  assert.equal(isPremiumActive(player, NOW + 4 * DAY), true);
  applyPremiumPackToPlayer(player, classicWeek, NOW + 4 * DAY);
  assert.equal(player.premiumUntil, NOW + 17 * DAY);
  assert.equal(player.premiumGoldUntil, NOW + 3 * DAY);
});

test("OR renewals extend only the Gold remainder and keep the common term at least as long", ()=>{
  const player = {premiumUntil:NOW + 30 * DAY, premiumGoldUntil:NOW + 2 * DAY};
  applyPremiumPackToPlayer(player, goldWeek, NOW);
  assert.equal(player.premiumUntil, NOW + 37 * DAY);
  assert.equal(player.premiumGoldUntil, NOW + 9 * DAY);
  applyPremiumPackToPlayer(player, goldWeek, NOW + 10 * DAY);
  assert.equal(player.premiumUntil, NOW + 44 * DAY);
  assert.equal(player.premiumGoldUntil, NOW + 17 * DAY);
  const malformed = {premiumUntil:NOW, premiumGoldUntil:NOW + 60 * DAY};
  applyPremiumPackToPlayer(malformed, goldWeek, NOW);
  assert.equal(malformed.premiumUntil, malformed.premiumGoldUntil);
});

test("classics cannot claim or reset a monthly reward state", ()=>{
  const profile = {player:{premiumUntil:NOW + DAY, premiumGoldUntil:0}, premiumRewardState:{monthKey:"2026-10", claimedDays:[1], lastClaimDate:"2026-10-23"}};
  const before = structuredClone(profile);
  assert.equal(claimPremiumRewardState(profile, NOW).ok, false);
  assert.deepEqual(profile, before);
  profile.player.premiumGoldUntil = NOW + DAY;
  const result = claimPremiumRewardState(profile, NOW);
  assert.equal(result.ok, true);
  assert.equal(result.day, 2);
  assert.equal(claimPremiumRewardState(profile, NOW).ok, false);
});

test("server and client normalizers preserve missing legacy and explicit classic Gold expiry", ()=>{
  const until = Date.now() + DAY;
  for(const rawGold of [undefined, 0, until - 100, "bad", -10]){
    const player = {premiumUntil:until};
    if(rawGold !== undefined) player.premiumGoldUntil = rawGold;
    const source = {...createDefaultProfile(), player};
    const server = sanitizeProfile(source).player;
    const client = normalizeState(structuredClone(source)).player;
    for(const normalized of [normalizeProgressionPlayer(player), server, client]){
      if(rawGold === undefined){
        assert.equal(Object.hasOwn(normalized, "premiumGoldUntil"), false);
        assert.equal(isPremiumGoldActive(normalized), true);
      }else{
        assert.equal(normalized.premiumGoldUntil, typeof rawGold === "number" && rawGold > 0 ? rawGold : 0);
        assert.equal(isPremiumGoldActive(normalized), rawGold === until - 100);
      }
    }
  }
});

test("protected progression rejects injected or removed Gold rights while publishing canonical terms", ()=>{
  const until = Date.now() + DAY;
  for(const canonicalGold of [undefined, 0, until]){
    const existingPlayer = {premiumUntil:until};
    if(canonicalGold !== undefined) existingPlayer.premiumGoldUntil = canonicalGold;
    for(const forged of [undefined, 0, until * 2]){
      const incomingPlayer = {premiumUntil:until * 2, premiumActive:true};
      if(forged !== undefined) incomingPlayer.premiumGoldUntil = forged;
      const protectedPlayer = preserveProtectedProgression({incomingPlayer, existingPlayer});
      const persisted = JSON.parse(JSON.stringify(protectedPlayer));
      assert.equal(persisted.premiumUntil, until);
      assert.equal(persisted.premiumGoldUntil, canonicalGold);
    }
    assert.equal(getProgressionSnapshot(existingPlayer).premiumGoldUntil, canonicalGold);
  }
});

test("real profile save ignores forged Gold rights and persists canonical expiry including zero", async()=>{
  for(const gold of [undefined, 0, Date.now() + DAY]){
    let persisted = [];
    const player = {id:"gold-socket", accountId:"gold-account", name:"Pilot", account:{username:"Pilot", firmId:"astra"}};
    const manager = createProfileManager({cleanName:value=>String(value || "Pilot"), logger:{warn(){}}, loadProfileEntries:async()=>[], persistProfileEntries:async rows=>{persisted = structuredClone(rows);}});
    manager.syncForSocket({emit(){}}, player);
    await manager.flushPersistence();
    const mutation = manager.updateProfileForPlayer({player, update:profile=>{
      profile.player.premiumUntil = Date.now() + 2 * DAY;
      if(gold === undefined) delete profile.player.premiumGoldUntil;
      else profile.player.premiumGoldUntil = gold;
      return {ok:true};
    }});
    await mutation.save;
    const before = manager.getProfileForPlayer(player);
    const canonicalUntil = before.player.premiumUntil;
    const forged = structuredClone(before);
    forged.player.premiumUntil += 365 * DAY;
    forged.player.premiumGoldUntil = forged.player.premiumUntil;
    forged.player.premiumActive = true;
    const saved = manager.saveFromPayload({player, payload:{profile:forged}});
    await saved.persistence;
    assert.equal(saved.profile.player.premiumUntil, canonicalUntil);
    assert.equal(saved.profile.player.premiumGoldUntil, gold);
    assert.equal(persisted[0][1].player.premiumGoldUntil, gold);
    assert.equal(saved.profile.player.premiumActive, true);
    const published = [];
    manager.syncForSocket({emit:(event, payload)=>{if(event === "profile:sync") published.push(payload);}}, player);
    assert.equal(published.at(-1).player.premiumGoldUntil, gold);
    assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(published.at(-1))).player, "premiumGoldUntil"), gold !== undefined);
    await manager.flushPersistence();
  }
});

test("retired profile purchase rejects old, forged and current requests without charging or persisting", ()=>{
  const profile = createDefaultProfile();
  Object.assign(profile.player, {premium:1_000_000, credits:1_000_000, premiumUntil:Date.now() + DAY});
  const profiles = new Map([["Pilot", profile]]);
  let writes = 0;
  const actions = createProfileActions({profiles, persist(){writes += 1;}, getExistingProfile:()=>({key:"Pilot", profile:profiles.get("Pilot")})});
  const before = structuredClone(profile);
  const purchases = [
    ...premiumShopPacks.map(pack=>getPremiumPackPurchase(pack.id)),
    {id:"premium_month", days:30, priceType:"premium", totalPrice:75000},
    {id:"premium_week", days:9999, priceType:"premium", totalPrice:0},
    {id:"premium_classic_week", days:7, priceType:"real", totalPrice:0}
  ];
  for(const purchase of purchases){
    const result = actions.addPremiumPackPurchase({player:{name:"Pilot"}, purchase});
    assert.equal(result.ok, false);
    assert.match(result.reason, /uniquement en euros/);
    assert.deepEqual(profiles.get("Pilot"), before);
  }
  assert.equal(writes, 0);
});

test("legacy client purchase never sends a NOVA or real-payment command", ()=>{
  const player = {premium:1_000_000, credits:1_000_000};
  let commands = 0;
  const toasts = [];
  const actions = createShopActions({multiplayer:{}, store:{state:{player}}, buyServerPremiumPack(){commands += 1;}, showToast:message=>toasts.push(message)});
  for(const pack of premiumShopPacks) actions.buyPremiumPack(pack.id);
  assert.equal(commands, 0);
  assert.equal(toasts.length, 4);
  assert.ok(toasts.every(message=>message.includes("uniquement en euros")));
  assert.deepEqual(player, {premium:1_000_000, credits:1_000_000});
});

test("real Socket.IO rejects the retired Premium purchase event before calling any grant", {timeout:10000}, async()=>{
  const http = createServer();
  const io = new Server(http);
  let grants = 0, syncs = 0;
  io.on("connection", socket=>{
    registerEconomyHandlers(socket, {guard:()=>true, players:new Map([[socket.id, {id:socket.id, accountId:"test"}]]), profileManager:{addPremiumPackPurchase(){grants += 1; return {ok:true};}}, emitProfileSync(){syncs += 1;}});
    socket.emit("test:ready");
  });
  await new Promise(resolve=>http.listen(0, "127.0.0.1", resolve));
  const client = connect(`http://127.0.0.1:${http.address().port}`, {transports:["websocket"], reconnection:false, autoConnect:false});
  try{
    const ready = new Promise(resolve=>client.once("test:ready", resolve));
    client.connect();
    await ready;
    for(const id of ["premium_week", "premium_month", "premium_classic_week", "unknown"]){
      const rejected = new Promise(resolve=>client.once("shop:error", resolve));
      client.emit("shop:buy-premium-pack", {id, priceType:"premium", totalPrice:0, days:999});
      assert.match((await rejected).message, /uniquement en euros/);
    }
    assert.equal(grants, 0);
    assert.equal(syncs, 0);
  }finally{
    client.disconnect();
    await new Promise(resolve=>io.close(resolve));
  }
});
