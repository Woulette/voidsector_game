import test from "node:test";
import assert from "node:assert/strict";
import {parasiteTentacleState} from "../../../src/game/render/parasiteTentacles.js";
import {parasiteVertex,PARASITE_ROOT} from "./motion.js";
import {parasiteBossVertex,parasiteBossPose} from "./bossMotion.js";
import {PARASITE_PROFILES} from "./profiles.js";
import {parasiteVertex as oldVertex} from "./beforeMotion.js";

const extent=points=>Math.hypot(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),
  Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)));

test("each common tentacle has a clearly larger excursion and independent rests and curvature",()=>{
  const activityTraces=[];
  for(let arm=0;arm<6;arm++){
    const before=[],after=[],activity=[];
    for(let i=0;i<1200;i++){
      const time=i/40;
      before.push(oldVertex(arm,.46,0,time));after.push(parasiteVertex(arm,.46,0,time));
      const limb=parasiteTentacleState(arm,time);
      activity.push(limb.activity);
      assert.deepEqual(limb,parasiteTentacleState(arm,time));
      assert(limb.activity>=.18 && limb.activity<=1);
      const root=parasiteVertex(arm,PARASITE_ROOT,0,time,{charge:1,flash:1,power:1,lagX:1,lagY:-1});
      assert.equal(root.x,root.u);assert.equal(root.y,root.v);
    }
    assert(extent(after)>extent(before)*1.5,`arm ${arm} remains too static`);
    assert(extent(after)<.23,`arm ${arm} exceeds its visual envelope`);
    assert(Math.min(...activity)<.3 && Math.max(...activity)>.85,`arm ${arm} lacks rests or full gestures`);
    activityTraces.push(activity);
  }
  let asynchronous=0;
  for(let i=0;i<1200;i++){
    const active=activityTraces.map(trace=>trace[i]);
    if(Math.min(...active)<.3 && Math.max(...active)>.8)asynchronous++;
  }
  assert(asynchronous>250,'the six tentacles should not share a single activity envelope');
});

test("independent motion remains continuous through envelope boundaries at 240 Hz",()=>{
  for(const boss of [false,true])for(let arm=0;arm<6;arm++){
    let previous;
    for(let frame=0;frame<240*12;frame++){
      const time=frame/240,limb=parasiteTentacleState(arm,time,{power:1,boss});
      if(previous){
        assert(Math.abs(limb.sweep-previous.sweep)<.002);
        assert(Math.abs(limb.curl-previous.curl)<.002);
        assert(Math.abs(limb.reach-previous.reach)<.002);
      }
      previous=limb;
    }
  }
});

test("larger common and boss gestures keep every mesh triangle facing forward",()=>{
  const area=(a,b,c,x,y)=>(b[x]-a[x])*(c[y]-a[y])-(c[x]-a[x])*(b[y]-a[y]);
  const bossProfile=PARASITE_PROFILES.boss_chasseur_spectral;
  for(const boss of [false,true])for(let sample=0;sample<40;sample++){
    const time=sample*.73;
    for(const age of [-10,-.1,0,.1])for(let arm=0;arm<6;arm++){
      const strips=boss ? bossProfile.strips : 10,start=boss ? bossProfile.meshStart : PARASITE_ROOT,end=boss ? bossProfile.meshEnd : .5;
      const options=boss ? {...parasiteBossPose(time,age),rootShape:bossProfile.rootShape,power:1,lagX:1,lagY:-1}
        : {power:1,lagX:1,lagY:-1,charge:age<0 && age>-1 ? 1 : 0,flash:age===0 ? 1 : 0};
      const vertex=boss ? parasiteBossVertex : parasiteVertex;
      for(let row=0;row<strips;row++){
        const r0=start+row*(end-start)/strips,r1=start+(row+1)*(end-start)/strips;
        const a=vertex(arm,r0,-.275,time,options),b=vertex(arm,r1,-.275,time,options);
        const c=vertex(arm,r0,.275,time,options),d=vertex(arm,r1,.275,time,options);
        for(const triangle of [[a,b,c],[b,d,c]]){
          const ratio=area(...triangle,'x','y')/area(...triangle,'u','v');
          assert(Number.isFinite(ratio) && ratio>.15 && ratio<3,`${boss ? 'boss' : 'common'} arm ${arm} folds at ${time}: ${ratio}`);
        }
      }
    }
  }
});
