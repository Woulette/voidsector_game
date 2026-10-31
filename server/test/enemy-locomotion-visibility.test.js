import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {stepLocomotionPower} from "../../src/game/render/enemyLocomotion.js";
import {PARASITE_PROFILES} from "../../src/game/combatData/parasiteVisuals.js";
import {TRACKER_VISUAL_PROFILES} from "../../src/game/combatData/trackerVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {trackerVertex} from "../../src/game/render/trackerMotion.js";
import {parasiteVertex} from "../../src/game/render/parasiteMotion.js";
import {parasiteVertex as beforeParasite} from "../../tools/vfx-lab/locomotionBefore/parasiteMotion.js";
import {trackerVertex as beforeTracker} from "../../tools/vfx-lab/locomotionBefore/trackerMotion.js";
import {eclaniteCrystalPose} from "../../src/game/render/eclaniteMotion.js";
import {eclaniteCrystalPose as beforeCrystal} from "../../tools/vfx-lab/locomotionBefore/eclaniteMotion.js";

test("visual growth applies to both variants while collision sizes and hierarchy remain intact",()=>{
  for(const kind of ["chasseur_spectral","boss_chasseur_spectral"])assert(Math.abs(PARASITE_PROFILES[kind].scale/.94-1.15)<1e-10);
  for(const kind of ["cuirasse_nebulaire","boss_cuirasse_nebulaire"])assert(Math.abs(TRACKER_VISUAL_PROFILES[kind].scale/.94-1.12)<1e-10);
  assert.deepEqual([ENEMY_TYPES.chasseur_spectral.width,ENEMY_TYPES.chasseur_spectral.radius,ENEMY_TYPES.boss_chasseur_spectral.width,ENEMY_TYPES.boss_chasseur_spectral.radius],[86,34,104,42]);
  assert.deepEqual([ENEMY_TYPES.cuirasse_nebulaire.width,ENEMY_TYPES.cuirasse_nebulaire.radius,ENEMY_TYPES.boss_cuirasse_nebulaire.width,ENEMY_TYPES.boss_cuirasse_nebulaire.radius],[106,46,126,54]);
});

test("movement builds and settles smoothly with the same envelope at every frame rate",()=>{
  const values=[];
  for(const fps of [30,60,120,144,240]){
    const state={};
    for(let i=0;i<fps;i++)stepLocomotionPower(state,1,1/fps);
    const active=state.locomotionPower;assert(active>.99);
    assert.equal(stepLocomotionPower(state,0,0),active);
    for(let i=0;i<fps;i++)stepLocomotionPower(state,0,1/fps);
    assert(state.locomotionPower<.001);values.push([active,state.locomotionPower]);
  }
  for(const value of values)for(let i=0;i<2;i++)assert(Math.abs(value[i]-values[0][i])<1e-10);
});

const extent=points=>Math.hypot(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)));
test("all six tentacles and tracker appendages have a larger moving excursion than the published pose",()=>{
  const tips=[[.34,.17],[.66,.17],[.11,.76],[.89,.76],[.30,.86],[.70,.86]];
  for(let arm=0;arm<6;arm++){
    const parasite=[],oldParasite=[],tracker=[],oldTracker=[];
    for(let i=0;i<1200;i++){
      const time=i/40;
      parasite.push(parasiteVertex(arm,.46,0,time,{power:1}));oldParasite.push(beforeParasite(arm,.46,0,time,{power:1}));
      tracker.push(trackerVertex(...tips[arm],{time,power:1}));oldTracker.push(beforeTracker(...tips[arm],{time,power:1}));
    }
    assert(extent(parasite)>extent(oldParasite)*1.8);
    assert(extent(tracker)>extent(oldTracker)*1.8);
  }
});

test("crystal translation and twist become more visible during movement while the rest pose stays identical",()=>{
  for(let i=0;i<6;i++)for(let frame=0;frame<240;frame++){
    const time=frame/20,rest=eclaniteCrystalPose(i,time),oldRest=beforeCrystal(i,time),moving=eclaniteCrystalPose(i,time,{power:1});
    assert.deepEqual(rest,oldRest);
    assert(Math.abs(moving.orbit)<.28 && Math.abs(moving.radial)<=.09 && Math.abs(moving.twist)<=.18);
  }
});

test("the enlarged Tracker limb warp never inverts occupied triangles, even during attack pulses",()=>{
  const fixtures=JSON.parse(readFileSync(new URL('./fixtures/tracker-mesh-cells.json',import.meta.url)));
  for(const data of Object.values(fixtures)){
    assert.equal(createHash('sha256').update(readFileSync(new URL('../../'+data.source,import.meta.url))).digest('hex'),data.sha256);
    for(let frame=0;frame<320;frame++)for(const [x,y] of data.cells){
      for(const attack of [{charge:0,flash:0},{charge:1,flash:0},{charge:0,flash:1}]){
        const pose={time:frame*.097,power:1,attack};
        const a=trackerVertex(x/14,y/14,pose),b=trackerVertex((x+1)/14,y/14,pose);
        const c=trackerVertex(x/14,(y+1)/14,pose),d=trackerVertex((x+1)/14,(y+1)/14,pose);
        for(const [p,q,r] of [[a,b,c],[b,d,c]]){
          const ratio=((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))*196;
          assert(ratio>.05 && ratio<3,`collapsed Tracker cell ${x}:${y} at ${pose.time}: ${ratio}`);
        }
      }
    }
  }
});
