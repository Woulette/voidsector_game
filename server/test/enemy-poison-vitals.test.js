import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getRepairBotConfig, validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPresenceManager } from "../src/players/presence.js";
import { createWorldStatusEffectManager } from "../src/world/statusEffects.js";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { createCombatServerEventSystem } from "../../src/game/systems/combatServerEvents.js";

function fixture({hp=400,damage=250,repairBot=false}={}){
  const profile = createDefaultProfile();
  if(repairBot){
    profile.activeShip="velox";
    profile.ownedShips.push("velox");
    profile.shipLoadouts.velox={lasers:[],generators:[],extras:["inv_repair_starter_2"]};
  }
  const player = {
    id:"poisoned",mapId:"3",statusEffects:{},
    state:{mapId:"3",shipId:profile.activeShip,x:0,y:0,hp,maxHp:repairBot?15000:5000,
      shield:0,maxShield:0,updatedAt:1000,repairBotActive:repairBot}
  };
  const players = new Map([[player.id,player]]);
  const events = [];
  const saves = [];
  const io = {to:()=>({emit:(name,payload)=>events.push({name,payload})})};
  const presence = createPresenceManager({io,players,config:{},emitPlayers(){}});
  const status = createWorldStatusEffectManager({io,players,presence,profileManager:{
    applyQuestAction:()=>({updates:[],failed:[]}),saveWorldSession:payload=>saves.push(payload)
  }});
  const enemy = {id:"enemy",onHitEffect:{type:"poison",damage,interval:2,duration:10}};
  const validate = (payload,now)=>{
    const result = validatePlayerState({player,profile,payload,groups:new Map(),now});
    player.state=result.state;
    return result;
  };
  return {player,profile,events,saves,io,presence,status,enemy,validate};
}

test("delayed client snapshots cannot restore low hull after parasite or Pondeuse poison", ()=>{
  for(const damage of [50,250,350]){
    for(const repairBot of [false,true]){
      const f = fixture({damage,repairBot});
      f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
      const oldSnapshot = {...f.player.state};
      f.status.updateStatusEffects(3000);
      const expected = 400-damage;
      assert.equal(f.player.state.hp,expected);
      assert.equal(f.player.state.repairBotActive,false);
      for(let i=1;i<=6;i++){
        const validated=f.validate(oldSnapshot,3000+i*100);
        assert.ok(Math.abs(validated.state.hp-expected)<1e-8,`${damage} poison, repair=${repairBot}`);
        assert.equal(validated.corrected,true);
      }
    }
  }
});

test("the repair delay restarts with every poison tick and allows a real repair afterwards", ()=>{
  const f = fixture({hp:2000,damage:250,repairBot:true});
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  for(const now of [3000,5000,7000,9000]) f.status.updateStatusEffects(now);
  f.status.updateStatusEffects(11001);
  const hp=f.player.state.hp;
  assert.equal(f.player.statusEffects.poison,undefined);
  const repairAt=f.player.lastServerDamageAt+getRepairBotConfig(f.profile).delay*1000;
  assert.equal(f.validate({...f.player.state,hp:hp+150},repairAt-100).state.hp,hp);
  const healed=f.validate({...f.player.state,hp:hp+150},repairAt+100);
  assert.equal(healed.state.hp,hp+150);
});

test("ten-second poison delivers five two-second ticks, including expiry and delayed server frames", ()=>{
  for(const frames of [[3000,5000,7000,9000,11000],[11001]]){
    const f=fixture({hp:2000});
    f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
    for(const now of frames) f.status.updateStatusEffects(now);
    assert.equal(f.player.state.hp,750);
    assert.equal(f.events.filter(event=>event.name==="player:damage").length,5);
    assert.equal(f.player.statusEffects.poison,undefined);
    f.status.updateStatusEffects(15000);
    assert.equal(f.player.state.hp,750);
  }
});

test("an expired strong poison does not increase a later parasite poison", ()=>{
  const f=fixture({hp:2000});
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  f.status.applyEnemyOnHitEffect({id:"parasite",onHitEffect:{type:"poison",damage:50,interval:2,duration:10}},f.player,11001);
  assert.equal(f.player.statusEffects.poison.damage,50);
  f.status.updateStatusEffects(13001);
  assert.equal(f.player.state.hp,1950);
});

test("local poison includes its final tick and catches up only within its duration", ()=>{
  for(const frames of [[2,2,2,2,2],[10.5]]){
    const state={player:{x:0,y:0,hp:2000},particles:[]};
    const system=createCombatStatusEffectSystem({getState:()=>state,updatePoisonStatus(){},pushDamageText(){},handlePlayerDeath(){}});
    system.applyPlayerPoison({type:"poison",damage:250,interval:2,duration:10});
    for(const dt of frames) system.updatePlayerPoison(dt);
    assert.equal(state.player.hp,750);
    assert.equal(state.player.poisonEffect,null);
    system.updatePlayerPoison(2);
    assert.equal(state.player.hp,750);
  }
});

test("poison bypasses shield and lethal ticks remain dead after stale client snapshots", ()=>{
  const f=fixture({hp:200});
  Object.assign(f.player.state,{shield:100,maxShield:100});
  const before={...f.player.state};
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  f.status.updateStatusEffects(3000);
  assert.equal(f.player.state.hp,0);
  assert.equal(f.player.state.shield,100);
  assert.equal(f.events.find(event=>event.name==="player:damage").payload.amount,200);
  assert.equal(f.saves.at(-1).force,true);
  assert.equal(f.validate(before,3250).state.hp,0);
});

test("refreshing poison keeps its scheduled tick and does not multiply simultaneous stacks", ()=>{
  const f=fixture({hp:2000});
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,2900);
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,2999);
  f.status.updateStatusEffects(3000);
  assert.equal(f.player.state.hp,1750);
  assert.equal(f.player.statusEffects.poison.nextTickAt,5000);
  assert.equal(f.events.filter(event=>event.name==="player:damage").length,1);
});

test("server poison notifications never cause a second local hull tick", ()=>{
  const f=fixture();
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  const state={player:{x:0,y:0,hp:400,maxHp:5000,shield:0,maxShield:0},particles:[],currentMap:{id:"3"}};
  const status=createCombatStatusEffectSystem({getState:()=>state,updatePoisonStatus(){},pushDamageText(){},handlePlayerDeath(){}});
  const effect=f.events.find(event=>event.name==="player:status-effect").payload;
  status.applyPlayerPoison({...effect,serverAuthoritative:true});
  status.updatePlayerPoison(2);
  assert.equal(state.player.hp,400);
  f.status.updateStatusEffects(3000);
  const multiplayer={playerDamageEvents:f.events.filter(event=>event.name==="player:damage").map(event=>event.payload)};
  const combat=createCombatServerEventSystem({multiplayer,getState:()=>state,
    markAuthoritativeDamageReceived(){},pushDamageText(){}});
  combat.applyDamageEvents();
  assert.equal(state.player.hp,150);
  status.updatePlayerPoison(2);
  assert.equal(state.player.hp,150);
  f.status.updateStatusEffects(5000);
  multiplayer.playerDamageEvents=f.events.filter(event=>event.name==="player:damage").slice(-1).map(event=>event.payload);
  combat.applyDamageEvents();
  assert.equal(state.player.hp,0);
});

test("a delayed snapshot over real Socket.IO transport cannot heal a poison tick", {timeout:5000}, async t=>{
  const f=fixture({damage:50});
  const http=createServer();
  const server=new Server(http);
  let client;
  t.after(async()=>{client?.disconnect();await new Promise(resolve=>server.close(resolve));});
  http.listen(0,"127.0.0.1");
  await once(http,"listening");
  client=connect(`http://127.0.0.1:${http.address().port}`,{autoConnect:false,transports:["websocket"],reconnection:false});
  const connection=once(server,"connection");
  const connected=once(client,"connect");
  client.connect();
  const [socket]=await connection;
  await connected;
  socket.on("player:state",(payload,ack)=>ack(f.validate(payload,3250).state));
  f.status.applyEnemyOnHitEffect(f.enemy,f.player,1000);
  const stale={...f.player.state};
  f.status.updateStatusEffects(3000);
  const received=once(client,"player:damage");
  socket.emit("player:damage",f.events.find(event=>event.name==="player:damage").payload);
  const [damage]=await received;
  assert.equal(damage.hp,350);
  const corrected=await client.timeout(2000).emitWithAck("player:state",stale);
  assert.ok(Math.abs(corrected.hp-350)<1e-8);
  assert.ok(Math.abs(f.player.state.hp-350)<1e-8);
});
