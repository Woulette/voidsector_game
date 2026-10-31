import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;

test("the combat entry point loads the current loot controller even with a cached legacy cargo URL", ()=>{
  const orchestratorPath = "/src/game/combatOrchestrator.js";
  const source = readFileSync(new URL(orchestratorPath.slice(1), root), "utf8");
  const specifier = source.match(/import\s*\{\s*createCombatCargoSystem\s*\}\s*from\s*["']([^"']+)["']/)?.[1];
  assert.ok(specifier, "exercise the import used by the real combat entry point");
  const requested = new URL(specifier, `https://avosoma.invalid${orchestratorPath}`);
  const requestedPath = requested.pathname + requested.search;
  const currentTarget = imports["/src/game/systems/combatCargo.js"];
  assert.ok(currentTarget?.includes("?v="), "the cargo controller must have a versioned cache target");
  assert.equal(imports[requestedPath] || requestedPath, currentTarget,
    "the exact versioned import must bypass the pre-animation cached module; unversioned aliases do not match query strings");
  const currentSource = readFileSync(new URL(requested.pathname.slice(1), root), "utf8");
  assert.match(currentSource, /createLootCollectionController/);
});
