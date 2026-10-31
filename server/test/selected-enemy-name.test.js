import assert from "node:assert/strict";
import test from "node:test";
import { drawEnemies } from "../../src/game/render/entities.js";

test("a selected MMO enemy centers its name and level together on one line above its bars", ()=>{
  const texts = [];
  const ctx = new Proxy({
    canvas:{width:800, height:600},
    measureText:text=>({width:text.length * 7}),
    fillText:(text, x, y, maxWidth)=>texts.push({text, x, y, width:Math.min(text.length * 7, maxWidth ?? Infinity)}),
    createLinearGradient:()=>({addColorStop(){}}),
    createRadialGradient:()=>({addColorStop(){}})
  }, {get:(target, key)=>key in target ? target[key] : ()=>{}});
  const selected = {
    id:"pondeuse", kind:"pondeuse_astrale", type:"Pondeuse astrale", level:16,
    x:300, y:300, width:132, height:132, radius:54, angle:0,
    hp:40000, maxHp:45000, shield:30000, maxShield:30000
  };
  const other = {
    ...selected, id:"vorak", kind:"raider_astral", type:"Vorak rusher", x:600, recentHitTimer:1
  };
  drawEnemies({ctx, camera:{x:0, y:0}, cache:{}, enemies:[selected, other], selectedEnemy:selected});
  const name = texts.find(entry=>entry.text === "Pondeuse astrale");
  const level = texts.find(entry=>entry.text === "NIV 16");
  assert.ok(name);
  assert.ok(level);
  assert.equal(name.y, level.y);
  assert.ok(name.x + name.width < level.x);
  assert.equal((name.x + level.x + level.width) / 2, 300);
  assert.equal(texts.some(entry=>entry.text === "Vorak rusher"), false);
});
