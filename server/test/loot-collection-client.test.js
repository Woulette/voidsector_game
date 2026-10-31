import test from "node:test";
import assert from "node:assert/strict";
import {createCombatCargoSystem} from "../../src/game/systems/combatCargo.js";
import {getLootCollectionHoverPoint, LOOT_COLLECTION_DURATION_MS} from "../../src/shared/lootCollection.js";

function fixture(kind = "material"){
  let time = 10000;
  const commands = [], attempts = [], notices = [], toasts = [];
  const cargo = createCombatCargoSystem({
    rewards:{showLootNotice:value=>notices.push(value)},
    requestServerLootPickup:(id,phase,attemptId)=>{commands.push({id,phase});attempts.push(attemptId);return true;},
    showToast:(...args)=>toasts.push(args), particles:()=>[], now:()=>time
  });
  const node = cargo.spawnServerLootDrop({id:"loot-a",kind,rarity:"rare",name:"Ressource test",x:100,y:200,serverControlled:true,expiresAt:50000});
  const player = {...getLootCollectionHoverPoint(node),hp:100,vx:8,vy:3,enginePower:.2};
  return {cargo,node,player,commands,attempts,notices,toasts,advance:ms=>{time+=ms;cargo.updatePending(player);}};
}

test("all ground loot kinds approach close above the resource and complete the same 700ms beam",()=>{
  assert.ok(LOOT_COLLECTION_DURATION_MS <= 1000);
  for(const kind of ["material","item","portalPiece","questItem","ammo"]){
    const f = fixture(kind);
    const destination = f.cargo.setGroundMaterialDestination(f.node);
    assert.equal(destination.x, f.node.x);
    const height = f.node.y - destination.y;
    assert.ok(height >= 104 && height <= 120, "keep a visible beam while bringing the ship closer to the resource");
    f.cargo.updatePending(f.player);
    assert.deepEqual(f.commands,[{id:"loot-a",phase:"start"}]);
    assert.equal(f.cargo.isMovementLocked(),false);
    f.advance(350);
    assert.equal(f.node.suctionProgress,.5);
    assert.deepEqual([f.node.renderX,f.node.renderY,f.node.renderSize],[100,200,42], "the beam keeps its resource visible on the ground before dissolving it");
    assert.ok(f.node.suctionTargetY < f.node.renderY - 80, "the ship end must stay visibly above the resource");
    assert.deepEqual([f.node.x,f.node.y],[100,200]);
    assert.deepEqual([f.player.vx,f.player.vy,f.player.enginePower],[8,3,.2]);
    f.advance(349);
    assert.equal(f.commands.length,1);
    assert.equal(f.notices.length,0);
    assert.ok(f.node.renderSize > 0 && f.node.renderSize < 1, "the ground target dissolves only near completion");
    f.advance(1);
    assert.deepEqual(f.commands.at(-1),{id:"loot-a",phase:"finish"});
    assert.equal(f.cargo.getGroundMaterials().length,1,"a request cannot delete unconfirmed loot");
    assert.equal(f.notices.length,0);
    f.cargo.handleServerEvent("loot:picked",{id:"loot-a"});
    assert.equal(f.cargo.getGroundMaterials().length,0);
    assert.equal(f.notices.length,1);
    assert.equal(f.toasts[0][1].trustedHtml,true);
    f.cargo.handleServerEvent("loot:picked",{id:"loot-a"});
    assert.equal(f.notices.length,1,"duplicate acknowledgement does not duplicate the gain notice");
  }
});

test("moving before completion cancels without locking or consuming the item and allows a new attempt",()=>{
  const f=fixture("item");
  f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);f.advance(350);
  f.player.x += 30; f.advance(1);
  assert.deepEqual(f.commands.map(c=>c.phase),["start","cancel"]);
  assert.deepEqual([f.node.x,f.node.y,f.node.renderX,f.node.renderY],[100,200,null,null]);
  assert.equal(f.node.suctionActive,false);assert.equal(f.cargo.getGroundMaterials().length,1);
  Object.assign(f.player,getLootCollectionHoverPoint(f.node));f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);f.advance(700);
  assert.deepEqual(f.commands.map(c=>c.phase),["start","cancel","start","finish"]);
  assert.equal(f.notices.length,0);
});

test("the beam follows a visual network correction without moving the physical loot or player",()=>{
  const f=fixture();
  f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);
  Object.assign(f.player,{visualCorrectionOffsetX:4,visualCorrectionOffsetY:-6});
  f.advance(300);
  assert.equal(f.node.suctionTargetX,f.player.x+4);
  assert.equal(f.node.suctionTargetY,f.player.y-6+22);
  assert.deepEqual([f.node.x,f.node.y,f.node.renderX,f.node.renderY],[100,200,100,200]);
  assert.deepEqual({x:f.player.x,y:f.player.y},getLootCollectionHoverPoint(f.node));
});

test("manual navigation, server refusal, death and expiry restore the original drop",()=>{
  for(const reason of ["manual","error","cancelled","death","expiry"]){
    const f=fixture();f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);f.advance(200);
    if(reason==="manual")f.cargo.clearPending();
    if(reason==="error")f.cargo.handleServerEvent("loot:error",{id:f.node.uid});
    if(reason==="cancelled")f.cargo.handleServerEvent("loot:collection",{id:f.node.uid,status:"cancelled"});
    if(reason==="death"){f.player.isDead=true;f.advance(1);}
    if(reason==="expiry"){f.node.expiresAt=10001;f.cargo.tick();}
    assert.equal(f.node.suctionActive,false,reason);
    assert.equal(f.commands.some(c=>c.phase==="finish"),false,reason);
    assert.equal(f.notices.length,0,reason);
  }
});

test("cancellation of an older attempt cannot interrupt a different selected drop",()=>{
  const f=fixture();f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);
  const other=f.cargo.spawnServerLootDrop({id:"loot-b",kind:"item",x:100,y:200,serverControlled:true});
  f.cargo.setGroundMaterialDestination(other);f.cargo.updatePending(f.player);
  f.cargo.handleServerEvent("loot:collection",{id:"loot-a",status:"cancelled"});f.advance(700);
  assert.deepEqual(f.commands.at(-1),{id:"loot-b",phase:"finish"});
});

test("hovering at a map edge remains within the player's movement bounds",()=>{
  assert.deepEqual(getLootCollectionHoverPoint({x:0,y:-470},{width:1000,height:1000}),{x:0,y:-435});
});

test("late cancellation and error for the same item cannot stop a newer attempt",()=>{
  const f=fixture();
  f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);
  const previousAttempt=f.attempts[0];
  f.advance(100);f.cargo.clearPending();
  f.cargo.setGroundMaterialDestination(f.node);f.cargo.updatePending(f.player);
  const currentAttempt=f.attempts.at(-1);
  assert.notEqual(previousAttempt,currentAttempt);
  f.cargo.handleServerEvent("loot:collection",{id:f.node.uid,attemptId:previousAttempt,status:"cancelled"});
  f.cargo.handleServerEvent("loot:error",{id:f.node.uid,attemptId:previousAttempt});
  f.advance(700);
  assert.equal(f.node.suctionProgress,1);
  assert.equal(f.commands.at(-1).phase,"finish");
  assert.equal(f.attempts.at(-1),currentAttempt);
  assert.equal(f.cargo.getGroundMaterials().length,1);
  assert.equal(f.notices.length,0);
});
