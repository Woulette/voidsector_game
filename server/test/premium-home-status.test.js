import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);

test("launcher displays a live premium status only for active subscriptions", ()=>{
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");
  const appSource = fs.readFileSync(new URL("src/app.js", root), "utf8");
  const styles = fs.readFileSync(new URL("src/styles/base.css", root), "utf8");

  assert.match(html, /id="launcherPremiumStatus"[^>]*class="launcher-premium-status hidden"/);
  assert.match(html, /<div class="start-admin-stack">[\s\S]*id="startGameBtn"[\s\S]*id="adminDock"[\s\S]*id="launcherPremiumStatus"/);
  assert.match(html, /data-premium-home-remaining/);
  assert.match(renderSource, /isPremiumActive\(store\.state\?\.player, now\)/);
  assert.match(renderSource, /status\.classList\.toggle\("hidden", !active\)/);
  assert.match(renderSource, /premiumRemainingLabel\(store\.state\.player, now\)/);
  assert.match(appSource, /if\(appMode === "launcher"\) renderPremiumHomeStatus\(\)/);
  assert.match(styles, /\.launcher-premium-status\{/);
  assert.doesNotMatch(styles, /\.top-nav-stack\{/);
});
