import assert from "node:assert/strict";
import test from "node:test";
import {buildShieldPreviewFrame} from "./shieldPreviewScene.js";

test("all proposed shields skip their reaction and fade the target on a fatal hit", ()=>{
  for(const ammoId of ["ammo_x1","ammo_x4","ammo_x6"]){
    const frame=buildShieldPreviewFrame({time:.62,ammoId,from:{x:30,y:100},target:{x:250,y:100,width:128,height:128,radius:25},lethal:true});
    assert.equal(frame.effects.length,0); assert(frame.targetAlpha<1);
  }
});

test("the comparison keeps X6 B in four fast passes and normal lasers in two passes", ()=>{
  for(const [ammoId,count,duration] of [["ammo_x1",2,.2],["ammo_x4",2,.2],["ammo_x6",4,.12]]){
    const frame=buildShieldPreviewFrame({time:.62,ammoId,from:{x:30,y:100},target:{x:250,y:100,width:128,height:128,radius:25}});
    assert.equal(frame.effects.length,count); assert.equal(frame.shots.length,count);
    assert(frame.shots.every(shot=>shot.duration===duration)); assert.equal(frame.targetAlpha,1);
  }
});
