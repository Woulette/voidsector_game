import assert from "node:assert/strict";
import test from "node:test";
import { createCombatServerEventSystem } from "../../src/game/systems/combatServerEvents.js";

function createSystem({
  multiplayer,
  state,
  damagePlayer = ()=>{},
  applyPlayerPoison = ()=>{},
  applyPlayerSlow = ()=>{},
  pushDamageText = ()=>{},
  markAuthoritativeDamageReceived
}){
  return createCombatServerEventSystem({
    multiplayer,
    getState:()=>state,
    setState:patch=>Object.assign(state, patch),
    cargo:{clear(){}, spawnPortalPieceDrop(){}, spawnServerLootDrop(){}},
    beams:{clear(){}, add(){}, getBeams(){ return []; }},
    rewards:{showLootNotice(){}},
    panels:{closeSpawnPanel(){}},
    damagePlayer,
    applyPlayerPoison,
    applyPlayerSlow,
    clearPoison(){},
    clearSlow(){},
    pushDamageText,
    spawnPortalExit(){},
    showToast(){},
    updateHud(){},
    updateLootPopup(){},
    portalStartingLives:3,
    markAuthoritativeDamageReceived
  });
}

test("server player damage events coalesce authoritative application and aggregate frame text", ()=>{
  const damageCalls = [];
  const damageMarks = [];
  const texts = [];
  const state = {
    player:{x:100, y:200, hp:100, maxHp:100, shield:0, maxShield:0},
    currentMap:{id:"0"}
  };
  const multiplayer = {
    playerId:"player-1",
    playerDamageEvents:[
      {mapId:"0", amount:12, hp:88, maxHp:100, shield:0, maxShield:0, at:Date.now()},
      {mapId:"0", amount:8, hp:80, maxHp:100, shield:0, maxShield:0, at:Date.now()},
      {mapId:"0", amount:5, hp:75, maxHp:100, shield:0, maxShield:0, damageType:"poison", at:Date.now()}
    ]
  };
  const system = createSystem({
    multiplayer,
    state,
    damagePlayer:(amount, options)=>{
      damageCalls.push({amount, options});
    },
    markAuthoritativeDamageReceived:event=>damageMarks.push(event),
    pushDamageText:text=>texts.push(text)
  });

  system.applyDamageEvents();

  assert.equal(damageCalls.length, 0);
  assert.equal(damageMarks.length, 1);
  assert.equal(damageMarks[0].amount, 25);
  assert.equal(damageMarks[0].normalDamage, 20);
  assert.equal(damageMarks[0].poisonDamage, 5);
  assert.equal(state.player.hp, 75);
  assert.equal(multiplayer.playerDamageEvents.length, 0);
  assert.equal(texts.length, 2);
  assert.equal(texts[0].value, 20);
  assert.equal(texts[1].value, "-5");
});

test("stale server player damage refreshes vitals without replaying frame effects", ()=>{
  const damageCalls = [];
  const texts = [];
  const now = Date.now();
  const state = {
    player:{x:100, y:200, hp:100, maxHp:100, shield:50, maxShield:50},
    currentMap:{id:"0"}
  };
  const multiplayer = {
    playerId:"player-1",
    playerDamageEvents:[
      {mapId:"0", amount:25, hp:75, maxHp:100, shield:40, maxShield:50, at:now - 4000},
      {mapId:"0", amount:15, hp:60, maxHp:100, shield:35, maxShield:50, at:now - 3000}
    ]
  };
  const system = createSystem({
    multiplayer,
    state,
    damagePlayer:(amount, options)=>damageCalls.push({amount, options}),
    pushDamageText:text=>texts.push(text)
  });

  system.applyDamageEvents();

  assert.equal(damageCalls.length, 0);
  assert.equal(texts.length, 0);
  assert.equal(state.player.hp, 60);
  assert.equal(state.player.shield, 35);
  assert.equal(multiplayer.playerDamageEvents.length, 0);
});

test("status effect events only apply the latest state per type in a frame", ()=>{
  const poisonCalls = [];
  const slowCalls = [];
  const state = {
    player:{x:0, y:0, hp:100, maxHp:100},
    currentMap:{id:"0"},
    particles:[],
    enemies:[],
    bullets:[],
    damageTexts:[],
    impactEffects:[]
  };
  const multiplayer = {
    playerId:"player-1",
    playerStatusEffectEvents:[
      {type:"poison", active:true, damage:2, remaining:4},
      {type:"poison", active:true, damage:8, remaining:9},
      {type:"slow", active:true, amount:12, remaining:5},
      {type:"slow", active:true, amount:18, remaining:7}
    ],
    enemyAttackEvents:[],
    playerDamageEvents:[],
    playerDeathEvents:[],
    playerRespawnEvents:[],
    playerRadiationEvents:[],
    playerRewardEvents:[],
    playerHealEvents:[],
    playerStatusEffectEvents:[],
    combatEvents:[],
    lootDropEvents:[],
    questEvents:[],
    questProgressEvents:[],
    questFailureEvents:[],
    npcDamageEvents:[],
    shipAbilityEvents:[],
    shipAbilityEffectEvents:[],
    portalStartEvents:[],
    portalCompleteEvents:[],
    portgunEvents:[],
    rickyCinematicEvents:[]
  };
  multiplayer.playerStatusEffectEvents = [
    {type:"poison", active:true, damage:2, remaining:4},
    {type:"poison", active:true, damage:8, remaining:9},
    {type:"slow", active:true, amount:12, remaining:5},
    {type:"slow", active:true, amount:18, remaining:7}
  ];
  const system = createSystem({
    multiplayer,
    state,
    applyPlayerPoison:event=>poisonCalls.push(event),
    applyPlayerSlow:event=>slowCalls.push(event)
  });

  system.applyAll();

  assert.equal(poisonCalls.length, 1);
  assert.equal(poisonCalls[0].damage, 8);
  assert.equal(poisonCalls[0].serverAuthoritative, true);
  assert.equal(slowCalls.length, 1);
  assert.equal(slowCalls[0].amount, 18);
  assert.equal(multiplayer.playerStatusEffectEvents.length, 0);
});

test("enemy attack visuals are capped per frame while preserving attack animation state", ()=>{
  const enemies = Array.from({length:30}, (_, index)=>({
    id:`enemy-${index}`,
    x:index * 10,
    y:0,
    color:"rgba(248,113,113,.95)",
    particle:"rgba(252,165,165,.75)"
  }));
  const state = {
    player:{x:400, y:0, hp:100, maxHp:100},
    currentMap:{id:"0"},
    enemies,
    bullets:[],
    particles:[],
    damageTexts:[],
    impactEffects:[],
    store:{state:{}}
  };
  const multiplayer = {
    playerId:"player-1",
    enemyAttackEvents:Array.from({length:30}, (_, index)=>({
      mapId:"0",
      targetId:"player-1",
      enemyId:`enemy-${index}`,
      fromX:index * 10,
      fromY:0,
      toX:400,
      toY:0,
      travelTime:.2
    }))
  };
  const system = createSystem({multiplayer, state});

  system.applyAll();

  assert.equal(multiplayer.enemyAttackEvents.length, 0);
  assert.equal(state.bullets.filter(bullet=>bullet.owner === "serverEnemy").length, 12);
  assert.equal(state.particles.filter(particle=>particle.kind === "enemyAttack").length, 12);
  assert.equal(enemies.filter(enemy=>Number(enemy.attackT || 0) > 0).length, 30);
});
