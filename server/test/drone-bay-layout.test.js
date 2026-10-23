import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const renderer = fs.readFileSync(new URL("src/ui/renderDroneBay.js", root), "utf8");
const facade = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");
const app = fs.readFileSync(new URL("src/app.js", root), "utf8");
const droneCss = fs.readFileSync(new URL("src/styles/droneBay.css", root), "utf8");

test("the drone bay has a domain renderer, scoped responsive styling and eight standard tiles", ()=>{
  assert.match(facade, /import\s*\{\s*renderDroneSection\s*\}\s*from\s*"\.\/renderDroneBay/);
  assert.doesNotMatch(facade, /function renderDroneSlot\(|export function renderDroneSection\(/);
  assert.match(renderer, /drone-bay-layout ship-equipment-layout/);
  assert.match(renderer, /data-drone-slot-number="\$\{slot.index \+ 1\}"/);
  assert.match(renderer, /standardSlots\.map\(slot=>renderSlot\(slot, model\)\)/);
  assert.match(renderer, /specialSlots\.map\(slot=>renderSlot\(slot, model\)\)/);
  assert.match(droneCss, /#dashboard #droneSection/);
  assert.match(droneCss, /@media/);
  assert.match(droneCss, /\.drone-bay-grid/);
  assert.match(droneCss, /\.db-inventory-list/);
});

test("drone selection precedes legacy UID handlers while drag, sale and bulk hooks remain", ()=>{
  assert.ok(app.indexOf("if(handleDroneBayInteraction(") >= 0);
  assert.ok(app.indexOf("if(handleDroneBayInteraction(") < app.indexOf('const inventoryCard = e.target.closest("[data-inventory-uid]")'));
  assert.match(renderer, /data-inventory-uid="\$\{escapeHtml\(entry.uid\)\}"/);
  assert.match(renderer, /data-slot-uid="\$\{escapeHtml\(slot.uid\)\}" data-drop-part="drone" data-drop-index="\$\{slot.index\}"/);
  assert.match(renderer, /if\(event.target.closest\("\[data-slot-uid\]\[data-drop-part\]"\)\) return false/);
  assert.match(renderer, /data-inventory-sell="\$\{escapeHtml\(entry.uid\)\}"/);
  assert.doesNotMatch(renderer, /length:Math.max\(0, 40|drone ancestral/i);
});
