import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);

test("ship detail stats use the same featured label-value layout as equipment", ()=>{
  const source = fs.readFileSync(new URL("src/ui/renderShop.js", root), "utf8");

  for(const label of ["VIE", "VITESSE", "CARGO", "LASERS", "GÉNÉRATEURS", "EXTRAS", "SPÉCIAL"]){
    assert.ok(source.includes(`\`${label} `), `${label} detail line`);
  }
  assert.match(source, /shop-detail-stat featured/);
});
