import assert from "node:assert/strict";
import test from "node:test";
import { drawMiniMap } from "../../src/game/render/canvasHud.js";
import { getMiniMapLayout } from "../../src/game/systems/miniMapLayout.js";
import { createCombatInteractionSystem } from "../../src/game/systems/combatInteractions.js";
import { syncServerControlledEnemies } from "../../src/multiplayer/enemies.js";
import { replaceServerEnemies } from "../../src/multiplayer/socketState.js";

const rect = {x:20, y:30, w:400, h:260};
const map = {id:"test", name:"Test", width:11000, height:8200};
const enemy = (id, x, y = 0)=>({id, x, y, hp:100, maxHp:100, radius:40});
const dot = (x, y, w = 4, h = 4)=>({x:Math.round(x * 1e6) / 1e6, y:Math.round(y * 1e6) / 1e6, w, h});

function fixture(){
  const dots = [];
  const ctx = {
    save(){}, restore(){}, strokeRect(){}, fillText(){}, beginPath(){}, rect(){}, clip(){},
    translate(){}, rotate(){}, ellipse(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){},
    setLineDash(){}, closePath(){}, arc(){},
    createLinearGradient(){ return {addColorStop(){}}; },
    createRadialGradient(){ return {addColorStop(){}}; },
    fillRect(x, y, w, h){
      if(this.fillStyle === "#ef4444") dots.push(dot(x + w / 2, y + h / 2, w, h));
    }
  };
  const state = {currentMap:map, player:{x:0, y:0, radar:500}, enemies:[], selectedEnemy:null, gameMode:"open"};
  const interactions = createCombatInteractionSystem({getState:()=>state,
    setState:patch=>Object.assign(state, patch), actions:{setActiveLaserSlot(){}, updateGameActionBar(){}}, updateHud(){}});
  return {state, interactions, draw(){
    dots.length = 0;
    drawMiniMap({...state, ctx, cache:{}, rect, revealAllEnemies:state.gameMode === "portal"});
    return [...dots];
  }};
}

function expectedDot(target){
  const {content} = getMiniMapLayout(rect);
  return dot(content.x + (target.x / map.width + .5) * content.w,
    content.y + (target.y / map.height + .5) * content.h);
}

test("a locked monster stays visible beyond the radar anywhere in the sector", ()=>{
  const f = fixture();
  for(const [x, y] of [[4500, 3200], [-4500, 3200], [4500, -3200], [-4500, -3200]]){
    const target = enemy("locked", x, y);
    f.state.enemies = [target, enemy("other-far", -x, -y)];
    f.interactions.selectEnemy(target);
    assert.deepEqual(f.draw(), [expectedDot(target)]);
  }
});

test("nearby monsters keep their radar markers while an unlocked distant monster stays hidden", ()=>{
  const f = fixture(), near = enemy("near", 100), far = enemy("far", 4000);
  f.state.enemies = [near, far];
  assert.deepEqual(f.draw(), [expectedDot(near)]);
  f.interactions.selectEnemy(far);
  assert.deepEqual(f.draw(), [expectedDot(near), expectedDot(far)]);
  f.interactions.clearSelectedEnemy();
  assert.deepEqual(f.draw(), [expectedDot(near)]);
});

test("switching locks moves the distant marker and Escape's clear action removes it", ()=>{
  const f = fixture(), a = enemy("a", 4000), b = enemy("b", -4000);
  f.state.enemies = [a, b];
  f.interactions.selectEnemy(a);
  assert.deepEqual(f.draw(), [expectedDot(a)]);
  f.interactions.selectEnemy(b);
  assert.deepEqual(f.draw(), [expectedDot(b)]);
  f.interactions.clearSelectedEnemy();
  assert.deepEqual(f.draw(), []);
});

test("a lock uses the live monster's identity and coordinates, never an old copy or a PvP target", ()=>{
  const f = fixture(), target = enemy("live", 3000, 2000);
  f.state.enemies = [target];
  f.state.selectedEnemy = {...target, x:-3000, y:-2000};
  assert.deepEqual(f.draw(), [expectedDot(target)]);
  f.state.selectedEnemy = {...target, isPlayerTarget:true};
  assert.deepEqual(f.draw(), []);
  f.state.selectedEnemy = enemy("missing", 3000);
  assert.deepEqual(f.draw(), []);
});

test("a destroyed locked monster has no minimap marker even before selection cleanup", ()=>{
  const f = fixture(), target = {...enemy("dead", 4000), hp:0};
  f.state.enemies = [target];
  f.interactions.selectEnemy(target);
  assert.deepEqual(f.draw(), []);
  target.x = 100;
  assert.deepEqual(f.draw(), []);
});

test("MMO full and delta snapshots update a far lock and clear it on death or map change", ()=>{
  const f = fixture(), multiplayer = {serverEnemies:new Map()};
  let time = performance.now();
  const receive = (payload)=>{
    replaceServerEnemies(multiplayer, payload, "world");
    Object.assign(f.state, syncServerControlledEnemies({enemies:f.state.enemies,
      selectedEnemy:f.state.selectedEnemy, multiplayerState:multiplayer, now:time += 250}));
  };
  receive({mapId:"0", at:1000, full:true, enemies:[enemy("world-0-1", 100)]});
  f.interactions.selectEnemy(f.state.enemies[0]);
  f.state.player.x = -4000;
  receive({mapId:"0", at:1250, delta:true, enemies:[enemy("world-0-1", 3500, 2000)]});
  assert.ok(f.interactions.validSelectedEnemy());
  assert.deepEqual(f.draw(), [expectedDot(f.state.enemies[0])]);
  receive({mapId:"0", at:1500, delta:true, enemies:[]});
  assert.equal(f.state.selectedEnemy, null);
  assert.deepEqual(f.draw(), []);
  receive({mapId:"0", at:1750, full:true, enemies:[enemy("world-0-1", 3500)]});
  assert.deepEqual(f.draw(), [], "respawn does not silently restore a cleared lock");
  f.interactions.selectEnemy(f.state.enemies[0]);
  receive({mapId:"1", at:2000, full:true, enemies:[enemy("world-1-1", 3500)]});
  assert.equal(f.state.selectedEnemy, null);
  assert.deepEqual(f.draw(), []);
});

test("portal maps retain their existing whole-map monster visibility", ()=>{
  const f = fixture(), a = enemy("a", 4000), b = enemy("b", -4000);
  f.state.gameMode = "portal";
  f.state.enemies = [a, b];
  assert.deepEqual(f.draw(), [expectedDot(a), expectedDot(b)]);
});
