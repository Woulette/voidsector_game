import assert from "node:assert/strict";
import test from "node:test";
import { applyDronePermanentUpgrade, equipInventoryUid, findEquippedSlot, getDroneGeneratorStatMultiplier, getDroneLaserDamageMultiplier, unequipInventoryUid, unequipSlot } from "../src/economy/equipment.js";
import { ensureDroneSkinLoadout } from "../src/economy/droneSkins.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { preserveProtectedOwnership, sanitizeProfile } from "../src/players/profileSanitize.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createProfileManager } from "../src/players/profiles.js";
import { registerEquipmentHandlers } from "../src/socket/equipmentHandlers.js";

const SKIN = "drone_overdrive_chip";
function ready(count = 2){
  const p = createDefaultProfile();
  p.tutorial.status = "completed";
  p.ownedDroneCount = count;
  p.droneLoadout = Array(count).fill(null);
  p.droneSkinLoadout = Array(count).fill(null);
  p.completedPortals = {violet:1};
  p.inventoryItems.push({uid:"skin-a", itemId:SKIN}, {uid:"skin-b", itemId:SKIN}, {uid:"drone-laser", itemId:"laser_mk2"});
  return p;
}
function legacy(){
  const p = ready(10);
  delete p.droneSkinLoadout;
  delete p.droneSkinLoadoutVersion;
  p.dronePermanentUpgrades = {0:SKIN, 9:SKIN, 10:SKIN, invalid:SKIN, 2:"ancestral_drone_core"};
  return p;
}
function fixture(p, persist = ()=>{}){
  const profiles = new Map([["Pilot", p]]);
  return {profiles, actions:createProfileActions({profiles, persist, getExistingProfile:()=>({key:"Pilot",profile:profiles.get("Pilot")})}), player:{id:"pilot-socket",accountId:"pilot"}};
}

test("a separate skin slot equips, replaces, moves and removes the same UID while preserving the laser", ()=>{
  const p = ready();p.droneLoadout[0] = "drone-laser";
  assert.equal(equipInventoryUid(p,{type:"droneSkin",index:0,inventoryUid:"skin-a"}).ok,true);
  assert.deepEqual(p.droneLoadout,["drone-laser",null]);
  assert.deepEqual(findEquippedSlot(p,"skin-a"),{location:"drone",type:"droneSkin",index:0});
  assert.equal(p.inventoryItems.filter(i=>i.uid==="skin-a").length,1);
  assert.equal(equipInventoryUid(p,{type:"droneSkin",index:1,inventoryUid:"skin-a"}).ok,true);
  assert.deepEqual(p.droneSkinLoadout,[null,"skin-a"]);
  assert.equal(equipInventoryUid(p,{type:"droneSkin",index:1,inventoryUid:"skin-b"}).ok,true);
  assert.equal(findEquippedSlot(p,"skin-a"),null);
  assert.deepEqual(p.droneSkinLoadout,[null,"skin-b"]);
  assert.equal(unequipInventoryUid(p,"skin-b"),true);
  assert.deepEqual(p.droneSkinLoadout,[null,null]);assert.deepEqual(p.dronePermanentUpgrades,{});
  assert.equal(p.inventoryItems.filter(i=>i.itemId===SKIN).length,2);
  assert.deepEqual(p.droneLoadout,["drone-laser",null]);
});

test("legacy equipment:drone-upgrade semantics equip without consumption and a skin does not fit a weapon slot", ()=>{
  const p=ready();assert.equal(applyDronePermanentUpgrade(p,{index:0,inventoryUid:"skin-a"}).ok,true);
  assert.equal(p.inventoryItems.some(i=>i.uid==="skin-a"),true);
  assert.deepEqual(p.dronePermanentUpgrades,{0:SKIN});
  const before=structuredClone(p);
  assert.equal(equipInventoryUid(p,{type:"drone",index:0,inventoryUid:"skin-a"}).ok,false);
  assert.equal(equipInventoryUid(p,{type:"droneSkin",index:0,inventoryUid:"drone-laser"}).ok,false);
  assert.deepEqual(p,before);
});

test("malformed and unowned skin indices cannot redirect an equip or removal to drone zero", ()=>{
  for(const index of [-1,2,10,0.5,NaN,Infinity,null,false,"",{},"bad"]){
    const p=ready();equipInventoryUid(p,{type:"droneSkin",index:0,inventoryUid:"skin-a"});const before=structuredClone(p);
    assert.equal(equipInventoryUid(p,{type:"droneSkin",index,inventoryUid:"skin-b"}).ok,false,String(index));
    assert.equal(unequipSlot(p,{type:"droneSkin",index}).ok,false,String(index));
    assert.deepEqual(p,before);
  }
});

test("Vesper is required to equip or gain bonuses but losing it never prevents removing the owned skin", ()=>{
  const p=ready();p.completedPortals={};const before=structuredClone(p);
  assert.equal(equipInventoryUid(p,{type:"droneSkin",index:0,inventoryUid:"skin-a"}).ok,false);assert.deepEqual(p,before);
  p.completedPortals.violet=1;equipInventoryUid(p,{type:"droneSkin",index:0,inventoryUid:"skin-a"});
  assert.equal(getDroneLaserDamageMultiplier(p,0),1.5);assert.equal(getDroneGeneratorStatMultiplier(p,0,"bouclier"),1.5);assert.equal(getDroneGeneratorStatMultiplier(p,0,"regen"),1);
  p.completedPortals={};const locked=sanitizeProfile(p);
  assert.equal(locked.droneSkinLoadout[0],"skin-a");assert.equal(getDroneLaserDamageMultiplier(locked,0),1);
  assert.equal(unequipSlot(locked,{type:"droneSkin",index:0}).ok,true);
  assert.equal(findEquippedSlot(locked,"skin-a"),null);assert.equal(locked.inventoryItems.some(i=>i.uid==="skin-a"),true);
});

test("migration restores one distinct asset per consumed installation, independent of free stock and deterministic before saving", ()=>{
  const old=legacy();old.inventoryItems.push({uid:"inv_migrated_drone_skin_1",itemId:SKIN});
  const originalStock=old.inventoryItems.filter(i=>i.itemId===SKIN).length;
  const first=sanitizeProfile(old),second=sanitizeProfile(structuredClone(old));
  assert.deepEqual(first.droneSkinLoadout,second.droneSkinLoadout);
  assert.equal(first.droneSkinLoadout.length,10);
  assert.equal(first.inventoryItems.filter(i=>i.itemId===SKIN).length,originalStock+2);
  assert.equal(first.droneSkinLoadout[0],"inv_migrated_drone_skin_1_1");
  assert.equal(first.droneSkinLoadout[9],"inv_migrated_drone_skin_10");
  assert.equal(first.droneSkinLoadout.includes("skin-a"),false);
  const reloaded=sanitizeProfile(JSON.parse(JSON.stringify(first)));
  assert.deepEqual(reloaded.droneSkinLoadout,first.droneSkinLoadout);assert.deepEqual(reloaded.inventoryItems,first.inventoryItems);
  const uid=first.droneSkinLoadout[0];unequipSlot(first,{type:"droneSkin",index:0});
  first.dronePermanentUpgrades={0:SKIN,9:SKIN};
  const after=sanitizeProfile(first);assert.equal(after.droneSkinLoadout[0],null);assert.equal(after.inventoryItems.filter(i=>i.uid===uid).length,1);
  assert.equal(equipInventoryUid(after,{type:"droneSkin",index:2,inventoryUid:uid}).ok,true);
  assert.equal(sanitizeProfile(after).inventoryItems.filter(i=>i.itemId===SKIN).length,originalStock+2);
});

test("presence or version stamp prevents legacy regrant and mirror data alone never authorizes a bonus", ()=>{
  for(const mode of ["present","stamp"]){
    const p=legacy();if(mode==="present")p.droneSkinLoadout=[];else p.droneSkinLoadoutVersion=1;
    const stock=p.inventoryItems.length,result=sanitizeProfile(p);
    assert.equal(result.inventoryItems.length,stock);assert.deepEqual(result.dronePermanentUpgrades,{});
  }
  const p=ready();p.dronePermanentUpgrades={0:SKIN};
  assert.equal(getDroneLaserDamageMultiplier(p,0),1);assert.deepEqual(sanitizeProfile(p).dronePermanentUpgrades,{});
});

test("skin normalization rejects duplicate, missing and incompatible UIDs, while retaining historical slot ten", ()=>{
  const p=ready(10);p.droneSkinLoadout=["skin-a","skin-a","missing","drone-laser",null,null,null,null,null,"skin-b","skin-a"];
  const normalized=sanitizeProfile(p);
  assert.deepEqual(normalized.droneSkinLoadout,["skin-a",null,null,null,null,null,null,null,null,"skin-b"]);
  assert.deepEqual(normalized.dronePermanentUpgrades,{0:SKIN,9:SKIN});
  assert.equal(unequipSlot(normalized,{type:"droneSkin",index:9}).ok,true);
  assert.equal(normalized.inventoryItems.some(i=>i.uid==="skin-b"),true);
  p.ownedDroneCount=0;ensureDroneSkinLoadout(p);assert.deepEqual(p.droneSkinLoadout,[]);
});

test("protected ownership preserves even empty authoritative skin slots and a forged legacy mirror cannot grant stock", ()=>{
  const existing=ready(),incoming=structuredClone(existing);
  incoming.droneSkinLoadout=["skin-a","skin-b"];incoming.droneSkinLoadoutVersion=0;incoming.dronePermanentUpgrades={0:SKIN};
  preserveProtectedOwnership(incoming,existing);
  assert.deepEqual(incoming.droneSkinLoadout,[null,null]);assert.equal(incoming.droneSkinLoadoutVersion,1);
  assert.deepEqual(incoming.dronePermanentUpgrades,{});assert.deepEqual(sanitizeProfile(incoming).inventoryItems,existing.inventoryItems);
});

test("saveFromPayload ignores forged skin ownership and migration fields instead of granting an item", async()=>{
  const p=ready(),key="account:skin-save";let stored=structuredClone(p);
  const manager=createProfileManager({cleanName:String,logger:{warn(){}},loadProfileEntries:async clean=>[[key,clean(structuredClone(stored))]],persistProfileEntries:async rows=>{stored=structuredClone(rows[0][1]);}});
  await manager.load();const forged=structuredClone(p);forged.dronePermanentUpgrades={0:SKIN};delete forged.droneSkinLoadout;delete forged.droneSkinLoadoutVersion;forged.inventoryItems.push({uid:"forged",itemId:SKIN});
  const saved=manager.saveFromPayload({accountId:"skin-save",name:p.player.name},{profile:forged});if(saved?.persistence)await saved.persistence;
  const actual=manager.getProfileEntry(key).profile;
  assert.deepEqual(actual.droneSkinLoadout,[null,null]);assert.equal(actual.inventoryItems.some(i=>i.uid==="forged"),false);
  assert.equal(actual.inventoryItems.filter(i=>i.itemId===SKIN).length,2);
});

test("equipment persistence and reload preserve the exact skin UID, and failed storage rolls back equip and removal", async()=>{
  let reject=false,stored=null;const f=fixture(ready(),()=>{if(reject)return Promise.reject(new Error("skin storage unavailable"));stored=structuredClone(f.profiles.get("Pilot"));});
  const equipped=f.actions.applyEquipmentAction({player:f.player,action:{kind:"equip",type:"droneSkin",index:0,inventoryUid:"skin-a"}});await equipped.save;
  assert.equal(sanitizeProfile(stored).droneSkinLoadout[0],"skin-a");assert.equal(stored.inventoryItems.filter(i=>i.uid==="skin-a").length,1);
  reject=true;
  for(const action of [{kind:"unequip-slot",type:"droneSkin",index:0},{kind:"equip",type:"droneSkin",index:1,inventoryUid:"skin-a"}]){
    const before=structuredClone(f.profiles.get("Pilot")),failed=f.actions.applyEquipmentAction({player:f.player,action});assert.equal(failed.ok,true);await assert.rejects(failed.save,/skin storage/);assert.deepEqual(f.profiles.get("Pilot"),before);assert.equal(stored.droneSkinLoadout[0],"skin-a");
  }
});

test("socket skin equip waits for persistence and the legacy alias remains non-consuming", async()=>{
  let release;const f=fixture(ready(),()=>new Promise(resolve=>{release=resolve;}));
  const handlers=new Map(),emits=[],socket={id:f.player.id,on:(name,handler)=>handlers.set(name,handler),emit:(name,payload)=>emits.push({name,payload})};
  registerEquipmentHandlers(socket,{guard:()=>true,players:new Map([[socket.id,f.player]]),profileManager:f.actions,canChangeEquipmentAtFirmSpawn:()=>({ok:true}),finishEquipmentChangeAtFirmSpawn:(_p,_l,result,event)=>{emits.push({name:"equipment:updated",payload:event},{name:"profile:sync",payload:result.profile});}});
  for(const [event,payload] of [["equipment:equip",{type:"droneSkin",index:0,inventoryUid:"skin-a"}],["equipment:drone-upgrade",{index:1,inventoryUid:"skin-b"}]]){
    emits.length=0;const pending=handlers.get(event)(payload);assert.equal(emits.length,0);release();await pending;
    assert.deepEqual(emits.map(e=>e.name),["equipment:updated","profile:sync"]);assert.equal(emits[1].payload.inventoryItems.some(i=>i.uid===payload.inventoryUid),true);assert.equal(emits[1].payload.droneSkinLoadout[payload.index],payload.inventoryUid);
  }
});

test("socket storage failure reports an error without success, sync, consumption or an equipped skin", async()=>{
  const p=ready(),before=structuredClone(p),f=fixture(p,()=>Promise.reject(new Error("skin disk unavailable")));
  const handlers=new Map(),emits=[],socket={id:f.player.id,on:(name,handler)=>handlers.set(name,handler),emit:(name,payload)=>emits.push({name,payload})};
  registerEquipmentHandlers(socket,{guard:()=>true,players:new Map([[socket.id,f.player]]),profileManager:f.actions,canChangeEquipmentAtFirmSpawn:()=>({ok:true}),finishEquipmentChangeAtFirmSpawn:()=>assert.fail("A failed save must not publish an equipment acknowledgement")});
  await handlers.get("equipment:equip")({type:"droneSkin",index:0,inventoryUid:"skin-a"});
  assert.deepEqual(emits.map(e=>e.name),["equipment:error"]);
  assert.deepEqual(f.profiles.get("Pilot"),before);
});

test("migrated consumed installations survive real profile-manager save, removal and repeated reload without a second grant", async()=>{
  let stored=legacy(),saves=0;
  const make=()=>createProfileManager({cleanName:String,logger:{warn(){}},loadProfileEntries:async clean=>[["account:legacy-skin",clean(structuredClone(stored))]],persistProfileEntries:async rows=>{saves++;stored=structuredClone(rows[0][1]);}});
  const player={accountId:"legacy-skin",name:"Pilot"},first=make();await first.load();
  const migrated=first.getProfileEntry("account:legacy-skin").profile,uid=migrated.droneSkinLoadout[0],stock=migrated.inventoryItems.filter(i=>i.itemId===SKIN).length;
  const removed=first.applyEquipmentAction({player,action:{kind:"unequip-slot",type:"droneSkin",index:0}});await removed.save;
  assert.equal(saves,1);assert.equal(stored.droneSkinLoadoutVersion,1);assert.equal(stored.inventoryItems.some(i=>i.uid===uid),true);
  const second=make();await second.load();const restored=second.getProfileEntry("account:legacy-skin").profile;
  assert.equal(restored.droneSkinLoadout[0],null);assert.equal(restored.inventoryItems.filter(i=>i.itemId===SKIN).length,stock);
  const equipped=second.applyEquipmentAction({player,action:{kind:"equip",type:"droneSkin",index:2,inventoryUid:uid}});await equipped.save;
  const third=make();await third.load();const final=third.getProfileEntry("account:legacy-skin").profile;
  assert.equal(final.droneSkinLoadout[2],uid);assert.equal(final.inventoryItems.filter(i=>i.itemId===SKIN).length,stock);assert.equal(final.inventoryItems.filter(i=>i.uid===uid).length,1);
});
