import assert from "node:assert/strict";
import test from "node:test";
import { Euler, OrthographicCamera, Vector3 } from "../../vendor/three-r187/three.module.js";
import { getShipFlightPose, projectShipEnginePorts, projectShipFlightPoint, SHIP_FLIGHT_CAMERA_TILT } from "../../src/game/render/ship3dProjection.js";

function projectWithCamera(point, pose){
  const camera = new OrthographicCamera(-.82,.82,.82,-.82,.01,20);
  camera.position.set(0,5*Math.cos(pose.tilt),5*Math.sin(pose.tilt));
  camera.up.set(0,1,0);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld(true);
  const vector = new Vector3(point.x || 0,point.height || 0,point.y || 0)
    .applyEuler(new Euler(pose.pitch,0,pose.roll))
    .applyEuler(new Euler(0,pose.yaw,0)).project(camera);
  return {x:vector.x*.82,y:-vector.y*.82};
}

test("the inclined flight camera preserves the steering bearing through every turn", ()=>{
  for(const angle of [-Math.PI,-2.2,-Math.PI/2,-.3,0,.3,Math.PI/4,Math.PI/2,2.2,Math.PI]){
    for(const lag of [-.5,0,.5]){
      const pose = getShipFlightPose({angle,engineAngle:angle+lag});
      const nose = projectWithCamera({x:0,y:-1},pose);
      const bearing = Math.atan2(nose.x,-nose.y);
      const error = Math.atan2(Math.sin(bearing-angle),Math.cos(bearing-angle));
      assert(Math.abs(error)<1e-10, `heading ${angle}, lag ${lag}`);
    }
  }
});

test("the flight view exposes hull thickness and its attachment points match the 3D camera", ()=>{
  assert(SHIP_FLIGHT_CAMERA_TILT>=Math.PI/6 && SHIP_FLIGHT_CAMERA_TILT<=Math.PI/3);
  const pose = getShipFlightPose({angle:-2.2,engineAngle:-1.9});
  const base = projectWithCamera({x:0,y:0,height:0},pose);
  const top = projectWithCamera({x:0,y:0,height:.2},pose);
  assert(Math.hypot(top.x-base.x,top.y-base.y)>.1);
  for(const point of [{x:21,y:54},{x:-43,y:35},{x:0,y:-50,height:7}]){
    const actual = projectShipFlightPoint(point,pose);
    const expected = projectWithCamera(point,pose);
    assert(Math.abs(actual.x-expected.x)<1e-10);
    assert(Math.abs(actual.y-expected.y)<1e-10);
  }
});

test("engine roots follow the projected hull without moving cached ports or the 2D fallback", ()=>{
  const ports = [{x:-21,y:48,size:.72},{x:21,y:48,size:.72},{x:0,y:54,size:1}];
  const original = structuredClone(ports);
  assert.equal(projectShipEnginePorts(ports,null),ports);
  for(const angle of [0,.7,Math.PI/2,2.2,-2.2]){
    const pose = getShipFlightPose({angle,engineAngle:angle+.4});
    const projected = projectShipEnginePorts(ports,pose);
    projected.forEach((port,index)=>{
      const expected = projectWithCamera(ports[index],pose);
      const x = port.x*Math.cos(angle)-port.y*Math.sin(angle);
      const y = port.x*Math.sin(angle)+port.y*Math.cos(angle);
      assert(Math.abs(x-expected.x)<1e-10);
      assert(Math.abs(y-expected.y)<1e-10);
      assert.equal(port.size,ports[index].size);
    });
  }
  assert.deepEqual(ports,original);
});
