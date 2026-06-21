import assert from "node:assert/strict";
import test from "node:test";
import { getPortgunMapLevelRequirement, renderCombatMapPanel } from "../../src/game/ui/combatMapPanel.js";

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
