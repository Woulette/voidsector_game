import assert from "node:assert/strict";
import test from "node:test";
import { createCombatSessionController } from "../../src/game/systems/combatSession.js";
import { createPortalMap } from "../../src/game/systems/portalState.js";

test("Ricky portal places its closed return portal on the entry spawn", ()=>{
  const map = createPortalMap({id:"ricky", name:"Portail de Ricky"});
  const entryPortal = map.closedPortals?.[0];

  assert.equal(entryPortal.x, map.spawn.x);
  assert.equal(entryPortal.y, map.spawn.y);
  assert.equal(entryPortal.closed, true);
  assert.equal(entryPortal.damaged, true);
  assert.equal(Object.hasOwn(entryPortal, "targetMap"), false);

  const centralLight = map.parallaxScene?.starLights?.[0];
  const centralGlow = map.parallaxScene?.glowSpots?.[0];
  assert.equal(centralLight.x, -100);
  assert.equal(centralLight.y, -120);
  assert.equal(centralLight.p, .10);
  assert.equal(centralLight.alpha, .40);
  assert.equal(centralLight.coreAlpha, .58);
  assert.equal(centralGlow.x, centralLight.x);
  assert.equal(centralGlow.y, centralLight.y);
  assert.equal(centralGlow.p, centralLight.p);

  assert.deepEqual(map.parallaxScene.background, ["#080313", "#19072d", "#03010b"]);
  assert.equal(map.parallaxScene.asteroidFields.length, 3);
  assert.equal(map.parallaxScene.asteroidFields.reduce((total, field)=>total + field.count, 0), 126);
  assert.deepEqual(map.parallaxScene.backdrops.map(layer=>layer.src), [
    "assets/maps/decor/deadly/deadly_cosmic_creature.png",
    "assets/maps/decor/deadly/deadly_cracked_moon.png"
  ]);
  assert.deepEqual(map.parallaxScene.images.map(layer=>layer.src), [
    "assets/maps/decor/deadly/deadly_wreck_scout.png",
    "assets/maps/decor/deadly/deadly_wreck_crescent.png"
  ]);
});

test("a refreshed Ricky portal session rebuilds the portal instead of falling back to map one", ()=>{
  const state = {
    currentMap:{id:0},
    player:{shipId:"orion", angle:0, maxHp:1000, hp:1000, maxShield:0, shield:0}
  };
  const portalLoads = [];
  const worldLoads = [];
  const controller = createCombatSessionController({
    store:{state:{activeShip:"orion"}},
    getRunning:()=>true,
    getState:()=>state,
    loadMap:(...args)=>worldLoads.push(args),
    loadPortalArena:(portalId, session)=>{
      portalLoads.push({portalId, session});
      state.currentMap = {id:`portal-${portalId}`};
      state.player.x = session.x;
      state.player.y = session.y;
      return true;
    },
    updateHud(){},
    showToast(){}
  });

  const resumed = controller.resumeWorldSession({
    source:"reconnect",
    mapId:"portal-ricky",
    shipId:"orion",
    x:730,
    y:-410,
    hp:800,
    maxHp:1000,
    shield:25,
    maxShield:100
  });

  assert.equal(resumed, true);
  assert.equal(worldLoads.length, 0);
  assert.equal(portalLoads.length, 1);
  assert.equal(portalLoads[0].portalId, "ricky");
  assert.equal(portalLoads[0].session.x, 730);
  assert.equal(portalLoads[0].session.y, -410);
  assert.equal(state.currentMap.id, "portal-ricky");
  assert.equal(state.player.x, 730);
  assert.equal(state.player.y, -410);
  assert.equal(state.player.hp, 800);
});
