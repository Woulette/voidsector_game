import assert from "node:assert/strict";
import test from "node:test";
import { portals as clientPortals, questCatalog } from "../../src/data/progression.js";
import { drawMapPortals } from "../../src/game/render/mapPortals.js";
import {
  installWorldSocketListeners,
  normalizePortalInstance
} from "../../src/multiplayer/worldSocketListeners.js";
import {
  SPACE_CASTER_FULL_POOL_WEIGHT,
  SPACE_CASTER_PORTAL_FRAGMENT_WEIGHT,
  getServerSpaceCasterFragmentChance,
  runServerSpaceCaster
} from "../src/economy/spaceCaster.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createGroupManager } from "../src/groups/groups.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import {
  AZURON_ENEMY_LEVEL,
  AZURON_LASER_ITEM_ID,
  AZURON_REPEAT_LASER_DROP_CHANCE,
  AZURON_TOTAL_WAVES,
  AZURON_WAVE_INTERVAL_MS,
  buildAzuronPortalWave,
  createAzuronWaveRuntime,
  grantAzuronLaserReward
} from "../src/portals/azuronPortal.js";
import {
  AZURON_PORTAL_ID,
  AZURON_PORTAL_NAME,
  AZURON_REQUIRED_FRAGMENTS,
  AZURON_REQUIRED_LEVEL,
  getServerPortalDefinition
} from "../src/portals/portalDefinitions.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { PORTAL_CONFIGS, PORTAL_DROP_RULES, WORLD_MAPS } from "../src/world/definitions.js";
import { rollPortalPieceDrop } from "../src/world/loot.js";

test("Azuron keeps the legacy blue id with its authoritative access and reward rules", ()=>{
  const portal = getServerPortalDefinition(AZURON_PORTAL_ID);
  assert.equal(portal.id, "blue");
  assert.equal(portal.name, AZURON_PORTAL_NAME);
  assert.equal(portal.requirement.level, AZURON_REQUIRED_LEVEL);
  assert.equal(portal.piecesRequired, AZURON_REQUIRED_FRAGMENTS);
  const clientPortal = clientPortals.find(entry=>entry.id === AZURON_PORTAL_ID);
  assert.equal(clientPortal?.img, "assets/portals/seuil_azuron.png?v=20260726-kharon1");
  assert.equal(clientPortal?.pieceImg, "assets/portal_pieces/fragment_azuron.png?v=20260726-kharon1");
  assert.equal(PORTAL_CONFIGS.blue.name, AZURON_PORTAL_NAME);
  assert.equal(PORTAL_CONFIGS.blue.totalWaves, AZURON_TOTAL_WAVES);
  assert.deepEqual(PORTAL_CONFIGS.blue.reward, {
    credits:1_000_000,
    xp:500_000,
    reputation:50_000,
    premium:10_000,
    ammoX4:10_000,
    ammoX6:0
  });
});

test("an account-owned prepared Azuron portal survives later group updates on the client", ()=>{
  const handlers = {};
  const socket = {on(event, handler){ handlers[event] = handler; }};
  const multiplayer = {
    group:null,
    preparedPortal:null,
    outgoingGroupInvites:[],
    portalStartEvents:[],
    portalCompleteEvents:[],
    rickyCinematicEvents:[],
    rickyHealEvents:[],
    npcDamageEvents:[],
    playerHealEvents:[],
    shipAbilityEvents:[],
    shipAbilityEffectEvents:[]
  };
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies(){},
    emitChange(){},
    toast(){}
  });

  handlers["portal:prepared"]({
    preparedPortal:{
      id:"prepared-blue",
      portalId:AZURON_PORTAL_ID,
      portal:{id:AZURON_PORTAL_ID, name:AZURON_PORTAL_NAME},
      mapId:"20",
      x:-3780,
      y:-2780
    }
  });
  handlers["group:update"]({
    id:"group-1",
    leaderId:"pilot",
    members:[{id:"pilot"}],
    preparedPortal:null
  });

  assert.equal(multiplayer.preparedPortal?.portalId, AZURON_PORTAL_ID);
  assert.equal(multiplayer.preparedPortal?.mapId, "20");

  multiplayer.preparedPortal = null;
  handlers["group:update"]({
    id:"legacy-group",
    leaderId:"pilot",
    members:[{id:"pilot"}],
    preparedPortal:{
      id:"prepared-blue",
      portalId:AZURON_PORTAL_ID,
      mapId:"20",
      x:-3780,
      y:-2780
    }
  });
  assert.equal(multiplayer.preparedPortal?.portalId, AZURON_PORTAL_ID);
});

test("Azuron fragments drop at 0.33 percent on each firm map 1 to 4 only", ()=>{
  const rule = PORTAL_DROP_RULES.find(entry=>entry.id === AZURON_PORTAL_ID);
  assert.equal(rule.dropChance, 0.0033);
  assert.deepEqual(rule.dropMapNumbers, [1, 2, 3, 4]);
  assert.equal(rule.img, "assets/portal_pieces/fragment_azuron.png?v=20260726-kharon1");

  const firmMaps = Object.values(WORLD_MAPS).filter(map=>map.firmId);
  for(const map of firmMaps){
    const mapNumber = Number(String(map.name).match(/-(\d{2})$/)?.[1] || 0);
    const drop = rollPortalPieceDrop(map.id, {random:()=>0.0033});
    if(mapNumber >= 1 && mapNumber <= 4) assert.equal(drop?.id, AZURON_PORTAL_ID, map.name);
    else assert.notEqual(drop?.id, AZURON_PORTAL_ID, map.name);
  }
  assert.notEqual(rollPortalPieceDrop("0", {random:()=>0.00330001})?.id, AZURON_PORTAL_ID);
  assert.notEqual(rollPortalPieceDrop("50", {random:()=>0})?.id, AZURON_PORTAL_ID);
});

test("all 30 Azuron waves stay level 10 and finish with five amber cuirasses", ()=>{
  for(let wave = 1; wave <= AZURON_TOTAL_WAVES; wave += 1){
    const enemies = buildAzuronPortalWave(wave, 1_000 + wave);
    assert.ok(enemies.length >= 1, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.level === AZURON_ENEMY_LEVEL), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.serverControlled && enemy.azuronEnemy), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.onHitEffect === null), true, `wave ${wave}`);
  }
  const finalWave = buildAzuronPortalWave(30, 2_000);
  assert.equal(finalWave.length, 5);
  assert.equal(finalWave.every(enemy=>enemy.kind === "cuirasse_ambre" && !enemy.azuronBoss), true);
});

test("Azuron launches five timed waves then waits for manual continuation after all survivors die", ()=>{
  const timers = [];
  let completed = 0;
  const runtime = createAzuronWaveRuntime({
    emitInstance(){},
    emitPortalComplete(){ completed += 1; },
    now:()=>10_000,
    setTimeoutFn(fn, delay){
      const timer = {fn, delay, fired:false, cancelled:false, unref(){}};
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn(timer){
      timer.cancelled = true;
    }
  });
  const instance = {
    id:"azuron-test",
    type:"portal",
    portal:{id:AZURON_PORTAL_ID, totalWaves:AZURON_TOTAL_WAVES},
    completed:false,
    enemies:[]
  };
  const group = {id:"group-azuron", instance};

  function fireNext(delay){
    const timer = timers.find(entry=>!entry.fired && !entry.cancelled && entry.delay === delay);
    assert.ok(timer, `timer ${delay} ms`);
    timer.fired = true;
    timer.fn();
  }

  assert.equal(runtime.start(group), true);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveState, "wave_countdown");
  assert.equal(instance.nextWaveAt, 25_000);
  assert.deepEqual(timers.slice(0, 4).map(timer=>timer.delay), [
    AZURON_WAVE_INTERVAL_MS,
    AZURON_WAVE_INTERVAL_MS * 2,
    AZURON_WAVE_INTERVAL_MS * 3,
    AZURON_WAVE_INTERVAL_MS * 4
  ]);

  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(instance.wave, 1);
  assert.equal(instance.enemies.some(enemy=>enemy.hp > 0), false);

  fireNext(15_000);
  fireNext(30_000);
  fireNext(45_000);
  fireNext(60_000);
  assert.equal(instance.wave, 5);
  assert.ok(instance.enemies.some(enemy=>enemy.hp > 0));

  for(const expectedBatchStart of [6, 11, 16, 21, 26]){
    instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
    runtime.handleEnemyDeath(group);
    assert.equal(instance.waveState, "batch_ready");
    assert.equal(instance.nextWaveAt, 0);
    assert.equal(instance.wave, expectedBatchStart - 1);
    assert.equal(runtime.continueBatch(group),true);
    assert.equal(instance.wave, expectedBatchStart);
    fireNext(15_000);
    fireNext(30_000);
    fireNext(45_000);
    fireNext(60_000);
    assert.equal(instance.wave, expectedBatchStart + 4);
    assert.equal(completed, 0);
  }

  assert.equal(instance.wave, 30);
  assert.equal(instance.waveState, "clear_batch");
  assert.equal(instance.nextWaveAt, 0);
  assert.equal(instance.enemies.filter(enemy=>enemy.hp > 0).length, 25);
  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(completed, 1);
});

test("public instance snapshots expose the Azuron wave countdown state", ()=>{
  const events = [];
  const snapshotNow = Date.now();
  const players = new Map([["pilot", {id:"pilot", name:"Pilot", connected:true, clientMode:"game"}]]);
  const manager = createGroupManager({
    io:{to:target=>({emit:(event, payload)=>events.push({target, event, payload})})},
    players,
    publicPlayer:player=>player,
    publicEnemy:enemy=>enemy,
    emitPlayers(){}
  });
  const group = {
    id:"group-public-azuron",
    leaderId:"pilot",
    members:["pilot"],
    instance:{
      id:"instance-public-azuron",
      type:"portal",
      portal:{id:AZURON_PORTAL_ID, name:AZURON_PORTAL_NAME, totalWaves:30},
      wave:3,
      nextWaveAt:snapshotNow + 10_000,
      waveState:"wave_countdown",
      enemies:[]
    }
  };
  manager.groups.set(group.id, group);

  manager.emitInstance(group);

  const payload = events.find(entry=>entry.event === "coop:enemies")?.payload;
  assert.equal(payload.wave, 3);
  assert.equal(payload.waveTotal, 30);
  assert.equal(payload.nextWaveAt, snapshotNow + 10_000);
  assert.ok(payload.nextWaveDelayMs > 9_000 && payload.nextWaveDelayMs <= 10_000);
  assert.equal(payload.waveState, "wave_countdown");
});

test("the MK-IV is guaranteed on first Azuron clear then uses a strict 25 percent roll", ()=>{
  const firstProfile = createDefaultProfile();
  const first = grantAzuronLaserReward(firstProfile, {
    random(){
      throw new Error("first clear must not roll");
    }
  });
  assert.deepEqual(first, {
    itemId:AZURON_LASER_ITEM_ID,
    awarded:true,
    firstClear:true,
    guaranteed:true,
    chance:1
  });
  assert.equal(getInventoryItemCount(firstProfile, AZURON_LASER_ITEM_ID), 1);

  const successProfile = createDefaultProfile();
  successProfile.completedPortals.blue = 1;
  const success = grantAzuronLaserReward(successProfile, {random:()=>AZURON_REPEAT_LASER_DROP_CHANCE - Number.EPSILON});
  assert.equal(success.awarded, true);
  assert.equal(success.firstClear, false);
  assert.equal(getInventoryItemCount(successProfile, AZURON_LASER_ITEM_ID), 1);

  const missProfile = createDefaultProfile();
  missProfile.completedPortals.blue = 1;
  const miss = grantAzuronLaserReward(missProfile, {random:()=>AZURON_REPEAT_LASER_DROP_CHANCE});
  assert.equal(miss.awarded, false);
  assert.equal(getInventoryItemCount(missProfile, AZURON_LASER_ITEM_ID), 0);
});

test("portal completion persists Azuron currency, ammo, completion marker and personal laser result", ()=>{
  const events = [];
  const player = {id:"azuron-player", name:"Pilote", account:{firmId:"astra"}};
  const players = new Map([[player.id, player]]);
  const group = {
    id:"azuron-group",
    members:[player.id],
    instance:{
      id:"azuron-instance-1",
      type:"portal",
      portal:{id:AZURON_PORTAL_ID, name:AZURON_PORTAL_NAME, totalWaves:AZURON_TOTAL_WAVES},
      wave:20,
      completed:false,
      enemies:[]
    }
  };
  const groups = new Map([[group.id, group]]);
  let profile = createDefaultProfile();
  const profileManager = {
    getProfileForPlayer(){
      return structuredClone(profile);
    },
    profileKeyForPlayer(){
      return "account:azuron";
    },
    updateProfileForPlayer({update}){
      const draft = structuredClone(profile);
      const result = update(draft);
      if(result?.ok === false) return result;
      profile = draft;
      return {...result, profile:structuredClone(profile)};
    }
  };
  const manager = createPortalInstanceManager({
    io:{
      sockets:{sockets:new Map()},
      to(target){
        return {
          emit(event, payload){
            events.push({target, event, payload});
          }
        };
      }
    },
    players,
    groups,
    profileManager,
    emitProfileSync(){},
    emitQuestClaims(){},
    createGroup(){ return group; },
    emitInstance(){},
    portalWaveTotal:30,
    random:()=>0.99
  });

  manager.emitPortalComplete(group);
  assert.equal(profile.player.premium, 10_000);
  assert.equal(profile.ammoInventory.ammo_x4, 10_000);
  assert.equal(profile.completedPortals.blue, 1);
  assert.equal(getInventoryItemCount(profile, AZURON_LASER_ITEM_ID), 1);
  const firstEvent = events.find(entry=>entry.event === "portal:complete");
  assert.equal(firstEvent.payload.rewardItemId, AZURON_LASER_ITEM_ID);
  assert.equal(firstEvent.payload.firstClear, true);
  assert.equal(firstEvent.payload.reward.itemDrop.chance, 1);

  events.length = 0;
  group.instance = {
    id:"azuron-instance-2",
    type:"portal",
    portal:{id:AZURON_PORTAL_ID, name:AZURON_PORTAL_NAME, totalWaves:AZURON_TOTAL_WAVES},
    wave:20,
    completed:false,
    enemies:[]
  };
  manager.emitPortalComplete(group);
  assert.equal(profile.player.premium, 20_000);
  assert.equal(profile.ammoInventory.ammo_x4, 20_000);
  assert.equal(profile.completedPortals.blue, 2);
  assert.equal(getInventoryItemCount(profile, AZURON_LASER_ITEM_ID), 1);
  const repeatEvent = events.find(entry=>entry.event === "portal:complete");
  assert.equal(repeatEvent.payload.rewardItemId, null);
  assert.equal(repeatEvent.payload.firstClear, false);
  assert.equal(repeatEvent.payload.reward.itemDrop.chance, 0.25);
  assert.equal(repeatEvent.payload.reward.itemDrop.awarded, false);
});

test("legacy quests no longer bypass the Azuron fragment hunt", ()=>{
  assert.equal(
    questCatalog.some(quest=>Math.max(0, Number(quest.rewards?.portalPieces?.blue || 0)) > 0),
    false
  );
});

test("Space Caster grants an eligible Azuron fragment with its existing weighted chance", ()=>{
  const profile = createDefaultProfile();
  profile.player.premium = 1_000;
  const expectedChance = SPACE_CASTER_PORTAL_FRAGMENT_WEIGHT / SPACE_CASTER_FULL_POOL_WEIGHT;
  assert.equal(getServerSpaceCasterFragmentChance(profile, AZURON_PORTAL_ID), expectedChance);

  const result = runServerSpaceCaster(profile, {
    portalId:AZURON_PORTAL_ID,
    count:1,
    random:()=>0
  });
  assert.equal(result.ok, true);
  assert.equal(Math.max(0, Number(profile.portalPieces?.blue || 0)), 1);
  assert.deepEqual(result.rewards, [{
    kind:"piece",
    id:AZURON_PORTAL_ID,
    label:"Fragment d’Azuron",
    amount:1,
    img:"assets/portal_pieces/fragment_azuron.png?v=20260726-kharon1"
  }]);

  const missProfile = createDefaultProfile();
  missProfile.player.premium = 1_000;
  const miss = runServerSpaceCaster(missProfile, {
    portalId:AZURON_PORTAL_ID,
    count:1,
    random:()=>expectedChance + Number.EPSILON
  });
  assert.equal(Math.max(0, Number(missProfile.portalPieces?.blue || 0)), 0);
  assert.equal(miss.rewards.some(reward=>reward.kind === "piece"), false);
  assert.equal(miss.rewards[0]?.id, "ammo_x2");
});

test("Space Caster stops Azuron fragments at 15 before unlock and restores its legacy replay pool after a clear", ()=>{
  const profile = createDefaultProfile();
  profile.player.premium = 20_000;
  const result = runServerSpaceCaster(profile, {
    portalId:AZURON_PORTAL_ID,
    count:100,
    random:()=>0
  });

  assert.equal(result.ok, true);
  assert.equal(profile.portalPieces.blue, AZURON_REQUIRED_FRAGMENTS);
  assert.equal(result.rewards.find(reward=>reward.kind === "piece")?.amount, AZURON_REQUIRED_FRAGMENTS);
  assert.equal(result.rewards.find(reward=>reward.id === "ammo_x2")?.amount, 85 * 250);
  assert.equal(getServerSpaceCasterFragmentChance(profile, AZURON_PORTAL_ID), 0);

  profile.completedPortals.blue = 1;
  const replay = runServerSpaceCaster(profile, {
    portalId:AZURON_PORTAL_ID,
    count:1,
    random:()=>0
  });
  assert.equal(replay.ok, true);
  assert.equal(profile.portalPieces.blue, AZURON_REQUIRED_FRAGMENTS + 1);
  assert.equal(
    getServerSpaceCasterFragmentChance(profile, AZURON_PORTAL_ID),
    SPACE_CASTER_PORTAL_FRAGMENT_WEIGHT / SPACE_CASTER_FULL_POOL_WEIGHT
  );
});

test("the client preserves the authoritative 30-wave countdown and clear-batch state", ()=>{
  const localBefore = Date.now();
  const countdown = normalizePortalInstance({
    instanceId:"azuron-client",
    portal:{id:AZURON_PORTAL_ID, totalWaves:AZURON_TOTAL_WAVES},
    wave:7,
    waveTotal:AZURON_TOTAL_WAVES,
    nextWaveAt:42_000,
    nextWaveDelayMs:10_000,
    waveState:"wave_countdown"
  });
  assert.equal(countdown.waveTotal, AZURON_TOTAL_WAVES);
  assert.ok(countdown.nextWaveAt >= localBefore + 10_000);
  assert.ok(countdown.nextWaveAt <= Date.now() + 10_000);
  assert.equal(countdown.waitingForClear, false);

  const clearBatch = normalizePortalInstance({...countdown, wave:8, waveState:"clear_batch", nextWaveAt:0});
  assert.equal(clearBatch.waveTotal, AZURON_TOTAL_WAVES);
  assert.equal(clearBatch.waitingForClear, true);
});

test("the prepared Azuron portal uses its dedicated world asset", ()=>{
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
    cache:{"assets/portals/seuil_azuron.png?v=20260726-kharon1":image},
    currentMap:{id:"0"},
    getMapPortals:()=>[{
      x:100,
      y:200,
      r:115,
      safeRadius:280,
      prepared:true,
      portalId:AZURON_PORTAL_ID,
      label:"LE SEUIL D’AZURON",
      displayLabel:"LE SEUIL D’AZURON"
    }]
  });
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0][0], image);
  assert.equal(drawn[0][3], drawn[0][4], "the prepared Azuron portal must stay circular in the world");
});
