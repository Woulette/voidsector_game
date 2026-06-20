import assert from "node:assert/strict";
import test from "node:test";
import { createGameConnectionRecoveryController } from "../../src/app/gameConnectionRecovery.js";

function createClassList(initial = []){
  const values = new Set(initial);
  return {
    add:value=>values.add(value),
    contains:value=>values.has(value),
    remove:value=>values.delete(value)
  };
}

function createElement({hidden = false} = {}){
  const listeners = new Map();
  return {
    classList:createClassList(hidden ? ["hidden"] : []),
    dataset:{},
    disabled:false,
    textContent:"",
    addEventListener(type, handler){ listeners.set(type, handler); },
    removeAttribute(name){ delete this[name]; },
    setAttribute(name, value){ this[name] = value; },
    listeners
  };
}

function createFixture({authToken = "token", gameRunning = true, profileReady = false} = {}){
  const root = createElement({hidden:true});
  const status = createElement();
  const reconnectButton = createElement();
  const closeButton = createElement();
  const elements = {
    gameDisconnectOverlay:root,
    gameDisconnectStatus:status,
    gameReconnectBtn:reconnectButton,
    gameCloseBtn:closeButton
  };
  const listeners = new Map();
  const windowRef = {
    closed:false,
    addEventListener(type, handler){
      if(!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    close(){}
  };
  let suspended = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const previousDocument = globalThis.document;
  globalThis.document = {
    body:{classList:createClassList(["app-booting"])},
    getElementById:id=>elements[id] || null
  };
  const controller = createGameConnectionRecoveryController({
    appMode:"game",
    multiplayer:{auth:{error:"", profileReady}},
    isGameRunning:()=>gameRunning,
    suspendGame:()=>{ suspended += 1; },
    resumeGame(){},
    reconnect:()=>true,
    getAuthToken:()=>authToken,
    disconnect(){},
    windowRef,
    networkGraceMs:750,
    setTimeoutRef(callback){
      const id = nextTimerId++;
      timers.set(id, callback);
      return id;
    },
    clearTimeoutRef:id=>timers.delete(id)
  });
  return {
    controller,
    root,
    suspended:()=>suspended,
    dispatchWindow(type){
      for(const handler of listeners.get(type) || []) handler({type});
    },
    flushTimers(){
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(callback=>callback());
    },
    restore(){ globalThis.document = previousDocument; }
  };
}

test("an intentional page reload does not display the disconnect overlay", ()=>{
  const fixture = createFixture();
  try{
    fixture.dispatchWindow("beforeunload");
    fixture.controller.handleChange({detail:{reason:"connection:disconnect", payload:{socketReason:"transport close"}}});

    assert.equal(fixture.controller.isActive(), false);
    assert.equal(fixture.root.classList.contains("hidden"), true);
    assert.equal(fixture.suspended(), 0);
  }finally{
    fixture.restore();
  }
});

test("a real network disconnect displays the recovery overlay after the grace period", ()=>{
  const fixture = createFixture();
  try{
    fixture.controller.handleChange({detail:{reason:"connection:disconnect", payload:{socketReason:"transport close"}}});

    assert.equal(fixture.controller.isActive(), false);
    fixture.flushTimers();

    assert.equal(fixture.controller.isActive(), true);
    assert.equal(fixture.root.classList.contains("hidden"), false);
    assert.equal(fixture.suspended(), 1);
  }finally{
    fixture.restore();
  }
});

test("pages restored from browser history detect later disconnects normally", ()=>{
  const fixture = createFixture();
  try{
    fixture.dispatchWindow("pagehide");
    fixture.dispatchWindow("pageshow");
    fixture.controller.handleChange({detail:{reason:"connection:disconnect", payload:{}}});
    fixture.flushTimers();

    assert.equal(fixture.controller.isActive(), true);
  }finally{
    fixture.restore();
  }
});

test("a transient disconnect cancelled by an immediate reconnect never displays the overlay", ()=>{
  const fixture = createFixture();
  try{
    fixture.controller.handleChange({detail:{reason:"connection:disconnect", payload:{socketReason:"transport close"}}});
    fixture.controller.handleChange({detail:{reason:"connection", payload:{}}});
    fixture.flushTimers();

    assert.equal(fixture.controller.isActive(), false);
    assert.equal(fixture.root.classList.contains("hidden"), true);
    assert.equal(fixture.suspended(), 0);
  }finally{
    fixture.restore();
  }
});

test("initial saved-session authentication does not display the disconnect overlay", ()=>{
  const fixture = createFixture({authToken:"saved-token", gameRunning:false, profileReady:false});
  try{
    fixture.controller.handleChange({detail:{reason:"auth:required", payload:{eventName:"player:state"}}});
    fixture.controller.handleChange({detail:{reason:"connection:error", payload:{}}});

    assert.equal(fixture.controller.isActive(), false);
    assert.equal(fixture.root.classList.contains("hidden"), true);
    assert.equal(fixture.suspended(), 0);
  }finally{
    fixture.restore();
  }
});

test("missing authentication still displays the account recovery overlay", ()=>{
  const fixture = createFixture({authToken:"", gameRunning:false, profileReady:false});
  try{
    fixture.controller.handleChange({detail:{reason:"auth:required", payload:{}}});

    assert.equal(fixture.controller.isActive(), true);
    assert.equal(fixture.root.dataset.source, "account");
  }finally{
    fixture.restore();
  }
});
