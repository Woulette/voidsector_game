import assert from "node:assert/strict";
import test from "node:test";
import { ENEMY_THREAT_RECALC_MS, markEnemyAttackedByPlayer } from "../src/world/aggro.js";
import { createWorldAiManager } from "../src/world/ai.js";
import { COOP_ENEMY_TYPES, WORLD_ENEMY_TYPES } from "../src/world/definitions.js";
import { DEADLY_ENEMY_TYPES } from "../src/portals/deadlyEnemies.js";
import {
  getEnemyRepathDelayMs,
  isEnemyEngagementCrossing,
  isEnemyEngagementHolding
} from "../../src/game/systems/enemyTrajectory.js";

function distanceFromOriginToSegment(from, to){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, -(from.x * dx + from.y * dy) / lengthSquared));
  return Math.hypot(from.x + dx * t, from.y + dy * t);
}

test("enemy keeps the first hitter until the ten second threat recalculation", ()=>{
  const enemy = {};
  markEnemyAttackedByPlayer(enemy, "player-a", 100, 1000);
  markEnemyAttackedByPlayer(enemy, "player-b", 500, 5000);

  assert.equal(enemy.lockedPlayerId, "player-a");
  assert.deepEqual(enemy.damageThreat, {"player-a":100, "player-b":500});

  markEnemyAttackedByPlayer(enemy, "player-a", 10, 1000 + ENEMY_THREAT_RECALC_MS);
  assert.equal(enemy.lockedPlayerId, "player-b");
});

test("enemy threat uses cumulative damage at each ten second recalculation", ()=>{
  const enemy = {};
  markEnemyAttackedByPlayer(enemy, "player-a", 600, 1000);
  markEnemyAttackedByPlayer(enemy, "player-b", 500, 5000);
  markEnemyAttackedByPlayer(enemy, "player-b", 200, 1000 + ENEMY_THREAT_RECALC_MS);
  assert.equal(enemy.lockedPlayerId, "player-b");

  markEnemyAttackedByPlayer(enemy, "player-a", 300, 1000 + ENEMY_THREAT_RECALC_MS * 2);
  assert.equal(enemy.lockedPlayerId, "player-a");
});

test("enemy proximity aggro prioritizes a real player over the closer Ricky NPC", ()=>{
  const player = {
    id:"player-a",
    mapId:"portal-ricky",
    state:{mapId:"portal-ricky", x:300, y:0, hp:1000}
  };
  const ricky = {
    id:"ricky_companion",
    npcTarget:true,
    mapId:"portal-ricky",
    state:{mapId:"portal-ricky", x:20, y:0, hp:50000}
  };
  const enemy = {
    id:"enemy-1",
    kind:"chasseur_spectral",
    x:0,
    y:0,
    homeX:0,
    homeY:0,
    hp:10000,
    maxHp:10000,
    speed:160,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });

  manager.updateWorldEnemy(enemy, {id:"portal-ricky", width:5200, height:3600}, [ricky, player], .1, 1000);

  assert.equal(enemy.lockedPlayerId, player.id);
});

test("Cristanite follows on sight but attacks only after the player fires", ()=>{
  const player = {
    id:"cristanite-target",
    mapId:"4",
    state:{mapId:"4", x:0, y:0, hp:1000}
  };
  const enemy = {
    id:"cristanite-test",
    kind:"cristanite",
    x:300,
    y:0,
    homeX:300,
    homeY:0,
    hp:180000,
    maxHp:180000,
    speed:250,
    attackRange:350,
    attackDamage:2050,
    attackDamageMin:1600,
    attackDamageMax:2500,
    useExactDamageRange:true,
    attackCooldown:1000,
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    nextAttackAt:0,
    damageThreat:{}
  };
  const attacks = [];
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack:payload=>attacks.push(payload),
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"4", width:10000, height:8000};

  manager.updateWorldEnemy(enemy, map, [player], .1, 1000);
  assert.equal(enemy.lockedPlayerId, player.id);
  assert.equal(attacks.length, 0);

  markEnemyAttackedByPlayer(enemy, player.id, 0, 1100);
  manager.updateWorldEnemy(enemy, map, [player], .1, 1100);
  assert.equal(attacks.length, 1);
});

test("Astranite abandons an untouched distant target after fifteen seconds", ()=>{
  const player = {
    id:"astranite-target",
    mapId:"4",
    state:{mapId:"4", x:0, y:0, hp:1000}
  };
  const enemy = {
    id:"astranite-test",
    kind:"astranite",
    x:300,
    y:0,
    homeX:300,
    homeY:0,
    hp:450000,
    maxHp:450000,
    speed:240,
    attackRange:360,
    attackDamage:4700,
    attackCooldown:1000,
    requiresPlayerAttack:true,
    followBeforeAttacked:true,
    targetMemoryMs:15000,
    nextAttackAt:Infinity,
    damageThreat:{}
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"4", width:10000, height:8000};

  manager.updateWorldEnemy(enemy, map, [player], .1, 1000);
  assert.equal(enemy.lockedPlayerId, player.id);
  player.state.x = 5000;
  manager.updateWorldEnemy(enemy, map, [player], .1, 15999);
  assert.equal(enemy.lockedPlayerId, player.id);
  manager.updateWorldEnemy(enemy, map, [player], .1, 17000);
  assert.equal(enemy.lockedPlayerId, null);
});

test("a moving enemy keeps its trajectory until its staggered repath", ()=>{
  const player = {
    id:"player-facing",
    mapId:"0",
    state:{mapId:"0", x:320, y:180, hp:1000}
  };
  const enemy = {
    id:"enemy-facing",
    kind:"chasseur_spectral",
    x:0,
    y:0,
    homeX:0,
    homeY:0,
    hp:10000,
    maxHp:10000,
    speed:200,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400,
    nextAttackAt:Infinity,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });

  manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, 1000);

  const firstX = enemy.x;
  const firstY = enemy.y;
  const firstMoveAngle = enemy.angle;
  const expectedFirstMoveAngle = Math.atan2(firstY, firstX) + Math.PI / 2;
  assert.ok(Math.abs(firstMoveAngle - expectedFirstMoveAngle) < 0.000001);
  assert.equal(enemy.nextAiDecisionAt, 1000 + getEnemyRepathDelayMs(enemy));
  const firstDecision = {...enemy.aiDecision};

  player.state.x = -320;
  player.state.y = -180;
  const beforeSecondX = enemy.x;
  const beforeSecondY = enemy.y;
  manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, 1400);
  const expectedSecondMoveAngle = Math.atan2(
    enemy.y - beforeSecondY,
    enemy.x - beforeSecondX
  ) + Math.PI / 2;
  assert.ok(Math.abs(enemy.angle - expectedSecondMoveAngle) < 0.000001);
  assert.equal(enemy.aiDecision.targetX, firstDecision.targetX);
  assert.equal(enemy.aiDecision.targetY, firstDecision.targetY);

  const beforeRepathX = enemy.x;
  const beforeRepathY = enemy.y;
  manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, enemy.nextAiDecisionAt);
  const expectedRepathAngle = Math.atan2(
    enemy.y - beforeRepathY,
    enemy.x - beforeRepathX
  ) + Math.PI / 2;
  assert.ok(Math.abs(enemy.angle - expectedRepathAngle) < 0.000001);
  assert.notEqual(enemy.aiDecision.targetX, firstDecision.targetX);
  assert.notEqual(enemy.aiDecision.targetY, firstDecision.targetY);
});

test("an enemy holds position while its moving target stays in attack range", ()=>{
  const player = {
    id:"player-stable",
    mapId:"0",
    state:{mapId:"0", x:0, y:0, hp:1000, radius:28}
  };
  const enemy = {
    id:"enemy-stable",
    kind:"deadly_intercepteur",
    x:350,
    y:0,
    homeX:350,
    homeY:0,
    hp:10000,
    maxHp:10000,
    radius:44,
    speed:360,
    attackRange:380,
    attackDamage:100,
    attackCooldown:1000,
    nextAttackAt:Infinity,
    angle:.42,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  };
  let attackCount = 0;
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){ attackCount += 1; },
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"0", width:10000, height:8000};

  manager.updateWorldEnemy(enemy, map, [player], .1, 1000);
  assert.equal(enemy.moving, false);
  assert.equal(enemy.vx, 0);
  assert.equal(enemy.vy, 0);

  const beforeAttackX = enemy.x;
  const beforeAttackY = enemy.y;
  player.state.x = 24;
  player.state.y = -18;
  enemy.nextAttackAt = 0;
  manager.updateWorldEnemy(enemy, map, [player], .1, 1050);
  assert.equal(enemy.moving, false);
  assert.equal(enemy.x, beforeAttackX);
  assert.equal(enemy.y, beforeAttackY);
  const expectedAim = Math.atan2(player.state.y - enemy.y, player.state.x - enemy.x) + Math.PI / 2;
  assert.ok(Math.abs(enemy.angle - expectedAim) < 0.000001);
  assert.equal(attackCount, 1);

  manager.updateWorldEnemy(enemy, map, [player], .1, 1100);
  assert.equal(enemy.moving, false);
  assert.equal(enemy.vx, 0);
  assert.equal(enemy.vy, 0);
  assert.ok(Math.abs(enemy.angle - expectedAim) < 0.000001);
});

test("staggered enemies do not open attacks on the same server tick", ()=>{
  const player = {
    id:"player-staggered",
    mapId:"0",
    state:{mapId:"0", x:0, y:0, hp:1000}
  };
  const createEnemy = id=>({
    id,
    kind:"deadly_intercepteur",
    x:320,
    y:0,
    homeX:320,
    homeY:0,
    hp:10000,
    maxHp:10000,
    speed:330,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1000,
    nextAttackAt:0,
    staggerFirstAttack:true,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  });
  const enemies = [createEnemy("staggered-enemy-a"), createEnemy("staggered-enemy-b")];
  const attacks = [];
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack:payload=>attacks.push(payload),
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"0", width:10000, height:8000};

  for(const enemy of enemies) manager.updateWorldEnemy(enemy, map, [player], .1, 1000);

  assert.equal(attacks.length, 0);
  assert.ok(enemies[0].nextAttackAt > 1000);
  assert.ok(enemies[1].nextAttackAt > 1000);
  assert.notEqual(enemies[0].nextAttackAt, enemies[1].nextAttackAt);

  manager.updateWorldEnemy(enemies[0], map, [player], .1, enemies[0].nextAttackAt);
  assert.equal(attacks.length, 1);
  manager.updateWorldEnemy(enemies[1], map, [player], .1, enemies[1].nextAttackAt);
  assert.equal(attacks.length, 2);
});

test("heavy enemies cross the player before stopping inside attack range", ()=>{
  const player = {
    id:"player-heavy",
    mapId:"portal-ricky",
    state:{mapId:"portal-ricky", x:0, y:0, hp:1000}
  };
  const enemy = {
    id:"deadly-guardian",
    kind:"deadly_gardien",
    x:350,
    y:0,
    homeX:0,
    homeY:0,
    hp:230000,
    maxHp:230000,
    speed:290,
    attackRange:330,
    attackDamage:750,
    attackCooldown:1000,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });

  manager.updateWorldEnemy(enemy, {id:"portal-ricky", width:11000, height:8200}, [player], .1, 1000);

  assert.equal(enemy.moving, true);
  assert.ok(Math.hypot(enemy.vx, enemy.vy) > 0);
  assert.ok(enemy.x < 350);

  let now = 1100;
  for(let step = 0; step < 80 && !isEnemyEngagementHolding(enemy); step++){
    manager.updateWorldEnemy(enemy, {id:"portal-ricky", width:11000, height:8200}, [player], .1, now);
    now += 100;
  }
  manager.updateWorldEnemy(enemy, {id:"portal-ricky", width:11000, height:8200}, [player], .1, now);

  assert.ok(enemy.x < 0);
  assert.equal(isEnemyEngagementHolding(enemy), true);
  assert.equal(enemy.moving, false);
  assert.equal(enemy.vx, 0);
  assert.equal(enemy.vy, 0);
});

test("engagement movement keeps each enemy's configured speed", ()=>{
  const createEnemy = speed=>({
    id:"speed-check-enemy",
    kind:"cuirasse_nebulaire",
    x:800,
    y:0,
    homeX:800,
    homeY:0,
    hp:10000,
    maxHp:10000,
    radius:32,
    speed,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400,
    nextAttackAt:Infinity,
    lockedPlayerId:"speed-check-player",
    lockedPlayerLastSeenAt:1000
  });
  const player = {
    id:"speed-check-player",
    mapId:"0",
    state:{mapId:"0", x:0, y:0, hp:1000}
  };
  const moveOnce = speed=>{
    const enemy = createEnemy(speed);
    const manager = createWorldAiManager({
      players:new Map([[player.id, player]]),
      presence:{isActiveForWorld:()=>true},
      launchEnemyAttack(){},
      isPlayerSafeOnMap:()=>false
    });
    manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, 1000);
    return Math.hypot(enemy.x - 800, enemy.y);
  };

  assert.ok(Math.abs(moveOnce(120) - 12) < .000001);
  assert.ok(Math.abs(moveOnce(360) - 36) < .000001);
});

test("every configured enemy family holds when engagement starts inside attack range", ()=>{
  const configuredKinds = new Set([
    ...Object.values(WORLD_ENEMY_TYPES).map(enemy=>enemy.kind),
    ...Object.values(COOP_ENEMY_TYPES).map(enemy=>enemy.kind),
    ...Object.values(DEADLY_ENEMY_TYPES).map(enemy=>enemy.kind)
  ]);

  for(const kind of configuredKinds){
    const player = {
      id:`player-${kind}`,
      mapId:"0",
      state:{mapId:"0", x:0, y:0, hp:1000}
    };
    const enemy = {
      id:`enemy-${kind}`,
      kind,
      x:350,
      y:0,
      homeX:350,
      homeY:0,
      hp:10000,
      maxHp:10000,
      radius:50,
      speed:300,
      attackRange:360,
      attackDamage:100,
      attackCooldown:1400,
      nextAttackAt:Infinity,
      lockedPlayerId:player.id,
      lockedPlayerLastSeenAt:1000
    };
    const manager = createWorldAiManager({
      players:new Map([[player.id, player]]),
      presence:{isActiveForWorld:()=>true},
      launchEnemyAttack(){},
      isPlayerSafeOnMap:()=>false
    });

    manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, 1000);

    assert.equal(enemy.moving, false, `${kind} moved while already in attack range`);
    assert.equal(enemy.x, 350, `${kind} changed position inside attack range`);
    assert.equal(isEnemyEngagementHolding(enemy), true);
    assert.equal(enemy.vx, 0);
    assert.equal(enemy.vy, 0);
  }
});

test("aggressive enemies take individual paths through the player center and may stack", ()=>{
  const player = {
    id:"player-surrounded",
    mapId:"0",
    state:{mapId:"0", x:0, y:0, hp:1000}
  };
  const enemies = Array.from({length:8}, (_, index)=>({
    id:`surrounding-enemy-${index + 1}`,
    kind:"cuirasse_nebulaire",
    x:Math.cos(index / 8 * Math.PI * 2) * 800,
    y:Math.sin(index / 8 * Math.PI * 2) * 800,
    homeX:Math.cos(index / 8 * Math.PI * 2) * 800,
    homeY:Math.sin(index / 8 * Math.PI * 2) * 800,
    hp:10000,
    maxHp:10000,
    radius:32,
    speed:200,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400,
    nextAttackAt:Infinity,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  }));
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });

  for(const enemy of enemies){
    manager.updateWorldEnemy(enemy, {id:"0", width:10000, height:8000}, [player], .1, 1000);
  }

  const movementAngles = new Set(enemies.map(enemy=>enemy.angle.toFixed(4)));
  const decisionTargets = new Set(enemies.map(enemy=>`${enemy.aiDecision.targetX.toFixed(2)}:${enemy.aiDecision.targetY.toFixed(2)}`));
  const repathTimes = new Set(enemies.map(enemy=>enemy.nextAiDecisionAt));
  assert.ok(movementAngles.size >= 6);
  assert.equal(decisionTargets.size, enemies.length);
  assert.ok(repathTimes.size >= 4);
  for(const enemy of enemies){
    assert.ok(distanceFromOriginToSegment(
      {x:enemy.homeX, y:enemy.homeY},
      {x:enemy.aiDecision.targetX, y:enemy.aiDecision.targetY}
    ) < .000001);
  }
});

test("a held enemy starts a new center crossing only after the player leaves attack range", ()=>{
  const player = {
    id:"player-resume",
    mapId:"0",
    state:{mapId:"0", x:0, y:0, hp:1000}
  };
  const enemy = {
    id:"enemy-resume",
    kind:"cuirasse_nebulaire",
    x:320,
    y:0,
    homeX:320,
    homeY:0,
    hp:10000,
    maxHp:10000,
    radius:32,
    speed:200,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400,
    nextAttackAt:Infinity,
    lockedPlayerId:player.id,
    lockedPlayerLastSeenAt:1000
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"0", width:10000, height:8000};

  manager.updateWorldEnemy(enemy, map, [player], .1, 1000);
  assert.equal(isEnemyEngagementHolding(enemy), true);
  assert.equal(enemy.moving, false);

  player.state.x = 20;
  manager.updateWorldEnemy(enemy, map, [player], .1, 1100);
  assert.equal(isEnemyEngagementHolding(enemy), true);
  assert.equal(enemy.moving, false);

  player.state.x = 800;
  manager.updateWorldEnemy(enemy, map, [player], .1, 1200);
  assert.equal(isEnemyEngagementCrossing(enemy), true);
  assert.equal(enemy.moving, true);
  assert.ok(enemy.x > 320);
  assert.ok(distanceFromOriginToSegment(
    {x:320 - player.state.x, y:-player.state.y},
    {
      x:enemy.aiDecision.targetX - player.state.x,
      y:enemy.aiDecision.targetY - player.state.y
    }
  ) < .000001);
});
