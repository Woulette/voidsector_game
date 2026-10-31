import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { WORLD_MODELS_3D } from "../../src/data/worldModels3d.js";
import { ORB_VISUAL_PROFILES } from "../../src/game/combatData/orbVisuals.js";
import { VORAK_VISUAL_PROFILES } from "../../src/game/combatData/vorakVisuals.js";
import { Box3, Matrix4, Quaternion, Vector3 } from "../../vendor/three-r187/three.module.js";

for(const [id,budget] of [["headquarters",32000],["quests",16000],["commerce",16000],["drone_pirate",14000],["raider_astral",14000]]){
  test(`${id} is a complete, volumetric, locally hosted model within its sector budget`, ()=>{
    const url=new URL(WORLD_MODELS_3D[id].url);url.search="";
    const data=readFileSync(url);
    assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(8),data.length);
    const length=data.readUInt32LE(12),gltf=JSON.parse(data.toString("utf8",20,20+length));
    assert(gltf.buffers.every(buffer=>!buffer.uri));
    assert(gltf.images.every(image=>Number.isInteger(image.bufferView)));
    const triangles=gltf.meshes.flatMap(mesh=>mesh.primitives).reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0);
    assert(triangles>1000 && triangles<=budget,`${triangles} triangles`);
    assert(data.length<13*1024*1024,"runtime model download must stay bounded");
    const positions=gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
    const extent=positions.max.map((max,index)=>max-positions.min[index]);
    assert(Math.min(...extent)>Math.max(...extent)*.015,"model must have actual thickness");
    const metadata=JSON.parse(readFileSync(new URL("model.json",url),"utf8"));
    const name=url.pathname.split("/").at(-1);
    assert.equal(metadata.files[name].sha256,createHash("sha256").update(data).digest("hex"));
    assert.equal(metadata.runtimeTriangles,triangles);
    const reference=ORB_VISUAL_PROFILES[id]?.sprite || VORAK_VISUAL_PROFILES[id]?.sprite;
    if(reference){
      assert.equal(metadata.reference,reference,"3D enemies must use the currently approved art, not historical catalogue images");
      const bounds=new Box3();
      function visit(index,parent){
        const node=gltf.nodes[index];
        const local=node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
          new Vector3().fromArray(node.translation || [0,0,0]),new Quaternion().fromArray(node.rotation || [0,0,0,1]),new Vector3().fromArray(node.scale || [1,1,1]));
        const world=parent.clone().multiply(local);
        if(node.mesh !== undefined) for(const primitive of gltf.meshes[node.mesh].primitives){
          const position=gltf.accessors[primitive.attributes.POSITION];
          bounds.union(new Box3(new Vector3().fromArray(position.min),new Vector3().fromArray(position.max)).applyMatrix4(world));
        }
        for(const child of node.children || []) visit(child,world);
      }
      for(const node of gltf.scenes[gltf.scene || 0].nodes) visit(node,new Matrix4());
      const size=bounds.getSize(new Vector3());
      if(id === "drone_pirate"){
        assert(size.y>Math.max(size.x,size.z)*.6,"Orb must have a spherical body instead of a flattened disc");
        assert(gltf.nodes.some(node=>node.name === "Orb_spherical_body"),"retain the actual spherical nucleus");
      }else assert(size.y<Math.max(size.x,size.z)*.45,"Vorak hull must lie on the flight plane, not stand upright");
    }
  });
}
