import assert from "node:assert/strict";
import test from "node:test";
import { WAVE_PORTAL_TIERS,getWavePortalTier,getWavePortalCompletionReward } from "../../src/data/wavePortalTiers.js";
import { buildAzuronPortalWave } from "../src/portals/azuronPortal.js";
import { getServerPortalDefinition,buildServerPortalConfigs } from "../src/portals/portalDefinitions.js";
import { sanitizeAzuronProgress,canRecordAzuronEnemyReward,recordAzuronEnemyReward } from "../../src/shared/azuronProgress.js";
import { createPortalMap } from "../../src/game/systems/portalState.js";
import { normalizePortalInstance } from "../../src/multiplayer/worldSocketListeners.js";
import { drawAzuronPortal } from "../../src/game/render/azuronPortalVisual.js";
import { AZURON_GATE_VISUAL_ASSETS } from "../../src/data/azuronGateVisuals.js";
import { portals } from "../../src/data/progression.js";
import { isVesperPortal } from "../../src/data/vesperPortal.js";
import { isKharonPortal } from "../../src/data/kharonPortal.js";
import { getEnemyDamageRange } from "../../src/shared/enemyDamage.js";
import { startServerTick } from "../src/tick/serverTick.js";

for(const [portalId,tier] of Object.entries(WAVE_PORTAL_TIERS)){
  test(`${portalId}: all 250 enemies retain Azuron's species, position and behavior with exact scaled combat stats and rewards`,()=>{
    let count=0;
    for(let wave=1;wave<=30;wave++){
      const base=buildAzuronPortalWave(wave,1000),scaled=buildAzuronPortalWave(wave,1000,{portalId,runId:"scale-check"});
      assert.equal(scaled.length,base.length);
      for(let i=0;i<base.length;i++){
        const a=base[i],b=scaled[i];count++;
        assert.equal(b.kind,a.kind);assert.equal(b.level,tier.level);assert.equal(b.azuronPortalId,portalId);
        for(const key of ["maxHp","maxShield","attackDamage"])assert.equal(b[key],a[key]*tier.multiplier,`${portalId} ${b.kind}: ${key}`);
        for(const key of Object.keys(a.reward))assert.equal(b.reward[key],a.reward[key]*tier.multiplier);
        for(const key of ["x","y","speed","attackRange","attackCooldown","stationaryRingRadius"])assert.equal(b[key],a[key]);
        assert.deepEqual({attackDamageMin:b.attackDamageMin,attackDamageMax:b.attackDamageMax},getEnemyDamageRange(b.attackDamage));
        assert.equal(b.onHitEffect,null);assert.ok(b.permanentAggro);
      }
    }
    assert.equal(count,250);
  });

  test(`${portalId}: authoritative final rewards, UI access and wave map describe the same encounter`,()=>{
    const definition=getServerPortalDefinition(portalId),client=portals.find(p=>p.id===portalId);
    const reward=getWavePortalCompletionReward(portalId);
    for(const [key,value] of Object.entries(reward))assert.equal(definition.reward[key],value);
    assert.equal(reward.credits,1_000_000*tier.multiplier);
    assert.equal(reward.xp,500_000*tier.multiplier);assert.equal(reward.reputation,50_000*tier.multiplier);
    assert.equal(definition.requirement.level,tier.level);assert.equal(client.requirement.level,tier.level);
    assert.equal(definition.encounterKind,"azuron");assert.equal(client.encounterKind,"azuron");
    const descriptor=buildServerPortalConfigs()[portalId];assert.equal(descriptor.encounterKind,"azuron");
    const map=createPortalMap({...descriptor});assert.equal(map.id,`portal-${portalId}`);
    assert.equal(map.width,7800);assert.equal(map.height,5400);assert.equal(map.azuronPortal,true);
    const normalized=normalizePortalInstance({portal:descriptor,objective:{kind:"azuron",batchReady:true,nextWave:6,gates:[]},wave:5,waveTotal:30},false,"pilot");
    assert.equal(normalized.objective.kind,"azuron");
    assert.equal(isVesperPortal(descriptor),false);assert.equal(isKharonPortal(descriptor),false);
  });
}

test("saved kill receipts are scoped to their portal even if another portal reuses the same run id",()=>{
  for(const portalId of ["blue","violet","red"]){
    const progress=sanitizeAzuronProgress({portalId,runId:"receipt-check",nextWave:6,lives:2,phase:"active",defeated:[]});
    assert.ok(progress);
    const profile={azuronProgress:progress};
    const reward={azuronPortalId:portalId,azuronRunId:"receipt-check",azuronWave:6,azuronIndex:2};
    assert.equal(canRecordAzuronEnemyReward(profile,reward),true);
    assert.equal(recordAzuronEnemyReward(profile,{...reward,azuronPortalId:portalId==="blue"?"red":"blue"}),false);
    assert.equal(recordAzuronEnemyReward(profile,reward),true);
    assert.equal(recordAzuronEnemyReward(profile,reward),false);
  }
  assert.equal(sanitizeAzuronProgress({portalId:"ionis",runId:"bad",nextWave:1,lives:3}),null);
});

test("the approved gate keeps identical oval geometry and uses only a color filter for each tier",()=>{
  const image={complete:true,naturalWidth:1254,naturalHeight:1254};
  const cache=Object.fromEntries(Object.values(AZURON_GATE_VISUAL_ASSETS).map(path=>[path,image]));
  for(const [portalId,tier] of Object.entries(WAVE_PORTAL_TIERS)){
    const calls=[],gradient={addColorStop(){}};let depth=0;
    const ctx=new Proxy({save(){depth++;},restore(){depth--;},createRadialGradient(){return gradient;}},{
      get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),
      set:(target,key,value)=>{calls.push([key,value]);target[key]=value;return true;}
    });
    const portal={id:"prepared",prepared:true,portalId,x:0,y:0,r:115};
    assert.equal(drawAzuronPortal({ctx,cache,portal,portalTransition:{portal,elapsed:3,duration:4},now:1000}),true);
    assert.ok(calls.some(call=>call[0]==="filter"&&call[1]===tier.filter));
    assert.ok(calls.some(call=>call[0]==="scale"&&call[1]===.74&&call[2]===1.04));
    assert.equal(depth,0);
  }
  assert.equal(getWavePortalTier("portal-violet").multiplier,2);
});

test("the real server tick gives every tier the same arena bounds and only its own pilot",()=>{
  const groups=new Map(),players=new Map(),seen=[],errors=[];
  for(const portalId of ["blue","violet","red"]){
    const id=`pilot-${portalId}`,mapId=`portal-${portalId}`;
    players.set(id,{id,mapId,state:{mapId,hp:1000,x:3000,y:2200}});
    groups.set(portalId,{id:portalId,members:[id],instance:{id:portalId,type:"portal",portal:{id:portalId,encounterKind:"azuron"},
      joinedMemberIds:[id],enemies:[{id:portalId,hp:100}]}});
  }
  let frame;
  startServerTick({groups,players,presence:{isActiveForWorld:()=>true,tick(){}},
    cleanupExpiredLootDrops(){},emitInstance(){},emitWorldEnemies(){},playersOnMap:()=>[],getWorldMapState:()=>({enemies:[]}),
    updateWorldEnemy:(enemy,map,pilots)=>seen.push({id:enemy.id,map,pilots}),logger:{error:(...args)=>errors.push(args)},
    now:()=>1000,setIntervalFn:fn=>{frame=fn;return 1;}});
  frame();assert.deepEqual(errors,[]);assert.equal(seen.length,3);
  for(const {id,map,pilots} of seen){
    assert.equal(map.id,`portal-${id}`);assert.equal(map.width,7800);assert.equal(map.height,5400);
    assert.equal(map.spawn.x,0);assert.equal(map.spawn.y,0);assert.deepEqual(pilots.map(player=>player.id),[`pilot-${id}`]);
  }
});
