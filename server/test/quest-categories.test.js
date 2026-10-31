import test from 'node:test';
import assert from 'node:assert/strict';
import { questCatalog } from '../../src/data/progression.js';
import { getQuestActivityCategory } from '../../src/game/ui/questCategories.js';
import { questIcon, relayObjectiveInfo } from '../../src/game/ui/questRelayObjectives.js';
import { renderQuestPanel } from '../../src/game/ui/questRelayPanel.js';
import { equipment, portals, rawMaterialCatalog } from '../../src/data/catalog.js';
import { getQuestObjectiveImage, getQuestMaterialImage } from '../../src/game/ui/questObjectiveVisuals.js';

test('real quest families keep the same reusable category across all four firms', ()=>{
  const expected = {
    quest_lv4_place_au_combat:'combat', quest_lv3_alert_vigilance:'combat',
    quest_lv3_one_step_after_another:'combat', quest_lv5_call_for_help:'combat',
    quest_lv3_new_range:'ship', quest_lv3_combat_drone_companion:'drone',
    quest_lv3_prepare_future:'upgrade', quest_spectral_scan:'upgrade',
    quest_lv9_ca_sent_le_poisson_pouris:'laser', quest_lv4_contaminated_samples:'collect',
    quest_lv10_maintenance_impossible:'collect', quest_lv10_sauvons_deadly:'portal',
    quest_lv8_la_roue_tourne:'portal',
  };
  for(const firm of ['astra','cyan','jaune','verte']){
    for(const [source,id] of Object.entries(expected)){
      const quest = questCatalog.find(q=>q.firmId === firm && (q.sourceQuestId || q.id) === source);
      assert.ok(quest, `${firm}: ${source}`);
      assert.equal(getQuestActivityCategory(quest).id, id, `${firm}: ${source}`);
    }
  }
});

test('authored primary category can describe mixed quests while invalid values use their objectives', ()=>{
  const mixed = {objectives:[{type:'kill'}, {type:'quest_item_drop'}]};
  assert.equal(getQuestActivityCategory(mixed).id, 'combat');
  assert.equal(getQuestActivityCategory({...mixed,activityCategory:'collect'}).id, 'collect');
  assert.equal(getQuestActivityCategory({...mixed,activityCategory:'unknown'}).id, 'combat');
  assert.equal(getQuestActivityCategory({objective:{type:'deliver_item'}}).id, 'deliver');
  assert.equal(getQuestActivityCategory({objective:{type:'visit_coordinates'}}).id, 'explore');
  assert.equal(getQuestActivityCategory(null).id, 'explore');
});

test('quest list category remains recognizable when locked, active, claimable or completed', ()=>{
  const quest = questCatalog.find(q=>q.id === 'quest_lv3_new_range');
  const cases = [
    {playerLevel:1,showLockedQuests:true},
    {playerLevel:3},
    {playerLevel:3,activeQuests:[quest],selectedQuestCategory:'active',getQuestObjectiveProgress:()=>0},
    {playerLevel:3,activeQuests:[quest],selectedQuestCategory:'active',getQuestObjectiveProgress:()=>1},
    {playerLevel:3,completedQuestClaims:{[quest.id]:true},selectedQuestCategory:'completed'},
  ];
  for(const extra of cases){
    const {html} = renderQuestPanel({quests:[quest],selectedQuestId:quest.id,...extra});
    const symbol = html.match(/<span class="quest-strip-icon"[^>]*>([\s\S]*?)<\/span>/)?.[1];
    assert.ok(symbol, 'Quest entry is visible');
    assert.match(symbol, /data-quest-category-icon="ship"/);
  }
});

test('objectives use the matching category symbol for collection, delivery, upgrades, lasers and portals', ()=>{
  const expected = {
    quest_item_drop:'collect', deliver_item:'deliver', refinery_module_upgrade_start:'upgrade',
    refinery_material_upgrade_start:'upgrade', equipped_ship_lasers:'laser',
    portal_complete:'portal', space_caster_use:'portal',
  };
  for(const [type,category] of Object.entries(expected)){
    const info = relayObjectiveInfo({type,label:'Objectif',material:'nickel_brut'});
    assert.equal(info.icon, category);
    assert.match(questIcon(info.icon), new RegExp(`data-quest-category-icon="${category}"`));
  }
});

test('quest artwork follows the same catalogue references as the shop, refinery and specific portal', ()=>{
  assert.equal(getQuestObjectiveImage({type:'equipped_ship_lasers'}), equipment.find(item=>item.id==='laser_mk1').img);
  for(const material of rawMaterialCatalog){
    assert.equal(getQuestMaterialImage(material.id),material.img,material.id);
  }
  for(const portal of portals){
    assert.equal(getQuestObjectiveImage({type:'portal_complete',portalId:portal.id}),portal.img,portal.id);
  }
  assert.notEqual(getQuestObjectiveImage({type:'portal_complete',portalId:'ricky'}),portals.find(portal=>portal.id==='blue').img);
  const collection={objective:{type:'quest_item_drop',itemImg:'assets/quest_items/contaminated_sample.png'}};
  assert.match(questIcon('collect','',collection),/src="assets\/quest_items\/contaminated_sample.png"/);
});
