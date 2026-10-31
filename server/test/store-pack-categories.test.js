import assert from "node:assert/strict";
import test from "node:test";
import { starterPacks } from "../../src/data/premium.js";
import { renderStarterStore } from "../../src/ui/supportStorePanels.js";
import { getStorePackCategories, getStorePacksForCategory, isStorePackCategoryAvailable, normalizeStorePackCategory } from "../../src/ui/storePackCategories.js";

test("pack families expose existing ships and prepare only the requested future categories", ()=>{
  assert.deepEqual(getStorePackCategories().map(({id,count,available})=>({id,count,available})),[
    {id:"all",count:2,available:true},
    {id:"ships",count:2,available:true},
    {id:"boosters",count:0,available:false},
    {id:"lasers",count:0,available:false},
    {id:"resources",count:0,available:false}
  ]);
  for(const id of ["all","ships"]) assert.equal(isStorePackCategoryAvailable(id),true);
  for(const id of ["boosters","lasers","resources","unknown",null]){
    assert.equal(isStorePackCategoryAvailable(id),false);
    assert.equal(normalizeStorePackCategory(id),"all");
  }
});

test("a family becomes selectable from real catalogue metadata rather than a placeholder offer", ()=>{
  const packs = [{id:"catalogue-fixture",category:"boosters",contents:[]}];
  const categories = getStorePackCategories(packs);
  assert.equal(categories.find(category=>category.id === "boosters").available,true);
  assert.equal(categories.find(category=>category.id === "ships").available,false);
  assert.equal(normalizeStorePackCategory("boosters",packs),"boosters");
  assert.deepEqual(getStorePacksForCategory("boosters",packs),packs);
  assert.deepEqual(getStorePacksForCategory("ships",packs),packs);
});

test("the Packs view keeps the two actual offers and disables empty future categories", ()=>{
  const profile = {starterPackPurchases:[]};
  const before = structuredClone(profile);
  const catalogueBefore = structuredClone(starterPacks);
  const html = renderStarterStore(profile);
  assert.match(html,/<h2>Packs<\/h2>/);
  assert.doesNotMatch(html,/Packs de départ|pack de départ/);
  assert.equal((html.match(/data-store-offer-kind="starter"/g) || []).length,2);
  assert.match(html,/class="sc-starter-category is-selected" data-store-pack-category="all"/);
  for(const id of ["boosters","lasers","resources"]){
    const button = html.match(new RegExp(`<button[^>]*data-store-pack-category="${id}"[^>]*>[^]*?<\\/button>`))?.[0];
    assert.ok(button,id);
    assert.match(button,/ disabled>/);
    assert.match(button,/À venir/);
  }
  for(const pack of starterPacks){
    assert.ok(html.includes(`data-store-offer="${pack.id}"`));
    assert.ok(html.includes(pack.price.replace(" EUR"," €")));
    assert.ok(html.includes(pack.name));
    for(const item of pack.contents){
      assert.ok(html.includes(item.label),item.label);
      if(item.quantity !== "x1") assert.ok(html.includes(item.quantity),item.quantity);
    }
  }
  assert.deepEqual(profile,before);
  assert.deepEqual(starterPacks,catalogueBefore);
});

test("category filtering preserves ownership aliases and falls back for an unavailable family", ()=>{
  const profile = {starterPackPurchases:["starter_astra_3d"]};
  const ships = renderStarterStore(profile,{category:"ships"});
  assert.match(ships,/class="sc-starter-category is-selected" data-store-pack-category="ships"/);
  assert.match(ships,/data-store-pack-id="starter_astralis"/);
  assert.match(ships,/Déjà acquis/);
  assert.match(ships,/Achat unique déjà utilisé/);
  assert.equal((ships.match(/data-store-offer-kind="starter"/g) || []).length,2);
  assert.match(renderStarterStore(profile,{category:"resources"}),/class="sc-starter-category is-selected" data-store-pack-category="all"/);
});


test("pack category controls only update presentation and reject future or unknown families", async ()=>{
  const {handleSupportStoreInteraction} = await import("../../src/ui/supportStore.js");
  const store = {state:{player:{credits:123,premium:456}},storePackCategory:"all"};
  const before = structuredClone(store.state);
  let renders = 0;
  const event = value=>({target:{closest(selector){return selector === "[data-store-pack-category]" ? {dataset:{storePackCategory:value}} : null;}}});
  const context = {store,render(){renders++;}};
  assert.equal(handleSupportStoreInteraction(event("ships"),context),true);
  assert.equal(store.storePackCategory,"ships");
  for(const value of ["boosters","lasers","resources","unknown",null]) assert.equal(handleSupportStoreInteraction(event(value),context),false);
  assert.equal(store.storePackCategory,"ships");
  assert.equal(handleSupportStoreInteraction(event("all"),context),true);
  assert.equal(store.storePackCategory,"all");
  assert.equal(renders,2);
  assert.deepEqual(store.state,before);
});
