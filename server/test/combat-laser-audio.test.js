import assert from "node:assert/strict";
import test from "node:test";
import { createCombatLaserAudio } from "../../src/game/systems/combatLaserAudio.js";

function fixture({fetchRef} = {}){
  const contexts = [];
  const sources = [];
  let fetches = 0;
  const windowRef = new EventTarget();
  const documentRef = new EventTarget();
  documentRef.hidden = false;
  const settings = {master:50, effects:60, muted:false};
  const state = {active:true};
  class AudioContext {
    constructor(){
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
      this.output = {gain:{setTargetAtTime:value=>{ this.volume = value; }}, connect(){}, disconnect(){}};
      contexts.push(this);
    }
    createGain(){ return this.output; }
    async resume(){ this.state = "running"; }
    async decodeAudioData(){ return {duration:.265}; }
    async close(){ this.state = "closed"; }
    createBufferSource(){
      const source = {
        starts:0, stops:0,
        connect(){}, disconnect(){},
        start(){ this.starts++; },
        stop(){ this.stops++; }
      };
      sources.push(source);
      return source;
    }
  }
  windowRef.AudioContext = AudioContext;
  const audio = createCombatLaserAudio({
    getAudioSettings:()=>settings,
    isActive:()=>state.active,
    windowRef,
    documentRef,
    fetchRef:async url=>{
      fetches++;
      assert.match(String(url), /assets\/audio\/laser-double-v3\.wav$/);
      return fetchRef ? fetchRef() : {ok:true, arrayBuffer:async()=>new ArrayBuffer(4)};
    }
  });
  return {audio, contexts, sources, settings, state, windowRef, documentRef, fetches:()=>fetches};
}

test("laser audio unlocks once and reuses its decoded buffer across attacks", async()=>{
  const f = fixture();
  assert.equal(f.audio.play(), false);
  assert.equal(f.contexts.length, 0);
  assert.equal(await f.audio.unlock(), true);
  assert.equal(await f.audio.unlock(), true);
  assert.equal(f.contexts.length, 1);
  assert.equal(f.fetches(), 1);
  assert.equal(f.audio.play(), true);
  f.sources[0].onended();
  assert.equal(f.audio.play(), true);
  assert.equal(f.sources.length, 2);
  assert.equal(f.contexts[0].volume, .3);
  f.audio.dispose();
});

test("master/effects volumes and mute apply to active and future sounds", async()=>{
  const f = fixture();
  await f.audio.unlock();
  f.audio.play();
  f.settings.master = 80;
  f.settings.effects = 25;
  f.windowRef.dispatchEvent(new Event("voidsector:settings-applied"));
  assert.equal(f.contexts[0].volume, .2);
  f.settings.muted = true;
  f.windowRef.dispatchEvent(new Event("voidsector:settings-applied"));
  assert.equal(f.contexts[0].volume, 0);
  assert.equal(f.audio.play(), false);
  f.settings.muted = false;
  f.settings.effects = 0;
  assert.equal(f.audio.play(), false);
  assert.equal(f.sources.length, 1);
  f.audio.dispose();
});

test("hidden tabs and stopped combat never play a laser; active sounds stop on hide", async()=>{
  const f = fixture();
  await f.audio.unlock();
  f.audio.play();
  f.documentRef.hidden = true;
  f.documentRef.dispatchEvent(new Event("visibilitychange"));
  assert.equal(f.sources[0].stops, 1);
  assert.equal(f.audio.play(), false);
  f.documentRef.hidden = false;
  f.state.active = false;
  assert.equal(f.audio.play(), false);
  f.state.active = true;
  assert.equal(f.audio.play(), true);
  f.audio.stop();
  assert.equal(f.sources[1].stops, 1);
  f.audio.dispose();
});

test("shots during loading are skipped and never replayed late", async()=>{
  let complete;
  const f = fixture({fetchRef:()=>new Promise(resolve=>{ complete = resolve; })});
  const unlocking = f.audio.unlock();
  assert.equal(f.audio.play(), false);
  complete({ok:true, arrayBuffer:async()=>new ArrayBuffer(4)});
  assert.equal(await unlocking, true);
  assert.equal(f.sources.length, 0);
  assert.equal(f.audio.play(), true);
  f.audio.dispose();
});

test("unavailable files fail silently and do not refetch on every input", async()=>{
  const f = fixture({fetchRef:async()=>({ok:false})});
  assert.equal(await f.audio.unlock(), false);
  assert.equal(await f.audio.unlock(), false);
  assert.equal(f.fetches(), 1);
  assert.equal(f.audio.play(), false);
  f.audio.dispose();
});

test("suspended or unsupported audio does not interfere with gameplay", async()=>{
  const f = fixture();
  await f.audio.unlock();
  f.contexts[0].state = "suspended";
  assert.equal(f.audio.play(), false);
  assert.equal(f.sources.length, 0);
  f.audio.dispose();
  const unsupported = fixture();
  delete unsupported.windowRef.AudioContext;
  assert.equal(await unsupported.audio.unlock(), false);
  assert.equal(unsupported.audio.play(), false);
  unsupported.audio.dispose();
});

test("laser voice count is bounded and disposal prevents further playback", async()=>{
  const f = fixture();
  await f.audio.unlock();
  for(let i = 0; i < 5; i++) assert.equal(f.audio.play(), true);
  assert.equal(f.sources[0].stops, 1);
  f.audio.dispose();
  assert.equal(f.sources.filter(source=>source.stops === 1).length, 5);
  assert.equal(f.audio.play(), false);
  assert.equal(await f.audio.unlock(), false);
});
