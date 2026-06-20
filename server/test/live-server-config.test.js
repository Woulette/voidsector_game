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

test("Git ignores every JSON runtime data store", async ()=>{
  const gitignoreUrl = new URL("../../.gitignore", import.meta.url);
  const rules = (await readFile(gitignoreUrl, "utf8"))
    .split(/\r?\n/)
    .map(line=>line.trim())
    .filter(Boolean);

  for(const file of [
    "server/data/accounts.json",
    "server/data/firmWar.json",
    "server/data/profiles.json",
    "server/data/sessions.json"
  ]){
    assert.ok(rules.includes(file), `${file} must not be committed`);
  }
});
