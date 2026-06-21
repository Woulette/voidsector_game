import assert from "node:assert/strict";
import test from "node:test";
import { drawMiniMap } from "../../src/game/render/canvasHud.js";

test("minimap draws closed portals with their dedicated marker", ()=>{
  const arcs = [];
  const ctx = {
    save(){}, restore(){}, fillRect(){}, strokeRect(){}, fillText(){}, beginPath(){},
    moveTo(){}, lineTo(){}, stroke(){}, fill(){}, setLineDash(){}, closePath(){},
    arc(x, y, radius){ arcs.push({x, y, radius}); }
  };

  drawMiniMap({
    ctx,
    currentMap:{name:"BRECHE DE RICKY", width:11000, height:8200, spawn:{x:0, y:3400, kind:"portal"}},
    player:{x:0, y:3400, radar:0},
    enemies:[],
    rect:{x:0, y:0, w:220, h:120},
    closedPortals:[{x:0, y:3400, closed:true}],
    getMapPortals:()=>[]
  });

  assert.ok(arcs.some(arc=>arc.radius === 6 && Math.abs(arc.x - 110) < .001));
});
