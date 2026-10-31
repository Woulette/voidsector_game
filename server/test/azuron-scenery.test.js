import assert from "node:assert/strict";
import test from "node:test";
import {createAzuronPortalMap, AZURON_SCENERY_ASSETS} from "../../src/game/combatData/azuronVisuals.js";
import {createMiniMapSceneryRenderer, getMiniMapSceneryLayers} from "../../src/game/render/miniMapScenery.js";

function context(){
  const calls = [];
  const ctx = {calls, createLinearGradient:()=>({addColorStop(){}})};
  for(const method of ["save", "restore", "translate", "scale", "rotate", "setTransform", "clearRect", "fillRect", "drawImage"]){
    ctx[method] = (...args)=>calls.push({method, args});
  }
  return ctx;
}

test("Azuron minimap draws separate refractor atlas cells and retains its background when the pilot moves", ()=>{
  const map = createAzuronPortalMap({name:"Le Seuil d’Azuron"});
  const pieces = getMiniMapSceneryLayers(map.parallaxScene);
  assert.equal(pieces.length, 2);
  const atlas = {complete:true, naturalWidth:1200, naturalHeight:1200};
  const arch = {complete:true, naturalWidth:1200, naturalHeight:1200};
  const surfaces = [];
  const draw = createMiniMapSceneryRenderer({createCanvas(width, height){
    const ctx = context();
    const surface = {width, height, getContext:()=>ctx};
    surfaces.push({ctx, surface}); return surface;
  }});
  const options = {ctx:context(), currentMap:map, cache:{[AZURON_SCENERY_ASSETS.refractors]:atlas, [AZURON_SCENERY_ASSETS.arch]:arch},
    rect:{x:0, y:0, w:360, h:180}, camera:{x:0, y:0}};
  assert.equal(draw(options), true);
  const draws = surfaces[0].ctx.calls.filter(call=>call.method === "drawImage");
  assert.equal(draws.length, 2);
  assert.equal(draws[0].args.length, 5, "the standalone arch keeps its complete image");
  assert.equal(draws[0].args[0], arch);
  const framed = draws[1].args;
  assert.equal(framed.length, 9, "atlas frames require source and destination rectangles");
  assert.equal(framed[0], atlas);
  assert.deepEqual(framed.slice(1, 5), [600, 0, 600, 600]);
  const before = surfaces[0].ctx.calls.length;
  draw({...options, camera:{x:2500, y:-1700}});
  assert.equal(surfaces[0].ctx.calls.length, before, "moving the pilot must not repaint or move the overview");
});
