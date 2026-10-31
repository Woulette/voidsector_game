import assert from "node:assert/strict";
import test from "node:test";
import { createProfileController } from "../../src/app/profileController.js";
import { createCombatServerEventSystem } from "../../src/game/systems/combatServerEvents.js";
import { installPlayerSocketListeners } from "../../src/multiplayer/playerSocketListeners.js";
import { installProgressionSocketListeners } from "../../src/multiplayer/progressionSocketListeners.js";

function createClient(t){
  const originals = {window:globalThis.window, localStorage:globalThis.localStorage};
  globalThis.window = new EventTarget();
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  t.after(()=>{
    for(const [name, value] of Object.entries(originals)){
      if(value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  const store = {state:{
    activeShip:"orion", selectedShip:"orion", ownedShips:["orion"],
    player:{level:4, xp:900, credits:100, premium:2},
    activeQuestIds:["quest_test"], activeQuestId:"quest_test",
    inventoryItems:[], ammoInventory:{ammo_x1:500}
  }};
  const notices = [];
  const logs = [];
  window.addEventListener("voidsector:combat-log", event=>logs.push(event.detail));
  const controller = createProfileController({
    store, appMode:"game", game:{running:true, updateHud(){}},
    profileScopeStorageKey:"quest-reward-test", getXpNextForLevel:()=>6000, xpCurveVersion:1,
    ensureShipLoadout(){}, setStateStorageScope(){}, loadState(){}, saveState(){},
    syncMultiplayerProfile(){}, renderAll(){}, showToast(){}
  });
  window.addEventListener("voidsector:profile-sync", event=>controller.applyServerProfile(event.detail.profile));
  const handlers = new Map();
  const socket = {on:(name, callback)=>handlers.set(name, callback)};
  const multiplayer = {
    playerId:"pilot", auth:{account:{id:"account-1"}},
    playerRewardEvents:[], questEvents:[], questProgressEvents:[], questFailureEvents:[]
  };
  const emitChange = ()=>{};
  const toast = ()=>{};
  installPlayerSocketListeners({socket, multiplayer, emitChange, toast});
  installProgressionSocketListeners({socket, multiplayer, emitChange, toast});
  const state = {store, currentMap:{id:"0"}};
  const combat = createCombatServerEventSystem({
    multiplayer, getState:()=>state,
    rewards:{showLootNotice:notice=>notices.push(notice)},
    showToast:toast, updateHud(){}, updateLootPopup(){}
  });
  const receive = (name, payload)=>handlers.get(name)(structuredClone(payload));
  return {store, receive, combat, notices, logs, multiplayer, state};
}

function monsterReward(overrides = {}){
  return {
    rewardId:"last-quest-monster", enemyId:"enemy-1", mapId:"0", at:1000,
    credits:1200, xp:500, premium:2, rewardAppliedByServer:true,
    progression:{level:4, xp:1400, xpNext:6000, credits:1300, premium:4},
    ...overrides
  };
}

test("the final quest kill keeps its quest reward after queued combat events render", t=>{
  const client = createClient(t);
  const reward = {credits:30000, xp:5000, premium:24};
  client.receive("player:reward", monsterReward());
  client.receive("quest:claimed", {id:"quest_test", title:"Contrat test", reward, auto:true, at:1000});
  const player = {level:5, xp:400, xpNext:6000, credits:31300, premium:28, skillPoints:1};
  client.receive("profile:sync", {
    updatedAt:1000, player,
    activeQuestIds:[], activeQuestId:null, completedQuestClaims:{quest_test:true},
    inventoryItems:[{id:"laser_mk1", uid:1}], ammoInventory:{ammo_x1:1000}
  });
  assert.deepEqual(client.store.state.player, player, "the full quest profile applies immediately");

  client.combat.applyAll();

  assert.deepEqual(client.store.state.player, player, "rendering the old monster reward must not undo the quest gain or level-up");
  assert.equal(client.store.state.completedQuestClaims.quest_test, true);
  assert.equal(client.store.state.ammoInventory.ammo_x1, 1000);
  assert.deepEqual(client.store.state.inventoryItems, [{id:"laser_mk1", uid:1}]);
  assert.equal(client.notices.length, 2, "both the monster and quest popups still render");
  assert.deepEqual(client.logs.map(log=>log.kind), ["quest", "reward"]);
  client.combat.applyAll();
  assert.deepEqual(client.store.state.player, player);
  assert.equal(client.notices.length, 2, "idle frames must not grant or display the reward again");
});

test("a monster reward received after a profile sync still updates progression", t=>{
  const client = createClient(t);
  client.receive("profile:sync", {updatedAt:1000, player:{credits:1300, premium:4, xp:1400}});
  const reward = monsterReward({progression:{level:4, xp:1900, xpNext:6000, credits:2500, premium:6}});
  client.receive("player:reward", reward);
  client.combat.applyAll();
  assert.deepEqual(client.store.state.player, reward.progression);
  assert.equal(client.notices.length, 1);
});

test("a newer purchase profile can decrease a balance without an older reward restoring it", t=>{
  const client = createClient(t);
  client.receive("player:reward", monsterReward());
  client.receive("profile:sync", {updatedAt:1000, player:{level:4, xp:1400, credits:300, premium:1}});
  client.combat.applyAll();
  assert.equal(client.store.state.player.credits, 300);
  assert.equal(client.store.state.player.premium, 1);
  assert.equal(client.notices.length, 1);
});

test("an off-map queued reward cannot undo a profile when its popup is rendered later", t=>{
  const client = createClient(t);
  client.receive("player:reward", monsterReward({mapId:"1"}));
  client.receive("profile:sync", {updatedAt:1000, player:{level:5, xp:400, credits:31300, premium:28}});
  client.combat.applyAll();
  assert.equal(client.multiplayer.playerRewardEvents.length, 1);
  client.state.currentMap.id = "1";
  client.combat.applyAll();
  assert.equal(client.store.state.player.credits, 31300);
  assert.equal(client.store.state.player.level, 5);
  assert.equal(client.multiplayer.playerRewardEvents.length, 0);
  assert.equal(client.notices.length, 1);
});

test("ordinary monster rewards still apply without a full profile sync", t=>{
  const client = createClient(t);
  const reward = monsterReward();
  client.receive("player:reward", reward);
  client.combat.applyAll();
  assert.deepEqual(client.store.state.player, reward.progression);
  assert.equal(client.notices.length, 1);
});

test("queued rewards on both sides of a quest profile preserve the latest server totals", t=>{
  const client = createClient(t);
  client.receive("player:reward", monsterReward({rewardId:"before-quest-1"}));
  client.receive("player:reward", monsterReward({rewardId:"before-quest-2"}));
  client.receive("profile:sync", {updatedAt:1000, player:{level:5, xp:400, credits:31300, premium:28}});
  const latest = monsterReward({
    rewardId:"after-quest", progression:{level:5, xp:900, xpNext:6000, credits:32500, premium:30}
  });
  client.receive("player:reward", latest);
  client.combat.applyAll();
  assert.deepEqual(client.store.state.player, latest.progression);
  assert.equal(client.notices.length, 3);
});

test("a profile message without player totals preserves queued reward progression", t=>{
  const client = createClient(t);
  const reward = monsterReward();
  client.receive("player:reward", reward);
  client.receive("profile:sync", {updatedAt:1000, activeQuestIds:[]});
  client.combat.applyAll();
  assert.deepEqual(client.store.state.player, reward.progression);
});
