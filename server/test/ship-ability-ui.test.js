import assert from "node:assert/strict";
import test from "node:test";
import {
  abilityIndexFromEvent,
  normalizeAbilityKeybinds
} from "../../src/core/keybinds.js";
import { renderShipAbilityBarHtml } from "../../src/game/ui/shipAbilityBar.js";
import { getShipAbilityStatuses } from "../../src/shared/shipAbilities.js";

test("Vesperion exposes one dedicated ability slot asset", ()=>{
  const states = getShipAbilityStatuses("vesperion", {}, 1_000);
  assert.equal(states.length, 1);
  assert.equal(states[0].abilityId, "absorbing_fire");
  assert.equal(states[0].weaponClass, "laser");
  assert.equal(states[0].icon, "assets/icons/absorbing_fire.svg");

  const html = renderShipAbilityBarHtml({states, abilityKeybinds:["KeyC", "KeyV", "KeyB"]});
  assert.match(html, /data-ship-ability-index="0"/);
  assert.match(html, />C<\/span>/);
  assert.match(html, /absorbing_fire\.svg/);
});

test("ability bar renders one compact slot per supplied ship ability, up to three", ()=>{
  const states = Array.from({length:4}, (_, index)=>({
    abilityId:`ability-${index}`,
    name:`Ability ${index}`,
    shortName:`A${index}`,
    icon:"assets/icons/absorbing_fire.svg"
  }));
  const html = renderShipAbilityBarHtml({states, abilityKeybinds:["KeyC", "KeyV", "KeyB"]});
  assert.equal((html.match(/class="ship-ability-slot"/g) || []).length, 3);
});

test("ability shortcuts default to C V B and avoid action key conflicts", ()=>{
  assert.deepEqual(normalizeAbilityKeybinds([], []), ["KeyC", "KeyV", "KeyB"]);
  const keys = normalizeAbilityKeybinds(["KeyC", "KeyV", "KeyB"], ["KeyC"]);
  assert.equal(keys.includes("KeyC"), false);
  assert.equal(abilityIndexFromEvent({code:keys[0]}, keys, ["KeyC"]), 0);
});
