import assert from "node:assert/strict";
import test from "node:test";
import { getDeadlyEnginePorts } from "../../src/game/render/enemyEngines.js";

test("only Deadly enemies expose lightweight engine render ports", ()=>{
  const expectedPortCounts = {
    deadly_eclaireur:2,
    deadly_intercepteur:2,
    deadly_gardien:3,
    deadly_traqueur:2,
    deadly_ravageur:2,
    deadly_amiral_k137:2
  };

  for(const [kind, count] of Object.entries(expectedPortCounts)){
    const ports = getDeadlyEnginePorts(kind);
    assert.equal(ports.length, count);
    assert.ok(ports.every(([x, y])=>Math.abs(x) <= .25 && y >= .35 && y <= .5));
  }
  assert.equal(getDeadlyEnginePorts("raider_astral"), null);
});
