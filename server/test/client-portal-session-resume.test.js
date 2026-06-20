import assert from "node:assert/strict";
import test from "node:test";
import { createCombatSessionController } from "../../src/game/systems/combatSession.js";

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
