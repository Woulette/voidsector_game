import assert from "node:assert/strict";
import test from "node:test";
import { Euler, OrthographicCamera, Vector3 } from "../../vendor/three-r187/three.module.js";
import { configureWorld3dCamera, worldPointToScene } from "../../src/game/render/world3dProjection.js";
import { getShipFlightPose, projectShipFlightPoint } from "../../src/game/render/ship3dProjection.js";

function project(point,camera,width,height){
  const vector=new Vector3(point.x,point.y,point.z).project(camera);
  return {x:(vector.x+1)*width/2,y:(1-vector.y)*height/2};
}

test("the 3D sector preserves map click anchors through camera pan, zoom, and depth", ()=>{
  for(const zoom of [.7,1,1.6,2.5]){
    const view={x:-4610,y:2980,width:1365,height:769,zoom};
    const camera=new OrthographicCamera(-1,1,1,-1,.1,30000);
    configureWorld3dCamera(camera,view);
    for(const x of [-5000,-4300,0,4300]) for(const y of [-3300,3300,4000]) for(const height of [-6000,-100,0,300]){
      const actual=project(worldPointToScene({x,y,height}),camera,view.width,view.height);
      assert(Math.abs(actual.x-(x-view.x)*zoom)<1e-8);
      assert(Math.abs(actual.y-(y-view.y)*zoom)<1e-8);
    }
  }
});

test("shared-scene ship poses match the approved independent flight view pixel for pixel", ()=>{
  const view={x:-4610,y:2980,width:1365,height:769,zoom:1.6};
  const camera=new OrthographicCamera(-1,1,1,-1,.1,30000);
  configureWorld3dCamera(camera,view);
  const position={x:-4300,y:3300},anchor=worldPointToScene(position),size=132;
  for(const angle of [-2.2,-Math.PI/2,0,.7,Math.PI/2,Math.PI]) for(const roll of [-.52,0,.52]){
    const pose=getShipFlightPose({angle,roll});
    for(const point of [{x:.3,y:.4,height:.1},{x:0,y:-.5,height:0},{x:-.4,y:.35,height:-.08}]){
      const vector=new Vector3(point.x,point.height,point.y).applyEuler(new Euler(pose.pitch,0,pose.roll)).applyEuler(new Euler(0,pose.yaw,0)).multiplyScalar(size);
      const actual=project({x:anchor.x+vector.x,y:anchor.y+vector.y,z:anchor.z+vector.z},camera,view.width,view.height);
      const offset=projectShipFlightPoint(point,pose);
      assert(Math.abs(actual.x-(position.x-view.x+offset.x*size)*view.zoom)<1e-8);
      assert(Math.abs(actual.y-(position.y-view.y+offset.y*size)*view.zoom)<1e-8);
    }
  }
});
