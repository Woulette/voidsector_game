import test from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../../src/game/combatData/maps.js";
import { createHelionOneVisualMaps } from "../../src/game/combatData/helionOneVisuals.js";
import { createHelionTwoScene, createHelionTwoVisualMaps } from "../../src/game/combatData/helionTwoVisuals.js";
import { createFirmSectorTwoVisualMaps, getFirmSectorTwoTheme } from "../../src/game/combatData/firmSectorTwoVisuals.js";
import { getFirmHomeMapTheme, getMapAssetPalette, getMapPaletteSource } from "../../src/shared/firmHomeMapThemes.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { projectMapSceneryLayer } from "../../src/game/render/mapSceneryProjection.js";

const before = createHelionTwoVisualMaps(createHelionOneVisualMaps(MAPS));
const after = createFirmSectorTwoVisualMaps(before);
const sectors = after.filter(getFirmSectorTwoTheme);
const reference = before.find(map=>map.name === "Helion-02").parallaxScene;

test("sector-two themes require both the exact canonical ID and name, including isolated loads", ()=>{
  assert.equal(sectors.length, 3);
  for(const map of sectors){
    const theme = getFirmSectorTwoTheme(map);
    const home = before.find(entry=>entry.id === map.id - 1);
    const homeTheme = getFirmHomeMapTheme(home);
    for(const key of ["palette", "mirrorX", "mirrorY", "hue", "hueRange", "lights", "background"]){
      assert.deepEqual(theme[key], homeTheme[key]);
    }
    assert.equal(getFirmSectorTwoTheme({...map, id:String(map.id)}), theme);
    assert.equal(getFirmSectorTwoTheme({...map, id:map.id + 1}), null);
    assert.equal(getFirmSectorTwoTheme({...map, name:map.name.toLowerCase()}), null);
    assert.equal(getFirmSectorTwoTheme({...map, name:"Helion-02"}), null);
    assert.equal(getFirmHomeMapTheme(map), null, "home-sector lookup must remain restricted to 01");
    assert.deepEqual(createFirmSectorTwoVisualMaps([before.find(entry=>entry.id === map.id)])[0], map);
  }
  assert.equal(getFirmSectorTwoTheme(null), null);
  assert.equal(getFirmSectorTwoTheme({id:2, name:"Helion-03"}), null);
});

test("the visual overlay preserves every gameplay field by reference and leaves all other maps identical", ()=>{
  const snapshot = JSON.stringify(before);
  const result = createFirmSectorTwoVisualMaps(before);
  for(let index = 0; index < before.length; index++){
    const original = before[index], map = result[index];
    if(!getFirmSectorTwoTheme(original)){
      assert.equal(map, original);
      continue;
    }
    assert.notEqual(map, original);
    assert.notEqual(map.parallaxScene, original.parallaxScene);
    assert.equal(map.closeStarCount, 420);
    for(const key of Object.keys(original).filter(key=>!["parallaxScene", "closeStarCount"].includes(key))){
      assert.equal(map[key], original[key], `${map.name}: ${key}`);
    }
    assert.deepEqual(Object.keys(map), Object.keys(original));
    assert.equal(map.width, 10000); assert.equal(map.height, 8000);
    assert.equal(map.enemyCount, 40); assert.deepEqual(map.enemyLevel, [5,9]);
  }
  assert.equal(JSON.stringify(before), snapshot);
});

test("exporting Helion's existing scene factory keeps its approved scene unchanged", ()=>{
  const helion = before.find(map=>map.name === "Helion-02");
  assert.deepEqual(createHelionTwoScene(helion), reference);
});

test("illustrations reflect their anchors and palette while retaining the approved orientation and native size", ()=>{
  for(const map of sectors){
    const theme = getFirmSectorTwoTheme(map), scene = map.parallaxScene;
    assert.deepEqual(scene.background, theme.background);
    for(const group of ["backdrops", "images", "starLights"]){
      assert.equal(scene[group].length, reference[group].length, `${map.name}: ${group}`);
      for(let index = 0; index < scene[group].length; index++){
        const original = reference[group][index], layer = scene[group][index];
        assert.equal(layer.x, original.x * theme.mirrorX);
        assert.equal(layer.y, original.y * theme.mirrorY);
        for(const key of ["kind", "effect", "space", "w", "h", "p", "alpha", "rotation", "flipX", "flipY", "frame", "filter", "edgeFade", "minimap"]){
          assert.deepEqual(layer[key], original[key], `${map.name}: ${group} ${key}`);
        }
        if(original.src){
          assert.equal(getMapPaletteSource(layer.src), original.src);
          assert.equal(getMapAssetPalette(layer.src)?.palette, theme.palette);
        }
      }
    }
    assert.equal(scene.images.find(layer=>layer.kind === "station").w, 540);
    assert.equal(scene.images.find(layer=>layer.kind === "wreck").w, 350);
    assert.equal(scene.images.find(layer=>layer.kind === "planet").w, 750);
  }
});

test("new sectors retain the far planet, medium industrial hulls and sparse close dust camera speeds", ()=>{
  for(const map of sectors){
    const scene = map.parallaxScene;
    for(const [kind, p] of [["planet", .065], ["wreck", .16], ["station", .36]]){
      const layer = scene.images.find(layer=>layer.kind === kind);
      assert.equal(layer.p, p); assert.equal(layer.alpha, 1);
      for(const [viewWidth, viewHeight] of [[1366,768], [1920,1080], [1680/.8,1000/.8]]){
        const project = camera=>projectMapSceneryLayer({layer, camera, viewWidth, viewHeight});
        const start = project({x:-1000,y:0}), end = project({x:0,y:500});
        assert.ok(Math.abs(end.x-start.x+1000*p)<1e-9);
        assert.ok(Math.abs(end.y-start.y+500*p)<1e-9);
      }
    }
    const clouds = [...scene.backdrops, ...scene.images.filter(layer=>layer.kind === "cloud")];
    assert.equal(scene.backdrops.length, 5);
    assert.equal(clouds.filter(layer=>layer.p>.8).length, 2);
    assert.ok(clouds.every(layer=>layer.alpha<=.24));
    assert.ok(clouds.filter(layer=>layer.p<.15).every(layer=>layer.edgeFade===false));
    for(let index = 1; index < scene.images.length; index++) assert.ok(scene.images[index-1].p<=scene.images[index].p);
  }
});

test("lights use each sector's palette and the approved border and graphics-option settings remain intact", ()=>{
  for(const map of sectors){
    const theme = getFirmSectorTwoTheme(map), scene = map.parallaxScene;
    assert.equal(scene.starLights.length, 2);
    for(const light of scene.starLights){
      assert.deepEqual(light.colors, theme.lights);
      assert.equal(light.static, true); assert.equal(light.point, false);
    }
    assert.equal(scene.clipToBounds, false); assert.equal(scene.showBoundary, false);
    assert.equal(scene.edgeFadeDistance, 460); assert.equal(scene.vignetteOpacity, .42);
    assert.deepEqual(scene.skyFade, {inside:900,outside:120});
    for(const key of ["nebulae", "dustSpecks", "lightClouds", "foregroundClouds", "glowSpots", "tiles", "asteroidFields"]){
      assert.deepEqual(scene[key], []);
    }
    assert.ok(scene.images.filter(layer=>layer.kind === "asteroid").every(layer=>layer.effect === "backgroundAsteroids"));
    assert.ok(scene.images.filter(layer=>layer.kind === "cloud").every(layer=>layer.effect === "nebulae"));
  }
});

test("deterministic asteroid silhouettes leave each sector's real portals and Ricky anchors clear", ()=>{
  for(const map of sectors){
    const rocks = map.parallaxScene.images.filter(layer=>layer.kind === "asteroid");
    const navigation = [...map.portals, ...map.closedPortals, ...map.questNpcs];
    assert.ok(rocks.length>=180 && rocks.length<=230);
    assert.equal(new Set(rocks.map(rock=>`${rock.frame.x}:${rock.frame.y}`)).size, 6);
    for(const rock of rocks){
      assert.ok(rock.w>=24 && rock.w<=80 && rock.p>=.34 && rock.p<=.93);
      assert.ok(Math.abs(rock.x)+rock.w/2<map.width/2);
      assert.ok(Math.abs(rock.y)+rock.h/2<map.height/2);
      assert.ok(navigation.every(point=>Math.hypot(rock.x-point.x, rock.y-point.y)>=320), `${map.name}: navigation clearance`);
    }
  }
  assert.deepEqual(createFirmSectorTwoVisualMaps(before), after);
});

test("scattering reflects actual navigation points rather than reusing Helion's original navigation", ()=>{
  for(const map of sectors){
    const original = before.find(entry=>entry.id === map.id);
    const rock = map.parallaxScene.images.find(layer=>layer.kind === "asteroid" && Math.abs(layer.x)<2500 && Math.abs(layer.y)<2500);
    assert.ok(rock);
    for(const key of ["portals", "closedPortals", "questNpcs"]){
      const navigation = [{id:"new-navigation-anchor", x:rock.x, y:rock.y}];
      const input = {...original, [key]:navigation};
      const result = createFirmSectorTwoVisualMaps([input])[0];
      assert.equal(result[key], navigation);
      assert.ok(result.parallaxScene.images.filter(layer=>layer.kind === "asteroid")
        .every(layer=>Math.hypot(layer.x-rock.x, layer.y-rock.y)>=320), `${map.name}: ${key}`);
    }
  }
});

test("palette-qualified assets keep the original HTTP source and avoid the retired maintenance platform", ()=>{
  for(const map of sectors){
    const paths = getCombatMapAssetPaths(map);
    assert.equal(paths.length, new Set(paths).size);
    assert.ok(paths.some(src=>src.includes("helion02-industrial-v1/orbital-station.webp?mapPalette=")));
    assert.ok(paths.some(src=>src.includes("helion02-industrial-v1/derelict-freighter.webp?mapPalette=")));
    assert.ok(!paths.some(src=>src.includes("maintenance-platform")));
  }
});
