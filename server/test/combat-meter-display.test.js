import assert from "node:assert/strict";
import test from "node:test";
import {
  cycleCombatMeterMode,
  nextCombatMeterMode,
  normalizeCombatMeterMode,
  readCombatMeterModes
} from "../../src/game/ui/combatMeterModes.js";
import { updateCombatMeter } from "../../src/game/ui/hud.js";
import { installCombatInputHandlers } from "../../src/game/ui/inputBindings.js";

const STORAGE_KEY = "voidsector-combat-meter-modes";
const defaultModes = ()=>({hp:"fraction", shield:"fraction", xp:"fraction"});

function memoryStorage(initial){
  const values = new Map(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  const writes = [];
  return {
    writes,
    getItem:key=>values.get(key) ?? null,
    setItem(key, value){ values.set(key, value); writes.push([key, value]); }
  };
}

function replaceGlobal(t, name, value){
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {configurable:true, writable:true, value});
  t.after(()=>{
    if(original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

function element(){
  const handlers = new Map();
  const attributes = new Map();
  return {
    handlers, attributes, dataset:{}, style:{}, hidden:false, textContent:"",
    addEventListener(type, callback){
      if(!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(callback);
    },
    setAttribute(name, value){ attributes.set(name, String(value)); },
    getAttribute:name=>attributes.get(name) ?? null,
    querySelector:()=>null, querySelectorAll:()=>[], closest:()=>null,
    classList:{contains:()=>false, add(){}, remove(){}, toggle(){}},
    getBoundingClientRect:()=>({left:0, top:0, width:1000, height:700})
  };
}

function meterDocument(){
  const nodes = new Map();
  const meters = new Map();
  for(const [metric, name] of [["hp", "Hp"], ["shield", "Shield"], ["xp", "Xp"]]){
    meters.set(metric, element());
    for(const suffix of ["", "Fill", "Percent", "Tooltip"]) nodes.set(`game${name}${suffix}`, element());
  }
  return {
    nodes, meters,
    document:{
      getElementById:id=>nodes.get(id) || null,
      querySelector:selector=>meters.get(selector.match(/data-combat-meter="([^"]+)"/)?.[1]) || null
    }
  };
}

test("combat meters have three display modes and preserve the existing fraction default", ()=>{
  assert.equal(normalizeCombatMeterMode("value"), "value");
  assert.equal(normalizeCombatMeterMode("fraction"), "fraction");
  assert.equal(normalizeCombatMeterMode("bar"), "bar");
  assert.equal(normalizeCombatMeterMode("text"), "value");
  for(const invalid of [undefined, null, "", "percentage", 1, {}, []]){
    assert.equal(normalizeCombatMeterMode(invalid), "fraction");
  }
  assert.equal(nextCombatMeterMode("value"), "fraction");
  assert.equal(nextCombatMeterMode("fraction"), "bar");
  assert.equal(nextCombatMeterMode("bar"), "value");
});

test("cycling one meter leaves the other two unchanged and restores each saved choice", ()=>{
  const storage = memoryStorage();
  const modes = readCombatMeterModes(storage);
  assert.deepEqual(modes, defaultModes());
  for(const expected of ["bar", "value", "fraction"]){
    assert.equal(cycleCombatMeterMode(modes, "hp", storage), true);
    assert.deepEqual(modes, {hp:expected, shield:"fraction", xp:"fraction"});
    assert.deepEqual(readCombatMeterModes(storage), modes);
  }
  cycleCombatMeterMode(modes, "shield", storage);
  cycleCombatMeterMode(modes, "xp", storage);
  cycleCombatMeterMode(modes, "xp", storage);
  assert.deepEqual(readCombatMeterModes(storage), {hp:"fraction", shield:"bar", xp:"value"});
  assert.ok(storage.writes.every(([key])=>key === STORAGE_KEY));
});

test("corrupt or unavailable preferences fall back per meter without preventing clicks", ()=>{
  for(const corrupt of ["{broken", "null", "[]", "42", '"value"']){
    assert.deepEqual(readCombatMeterModes(memoryStorage(corrupt)), defaultModes());
  }
  const partial = memoryStorage(JSON.stringify({hp:"bar", shield:"bogus", xp:"text", credits:500}));
  assert.deepEqual(readCombatMeterModes(partial), {hp:"bar", shield:"fraction", xp:"value"});
  const unavailable = {
    getItem(){ throw new Error("storage blocked"); },
    setItem(){ throw new Error("quota exceeded"); }
  };
  const modes = readCombatMeterModes(unavailable);
  assert.deepEqual(modes, defaultModes());
  assert.doesNotThrow(()=>cycleCombatMeterMode(modes, "hp", unavailable));
  assert.equal(modes.hp, "bar");
});

test("unknown meter actions do not mutate preferences or write to storage", ()=>{
  const storage = memoryStorage();
  const modes = defaultModes();
  assert.equal(cycleCombatMeterMode(modes, "cargo", storage), false);
  assert.equal(cycleCombatMeterMode(modes, "__proto__", storage), false);
  assert.equal(cycleCombatMeterMode(null, "hp", storage), false);
  assert.deepEqual(modes, defaultModes());
  assert.deepEqual(storage.writes, []);
});

test("life, shield and XP render the requested text independently while keeping their live bars", t=>{
  const dom = meterDocument();
  replaceGlobal(t, "document", dom.document);
  const format = value=>new Intl.NumberFormat("fr-FR").format(value);
  const samples = [
    {metric:"hp", name:"Hp", value:13650, max:15000, label:"la vie"},
    {metric:"shield", name:"Shield", value:1200, max:1200, label:"le bouclier"},
    {metric:"xp", name:"Xp", value:34760, max:220000, label:"l'expérience"}
  ];
  for(const sample of samples){
    const full = `${format(sample.value)} / ${format(sample.max)}`;
    const meter = dom.meters.get(sample.metric);
    const value = dom.nodes.get(`game${sample.name}`);
    const tooltip = dom.nodes.get(`game${sample.name}Tooltip`);
    for(const mode of ["value", "fraction", "bar", "value"]){
      updateCombatMeter({...sample, mode});
      assert.equal(dom.nodes.get(`game${sample.name}Fill`).style.width, `${sample.value / sample.max * 100}%`);
      assert.equal(dom.nodes.get(`game${sample.name}Percent`).hidden, true);
      assert.equal(value.textContent, mode === "bar" ? "" : mode === "value" ? format(sample.value) : full);
      assert.equal(value.hidden, mode === "bar");
      assert.equal(tooltip.textContent, mode === "bar" ? "" : full);
      assert.equal(tooltip.hidden, mode === "bar");
      assert.equal(meter.getAttribute("data-meter-mode"), mode);
      assert.ok(meter.getAttribute("aria-label").includes(full), "values remain available to assistive technology");
      assert.ok(meter.getAttribute("aria-label").includes("Cliquer pour"));
      if(mode === "bar") assert.doesNotMatch(meter.title, /\d/, "bar-only hover contains no numeric values");
    }
  }
});

test("meter rendering safely handles empty shields, negative or invalid values and overflow", t=>{
  const dom = meterDocument();
  replaceGlobal(t, "document", dom.document);
  const cases = [
    {value:0, max:0, width:"0%", text:"0 / 0"},
    {value:120, max:0, width:"0%", text:"120 / 0"},
    {value:-50, max:100, width:"0%", text:"0 / 100"},
    {value:150, max:100, width:"100%", text:"150 / 100"},
    {value:NaN, max:Infinity, width:"0%", text:"0 / 0"}
  ];
  for(const sample of cases){
    updateCombatMeter({metric:"shield", label:"le bouclier", value:sample.value, max:sample.max});
    assert.equal(dom.nodes.get("gameShieldFill").style.width, sample.width);
    assert.equal(dom.nodes.get("gameShield").textContent, sample.text);
    assert.equal(dom.nodes.get("gameShield").hidden, false);
  }
});

function inputFixture(){
  const status = element();
  const nodes = new Map();
  const windowRef = element();
  const calls = [];
  const modes = defaultModes();
  const documentRef = {
    ...element(), body:null,
    getElementById(id){
      if(!nodes.has(id)) nodes.set(id, element());
      return nodes.get(id);
    },
    querySelector:selector=>selector === ".combat-status" ? status : element(),
    querySelectorAll:()=>[]
  };
  installCombatInputHandlers({
    windowRef, documentRef, canvas:element(), isRunning:()=>true,
    getCombatMetricModes:()=>modes,
    updateHud:()=>calls.push("hud"),
    getActionSlots:()=>[], getSlotKeybinds:()=>["Enter"], getAbilityKeybinds:()=>["Space"],
    useShipAbility:()=>calls.push("ability"), selectActionSlot:()=>calls.push("slot"),
    hasSelectedEnemy:()=>false
  });
  const metricTarget = metric=>{
    const meter = {dataset:{combatMeter:metric}};
    return {tagName:"BUTTON", closest:selector=>selector === "[data-combat-meter]" ? meter : null};
  };
  return {status, windowRef, calls, modes, metricTarget};
}

test("clicking nested meter content cycles only that meter and refreshes the HUD", t=>{
  const storage = memoryStorage();
  replaceGlobal(t, "localStorage", storage);
  const f = inputFixture();
  const click = f.status.handlers.get("click")[0];
  for(const metric of ["hp", "shield", "hp", "xp"]){
    click({target:f.metricTarget(metric), preventDefault(){}, stopPropagation(){}});
  }
  assert.deepEqual(f.modes, {hp:"value", shield:"bar", xp:"bar"});
  assert.deepEqual(readCombatMeterModes(storage), f.modes);
  assert.deepEqual(f.calls, ["hud", "hud", "hud", "hud"]);
  click({target:f.metricTarget("cargo"), preventDefault(){}, stopPropagation(){}});
  assert.equal(f.calls.length, 4);
});

test("Enter and Space on a focused meter remain native button activation even when bound to gameplay", ()=>{
  const f = inputFixture();
  for(const [key, code] of [["Enter", "Enter"], [" ", "Space"]]){
    for(const handler of f.windowRef.handlers.get("keydown")){
      handler({key, code, target:f.metricTarget("hp"), preventDefault:()=>f.calls.push("prevented")});
    }
  }
  assert.deepEqual(f.calls, []);
  for(const handler of f.windowRef.handlers.get("keydown")){
    handler({key:" ", code:"Space", target:{tagName:"CANVAS", closest:()=>null}, preventDefault:()=>f.calls.push("prevented")});
  }
  assert.deepEqual(f.calls, ["prevented", "ability"], "the same gameplay binding still works outside the meter");
});
