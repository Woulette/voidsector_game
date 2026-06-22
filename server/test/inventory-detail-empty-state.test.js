import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);

test("inventory detail panel is absent until an object is selected", ()=>{
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");

  assert.doesNotMatch(renderSource, /Aucun objet sélectionné/);
  assert.doesNotMatch(renderSource, /Sélectionne un équipement/);
  assert.match(renderSource, /\$\{selectedDetail \? `<section class="selected-item-panel">/);
});

test("clicking an equipped slot selects its inventory item for the shared detail panel", ()=>{
  const appSource = fs.readFileSync(new URL("src/app.js", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");

  assert.match(appSource, /closest\("\[data-slot-uid\]\[data-drop-part\]"\)/);
  assert.match(appSource, /const uid = equippedSlotCard\.dataset\.slotUid/);
  assert.match(appSource, /selectInventoryItemForDetail\(uid\)/);
  assert.match(renderSource, /store\.selectedInventoryUid === uid/);
});
