import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("combat boost quantities use the non-blocking in-game dialog", ()=>{
  const bindings = fs.readFileSync(path.join(root, "src/game/ui/inputBindings.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const panel = fs.readFileSync(path.join(root, "src/game/ui/spawnPanel.js"), "utf8");

  assert.equal(bindings.includes("windowRef.prompt"), false);
  assert.match(bindings, /openBoostDepositDialog/);
  assert.match(bindings, /data-boost-deposit-confirm/);
  assert.match(html, /id="combatBoostDepositLayer"/);
  assert.match(html, /data-boost-deposit-range/);
  assert.match(html, /data-boost-deposit-preset="max"/);
  assert.match(panel, /data-boost-material-amount=/);
});
