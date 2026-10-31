import assert from "node:assert/strict";
import test from "node:test";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { createVesperBoss, createVesperCage, createVesperTurret, VESPER_PORTAL_MAP } from "../src/portals/vesperPortalState.js";

test("Vesper combat enemies keep rewards while objective cages remain excluded", ()=>{
  const cageDefinition = VESPER_PORTAL_MAP.cages[0];
  const turret = createVesperTurret(cageDefinition, 0, 1_000);
  const boss = createVesperBoss(1_000);
  const cage = createVesperCage(cageDefinition, 1_000);

  for(const enemy of [turret, boss]){
    assert.equal(enemy.noReward, false);
    assert.ok(Number(enemy.reward?.credits || 0) > 0);
    assert.ok(Number(enemy.reward?.xp || 0) > 0);
  }
  assert.equal(cage.noReward, true);
  assert.deepEqual(cage.reward, {credits:0, xp:0, premium:0});
});

test("portal death routing awards once, progresses kills, and limits recipients to joined members", ()=>{
  const mapId = "portal-test";
  const leader = {
    id:"leader",
    groupId:"group",
    connected:true,
    clientMode:"game",
    mapId,
    state:{mapId, hp:1_000}
  };
  const spectator = {
    id:"spectator",
    groupId:"group",
    connected:true,
    clientMode:"game",
    mapId,
    state:{mapId, hp:1_000}
  };
  const enemy = {
    id:"portal-enemy",
    kind:"drone_pirate",
    type:"Orbe sentinelle",
    level:10,
    hp:0,
    reward:{credits:800, xp:400, premium:1},
    noReward:false
  };
  const group = {
    id:"group",
    members:[leader.id, spectator.id],
    instance:{
      id:"instance-test",
      type:"portal",
      portal:{id:"test", totalWaves:2},
      wave:1,
      enemies:[enemy],
      joinedMemberIds:[leader.id],
      abandonedMemberIds:[],
      playerLives:{[leader.id]:3},
      completed:false
    }
  };
  const players = new Map([[leader.id, leader], [spectator.id, spectator]]);
  const groups = new Map([[group.id, group]]);
  const rewards = [];
  const questKills = [];
  const manager = createPortalInstanceManager({
    io:{to:()=>({emit(){}}), sockets:{sockets:new Map()}},
    players,
    groups,
    profileManager:{},
    emitInstance(){},
    emitWorldReward(payload){
      rewards.push(payload);
      payload.enemy.rewardGranted = true;
    },
    progressServerQuestsForKill:payload=>questKills.push(payload),
    portalWaveTotal:2
  });

  manager.handlePortalEnemyDeath(group, enemy, leader.id);
  manager.handlePortalEnemyDeath(group, enemy, leader.id);

  assert.equal(rewards.length, 1);
  assert.deepEqual(rewards[0].recipientIds, [leader.id]);
  assert.equal(rewards[0].mapId, mapId);
  assert.equal(questKills.length, 1);
  assert.deepEqual(questKills[0].recipientIds, [leader.id]);
});

test("portal objective entities marked noReward never enter the reward pipeline", ()=>{
  const mapId = "portal-objective";
  const player = {
    id:"pilot",
    groupId:"group-objective",
    connected:true,
    clientMode:"game",
    mapId,
    state:{mapId, hp:1_000}
  };
  const objective = {
    id:"objective",
    kind:"portal_core",
    hp:0,
    reward:{credits:999_999, xp:999_999, premium:999},
    noReward:true
  };
  const group = {
    id:"group-objective",
    members:[player.id],
    instance:{
      id:"instance-objective",
      type:"portal",
      portal:{id:"objective", totalWaves:2},
      wave:1,
      enemies:[objective],
      joinedMemberIds:[player.id],
      abandonedMemberIds:[],
      playerLives:{[player.id]:3},
      completed:false
    }
  };
  let rewardCalls = 0;
  const manager = createPortalInstanceManager({
    io:{to:()=>({emit(){}}), sockets:{sockets:new Map()}},
    players:new Map([[player.id, player]]),
    groups:new Map([[group.id, group]]),
    profileManager:{},
    emitInstance(){},
    emitWorldReward(){ rewardCalls += 1; },
    portalWaveTotal:2
  });

  manager.handlePortalEnemyDeath(group, objective, player.id);
  assert.equal(rewardCalls, 0);
  assert.equal(objective.rewardGranted, undefined);
});
