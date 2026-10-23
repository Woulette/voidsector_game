import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/game/combatData/maps.js";
import { renderCombatMapPanel } from "../../src/game/ui/combatMapPanel.js";
import { getStellarMapConnections } from "../../src/game/ui/sectorMapPresentation.js";

const current = MAPS.find(map=>map.name === "Helion-01");
const destination = MAPS.find(map=>map.name === "Nereid-01");
const render = options=>renderCombatMapPanel({maps:MAPS, getCurrentMap:()=>current, selectedMapId:destination.id, ...options});
const travelButton = html=>html.match(/<button[^>]+data-sector-travel-target-map="[^"]*"[^>]*>[\s\S]*?<\/button>/)?.[0] || "";

test("stellar map uses the 21 real maps and all 34 unique existing portal links", ()=>{
  const connections = getStellarMapConnections(MAPS);
  assert.equal(connections.length, 34);
  const html = render();
  assert.equal((html.match(/data-sector-map-select=/g) || []).length, 21);
  assert.equal((html.match(/data-sector-link=/g) || []).length, 34);
  assert.match(html, /Carte stellaire/);
  assert.match(html, /21\/21 secteurs actifs · 34 liaisons/);
  for(const {from, to} of connections){
    assert.ok(from.portals.some(portal=>String(portal.targetMap) === String(to.id)) || to.portals.some(portal=>String(portal.targetMap) === String(from.id)));
  }
});

test("stellar map selection is available without Premium but automatic travel requires it", ()=>{
  const withoutPremium = render({premiumActive:false});
  assert.match(withoutPremium, new RegExp(`data-sector-map-select="${destination.id}"`));
  assert.match(travelButton(withoutPremium), /disabled/);
  assert.match(travelButton(withoutPremium), /Voyage automatique · Premium/);
  const withPremium = travelButton(render({premiumActive:true}));
  assert.doesNotMatch(withPremium, /disabled/);
  assert.match(withPremium, new RegExp(`data-sector-travel-target-map="${destination.id}"`));
});

test("stellar map disables travel to the current sector and resets an invalid selection safely", ()=>{
  const html = render({premiumActive:true, selectedMapId:current.id});
  assert.match(travelButton(html), /disabled/);
  assert.match(travelButton(html), /Vous êtes déjà dans ce secteur/);
  assert.match(travelButton(render({premiumActive:true, selectedMapId:"absent"})), new RegExp(`data-sector-travel-target-map="${current.id}"`));
});

test("stellar map highlights only the supplied active route and provides cancellation", ()=>{
  const next = MAPS.find(map=>map.name === "Helion-02");
  const html = render({premiumActive:true, travelState:{active:true, targetMapId:next.id, routeMapIds:[current.id, next.id]}});
  assert.equal((html.match(/sector-route[^\"]*travel-active/g) || []).length, 1);
  assert.match(html, /Voyage vers Helion-02/);
  assert.match(html, /data-sector-travel-cancel/);
  assert.match(html, /Clique dans l’espace pour reprendre les commandes/);
  assert.doesNotMatch(render({travelState:{active:false}}), /data-sector-travel-cancel/);
});

test("stellar map keeps Portgun target handling separate from Premium travel", ()=>{
  const html = render({mode:"portgun", playerLevel:4, premiumActive:true});
  assert.match(html, /data-portgun-target-map=/);
  assert.doesNotMatch(html, /data-sector-map-select=/);
  assert.doesNotMatch(html, /data-sector-travel-target-map=/);
  assert.doesNotMatch(html, /data-sector-travel-cancel/);
  const locked = MAPS.find(map=>map.name === "Helion-03");
  assert.doesNotMatch(html, new RegExp(`data-portgun-target-map="${locked.id}"`));
});

test("stellar connections do not invent template bridges when maps have no portal", ()=>{
  const maps = [{id:0, name:"Helion-01"}, {id:1, name:"Helion-02"}, {id:20, name:"Nereid-01"}];
  assert.deepEqual(getStellarMapConnections(maps), []);
  const html = renderCombatMapPanel({maps, getCurrentMap:()=>maps[0], selectedMapId:1});
  assert.doesNotMatch(html, /data-sector-link=/);
  assert.match(html, /Aucune liaison disponible/);
});

test("stellar selection and active destination escape display names", ()=>{
  const maps = [{...current}, {...destination, displayName:'<img src=x onerror="alert(1)">'}];
  const html = renderCombatMapPanel({maps, getCurrentMap:()=>maps[0], selectedMapId:maps[1].id, premiumActive:true, travelState:{active:true, targetMapId:maps[1].id}});
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /<img/);
});
