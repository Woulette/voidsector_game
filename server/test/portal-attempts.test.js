import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile,preserveProtectedOwnership } from "../src/players/profileSanitize.js";
import { unlockServerPortal } from "../src/players/progressionActions.js";
import { SERVER_PORTAL_DEFINITIONS } from "../src/portals/portalDefinitions.js";
import { createAttemptEntry,invokeFragmentAttempt,finishFragmentAttempt } from "../src/portals/portalAttempts.js";
import { normalizePortalAttempts } from "../../src/shared/portalAttempts.js";
import { getPortalAccess,splitPortalRewards } from "../../src/ui/portalPresentation.js";
import { portals } from "../../src/data/progression.js";
import { createRewardSystem } from "../../src/game/systems/rewards.js";
import { registerProgressionHandlers } from "../src/socket/progressionHandlers.js";

for(const definition of SERVER_PORTAL_DEFINITIONS){
  test(`${definition.id}: each invocation consumes one assembled attempt and the next can be assembled while it is active`,()=>{
    const profile=createDefaultProfile();profile.player.level=50;profile.activeShip="orion";
    profile.portalPieces[definition.id]=definition.piecesRequired;
    assert.equal(unlockServerPortal(profile,{id:definition.id}).ok,true);
    assert.equal(profile.portalPieces[definition.id],0);
    const first={...createAttemptEntry({id:`first-${definition.id}`,portalId:definition.id,lives:3,phase:"prepared"},profile),preparedAt:100};
    assert.equal(invokeFragmentAttempt(profile,first).ok,true);
    assert.equal(profile.unlockedPortals.includes(definition.id),false);
    profile.portalPieces[definition.id]=definition.piecesRequired;
    assert.equal(unlockServerPortal(profile,{id:definition.id}).ok,true);
    const before=structuredClone(profile);
    assert.equal(invokeFragmentAttempt(profile,{...first,id:`second-${definition.id}`}).ok,false);
    assert.deepEqual(profile,before);
    const access=getPortalAccess(portals.find(item=>item.id===definition.id),profile);
    assert.equal(access.canPrepare,false);assert.equal(access.unlocked,true);assert.equal(access.invoked,true);
    finishFragmentAttempt(profile,definition.id);
    assert.equal(profile.unlockedPortals.includes(definition.id),true);
    assert.equal(invokeFragmentAttempt(profile,{...first,id:`second-${definition.id}`}).ok,true);
    finishFragmentAttempt(profile,definition.id);
    assert.equal(invokeFragmentAttempt(profile,{...first,id:`third-${definition.id}`}).ok,false);
    assert.equal(unlockServerPortal(profile,{id:definition.id}).ok,false);
  });
}

test("migration preserves one paid pending entry, removes exhausted permanent unlocks and does not duplicate a queued ticket",()=>{
  const completed=normalizePortalAttempts({unlockedPortals:["blue","violet"],completedPortals:{blue:1}});
  assert.deepEqual(completed.unlockedPortals,["violet"]);assert.equal(completed.portalAttempt,null);
  const summoned=normalizePortalAttempts({unlockedPortals:["blue","violet"],completedPortals:{blue:1},
    preparedPortal:{id:"paid-blue",portalId:"blue",preparedAt:123}});
  assert.equal(summoned.portalAttempt.id,"paid-blue");assert.equal(summoned.portalAttempt.lives,3);
  assert.deepEqual(summoned.unlockedPortals,["violet"]);
  const queued=normalizePortalAttempts({...summoned,unlockedPortals:["blue","violet"]});
  assert.deepEqual(queued.unlockedPortals,["blue","violet"]);
  assert.deepEqual(normalizePortalAttempts(queued),queued);
});

test("client profile saves cannot forge or delete the active attempt, its lives, or the schema version",()=>{
  const existing=sanitizeProfile({...createDefaultProfile(),portalAttempt:{id:"paid-blue",portalId:"blue",lives:2,phase:"active"}});
  const incoming=sanitizeProfile({...existing,portalAttempt:{id:"free-red",portalId:"red",lives:3,phase:"parked"},portalAttemptsVersion:0});
  preserveProtectedOwnership(incoming,existing);
  assert.deepEqual(incoming.portalAttempt,existing.portalAttempt);assert.equal(incoming.portalAttemptsVersion,1);
});

test("completion notices appear at seven seconds and a new game reset discards pending notices",()=>{
  let clock=0;
  const rewards=createRewardSystem({now:()=>clock});
  rewards.showLootNotice({credits:1_000_000,xp:100_000,reputation:10_000,delayMs:7000,duration:15});
  assert.equal(rewards.getLootNotices().length,0);
  clock=6999;rewards.tick(6.999);assert.equal(rewards.getLootNotices().length,0);
  clock=7000;rewards.tick(.001);assert.equal(rewards.getLootNotices().length,1);
  assert.equal(rewards.getLootNotices()[0].loot.reputation,10_000);
  rewards.showLootNotice({credits:9,delayMs:7000});rewards.reset();clock=14000;rewards.tick(7);
  assert.equal(rewards.getLootNotices().length,0);
});

test("the Azuron dossier exposes the five guaranteed numeric rewards",()=>{
  const rewards=splitPortalRewards(portals.find(portal=>portal.id==="blue"));
  assert.deepEqual(rewards.filter(reward=>reward.kind!=="special").map(reward=>[reward.kind,reward.amount]),
    [["credits",1_000_000],["xp",500_000],["reputation",50_000],["ammo",10_000],["nova",10_000]]);
});

test("assembling through the socket while a portal is invoked queues the next attempt without trying to invoke it",async()=>{
  const profile=createDefaultProfile();profile.player.level=10;profile.portalPieces.blue=15;
  profile.portalAttempt={id:"already-invoked",portalId:"blue",lives:2,phase:"active"};
  const handlers=new Map(),events=[],player={id:"pilot",accountId:"account"};let preparations=0;
  registerProgressionHandlers({id:"pilot",on:(name,fn)=>handlers.set(name,fn),emit:(...args)=>events.push(args)},
    {guard:()=>true,players:new Map([[player.id,player]]),preparePortalInstance:()=>preparations++,emitProfileSync(){},
      profileManager:{applyProgressionAction:({action})=>({...unlockServerPortal(profile,action),profile,save:Promise.resolve()})}});
  await handlers.get("portal:unlock")({id:"blue",method:"pieces"});
  assert.equal(preparations,0);assert.equal(profile.portalPieces.blue,0);assert.deepEqual(profile.unlockedPortals,["blue"]);
  assert.equal(events.filter(([name])=>name==="portal:unlocked").length,1);
  assert.equal(events.filter(([name])=>name==="portal:error").length,0);
});
