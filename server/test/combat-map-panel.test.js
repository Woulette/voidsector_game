import assert from "node:assert/strict";
import test from "node:test";
import { renderCombatMapPanel } from "../../src/game/ui/combatMapPanel.js";

test("combat map panel marks current map and counts active sectors", ()=>{
  const maps = [
    {name:"ASTRA-01", displayName:"Helion-01", portals:[{x:4500, y:0}]},
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
});

test("combat map panel escapes map display names", ()=>{
  const maps = [
    {name:"CYAN-01", displayName:"<script>alert(1)</script>"}
  ];

  const html = renderCombatMapPanel({
    maps,
    getCurrentMap:()=>maps[0]
  });

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});
