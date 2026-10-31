import assert from "node:assert/strict";
import test from "node:test";

import { MATERIAL_COMMERCE_PRICES } from "../../src/shared/materialCommerce.js";
import { getServerMaterialCommerceAccess, sellServerCommerceMaterials } from "../src/economy/materialCommerce.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";

function createCommerceProfile(shipCargo = {}){
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.shipCargo = {orion:{...shipCargo}};
  return profile;
}

function createEconomySocket(id = "commerce-player"){
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    handlers,
    emitted,
    on:(event, handler)=>handlers.set(event, handler),
    emit:(event, payload)=>emitted.push({event, payload})
  };
}

function registerCommerceSocketFixture({mapId = "0", activeState = true} = {}){
  const socket = createEconomySocket();
  const profile = createCommerceProfile({cuivre_orbital:10});
  profile.player.firmId = "astra";
  profile.player.firmSelected = true;
  const player = {
    id:socket.id,
    account:{firmId:"astra"},
    state:activeState ? {mapId} : null
  };
  let actionCalls = 0;
  registerEconomyHandlers(socket, {
    emitProfileSync(){},
    guard:()=>true,
    players:new Map([[socket.id, player]]),
    profileManager:{
      getProfileForPlayer:()=>profile,
      applyEconomyAction(){
        actionCalls += 1;
        return {ok:false, reason:"Action temoin."};
      }
    }
  });
  return {socket, getActionCalls:()=>actionCalls};
}

test("commerce material prices match the requested sale table", ()=>{
  assert.deepEqual(MATERIAL_COMMERCE_PRICES, {
    cuivre_orbital:5,
    zinc_spatial:5,
    nickel_brut:5,
    titane_fissure:5,
    silice_conductrice:5,
    alliage_cuivre_zinc:100,
    plaque_nickel_titane:100,
    conducteur_renforce:2500,
    blindage_composite:2500,
    noyau_astra:10000
  });
});

test("server commerce access allows the player's own firm zones", ()=>{
  const profile = createCommerceProfile();
  profile.player.firmId = "astra";
  profile.player.firmSelected = true;

  const access = getServerMaterialCommerceAccess(profile, {
    state:{mapId:"3"},
    account:{firmId:"cyan"}
  });

  assert.deepEqual(access, {ok:true, mapId:"3", firmId:"astra"});
});

test("server commerce access rejects enemy, neutral and non-game locations", ()=>{
  const profile = createCommerceProfile();
  profile.player.firmId = "astra";
  profile.player.firmSelected = true;

  assert.equal(getServerMaterialCommerceAccess(profile, {state:{mapId:"20"}}).ok, false);
  assert.equal(getServerMaterialCommerceAccess(profile, {state:{mapId:"50"}}).ok, false);
  assert.equal(getServerMaterialCommerceAccess(profile, {mapId:"0"}).ok, false);
});

test("server commerce access fails closed before an authoritative firm is selected", ()=>{
  const profile = createCommerceProfile();
  profile.player.firmId = "astra";
  profile.player.firmSelected = false;

  const access = getServerMaterialCommerceAccess(profile, {
    state:{mapId:"0"},
    account:{firmId:"astra"}
  });

  assert.equal(access.ok, false);
  assert.match(access.reason, /Selectionne d'abord ta firme/);
});

test("commerce socket rejects a sale before the economy action outside the player's firm", async ()=>{
  const {socket, getActionCalls} = registerCommerceSocketFixture({mapId:"20"});

  await socket.handlers.get("commerce:sell-material")({
    materialId:"cuivre_orbital",
    amount:1,
    shipId:"orion"
  });

  assert.equal(getActionCalls(), 0);
  assert.match(socket.emitted.at(-1)?.payload?.message || "", /zones de ta firme/);
});

test("commerce socket reaches the economy action inside the player's firm", async ()=>{
  const {socket, getActionCalls} = registerCommerceSocketFixture({mapId:"0"});

  await socket.handlers.get("commerce:sell-material")({
    materialId:"cuivre_orbital",
    amount:1,
    shipId:"orion"
  });

  assert.equal(getActionCalls(), 1);
});

test("server commerce sells a custom material amount for credits", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:1000});
  profile.player.credits = 100;
  profile.cargoHold.cuivre_orbital = 5000;

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:25, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 125);
  assert.equal(result.amount, 25);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 975);
  assert.equal(profile.cargoHold.cuivre_orbital, 5000);
  assert.equal(profile.player.credits, 225);
});

test("server commerce sells all stock for one selected material", ()=>{
  const profile = createCommerceProfile({
    blindage_composite:2,
    conducteur_renforce:3
  });
  profile.player.credits = 0;

  const result = sellServerCommerceMaterials(profile, {materialId:"blindage_composite", all:true, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 5000);
  assert.equal(result.amount, 2);
  assert.equal(profile.shipCargo.orion.blindage_composite, 0);
  assert.equal(profile.shipCargo.orion.conducteur_renforce, 3);
  assert.equal(profile.player.credits, 5000);
});

test("server commerce sells every priced material and leaves unpriced refinery materials", ()=>{
  const profile = createCommerceProfile({
    cuivre_orbital:2,
    zinc_spatial:3,
    noyau_astra:1,
    catalyseur_quantique:99
  });
  profile.player.credits = 10;

  const result = sellServerCommerceMaterials(profile, {all:true, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 10025);
  assert.equal(result.amount, 6);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
  assert.equal(profile.shipCargo.orion.zinc_spatial, 0);
  assert.equal(profile.shipCargo.orion.noyau_astra, 0);
  assert.equal(profile.shipCargo.orion.catalyseur_quantique, 99);
  assert.equal(profile.player.credits, 10035);
});

test("server commerce rejects materials without a sale price", ()=>{
  const profile = createCommerceProfile({catalyseur_quantique:1});

  const result = sellServerCommerceMaterials(profile, {materialId:"catalyseur_quantique", amount:1, shipId:"orion"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Materiau non vendu ici.");
  assert.equal(profile.shipCargo.orion.catalyseur_quantique, 1);
});

test("server commerce rejects hangar-only material stock", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:0});
  profile.cargoHold.cuivre_orbital = 1000;

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:1, shipId:"orion"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Stock insuffisant.");
  assert.equal(profile.cargoHold.cuivre_orbital, 1000);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
});

test("server commerce only sells the active ship cargo", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:0});
  profile.shipCargo.velox = {cuivre_orbital:1000};

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:1, shipId:"velox"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Soute du vaisseau actif uniquement.");
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
  assert.equal(profile.shipCargo.velox.cuivre_orbital, 1000);
});
