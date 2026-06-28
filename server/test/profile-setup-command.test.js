import test from "node:test";
import assert from "node:assert/strict";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";

function createCommands(auth){
  const emitted = [];
  const commands = createSocketCommands({
    multiplayer:{
      connected:true,
      auth,
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });
  return {commands, emitted};
}

test("profile setup can be sent before the MMO profile is marked ready", ()=>{
  const {commands, emitted} = createCommands({
    account:{id:"account-1"},
    profileReady:false
  });

  assert.equal(commands.setupServerProfile({name:"Avosoma", firmId:"astra"}), true);
  assert.deepEqual(emitted, [{
    eventName:"profile:setup",
    payload:{name:"Avosoma", firmId:"astra"}
  }]);
});

test("profile setup still requires an authenticated account", ()=>{
  const {commands, emitted} = createCommands({
    account:null,
    profileReady:false
  });

  assert.equal(commands.setupServerProfile({name:"Avosoma", firmId:"astra"}), false);
  assert.deepEqual(emitted, []);
});
