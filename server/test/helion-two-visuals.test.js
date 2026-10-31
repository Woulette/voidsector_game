import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MAPS } from "../../src/game/combatData/maps.js";
import { HELION_ONE_ASSETS, createHelionOneVisualMaps } from "../../src/game/combatData/helionOneVisuals.js";
import { HELION_TWO_ASSETS, createHelionTwoVisualMaps } from "../../src/game/combatData/helionTwoVisuals.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { projectMapSceneryLayer } from "../../src/game/render/mapSceneryProjection.js";
import { getMapSceneryEdgeOpacity } from "../../src/game/render/mapSceneryBounds.js";
import { getMiniMapVisualDefinition } from "../../src/game/combatData/miniMapVisuals.js";
import { createMiniMapSnapshotMap, getMiniMapSceneryLayers } from "../../src/game/render/miniMapScenery.js";

const before=createHelionOneVisualMaps(MAPS),after=createHelionTwoVisualMaps(before);
const helion=after.find(map=>map.id===1),scene=helion.parallaxScene;

test("the industrial overlay preserves gameplay, Ricky, portals and every other approved map",()=>{
  const original=JSON.stringify(before);
  for(let i=0;i<before.length;i++){
    if(before[i].id!==1){assert.equal(after[i],before[i]);continue;}
    const {parallaxScene:oldScene,closeStarCount:oldStars,...oldData}=before[i];
    const {parallaxScene:newScene,closeStarCount:newStars,...newData}=after[i];
    assert.deepEqual(newData,oldData);
    for(const key of ["portals","closedPortals","questNpcs","enemyTypes"]){assert.equal(after[i][key],before[i][key]);}
    assert.ok(newStars<oldStars);assert.notEqual(newScene,oldScene);
  }
  assert.equal(JSON.stringify(before),original);
  assert.equal(createHelionTwoVisualMaps([{...helion,name:"Other-map"}])[0].parallaxScene,scene);
});

test("Helion-02 reuses the approved cloud textures with far, medium and sparse near planes",()=>{
  const clouds=[...scene.backdrops,...scene.images.filter(layer=>layer.kind==="cloud")];
  assert.ok(clouds.every(layer=>[HELION_ONE_ASSETS.nebula,HELION_ONE_ASSETS.dust].includes(layer.src)));
  assert.equal(scene.backdrops.length,5);
  assert.equal(clouds.filter(layer=>layer.p>.8).length,2);
  assert.ok(clouds.filter(layer=>layer.p<.15).every(layer=>layer.edgeFade===false));
  assert.ok(clouds.every(layer=>layer.alpha<=.24));
  for(let i=1;i<scene.images.length;i++){assert.ok(scene.images[i-1].p<=scene.images[i].p);}
});

test("separate solid industrial assets are streamed once and keep their baked orientation",()=>{
  const paths=getCombatMapAssetPaths(helion);
  assert.equal(paths.length,new Set(paths).size);
  for(const src of Object.values(HELION_TWO_ASSETS)){
    assert.ok(paths.includes(src),src);
    assert.ok(existsSync(fileURLToPath(new URL('../../'+src,import.meta.url))),src);
    const layer=scene.images.find(image=>image.src===src);
    assert.equal(layer.alpha,1);assert.ok(!layer.flipX&&!layer.flipY&&!layer.rotation);
  }
  const station=scene.images.find(layer=>layer.kind==="station");
  assert.ok(Math.abs(station.h/station.w-1145/1374)<1e-12);
  const wreck=scene.images.find(layer=>layer.kind==="wreck");
  assert.ok(station.w<600&&wreck.w<400,"Background structures must remain smaller than the former foreground-sized presentation");
  assert.equal(wreck.h/wreck.w,.5);
  assert.equal(scene.tiles.length,0);assert.equal(scene.asteroidFields.length,0);
});

test("planet, station, wreck and nearby dust retain distinct and resolution-independent camera speeds",()=>{
  const sample=["planet","station","wreck"].map(kind=>scene.images.find(layer=>layer.kind===kind));
  sample.push(scene.images.find(layer=>layer.kind==="cloud"&&layer.p>.8));
  for(const layer of sample){
    for(const [viewWidth,viewHeight] of [[1366,768],[1920,1080],[1680/.8,1000/.8]]){
      const project=camera=>projectMapSceneryLayer({layer,camera,viewWidth,viewHeight});
      const start=project({x:-1000,y:0}),end=project({x:0,y:500});
      assert.ok(Math.abs(end.x-start.x+1000*layer.p)<1e-9);
      assert.ok(Math.abs(end.y-start.y+500*layer.p)<1e-9);
    }
  }
  assert.ok(sample[0].p>=.06&&sample[0].p<=.08);
  assert.ok(sample[2].p<sample[1].p&&sample[1].p<sample.at(-1).p);
});

test("the adjusted composition separates the wreck from the station and removes the maintenance platform",()=>{
  const station=scene.images.find(layer=>layer.kind==="station"),wreck=scene.images.find(layer=>layer.kind==="wreck");
  const viewWidth=1680,viewHeight=1000;
  for(const pilot of [{x:-3820,y:940},{x:station.x,y:station.y}]){
    const camera={x:pilot.x-viewWidth/2,y:pilot.y-viewHeight/2};
    const a=projectMapSceneryLayer({layer:station,camera,viewWidth,viewHeight});
    const b=projectMapSceneryLayer({layer:wreck,camera,viewWidth,viewHeight});
    const horizontalGap=Math.abs(a.x-b.x)-(station.w+wreck.w)/2;
    const verticalGap=Math.abs(a.y-b.y)-(station.h+wreck.h)/2;
    assert.ok(Math.max(horizontalGap,verticalGap)>=100,"Projected hulls must leave a clear gap along the approach");
  }
  assert.ok(station.p>.27&&station.p<.5,"The station passes faster but keeps a background depth");
  assert.ok(!scene.images.some(layer=>layer.kind==="maintenance"));
  assert.ok(!getCombatMapAssetPaths(helion).some(src=>src.includes("maintenance-platform")));
});

test("the planet becomes slightly smaller and shifts down-left without changing its distant motion",()=>{
  const planet=scene.images.find(layer=>layer.kind==="planet"),definition=getMiniMapVisualDefinition(helion);
  assert.ok(planet.w>=700&&planet.w<850);assert.equal(planet.h,planet.w);
  assert.ok(planet.x<10500&&planet.x>=9000&&planet.y>-6500&&planet.y<=-5200);
  assert.equal(planet.p,.065);
  assert.ok(definition.landmarks.planet.width<.44);
  assert.ok(definition.landmarks.planet.x>.83&&definition.landmarks.planet.x<.92);
  assert.equal(definition.landmarks.planet.y,.23);
  assert.ok(definition.landmarks.station.width<=.15);
});

test("six small rock silhouettes are deterministic and leave portal and NPC anchors unobstructed",()=>{
  const rocks=scene.images.filter(layer=>layer.kind==="asteroid");
  assert.ok(rocks.length>=180&&rocks.length<=230);
  assert.equal(new Set(rocks.map(rock=>`${rock.frame.x}:${rock.frame.y}`)).size,6);
  const landmarks=[...helion.portals,...helion.closedPortals,...helion.questNpcs];
  for(const rock of rocks){
    assert.ok(rock.w>=24&&rock.w<=80&&rock.p>=.34&&rock.p<=.93);
    assert.ok(Math.abs(rock.x)+rock.w/2<helion.width/2);
    assert.ok(Math.abs(rock.y)+rock.h/2<helion.height/2);
    assert.ok(landmarks.every(point=>Math.hypot(rock.x-point.x,rock.y-point.y)>=320));
  }
  assert.deepEqual(createHelionTwoVisualMaps(before).find(map=>map.id===1).parallaxScene,scene);
});

test("decor fades at the map borders while far sky and the planet are not abruptly clipped",()=>{
  assert.equal(scene.clipToBounds,false);assert.equal(scene.showBoundary,false);
  assert.deepEqual(scene.skyFade,{inside:900,outside:120});
  for(const [x,y] of [[-5200,0],[5200,0],[0,-4200],[0,4200]]){
    assert.equal(getMapSceneryEdgeOpacity({map:helion,x,y,width:90,height:90}),0);
  }
  assert.equal(scene.images.find(layer=>layer.kind==="planet").edgeFade,undefined);
});

test("the fixed overview retains only its two landmarks, with separate live NPC and portal markers",()=>{
  const definition=getMiniMapVisualDefinition(helion),snapshot=createMiniMapSnapshotMap(helion);
  assert.equal(definition,getMiniMapVisualDefinition(helion));
  assert.ok(getCombatMapAssetPaths(helion).includes(definition.image));
  assert.deepEqual(getMiniMapSceneryLayers(scene).map(layer=>layer.kind),["planet","station"]);
  assert.equal(snapshot.parallaxScene.images.length,2);assert.deepEqual(snapshot.portals,[]);assert.deepEqual(snapshot.questNpcs,[]);
  for(const layer of snapshot.parallaxScene.images){
    const placement=definition.landmarks[layer.kind];
    assert.equal(layer.x,(placement.x-.5)*helion.width);assert.equal(layer.y,(placement.y-.5)*helion.height);
    assert.equal(layer.w,placement.width*helion.width);assert.equal(layer.p,1);
  }
  const png=readFileSync(fileURLToPath(new URL('../../'+definition.image,import.meta.url)));
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1200,540]);
  assert.equal(getMiniMapVisualDefinition(MAPS.find(map=>map.name==="Nereid-02")).image,"assets/maps/minimaps/nereid-02-wide-v1.png");
});
