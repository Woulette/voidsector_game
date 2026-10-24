import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MAPS} from "../../src/game/combatData/maps.js";
import {createHelionOneVisualMaps} from "../../src/game/combatData/helionOneVisuals.js";
import {createHelionTwoVisualMaps} from "../../src/game/combatData/helionTwoVisuals.js";
import {createFirmSectorTwoVisualMaps} from "../../src/game/combatData/firmSectorTwoVisuals.js";
import {getMiniMapVisualDefinition} from "../../src/game/combatData/miniMapVisuals.js";
import {createMiniMapSnapshotMap} from "../../src/game/render/miniMapScenery.js";
import {getCombatMapAssetPaths} from "../../src/game/combatAssets.js";

const maps=createFirmSectorTwoVisualMaps(createHelionTwoVisualMaps(createHelionOneVisualMaps(MAPS)));
const sectors=[{id:21,name:"Nereid-02",planet:[.88,.77],station:[.28,.56],palette:"cyan"},
  {id:31,name:"Aureon-02",planet:[.12,.77],station:[.72,.56],palette:"jaune"},
  {id:41,name:"Sylva-02",planet:[.12,.23],station:[.72,.44],palette:"verte"}];

for(const sector of sectors){
  test(`${sector.name} has a fixed wide atlas and correctly placed independent landmarks`,()=>{
    const map=maps.find(entry=>entry.id===sector.id),definition=getMiniMapVisualDefinition(map);
    assert.equal(definition,getMiniMapVisualDefinition(map));
    assert.deepEqual([definition.landmarks.planet.x,definition.landmarks.planet.y],sector.planet);
    assert.deepEqual([definition.landmarks.station.x,definition.landmarks.station.y],sector.station);
    assert.equal(definition.landmarks.planet.width,.38);assert.equal(definition.landmarks.station.width,.14);
    assert.ok(definition.atmosphere.src.endsWith(`mapPalette=${sector.palette}`));
    const png=readFileSync(new URL("../../"+definition.image,import.meta.url));
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1200,540]);
    assert.equal(getCombatMapAssetPaths(map).filter(src=>src===definition.image).length,1);
    const snapshot=createMiniMapSnapshotMap(map);
    assert.deepEqual(snapshot.portals,[]);assert.deepEqual(snapshot.questNpcs,[]);assert.deepEqual(snapshot.closedPortals,[]);
    assert.deepEqual(snapshot.parallaxScene.images.map(layer=>layer.kind),["planet","station"]);
    for(const landmark of snapshot.parallaxScene.images){assert.equal(landmark.p,1);assert.equal(landmark.space,"world");}
  });
}

test("industrial overviews require the exact sector identity and leave other sector numbers untouched",()=>{
  for(const sector of sectors){
    assert.equal(getMiniMapVisualDefinition({id:sector.id,name:"Other-sector"}),null);
    assert.equal(getMiniMapVisualDefinition({id:sector.id+1,name:sector.name.replace("02","03")}),null);
  }
  assert.equal(getMiniMapVisualDefinition(maps.find(map=>map.id===1)).image,"assets/maps/minimaps/helion-02-wide-v3.png");
  assert.equal(getMiniMapVisualDefinition(maps.find(map=>map.id===0)).image,"assets/maps/minimaps/helion-01-wide-v3.png");
});
