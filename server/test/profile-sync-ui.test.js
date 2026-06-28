import assert from "node:assert/strict";
import test from "node:test";
import { createProfileController } from "../../src/app/profileController.js";
import { captureProfileUiState, getProfileUiChanges, hasProfileUiChanges } from "../../src/app/profileSyncChanges.js";

function baseState(){
  const actionSlots = ["ammo_x1", null, null, null, null, null, null, null, null];
  return {
    activeShip:"orion",
    actionSlots:[...actionSlots],
    actionSlotsByShip:{orion:[...actionSlots]},
    ammoInventory:{ammo_x1:500},
    inventoryItems:[],
    shipLoadouts:{orion:{lasers:["laser_mk1"]}},
    droneLoadout:[],
    activeQuestIds:[],
    questProgress:{},
    player:{level:5, xp:100, credits:1000}
  };
}

function changes(before, after){
  return getProfileUiChanges(captureProfileUiState(before), captureProfileUiState(after));
}

test("repeated monster reward profile syncs do not rebuild combat UI", ()=>{
  let previous = baseState();
  for(let kill = 1; kill <= 100; kill += 1){
    const next = structuredClone(previous);
    next.player = {...next.player, xp:100 + kill * 150, credits:1000 + kill * 500, totalKills:kill, reputation:kill * 25};
    next.killStats = {drone_pirate:kill};
    const result = changes(previous, next);
    assert.deepEqual(result, {
      loadoutChanged:false,
      actionBarChanged:false,
      panelsChanged:false,
      layoutChanged:false
    });
    assert.equal(hasProfileUiChanges(result), false);
    previous = next;
  }
});

test("profile sync refreshes only the UI affected by its data", ()=>{
  const before = baseState();
  const firmChanged = structuredClone(before);
  firmChanged.player.firmSelected = true;
  assert.equal(changes(before, firmChanged).panelsChanged, true);

  const ammoChanged = structuredClone(before);
  ammoChanged.ammoInventory.ammo_x1 = 499;
  assert.equal(changes(before, ammoChanged).actionBarChanged, true);
  assert.equal(changes(before, ammoChanged).loadoutChanged, false);

  const questChanged = structuredClone(before);
  questChanged.activeQuestIds = ["quest_drone_cleanup"];
  questChanged.questProgress = {quest_drone_cleanup:1};
  assert.equal(changes(before, questChanged).panelsChanged, true);
  assert.equal(changes(before, questChanged).loadoutChanged, false);

  const loadoutChanged = structuredClone(before);
  loadoutChanged.shipLoadouts.orion.lasers = [];
  assert.equal(changes(before, loadoutChanged).loadoutChanged, true);
  assert.equal(changes(before, loadoutChanged).actionBarChanged, true);
});

test("game profile controller applies repeated kill rewards without refreshing loadout or launcher", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  const dispatched = [];
  globalThis.window = {dispatchEvent:event=>dispatched.push(event)};
  const store = {state:baseState(), currentView:"game", hangarTab:"vaisseau", hangarDetailOpen:false};
  let loadoutRefreshes = 0;
  let hudUpdates = 0;
  let launcherRenders = 0;
  let toasts = 0;
  const controller = createProfileController({
    store,
    game:{
      running:true,
      refreshActiveLoadout(){ loadoutRefreshes += 1; },
      updateHud(){ hudUpdates += 1; }
    },
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){ launcherRenders += 1; },
    showToast(){ toasts += 1; }
  });
  try{
    for(let kill = 1; kill <= 25; kill += 1){
      controller.applyServerProfile({
        updatedAt:kill,
        player:{...store.state.player, credits:1000 + kill * 500, xp:100 + kill * 100, totalKills:kill},
        killStats:{drone_pirate:kill}
      });
    }
    assert.equal(loadoutRefreshes, 0);
    assert.equal(launcherRenders, 0);
    assert.equal(toasts, 0);
    assert.equal(hudUpdates, 25);
    assert.equal(dispatched.length, 25);
    assert.equal(dispatched.every(event=>event.detail?.uiChanges?.actionBarChanged === false), true);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("launcher profile sync without UI changes refreshes top bar only", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const store = {state:baseState(), currentView:"leaderboard", hangarTab:"vaisseau", hangarDetailOpen:false};
  let renders = 0;
  let topRenders = 0;
  let preservedRenders = 0;
  let toasts = 0;
  const controller = createProfileController({
    store,
    game:{running:false},
    appMode:"launcher",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){ renders += 1; },
    renderTop(){ topRenders += 1; },
    preserveScroll(callback){
      preservedRenders += 1;
      return callback();
    },
    showToast(){ toasts += 1; }
  });
  try{
    controller.applyServerProfile({
      updatedAt:10,
      player:{...store.state.player, xp:250, credits:1800, totalKills:12},
      killStats:{drone_pirate:12}
    });
    assert.equal(renders, 0);
    assert.equal(topRenders, 1);
    assert.equal(preservedRenders, 0);
    assert.equal(toasts, 0);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("launcher profile sync with UI changes preserves scroll around full render", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const store = {state:baseState(), currentView:"leaderboard", hangarTab:"vaisseau", hangarDetailOpen:false};
  let renders = 0;
  let topRenders = 0;
  let preservedRenders = 0;
  let toasts = 0;
  const controller = createProfileController({
    store,
    game:{running:false},
    appMode:"launcher",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){ renders += 1; },
    renderTop(){ topRenders += 1; },
    preserveScroll(callback){
      preservedRenders += 1;
      return callback();
    },
    showToast(){ toasts += 1; }
  });
  try{
    controller.applyServerProfile({
      updatedAt:11,
      shipLoadouts:{orion:{lasers:[]}}
    });
    assert.equal(renders, 1);
    assert.equal(topRenders, 0);
    assert.equal(preservedRenders, 1);
    assert.equal(toasts, 1);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("profile sync keeps active Velox action slots when the server profile does not contain them", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const veloxSlots = ["ammo_x2", null, null, null, null, null, null, null, null];
  const store = {
    state:{
      ...baseState(),
      activeShip:"velox",
      actionSlots:[...veloxSlots],
      actionSlotsByShip:{
        orion:["ammo_x1", null, null, null, null, null, null, null, null],
        velox:[...veloxSlots]
      }
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const controller = createProfileController({
    store,
    game:{running:true, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:2,
      activeShip:"velox",
      ammoInventory:{ammo_x1:500, ammo_x2:499},
      actionSlotsByShip:{
        orion:["ammo_x1", null, null, null, null, null, null, null, null]
      }
    });
    assert.deepEqual(store.state.actionSlots, veloxSlots);
    assert.deepEqual(store.state.actionSlotsByShip.velox, veloxSlots);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("game profile sync preserves local active ship slots when server sends empty slots after ammo use", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const veloxSlots = ["ammo_x2", "missile_m1", null, null, null, null, null, null, null];
  const store = {
    state:{
      ...baseState(),
      activeShip:"velox",
      actionSlots:[...veloxSlots],
      actionSlotsByShip:{velox:[...veloxSlots]},
      ammoInventory:{ammo_x1:500, ammo_x2:500, missile_m1:30}
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const controller = createProfileController({
    store,
    game:{running:true, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:3,
      activeShip:"velox",
      ammoInventory:{ammo_x1:500, ammo_x2:499, missile_m1:30},
      actionSlotsByShip:{velox:[null, null, null, null, null, null, null, null, null]}
    });
    assert.deepEqual(store.state.actionSlots, veloxSlots);
    assert.deepEqual(store.state.actionSlotsByShip.velox, veloxSlots);
    assert.equal(store.state.ammoInventory.ammo_x2, 499);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("game profile sync preserves local active ship slots when server sends stale non-empty slots", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const veloxSlots = ["ammo_x2", "missile_m1", null, null, null, null, null, null, null];
  const staleServerSlots = ["ammo_x6", "missile_m6", null, null, null, null, null, null, null];
  const store = {
    state:{
      ...baseState(),
      activeShip:"velox",
      actionSlots:[...veloxSlots],
      actionSlotsByShip:{velox:[...veloxSlots]},
      ammoInventory:{ammo_x2:500, ammo_x6:500, missile_m1:30, missile_m6:30}
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const controller = createProfileController({
    store,
    game:{running:true, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:4,
      activeShip:"velox",
      ammoInventory:{ammo_x2:499, ammo_x6:500, missile_m1:30, missile_m6:30},
      actionSlotsByShip:{velox:[...staleServerSlots]}
    });
    assert.deepEqual(store.state.actionSlots, veloxSlots);
    assert.deepEqual(store.state.actionSlotsByShip.velox, veloxSlots);
    assert.equal(store.state.ammoInventory.ammo_x2, 499);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("game profile sync keeps a new active ship action bar empty when no slots were saved for it", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const emptySlots = [null, null, null, null, null, null, null, null, null];
  const orionSlots = ["ammo_x1", null, null, null, null, null, null, null, "extra_repair_red"];
  const store = {
    state:{
      ...baseState(),
      activeShip:"razorion",
      actionSlots:[...orionSlots],
      actionSlotsByShip:{orion:[...orionSlots]},
      ownedShips:["orion", "razorion"]
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const controller = createProfileController({
    store,
    game:{running:true, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile(){},
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:5,
      activeShip:"razorion",
      ownedShips:["orion", "razorion"],
      actionSlots:[...orionSlots],
      actionSlotsByShip:{orion:[...orionSlots]}
    });
    assert.deepEqual(store.state.actionSlots, emptySlots);
    assert.deepEqual(store.state.actionSlotsByShip.razorion, emptySlots);
    assert.deepEqual(store.state.actionSlotsByShip.orion, orionSlots);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("profile sync keeps newer local action slots when stale server profile arrives before game starts", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const localSlots = ["ammo_x2", null, null, null, null, null, null, null, "extra_repair_starter"];
  const staleSlots = [null, null, null, null, null, null, null, null, null];
  const store = {
    state:{
      ...baseState(),
      activeShip:"razorion",
      ownedShips:["orion", "razorion"],
      actionSlots:[...localSlots],
      actionSlotsByShip:{razorion:[...localSlots]},
      lastLaserAmmoId:"ammo_x2",
      mmoProfileUpdatedAt:2000
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const syncedProfiles = [];
  const controller = createProfileController({
    store,
    game:{running:false, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile:state=>syncedProfiles.push(structuredClone(state)),
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:1000,
      activeShip:"razorion",
      ownedShips:["orion", "razorion"],
      ammoInventory:{ammo_x2:500},
      actionSlots:[...staleSlots],
      actionSlotsByShip:{razorion:[...staleSlots]},
      lastLaserAmmoId:null
    });

    assert.deepEqual(store.state.actionSlots, localSlots);
    assert.deepEqual(store.state.actionSlotsByShip.razorion, localSlots);
    assert.equal(store.state.actionSlotsUpdatedAt, 2000);
    assert.equal(store.state.lastLaserAmmoId, "ammo_x2");
    assert.equal(store.state.mmoProfileUpdatedAt, 2000);
    assert.equal(syncedProfiles.length, 1);
    assert.deepEqual(syncedProfiles[0].actionSlotsByShip.razorion, localSlots);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test("profile sync keeps newer local action slots when only the server profile timestamp is newer", ()=>{
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {
    constructor(type, options = {}){
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {dispatchEvent(){}};
  const localSlots = ["ammo_x2", null, null, null, null, null, null, null, "extra_repair_starter"];
  const staleSlots = [null, null, null, null, null, null, null, null, null];
  const store = {
    state:{
      ...baseState(),
      activeShip:"razorion",
      ownedShips:["orion", "razorion"],
      actionSlots:[...localSlots],
      actionSlotsByShip:{razorion:[...localSlots]},
      actionSlotsUpdatedAt:2000,
      mmoProfileUpdatedAt:2000,
      lastLaserAmmoId:"ammo_x2"
    },
    currentView:"game",
    hangarTab:"vaisseau",
    hangarDetailOpen:false
  };
  const syncedProfiles = [];
  const controller = createProfileController({
    store,
    game:{running:false, refreshActiveLoadout(){}, updateHud(){}},
    appMode:"game",
    profileScopeStorageKey:"test-profile-scope",
    getXpNextForLevel:()=>3000,
    xpCurveVersion:1,
    ensureShipLoadout(){},
    setStateStorageScope(){},
    loadState(){},
    saveState(){},
    syncMultiplayerProfile:state=>syncedProfiles.push(structuredClone(state)),
    renderAll(){},
    showToast(){}
  });
  try{
    controller.applyServerProfile({
      updatedAt:5000,
      actionSlotsUpdatedAt:1000,
      activeShip:"razorion",
      ownedShips:["orion", "razorion"],
      ammoInventory:{ammo_x2:500},
      actionSlots:[...staleSlots],
      actionSlotsByShip:{razorion:[...staleSlots]},
      lastLaserAmmoId:null
    });

    assert.deepEqual(store.state.actionSlots, localSlots);
    assert.deepEqual(store.state.actionSlotsByShip.razorion, localSlots);
    assert.equal(store.state.actionSlotsUpdatedAt, 2000);
    assert.equal(store.state.lastLaserAmmoId, "ammo_x2");
    assert.equal(store.state.mmoProfileUpdatedAt, 2000);
    assert.equal(syncedProfiles.length, 1);
    assert.deepEqual(syncedProfiles[0].actionSlotsByShip.razorion, localSlots);
  }finally{
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    globalThis.CustomEvent = previousCustomEvent;
  }
});
