import assert from "node:assert/strict";
import test from "node:test";
import { getPortalRespawnActionCopy } from "../../src/game/systems/combatDeathRespawn.js";

test("portal death action is named Continue with Deadly-specific respawn details", ()=>{
  assert.deepEqual(
    getPortalRespawnActionCopy({mapId:"portal-ricky"}),
    {label:"Continuer", detail:"Point d'entrée - 100% PV"}
  );
  assert.deepEqual(
    getPortalRespawnActionCopy({mapId:"portal-blue"}),
    {label:"Continuer", detail:"Position de mort - 50% PV"}
  );
});
