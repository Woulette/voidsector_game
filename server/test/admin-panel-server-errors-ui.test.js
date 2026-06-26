import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPanelSource = readFileSync(new URL("../../src/ui/adminPanel.js", import.meta.url), "utf8");
const socketCommandsSource = readFileSync(new URL("../../src/multiplayer/socketCommands.js", import.meta.url), "utf8");
const adminCssSource = readFileSync(new URL("../../src/styles/admin.css", import.meta.url), "utf8");

test("admin panel renders recent server runtime errors from the snapshot", ()=>{
  assert.match(socketCommandsSource, /requestAdminSync\(\{profileLimit = 0, auditLimit = 50, errorLimit = 30\}/);
  assert.match(socketCommandsSource, /"admin:sync", \{profileLimit, auditLimit, errorLimit\}/);
  assert.match(adminPanelSource, /requestAdminSync\(\{profileLimit:0, auditLimit:50, errorLimit:30\}\)/);
  assert.match(adminPanelSource, /function renderServerErrors\(snapshot\)/);
  assert.match(adminPanelSource, /snapshot\?\.serverErrors/);
  assert.match(adminPanelSource, /data-admin-server-error/);
  assert.match(adminPanelSource, /renderServerErrors\(snapshot\)/);
  assert.match(adminCssSource, /\.admin-server-error-list/);
});
