import assert from "node:assert/strict";
import test from "node:test";
import { createRemoteWeaponEventProcessor } from "../../src/game/systems/combatRemoteWeaponEvents.js";

function createProcessor(remoteEffects){
  const bullets = [];
  const particles = [];
  const beams = [];
  const multiplayer = {
    playerId:"local-player",
    remoteEffects
  };
  const processor = createRemoteWeaponEventProcessor({
    multiplayer,
    getState:()=>({
      currentMap:{id:"Helion-01"},
      bullets,
      particles
    }),
    beams:{add:beam=>beams.push(beam)},
    getCurrentMapToken:map=>String(map?.id ?? map?.name ?? "")
  });
  return {processor, multiplayer, bullets, particles, beams};
}

test("remote laser effects keep exact ammo, beam color and target", ()=>{
  const fixture = createProcessor([{
    mapId:"Helion-01",
    kind:"laser",
    ammoId:"ammo_x4",
    starts:[{x:10, y:20}],
    toX:100,
    toY:120,
    targetId:"enemy-1",
    blueLaser:false
  }]);

  fixture.processor.applyRemoteWeaponEvents();

  assert.equal(fixture.multiplayer.remoteEffects.length, 0);
  assert.equal(fixture.beams.length, 1);
  assert.deepEqual(fixture.beams[0], {
    ammoId:"ammo_x4",
    fromX:10,
    fromY:20,
    toX:100,
    toY:120,
    targetId:"enemy-1",
    blueLaser:false
  });
});

test("remote missile effects create visual projectiles with ammo sprite and curves", ()=>{
  const fixture = createProcessor([{
    mapId:"Helion-01",
    kind:"missile",
    ammoId:"missile_m2",
    starts:[
      {x:10, y:20, curveSide:1, curveStrength:42},
      {x:12, y:24, curveSide:-1, curveStrength:46}
    ],
    toX:400,
    toY:450,
    targetId:"player:local-player",
    travelTime:.8
  }]);

  fixture.processor.applyRemoteWeaponEvents();

  assert.equal(fixture.bullets.length, 2);
  assert.equal(fixture.particles.length, 2);
  assert.equal(fixture.bullets[0].owner, "remotePlayer");
  assert.equal(fixture.bullets[0].kind, "missile");
  assert.equal(fixture.bullets[0].targetId, "player");
  assert.equal(fixture.bullets[0].ammoId, "missile_m2");
  assert.equal(fixture.bullets[0].sprite, "assets/equipment/missile_m2_projectile.png");
  assert.deepEqual(fixture.bullets[0].fixedTarget, {x:400, y:450, hp:1});
  assert.equal(fixture.bullets[0].curveSide, 1);
  assert.equal(fixture.bullets[1].curveSide, -1);
});

test("remote weapon effects for another map are retained briefly", ()=>{
  const fixture = createProcessor([{
    mapId:"Helion-02",
    kind:"laser",
    ammoId:"ammo_x1",
    createdAt:Date.now()
  }]);

  fixture.processor.applyRemoteWeaponEvents();

  assert.equal(fixture.multiplayer.remoteEffects.length, 1);
  assert.equal(fixture.beams.length, 0);
  assert.equal(fixture.bullets.length, 0);
});
