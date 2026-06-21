import assert from "node:assert/strict";
import test from "node:test";
import {
  completeEnemyEngagement,
  getEnemyEngagementPoint,
  isEnemyEngagementCrossing,
  isEnemyEngagementHolding,
  resetEnemyEngagement
} from "../../src/game/systems/enemyTrajectory.js";

function distanceFromPointToSegment(point, from, to){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, (
    (point.x - from.x) * dx + (point.y - from.y) * dy
  ) / lengthSquared));
  return Math.hypot(
    point.x - (from.x + dx * t),
    point.y - (from.y + dy * t)
  );
}

test("an enemy route crosses the target center and ends on the opposite side", ()=>{
  const enemy = {id:"straight-crossing", x:520, y:160};
  const target = {id:"player-one", x:20, y:-40};
  const point = getEnemyEngagementPoint(enemy, target, 360, 1);

  assert.equal(isEnemyEngagementCrossing(enemy), true);
  assert.ok(distanceFromPointToSegment(target, enemy, point) < .000001);
  assert.ok((enemy.x - target.x) * (point.x - target.x) + (enemy.y - target.y) * (point.y - target.y) < 0);
  assert.ok(Math.hypot(point.x - target.x, point.y - target.y) < 360);
});

test("a crossing route follows target translation without changing its exit angle", ()=>{
  const enemy = {id:"following-crossing", x:420, y:80};
  const target = {id:"player-one", x:0, y:0};
  const first = getEnemyEngagementPoint(enemy, target, 360, 1);
  const moved = getEnemyEngagementPoint(enemy, {...target, x:125, y:-45}, 360, 2);

  assert.equal(moved.angle, first.angle);
  assert.ok(Math.abs(moved.x - first.x - 125) < .000001);
  assert.ok(Math.abs(moved.y - first.y + 45) < .000001);
});

test("an enemy first engaging inside attack range holds its current position", ()=>{
  const enemy = {id:"already-close", x:320, y:0};
  const target = {id:"player-one", x:0, y:0};

  getEnemyEngagementPoint(enemy, target, 360, 1);

  assert.equal(isEnemyEngagementCrossing(enemy), false);
  assert.equal(isEnemyEngagementHolding(enemy), true);
});

test("a completed route remains held while the target stays in attack range", ()=>{
  const enemy = {id:"stable-hold", x:500, y:0};
  const target = {id:"player-one", x:0, y:0};
  const route = getEnemyEngagementPoint(enemy, target, 360, 1);
  enemy.x = route.x;
  enemy.y = route.y;
  completeEnemyEngagement(enemy);

  const movedTarget = {...target, x:25, y:-18};
  const held = getEnemyEngagementPoint(enemy, movedTarget, 360, 2);

  assert.equal(isEnemyEngagementHolding(enemy), true);
  assert.equal(held.angle, route.angle);
});

test("leaving attack range creates a new straight crossing from the enemy's current side", ()=>{
  const enemy = {id:"resume-crossing", x:500, y:0};
  const target = {id:"player-one", x:0, y:0};
  const firstRoute = getEnemyEngagementPoint(enemy, target, 360, 1);
  enemy.x = firstRoute.x;
  enemy.y = firstRoute.y;
  completeEnemyEngagement(enemy);

  const escapedTarget = {...target, x:700, y:180};
  const resumed = getEnemyEngagementPoint(enemy, escapedTarget, 360, 2);

  assert.equal(isEnemyEngagementCrossing(enemy), true);
  assert.ok(distanceFromPointToSegment(escapedTarget, enemy, resumed) < .000001);
  assert.notEqual(resumed.angle, firstRoute.angle);
});

test("resetting combat clears the complete engagement state", ()=>{
  const enemy = {id:"reset-route", x:500, y:0};
  getEnemyEngagementPoint(enemy, {id:"player-one", x:0, y:0}, 360, 1);

  resetEnemyEngagement(enemy);

  assert.equal(enemy.engagementTargetId, "");
  assert.equal(enemy.engagementAngle, null);
  assert.equal(enemy.engagementRadiusRatio, null);
  assert.equal(enemy.engagementPhase, "");
});
