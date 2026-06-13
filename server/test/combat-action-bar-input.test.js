import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_SLOT_CLEAR_DISTANCE, hasActionSlotClearDistanceReached, installCombatActionBarInputHandlers, readActionSlotDropData } from "../../src/game/ui/combatActionBarInput.js";

function createDataTransfer(values){
  return {
    getData(type){
      return values[type] || "";
    }
  };
}

function createMutableDataTransfer(values = {}){
  const data = {...values};
  return {
    types:Object.keys(data),
    effectAllowed:"",
    getData(type){
      return data[type] || "";
    },
    setData(type, value){
      data[type] = String(value);
      if(!this.types.includes(type)) this.types.push(type);
    }
  };
}

function createElement({dataset = {}, closestMap = {}} = {}){
  return {
    dataset,
    closest(selector){
      return Object.hasOwn(closestMap, selector) ? closestMap[selector] : null;
    },
    querySelector(){
      return null;
    }
  };
}

function createInstalledFixture(){
  const actionBarHandlers = {};
  const documentHandlers = {};
  const calls = [];
  const actionBar = {
    addEventListener(type, handler){
      actionBarHandlers[type] = handler;
    }
  };
  const documentRef = {
    body:null,
    addEventListener(type, handler){
      documentHandlers[type] = handler;
    }
  };
  installCombatActionBarInputHandlers({
    windowRef:{setTimeout(){}},
    documentRef,
    actionBar,
    isRunning:()=>true,
    getActionSlots:()=>["ammo_x1", "ammo_x2", null, null, null, null, null, null, null],
    selectActionSlot:index=>calls.push(["select", index]),
    moveActionSlot:(from, to)=>calls.push(["move", from, to]),
    clearActionSlot:index=>calls.push(["clear", index]),
    assignExtraToActionSlot:(index, id)=>calls.push(["extra", index, id]),
    assignDroneFormationToActionSlot:(index, id)=>calls.push(["formation", index, id]),
    assignAmmoToActionSlot:(index, id)=>calls.push(["ammo", index, id]),
    assignMissileLauncherToActionSlot:index=>calls.push(["missileCpu", index])
  });
  return {actionBarHandlers, documentHandlers, calls};
}

test("action slot clear distance uses the same threshold as combat drag", ()=>{
  const start = {x:100, y:100};

  assert.equal(hasActionSlotClearDistanceReached(start, {clientX:100 + ACTION_SLOT_CLEAR_DISTANCE - 1, clientY:100}), false);
  assert.equal(hasActionSlotClearDistanceReached(start, {clientX:100 + ACTION_SLOT_CLEAR_DISTANCE, clientY:100}), true);
  assert.equal(hasActionSlotClearDistanceReached(start, {clientX:100, clientY:100 + ACTION_SLOT_CLEAR_DISTANCE}), true);
  assert.equal(hasActionSlotClearDistanceReached(null, {clientX:999, clientY:999}), false);
});

test("action bar drop data keeps slot and assignment payloads", ()=>{
  const data = readActionSlotDropData(createDataTransfer({
    "application/x-voidsector-action-slot":"2",
    "application/x-voidsector-extra":"repair_bot",
    "application/x-voidsector-missile-cpu":"1",
    "application/x-voidsector-drone-formation":"formation_alpha",
    "application/x-voidsector-ammo":"ammo_x2",
    "text/plain":"ammo_x1"
  }));

  assert.deepEqual(data, {
    fromSlot:"2",
    extraId:"repair_bot",
    missileCpu:"1",
    droneFormation:"formation_alpha",
    ammoId:"ammo_x2"
  });
});

test("action bar drop data falls back to text/plain for ammo", ()=>{
  const data = readActionSlotDropData(createDataTransfer({
    "text/plain":"ammo_x3"
  }));

  assert.equal(data.fromSlot, "");
  assert.equal(data.extraId, "");
  assert.equal(data.missileCpu, "");
  assert.equal(data.droneFormation, "");
  assert.equal(data.ammoId, "ammo_x3");
});

test("installed action bar handler assigns dropped extras to the target slot", ()=>{
  const fixture = createInstalledFixture();
  const slot = createElement({
    dataset:{actionIndex:"4"},
    closestMap:{"[data-action-index]":null}
  });
  slot.closest = selector=>selector === "[data-action-index]" ? slot : null;
  let prevented = false;

  fixture.actionBarHandlers.drop({
    target:slot,
    dataTransfer:createDataTransfer({"application/x-voidsector-extra":"repair_bot"}),
    preventDefault(){ prevented = true; }
  });

  assert.equal(prevented, true);
  assert.deepEqual(fixture.calls, [["extra", 4, "repair_bot"]]);
});

test("installed action bar handler clears a dragged slot only outside the bar and past threshold", ()=>{
  const fixture = createInstalledFixture();
  const slot = createElement({dataset:{actionIndex:"1"}});
  slot.closest = selector=>selector === "[data-action-index]" ? slot : null;
  const dataTransfer = createMutableDataTransfer();

  fixture.actionBarHandlers.dragstart({
    target:slot,
    clientX:10,
    clientY:10,
    dataTransfer,
    preventDefault(){}
  });
  fixture.documentHandlers.dragover({
    clientX:10 + ACTION_SLOT_CLEAR_DISTANCE,
    clientY:10,
    dataTransfer,
    preventDefault(){}
  });
  fixture.documentHandlers.drop({
    target:{closest:()=>null},
    clientX:10 + ACTION_SLOT_CLEAR_DISTANCE,
    clientY:10,
    dataTransfer,
    preventDefault(){}
  });

  assert.deepEqual(fixture.calls, [["clear", 1]]);
});
