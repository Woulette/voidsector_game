import test from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../../src/game/combatData/maps.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { isPointInWorldSafeArea } from "../src/world/spawn.js";
import { createCombatWorldStateSystem } from "../../src/game/systems/combatWorldState.js";
import { createTutorialWorldGuidance } from "../../src/game/systems/tutorialWorldGuidance.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { installHelionOneHub } from "../../src/shared/helionOneHub.js";
import { getFirmHomeMapTheme } from "../../src/shared/firmHomeMapThemes.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function fixture(mapId = 0, firmId = "astra"){
  const currentMap = MAPS.find(map=>map.id === mapId);
  const state = {currentMap,gameMode:"open",player:{...currentMap.spawn,safeZoneLock:0},
    running:true,firmId,camera:{x:0,y:0,zoom:1}};
  const system = createCombatWorldStateSystem({
    store:{state:{player:{firmId}}},mapList:MAPS,getState:()=>state,
    setState:patch=>Object.assign(state,patch)
  });
  return {state,system};
}

test("Helion services remain clickable with badges removed and no old invisible targets", ()=>{
  const {system} = fixture();
  assert.deepEqual(system.getSpawnStations().map(({id,x,y})=>({id,x,y})),[
    {id:"quests",x:-3660,y:2610},{id:"commerce",x:-4920,y:2610}
  ]);
  for(const station of system.getSpawnStations()){
    assert.equal(system.getStationAt(station)?.id,station.id);
    assert.equal(station.marker,null);
  }
  assert.equal(system.getStationAt({x:-4900,y:3000}),null);
  assert.equal(system.getStationAt({x:-3700,y:3000}),null);
  assert.equal(system.getStationAt({x:-3380,y:3440}),null);
  assert.equal(system.getStationAt({x:-3540,y:2387}),null);
  assert.equal(system.getStationAt({x:-4920,y:2332}),null);
});

test("client and server protect hub approaches within the map and agree on quest-relay position", ()=>{
  const {system,state} = fixture();
  assert.deepEqual(state.currentMap.spawn.safeRect,WORLD_MAPS["0"].spawn.safeRect);
  assert.deepEqual(state.currentMap.questStations,WORLD_MAPS["0"].questStations);
  for(const station of system.getSpawnStations()){
    assert.ok(station.x > -state.currentMap.width / 2 && station.x < state.currentMap.width / 2);
    assert.ok(station.y > -state.currentMap.height / 2 && station.y < state.currentMap.height / 2);
    for(const [dx,dy] of [[-station.radius,0],[0,0],[station.radius,0],[0,-station.radius],[0,station.radius]]){
      const point={x:Math.max(-state.currentMap.width / 2,station.x+dx),y:station.y+dy};
      Object.assign(state.player,point);
      assert.equal(system.isSafeModeActive(),true);
      assert.equal(isPointInWorldSafeArea(point,WORLD_MAPS["0"]),true);
    }
  }
  assert.equal(isPointInWorldSafeArea({x:0,y:0},WORLD_MAPS["0"]),false);
});

test("tutorial targets use the installed centers of both services", ()=>{
  const {system,state} = fixture();
  const guidance=createTutorialWorldGuidance({getState:()=>state,maps:MAPS,
    getStations:()=>system.getSpawnStations(),getViewport:()=>({left:0,top:0,right:1880,bottom:1080})});
  for(const station of system.getSpawnStations()){
    const target=guidance.getTutorialSnapshot({type:"station",id:station.id}).target;
    assert.equal(target.x,station.x);
    assert.equal(target.y,station.y);
  }
});

test("other sectors retain their layout, and foreign/portal service interactions stay unavailable", ()=>{
  for(const map of MAPS.filter(map=>!getFirmHomeMapTheme(map))){
    const before=structuredClone(map);
    assert.equal(installHelionOneHub(map),map);
    assert.deepEqual(map,before);
    assert.equal(map.spawn?.visual,undefined);
  }
  for(const [id,firmId,x,y] of [[20,"cyan",-4300,-3300],[30,"jaune",4300,-3300],[40,"verte",4300,3300]]){
    const {system}=fixture(id,firmId);
    const quest=system.getSpawnStations().find(station=>station.id === "quests");
    assert.equal(quest.x,x+(x>0?-640:640));
    assert.equal(quest.y,y+(y>0?-690:690));
  }
  assert.deepEqual(fixture(0,"cyan").system.getSpawnStations(),[]);
  const portal=fixture();portal.state.gameMode="portal";
  assert.deepEqual(portal.system.getSpawnStations(),[]);
  assert.deepEqual(portal.system.getVisibleSpawnStations(),[]);
});

test("all pilots see the same services but only their own firm can select them or gain protection", ()=>{
  const firms=["astra","cyan","jaune","verte"];
  for(const map of MAPS.filter(getFirmHomeMapTheme)){
    const owner=getFirmHomeMapTheme(map).palette;
    for(const visitor of firms){
      const {system}=fixture(map.id,visitor);
      assert.equal(system.getVisibleSpawnStations(),map.spawnStations);
      assert.deepEqual(system.getVisibleSpawnStations().map(station=>station.id),["quests","commerce"]);
      if(visitor === owner){
        assert.equal(system.getSpawnStations(),map.spawnStations);
        for(const station of map.spawnStations) assert.equal(system.getStationAt(station),station);
      }else{
        assert.deepEqual(system.getSpawnStations(),[]);
        assert.deepEqual(system.getSafeAreas(),[]);
        for(const station of map.spawnStations) assert.equal(system.getStationAt(station),null);
      }
    }
  }
});

test("all three hub textures are streamed with each home sector and exist on disk", ()=>{
  for(const map of MAPS.filter(getFirmHomeMapTheme)){
    const hub=getCombatMapAssetPaths(map).filter(path=>path.includes("helion01-crown-v1"));
    assert.equal(hub.length,3);
    for(const path of hub) assert.ok(existsSync(fileURLToPath(new URL('../../'+path.split('?')[0],import.meta.url))));
  }
  for(const map of MAPS.filter(map=>!getFirmHomeMapTheme(map))){
    assert.equal(getCombatMapAssetPaths(map).some(path=>path.includes("helion01-crown-v1")),false);
  }
});

test("loading another module version keeps the correctly themed home hubs isolated", async ()=>{
  const second=await import("../../src/game/combatData/maps.js?hub-reload-check");
  assert.notEqual(second.MAPS,MAPS);
  for(const map of second.MAPS.filter(getFirmHomeMapTheme)){
    assert.deepEqual(map.spawn,MAPS.find(entry=>entry.id === map.id).spawn);
    assert.deepEqual(map.spawnStations,MAPS.find(entry=>entry.id === map.id).spawnStations);
  }
  for(const map of second.MAPS.filter(map=>!getFirmHomeMapTheme(map))){
    assert.equal(map.spawn?.visual,undefined);
    assert.equal(map.spawnStations,undefined);
  }
});

test("all four hubs agree with server protection, service clicks and tutorial guidance", ()=>{
  for(const [mapId,firmId] of [[0,"astra"],[20,"cyan"],[30,"jaune"],[40,"verte"]]){
    const {system,state}=fixture(mapId,firmId), map=state.currentMap, serverMap=WORLD_MAPS[String(mapId)];
    assert.deepEqual(map.spawn.safeRect,serverMap.spawn.safeRect);
    assert.deepEqual(map.questStations,serverMap.questStations);
    const guidance=createTutorialWorldGuidance({getState:()=>state,maps:MAPS,
      getStations:()=>system.getSpawnStations(),getViewport:()=>({left:0,top:0,right:1920,bottom:1080})});
    for(const station of system.getSpawnStations()){
      assert.equal(system.getStationAt(station)?.id,station.id);
      const target=guidance.getTutorialSnapshot({type:"station",id:station.id}).target;
      assert.equal(target.x,station.x); assert.equal(target.y,station.y);
      for(const [dx,dy] of [[0,0],[-station.radius,0],[station.radius,0],[0,-station.radius],[0,station.radius]]){
        const point={x:Math.max(-map.width/2,Math.min(map.width/2,station.x+dx)),
          y:Math.max(-map.height/2,Math.min(map.height/2,station.y+dy))};
        Object.assign(state.player,point);
        assert.equal(system.isSafeModeActive(),true,`${map.name} ${station.id}`);
        assert.equal(isPointInWorldSafeArea(point,serverMap),true);
      }
    }
    assert.equal(isPointInWorldSafeArea({x:0,y:0},serverMap),false);
  }
});
