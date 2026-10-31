import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Live Server ignores persistent server data", async ()=>{
  const settingsUrl = new URL("../../.vscode/settings.json", import.meta.url);
  const settings = JSON.parse(await readFile(settingsUrl, "utf8"));
  const ignoredFiles = settings["liveServer.settings.ignoreFiles"];

  assert.equal(settings["liveServer.settings.port"], 8765);
  assert.equal(settings["liveServer.settings.host"], "127.0.0.1");
  assert.equal(settings["liveServer.settings.root"], "/");
  assert.equal(settings["liveServer.settings.showOnStatusbar"], true);
  assert.ok(Array.isArray(ignoredFiles));
  assert.ok(ignoredFiles.includes("tmp/**"));
  assert.ok(ignoredFiles.includes("server/data/**"));
});

test("workspace startup keeps the local backend in watch mode", async ()=>{
  const tasksUrl = new URL("../../.vscode/tasks.json", import.meta.url);
  const extensionsUrl = new URL("../../.vscode/extensions.json", import.meta.url);
  const tasks = JSON.parse(await readFile(tasksUrl, "utf8")).tasks;
  const extensions = JSON.parse(await readFile(extensionsUrl, "utf8")).recommendations;
  const backendTask = tasks.find(task=>task.label === "VoidSector: backend local (watch)");

  assert.equal(backendTask?.command, "npm run dev");
  assert.equal(backendTask?.options?.cwd, "${workspaceFolder}/server");
  assert.equal(backendTask?.runOptions?.runOn, "folderOpen");
  assert.equal(backendTask?.runOptions?.instanceLimit, 1);
  assert.ok(extensions.includes("ritwickdey.liveserver"));
});

test("Git ignores every JSON runtime data store", async ()=>{
  const gitignoreUrl = new URL("../../.gitignore", import.meta.url);
  const rules = (await readFile(gitignoreUrl, "utf8"))
    .split(/\r?\n/)
    .map(line=>line.trim())
    .filter(Boolean);

  assert.ok(rules.includes("server/data/**"), "every runtime data file must stay untracked");
  for(const file of [
    "server/data/accounts.json",
    "server/data/betaPurchases.jsonl",
    "server/data/firmWar.json",
    "server/data/profiles.json",
    "server/data/sessions.json"
  ]){
    assert.ok(
      rules.includes(file) || rules.includes("server/data/**"),
      `${file} must not be committed`
    );
  }
});
