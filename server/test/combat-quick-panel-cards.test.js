import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { droneFormations, equipment } from "../../src/data/equipment.js";
import { renderQuickPanelContent } from "../../src/game/ui/quickPanel.js";
import { getShipAbilityStatuses } from "../../src/shared/shipAbilities.js";

const common = {
  ammoTypes:[],
  canAfford:()=>true,
  getAmmoCount:()=>0,
  laserVolleyCount:1,
  missileState:null
};

const quickPanelCss = readFileSync(new URL("../../src/styles/hangar.css", import.meta.url), "utf8");

test("ship skill card keeps only the useful compact combat details", ()=>{
  const html = renderQuickPanelContent({
    ...common,
    tab:"skills",
    shipAbilityStates:getShipAbilityStatuses("vesperion", {}, Date.now())
  });

  assert.match(html, /combat-skill-grid/);
  assert.match(html, /Tir absorbant/);
  assert.match(html, /50 % vol de vie \(laser\)/);
  assert.match(html, /20 secondes/);
  assert.match(html, /3 minutes/);
  assert.doesNotMatch(html, /Pendant 20 secondes/);
});

test("drone formations render structured effects and maluses", ()=>{
  const html = renderQuickPanelContent({
    ...common,
    tab:"formations",
    droneFormations,
    ownedDroneFormations:droneFormations.map(formation=>formation.id),
    activeDroneFormation:"base"
  });

  assert.match(html, /combat-formations-grid/);
  assert.match(html, /Bonus :/);
  assert.match(html, /Malus :/);
  assert.match(html, /Formation Cuirassé/);
  assert.match(html, /\+30 % bouclier/);
  assert.match(html, /\+30 % régénération/);
  assert.match(html, /-15 % dégâts laser/);
  assert.match(html, /-20 % dégâts roquettes/);
  assert.match(html, /data-combat-formation-use="cuirasse"/);
  assert.match(html, /combat-formation-card active/);
  assert.doesNotMatch(html, /À acheter au magasin drones/);
  assert.doesNotMatch(html, />ACTIF</);
  assert.doesNotMatch(html, />VERROUILL/);
});

test("drone formations stay invisible until they are owned", ()=>{
  const html = renderQuickPanelContent({
    ...common,
    tab:"formations",
    droneFormations,
    ownedDroneFormations:["base"],
    activeDroneFormation:"base"
  });

  assert.match(html, /Formation Base/);
  assert.doesNotMatch(html, /Formation Cuirassé/);
  assert.doesNotMatch(html, /Formation Tir/);
  assert.doesNotMatch(html, /Formation Vitesse/);
});

test("extras use compact facts and contained action controls", ()=>{
  const extras = equipment.filter(item=>[
    "extra_auto_rocket",
    "extra_repair_bot",
    "pistou_portgun"
  ].includes(item.id));
  const html = renderQuickPanelContent({
    ...common,
    tab:"extras",
    extras,
    repairState:{ok:true, reason:""},
    repairBotActive:false,
    extraBonus:{repairBot:true},
    repairBotDelay:5
  });

  assert.match(html, /combat-extras-grid/);
  assert.match(html, /Tir automatique roquettes/);
  assert.match(html, /Répare 2 % coque \/ s/);
  assert.match(html, /Téléportation de secteur/);
  assert.match(html, /combat-card-actions/);
  assert.doesNotMatch(html, /Ouvre la carte secteur pour choisir une destination/);
});

test("quick panel tabs keep a stable height across ammo, skills, formations and extras", ()=>{
  assert.match(quickPanelCss, /\.combat-panel-content\{height:130px;overflow:hidden\}/);
  assert.match(quickPanelCss, /\.combat-info-grid\{[\s\S]*height:130px;[\s\S]*max-height:130px/);
  assert.match(quickPanelCss, /\.combat-info-card\{[\s\S]*height:62px;[\s\S]*min-height:62px/);
  assert.match(quickPanelCss, /\.combat-skill-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(quickPanelCss, /\.combat-formation-stats\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(quickPanelCss, /\.combat-shop-price-discount\{[\s\S]*display:inline-flex!important/);
  assert.doesNotMatch(quickPanelCss, /\.combat-formations-grid \.combat-info-card\{min-height:108px\}/);
});
