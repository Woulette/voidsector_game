import test from "node:test";
import assert from "node:assert/strict";
import {vorakPose,vorakMounts,vorakSize,vorakHeading,VORAK_DRAW_SCALE} from "./motion.js";
import {advanceVorakWake,VORAK_WAKE_LIMIT} from "./wake.js";
import {VORAK_VISUAL_PROFILES,isVorakKind} from "./profiles.js";
import {ENEMY_TYPES} from "../../../src/game/combatData/enemies.js";
import {canEnemyRotateFully} from "../../../src/data/enemyVisuals.js";

const enemyAt=(x=0,y=0,angle=Math.PI/2)=>({x,y,angle,width:120,height:120});

test("common Vorak stays compact and its wing animation never creates a fake shot",()=>{
  assert(120*VORAK_DRAW_SCALE<=75);
  for(let t=0;t<20;t+=.03){
    const pose=vorakPose(t,-10,1,2);
    assert.equal(pose.charge,0);assert.equal(pose.flash,0);assert.equal(pose.recoil,0);
    assert(pose.wings.every(angle=>Math.abs(angle)<.23));
  }
  assert(vorakPose(1,-.02).charge>.9);
  assert.equal(vorakPose(1,0).flash,1);
  assert.equal(vorakPose(1,1).flash,0);
});

test("two physical rear mounts follow the existing heading without autonomous rotation",()=>{
  const right=vorakMounts(enemyAt()),down=vorakMounts(enemyAt(0,0,Math.PI));
  assert.equal(right.length,2);
  assert(right.every(p=>p.x<0 && p.dx<-.99));
  assert(right[0].y<0 && right[1].y>0);
  assert(down.every(p=>p.y<0 && p.dy<-.99));
});

for(const kind of ["raider_astral","boss_raider_astral"]) for(const fps of [30,60,120,144,240]){
  test(`${kind}: wake emits at ${fps} Hz with repeated positions from a 60 Hz simulation`,()=>{
    const state={};let enemy={...ENEMY_TYPES[kind],...enemyAt(),kind};advanceVorakWake(state,enemy,1/fps);
    for(let frame=1;frame<=fps*3;frame++){
      const tick=Math.floor(frame/fps*60+1e-7);
      enemy=Object.freeze({...enemy,x:tick/60*90});
      advanceVorakWake(state,enemy,1/fps);
      assert(state.particles.length<=VORAK_WAKE_LIMIT);
    }
    assert(state.serial>=158 && state.serial<=162,`emitted ${state.serial}`);
    assert(state.particles.length>0);assert(state.power>.9);
  });
}

test("a turn leaves emitted material in world space and a stop fully evaporates it",()=>{
  const state={};let enemy=enemyAt();advanceVorakWake(state,enemy,1/60);
  for(let i=1;i<=50;i++){enemy=enemyAt(i*1.5);advanceVorakWake(state,enemy,1/60);}
  const particle=state.particles.at(-1),{vx,vy}=particle;
  for(let i=1;i<=12;i++){enemy=enemyAt(75,i*1.5,Math.PI);advanceVorakWake(state,enemy,1/60);}
  assert.equal(particle.vx,vx);assert.equal(particle.vy,vy);
  const serial=state.serial;
  // A requested velocity against a wall must not emit if the position stops.
  for(let i=0;i<130;i++)advanceVorakWake(state,{...enemy,vx:300,vy:300},1/60);
  assert.equal(state.serial,serial);assert.equal(state.particles.length,0);assert(state.power<.01);
});

test("boss visual stays within 25 percent of the approved common at actual catalogue dimensions",()=>{
  const common={...ENEMY_TYPES.raider_astral,kind:"raider_astral"};
  const boss={...ENEMY_TYPES.boss_raider_astral,kind:"boss_raider_astral"};
  const ratio=vorakSize(boss)/vorakSize(common);
  assert(ratio>1.15 && ratio<1.25);
  assert.equal(vorakMounts({...boss,x:0,y:0}).length,2);
  assert(VORAK_VISUAL_PROFILES.boss_raider_astral.light<=1.12);
  assert.notEqual(VORAK_VISUAL_PROFILES.raider_astral.sprite,VORAK_VISUAL_PROFILES.boss_raider_astral.sprite);
  assert(isVorakKind(common.kind));assert(isVorakKind(boss.kind));assert(!isVorakKind("drone_pirate"));
});

test("boss keeps its existing fixed orientation and the common keeps its movement heading",()=>{
  assert.equal(canEnemyRotateFully("boss_raider_astral"),false);
  assert.equal(canEnemyRotateFully("raider_astral"),true);
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    assert.equal(vorakHeading({...enemyAt(),kind:"raider_astral",angle}),angle);
    const boss={...enemyAt(),kind:"boss_raider_astral",angle};
    assert.equal(vorakHeading(boss),0);
    assert(vorakMounts(boss).every(p=>Math.abs(p.dx)<1e-6 && p.dy>.99));
    assert(vorakPose(1,0,1,2,boss.kind).wings.every(a=>Math.abs(a)<.23));
  }
});

test("teleports clear trails instead of drawing exhaust across the arena",()=>{
  const state={};advanceVorakWake(state,enemyAt(),1/60);
  for(let i=1;i<=20;i++)advanceVorakWake(state,enemyAt(i*2),1/60);
  assert(state.particles.length>0);
  advanceVorakWake(state,enemyAt(900),1/60);
  assert.equal(state.particles.length,0);assert.equal(state.power,0);
});
