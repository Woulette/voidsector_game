import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../src/styles/questRelay.css", import.meta.url),"utf8");
const panel = fs.readFileSync(new URL("../../src/game/ui/spawnPanel.js", import.meta.url),"utf8");

test("rare and red quest colors are visible before quest selection", ()=>{
  assert.match(panel,/quest\.rare \? "rare"/);
  assert.match(panel,/quest\.red \? "red"/);
  assert.match(css,/\.quest-strip\.rare\{[^}]*border-color/);
  assert.match(css,/\.quest-strip\.red\{[^}]*border-color/);
});
