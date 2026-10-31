import assert from "node:assert/strict";
import test from "node:test";
import { portals } from "../../src/data/catalog.js";
import { getPortalCasterHelpData } from "../../src/ui/portalCasterHelp.js";
import { getServerSpaceCasterFragmentChance, runServerSpaceCaster } from "../src/economy/spaceCaster.js";
import { getServerPortalDefinition } from "../src/portals/portalDefinitions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

test("help probabilities and quantities match actual server draws, including a full reserve", ()=>{
  const portal = portals.find(entry=>entry.id === "blue");
  for(const [pieces, clears, slots] of [[0, 0, 100], [portal.piecesRequired, 0, 96], [portal.piecesRequired, 1, 100]]){
    const state = createDefaultProfile();
    state.player.premium = 100_000;
    state.portalPieces = {blue:pieces};
    state.completedPortals = {blue:clears};
    const help = getPortalCasterHelpData(portal, state);
    const observed = new Map();
    for(let index = 0; index < slots; index += 1){
      const profile = structuredClone(state);
      const result = runServerSpaceCaster(profile, {portalId:"blue", random:()=>(index + .5) / slots});
      assert.equal(result.ok, true);
      assert.equal(result.rewards.length, 1);
      const reward = result.rewards[0];
      const entry = observed.get(reward.id) || {count:0, amount:reward.amount};
      assert.equal(entry.amount, reward.amount);
      entry.count += 1;
      observed.set(reward.id, entry);
    }
    for(const reward of help.rewards){
      const actual = observed.get(reward.id);
      assert.equal(reward.chance, (actual?.count || 0) / slots, reward.id);
      if(actual) assert.equal(reward.amount, actual.amount, reward.id);
    }
    assert.ok(Math.abs(help.rewards.reduce((sum, reward)=>sum + reward.chance, 0) - 1) < 1e-12);
  }
});

test("all portal help uses the server fragment chance and configured map drop rate", ()=>{
  for(const portal of portals){
    for(const full of [false, true]){
      const state = createDefaultProfile();
      state.portalPieces = {[portal.id]:full ? portal.piecesRequired : 0};
      const help = getPortalCasterHelpData(portal, state);
      assert.equal(help.rewards[0].chance, getServerSpaceCasterFragmentChance(state, portal.id), portal.id);
      assert.equal(help.mapChance, getServerPortalDefinition(portal.id).drop.chance, portal.id);
    }
  }
});
