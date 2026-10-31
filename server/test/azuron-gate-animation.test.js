import assert from "node:assert/strict";
import test from "node:test";
import { AZURON_GATE_VISUAL_ASSETS,isAnimatedAzuronPortal } from "../../src/data/azuronGateVisuals.js";
import { SECTOR_PORTAL_VISUAL_ASSETS } from "../../src/data/sectorPortalVisuals.js";
import { drawAzuronPortal,drawAzuronPortalTransferFocus } from "../../src/game/render/azuronPortalVisual.js";
import { drawMapPortals } from "../../src/game/render/mapPortals.js";
import { drawPortalTransitionOverlay } from "../../src/game/render/portalTransition.js";
import { getCombatMapAssetPaths } from "../../src/game/combatAssets.js";
import { createCombatPortalNavigationSystem } from "../../src/game/systems/combatPortalNavigation.js";
import { createCombatFrameUpdateSystem } from "../../src/game/systems/combatFrameUpdate.js";
import { advanceMapPortalTransition } from "../../src/game/systems/mapPortalTransfer.js";
import { getAzuronStageGates } from "../../src/data/azuronPortal.js";
import { getAzuronActivationVisual,drawAzuronEnergyField } from "../../src/game/render/azuronPortalActivation.js";

const prepared={id:"paid-blue",prepared:true,dungeonPortal:true,portalId:"blue",x:300,y:200,r:115,activationRadius:430};
const gate=getAzuronStageGates({nextWave:6})[0];
const rim={complete:true,naturalWidth:1280,naturalHeight:1280};
const energy={complete:true,naturalWidth:1254,naturalHeight:1254};
const cache={[AZURON_GATE_VISUAL_ASSETS.rim]:rim,[AZURON_GATE_VISUAL_ASSETS.energy]:energy};

function drawing(){
  const calls=[],gradient={addColorStop(...args){calls.push(["color",...args]);}};let depth=0;
  const ctx=new Proxy({save(){depth++;},restore(){depth--;},createLinearGradient(){calls.push(["linear"]);return gradient;},createRadialGradient(...args){calls.push(["radial",...args]);return gradient;}},
    {get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args])});
  return {ctx,calls,get depth(){return depth;}};
}

test("the first three portal entries and continuations use the same gate, preloaded on all four home maps",()=>{
  assert.equal(isAnimatedAzuronPortal(prepared),true);assert.equal(isAnimatedAzuronPortal(gate),true);
  for(const portal of [{...prepared,portalId:"ionis"},{...prepared,closed:true},{...prepared,damaged:true},getAzuronStageGates({nextWave:6})[1]]){
    assert.equal(isAnimatedAzuronPortal(portal),false);
  }
  for(const id of [0,20,30,40,"portal-blue","portal-violet","portal-red"]){
    const paths=getCombatMapAssetPaths({id});
    for(const path of Object.values(AZURON_GATE_VISUAL_ASSETS)) assert.ok(paths.includes(path));
  }
  assert.ok(!getCombatMapAssetPaths({id:"portal-ionis"}).includes(AZURON_GATE_VISUAL_ASSETS.rim));
});

test("Azuron uses the exact sector-gate oval projection and moves energy independently from the frame",()=>{
  const first=drawing(),second=drawing();
  assert.equal(drawAzuronPortal({...first,cache,portal:prepared,now:1000}),true);
  assert.equal(drawAzuronPortal({...second,cache,portal:{...prepared},now:1050}),true);
  for(const f of [first,second]){
    assert.ok(f.calls.some(c=>c[0]==="rotate"&&c[1]===-.045));
    assert.ok(f.calls.some(c=>c[0]==="scale"&&c[1]===.74&&c[2]===1.04));
    assert.ok(f.calls.some(c=>c[0]==="drawImage"&&c[1]===rim));
    assert.equal(f.depth,0);
  }
  const energyRotation=f=>f.calls.filter(c=>c[0]==="rotate"&&c[1]!==-.045).at(-1)[1];
  assert.ok(energyRotation(second)>energyRotation(first),"normalised descriptor clones must not reset the vortex flow");
});

test("only the matching Azuron portal intensifies during a transfer and reduced effects retain its art",()=>{
  const transition={portal:{...prepared},elapsed:2,duration:4};
  const idle=drawing(),active=drawing(),other=drawing(),low=drawing();
  drawAzuronPortal({...idle,cache,portal:prepared,now:1100});
  drawAzuronPortal({...active,cache,portal:prepared,now:1150,portalTransition:transition});
  drawAzuronPortal({...other,cache,portal:prepared,now:1200,portalTransition:{...transition,portal:{...prepared,id:"another"}}});
  drawAzuronPortal({...low,cache,portal:prepared,now:1250,portalTransition:transition,simplified:true});
  const trails=f=>f.calls.filter(c=>c[0]==="stroke").length;
  assert.ok(trails(active)>trails(idle));assert.equal(trails(other),trails(idle));assert.equal(trails(low),0);
  assert.ok(low.calls.some(c=>c[0]==="drawImage"&&c[1]===rim));assert.equal(low.depth,0);
});

test("world dispatch uses the new frame while transfer focus and caption leave the scene visible",()=>{
  const f=drawing(),legacy={complete:true,naturalWidth:768,naturalHeight:768};
  drawMapPortals({...f,cache:{...cache,"assets/portals/seuil_azuron.png?v=20260726-kharon1":legacy},
    currentMap:{},getMapPortals:()=>[gate],player:{x:gate.x,y:0}});
  assert.ok(f.calls.some(c=>c[0]==="drawImage"&&c[1]===rim));
  assert.ok(!f.calls.some(c=>c[0]==="drawImage"&&c[1]===legacy));
  const transfer={portal:gate,elapsed:2,duration:4},focus=drawing(),caption=drawing();
  drawAzuronPortalTransferFocus({...focus,camera:{x:0,y:0},transition:transfer,now:1000});
  assert.ok(focus.calls.some(c=>c[0]==="radial"));
  assert.equal(focus.calls.filter(c=>c[0]==="lineTo"||c[0]==="linear").length,0,"Azuron must not reuse the sector transfer starburst");
  drawPortalTransitionOverlay({...caption,transition:transfer,maps:[],viewW:800,viewH:600});
  assert.ok(caption.calls.some(c=>c[0]==="fillText"&&c[1].includes("VAGUES 6–10")&&c[1].includes("2S")));
  assert.equal(caption.calls.filter(c=>c[0]==="fillRect").length,0);
  assert.equal(f.depth,0);assert.equal(focus.depth,0);assert.equal(caption.depth,0);
});

test("Azuron's four-second charge accelerates continuously and expands a luminous core inside its opening",()=>{
  const phases=[0,.25,.5,.75,1].map(getAzuronActivationVisual);
  const turns=phases.slice(1).map((phase,i)=>phase.rotation-phases[i].rotation);
  assert.ok(turns.every((turn,i)=>i===0||turn>turns[i-1]),"each equal time slice must rotate farther than the previous one");
  assert.equal(phases[0].coreRadius,0);
  assert.ok(phases.every((phase,i)=>i===0||phase.coreRadius>phases[i-1].coreRadius));
  assert.ok(phases.at(-1).coreRadius>.6&&phases.at(-1).glowRadius<=1,"a large bright core stays inside the opening");
  assert.ok(phases.at(-1).rotation>Math.PI*8,"the charge adds several complete turns");
  assert.deepEqual(getAzuronActivationVisual(-1),phases[0]);assert.deepEqual(getAzuronActivationVisual(NaN),phases[0]);
  assert.deepEqual(getAzuronActivationVisual(2),phases.at(-1));
  for(const simplified of [false,true]){
    const f=drawing();drawAzuronEnergyField({...f,image:energy,r:100,flow:0,charge:.75,simplified});
    assert.ok(f.calls.some(c=>c[0]==="rotate"&&c[1]>Math.PI*2));
    assert.ok(f.calls.some(c=>c[0]==="radial"&&c.at(-1)>40));
    assert.equal(f.calls.filter(c=>c[0]==="lineTo"||c[0]==="linear").length,0);
    assert.equal(f.calls.filter(c=>c[0]==="stroke").length,simplified?0:12);
    assert.equal(f.depth,0);
  }
});

function navigation(portal=prepared){
  const calls=[],state={gameMode:portal.azuronGate?"portal":"open",player:{x:portal.x,y:portal.y,hp:1000,maxHp:1000},
    camera:{x:0,y:0},teleportLock:0,bullets:[],currentMap:{id:portal.azuronGate?`portal-${portal.portalId || "blue"}`:0}};
  const nav=createCombatPortalNavigationSystem({mapList:[],getState:()=>state,setState:p=>Object.assign(state,p),
    actions:{setActiveLaserSlot(){},updateGameActionBar(){}},
    getMapPortals:()=>[portal],findMapPortalAt:()=>portal,startServerPortal:id=>calls.push(["enter",id]),
    interactAzuronPortal:action=>calls.push(["gate",action]),showToast(){}});
  const frame=createCombatFrameUpdateSystem({getState:()=>state,setState:p=>Object.assign(state,p),
    advancePortalTransition:advanceMapPortalTransition,completeDungeonTransition:nav.completeDungeonTransition,
    loadMap:()=>assert.fail("Dungeon transitions must wait for authoritative server admission"),
    serverEvents:{applyAll(){}},updateParticles(){},updateCamera(){},updateHud(){},getCanvas:()=>({}),
    sendPlayerSnapshot(){},beams:{clear(){}}});
  return {state,calls,nav,frame};
}

for(const portal of ["blue","violet","red"].flatMap(portalId=>[{...prepared,portalId},getAzuronStageGates({nextWave:6,portalId})[0]])){
  test(`${portal.portalId}: ${portal.azuronGate?"continuation":"entry"} charges for four seconds before exactly one server request`,()=>{
    const f=navigation(portal);assert.equal(f.nav.tryUseMapPortal(),true);
    f.nav.tryUseMapPortal();assert.deepEqual(f.calls,[]);
    f.frame.update(3.999);assert.deepEqual(f.calls,[]);assert.ok(f.state.portalTransition);
    f.frame.update(.001);assert.equal(f.state.portalTransition,null);
    assert.deepEqual(f.calls,[portal.azuronGate?["gate","continue"]:["enter",portal.portalId]]);
    assert.equal(f.state.currentMap.id,portal.azuronGate?`portal-${portal.portalId || "blue"}`:0);
    f.nav.tryUseMapPortal();assert.equal(f.calls.length,1);
  });
}

test("death, lost proximity or a mode change cannot commit the delayed entry",()=>{
  for(const cancel of [f=>f.state.player.isDead=true,f=>f.state.player.x+=5000,f=>f.state.gameMode="portal"]){
    const f=navigation();f.nav.tryUseMapPortal();cancel(f);f.frame.update(4);
    assert.deepEqual(f.calls,[]);assert.equal(f.state.portalTransition,null);
  }
});

test("the exit gate and the other fragment portals retain their existing server paths",()=>{
  const exit=navigation(getAzuronStageGates({nextWave:6})[1]);exit.nav.tryUseMapPortal();
  assert.deepEqual(exit.calls,[["gate","exit"]]);assert.equal(exit.state.portalTransition,undefined);
  const other=navigation({...prepared,portalId:"ionis"});
  other.nav.tryUseMapPortal();assert.deepEqual(other.calls,[["enter","ionis"]]);
  assert.equal(other.state.portalTransition,undefined);
  assert.equal(drawAzuronPortal({...drawing(),cache,portal:{...prepared,portalId:"ionis"}}),false);
  assert.ok(!Object.values(AZURON_GATE_VISUAL_ASSETS).some(path=>Object.values(SECTOR_PORTAL_VISUAL_ASSETS).includes(path)));
});
