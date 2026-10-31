import assert from "node:assert/strict";
import test from "node:test";
import { Euler, OrthographicCamera, Vector3 } from "../../vendor/three-r187/three.module.js";
import { advanceShipFlightMotion, getShipFlightPose, projectShipEnginePorts, projectShipFlightPoint, SHIP_FLIGHT_CAMERA_TILT, SHIP_FLIGHT_MAX_ROLL } from "../../src/game/render/ship3dProjection.js";

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
    for(const roll of [-SHIP_FLIGHT_MAX_ROLL,0,SHIP_FLIGHT_MAX_ROLL]){
      const pose = getShipFlightPose({angle,roll});
      const nose = projectWithCamera({x:0,y:-1},pose);
      const bearing = Math.atan2(nose.x,-nose.y);
      const error = Math.atan2(Math.sin(bearing-angle),Math.cos(bearing-angle));
      assert(Math.abs(error)<1e-10, `heading ${angle}, roll ${roll}`);
    }
  }
});

test("the flight view exposes hull thickness and its attachment points match the 3D camera", ()=>{
  assert(SHIP_FLIGHT_CAMERA_TILT>=Math.PI/6 && SHIP_FLIGHT_CAMERA_TILT<=Math.PI/3);
  const pose = getShipFlightPose({angle:-2.2,roll:.4});
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
    const pose = getShipFlightPose({angle,roll:-.4,enginePortScale:.82});
    const projected = projectShipEnginePorts(ports,pose);
    projected.forEach((port,index)=>{
      const expected = projectWithCamera({...ports[index],x:ports[index].x*.82,y:ports[index].y*.82},pose);
      const x = port.x*Math.cos(angle)-port.y*Math.sin(angle);
      const y = port.x*Math.sin(angle)+port.y*Math.cos(angle);
      assert(Math.abs(x-expected.x)<1e-10);
      assert(Math.abs(y-expected.y)<1e-10);
      assert.equal(port.size,ports[index].size);
    });
  }
  assert.deepEqual(ports,original);
});

test("turns bank into either direction and settle upright without changing navigation", ()=>{
  for(const direction of [-1,1]){
    const state = {};
    advanceShipFlightMotion(state,0,0);
    for(let frame=1;frame<=12;frame++) advanceShipFlightMotion(state,direction*Math.PI/2,frame/60);
    assert(state.angle*direction>0 && Math.abs(state.angle)<Math.PI/2);
    assert(state.roll*direction<-.2, "a turn must visibly lower the inside wing");
    assert(Math.abs(state.roll)<=SHIP_FLIGHT_MAX_ROLL);
    for(let frame=13;frame<=240;frame++) advanceShipFlightMotion(state,direction*Math.PI/2,frame/60);
    assert(Math.abs(state.angle-direction*Math.PI/2)<1e-8);
    assert(Math.abs(state.roll)<1e-7);
  }
});

test("turn animation is consistent across frame rates and takes the short path across north", ()=>{
  const samples=[];
  for(const fps of [30,60,144,240]){
    const state={};
    advanceShipFlightMotion(state,Math.PI-.08,0);
    for(let frame=1;frame<=fps/2;frame++) advanceShipFlightMotion(state,-Math.PI+.08,frame/fps);
    assert(state.angle>Math.PI-.08 && state.angle<Math.PI+.08);
    samples.push({...state});
  }
  for(const sample of samples){
    assert(Math.abs(sample.angle-samples[0].angle)<1e-10);
    assert(Math.abs(sample.roll-samples[0].roll)<.01);
  }
});

test("a suspended frame or a new ship starts level instead of replaying an old turn", ()=>{
  const state={};
  advanceShipFlightMotion(state,0,0);
  advanceShipFlightMotion(state,1,.05);
  assert(Math.abs(state.roll)>.05);
  advanceShipFlightMotion(state,-2,2);
  assert.equal(state.angle,-2);
  assert.equal(state.roll,0);
  const before={...state};
  advanceShipFlightMotion(state,2,2);
  assert.deepEqual(state,before);
});
