import assert from "node:assert/strict";
import test from "node:test";
import {
  createBackgroundSyncCoordinator,
  getRateLimitToastMessage
} from "../../src/multiplayer/backgroundSync.js";
import { createFirmCommands } from "../../src/multiplayer/firmCommands.js";
import { installFirmSocketListeners } from "../../src/multiplayer/firmSocketListeners.js";
import { installPlayerSocketListeners } from "../../src/multiplayer/playerSocketListeners.js";
import { createSocialCommands } from "../../src/multiplayer/socialCommands.js";

function createAuthenticatedMultiplayer(emitted){
  return {
    connected:true,
    auth:{account:{id:"account-1"}, profileReady:true},
    socket:{
      emit(eventName, payload){
        emitted.push({eventName, payload});
      }
    }
  };
}

test("background sync coordinator merges rapid calls from social and firm wrappers", ()=>{
  let now = 1000;
  const emitted = [];
  const multiplayer = createAuthenticatedMultiplayer(emitted);
  const backgroundSync = createBackgroundSyncCoordinator({
    multiplayer,
    now:()=>now,
    logger:{warn(){}}
  });
  const social = createSocialCommands({multiplayer, toast(){}, backgroundSync});
  const firm = createFirmCommands({multiplayer, toast(){}, backgroundSync});

  assert.equal(social.requestSocialSync(), true);
  assert.equal(social.requestSocialSync(), false);
  assert.equal(social.requestFirmRankingSync(), true);
  assert.equal(firm.requestFirmSync(), false);
  assert.deepEqual(emitted.map(entry=>entry.eventName), ["social:sync", "firm:sync"]);

  backgroundSync.markReceived("firm:sync", {includeShop:false});
  now += 500;
  assert.equal(firm.requestFirmSync(), false);
  assert.equal(firm.requestFirmSync({includeShop:true}), true);
  assert.deepEqual(emitted.at(-1), {
    eventName:"firm:sync",
    payload:{includeShop:true}
  });
});

test("a leaderboard snapshot received during hello satisfies the client cache", ()=>{
  let now = 5000;
  const multiplayer = {};
  const emitted = [];
  const backgroundSync = createBackgroundSyncCoordinator({
    multiplayer,
    now:()=>now,
    logger:{warn(){}}
  });

  backgroundSync.markReceived("leaderboard:sync");
  assert.equal(backgroundSync.request("leaderboard:sync", {
    send:()=>{
      emitted.push("leaderboard:sync");
      return true;
    }
  }), false);
  assert.deepEqual(emitted, []);

  now += 100;
  assert.equal(backgroundSync.request("leaderboard:sync", {
    force:true,
    send:()=>{
      emitted.push("leaderboard:sync");
      return true;
    }
  }), true);
  assert.deepEqual(emitted, ["leaderboard:sync"]);
});

test("profile sync requests social data but no longer requests a redundant leaderboard", ()=>{
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const listeners = new Map();
  const emitted = [];
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const socket = {
    on(eventName, listener){
      listeners.set(eventName, listener);
    },
    emit(eventName){
      emitted.push(eventName);
    }
  };
  const multiplayer = {
    auth:{profileReady:false},
    players:[],
    remotePlayers:new Map(),
    resumeEvents:[],
    enemyAttackEvents:[],
    playerDamageEvents:[],
    playerDeathEvents:[],
    playerRespawnEvents:[],
    playerRadiationEvents:[],
    playerStatusEffectEvents:[],
    playerRewardEvents:[],
    lootDropEvents:[],
    lootPickupEvents:[]
  };

  try{
    installPlayerSocketListeners({
      socket,
      multiplayer,
      requestSocialSync:()=>socket.emit("social:sync"),
      upsertRemotePlayer(){},
      addRemoteEffect(){},
      emitChange(){},
      toast(){}
    });
    listeners.get("profile:sync")?.({
      updatedAt:1,
      preparedPortal:{
        mapId:"0",
        portalId:"blue",
        x:-3780,
        y:2780
      }
    });
    assert.equal(multiplayer.auth.profileReady, true);
    assert.equal(multiplayer.preparedPortal?.portalId, "blue");
    assert.equal(multiplayer.preparedPortal?.mapId, "0");
    assert.deepEqual(emitted, ["social:sync"]);
  }finally{
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("background read limits stay diagnostic without producing a user toast", ()=>{
  let now = 9000;
  const warnings = [];
  const multiplayer = {};
  const backgroundSync = createBackgroundSyncCoordinator({
    multiplayer,
    now:()=>now,
    logger:{warn:(...args)=>warnings.push(args)}
  });
  const toasts = [];
  const payload = {eventName:"firm:sync", retryAfterMs:210, at:now};
  const message = getRateLimitToastMessage("account:action-limited", payload);
  if(message) toasts.push(message);
  else backgroundSync.recordLimited("account:action-limited", payload);

  assert.deepEqual(toasts, []);
  assert.equal(warnings.length, 1);
  assert.deepEqual(multiplayer.backgroundSync.lastLimited, {
    kind:"account:action-limited",
    eventName:"firm:sync",
    retryAfterMs:210,
    limit:0,
    windowMs:0,
    at:9000
  });
  assert.match(getRateLimitToastMessage("rate:limited", {eventName:"profile:save"}), /Commande envoyee trop vite/);
});

test("background sync coordinates duplicate reads across launcher and game tabs", ()=>{
  let now = 1000;
  const values = new Map();
  const storage = {
    getItem:key=>values.get(key) || null,
    setItem:(key, value)=>values.set(key, value),
    removeItem:key=>values.delete(key)
  };
  const state = ()=>({
    serverUrl:"https://game.example.test",
    auth:{account:{id:"same-account"}},
    backgroundSync:{entries:{}, limits:[], lastLimited:null}
  });
  const timers = [];
  const setTimeoutFn = (callback, delay)=>{
    const timer = {callback, delay, cleared:false, unref(){}};
    timers.push(timer);
    return timer;
  };
  const clearTimeoutFn = timer=>{
    if(timer) timer.cleared = true;
  };
  const launcher = createBackgroundSyncCoordinator({
    multiplayer:state(),
    storage,
    ownerId:"launcher",
    now:()=>now,
    logger:{warn(){}},
    setTimeoutFn,
    clearTimeoutFn
  });
  const game = createBackgroundSyncCoordinator({
    multiplayer:state(),
    storage,
    ownerId:"game",
    now:()=>now,
    logger:{warn(){}},
    setTimeoutFn,
    clearTimeoutFn
  });
  let sends = 0;

  assert.equal(launcher.request("firm:sync", {send:()=>{ sends += 1; }}), true);
  now += 20;
  assert.equal(game.request("firm:sync", {send:()=>{ sends += 1; }}), false);
  for(const timer of timers.splice(0)){
    if(!timer.cleared) timer.callback();
  }
  assert.equal(sends, 1);
});

test("a simultaneous firm shop request upgrades a base cross-tab request instead of duplicating it", ()=>{
  let now = 1000;
  const values = new Map();
  const storage = {
    getItem:key=>values.get(key) || null,
    setItem:(key, value)=>values.set(key, value),
    removeItem:key=>values.delete(key)
  };
  const timers = [];
  const setTimeoutFn = (callback, delay)=>{
    const timer = {callback, delay, cleared:false, unref(){}};
    timers.push(timer);
    return timer;
  };
  const clearTimeoutFn = timer=>{
    if(timer) timer.cleared = true;
  };
  const state = ()=>({
    serverUrl:"https://game.example.test",
    auth:{account:{id:"same-account"}},
    backgroundSync:{entries:{}, limits:[], lastLimited:null}
  });
  const game = createBackgroundSyncCoordinator({
    multiplayer:state(),
    storage,
    ownerId:"game",
    now:()=>now,
    logger:{warn(){}},
    setTimeoutFn,
    clearTimeoutFn
  });
  const launcher = createBackgroundSyncCoordinator({
    multiplayer:state(),
    storage,
    ownerId:"launcher",
    now:()=>now,
    logger:{warn(){}},
    setTimeoutFn,
    clearTimeoutFn
  });
  const sent = [];

  assert.equal(game.request("firm:sync", {
    payload:{includeShop:false},
    send:payload=>sent.push(payload)
  }), true);
  now += 10;
  assert.equal(launcher.request("firm:sync", {
    payload:{includeShop:true},
    send:payload=>sent.push(payload)
  }), true);
  for(const timer of timers.splice(0)){
    if(!timer.cleared) timer.callback();
  }

  assert.deepEqual(sent, [{includeShop:true}]);
});

test("firm cache ignores global and partial broadcasts until a complete personal snapshot arrives", ()=>{
  const listeners = new Map();
  const received = [];
  const socket = {on:(eventName, listener)=>listeners.set(eventName, listener)};
  const multiplayer = {firmSnapshot:null, firmRanking:null};
  installFirmSocketListeners({
    socket,
    multiplayer,
    backgroundSync:{markReceived:(eventName, payload)=>received.push({eventName, payload})},
    emitChange(){},
    toast(){}
  });

  listeners.get("firm:ranking")?.({firms:[], individualRanking:[], dailyQuests:[]});
  listeners.get("firm:snapshot")?.({personal:{key:"account:1"}, seasonObjectives:[]});
  assert.deepEqual(received, []);

  listeners.get("firm:snapshot")?.({
    personal:{key:"account:1"},
    firms:[],
    individualRanking:[],
    dailyQuests:[],
    shop:[],
    includesShop:true
  });
  assert.deepEqual(received, [{
    eventName:"firm:sync",
    payload:{includeShop:true}
  }]);
});

test("reset removes an unsent cross-tab lease so another tab is not blocked", ()=>{
  const values = new Map();
  const storage = {
    getItem:key=>values.get(key) || null,
    setItem:(key, value)=>values.set(key, value),
    removeItem:key=>values.delete(key)
  };
  const coordinator = createBackgroundSyncCoordinator({
    multiplayer:{
      serverUrl:"https://game.example.test",
      auth:{account:{id:"account-reset"}},
      backgroundSync:{entries:{}, limits:[], lastLimited:null}
    },
    storage,
    ownerId:"closing-tab",
    now:()=>1000,
    logger:{warn(){}},
    setTimeoutFn:()=>({unref(){}}),
    clearTimeoutFn(){}
  });

  assert.equal(coordinator.request("leaderboard:sync", {send:()=>true}), true);
  assert.equal(values.size, 1);
  coordinator.reset();
  assert.equal(values.size, 0);
});
