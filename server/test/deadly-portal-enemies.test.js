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
    hp:20_000,
    shield:10_000,
    damage:[250, 350],
    speed:380,
    range:350,
    reward:{credits:24_000, premium:19, xp:6_400}
  },
  deadly_intercepteur:{
    type:"Intercepteur",
    hp:25_000,
    shield:10_000,
    damage:[350, 450],
    speed:360,
    range:380,
    reward:{credits:32_000, premium:24, xp:8_000}
  },
  deadly_gardien:{
    type:"Gardien",
    hp:230_000,
    shield:130_000,
    damage:[600, 900],
    speed:320,
    range:380,
    reward:{credits:200_000, premium:96, xp:40_000}
  },
  deadly_traqueur:{
    type:"Traqueur",
    hp:140_000,
    shield:80_000,
    damage:[500, 700],
    speed:370,
    range:380,
    reward:{credits:160_000, premium:80, xp:35_200}
  },
  deadly_ravageur:{
    type:"Ravageur",
    hp:180_000,
    shield:120_000,
    damage:[700, 950],
    speed:410,
    range:330,
    reward:{credits:240_000, premium:116, xp:51_200}
  },
  deadly_amiral_k137:{
    type:"Amiral K-137",
    hp:2_000_000,
    shield:1_000_000,
    damage:[3_500, 5_000],
    speed:380,
    range:410,
    reward:{credits:4_000_000, premium:5_000, xp:750_000}
  }
};

test("Deadly enemy family uses the configured level 20 stats and rewards", ()=>{
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
