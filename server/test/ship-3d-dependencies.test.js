import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,existsSync } from "node:fs";
import { applyShipSurface } from "../../src/game/render/ship3dSurface.js";
import { getShipModel3d } from "../../src/data/shipModels3d.js";

test("the shipped 3D renderers include every relative static and lazy module dependency", ()=>{
  const queue=["ship3dAssets.js","ship3dRenderer.js","world3dRenderer.js"].map(name=>new URL("../../src/game/render/"+name,import.meta.url));
  const checked=new Set();
  while(queue.length){
    const url=queue.pop();url.search="";url.hash="";
    if(checked.has(url.href)) continue;
    assert(existsSync(url),`Missing shipped 3D dependency: ${url.href}`);
    checked.add(url.href);
    const source=readFileSync(url,"utf8");
    for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+\.js(?:\?[^"']*)?)["']/g)){
      queue.push(new URL(match[1],url));
    }
  }
  assert([...checked].some(url=>url.endsWith("/ship3dSurface.js")));
});

test("the shared surface helper preserves Orion's approved colours, normals and metallic texture", ()=>{
  const map={},normalMap={},metalnessMap={},color={r:1,g:.7,b:.3};
  const material={map,color,normalMap,metalnessMap,roughnessMap:{},normalScale:{multiplyScalar(value){this.value=value;}}};
  applyShipSurface(material,getShipModel3d({id:"orion"}).surface);
  assert.equal(material.map,map);assert.equal(material.color,color);
  assert.equal(material.normalMap,normalMap);assert.equal(material.metalnessMap,metalnessMap);
  assert.equal(material.envMapIntensity,.35);assert.equal(material.normalScale.value,.12);assert.equal(material.roughness,.58);
});
