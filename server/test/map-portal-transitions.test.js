import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";

function portalList(map){
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

test("the server accepts every map portal declared by the client", ()=>{
  const failures = [];

  for(const map of MAPS){
    for(const portal of portalList(map)){
      if(portal.targetMap == null) continue;
      const previous = {
        x:portal.x,
        y:portal.y,
        angle:0,
        hp:5000,
        maxHp:5000,
        shield:0,
        maxShield:0,
        vx:0,
        vy:0,
        enginePower:0,
        engineAngle:0,
        mapId:String(map.id),
        shipId:"orion",
        updatedAt:1000
      };
      const profile = createDefaultProfile();
      const firmPrefix = String(map.name || "ASTRA").split("-")[0].toLowerCase();
      if(["astra", "cyan", "jaune", "verte"].includes(firmPrefix)) profile.player.firmId = firmPrefix;
      const result = validatePlayerState({
        player:{id:"portal-transition-audit", mapId:String(map.id), groupId:null, state:previous},
        profile,
        groups:new Map(),
        now:5000,
        payload:{
          ...previous,
          mapId:String(portal.targetMap),
          x:portal.targetX,
          y:portal.targetY
        }
      });

      if(String(result.state.mapId) !== String(portal.targetMap)){
        failures.push(`${map.name} -> ${portal.label || portal.targetMap}: ${result.reason}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});
