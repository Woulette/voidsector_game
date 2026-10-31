import test from 'node:test';
import assert from 'node:assert/strict';
import {refineryMaterialCatalog,refineryRecipes} from '../../src/data/catalog.js';
import {refineryOrbitalStationHtml,REFINERY_STATION_MODULES} from '../../src/ui/refineryOrbitalStation.js';

function render(states={},selectedId='cuivre_orbital'){
 return refineryOrbitalStationHtml({materials:refineryMaterialCatalog,recipes:refineryRecipes,selectedId,
  readMaterial:id=>({stock:17,cap:25000,level:2,rate:150,enabled:true,status:{key:'active',text:'En production'},upgrade:{nextLevel:3},job:null,...states[id]}),
  readModule:()=>({level:3,job:null})});
}

test('orbital view preserves all real materials, infrastructure and ingredient links',()=>{
 const html=render({},'noyau_astra');
 assert.equal(Object.keys(REFINERY_STATION_MODULES).length,13);
 const nodes=[...html.matchAll(/data-refinery-node="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(new Set(nodes),new Set(refineryMaterialCatalog.map(material=>material.id)));
 const links=[...html.matchAll(/data-refinery-link="([^"]+)"/g)].map(match=>match[1]);
 const expected=refineryRecipes.flatMap(recipe=>Object.keys(recipe.costs).map(input=>input+':'+recipe.outputId));
 assert.deepEqual(new Set(links),new Set(expected));
 assert.equal(links.length,14);
 assert.match(html,/data-upgrade-refinery-module="storage"/);
 assert.match(html,/data-upgrade-refinery-module="transport"/);
 assert.equal([...html.matchAll(/class="rf-station-ingredient"/g)].length,3,'Astra retains all three ingredients');
 assert.equal([...html.matchAll(/class="rf-station-link [^"]*is-ancestor/g)].length,3,'only the selected recipe is highlighted before expanding the complete chain');
});

test('selected station commands honour locked production, maximum level and pending jobs',()=>{
 let html=render({cuivre_orbital:{level:0,upgrade:{nextLevel:1},status:{key:'locked',text:'À débloquer'}}});
 assert.match(html,/<button[^>]+data-toggle-refinery-production="cuivre_orbital"[^>]+disabled/);
 assert.doesNotMatch(html,/<button[^>]+data-upgrade-refinery="cuivre_orbital"[^>]+disabled/);
 html=render({cuivre_orbital:{level:20,upgrade:null,enabled:false,status:{key:'paused',text:'En pause'}}});
 assert.match(html,/<button[^>]+data-upgrade-refinery="cuivre_orbital"[^>]+disabled/);
 assert.match(html,/<button[^>]+data-toggle-refinery-production="cuivre_orbital"[^>]+aria-pressed="false"/);
 html=render({cuivre_orbital:{level:3,upgrade:null,job:{percent:25,remaining:60000}}});
 assert.doesNotMatch(html,/<button[^>]+data-upgrade-refinery="cuivre_orbital"[^>]+disabled/);
 assert.match(html,/Voir l’amélioration/);
 assert.match(html,/aria-valuenow="25"/);
});

test('orbital rendering keeps profile data untouched and handles a stale selected material',()=>{
 const states={cuivre_orbital:{stock:1400,level:3,enabled:false,status:{key:'paused',text:'En pause'}}};
 const before=JSON.stringify({states,recipes:refineryRecipes,materials:refineryMaterialCatalog});
 const html=render(states,'removed-material');
 assert.match(html,/Collecteur de cuivre/);
 assert.match(html,/data-toggle-refinery-production="cuivre_orbital"/);
 assert.equal(JSON.stringify({states,recipes:refineryRecipes,materials:refineryMaterialCatalog}),before);
});
