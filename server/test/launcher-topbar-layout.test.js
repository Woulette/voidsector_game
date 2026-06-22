import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);

test("launcher pilot card exposes identity, progression and play time", ()=>{
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");

  assert.match(html, /id="pilotName"/);
  assert.match(html, /id="pilotRankLabel"/);
  assert.match(html, /id="levelText"/);
  assert.match(html, /id="pilotPlayTime"/);
  assert.match(html, /id="xpText"/);
  assert.match(renderSource, /pilotPlayTime\.textContent = formatDuration\(state\.player\.totalPlaySeconds\)/);
});

test("launcher navigation keeps wrapped rows tightly grouped", ()=>{
  const styles = fs.readFileSync(new URL("src/styles/base.css", root), "utf8");
  assert.match(styles, /\.top-nav\{[^}]*align-content:center;[^}]*row-gap:6px;/);
});
