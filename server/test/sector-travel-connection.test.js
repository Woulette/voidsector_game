import assert from "node:assert/strict";
import test from "node:test";
import { createSectorTravelConnection } from "../../src/multiplayer/sectorTravel.js";

function socket(){
  const listeners = new Map(), sent = [];
  return {connected:true,sent,listeners,
    on(name,fn){ const set = listeners.get(name) || new Set(); set.add(fn); listeners.set(name,set); },
    off(name,fn){listeners.get(name)?.delete(fn);},
    emit(name,payload){sent.push({name,payload});},
    receive(name,event){for(const fn of listeners.get(name) || []) fn(event);}
  };
}

function fixture(){
  const multiplayer = {connected:true, socket:socket(), auth:{account:{id:"account-1"},profileReady:true}};
  const states=[],errors=[],disconnects=[];
  const connection = createSectorTravelConnection({multiplayer,onState:event=>states.push(event),
    onError:event=>errors.push(event),onDisconnect:()=>disconnects.push(true)});
  return {multiplayer,connection,states,errors,disconnects};
}

test("travel transport sends canonical intent without a client supplied route or position", ()=>{
  const f=fixture();
  assert.equal(f.connection.start({targetMapId:"2",requestId:"req-1",route:[0,2],x:100}),true);
  assert.deepEqual(f.multiplayer.socket.sent,[{name:"travel:start",payload:{targetMapId:"2",requestId:"req-1"}}]);
  assert.equal(f.connection.cancel({requestId:"req-1"}),true);
  assert.deepEqual(f.multiplayer.socket.sent.at(-1),{name:"travel:cancel",payload:{requestId:"req-1"}});
});

test("server state and errors are delivered once across repeated binding updates", ()=>{
  const f=fixture();
  f.connection.updateSocketBinding();
  f.connection.updateSocketBinding();
  f.connection.isConnected();
  const event={id:"one",requestId:"req-1",status:"traveling"};
  f.multiplayer.socket.receive("travel:state",event);
  f.multiplayer.socket.receive("travel:error",{requestId:"req-1",code:"denied"});
  assert.equal(f.states.length,1);
  assert.equal(f.errors.length,1);
  assert.deepEqual(f.connection.getState(),event);
  assert.equal(f.multiplayer.socket.listeners.get("travel:state").size,1);
});

test("socket replacement removes old listeners and invalidates the previous connection", ()=>{
  const f=fixture();
  f.connection.updateSocketBinding();
  const previous=f.multiplayer.socket;
  f.multiplayer.socket=socket();
  assert.equal(f.connection.isConnected(),true);
  previous.receive("travel:state",{id:"old"});
  assert.equal(f.states.length,0);
  assert.equal(previous.listeners.get("travel:state").size,0);
  assert.equal(f.disconnects.length,1);
  f.multiplayer.socket.receive("travel:state",{id:"new"});
  assert.equal(f.states.length,1);
});

test("disconnect and unauthenticated sessions never send buffered travel commands", ()=>{
  const f=fixture();
  f.connection.updateSocketBinding();
  f.multiplayer.socket.connected=false;
  f.multiplayer.socket.receive("disconnect");
  assert.equal(f.connection.start({targetMapId:"2",requestId:"req-1"}),false);
  assert.equal(f.connection.cancel({requestId:"req-1"}),false);
  assert.equal(f.multiplayer.socket.sent.length,0);
  assert.equal(f.disconnects.length,1);
  f.multiplayer.socket.connected=true;
  f.multiplayer.auth.profileReady=false;
  assert.equal(f.connection.start({targetMapId:"2",requestId:"req-2"}),false);
  assert.equal(f.connection.getState(),null);
});

test("disposing releases only owned listeners and rejects all further travel requests", ()=>{
  const f=fixture();
  const other=()=>{};
  f.multiplayer.socket.on("travel:state",other);
  f.connection.updateSocketBinding();
  f.connection.dispose();
  assert.deepEqual([...f.multiplayer.socket.listeners.get("travel:state")],[other]);
  assert.equal(f.connection.start({targetMapId:"2",requestId:"req-1"}),false);
  assert.equal(f.connection.cancel(),false);
});
