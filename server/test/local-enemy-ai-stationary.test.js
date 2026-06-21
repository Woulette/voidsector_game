import assert from "node:assert/strict";
import test from "node:test";
import { updateEnemyAi } from "../../src/game/systems/enemyAi.js";
import { isEnemyEngagementHolding } from "../../src/game/systems/enemyTrajectory.js";
import { COOP_ENEMY_TYPES, WORLD_ENEMY_TYPES } from "../src/world/definitions.js";
import { DEADLY_ENEMY_TYPES } from "../src/portals/deadlyEnemies.js";

function makeInput(enemies, player = {x:0, y:0}){
  return {
    enemies,
    player,
    dt:.1,
    map:{width:10000, height:8000},
    safeMode:false,
    aggroRange:900,
    leashRange:5000,
    playerCollisionRadius:28,
    now:1000,
    onEnemyAttack(){}
  };
}

function angleDistance(a, b){
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function distanceFromOriginToSegment(from, to){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, -(from.x * dx + from.y * dy) / lengthSquared));
  return Math.hypot(from.x + dx * t, from.y + dy * t);
}

test("local enemies hold position while the player stays in attack range", ()=>{
  const configuredKinds = new Set([
    ...Object.values(WORLD_ENEMY_TYPES).map(enemy=>enemy.kind),
    ...Object.values(COOP_ENEMY_TYPES).map(enemy=>enemy.kind),
    ...Object.values(DEADLY_ENEMY_TYPES).map(enemy=>enemy.kind)
  ]);

  for(const kind of configuredKinds){
    const enemy = {
      id:`local-${kind}`,
      kind,
      x:350,
      y:0,
      homeX:350,
      homeY:0,
      radius:50,
      speed:300,
      attackRange:360,
      attackCooldown:1.4,
      hitT:10,
      aggro:true,
      attackedByPlayer:true
    };
    const input = makeInput([enemy]);

    updateEnemyAi(input);

    assert.equal(enemy.moving, false, `${kind} moved while already in attack range`);
    assert.equal(isEnemyEngagementHolding(enemy), true);
    input.player.x = 18;
    input.player.y = 12;
    input.now = enemy.nextAiDecisionAt;
    updateEnemyAi(input);

    assert.equal(enemy.moving, false, `${kind} moved while already in attack range`);
    assert.equal(enemy.x, 350);
    assert.equal(enemy.y, 0);
    assert.equal(enemy.vx, 0);
    assert.equal(enemy.vy, 0);
    enemy.hitT = 0;
    input.now += 1;
    updateEnemyAi(input);
    const expectedAim = Math.atan2(input.player.y - enemy.y, input.player.x - enemy.x) + Math.PI / 2;
    assert.ok(angleDistance(enemy.angle, expectedAim) < .000001);
    assert.equal(enemy.moving, false);
  }
});

test("a local enemy crosses the player center before holding on the opposite side", ()=>{
  const enemy = {
    id:"local-center-crossing",
    kind:"deadly_intercepteur",
    x:800,
    y:120,
    homeX:800,
    homeY:120,
    radius:44,
    speed:360,
    attackRange:380,
    attackCooldown:1,
    hitT:10,
    aggro:true
  };
  const input = makeInput([enemy]);
  const startX = enemy.x;
  const startY = enemy.y;
  let crossedCenter = false;

  for(let step = 0; step < 80 && !isEnemyEngagementHolding(enemy); step++){
    input.now += 100;
    updateEnemyAi(input);
    const startSide = startX * enemy.x + startY * enemy.y;
    if(startSide < 0) crossedCenter = true;
  }
  input.now += 100;
  updateEnemyAi(input);

  assert.equal(crossedCenter, true);
  assert.equal(isEnemyEngagementHolding(enemy), true);
  assert.equal(enemy.moving, false);
  assert.ok(Math.hypot(enemy.x, enemy.y) <= enemy.attackRange);
});

test("local aggressive enemies keep their opposite slots after reaching attack range", ()=>{
  const enemies = Array.from({length:6}, (_, index)=>({
    id:`local-stack-${index}`,
    kind:"deadly_intercepteur",
    x:Math.cos(index / 6 * Math.PI * 2) * 800,
    y:Math.sin(index / 6 * Math.PI * 2) * 800,
    homeX:Math.cos(index / 6 * Math.PI * 2) * 800,
    homeY:Math.sin(index / 6 * Math.PI * 2) * 800,
    radius:44,
    speed:360,
    attackRange:380,
    attackCooldown:1,
    hitT:10,
    aggro:true
  }));
  const input = makeInput(enemies);

  updateEnemyAi(input);

  const movementAngles = new Set(enemies.map(enemy=>enemy.angle.toFixed(4)));
  const decisionTargets = new Set(enemies.map(enemy=>`${enemy.aiDecision.targetX.toFixed(2)}:${enemy.aiDecision.targetY.toFixed(2)}`));
  const repathTimes = new Set(enemies.map(enemy=>enemy.nextAiDecisionAt));
  assert.ok(movementAngles.size >= 5);
  assert.equal(decisionTargets.size, enemies.length);
  assert.ok(repathTimes.size >= 3);
  for(let step = 0; step < 80 && enemies.some(enemy=>!isEnemyEngagementHolding(enemy)); step++){
    input.now += 100;
    updateEnemyAi(input);
  }
  input.now += 100;
  updateEnemyAi(input);

  for(const enemy of enemies){
    assert.ok(distanceFromOriginToSegment(
      {x:enemy.homeX, y:enemy.homeY},
      {x:enemy.aiDecision.targetX, y:enemy.aiDecision.targetY}
    ) < 100);
    assert.equal(isEnemyEngagementHolding(enemy), true);
    assert.equal(enemy.moving, false);
    assert.equal(enemy.vx, 0);
    assert.equal(enemy.vy, 0);
  }
});
