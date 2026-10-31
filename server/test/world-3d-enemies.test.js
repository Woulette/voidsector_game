import test from "node:test";
import assert from "node:assert/strict";
import { drawEnemies } from "../../src/game/render/entities.js";
import { setScene3dFrame } from "../../src/game/render/scene3dFrame.js";

test("ready 3D enemies replace the legacy Orb and Vorak animated bodies",()=>{
  const queued=[];
  setScene3dFrame({enqueueEnemy:options=>{queued.push(options);return true;}});
  const ctx={canvas:{width:800,height:600}};
  const enemies=["drone_pirate","raider_astral"].map((kind,index)=>({id:`enemy-${index}`,kind,x:200+index*100,y:300,width:100,height:100,radius:40,hp:100,maxHp:100,angle:.5}));
  try{
    // The minimal context deliberately cannot draw a sprite or animated 2D body.
    drawEnemies({ctx,camera:{x:0,y:0},cache:{},enemies,selectedEnemy:null});
    assert.deepEqual(queued.map(entry=>entry.enemy.kind),["drone_pirate","raider_astral"]);
    assert.deepEqual(queued.map(entry=>entry.position),[{x:200,y:300},{x:300,y:300}]);
  }finally{setScene3dFrame(null);}
});
