import assert from "node:assert/strict";
import test from "node:test";

function storageMock(){
  const values = new Map();
  return {
    getItem:key=>values.get(String(key)) || null,
    setItem:(key, value)=>values.set(String(key), String(value)),
    removeItem:key=>values.delete(String(key))
  };
}

test("firm navigation displays totals on firm, quests, rewards and each quest category", async t=>{
  const previous = {
    localStorage:globalThis.localStorage,
    sessionStorage:globalThis.sessionStorage,
    window:globalThis.window,
    document:globalThis.document,
    BroadcastChannel:globalThis.BroadcastChannel
  };
  const panel = {innerHTML:""};
  globalThis.localStorage = storageMock();
  globalThis.sessionStorage = storageMock();
  globalThis.window = {addEventListener(){}, dispatchEvent(){}};
  globalThis.document = {
    addEventListener(){},
    getElementById:id=>id === "firmMainPanel" ? panel : null,
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  };
  globalThis.BroadcastChannel = undefined;
  t.after(()=>Object.assign(globalThis, previous));

  const { multiplayer } = await import("../../src/multiplayer/client.js");
  const { store } = await import("../../src/core/store.js");
  const { renderFirm } = await import("../../src/ui/renderFirm.js");
  const previousSnapshot = multiplayer.firmSnapshot;
  const previousTab = store.firmTab;
  const previousQuestTab = store.firmQuestTab;
  t.after(()=>{
    multiplayer.firmSnapshot = previousSnapshot;
    store.firmTab = previousTab;
    store.firmQuestTab = previousQuestTab;
  });

  multiplayer.firmSnapshot = {
    seasonEndsAt:Date.now() + 60_000,
    firms:[],
    individualRanking:[],
    dailyQuests:[{id:"daily", claimable:true, firms:{astra:{}}}],
    seasonalQuests:[{id:"weekly", claimable:true, firms:{astra:{}}}],
    seasonObjectives:[{id:"season", claimable:true}],
    personal:{
      firmId:"astra",
      pendingRewards:[{id:"end", source:"season-individual"}]
    }
  };
  store.firmTab = "quests";
  store.firmQuestTab = "daily";

  renderFirm();

  assert.match(panel.innerHTML, /data-firm-main-tab="quests"[^>]*>[^<]*<span class="firm-notification-badge">3<\/span>/);
  assert.match(panel.innerHTML, /data-firm-main-tab="rewards"[^>]*>[^<]*<span class="firm-notification-badge">1<\/span>/);
  assert.match(panel.innerHTML, /data-firm-quest-tab="daily"[^>]*>[^<]*<span class="firm-notification-badge">1<\/span>/);
  assert.match(panel.innerHTML, /data-firm-quest-tab="weekly"[^>]*>[^<]*<span class="firm-notification-badge">1<\/span>/);
  assert.match(panel.innerHTML, /data-firm-quest-tab="seasonal"[^>]*>[^<]*<span class="firm-notification-badge">1<\/span>/);
});
