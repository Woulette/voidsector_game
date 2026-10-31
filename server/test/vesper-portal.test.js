import assert from "node:assert/strict";
import test from "node:test";
import { portals as clientPortals } from "../../src/data/progression.js";
import { drawMapPortals } from "../../src/game/render/mapPortals.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { unlockServerPortal } from "../src/players/progressionActions.js";
import {
  VESPER_PORTAL_ID,
  VESPER_PORTAL_NAME,
  VESPER_REQUIRED_LEVEL,
  getServerPortalDefinition
} from "../src/portals/portalDefinitions.js";
import { PORTAL_CONFIGS, PORTAL_DROP_RULES } from "../src/world/definitions.js";

test("Vesper keeps the legacy violet id with a level 15 authoritative gate", ()=>{
  const portal = getServerPortalDefinition(VESPER_PORTAL_ID);
  const clientPortal = clientPortals.find(entry=>entry.id === VESPER_PORTAL_ID);

  assert.equal(portal.id, "violet");
  assert.equal(portal.name, VESPER_PORTAL_NAME);
  assert.equal(portal.requirement.level, VESPER_REQUIRED_LEVEL);
  assert.equal(portal.piecesRequired, 20);
  assert.equal(clientPortal?.name, VESPER_PORTAL_NAME);
  assert.equal(clientPortal?.img, "assets/portals/azuron-family-v1/vesper.svg");
  assert.match(clientPortal?.reward || "", /Vesper|Overdrive/i);
  assert.equal(PORTAL_CONFIGS.violet.name, VESPER_PORTAL_NAME);

  const dropRule = PORTAL_DROP_RULES.find(entry=>entry.id === VESPER_PORTAL_ID);
  assert.equal(dropRule?.name, VESPER_PORTAL_NAME);
  assert.equal(dropRule?.pieceName, "Fragment de Vesper");
  assert.equal(dropRule?.img, "assets/portal_pieces/azuron-family-v1/vesper.svg");
});

test("Vesper unlock refuses level 14 and accepts level 15", ()=>{
  const profile = createDefaultProfile();
  profile.portalPieces.violet = 20;
  profile.player.level = 14;

  const locked = unlockServerPortal(profile, {id:VESPER_PORTAL_ID});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /Niveau 15/i);
  assert.equal(profile.portalPieces.violet, 20);

  profile.player.level = 15;
  const unlocked = unlockServerPortal(profile, {id:VESPER_PORTAL_ID});
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.portal.name, VESPER_PORTAL_NAME);
  assert.equal(profile.portalPieces.violet, 0);
  assert.equal(profile.unlockedPortals.includes(VESPER_PORTAL_ID), true);
});

test("the prepared Vesper portal retains its colored fallback while gate textures load", ()=>{
  const drawn = [];
  const ctx = {
    save(){},
    restore(){},
    translate(){},
    beginPath(){},
    arc(){},
    fill(){},
    fillText(){},
    drawImage(...args){ drawn.push(args); },
    createRadialGradient(){
      return {addColorStop(){}};
    }
  };
  const image = {complete:true, naturalWidth:1254, naturalHeight:1254};
  drawMapPortals({
    ctx,
    cache:{"assets/portals/azuron-family-v1/vesper.svg":image},
    currentMap:{id:"0"},
    getMapPortals:()=>[{
      x:100,
      y:200,
      r:115,
      safeRadius:280,
      prepared:true,
      portalId:VESPER_PORTAL_ID,
      label:"LA FAILLE DE VESPER",
      displayLabel:"LA FAILLE DE VESPER"
    }]
  });

  assert.equal(drawn.length, 1);
  assert.equal(drawn[0][0], image);
  assert.equal(drawn[0][3], drawn[0][4], "the prepared Vesper portal must stay circular in the world");
});
