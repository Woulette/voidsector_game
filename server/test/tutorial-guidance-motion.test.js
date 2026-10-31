import test from "node:test";
import assert from "node:assert/strict";
import { createTutorialWorldGuidance } from "../../src/game/systems/tutorialWorldGuidance.js";
import { createCombatLoop } from "../../src/game/systems/combatLoop.js";
import { FIRMS, getFirmMapId, getFirmMapName } from "../../src/data/firms.js";

function fixture(firmId = "astra"){
  const homeId = getFirmMapId(firmId,1), secondId = getFirmMapId(firmId,2);
  const maps = [
    {id:homeId,name:getFirmMapName(firmId,1),spawn:{x:390.25,y:280.5},
      portals:[{id:"outbound",x:860.5,y:310.75,targetMap:secondId}]},
    {id:secondId,name:getFirmMapName(firmId,2),spawn:{x:80,y:90},
      portals:[{id:"homebound",x:100,y:120,targetMap:homeId}]}
  ];
  const state = {
    running:true,firmId,currentMap:maps[0],tutorialStep:"motion-test",
    player:{x:200.25,y:150.5,hp:4000,maxHp:5000},
    camera:{x:100.125,y:80.25,zoom:1.125},
    enemies:[{id:"local-id",serverId:"locked-mob",kind:"drone_pirate",hp:100,x:1200.5,y:700.25}]
  };
  const stations = [{id:"quests",x:520.75,y:360.25,title:"RELAIS DE QUETES"}];
  const viewport = {left:10.25,top:20.5,right:1010.25,bottom:620.5};
  const calls = {stations:0,portals:0};
  const guidance = createTutorialWorldGuidance({
    getState:()=>state,maps,
    getStations:()=>{ calls.stations += 1; return stations; },
    getPortals:map=>{ calls.portals += 1; return map.portals; },
    getViewport:()=>viewport,
    enemyTypes:{drone_pirate:{name:"Orbe sentinelle"}}
  });
  return {state,maps,stations,viewport,calls,guidance};
}

function assertProjection(snapshot,point,f){
  assert.equal(snapshot.target.screenX,f.viewport.left+(point.x-f.state.camera.x)*f.state.camera.zoom);
  assert.equal(snapshot.target.screenY,f.viewport.top+(point.y-f.state.camera.y)*f.state.camera.zoom);
  assert.equal(snapshot.player.screenX,f.viewport.left+(f.state.player.x-f.state.camera.x)*f.state.camera.zoom);
  assert.equal(snapshot.player.screenY,f.viewport.top+(f.state.player.y-f.state.camera.y)*f.state.camera.zoom);
  assert.equal(snapshot.target.distance,Math.hypot(point.x-f.state.player.x,point.y-f.state.player.y));
}

for(const fps of [60,30]){
  test(`relay, HQ, portal and enemy follow every ${fps} FPS painted camera for all firms`,()=>{
    for(const firm of FIRMS){
      for(const target of [{type:"station",id:"quests"},{type:"hq"},{type:"map2"},{type:"enemy",kinds:["drone_pirate"]}]){
        const f = fixture(firm.id);
        const selected = f.guidance.getTutorialSnapshot(target);
        const original = structuredClone(selected), selectionCalls = {...f.calls};
        let previousX = selected.target.screenX;
        for(let frame = 1; frame <= 8; frame += 1){
          const elapsed = frame/fps;
          f.state.camera.x = 100.125+elapsed*220;
          f.state.camera.y = 80.25+elapsed*80;
          f.state.camera.zoom = 1.125+elapsed*.1;
          f.state.player.x = 200.25+elapsed*220;
          f.state.player.y = 150.5+elapsed*80;
          const rendered = f.guidance.getRenderSnapshot(selected);
          assert.ok(rendered,`${firm.id}/${target.type}/frame ${frame}`);
          assertProjection(rendered,selected.target,f);
          assert.notEqual(rendered.target.screenX,previousX,"camera movement must not wait for the 100 ms tutorial tick");
          assert.equal(rendered.target.id,selected.target.id);
          assert.equal(rendered.target.name,selected.target.name);
          assert.equal(rendered.destinationMapId,selected.destinationMapId);
          previousX = rendered.target.screenX;
        }
        assert.deepEqual(f.calls,selectionCalls,"draws must not resolve stations or traverse portal routes again");
        assert.deepEqual(selected,original,"rendering must not mutate the slower validation snapshot");
      }
    }
  });
}

test("a moving enemy is re-read by its canonical server ID without switching to a closer spawn",()=>{
  const f = fixture();
  const selected = f.guidance.getTutorialSnapshot({type:"enemy",kinds:["drone_pirate"]});
  const moving = {...f.state.enemies[0],x:1400.125,y:880.75};
  f.state.enemies = [
    {id:"closer",serverId:"new-nearer",kind:"drone_pirate",hp:100,x:205,y:155},
    moving
  ];
  const rendered = f.guidance.getRenderSnapshot(selected);
  assert.equal(rendered.target.id,"locked-mob");
  assertProjection(rendered,moving,f);
  assert.equal(selected.target.x,1200.5);
});

for(const invalidation of ["dead","removed","immune","untargetable"]){
  test(`a ${invalidation} selected enemy disappears immediately and waits for the next target-selection tick`,()=>{
    const f = fixture();
    const selected = f.guidance.getTutorialSnapshot({type:"enemy",kinds:["drone_pirate"]});
    const enemy = f.state.enemies[0];
    f.state.enemies.push({id:"next-mob",kind:"drone_pirate",hp:100,x:600,y:500});
    if(invalidation === "dead") enemy.hp = 0;
    if(invalidation === "removed") f.state.enemies.shift();
    if(invalidation === "immune") enemy.damageImmune = true;
    if(invalidation === "untargetable") enemy.untargetable = true;
    assert.equal(f.guidance.getRenderSnapshot(selected),null);
    assert.equal(f.guidance.getTutorialSnapshot({type:"enemy",kinds:["drone_pirate"]}).target.id,"next-mob");
  });
}

test("a stale world marker cannot survive stopping the game, changing map or losing frame state",()=>{
  for(const invalidate of [
    f=>{ f.state.running = false; },
    f=>{ f.state.currentMap = f.maps[1]; },
    f=>{ f.state.currentMap = null; },
    f=>{ f.state.player = null; },
    f=>{ f.state.camera = null; }
  ]){
    const f = fixture();
    const selected = f.guidance.getTutorialSnapshot({type:"station",id:"quests"});
    invalidate(f);
    assert.equal(f.guidance.getRenderSnapshot(selected),null);
  }
  const f = fixture();
  assert.equal(f.guidance.getRenderSnapshot(null),null);
  assert.equal(f.guidance.getRenderSnapshot(f.guidance.getTutorialSnapshot({type:"station",id:"missing"})),null);
});

test("frame projection refreshes fractional canvas bounds and player targets after resize",()=>{
  const f = fixture();
  const selected = f.guidance.getTutorialSnapshot({type:"player"});
  Object.assign(f.viewport,{left:42.125,top:17.75,right:842.125,bottom:517.75});
  Object.assign(f.state.player,{x:203.875,y:159.125});
  const rendered = f.guidance.getRenderSnapshot(selected);
  assertProjection(rendered,f.state.player,f);
  assert.equal(rendered.viewport.width,800);
  assert.equal(rendered.viewport.height,500);
  assert.equal(rendered.canvas,rendered.viewport);
  assert.notEqual(rendered.viewport,selected.viewport);
  assert.notEqual(rendered.target.screenX,Math.round(rendered.target.screenX),"subpixel movement must survive projection");
});

test("render listeners run only on a rendered frame, deduplicate and unsubscribe safely",()=>{
  const {guidance} = fixture();
  let first = 0, second = 0;
  const listener = ()=>{ first += 1; };
  const unsubscribe = guidance.subscribeFrame(listener);
  guidance.subscribeFrame(listener);
  const unsubscribeSecond = guidance.subscribeFrame(()=>{ second += 1; });
  guidance.getTutorialSnapshot({type:"hq"});
  assert.equal(first,0,"selection is not a painted frame");
  guidance.renderFrame();
  assert.deepEqual([first,second],[1,1]);
  unsubscribe();
  unsubscribe();
  guidance.renderFrame();
  assert.deepEqual([first,second],[1,2]);
  unsubscribeSecond();
  guidance.renderFrame();
  assert.deepEqual([first,second],[1,2]);
});

test("30 FPS rendering keeps guidance on the painted camera while skipped and hidden updates stay silent",t=>{
  const originals = new Map();
  const install = (name,value)=>{
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
  };
  t.after(()=>{
    for(const [name,descriptor] of originals){
      if(descriptor) Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  let nextId = 0, interval = null, lastTime = 0;
  const callbacks = new Map();
  install("document",{hidden:false});
  install("requestAnimationFrame",callback=>{ callbacks.set(++nextId,callback); return nextId; });
  install("cancelAnimationFrame",id=>callbacks.delete(id));
  install("setInterval",callback=>{ interval = callback; return 1; });
  install("clearInterval",()=>{ interval = null; });
  const f = fixture(), selected = f.guidance.getTutorialSnapshot({type:"station",id:"quests"});
  let draws = 0, projections = 0, paintedCameraX = null, marker = null;
  f.guidance.subscribeFrame(()=>{
    projections += 1;
    assert.equal(f.state.camera.x,paintedCameraX,"guidance observes the camera used by the completed draw");
    marker = f.guidance.getRenderSnapshot(selected);
  });
  const loop = createCombatLoop({
    isRunning:()=>f.state.running,getLastTime:()=>lastTime,setLastTime:value=>{ lastTime=value; },getFpsLimit:()=>30,
    update:dt=>{ f.state.camera.x += dt*240; },
    draw:()=>{ draws += 1; paintedCameraX=f.state.camera.x; f.guidance.renderFrame(); }
  });
  const frame = time=>{
    const [id,callback] = callbacks.entries().next().value;
    callbacks.delete(id);
    callback(time);
  };
  loop.start(0);
  frame(1000/60);
  assert.equal(draws,1);
  const firstMarkerX = marker.target.screenX;
  frame(2000/60);
  assert.equal(draws,1,"the intervening RAF advances simulation without painting");
  assert.equal(marker.target.screenX,firstMarkerX,"the marker must stay with that still-visible image");
  frame(3000/60);
  assert.equal(draws,2);
  assert.notEqual(marker.target.screenX,firstMarkerX);
  assertProjection(marker,selected.target,f);
  document.hidden = true;
  frame(4000/60);
  interval();
  assert.deepEqual([draws,projections],[2,2],"background simulation must not render tutorial geometry");
  f.state.running = false;
  frame(5000/60);
  assert.deepEqual([draws,projections],[2,2]);
});
