import assert from "node:assert/strict";
import test from "node:test";
import { betaPacks, hasBetaPackPurchase, normalizeBetaPackPurchases } from "../../src/data/premium.js";
import { ships } from "../../src/data/ships.js";
import { getBetaPackPurchase } from "../src/economy/shop.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

test("beta support tiers expose the approved names and euro prices", ()=>{
  assert.deepEqual(betaPacks.map(({name, price})=>({name, price})), [
    {name:"Pack Beta Valkyrie", price:"1,49 EUR"},
    {name:"Pack Beta Razorion", price:"4,99 EUR"},
    {name:"Pack Beta Astralis", price:"9,99 EUR"}
  ]);
});

test("each beta pack grants the fixed ship displayed in its content", ()=>{
  for(const pack of betaPacks){
    const purchase = getBetaPackPurchase(pack.id);
    const ship = ships.find(entry=>entry.id === purchase.grants.ships?.[0]);
    const displayed = pack.contents.find(entry=>entry.kind === "ship");
    assert.ok(ship, `${pack.name} must grant an existing ship`);
    assert.equal(displayed.label, `Vaisseau ${ship.name}`);
    assert.equal(displayed.img, ship.img);
    assert.equal(pack.img, ship.img);
    assert.equal(purchase.realPrice, pack.price);
    assert.equal(purchase.locked, undefined);
  }
});

test("the Astralis pack gives 50000 NOVA and M-4 without accepting old elite choices", ()=>{
  for(const choice of ["", "vesperion", "nyxaris", "asterion", "invalid"]){
    const purchase = getBetaPackPurchase("beta_commander", choice);
    assert.deepEqual(purchase.grants.ships, ["astralis"]);
    assert.equal(purchase.shipChoice, "");
    assert.deepEqual(purchase.allowedShipChoices, []);
    assert.equal(purchase.grants.chooseShip, undefined);
    assert.equal(purchase.grants.premium, 50_000);
    assert.deepEqual(purchase.grants.ammo, {ammo_x4:50_000});
  }
  const pack = betaPacks.find(entry=>entry.id === "beta_commander");
  assert.equal(pack.choices, undefined);
  assert.equal(pack.contents.find(entry=>entry.kind === "premium").quantity, "50 000");
  assert.equal(pack.contents.find(entry=>entry.kind === "ammo").quantity, "x50 000");
});

test("renaming beta packs preserves purchase history and cannot grant a second pack", ()=>{
  const historicalIds = ["beta_valkyrie", "beta_astralis", "beta_commander"];
  assert.deepEqual(normalizeBetaPackPurchases(historicalIds), historicalIds);
  for(const id of historicalIds){
    const profile = createDefaultProfile();
    profile.betaPackPurchases = [id];
    const before = structuredClone(profile);
    let saves = 0;
    const profiles = new Map([["account:beta-history", profile]]);
    const actions = createProfileActions({
      profiles,
      persist(){ saves += 1; },
      getExistingProfile:()=>({key:"account:beta-history", profile})
    });
    assert.equal(hasBetaPackPurchase(profile, id), true);
    const result = actions.addBetaPackPurchase({
      player:{id:"beta-history", accountId:"beta-history"},
      purchase:getBetaPackPurchase(id)
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /deja achete/);
    assert.equal(saves, 0);
    assert.deepEqual(profile, before);
  }
});
