import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);

test("ship detail displays final live stats without comparison gauges", ()=>{
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");
  const styles = fs.readFileSync(new URL("src/styles/hangar.css", root), "utf8");

  assert.match(html, /id="selectedShipStats" class="ship-live-stats"/);
  assert.match(renderSource, /getShipCombatStats\(ship\.id\)/);
  assert.match(renderSource, /Vie actuelle/);
  assert.match(renderSource, /Bouclier actuel/);
  assert.match(renderSource, /Vitesse actuelle/);
  assert.match(renderSource, /Soute actuelle/);
  assert.match(renderSource, /loadout\.lasers\.filter\(Boolean\)\.length/);
  assert.doesNotMatch(renderSource, /Avec équipement/);
  assert.doesNotMatch(renderSource, /maxShipStat/);
  assert.match(styles, /\.ship-live-primary\{/);
});
