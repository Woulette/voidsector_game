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

test("CORE exposes four bidirectional portals to each firm map five", ()=>{
  const core = MAPS.find(map=>map.name === "CORE");
  const expected = [
    {mapName:"Helion-05", corePoint:{x:-4300, y:0}, mapPoint:{x:0, y:-3300}},
    {mapName:"Nereid-05", corePoint:{x:0, y:-3300}, mapPoint:{x:4300, y:0}},
    {mapName:"Aureon-05", corePoint:{x:4300, y:0}, mapPoint:{x:0, y:3300}},
    {mapName:"Sylva-05", corePoint:{x:0, y:3300}, mapPoint:{x:-4300, y:0}}
  ];

  assert.ok(core);
  assert.equal(portalList(core).length, 4);

  for(const link of expected){
    const map = MAPS.find(entry=>entry.name === link.mapName);
    assert.ok(map, link.mapName);
    assert.ok(portalList(core).some(portal=>
      String(portal.targetMap) === String(map.id)
      && portal.x === link.corePoint.x
      && portal.y === link.corePoint.y
      && portal.targetX === link.mapPoint.x
      && portal.targetY === link.mapPoint.y
    ), `CORE -> ${link.mapName}`);
    assert.ok(portalList(map).some(portal=>
      String(portal.targetMap) === String(core.id)
      && portal.x === link.mapPoint.x
      && portal.y === link.mapPoint.y
      && portal.targetX === link.corePoint.x
      && portal.targetY === link.corePoint.y
    ), `${link.mapName} -> CORE`);
  }
});
