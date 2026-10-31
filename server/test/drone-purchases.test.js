import assert from "node:assert/strict";
import test from "node:test";
import { droneCatalog } from "../../src/data/equipment.js";
import { getCraftRecipe, getCraftRecipeAvailability } from "../../src/data/craftingRecipes.js";
import { rawMaterialCatalog } from "../../src/data/progression.js";
import { MAX_STANDARD_DRONES, MAX_TOTAL_DRONES, RESERVED_SPECIAL_DRONE_SLOTS } from "../../src/shared/droneLimits.js";
import { purchaseServerDrone } from "../src/economy/dronePurchases.js";
import { getDronePurchase } from "../src/economy/shop.js";
import { claimServerCraftingJob, startServerCraftingJob } from "../src/economy/crafting.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

function ready(count = 0){
  const profile = createDefaultProfile();
  profile.player.credits = 1_000_000_000;
  profile.tutorial.status = "completed";
  profile.ownedDroneCount = count;
  profile.droneLoadout = Array(count).fill(null);
  profile.cargoHold = Object.fromEntries(rawMaterialCatalog.map(m=>[m.id,1000]));
  return profile;
}

function actionsFor(profile, persist = ()=>{}){
  const key = "account:drone-test", profiles = new Map([[key,profile]]);
  const player = {id:"socket-drone", accountId:"drone-test"};
  const actions = createProfileActions({profiles,persist,getExistingProfile:()=>({key,profile:profiles.get(key)})});
  return {profiles,player,actions,key};
}

test("eight standard drones reserve two places within the unchanged capacity of ten", ()=>{
  assert.equal(MAX_STANDARD_DRONES,8); assert.equal(MAX_TOTAL_DRONES,10);
  assert.equal(RESERVED_SPECIAL_DRONE_SLOTS,2);
  assert.equal(droneCatalog[0].maxOwned,10); assert.equal(droneCatalog[0].maxStandardOwned,8);
});

test("the quote reads only the server profile, never the supplied client count", ()=>{
  const purchase = getDronePurchase({profile:ready(5),ownedCount:0});
  assert.equal(purchase.ownedCount,5); assert.equal(purchase.nextCount,6);
  assert.equal(purchase.totalPrice,6_400_000);
  assert.equal(getDronePurchase({ownedCount:0}).locked,true);
  for(const id of ["constructor","__proto__","unknown",{},null]) assert.equal(getDronePurchase({id,profile:ready()}),null);
  for(const count of [NaN,Infinity,-1,1.5]){
    const profile = ready(); profile.ownedDroneCount = count;
    assert.equal(getDronePurchase({profile}).locked,true);
  }
});

test("a forged grant or price cannot skip drones or reduce payment", async()=>{
  const fixture = actionsFor(ready(3));
  const result = fixture.actions.addDronePurchase({player:fixture.player,id:"combat_drone",
    purchase:{id:"combat_drone",nextCount:8,totalPrice:0,priceType:"premium"},nextCount:8,totalPrice:0});
  assert.equal(result.ok,true); await result.save;
  assert.equal(result.profile.ownedDroneCount,4);
  assert.equal(result.profile.player.credits,1_000_000_000-1_600_000);
  assert.equal(result.purchase.totalPrice,1_600_000);
  assert.equal(result.profile.droneLoadout.length,4);
});

test("stale or malformed quote assertions are rejected without a debit or a grant", ()=>{
  for(const assertion of [{expectedPrice:200_000},{expectedPrice:"400000"},{expectedPrice:null},{expectedCount:0},{expectedCount:99},{expectedPrice:NaN}]){
    const profile = ready(1), before = structuredClone(profile);
    const result = purchaseServerDrone(profile,assertion);
    assert.equal(result.ok,false); assert.equal(result.code,"DRONE_QUOTE_CHANGED");
    assert.deepEqual(profile,before);
  }
});

test("successive purchases each grant one drone at the actual next price, then reject the ninth", async()=>{
  let saves = 0;
  const fixture = actionsFor(ready(),()=>{saves++;});
  let total = 0;
  for(let count=0;count<8;count++){
    const price = 200_000 * 2**count;
    const result = fixture.actions.addDronePurchase({player:fixture.player,expectedPrice:price});
    assert.equal(result.ok,true); await result.save;
    total += price;
    assert.equal(result.profile.ownedDroneCount,count+1);
    assert.equal(result.profile.player.credits,1_000_000_000-total);
    assert.equal(result.profile.droneLoadout.length,count+1);
  }
  const before = structuredClone(fixture.profiles.get(fixture.key));
  assert.equal(fixture.actions.addDronePurchase({player:fixture.player}).ok,false);
  assert.deepEqual(fixture.profiles.get(fixture.key),before); assert.equal(saves,8);
});

test("two sockets using the same displayed price cannot pay twice for one drone", ()=>{
  const fixture = actionsFor(ready());
  const first = fixture.actions.addDronePurchase({player:fixture.player,expectedPrice:200_000});
  const second = fixture.actions.addDronePurchase({player:{...fixture.player,id:"socket-two"},expectedPrice:200_000});
  assert.equal(first.ok,true); assert.equal(second.ok,false);
  assert.equal(second.code,"DRONE_QUOTE_CHANGED");
  assert.equal(second.profile.ownedDroneCount,1); assert.equal(second.profile.player.credits,999_800_000);
});

test("insufficient funds and persistence failure preserve the original count and equipment", async()=>{
  const poor = ready(2); poor.player.credits = 799_999;
  const beforePoor = structuredClone(poor);
  assert.equal(purchaseServerDrone(poor).ok,false); assert.deepEqual(poor,beforePoor);
  const profile = ready(2), before = structuredClone(profile);
  const fixture = actionsFor(profile,()=>Promise.reject(new Error("storage unavailable")));
  const result = fixture.actions.addDronePurchase({player:fixture.player});
  await assert.rejects(result.save,/storage unavailable/);
  assert.deepEqual(fixture.profiles.get(fixture.key),before);
});

test("standard crafting delivers the eighth but cannot start a ninth on client or server", ()=>{
  const profile = ready(7), recipe = getCraftRecipe("craft_drone_combat_drone");
  assert.equal(getCraftRecipeAvailability(recipe,profile).ok,true);
  const start = startServerCraftingJob(profile,{recipeId:recipe.id,now:1000});
  assert.equal(start.ok,true);
  assert.equal(claimServerCraftingJob(profile,{now:start.job.endsAt}).ok,true);
  assert.equal(profile.ownedDroneCount,8);
  const before = structuredClone(profile);
  assert.equal(getCraftRecipeAvailability(recipe,profile).ok,false);
  assert.equal(startServerCraftingJob(profile,{recipeId:recipe.id}).ok,false);
  assert.deepEqual(profile,before);
});

test("legacy owners with nine or ten drones keep their count and every equipped module", ()=>{
  for(const count of [9,10]){
    const profile = ready(count);
    const uid = profile.inventoryItems.find(entry=>entry.itemId === "laser_mk1").uid;
    profile.shipLoadouts.orion.lasers = [];
    profile.droneLoadout[count-1] = uid;
    const clean = sanitizeProfile(profile);
    assert.equal(clean.ownedDroneCount,count); assert.equal(clean.droneLoadout.length,count);
    assert.equal(clean.droneLoadout[count-1],uid);
    const before = structuredClone(clean);
    assert.equal(purchaseServerDrone(clean).ok,false); assert.deepEqual(clean,before);
  }
});
