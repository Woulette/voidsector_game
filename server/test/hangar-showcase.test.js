import assert from "node:assert/strict";
import test from "node:test";
import { createHangarShowcaseModel, renderHangarShowcase, updateHangarShowcase } from "../../src/ui/renderHangarShowcase.js";
import { ships } from "../../src/data/ships.js";

const owned = ships.filter(ship=>["orion", "velox"].includes(ship.id));
const baseOptions = {
  ownedShips:owned,
  selectedShipId:"velox",
  activeShipId:"velox",
  getStats:id=>({ ...ships.find(ship=>ship.id === id).stats, bouclier:720, regen:16, vitesseReelle:144, maxExtras:2 }),
  getLoadout:id=>id === "velox"
    ? {lasers:["laser-1", null, "laser-2"], generators:[null, "generator-1", null], extras:["extra-1", null]}
    : {lasers:[null], generators:[null], extras:[null]}
};

test("hangar preview selection stays separate from the ship equipped for combat", ()=>{
  const model = createHangarShowcaseModel({...baseOptions, selectedShipId:"orion"});
  assert.equal(model.selected.id, "orion");
  assert.equal(model.activeShipId, "velox");
  assert.equal(model.active, false);
  assert.equal(model.stats.vie, 5000);
  assert.deepEqual(model.loadout.lasers, [null]);
  const markup = renderHangarShowcase({...baseOptions, selectedShipId:"orion"});
  assert.match(markup, /data-hangar-select-ship="orion" aria-pressed="true"/);
  assert.match(markup, /data-hangar-equip-ship="orion"/);
  assert.match(markup, /class="ship-open-button hangar-inventory-cta" type="button" data-ship-id="orion"/);
  assert.doesNotMatch(markup, /hangar-equipped-state/);
});

test("hangar summary uses equipped item counts and calculated combat statistics", ()=>{
  const markup = renderHangarShowcase(baseOptions);
  assert.match(markup, /Points de vie<\/span><\/dt><dd>15[\u202f\u00a0 ]000<\/dd>/);
  assert.match(markup, /Bouclier<\/span><\/dt><dd>720<\/dd>/);
  assert.match(markup, /Vitesse réelle<\/span><\/dt><dd>144<\/dd>/);
  assert.match(markup, /Statistique de vitesse : 330/);
  assert.match(markup, /Lasers<\/span><\/dt><dd>2 <span>\/ 3<\/span>/);
  assert.match(markup, /Générateurs<\/span><\/dt><dd>1 <span>\/ 3<\/span>/);
  assert.match(markup, /Extras<\/span><\/dt><dd>1 <span>\/ 2<\/span>/);
  assert.match(markup, /hangar-equipped-state/);
  assert.doesNotMatch(markup, /data-hangar-equip-ship=/);
});

test("missing or inaccessible preview cannot expose a ship outside the owned list", ()=>{
  for(const selectedShipId of [undefined, "imperial", "missing"]){
    const model = createHangarShowcaseModel({...baseOptions, selectedShipId});
    assert.equal(model.selected.id, "velox");
  }
  const fallback = createHangarShowcaseModel({...baseOptions, selectedShipId:"missing", activeShipId:"missing"});
  assert.equal(fallback.selected.id, "orion");
  assert.equal(fallback.active, false);
});

test("one ship and every catalog ship fit the same model without duplicating ownership", ()=>{
  const one = createHangarShowcaseModel({...baseOptions, ownedShips:[owned[0], owned[0]]});
  assert.equal(one.ships.length, 1);
  assert.equal(one.selected.id, "orion");
  const markup = renderHangarShowcase({...baseOptions, ownedShips:ships});
  assert.equal((markup.match(/data-hangar-select-ship=/g) || []).length, ships.length);
  assert.match(markup, /Faites défiler/);
  assert.equal((markup.match(/class="hangar-stage-ship"/g) || []).length, 1);
});

test("empty hangar does not request fabricated combat stats or a fallback starter ship", ()=>{
  let accessed = false;
  const markup = renderHangarShowcase({ownedShips:[], getStats:()=>{ accessed = true; }});
  assert.equal(accessed, false);
  assert.match(markup, /Aucun vaisseau disponible/);
  assert.doesNotMatch(markup, /data-ship-id/);
});

test("ship presentation escapes catalog labels, images and identifiers", ()=>{
  const malicious = {...owned[0], id:'bad" onclick="alert(1)', name:'<img src=x onerror=alert(1)>', className:'<script>bad()</script>', img:'x" onerror="bad()', special:'<b>unsafe</b>'};
  const options = {...baseOptions, ownedShips:[malicious], getStats:()=>baseOptions.getStats("orion")};
  const markup = renderHangarShowcase(options);
  assert.doesNotMatch(markup, /<script>|<b>unsafe<\/b>|<img src=x| onclick="alert| onerror="bad/);
  assert.match(markup, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /hangar-showcase-special/);
});

test("preview rendering never mutates owned ships, active selection, stats or equipment", ()=>{
  const options = {...baseOptions};
  const before = JSON.stringify(options);
  renderHangarShowcase(options);
  createHangarShowcaseModel(options);
  assert.equal(JSON.stringify(options), before);
});

test("server redraws with unchanged presentation retain DOM and a changed preview restores focus and list scroll", ()=>{
  const previousDocument = globalThis.document;
  const focused = {
    getAttribute:name=>name === "data-hangar-select-ship" ? "orion" : null,
    classList:{contains:()=>false}
  };
  const restored = [];
  let writes = 0;
  const list = {scrollTop:170, scrollLeft:90};
  const container = {
    contains:node=>node === focused,
    querySelector:selector=>selector === ".hangar-owned-list" ? list : null,
    querySelectorAll:()=>[{dataset:{hangarSelectShip:"orion"}, focus:options=>restored.push(options)}],
    set innerHTML(value){ writes++; this.markup = value; }
  };
  globalThis.document = {activeElement:focused};
  try {
    updateHangarShowcase(container, baseOptions);
    updateHangarShowcase(container, baseOptions);
    assert.equal(writes, 1);
    updateHangarShowcase(container, {...baseOptions, selectedShipId:"orion"});
    assert.equal(writes, 2);
    assert.deepEqual(restored, [{preventScroll:true}, {preventScroll:true}]);
    assert.equal(list.scrollTop, 170);
    assert.equal(list.scrollLeft, 90);
  } finally {
    globalThis.document = previousDocument;
  }
});
