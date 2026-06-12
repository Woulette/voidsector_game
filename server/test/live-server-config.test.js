import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Live Server ignores persistent server data", async ()=>{
  const settingsUrl = new URL("../../.vscode/settings.json", import.meta.url);
  const settings = JSON.parse(await readFile(settingsUrl, "utf8"));
  const ignoredFiles = settings["liveServer.settings.ignoreFiles"];

  assert.ok(Array.isArray(ignoredFiles));
  assert.ok(ignoredFiles.includes("server/data/**"));
});
