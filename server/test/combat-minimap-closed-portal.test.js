import assert from "node:assert/strict";
import test from "node:test";
import { drawMiniMap } from "../../src/game/render/canvasHud.js";

test("minimap draws closed portals with their dedicated marker", ()=>{
  const arcs = [];
  const ctx = {
    save(){}, restore(){}, fillRect(){}, strokeRect(){}, fillText(){}, beginPath(){}, rect(){}, clip(){}, translate(){}, rotate(){},
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};},
    ellipse(){},
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

test("minimap makes a freshly prepared portal large, luminous and labelled", ()=>{
  const arcs = [];
  const labels = [];
  const ctx = {
    save(){}, restore(){}, fillRect(){}, strokeRect(){}, beginPath(){}, rect(){}, clip(){}, translate(){}, rotate(){},
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};},
    ellipse(){},
    moveTo(){}, lineTo(){}, stroke(){}, fill(){}, setLineDash(){}, closePath(){},
    arc(x, y, radius){ arcs.push({x, y, radius}); },
    fillText(text, x, y){ labels.push({text, x, y}); }
  };

  drawMiniMap({
    ctx,
    currentMap:{name:"CYAN-01", width:11000, height:8200, spawn:{x:-4300, y:-3300}},
    player:{x:-4300, y:-3300, radar:0},
    enemies:[],
    rect:{x:0, y:0, w:220, h:120},
    getMapPortals:()=>[{
      x:-3780,
      y:-2780,
      prepared:true,
      dungeonPortal:true,
      portalId:"blue"
    }]
  });

  assert.ok(arcs.some(arc=>arc.radius === 7));
  assert.ok(arcs.some(arc=>arc.radius >= 11));
  assert.ok(labels.some(label=>label.text === "PORTAIL"));
});
