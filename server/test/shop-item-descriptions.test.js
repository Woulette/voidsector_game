import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { equipment } from "../../src/data/equipment.js";
import { ships } from "../../src/data/ships.js";

const root = new URL("../../", import.meta.url);

test("every equipment item and ship has its own shop description", ()=>{
  for(const entry of [...equipment, ...ships]){
    assert.equal(typeof entry.desc, "string", `${entry.id} description`);
    assert.ok(entry.desc.trim().length >= 30, `${entry.id} description is too short`);
  }
});

test("shop removes instructional header copy and generic slot sentences", ()=>{
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/renderShop.js", root), "utf8");

  assert.doesNotMatch(html, /Une boutique mieux rangée/);
  assert.doesNotMatch(html, /Achète plus vite/);
  assert.doesNotMatch(html, /shopSectionSubtitle/);
  assert.doesNotMatch(renderSource, /meta\.subtitle/);
  assert.doesNotMatch(renderSource, /Peut être équipé dans un slot/);
  assert.match(renderSource, /<p class="shop-detail-copy">\$\{item\.desc\}<\/p>/);
  assert.match(renderSource, /<p class="shop-detail-copy">\$\{ship\.desc\}<\/p>/);
});
