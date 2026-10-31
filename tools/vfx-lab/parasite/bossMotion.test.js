import test from "node:test";
import assert from "node:assert/strict";
import {BOSS_ARM_ANGLES,bossArmSector,parasiteBossPose,parasiteBossVertex,parasiteCrownPose} from "./bossMotion.js";
import {PARASITE_PROFILES} from "./profiles.js";
import {PARASITE_CENTER} from "./motion.js";

const profile=PARASITE_PROFILES.boss_chasseur_spectral;
const options=(time,age)=>({...parasiteBossPose(time,age),rootShape:profile.rootShape,power:1,lagX:.7,lagY:-.4});

test("boss shell stays round during breathing, anticipation and release",()=>{
  assert.equal(profile.rootShape.x,profile.rootShape.y);
  assert.equal(profile.coreShape.x,profile.coreShape.y);
  for(let time=0;time<15;time+=.13)for(const age of [-10,-.37,-.1,0,.08,.25,.6]){
    const pose=parasiteBossPose(time,age);
    assert.equal(pose.sx,pose.sy);assert(pose.sx>.97 && pose.sx<1.025);
  }
});

test("six radial arm masks cover the circumference continuously without introducing a new facing",()=>{
  assert.equal(BOSS_ARM_ANGLES.length,6);
  for(let arm=0;arm<6;arm++){
    const sector=bossArmSector(arm);
    assert(Math.abs(sector.end-sector.start-Math.PI/3)<1e-12);
    if(arm<5)assert(Math.abs(sector.end-bossArmSector(arm+1).start)<1e-12);
  }
  assert(Math.abs(bossArmSector(5).end-bossArmSector(0).start-Math.PI*2)<1e-12);
});

test("all boss roots remain attached to the breathing shell while distal tips move",()=>{
  const samples=[];
  for(let arm=0;arm<6;arm++){
    for(const age of [-10,-.01,.1]){
      const o=options(1,age),p=parasiteBossVertex(arm,profile.rootShape.x,0,1,o);
      assert(Math.abs(p.x-(PARASITE_CENTER.x+(p.u-PARASITE_CENTER.x)*o.sx))<1e-12);
      assert(Math.abs(p.y-(PARASITE_CENTER.y+(p.v-PARASITE_CENTER.y)*o.sy))<1e-12);
    }
    const a=parasiteBossVertex(arm,.46,0,1,options(1,-10));
    const samplesInCycle=Array.from({length:48},(_,i)=>parasiteBossVertex(arm,.46,0,i/6,options(i/6,-10)));
    const excursion=Math.hypot(Math.max(...samplesInCycle.map(p=>p.x))-Math.min(...samplesInCycle.map(p=>p.x)),
      Math.max(...samplesInCycle.map(p=>p.y))-Math.min(...samplesInCycle.map(p=>p.y)));
    assert(excursion>.02);
    samples.push(`${(a.x-a.u).toFixed(5)}:${(a.y-a.v).toFixed(5)}`);
  }
  assert.equal(new Set(samples).size,6);
});

test("patrol never invents an attack; anticipation, flash and settling follow the supplied shot age",()=>{
  for(let time=0;time<20;time+=.07){
    const pose=parasiteBossPose(time,-10);
    assert.equal(pose.charge,0);assert.equal(pose.flash,0);assert.equal(pose.release,0);
    for(let i=0;i<6;i++){const crown=parasiteCrownPose(pose,i);assert(crown.offset<.002);assert.equal(Math.abs(crown.twist),0);}
  }
  assert(parasiteBossPose(1,-.01).charge>.99);
  assert.equal(parasiteBossPose(1,0).flash,1);
  assert(parasiteBossPose(1,.1).release>.5);
  const settled=parasiteBossPose(1,.6);
  assert.equal(settled.charge,0);assert.equal(settled.flash,0);assert.equal(settled.release,0);
});

test("iris shutters open at the shot while staying inside the round carapace",()=>{
  const idle=parasiteBossPose(2,-10),charged=parasiteBossPose(2,-.001),settled=parasiteBossPose(2,.6);
  for(let i=0;i<6;i++){
    const a=parasiteCrownPose(idle,i),b=parasiteCrownPose(charged,i),c=parasiteCrownPose(settled,i);
    assert(b.offset>a.offset+.017);assert(.193+b.offset<profile.rootShape.x);
    assert.equal(c.offset,a.offset);assert(Math.abs(b.twist)>.04);
  }
});

test("the new limb mesh does not flip or fold through its complete attack poses",()=>{
  const area=(a,b,c,x,y)=>(b[x]-a[x])*(c[y]-a[y])-(c[x]-a[x])*(b[y]-a[y]);
  for(const time of [0,.7,3.1,7.3])for(const age of [-10,-.2,-.01,0,.09,.3,.6])for(let arm=0;arm<6;arm++){
    for(let row=0;row<profile.strips;row++){
      const r0=profile.meshStart+row*(profile.meshEnd-profile.meshStart)/profile.strips;
      const r1=profile.meshStart+(row+1)*(profile.meshEnd-profile.meshStart)/profile.strips;
      const vertex=(r,s)=>parasiteBossVertex(arm,r,s,time,options(time,age));
      const a=vertex(r0,-.275),b=vertex(r1,-.275),c=vertex(r0,.275),d=vertex(r1,.275);
      for(const triangle of [[a,b,c],[b,d,c]]){
        const ratio=area(...triangle,"x","y")/area(...triangle,"u","v");
        assert(Number.isFinite(ratio) && ratio>.15 && ratio<3,`fold at arm ${arm}, row ${row}, age ${age}: ${ratio}`);
      }
    }
  }
});
