import assert from "node:assert/strict";
import test from "node:test";
import { formatBetaRewardCountdown, renderBetaRewardCountdown, syncBetaRewardCountdown } from "../../src/ui/betaRewardCountdown.js";
import { renderBetaStoreCalendar } from "../../src/ui/betaStoreCalendar.js";
import { getBetaRewardDateKey, getBetaRewardStatus } from "../../src/data/premium.js";

function clockHarness({readyAt = 5000, instant = 1000, waiting = true} = {}){
  const label = {textContent:""};
  const value = {textContent:""};
  const listeners = new Set();
  const intervals = new Map();
  let nextId = 0;
  let renders = 0;
  let completed = false;
  const clock = {
    getAttribute:name=>name === "data-beta-reward-waiting" ? String(waiting) : null,
    querySelector:selector=>selector === "[data-beta-countdown-label]" ? label : selector === "[data-beta-countdown-time]" ? value : null
  };
  const calendar = {querySelector:selector=>selector === "[data-beta-reward-countdown]" ? clock : null};
  const panel = {querySelector:selector=>selector === "[data-beta-reward-calendar]" ? calendar : null};
  const options = {
    getProfile:()=>({}),
    getStatus:()=>({completed,canClaim:instant >= readyAt,nextAvailableAt:readyAt}),
    now:()=>instant,
    render:()=>{renders++;},
    setIntervalFn:(callback,delay)=>{assert.equal(delay,1000);intervals.set(++nextId,callback);return nextId;},
    clearIntervalFn:id=>intervals.delete(id),
    visibilityTarget:{
      addEventListener:(event,callback)=>{assert.equal(event,"visibilitychange");listeners.add(callback);},
      removeEventListener:(event,callback)=>{assert.equal(event,"visibilitychange");listeners.delete(callback);}
    }
  };
  return {
    panel, options, value, label, intervals, listeners,
    get renders(){return renders;},
    tick:time=>{instant=time;for(const callback of [...intervals.values()]) callback();},
    wake:time=>{instant=time;for(const callback of [...listeners]) callback();},
    complete:()=>{completed=true;}
  };
}

test("Beta countdown rounds up seconds and supports 25-hour Paris reset days", ()=>{
  assert.equal(formatBetaRewardCountdown(1),"00:00:01");
  assert.equal(formatBetaRewardCountdown(999),"00:00:01");
  assert.equal(formatBetaRewardCountdown(1000),"00:00:01");
  assert.equal(formatBetaRewardCountdown(3661000),"01:01:01");
  assert.equal(formatBetaRewardCountdown(25*60*60*1000),"25:00:00");
  assert.equal(formatBetaRewardCountdown(-500),"00:00:00");
});

test("Beta sidebar shows a Paris clock for every selected day and no clock after completion", ()=>{
  const now = Date.UTC(2026,9,24,15,18);
  const profile = {betaRewardState:{claimedDays:[1,2],lastClaimDate:getBetaRewardDateKey(now)}};
  const status = getBetaRewardStatus(profile,now);
  assert.equal(status.nextAvailableAt,Date.UTC(2026,9,25,7));
  for(const calendarDay of [1,3,15]){
    const html = renderBetaStoreCalendar(profile,{now,calendarDay});
    assert.match(html,/data-beta-reward-calendar/);
    assert.match(html,/Prochaine récompense dans/);
    assert.match(html,/Chaque jour à 08:00 · heure de Paris/);
    assert.match(html,/15:42:00/);
  }
  const ready = renderBetaRewardCountdown({canClaim:true,completed:false},now);
  assert.match(ready,/Disponible maintenant/);
  assert.doesNotMatch(ready,/Prochaine récompense dans|00:00:00/);
  assert.equal(renderBetaRewardCountdown({completed:true},now),"");
});

test("the calendar remains accurate after Paris midnight until the autumn reset at eight", ()=>{
  const now = Date.UTC(2026,9,24,22,30); // 00:30 in Paris, before the autumn clock change.
  const profile = {betaRewardState:{claimedDays:[1,2],lastClaimDate:"2026-10-24"}};
  const html = renderBetaStoreCalendar(profile,{now});
  assert.match(html,/08:30:00/);
  assert.match(html,/Disponible à 08:00/);
  assert.doesNotMatch(html,/Disponible demain|À demain/);
  const h = clockHarness({instant:now});
  h.options.getProfile=()=>profile;
  h.options.getStatus=getBetaRewardStatus;
  syncBetaRewardCountdown(h.panel,h.options);
  h.tick(Date.UTC(2026,9,25,6,59,59,999));
  assert.equal(h.value.textContent,"00:00:01");
  assert.equal(h.renders,0);
  h.tick(Date.UTC(2026,9,25,7));
  assert.equal(h.value.textContent,"Disponible maintenant");
  assert.equal(h.renders,1);
  assert.equal(h.intervals.size,0);
});

test("countdown updates only its text each second, rebuilding once when the reward unlocks", ()=>{
  const h = clockHarness();
  const profile = {unchanged:true};
  h.options.getProfile=()=>profile;
  const before = structuredClone(profile);
  syncBetaRewardCountdown(h.panel,h.options);
  assert.equal(h.value.textContent,"00:00:04");
  assert.equal(h.intervals.size,1);
  h.tick(2000);
  assert.equal(h.value.textContent,"00:00:03");
  assert.equal(h.renders,0);
  h.tick(4999);
  assert.equal(h.value.textContent,"00:00:01");
  assert.equal(h.renders,0);
  const staleCallback = [...h.intervals.values()][0];
  h.tick(5000);
  assert.equal(h.value.textContent,"Disponible maintenant");
  assert.equal(h.renders,1);
  assert.equal(h.intervals.size,0);
  assert.equal(h.listeners.size,0);
  staleCallback();
  assert.equal(h.renders,1);
  assert.deepEqual(profile,before);
});

test("rerendering the panel replaces the timer and leaving Beta disposes it", ()=>{
  const h = clockHarness();
  syncBetaRewardCountdown(h.panel,h.options);
  const staleCallback = [...h.intervals.values()][0];
  syncBetaRewardCountdown(h.panel,h.options);
  assert.equal(h.intervals.size,1);
  assert.equal(h.listeners.size,1);
  syncBetaRewardCountdown(h.panel,{...h.options,active:false});
  assert.equal(h.intervals.size,0);
  assert.equal(h.listeners.size,0);
  staleCallback();
  assert.equal(h.renders,0);
});

test("waking a suspended tab refreshes actual remaining time and unlocks only once", ()=>{
  const h = clockHarness({readyAt:100000});
  syncBetaRewardCountdown(h.panel,h.options);
  h.wake(97000);
  assert.equal(h.value.textContent,"00:00:03");
  assert.equal(h.renders,0);
  h.wake(200000);
  assert.equal(h.renders,1);
  assert.equal(h.intervals.size,0);
  assert.equal(h.listeners.size,0);
});

test("ready, completed and absent calendars leave no recurring work", ()=>{
  const ready = clockHarness({readyAt:0,waiting:false});
  syncBetaRewardCountdown(ready.panel,ready.options);
  assert.equal(ready.value.textContent,"Disponible maintenant");
  assert.equal(ready.intervals.size,0);
  assert.equal(ready.listeners.size,0);
  assert.equal(ready.renders,0);
  const complete = clockHarness();
  complete.complete();
  syncBetaRewardCountdown(complete.panel,complete.options);
  assert.equal(complete.intervals.size,0);
  assert.equal(complete.listeners.size,0);
  const absent = {querySelector:()=>null};
  assert.doesNotThrow(()=>syncBetaRewardCountdown(absent,ready.options));
  assert.doesNotThrow(()=>syncBetaRewardCountdown(null,ready.options));
});

test("the eight o'clock boundary between markup and controller startup refreshes the claim action", ()=>{
  const h = clockHarness({instant:5000,readyAt:5000,waiting:true});
  syncBetaRewardCountdown(h.panel,h.options);
  assert.equal(h.renders,1);
  assert.equal(h.intervals.size,0);
  assert.equal(h.listeners.size,0);
});
