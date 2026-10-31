import test from "node:test";
import assert from "node:assert/strict";
import {trackerElectricArcs,trackerElectricSeed} from "./electricity.js";

test("ambient electricity is intermittent, deterministic and limited to two short filaments",()=>{
  let active=0,quiet=0;
  const options=Object.freeze({power:.8,seed:trackerElectricSeed('abyssal-17'),attack:Object.freeze({charge:0,flash:0})});
  for(let frame=0;frame<2400;frame++){
    const time=frame/120,arcs=trackerElectricArcs(time,options);
    assert.deepEqual(arcs,trackerElectricArcs(time,options));
    assert(arcs.length<=2);
    if(arcs.length)active++;else quiet++;
    for(const arc of arcs){
      assert(arc.alpha>0 && arc.alpha<=1);assert.equal(arc.points.length,8);assert.equal(arc.fork.length,3);
      assert(Math.hypot(arc.points.at(-1)[0]-arc.points[0][0],arc.points.at(-1)[1]-arc.points[0][1])<.34);
      for(const [x,y] of [...arc.points,...arc.fork])assert(Math.abs(x)<.48 && Math.abs(y)<.48);
    }
  }
  assert(active>400 && quiet>400);
});

test("the received shot strengthens the local filaments without creating a gameplay attack",()=>{
  const seed=trackerElectricSeed('abyssal-17');
  assert.notEqual(seed,trackerElectricSeed('abyssal-18'));
  let idleTime;
  for(let i=0;i<300;i++)if(!trackerElectricArcs(i/100,{seed}).length){idleTime=i/100;break;}
  assert.notEqual(idleTime,undefined);
  const attack=Object.freeze({charge:0,flash:1});
  const arcs=trackerElectricArcs(idleTime,{seed,attack});
  assert.equal(arcs.length,1);assert.equal(arcs[0].alpha,.96);
  assert.deepEqual(attack,{charge:0,flash:1});
  assert.deepEqual(trackerElectricArcs(NaN),[]);
});
