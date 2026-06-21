import assert from "node:assert/strict";
import test from "node:test";
import { FIRMS, getCanonicalMapName, getFirmMapName } from "../../src/data/firms.js";
import { questCatalog } from "../../src/data/progression.js";
import { MAPS } from "../../src/game/combatData.js";
import { WORLD_MAPS } from "../src/world/definitions.js";

const LEGACY_MAP_NAME = /\b(?:ASTRA|CYAN|JAUNE|VERTE)-\d{2}\b/i;

function questVisibleStrings(quest){
  const strings = [quest.title, quest.desc, quest.giver];
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  for(const objective of objectives.filter(Boolean)){
    strings.push(objective.label, objective.zone, objective.map);
    if(Array.isArray(objective.zones)) strings.push(...objective.zones);
  }
  return strings.filter(value=>typeof value === "string");
}

test("all firm maps use their canonical Helion, Nereid, Aureon and Sylva names", ()=>{
  const expectedNames = FIRMS.flatMap(firm=>
    [1, 2, 3, 4, 5].map(number=>getFirmMapName(firm.id, number))
  );
  const clientNames = MAPS.filter(map=>map.name !== "CORE").map(map=>map.name);
  const serverNames = Object.values(WORLD_MAPS).filter(map=>map.name !== "CORE").map(map=>map.name);

  assert.deepEqual(new Set(clientNames), new Set(expectedNames));
  assert.deepEqual(new Set(serverNames), new Set(expectedNames));
});

test("legacy map aliases resolve to canonical names without remaining visible", ()=>{
  assert.equal(getCanonicalMapName("ASTRA-05"), "Helion-05");
  assert.equal(getCanonicalMapName("CYAN-01"), "Nereid-01");
  assert.equal(getCanonicalMapName("JAUNE-01"), "Aureon-01");
  assert.equal(getCanonicalMapName("VERTE-01"), "Sylva-01");
});

test("quests and portal labels never expose legacy map names", ()=>{
  for(const quest of questCatalog){
    for(const value of questVisibleStrings(quest)){
      assert.equal(LEGACY_MAP_NAME.test(value), false, `${quest.id}: ${value}`);
    }
  }
  for(const map of MAPS){
    for(const portal of map.portals || (map.portal ? [map.portal] : [])){
      assert.equal(LEGACY_MAP_NAME.test(String(portal.displayLabel || portal.label || "")), false);
    }
  }
});
