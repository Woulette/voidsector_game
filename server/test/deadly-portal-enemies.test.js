import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeadlyEnemy,
  DEADLY_BOSS_MAX_LIVE_SUMMONS,
  DEADLY_BOSS_SUMMON_BATCH_SIZE,
  DEADLY_BOSS_SUMMON_INTERVAL_MS,
  DEADLY_ENEMY_LEVEL,
  DEADLY_ENEMY_TYPES,
  DEADLY_MINION_KINDS
} from "../src/portals/deadlyEnemies.js";

const EXPECTED = {
  deadly_eclaireur:{
    type:"Éclaireur",
    hp:10000,
    shield:10000,
    damage:[164, 236],
    speed:350,
    range:260,
    size:[55, 71],
    reward:{credits:20000, premium:16, xp:9000}
  },
  deadly_intercepteur:{
    type:"Intercepteur",
    hp:15000,
    shield:15000,
    damage:[246, 354],
    speed:330,
    range:270,
    size:[58, 76],
    reward:{credits:28000, premium:20, xp:12000}
  },
  deadly_gardien:{
    type:"Gardien",
    hp:60000,
    shield:60000,
    damage:[410, 590],
    speed:290,
    range:270,
    size:[79, 116],
    reward:{credits:150000, premium:75, xp:56000}
  },
  deadly_traqueur:{
    type:"Traqueur",
    hp:50000,
    shield:50000,
    damage:[328, 472],
    speed:340,
    range:270,
    size:[69, 108],
    reward:{credits:120000, premium:65, xp:48000}
  },
  deadly_ravageur:{
    type:"Ravageur",
    hp:55000,
    shield:55000,
    damage:[492, 708],
    speed:380,
    range:280,
    size:[108, 116],
    reward:{credits:180000, premium:90, xp:72000}
  },
  deadly_amiral_k137:{
    type:"Amiral K-137",
    hp:1000000,
    shield:1000000,
    damage:[3_280, 4_720],
    speed:330,
    range:300,
    size:[181, 182],
    reward:{credits:4000000, premium:5000, xp:1000000}
  }
};

test("Deadly enemy family uses the configured level 10 stats and rewards", ()=>{
  for(const [kind, expected] of Object.entries(EXPECTED)){
    const enemy = createDeadlyEnemy(kind, {id:`test-${kind}`, x:10, y:20, now:1_000});
    assert.equal(enemy.kind, kind);
    assert.equal(enemy.type, expected.type);
    assert.equal(enemy.level, DEADLY_ENEMY_LEVEL);
    assert.equal(enemy.hp, expected.hp);
    assert.equal(enemy.maxHp, expected.hp);
    assert.equal(enemy.shield, expected.shield);
    assert.equal(enemy.maxShield, expected.shield);
    assert.equal(enemy.attackDamageMin, expected.damage[0]);
    assert.equal(enemy.attackDamageMax, expected.damage[1]);
    assert.equal(enemy.useExactDamageRange, true);
    assert.equal(enemy.attackCooldown, 1_000);
    assert.equal(enemy.speed, expected.speed);
    assert.equal(enemy.attackRange, expected.range);
    assert.deepEqual([enemy.width, enemy.height], expected.size);
    assert.deepEqual(enemy.reward, expected.reward);
    assert.match(enemy.img, /^assets\/enemies\/deadly\/.+\.webp$/);
  }
});

test("Deadly boss summon rules are five per minute with twenty alive maximum", ()=>{
  assert.deepEqual(DEADLY_MINION_KINDS, Object.keys(DEADLY_ENEMY_TYPES).filter(kind=>kind !== "deadly_amiral_k137"));
  assert.equal(DEADLY_BOSS_SUMMON_INTERVAL_MS, 60_000);
  assert.equal(DEADLY_BOSS_SUMMON_BATCH_SIZE, 5);
  assert.equal(DEADLY_BOSS_MAX_LIVE_SUMMONS, 20);
  const boss = createDeadlyEnemy("deadly_amiral_k137", {now:10_000});
  assert.equal(boss.rickyBoss, true);
  assert.equal(boss.rickyBossNextSummonAt, 70_000);
});
