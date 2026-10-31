import assert from "node:assert/strict";
import test from "node:test";
import {drawBeams} from "../../src/game/render/entities.js";

function context(){
  const fills=[],stack=[];
  const ctx={globalAlpha:1,fillStyle:"",shadowBlur:0,globalCompositeOperation:"source-over",
    save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,shadowBlur:this.shadowBlur,globalCompositeOperation:this.globalCompositeOperation});},
    restore(){Object.assign(this,stack.pop());},
    fill(){fills.push({color:this.fillStyle,alpha:this.globalAlpha});},
    stroke(){fills.push({color:this.strokeStyle,alpha:this.globalAlpha});},
    createRadialGradient(){return {addColorStop(){}};}
  };
  for(const method of ["translate","rotate","beginPath","moveTo","lineTo","arc","bezierCurveTo","quadraticCurveTo","fillRect"]){ctx[method]=()=>{};}
  return {ctx,fills};
}

test("X6 opacity is preserved when an ordinary laser fades in the same frame", ()=>{
  const regular={fromX:0,fromY:0,toX:400,toY:0,age:.199,duration:.2,core:"white",glow:"red"};
  const special={...regular,monochrome:true,age:.06,duration:.12};
  const draw=beams=>{
    const {ctx,fills}=context();
    drawBeams({ctx,camera:{x:0,y:0},beams});
    const dark=fills.filter(item=>item.color === "rgba(0,0,0,.96)");
    assert.equal(dark.length,2);
    assert.equal(ctx.globalAlpha,1,"renderer restores its caller's alpha");
    return dark[0].alpha;
  };
  assert.equal(draw([regular,special]),draw([special,regular]));
  assert.equal(draw([regular,special]),1);
});
