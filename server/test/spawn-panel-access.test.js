import assert from "node:assert/strict";
import test from "node:test";

import { canOpenSpawnPanelMode, renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";

test("refinery, crafting and commerce panels remain available outside friendly firm services", ()=>{
  assert.equal(canOpenSpawnPanelMode("refinery", false), true);
  assert.equal(canOpenSpawnPanelMode("crafting", false), true);
  assert.equal(canOpenSpawnPanelMode("commerce", false), true);
});

test("firm-local quest panels keep their existing access restriction", ()=>{
  assert.equal(canOpenSpawnPanelMode("quests", false), false);
  assert.equal(canOpenSpawnPanelMode("quests", true), true);
});

test("commerce renders sales disabled outside the player's firm zones", ()=>{
  const rendered = renderSpawnPanelContent({
    mode:"commerce",
    materials:[{
      id:"cuivre_orbital",
      name:"Cuivre orbital",
      kind:"raw",
      img:"assets/materials/cuivre_orbital.svg"
    }],
    shipCargo:{cuivre_orbital:10},
    shipCargoUsed:10,
    shipCargoCapacity:100,
    commerceSaleAllowed:false
  });

  assert.match(rendered.html, /data-commerce-open="cuivre_orbital" disabled/);
  assert.match(rendered.html, /uniquement dans les zones de ta firme/);
});
