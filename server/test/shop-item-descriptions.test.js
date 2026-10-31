import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { equipment } from "../../src/data/equipment.js";
import { ships } from "../../src/data/ships.js";
import { buildShopCatalog } from "../../src/ui/shopCatalog.js";
import { createShopProductModel } from "../../src/ui/shopProductModel.js";
import { renderShopDetailMarkup } from "../../src/ui/shopMarkup.js";

const root = new URL("../../", import.meta.url);

test("every equipment item and ship has its own shop description", ()=>{
  for(const entry of [...equipment, ...ships]){
    assert.equal(typeof entry.desc, "string", `${entry.id} description`);
    assert.ok(entry.desc.trim().length >= 30, `${entry.id} description is too short`);
  }
});

test("shop removes instructional header copy and generic slot sentences", ()=>{
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/shopMarkup.js", root), "utf8");

  assert.doesNotMatch(html, /Une boutique mieux rangée/);
  assert.doesNotMatch(html, /Achète plus vite/);
  assert.doesNotMatch(html, /shopSectionSubtitle/);
  assert.doesNotMatch(renderSource, /meta\.subtitle/);
  assert.doesNotMatch(renderSource, /Peut être équipé dans un slot/);
  for(const product of buildShopCatalog().filter(p=>p.kind === "item" || p.kind === "ship")){
    const html = renderShopDetailMarkup(createShopProductModel(product));
    const copy = html.match(/<p class="shop-detail-copy">(.*?)<\/p>/)?.[1];
    assert.ok(copy, `${product.id} visible description`);
    assert.equal(copy.replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&"),product.data.desc);
  }
});
