import assert from "node:assert/strict";
import test from "node:test";
import { applyFriendlyKillPenalty, FRIENDLY_KILL_RESET_MS, getNextFriendlyKillPenalty, getReputationShopSurcharge, isReputationOutlaw } from "../../src/shared/reputation.js";
import { getShopCurrencyPrice } from "../../src/shared/shopPricing.js";
import { createPvpAggressionTracker } from "../src/combat/pvpDiscipline.js";
import { createPlayerPvpRewardManager } from "../src/combat/playerPvpRewards.js";
import { getPlayerPvpBlockReason } from "../src/combat/playerPvp.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileMutations } from "../src/players/profileMutations.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { normalizeProgressionPlayer, preserveProtectedProgression, spendCurrency } from "../src/players/progression.js";
import { getAmmoPurchase, getBoosterPurchase, getDroneFormationPurchase, getItemPurchase, getShipPurchase } from "../src/economy/shop.js";
import { createCombatRemoteTargetResolver } from "../../src/game/systems/combatRemoteTargets.js";
import { addFirmPvpKill, recordPvpRewardAttempt } from "../src/firms/firmPvp.js";
import { markFirmHitOwner } from "../src/firms/firmHitOwnership.js";

const START = Date.UTC(2026, 9, 23, 10);
const DAY = 86_400_000;

function profile(firm = "astra", reputation = 0){
  const result = createDefaultProfile();
  Object.assign(result.player, {firmId:firm, firmSelected:true, name:"Test", level:50, reputation, credits:1e9, premium:1e9});
  result.tutorial.status = "completed";
  return result;
}

function fixture({firm = "astra", reputation = 0, persist = ()=>{}} = {}){
  const attacker = {id:"a", accountId:"a", clientMode:"game", mapId:"0", state:{level:50}, combatLifeGeneration:0};
  const target = {id:"b", accountId:"b", clientMode:"game", mapId:"0", state:{level:50}, combatLifeGeneration:0};
  const keyFor = p=>`account:${p.accountId}`;
  const profiles = new Map([[keyFor(attacker),profile("astra",reputation)],[keyFor(target),profile(firm)]]);
  const getExistingProfile = p=>({key:keyFor(p),profile:profiles.get(keyFor(p))});
  const mutations = createProfileMutations({profiles,persist,profileKeyForPlayer:keyFor,getExistingProfile});
  const actions = createProfileActions({profiles,persist,getExistingProfile});
  const pm = {...mutations,...actions,profileKeyForPlayer:keyFor,getProfileForPlayer:p=>profiles.get(keyFor(p)),listProfileEntries:()=>[...profiles]};
  const events = [], firmKills = [], errors = [];
  const firmState={points:{},contributions:{}};
  const players=new Map([[attacker.id,attacker],[target.id,target]]);
  const io = {emit:(event,payload)=>events.push({event,payload}),to:id=>({emit:(event,payload)=>events.push({id,event,payload})})};
  const aggression = createPvpAggressionTracker({getPlayerKey:keyFor});
  const firmWarManager = {
    recordPlayerKill:input=>{firmKills.push(input);return addFirmPvpKill(firmState,{...input,now:START});},
    recordPvpRewardAttempt:input=>recordPvpRewardAttempt(firmState,{...input,now:START}),
    snapshot:()=>({personal:{},ranking:[],individualRanking:[]})
  };
  const rewards = createPlayerPvpRewardManager({io, players,
    profileManager:pm,firmWarManager,aggression,accountSocketsForPlayer:p=>[p],
    emitProfileSyncForPlayer:(p,value)=>events.push({event:"profile:sync",id:p.id,payload:value}),onError:e=>errors.push(e)});
  return {attacker,target,pm,profiles,players,events,firmKills,firmState,errors,aggression,rewards};
}

test("friendly penalties double and the seven-day inactivity deadline slides after each sanctioned kill", ()=>{
  const player = {reputation:0};
  assert.equal(applyFriendlyKillPenalty(player,START).penalty,1_000);
  assert.equal(applyFriendlyKillPenalty(player,START+DAY).penalty,2_000);
  assert.equal(applyFriendlyKillPenalty(player,START+2*DAY).penalty,4_000);
  assert.equal(applyFriendlyKillPenalty(player,START+2*DAY+FRIENDLY_KILL_RESET_MS-1).penalty,8_000);
  const last = player.friendlyFireLastKillAt;
  assert.equal(getNextFriendlyKillPenalty(player,last+FRIENDLY_KILL_RESET_MS-1),16_000);
  assert.equal(applyFriendlyKillPenalty(player,last+FRIENDLY_KILL_RESET_MS).penalty,1_000);
  assert.equal(player.reputation,-16_000,"expiration resets only the next penalty, never the debt");
});

test("every price and target boundary follows the requested debt tiers", ()=>{
  for(const [rep,percent,outlaw] of [[0,0,false],[-1,0,false],[-9999,0,false],[-10000,10,false],[-99999,10,false],[-100000,20,false],[-199999,20,false],[-200000,30,false],[-300000,40,false],[-399999,40,false],[-400000,50,false],[-499999,50,false],[-500000,50,true],[-9999999,50,true]]){
    const player = {reputation:rep};
    assert.equal(getReputationShopSurcharge(player),percent,String(rep));
    assert.equal(getShopCurrencyPrice("credits",10_000,player),10_000*(1+percent/100));
    assert.equal(isReputationOutlaw(player),outlaw);
  }
});

test("normalization, protected profile fields and XP gains preserve signed debt and its recurrence history", ()=>{
  const original = profile("astra",-10_000);
  applyFriendlyKillPenalty(original.player,START);
  const saved = sanitizeProfile(structuredClone(original));
  assert.equal(saved.player.reputation,-11_000);
  assert.equal(getNextFriendlyKillPenalty(saved.player,START+DAY),2_000);
  const merged = preserveProtectedProgression({incomingPlayer:{reputation:999999,friendlyFireLastPenalty:0,friendlyFireLastKillAt:0},existingPlayer:saved.player});
  assert.equal(merged.reputation,-11_000);
  assert.equal(merged.friendlyFireLastPenalty,1000);
  assert.equal(merged.friendlyFireLastKillAt,START);
  assert.equal(normalizeProgressionPlayer({reputation:NaN}).reputation,0);
  const f = fixture({reputation:-10_000});
  f.pm.applyReward({player:f.attacker,reward:{xp:1_000}});
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,-9_900);
});

test("first aggressor cannot turn retaliation into a self-defense exemption", ()=>{
  const f=fixture();
  f.aggression.recordShot(f.attacker,f.target,START);
  f.aggression.recordShot(f.target,f.attacker,START+100);
  assert.equal(f.aggression.classifyKill(f.target,f.attacker,f.pm.getProfileForPlayer(f.target),f.pm.getProfileForPlayer(f.attacker),START+200),"self-defense");
  assert.equal(f.aggression.classifyKill(f.attacker,f.target,f.pm.getProfileForPlayer(f.attacker),f.pm.getProfileForPlayer(f.target),START+200),"friendly");
});

test("retaliation belongs to the victim account, survives a socket replacement and ends with the combat", ()=>{
  const f=fixture();
  f.aggression.recordShot(f.attacker,f.target,START);
  const reconnected={...f.target,id:"b-new"};
  assert.equal(f.aggression.classifyKill(reconnected,f.attacker,f.pm.getProfileForPlayer(f.target),f.pm.getProfileForPlayer(f.attacker),START+1000),"self-defense");
  assert.equal(f.aggression.classifyKill(reconnected,f.attacker,f.pm.getProfileForPlayer(f.target),f.pm.getProfileForPlayer(f.attacker),START+15000),"friendly");
  f.aggression.recordShot(f.attacker,f.target,START+20000);
  f.aggression.finishLife(f.attacker);
  assert.equal(f.aggression.classifyKill(f.target,f.attacker,f.pm.getProfileForPlayer(f.target),f.pm.getProfileForPlayer(f.attacker),START+20001),"friendly");
});

test("friendly kills debit persistent reputation without increasing PvP kills or any firm objectives", async()=>{
  const f=fixture();
  for(const expected of [1000,2000,4000]){
    f.aggression.recordShot(f.attacker,f.target,START);
    const result=await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
    assert.equal(result.penalty,expected);
    f.target.combatLifeGeneration++;
  }
  const p=f.pm.getProfileForPlayer(f.attacker);
  assert.equal(p.player.reputation,-7000);
  assert.equal(p.player.totalPlayerKills,0);
  assert.equal(p.activityLog.filter(row=>row.type==="friendly_fire_penalty").length,3);
  assert.equal(f.firmKills.length,0);
  assert.equal(f.events.filter(e=>e.event==="player:reward").length,0);
});

test("one death can settle only once even when the callback is delivered twice", async()=>{
  const f=fixture();
  const results=await Promise.all([f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START}),f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START})]);
  assert.equal(results.filter(r=>r.duplicate).length,1);
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,-1000);
});

test("self-defense and an allied outlaw kill grant no rewards and do not restart the penalty week", async()=>{
  for(const type of ["defense","outlaw"]){
    const f=fixture();
    Object.assign(f.pm.getProfileForPlayer(f.attacker).player,{friendlyFireLastPenalty:4000,friendlyFireLastKillAt:START-DAY});
    if(type==="defense") f.aggression.recordShot(f.target,f.attacker,START);
    else f.pm.getProfileForPlayer(f.target).player.reputation=-500000;
    f.aggression.recordShot(f.attacker,f.target,START+1);
    const result=await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START+2});
    assert.equal(result.kind,type==="defense"?"self-defense":"outlaw");
    const player=f.pm.getProfileForPlayer(f.attacker).player;
    assert.equal(player.reputation,0);
    assert.equal(player.friendlyFireLastKillAt,START-DAY);
    assert.equal(player.friendlyFireLastPenalty,4000);
    assert.equal(player.totalPlayerKills,0);
    assert.equal(f.firmKills.length,0);
  }
});

test("a penalty is confirmed only after saving and failed persistence restores the prior debt and streak", async()=>{
  let release;
  const pending=new Promise(resolve=>release=resolve);
  const f=fixture({persist:()=>pending});
  const settled=f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
  assert.equal(f.events.length,0);
  release(); await settled;
  assert.equal(f.events.some(e=>e.event==="pvp:penalty"),true);
  const failed=fixture({persist:()=>Promise.reject(new Error("disk unavailable"))});
  assert.equal((await failed.rewards.settleKill({attacker:failed.attacker,target:failed.target,now:START})).ok,false);
  assert.equal(failed.pm.getProfileForPlayer(failed.attacker).player.reputation,0);
  assert.equal(failed.pm.getProfileForPlayer(failed.attacker).player.friendlyFireLastPenalty,0);
  assert.equal(failed.events.some(e=>e.event==="pvp:penalty"),false);
});

test("an enemy kill repays existing debt instead of wiping it, with the existing enemy reward", async()=>{
  const f=fixture({firm:"cyan",reputation:-200000});
  const result=await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
  assert.equal(result.kind,"enemy");
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,-150000);
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.totalPlayerKills,1);
  assert.equal(f.firmKills.length,1);
  assert.deepEqual(f.errors,[]);
});

test("the first five enemy kills pay fully, the next five pay five percent, and later kills give no rewards", async()=>{
  const f=fixture({firm:"cyan"});
  for(let index=0;index<12;index++){
    f.target.combatLifeGeneration=index;
    const result=await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
    assert.equal(result.reputation,index<5?50000:index<10?2500:undefined);
    assert.equal(result.kind,index<10?"enemy":"repeat-limit");
  }
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,262500);
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.totalPlayerKills,10);
  assert.equal(f.firmState.points.astra,525);
  assert.equal(f.events.filter(e=>e.event==="player:reward").length,10);
});

test("reconnecting either account cannot reset daily PvP counts; the next UTC day renews them", ()=>{
  const state={points:{},contributions:{}};
  const attempt=(now,targetKey="account:b")=>recordPvpRewardAttempt(state,{playerKey:"account:a",targetKey,now});
  for(let i=0;i<10;i++)attempt(START);
  assert.equal(attempt(START).exhausted,true);
  const persisted=structuredClone(state);
  assert.equal(recordPvpRewardAttempt(persisted,{playerKey:"account:a",targetKey:"account:b",now:START+1000}).points,0);
  assert.equal(attempt(START,"account:c").points,100);
  assert.equal(attempt(START+DAY).points,100);
});

test("rotating first-hit owners cannot bypass the finishing pilot's personal reputation limit", async()=>{
  const f=fixture({firm:"cyan"});
  const owners=[{id:"c",accountId:"c"},{id:"d",accountId:"d"}];
  for(const owner of owners){f.players.set(owner.id,owner);f.profiles.set(`account:${owner.accountId}`,profile());}
  for(let index=0;index<11;index++){
    f.target.combatLifeGeneration=index;
    markFirmHitOwner(f.target,owners[index%2],START);
    await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
  }
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,262500);
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.totalPlayerKills,10);
});

test("a launcher and game socket from one account consume only one PvP reward attempt per kill", async()=>{
  const f=fixture({firm:"cyan"});
  const launcher={...f.attacker,id:"launcher-a",clientMode:"launcher"};
  f.players.delete(f.attacker.id);f.players.set(launcher.id,launcher);f.players.set(f.attacker.id,f.attacker);
  for(let index=0;index<11;index++){
    f.target.combatLifeGeneration=index;
    markFirmHitOwner(f.target,f.attacker,START);
    await f.rewards.settleKill({attacker:f.attacker,target:f.target,now:START});
  }
  assert.equal(f.pm.getProfileForPlayer(f.attacker).player.reputation,262500);
  assert.equal(f.firmState.points.astra,525);
});

test("each shop product charges the displayed surcharge while ordinary currency spending remains unchanged", async()=>{
  const cases=[
    ["addAmmoPurchase",getAmmoPurchase("ammo_x1")],
    ["addItemPurchase",getItemPurchase("laser_mk1")],
    ["addBoosterPurchase",getBoosterPurchase("booster_s1_damage")],
    ["addShipPurchase",getShipPurchase("velox")],
    ["addDroneFormationPurchase",getDroneFormationPurchase("tir")]
  ];
  for(const [method,purchase] of cases){
    assert.ok(purchase,method);
    const f=fixture({reputation:-400000});
    const before=f.pm.getProfileForPlayer(f.attacker).player;
    const field=purchase.priceType==="premium"?"premium":"credits";
    const balance=before[field];
    const result=f.pm[method]({player:f.attacker,purchase});
    assert.equal(result.ok,true,method+": "+result.reason); await result.save;
    const expected=getShopCurrencyPrice(purchase.priceType,purchase.totalPrice,before);
    assert.equal(result.cost,expected,method);
    assert.equal(result.profile.player[field],balance-expected,method);
    assert.equal(result.profile.player.reputation,-400000,method);
  }
  const plain=spendCurrency(profile("astra",-400000).player,"credits",1000);
  assert.equal(plain.cost,1000,"craft, refinery and other currency operations are not shops");
});

test("a negative reputation drone quote is authoritative and stale pre-penalty prices are refused", async()=>{
  const f=fixture({reputation:-400000});
  assert.equal(f.pm.addDronePurchase({player:f.attacker,expectedPrice:200000}).ok,false);
  const result=f.pm.addDronePurchase({player:f.attacker,expectedPrice:300000});
  assert.equal(result.ok,true); await result.save;
  assert.equal(result.cost,300000);
  assert.equal(result.profile.ownedDroneCount,1);
});

test("Premium discount and the reputation surcharge combine consistently", ()=>{
  const player=profile("astra",-400000).player;
  player.premiumUntil=Date.now()+DAY;
  assert.equal(getShopCurrencyPrice("premium",1000,player),1425);
  assert.equal(getShopCurrencyPrice("credits",1000,player),1500);
});

test("outlaws remain attackable after Ascension and may retaliate, including below level ten", ()=>{
  assert.equal(getPlayerPvpBlockReason({sameGroup:true,targetOutlaw:true,attackerLevel:20,targetLevel:20}),"");
  assert.equal(getPlayerPvpBlockReason({targetOutlaw:true,attackerLevel:9,targetLevel:1}),"");
  assert.equal(getPlayerPvpBlockReason({selfDefense:true,attackerLevel:1,targetLevel:9}),"");
  assert.notEqual(getPlayerPvpBlockReason({attackerLevel:1,targetLevel:9}),"");
  const resolver=createCombatRemoteTargetResolver({store:{state:{player:{firmId:"astra",level:50}}},multiplayer:{group:{members:[{id:"b"}]}},getCurrentMap:()=>({id:"0"})});
  const target=resolver.buildRemotePlayerTarget({id:"b",firmId:"astra",outlaw:true,state:{level:50}});
  assert.equal(target.canAttack,true); assert.equal(target.hostile,true); assert.equal(target.outlaw,true);
  const lowLevelStore={state:{player:{firmId:"astra",level:1}}};
  const lowLevelResolver=createCombatRemoteTargetResolver({store:lowLevelStore,multiplayer:{pvpDefenseRights:new Map([["b",Date.now()+10000]])}});
  assert.equal(lowLevelResolver.buildRemotePlayerTarget({id:"b",firmId:"astra",state:{level:5}}).canAttack,true);
});
