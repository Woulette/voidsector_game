import test from "node:test";
import assert from "node:assert/strict";
import { ships } from "../../src/data/ships.js";
import { fmt } from "../../src/core/utils.js";
import { createShopProductModel } from "../../src/ui/shopProductModel.js";
import { renderShopDetailMarkup } from "../../src/ui/shopMarkup.js";

test("every ship detail exposes its real capacities as semantic label-value pairs",()=>{
  for(const ship of ships){
    const model=createShopProductModel({kind:"ship",id:ship.id,category:"vaisseau",data:ship});
    const stats=Object.fromEntries(model.stats.map(s=>[s.label,s.value]));
    for(const [label,key] of [["Vie","vie"],["Vitesse","vitesse"],["Soute","cargo"],["Lasers","maxLasers"],["Générateurs","maxGenerators"],["Extras","maxExtras"]]){
      assert.equal(stats[label],fmt(ship.stats[key]),`${ship.id} ${label}`);
    }
    assert.equal(stats["Lance-roquettes"],fmt(ship.stats.maxRocketLaunchers ?? 1));
    assert.equal(stats["Lance-missiles"],fmt(ship.stats.maxMissileLaunchers ?? 1));
    if(ship.special)assert.equal(stats["Spécial"],ship.special);
    else assert.match(model.note,/Aucun système spécial/);
    const html=renderShopDetailMarkup(model);
    assert.match(html,/<dl class="shop-detail-stats ship-stats">/);
    const expectedVisible=model.stats.length-(ship.special ? 1 : 0);
    assert.equal((html.match(/<dt>/g)||[]).length,expectedVisible);
    assert.equal((html.match(/<dd>/g)||[]).length,expectedVisible);
    if(ship.special){
      assert.match(html,/<dialog class="shop-benefits-dialog"/);
      assert.match(html,/Présentation et capacité spéciale/);
      assert.ok(html.includes(ship.special));
    }
  }
});
