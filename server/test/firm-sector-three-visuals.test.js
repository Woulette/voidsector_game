import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {MAPS, getMapPortals, getClosedMapPortals} from "../../src/game/combatData/maps.js";
import {createHelionThreeScene, createHelionThreeVisualMaps, HELION_THREE_ASSETS} from "../../src/game/combatData/helionThreeVisuals.js";
import {createFirmSectorThreeVisualMaps, getFirmSectorThreeTheme} from "../../src/game/combatData/firmSectorThreeVisuals.js";
import {getFirmHomeMapTheme, getMapAssetPalette, getMapPaletteSource} from "../../src/shared/firmHomeMapThemes.js";
import {applyMapPalettePixels} from "../../src/game/render/mapAssetPalette.js";
import {FIRM_SECTOR_THREE_ASSETS, SECTOR_THREE_SHARED_ASSETS} from "../../src/game/combatData/firmSectorThreeAssets.js";
import {getMiniMapVisualDefinition} from "../../src/game/combatData/miniMapVisuals.js";
import {createMiniMapSnapshotMap} from "../../src/game/render/miniMapScenery.js";
import {projectMapSceneryLayer} from "../../src/game/render/mapSceneryProjection.js";
import {getCombatMapAssetPaths, createCombatMapAssetCache} from "../../src/game/combatAssets.js";
import {buildMapState} from "../../src/game/systems/mapState.js";

const before=createHelionThreeVisualMaps(MAPS),after=createFirmSectorThreeVisualMaps(before);
const sectors=after.filter(getFirmSectorThreeTheme);
const violetSources=new Set(Object.values(SECTOR_THREE_SHARED_ASSETS));

test("sector-three themes use the existing firm colours and require the exact ID and name",()=>{
  assert.deepEqual(sectors.map(map=>map.name),["Nereid-03","Aureon-03","Sylva-03"]);
  for(const map of sectors){
    const theme=getFirmSectorThreeTheme(map),home=getFirmHomeMapTheme(MAPS.find(entry=>entry.id===map.id-2));
    for(const key of ["palette","hue","hueRange","background","lights"])assert.deepEqual(theme[key],home[key]);
    assert.equal(getFirmSectorThreeTheme({...map,id:String(map.id)}),theme);
    for(const input of [{...map,id:map.id+1},{...map,name:map.name.toLowerCase()},{...map,name:"Helion-03"}]){
      assert.equal(getFirmSectorThreeTheme(input),null);
      assert.equal(createFirmSectorThreeVisualMaps([input])[0],input);
    }
    assert.deepEqual(createFirmSectorThreeVisualMaps([before.find(entry=>entry.id===map.id)])[0],map);
  }
  assert.equal(getFirmSectorThreeTheme(null),null);
});

test("the overlay changes scenery only and preserves Helion and every other map by reference",()=>{
  const snapshot=JSON.stringify(before);createFirmSectorThreeVisualMaps(before);assert.equal(JSON.stringify(before),snapshot);
  for(let index=0;index<before.length;index++){
    const original=before[index],map=after[index];
    if(!getFirmSectorThreeTheme(map)){assert.equal(map,original);continue;}
    for(const key of Object.keys(original).filter(key=>!["parallaxScene","closeStarCount"].includes(key)))assert.equal(map[key],original[key],`${map.name}: ${key}`);
    assert.equal(map.closeStarCount,420);assert.equal(getMapPortals(map),getMapPortals(original));
    assert.deepEqual(getClosedMapPortals(map),getClosedMapPortals(original));
    assert.deepEqual(buildMapState(map).state.enemies,buildMapState(original).state.enemies);
  }
});

test("the approved planet, ruins, clouds and all debris retain their placement, shape and depth",()=>{
  for(const map of sectors){
    const scene=map.parallaxScene,reference=before.find(entry=>entry.id===2).parallaxScene;
    for(const group of ["backdrops","images","starLights"]){
      assert.equal(scene[group].length,reference[group].length);
      for(let index=0;index<scene[group].length;index++){
        const {src,colors,...actual}=scene[group][index];
        const {src:originalSrc,colors:originalColors,...expected}=reference[group][index];
        assert.deepEqual(actual,expected,`${map.name}: ${group} ${index}`);
      }
    }
    assert.equal(scene.images.filter(layer=>layer.kind==="star").length,4);
    assert.equal(scene.images.filter(layer=>layer.kind==="distant-asteroid").length,40);
    assert(scene.images.filter(layer=>layer.kind.includes("asteroid")).every(layer=>layer.alpha===1));
  }
});

test("shared silhouettes and firm materials leave no untreated warm asset outside the violet pocket",()=>{
  for(const map of sectors){
    const scene=map.parallaxScene,reference=createHelionThreeScene(map),theme=getFirmSectorThreeTheme(map);
    for(const group of ["backdrops","images"]){
      for(const layer of scene[group]){
        if(["cloud","dustbank","nebula"].includes(layer.kind)){
          assert.equal(getMapAssetPalette(layer.src)?.palette,theme.palette);
          assert.equal(!!getMapAssetPalette(layer.src)?.sourcePocket,layer.kind==="nebula");
        }else if(layer.kind==="violet-gas"){
          assert.equal(layer.src,SECTOR_THREE_SHARED_ASSETS.violetGas);
        }else if(layer.kind==="star"){
          const referenceSvg=readFileSync(HELION_THREE_ASSETS.star,"utf8").replace(/#[0-9a-f]{6}/gi,"COLOR");
          const actualSvg=readFileSync(layer.src,"utf8").replace(/#[0-9a-f]{6}/gi,"COLOR");
          assert.equal(actualSvg,referenceSvg,"stars share every path and opacity stop");
        }else if(!violetSources.has(layer.src)){
          assert.equal(getMapAssetPalette(layer.src)?.palette,theme.palette,layer.src);
        }
      }
    }
    assert.deepEqual(scene.starLights.slice(1),reference.starLights.slice(1));
    assert.deepEqual(scene.starLights[0].colors,theme.lights);
    assert.deepEqual(scene.background,theme.background);
    assert(!JSON.stringify(scene).includes("255,235,215"));
    assert.equal(scene.images.find(layer=>layer.kind==="ruin").src,theme.assets.ruin);
    assert.equal(scene.images.find(layer=>layer.kind==="planet").src,theme.assets.planet);
  }
});

test("gas keeps Helion's exact alpha, detail, settings and source structure",()=>{
  for(const map of sectors){
    const scene=map.parallaxScene,reference=createHelionThreeScene(map);
    for(const group of ["backdrops","images"]){
      for(let i=0;i<scene[group].length;i++){
        const layer=scene[group][i],original=reference[group][i];
        if(!["cloud","dustbank","nebula","violet-gas"].includes(layer.kind))continue;
        assert.equal(getMapPaletteSource(layer.src),original.src);
        const {src,...settings}=layer,{src:referenceSrc,...referenceSettings}=original;
        assert.deepEqual(settings,referenceSettings);
      }
    }
  }
  // Exercise the material conversion at every opacity: no new opaque cloud,
  // no red fringe, and no change to white detail or the original violet light.
  for(const map of sectors){
    for(const src of [getFirmSectorThreeTheme(map).assets.nebula,getFirmSectorThreeTheme(map).assets.mainNebula]){
      const theme=getMapAssetPalette(src),pixels=new Uint8ClampedArray(256*12);
      for(let a=0;a<256;a++)pixels.set([190,55,45,a,210,210,210,a,145,55,220,a],a*12);
      const original=pixels.slice();applyMapPalettePixels(pixels,theme.hue,theme.hueRange);
      for(let a=0;a<256;a++){
        const i=a*12;assert.equal(pixels[i+3],a);
        assert.deepEqual(pixels.slice(i+4,i+12),original.slice(i+4,i+12));
        if(a)assert.notDeepEqual(pixels.slice(i,i+3),original.slice(i,i+3));
      }
    }
  }
});

test("the violet gas, emissive cracks and their pulse remain shared independently of the firm",()=>{
  let reference;
  for(const map of sectors){
    const scene=map.parallaxScene;
    const gas=scene.backdrops.find(layer=>layer.kind==="violet-gas");
    assert.equal(gas.src,SECTOR_THREE_SHARED_ASSETS.violetGas);
    assert.deepEqual(gas.lightPulse,{period:20,amplitude:.04});
    const crystals=scene.images.filter(layer=>["crystal","eclanite-shard","eclanite-emission"].includes(layer.kind));
    assert(crystals.every(layer=>violetSources.has(layer.src)));
    const nebula=scene.backdrops.find(layer=>layer.kind==="nebula");
    assert.equal(nebula.src,getFirmSectorThreeTheme(map).assets.mainNebula);
    assert.deepEqual(gas,createHelionThreeScene(map).backdrops.find(layer=>layer.kind==="violet-gas"));
    const value={gas,crystals,halos:scene.starLights.slice(1)};
    if(reference)assert.deepEqual(value,reference);else reference=value;
  }
});

test("all raster layers use Helion's exact source silhouette and atlas framing",()=>{
  const reference=before.find(map=>map.id===2).parallaxScene;
  for(const map of sectors){
    for(const group of ["backdrops","images"]){
      for(let i=0;i<reference[group].length;i++){
        const original=reference[group][i],layer=map.parallaxScene[group][i];
        if(layer.kind==="star")continue;
        assert.equal(getMapPaletteSource(layer.src),original.src,`${map.name} ${layer.kind} ${i}`);
        assert.deepEqual(layer.frame,original.frame);
      }
    }
  }
  const paths=new Set(Object.values(FIRM_SECTOR_THREE_ASSETS).flatMap(Object.values));
  for(const src of paths){
    const source=getMapPaletteSource(src),bytes=readFileSync(new URL("../../"+source,import.meta.url));
    if(!source.endsWith(".png"))continue;
    assert.equal(bytes.toString("ascii",1,4),"PNG",src);
    assert.equal(bytes[25],6,`${src}: RGBA`);
    if(src.includes("asteroids"))assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1536,1024]);
  }
});

test("camera motion retains the approved parallax and outside-map fade",()=>{
  for(const map of sectors){
    const scene=map.parallaxScene;
    assert.deepEqual(scene.skyFade,{inside:900,outside:120});assert.equal(scene.clipToBounds,false);
    for(const [kind,p] of [["planet",.09],["ruin",.22]]){
      const layer=scene.images.find(entry=>entry.kind===kind);assert.equal(layer.p,p);
      const project=camera=>projectMapSceneryLayer({layer,camera,viewWidth:1920,viewHeight:1080});
      const a=project({x:-960,y:-540}),b=project({x:40,y:-40});
      assert(Math.abs(b.x-a.x+1000*p)<1e-9);assert(Math.abs(b.y-a.y+500*p)<1e-9);
    }
  }
});

test("fixed minimaps keep the same central landmarks and full-colour 1200 by 540 atlases",()=>{
  const reference=getMiniMapVisualDefinition(before.find(map=>map.id===2));
  for(const map of sectors){
    const definition=getMiniMapVisualDefinition(map),snapshot=createMiniMapSnapshotMap(map);
    assert.equal(getMiniMapVisualDefinition({...map}),definition);
    assert.deepEqual(definition.landmarks,reference.landmarks);
    assert.equal(definition.atmosphere.src,getFirmSectorThreeTheme(map).assets.nebula);
    assert.deepEqual(snapshot.parallaxScene.images.map(layer=>layer.kind),["nebula","dustbank","violet-gas","planet"]);
    assert.equal(snapshot.parallaxScene.images.find(layer=>layer.kind==="violet-gas").src,SECTOR_THREE_SHARED_ASSETS.violetGas);
    assert.equal(snapshot.parallaxScene.skyFade,null);assert.deepEqual(snapshot.portals,[]);
    const data=readFileSync(new URL("../../"+definition.image,import.meta.url));
    assert.deepEqual([data.readUInt32BE(16),data.readUInt32BE(20)],[1200,540]);
    assert.equal(getMiniMapVisualDefinition({...map,name:map.name+"-instance"}),null);
  }
});

test("sector streaming reuses native sources and common violet assets with a three-map bound",()=>{
  const previous=globalThis.Image,loaded=[];
  globalThis.Image=class{complete=true;naturalWidth=1;naturalHeight=1;set src(value){this.url=value;loaded.push(value);}};
  try{
    const cache={},assets=createCombatMapAssetCache({cache,maxMaps:3});
    let sharedGas;
    for(const map of sectors){
      const paths=assets.activate(map);assert.equal(paths.length,new Set(paths).size);
      for(const src of paths){assert(!src.includes("/output/"));assert(existsSync(new URL("../../"+getMapPaletteSource(src),import.meta.url)),src);}
      const gas=cache[SECTOR_THREE_SHARED_ASSETS.violetGas];
      if(sharedGas)assert.equal(gas,sharedGas);else sharedGas=gas;
      const count=loaded.length;assets.activate(map);assert.equal(loaded.length,count);
    }
    for(const src of violetSources)if(!getMapAssetPalette(src))assert.equal(loaded.filter(path=>path===src).length,1,src);
    assert(loaded.every(path=>!path.includes("mapPalette=")&&!path.includes("mapPocket=")),"HTTP requests use the native source URL");
    assets.activate(before.find(map=>map.id===2));assert.equal(assets.getRetainedMapKeys().length,3);
    assert(!assets.getRetainedMapKeys().includes("22"));assets.clear();assert.deepEqual(Object.keys(cache),[]);
  }finally{globalThis.Image=previous;}
});
