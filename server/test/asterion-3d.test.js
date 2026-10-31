import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getShipModel3d } from "../../src/data/shipModels3d.js";
import { drawShipModel3d, prepareShipModel3d, getShipModel3dStatus } from "../../src/game/render/ship3d.js";
import { normalizeGameSettings, GRAPHICS_PRESET_EFFECTS } from "../../src/core/settingsSchema.js";

test("the shipped Asterion is a complete volumetric GLB within the first-ship triangle budget", ()=>{
  const definition = getShipModel3d({id:"asterion"});
  const buffer = readFileSync(new URL(definition.url));
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const length = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + length));
  assert.equal(gltf.asset.version, "2.0");
  assert(gltf.buffers.every(buffer=>!buffer.uri), "geometry must be embedded for offline/self-hosted loading");
  assert(gltf.images.every(image=>Number.isInteger(image.bufferView)), "textures must be embedded");
  let triangles = 0;
  for(const mesh of gltf.meshes){
    for(const primitive of mesh.primitives){
      triangles += gltf.accessors[primitive.indices].count / 3;
      assert(Number.isInteger(primitive.attributes.NORMAL));
    }
  }
  assert(triangles > 1000 && triangles <= 20000);
  const position = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const extents = position.max.map((max,index)=>max-position.min[index]);
  assert(Math.min(...extents) > Math.max(...extents) * .03, "the hull must have actual thickness");
  assert(gltf.materials.some(material=>material.normalTexture && material.pbrMetallicRoughness?.metallicRoughnessTexture));
});

test("unsupported ships, disabled 3D and non-browser use retain the original sprite path", async ()=>{
  const ship = {id:"asterion"};
  const player = {x:10,y:20,angle:.4,hp:150,shield:20};
  const before = {...player};
  const args = {ctx:{drawImage(){throw new Error("3D should not draw");}},camera:{x:0,y:0},player,ship,position:{x:10,y:20}};
  assert.equal(drawShipModel3d({...args,enabled:false}), false);
  assert.equal(drawShipModel3d({...args,ship:{id:"orion"}}), false);
  assert.equal(await prepareShipModel3d(ship), false);
  assert.equal(getShipModel3dStatus(ship), "idle");
  assert.equal(getShipModel3dStatus({id:"orion"}), "unavailable");
  assert.deepEqual(player,before);
});

test("legacy graphics settings enable available 3D hulls while low and manual-off retain 2D", ()=>{
  assert.equal(normalizeGameSettings({}).graphics.effects.shipModels3d,true);
  assert.equal(GRAPHICS_PRESET_EFFECTS.low.shipModels3d,false);
  assert.equal(GRAPHICS_PRESET_EFFECTS.medium.shipModels3d,true);
  assert.equal(normalizeGameSettings({graphics:{preset:"custom",effects:{shipModels3d:false}}}).graphics.effects.shipModels3d,false);
});
