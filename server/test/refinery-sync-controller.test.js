import test from "node:test";
import assert from "node:assert/strict";
import {createRefinerySyncController} from "../../src/app/refinerySyncController.js";

function fixture({appMode="launcher",view="refinery",hidden=false,connected=true,profileReady=true,accountId="qa"}={}){
  let time=0,nextId=1,activeView=view;
  const timers=new Map(),calls=[];
  const documentRef={hidden,visibilityState:hidden ? "hidden" : "visible"};
  const multiplayer={connected,socket:{emit:(...args)=>calls.push({time,args})},auth:{account:accountId ? {id:accountId} : null,profileReady}};
  const controller=createRefinerySyncController({appMode,getCurrentView:()=>activeView,multiplayer,documentRef,now:()=>time,
    setIntervalRef(callback,interval){const id=nextId++;timers.set(id,{callback,interval,next:time+interval});return id;},
    clearIntervalRef:id=>timers.delete(id)});
  return {controller,calls,multiplayer,documentRef,timers,setView:value=>{activeView=value;},setVisible(value){documentRef.hidden=!value;documentRef.visibilityState=value ? "visible" : "hidden";},
    advance(ms){
      const until=time+ms;
      while(timers.size){
        const next=Math.min(...[...timers.values()].map(timer=>timer.next));
        if(next>until)break;
        time=next;
        for(const [id,timer] of [...timers]){
          if(timer.next!==next || !timers.has(id))continue;
          timer.next+=timer.interval;timer.callback();
        }
      }
      time=until;
    }};
}

test("a direct refinery entry requests authoritative stock immediately and every ten seconds",()=>{
  const f=fixture();
  f.controller.init();
  assert.deepEqual(f.calls,[{time:0,args:["profile:refresh"]}]);
  f.advance(9999);
  assert.equal(f.calls.length,1);
  f.advance(1);
  assert.deepEqual(f.calls[1],{time:10000,args:["profile:refresh"]});
  f.advance(20000);
  assert.deepEqual(f.calls.map(call=>call.time),[0,10000,20000,30000]);
});

test("leaving the refinery stops requests and returning refreshes at the next one-second tick",()=>{
  const f=fixture({view:"hangar"});
  f.controller.init();f.advance(3000);
  assert.equal(f.calls.length,0);
  f.setView("refinery");f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[4000]);
  f.setView("shop");f.advance(20000);
  assert.equal(f.calls.length,1);
  f.setView("refinery");f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[4000,25000]);
});

test("hidden tabs stay quiet and refocusing refreshes without waiting for the ten-second period",()=>{
  const f=fixture({hidden:true});
  f.controller.init();f.advance(15000);
  assert.equal(f.calls.length,0);
  f.setVisible(true);f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[16000]);
  f.setVisible(false);f.advance(1000);
  f.setVisible(true);f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[16000,18000]);
  f.setVisible(false);f.advance(20000);
  assert.equal(f.calls.length,2);
});

test("rapid navigation and restarting the controller respect the server's two-second request limit",()=>{
  const f=fixture();
  f.controller.init();
  f.setView("hangar");f.advance(1000);
  f.setView("refinery");
  f.controller.destroy();f.controller.init();
  assert.equal(f.calls.length,1);
  f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[0,2000]);
  f.controller.init();
  assert.equal(f.timers.size,1,"initializing twice must not create concurrent polling loops");
});

test("disconnects and unauthenticated profiles emit nothing; recovery refreshes at the next tick",()=>{
  const f=fixture({connected:false});
  f.controller.init();f.advance(10000);
  assert.equal(f.calls.length,0);
  f.multiplayer.connected=true;f.multiplayer.auth.profileReady=false;f.advance(5000);
  assert.equal(f.calls.length,0);
  f.multiplayer.auth.profileReady=true;f.multiplayer.auth.account=null;f.advance(5000);
  assert.equal(f.calls.length,0);
  f.multiplayer.auth.account={id:"qa"};f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[21000]);
  f.multiplayer.connected=false;f.advance(3000);
  f.multiplayer.connected=true;f.advance(1000);
  assert.deepEqual(f.calls.map(call=>call.time),[21000,25000]);
});

test("game windows never poll and destroy removes all scheduled work",()=>{
  const game=fixture({appMode:"game"});
  game.controller.init();game.advance(30000);
  assert.equal(game.calls.length,0);
  const launcher=fixture();
  launcher.controller.init();launcher.controller.destroy();
  assert.equal(launcher.timers.size,0);
  launcher.advance(30000);
  assert.equal(launcher.calls.length,1);
});

test("a failed socket emit retries within the throttle",()=>{
  const f=fixture();
  f.multiplayer.socket.emit=()=>{throw new Error("socket closed");};
  f.controller.init();
  f.multiplayer.socket.emit=(...args)=>f.calls.push(args);
  f.advance(1000);assert.equal(f.calls.length,0);
  f.advance(1000);assert.deepEqual(f.calls,[["profile:refresh"]]);
});
