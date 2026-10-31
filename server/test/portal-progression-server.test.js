import assert from "node:assert/strict";
import test from "node:test";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { runServerSpaceCaster } from "../src/economy/spaceCaster.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { unlockServerPortal } from "../src/players/progressionActions.js";
import {
  PORTAL_CONTENT_PENDING_CODE,
  PORTAL_FRAGMENT_DROP_CHANCE,
  SERVER_PORTAL_DEFINITIONS,
  getPortalContentLock
} from "../src/portals/portalDefinitions.js";
import {
  ANCESTRAL_DRONE_SKIN_REWARD_ID,
  KHARON_DRONE_SKIN_REWARD_ID,
  grantPortalBonusReward,
  resolvePortalBonusReward
} from "../src/portals/portalRewards.js";
import { PORTAL_CONFIGS, PORTAL_DROP_RULES } from "../src/world/definitions.js";
import { portalRuleMatchesMap, rollPortalPieceDrop } from "../src/world/loot.js";
import { PROGRESSION_UNLOCKS } from "../../src/shared/progressionUnlocks.js";

const EXPECTED_PORTALS = [
  {
    id:"blue",
    name:"Le Seuil d’Azuron",
    level:10,
    pieces:15,
    slug:"seuil_azuron",
    maps:[1, 2, 3, 4],
    core:false,
    highLevel:false,
    reward:{credits:1_000_000,xp:500_000,reputation:50_000,premium:10_000, ammoX4:10_000, ammoX6:0}
  },
  {
    id:"violet",
    name:"La Faille de Vesper",
    level:15,
    pieces:20,
    slug:"faille_vesper",
    maps:[1, 2, 3, 4],
    core:false,
    highLevel:false,
    reward:{credits:2_000_000,xp:1_000_000,reputation:100_000,premium:20_000, ammoX4:20_000, ammoX6:0}
  },
  {
    id:"red",
    name:"La Forge de Kharon",
    level:20,
    pieces:35,
    slug:"forge_kharon",
    maps:[1, 2, 3, 4, 5],
    core:false,
    highLevel:false,
    reward:{credits:3_000_000,xp:1_500_000,reputation:150_000,premium:30_000, ammoX4:30_000, ammoX6:0}
  },
  {
    id:"ionis",
    name:"La Tempête d’Ionis",
    level:25,
    pieces:50,
    slug:"tempete_ionis",
    maps:[2, 3, 4, 5],
    core:true,
    highLevel:false,
    reward:{premium:40_000, ammoX4:40_000, ammoX6:0}
  },
  {
    id:"emerald",
    name:"La Ruche d’Éclanite",
    level:30,
    pieces:60,
    slug:"ruche_eclanite",
    maps:[2, 3, 4, 5],
    core:true,
    highLevel:false,
    reward:{premium:50_000, ammoX4:0, ammoX6:5_000}
  },
  {
    id:"void",
    name:"L’Abîme de Nox",
    level:35,
    pieces:75,
    slug:"abime_nox",
    maps:[3, 4, 5],
    core:true,
    highLevel:true,
    reward:{premium:50_000, ammoX4:0, ammoX6:10_000}
  },
  {
    id:"prismatic",
    name:"Le Nexus Prismatique",
    level:40,
    pieces:80,
    slug:"nexus_prismatique",
    maps:[4, 5],
    core:true,
    highLevel:true,
    reward:{premium:50_000, ammoX4:50_000, ammoX6:0}
  },
  {
    id:"ancient",
    name:"Le Sanctuaire des Précurseurs",
    level:45,
    pieces:90,
    slug:"sanctuaire_precurseurs",
    maps:[5],
    core:true,
    highLevel:true,
    reward:{premium:75_000, ammoX4:0, ammoX6:15_000}
  },
  {
    id:"eternal",
    name:"Le Cœur de l’Éternel",
    level:50,
    pieces:100,
    slug:"coeur_eternel",
    maps:[],
    core:false,
    highLevel:false,
    reward:{premium:100_000, ammoX4:0, ammoX6:25_000}
  }
];

function sequenceRandom(values){
  let index = 0;
  return ()=>values[Math.min(index++, values.length - 1)];
}

test("the authoritative server catalogue defines all nine progression portals", ()=>{
  assert.deepEqual(SERVER_PORTAL_DEFINITIONS.map(portal=>portal.id), EXPECTED_PORTALS.map(portal=>portal.id));
  assert.deepEqual(PORTAL_DROP_RULES.map(rule=>rule.id), EXPECTED_PORTALS.map(portal=>portal.id));

  for(const expected of EXPECTED_PORTALS){
    const portal = SERVER_PORTAL_DEFINITIONS.find(entry=>entry.id === expected.id);
    const dropRule = PORTAL_DROP_RULES.find(entry=>entry.id === expected.id);
    assert.ok(portal, expected.id);
    assert.equal(portal.name, expected.name);
    assert.equal(portal.requirement.level, expected.level);
    assert.equal(portal.piecesRequired, expected.pieces);
    assert.equal(portal.img, ["violet","red"].includes(expected.id) ? `assets/portals/azuron-family-v1/${expected.id==="violet"?"vesper":"kharon"}.svg` : `assets/portals/${expected.slug}.png?v=20260726-kharon1`);
    assert.equal(portal.pieceImg, ["violet","red"].includes(expected.id) ? `assets/portal_pieces/azuron-family-v1/${expected.id==="violet"?"vesper":"kharon"}.svg` : `assets/portal_pieces/fragment_${expected.slug.replace("seuil_", "").replace("faille_", "").replace("forge_", "").replace("tempete_", "").replace("ruche_", "").replace("abime_", "")}.png?v=20260726-kharon1`);
    assert.deepEqual(portal.drop.mapNumbers, expected.maps);
    assert.equal(portal.drop.includeCore, expected.core);
    assert.equal(portal.drop.includeFrontier35_50, expected.highLevel);
    assert.equal(Boolean(portal.drop.levelRange), expected.highLevel);
    assert.equal(portal.drop.chance, PORTAL_FRAGMENT_DROP_CHANCE);
    assert.deepEqual(PORTAL_CONFIGS[expected.id].reward, {
      credits:0,
      xp:0,
      ...expected.reward
    });
    assert.equal(dropRule.img, portal.pieceImg);
  }

  assert.equal(SERVER_PORTAL_DEFINITIONS.filter(portal=>portal.gameplayReady).length, 8);
  assert.equal(getPortalContentLock("blue"), null);
  assert.equal(getPortalContentLock("violet"), null);
  assert.equal(getPortalContentLock("red"), null);
  assert.equal(getPortalContentLock("ionis"), null);
  assert.equal(getPortalContentLock("emerald"), null);
  assert.equal(getPortalContentLock("void"), null);
  assert.equal(getPortalContentLock("prismatic"), null);
  assert.equal(getPortalContentLock("ancient"), null);
  for(const expected of EXPECTED_PORTALS.slice(8)){
    assert.equal(getPortalContentLock(expected.id)?.code, PORTAL_CONTENT_PENDING_CODE);
  }
  assert.match(SERVER_PORTAL_DEFINITIONS.find(portal=>portal.id === "eternal").drop.assumption, /Space Caster/i);
  assert.equal(Object.values(PROGRESSION_UNLOCKS).some(unlock=>unlock.portalId === "void"), false);
});

test("all nine portal unlock requirements are enforced by the server catalogue", ()=>{
  assert.deepEqual(
    unlockServerPortal(createDefaultProfile(), {id:""}),
    {ok:false, reason:"Portail introuvable."}
  );

  for(const expected of EXPECTED_PORTALS){
    const profile = createDefaultProfile();
    profile.player.level = expected.level - 1;
    profile.portalPieces[expected.id] = expected.pieces;

    const tooLow = unlockServerPortal(profile, {id:expected.id});
    assert.equal(tooLow.ok, false, `${expected.id}: level gate`);
    assert.match(tooLow.reason, new RegExp(`Niveau ${expected.level}`, "i"));
    assert.equal(profile.portalPieces[expected.id], expected.pieces);

    profile.player.level = expected.level;
    profile.portalPieces[expected.id] = expected.pieces - 1;
    const missingPiece = unlockServerPortal(profile, {id:expected.id});
    assert.equal(missingPiece.ok, false, `${expected.id}: fragment gate`);
    assert.equal(profile.portalPieces[expected.id], expected.pieces - 1);

    profile.portalPieces[expected.id] = expected.pieces;
    const unlocked = unlockServerPortal(profile, {id:expected.id});
    assert.equal(unlocked.ok, true, `${expected.id}: unlock`);
    assert.equal(unlocked.portal.name, expected.name);
    assert.equal(profile.portalPieces[expected.id], 0);
    assert.equal(profile.unlockedPortals.includes(expected.id), true);
  }
});

test("fragment map scopes include CORE and future level 35-50 zones exactly where requested", ()=>{
  const firmMaps = [1, 2, 3, 4, 5].map(number=>({
    id:`firm-${number}`,
    name:`Helion-${String(number).padStart(2, "0")}`,
    level:[(number - 1) * 5, number * 5 - 1]
  }));
  const core = {id:"50", name:"CORE", level:[25, 34]};
  const futureLevel40 = {id:"future-40", name:"Zone future", level:[40, 44]};

  for(const expected of EXPECTED_PORTALS){
    const rule = PORTAL_DROP_RULES.find(entry=>entry.id === expected.id);
    for(let mapNumber = 1; mapNumber <= 5; mapNumber += 1){
      assert.equal(
        portalRuleMatchesMap(rule, firmMaps[mapNumber - 1]),
        expected.maps.includes(mapNumber),
        `${expected.id} map ${mapNumber}`
      );
    }
    assert.equal(portalRuleMatchesMap(rule, core), expected.core, `${expected.id} CORE`);
    assert.equal(portalRuleMatchesMap(rule, futureLevel40), expected.highLevel, `${expected.id} level 40`);
  }

  assert.equal(rollPortalPieceDrop("0", {random:()=>0})?.id, "blue");
  assert.equal(rollPortalPieceDrop("0", {random:()=>0.00331})?.id, "violet");
  assert.equal(rollPortalPieceDrop("0", {random:()=>0.00661})?.id, "red");
  assert.equal(rollPortalPieceDrop("0", {random:()=>0.00991}), null);

  assert.equal(rollPortalPieceDrop("50", {random:()=>0})?.id, "ionis");
  assert.equal(rollPortalPieceDrop("50", {random:()=>0.00331})?.id, "emerald");
  assert.equal(rollPortalPieceDrop("50", {random:()=>0.00661})?.id, "void");
  assert.equal(rollPortalPieceDrop("50", {random:()=>0.00991})?.id, "prismatic");
  assert.equal(rollPortalPieceDrop("50", {random:()=>0.01321})?.id, "ancient");
  assert.equal(rollPortalPieceDrop("50", {random:()=>0.01651}), null);
});

test("future portal bonus rewards use exclusive authoritative probability tables", ()=>{
  assert.deepEqual(
    resolvePortalBonusReward({portalId:"violet", previousCompletions:0, random:()=>1}),
    {
      portalId:"violet",
      kind:"item",
      itemId:"drone_overdrive_chip",
      name:"Noyau Overdrive Drone",
      awarded:true,
      firstClear:true,
      guaranteed:true,
      chance:1
    }
  );
  assert.equal(resolvePortalBonusReward({portalId:"violet", previousCompletions:1, random:()=>0.499})?.awarded, true);
  assert.equal(resolvePortalBonusReward({portalId:"violet", previousCompletions:1, random:()=>0.5})?.awarded, false);

  assert.equal(resolvePortalBonusReward({portalId:"red", random:()=>0.329})?.itemId, "laser_mk4");
  assert.equal(resolvePortalBonusReward({portalId:"red", random:()=>0.33})?.cosmeticId, KHARON_DRONE_SKIN_REWARD_ID);
  assert.equal(resolvePortalBonusReward({portalId:"red", random:()=>0.66})?.kind, "none");

  assert.equal(resolvePortalBonusReward({portalId:"void", random:()=>0.149})?.itemId, "laser_elite_blue");
  assert.equal(resolvePortalBonusReward({portalId:"void", random:()=>0.16})?.itemId, "laser_elite_red");
  assert.equal(resolvePortalBonusReward({portalId:"void", random:()=>0.31})?.itemId, "laser_elite_green");
  assert.equal(resolvePortalBonusReward({portalId:"void", random:()=>0.46})?.kind, "none");

  assert.equal(resolvePortalBonusReward({portalId:"prismatic", random:()=>0.1})?.itemId, "ancestral_drone_core");
  assert.equal(resolvePortalBonusReward({portalId:"prismatic", random:()=>0.1})?.guaranteed, false);
  assert.equal(resolvePortalBonusReward({portalId:"prismatic", random:()=>0.4})?.itemId, "laser_mk4");
  assert.equal(resolvePortalBonusReward({portalId:"prismatic", random:()=>0.8})?.kind, "none");

  const ancestralSkin = resolvePortalBonusReward({portalId:"ancient", random:()=>0.49});
  assert.equal(ancestralSkin.cosmeticId, ANCESTRAL_DRONE_SKIN_REWARD_ID);
  assert.equal(ancestralSkin.pending, true);
  assert.equal(resolvePortalBonusReward({portalId:"ancient", random:sequenceRandom([0.5, 0])})?.itemId, "laser_elite_blue");
  assert.equal(resolvePortalBonusReward({portalId:"ancient", random:sequenceRandom([0.9, 0.34])})?.itemId, "laser_elite_red");
  assert.equal(resolvePortalBonusReward({portalId:"ancient", random:sequenceRandom([0.9, 0.99])})?.itemId, "laser_elite_green");

  assert.equal(resolvePortalBonusReward({portalId:"ionis", random:()=>0}), null);
  assert.equal(resolvePortalBonusReward({portalId:"emerald", random:()=>0}), null);
  assert.equal(resolvePortalBonusReward({portalId:"eternal", random:()=>0}), null);
});

test("Nox grants at most one colored elite laser and preserves the 55 percent empty outcome", ()=>{
  const cases = [
    {roll:0, itemId:"laser_elite_blue"},
    {roll:0.15, itemId:"laser_elite_red"},
    {roll:0.30, itemId:"laser_elite_green"}
  ];

  for(const expected of cases){
    const profile = createDefaultProfile();
    const outcome = grantPortalBonusReward(profile, "void", {random:()=>expected.roll});
    assert.equal(outcome?.itemId, expected.itemId);
    assert.equal(outcome?.awarded, true);
    assert.equal(getInventoryItemCount(profile, expected.itemId), 1);
    const otherLasers = cases
      .map(entry=>entry.itemId)
      .filter(itemId=>itemId !== expected.itemId);
    assert.equal(otherLasers.reduce((total, itemId)=>total + getInventoryItemCount(profile, itemId), 0), 0);
  }

  const missProfile = createDefaultProfile();
  const miss = grantPortalBonusReward(missProfile, "void", {random:()=>0.45});
  assert.equal(miss?.kind, "none");
  assert.equal(cases.reduce(
    (total, entry)=>total + getInventoryItemCount(missProfile, entry.itemId),
    0
  ), 0);
});

test("granting Vesper's first-clear reward adds exactly one existing chip item", ()=>{
  const profile = createDefaultProfile();
  profile.completedPortals.violet = 0;
  const outcome = grantPortalBonusReward(profile, "violet", {random:()=>1});
  assert.equal(outcome.awarded, true);
  assert.equal(getInventoryItemCount(profile, "drone_overdrive_chip"), 1);

  profile.completedPortals.violet = 1;
  const miss = grantPortalBonusReward(profile, "violet", {random:()=>0.5});
  assert.equal(miss.awarded, false);
  assert.equal(getInventoryItemCount(profile, "drone_overdrive_chip"), 1);
});

test("the level 50 fragment remains available through Space Caster without an invented world drop zone", ()=>{
  const profile = createDefaultProfile();
  profile.player.premium = 100;
  const result = runServerSpaceCaster(profile, {portalId:"eternal", random:()=>0});
  assert.equal(result.ok, true);
  assert.equal(profile.portalPieces.eternal, 1);
  assert.equal(result.rewards[0]?.id, "eternal");
  assert.equal(PORTAL_DROP_RULES.find(rule=>rule.id === "eternal")?.includeCore, false);
  assert.equal(portalRuleMatchesMap(
    PORTAL_DROP_RULES.find(rule=>rule.id === "eternal"),
    {id:"future-50", name:"Zone future", level:[45, 50]}
  ), false);
});
