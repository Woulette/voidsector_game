import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMapEnemyLevelRange, getPortgunMapLevelRequirement, renderCombatMapPanel } from "../../src/game/ui/combatMapPanel.js";

test("combat map panel marks current map and counts active sectors", ()=>{
  const maps = [
    {name:"Helion-01", displayName:"Helion-01", portals:[{x:4500, y:0}]},
    {name:"CORE", displayName:"CORE", portals:[{x:-4500, y:0}]}
  ];

  const html = renderCombatMapPanel({
    maps,
    getCurrentMap:()=>maps[0]
  });

  assert.match(html, /<strong>Helion-01<\/strong>/);
  assert.match(html, /2\/21 secteurs actifs/);
  assert.match(html, /sector-map-node astra available current/);
  assert.match(html, /portal-dot right/);
  assert.match(html, /sector-core-node/);
  assert.match(html, /sector-map-links/);
  assert.match(html, /LV 1&ndash;4/);
  assert.match(html, /LV 5&ndash;9/);
  assert.match(html, /LV 10&ndash;14/);
  assert.match(html, /LV 15&ndash;19/);
  assert.match(html, /LV 20&ndash;24/);
  assert.match(html, /LV 25&ndash;34/);
  assert.match(html, /LV = NIVEAU DES ENNEMIS/);
  assert.doesNotMatch(html, /sector-map-routes/);
  assert.doesNotMatch(html, /Liaison nord/);
});

test("combat map enemy ranges prefer authoritative data and keep safe fallbacks", ()=>{
  assert.deepEqual(getMapEnemyLevelRange({name:"Helion-01", enemyLevel:[2, 6]}, 1), [2, 6]);
  assert.deepEqual(getMapEnemyLevelRange({name:"Helion-04", level:[15, 19]}, 4), [15, 19]);
  assert.deepEqual(getMapEnemyLevelRange(null, 3), [10, 14]);
  assert.deepEqual(getMapEnemyLevelRange({name:"CORE"}), [25, 34]);
});

test("combat map keeps crisp readable labels and draws routes inside the board", ()=>{
  const css = readFileSync(new URL("../../src/styles/game.css", import.meta.url), "utf8");
  assert.match(css, /\.sector-map-card\{[\s\S]*?font-family:"Segoe UI",Arial,sans-serif/);
  assert.match(css, /\.sector-map-node small,.sector-core-node small\{[\s\S]*?font-size:10px/);
  assert.match(css, /\.sector-map-links\{/);
  assert.doesNotMatch(css, /\.sector-map-routes\{/);
});

test("combat map panel escapes map display names", ()=>{
  const maps = [
    {name:"Nereid-01", displayName:"<script>alert(1)</script>"}
  ];

  const html = renderCombatMapPanel({
    maps,
    getCurrentMap:()=>maps[0]
  });

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("combat map panel locks Portgun destinations by map number", ()=>{
  const maps = [
    {id:"0", name:"Helion-01", displayName:"Helion-01"},
    {id:"1", name:"Helion-02", displayName:"Helion-02"},
    {id:"2", name:"Helion-03", displayName:"Helion-03"},
    {id:"3", name:"Helion-04", displayName:"Helion-04"},
    {id:"50", name:"CORE", displayName:"CORE"}
  ];

  assert.equal(getPortgunMapLevelRequirement(maps[2]), 5);
  assert.equal(getPortgunMapLevelRequirement(maps[3]), 10);
  assert.equal(getPortgunMapLevelRequirement(maps[4]), 0);

  const html = renderCombatMapPanel({
    maps,
    getCurrentMap:()=>maps[0],
    mode:"portgun",
    playerLevel:4
  });

  assert.match(html, /Selection Portgun/);
  assert.match(html, /data-portgun-target-map="1"/);
  assert.doesNotMatch(html, /data-portgun-target-map="2"/);
  assert.match(html, /LV 5/);
  assert.match(html, /data-portgun-target-map="50"/);
});
