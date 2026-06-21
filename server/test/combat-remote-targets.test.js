import assert from "node:assert/strict";
import test from "node:test";
import { createCombatRemoteTargetResolver } from "../../src/game/systems/combatRemoteTargets.js";

function createResolver({
  player = {level:20, firmId:"astra"},
  group = null,
  map = {id:"Helion-01"},
  remotes = []
} = {}){
  return createCombatRemoteTargetResolver({
    store:{state:{player}},
    multiplayer:{
      group,
      remotePlayers:new Map(remotes.map(remote=>[remote.id, remote]))
    },
    getCurrentMap:()=>map
  });
}

function createRemote(id, state = {}, extra = {}){
  return {
    id,
    name:`Pilot ${id}`,
    firmId:"cyan",
    state:{
      mapId:"Helion-01",
      x:100,
      y:200,
      hp:500,
      maxHp:1000,
      shield:120,
      maxShield:300,
      level:20,
      ...state
    },
    ...extra
  };
}

test("remote player targets keep group and level attack blocks", ()=>{
  const sameGroupResolver = createResolver({
    group:{members:[{id:"ally"}]},
    remotes:[createRemote("ally")]
  });
  const sameGroupTarget = sameGroupResolver.findRemotePlayerTargetById("ally");

  assert.equal(sameGroupTarget.sameGroup, true);
  assert.equal(sameGroupTarget.canAttack, false);
  assert.equal(sameGroupTarget.attackBlockedReason, "Impossible d'attaquer un membre du groupe.");

  const lowAttackerResolver = createResolver({
    player:{level:9, firmId:"astra"},
    remotes:[createRemote("enemy")]
  });
  assert.equal(
    lowAttackerResolver.findRemotePlayerTargetById("enemy").attackBlockedReason,
    "Tu dois atteindre le niveau 10 pour attaquer un joueur."
  );

  const lowTargetResolver = createResolver({
    remotes:[createRemote("protected", {level:9})]
  });
  assert.equal(
    lowTargetResolver.findRemotePlayerTargetById("protected").attackBlockedReason,
    "Ce joueur est protege jusqu'au niveau 10."
  );
});

test("remote player target lookup ignores players on other maps", ()=>{
  const resolver = createResolver({
    map:{id:"Helion-02"},
    remotes:[createRemote("enemy", {mapId:"Helion-01"})]
  });

  assert.equal(resolver.findRemotePlayerTargetById("enemy"), null);
});

test("remote player click lookup picks the closest player on the current map", ()=>{
  const resolver = createResolver({
    remotes:[
      createRemote("far", {x:150, y:200}),
      createRemote("close", {x:104, y:202}),
      createRemote("other-map", {mapId:"Nereid-01", x:100, y:200})
    ]
  });

  const target = resolver.findRemotePlayerAt({x:105, y:201});

  assert.equal(target.playerId, "close");
  assert.equal(target.id, "player:close");
  assert.equal(target.hostile, true);
  assert.equal(target.radius, 48);
});
