import assert from "node:assert/strict";
import test from "node:test";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";
import { createCombatPortalNavigationSystem } from "../../src/game/systems/combatPortalNavigation.js";
import { getAzuronStageGates } from "../../src/data/azuronPortal.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";

test("Azuron commands require an authenticated ready profile and a known gate action",()=>{
  const events=[];
  const multiplayer={connected:true,socket:{emit:(...args)=>events.push(args)},auth:{account:{id:"pilot"},profileReady:false}};
  const commands=createSocketCommands({multiplayer});
  assert.equal(commands.interactAzuronPortal("continue"),false);
  multiplayer.auth.profileReady=true;
  assert.equal(commands.interactAzuronPortal("forged"),false);
  assert.equal(commands.interactAzuronPortal("continue"),true);
  assert.equal(commands.interactAzuronPortal("exit"),true);
  assert.deepEqual(events,[["portal:azuron-interact",{action:"continue"}],["portal:azuron-interact",{action:"exit"}]]);
});

test("the normal portal key charges the continue gate and delegates exit timing to the server",()=>{
  for(const gate of getAzuronStageGates({nextWave:6})){
    const calls=[],state={gameMode:"portal",portalCompleted:false,currentMap:{id:"portal-blue"},
      player:{x:gate.x,y:gate.y,hp:1000},teleportLock:0};
    const system=createCombatPortalNavigationSystem({mapList:[],getState:()=>state,
      setState:patch=>Object.assign(state,patch),actions:{},getMapPortals:()=>[gate],
      findMapPortalAt:()=>gate,interactAzuronPortal:action=>calls.push(action),
      loadMap:()=>assert.fail("A server-confirmed gate must not transfer locally")});
    assert.equal(system.tryUseMapPortal(),true);
    if(gate.action === "continue"){
      assert.deepEqual(calls,[]);assert.equal(state.portalTransition.duration,4);
      assert.equal(state.portalTransition.azuronAction,"continue");
      assert.equal(system.completeDungeonTransition({...state.portalTransition,elapsed:4}),true);
    }
    assert.deepEqual(calls,[gate.action]);
    assert.ok(state.teleportLock>0);
    system.tryUseMapPortal();assert.equal(calls.length,1);
  }
});

test("a paused packet clears the old personal arena and forwards the authoritative return state",()=>{
  const handlers=new Map(),changes=[],replacements=[],messages=[];
  const multiplayer={portalInstance:{portal:{id:"blue"}},portalObjective:{kind:"azuron"},
    portalStartEvents:[{}],portalCompleteEvents:[{}],coopInstanceId:"old",coopSpawn:{x:0,y:0},portalBeacons:[{}]};
  installWorldSocketListeners({socket:{on:(name,fn)=>handlers.set(name,fn)},multiplayer,
    replaceServerEnemies:(...args)=>replacements.push(args),emitChange:(...args)=>changes.push(args),toast:message=>messages.push(message)});
  const packet={portal:{id:"blue"},state:{mapId:"0",x:4300,y:-3300,hp:5678,shield:42},nextWave:6};
  handlers.get("portal:paused")(packet);
  assert.equal(multiplayer.portalInstance,null);assert.equal(multiplayer.portalObjective,null);
  assert.equal(multiplayer.coopInstanceId,null);assert.deepEqual(multiplayer.portalCompleteEvents,[]);
  assert.deepEqual(replacements,[[{enemies:[],full:true,portal:null},"coop"]]);
  assert.deepEqual(changes,[["portal:paused",packet]]);assert.match(messages[0],/vague 6/);
});

test("authoritative movement accepts the enlarged arena and background movement uses its real boundary",()=>{
  const previous={mapId:"portal-blue",shipId:"orion",x:3300,y:2000,hp:1000,maxHp:5000,shield:0,maxShield:0,
    speed:100,vx:0,vy:0,angle:0,updatedAt:1000};
  const player={id:"pilot",mapId:"portal-blue",groupId:"group",connected:true,clientPageHidden:true,
    lastClientStateAt:1000,state:previous};
  const groups=new Map([["group",{instance:{type:"portal",portal:{id:"blue"},joinedMemberIds:["pilot"],enemies:[]}}]]);
  const result=validatePlayerState({player,profile:createDefaultProfile(),groups,now:1100,
    payload:{...previous,x:3310,y:2000,moveTarget:{x:10000,y:10000}}});
  assert.equal(result.state.x,3310);assert.equal(result.state.y,2000);
  player.state={...previous,moveTarget:{x:10000,y:10000}};
  const activity=createPlayerActivityManager({io:{to:()=>({emit(){}})},players:new Map([[player.id,player]]),groups,
    profileManager:{saveWorldSession(){}},publicPlayer:entry=>({id:entry.id,state:entry.state})});
  activity.updatePlayerActivity(.1,1300);
  assert.deepEqual(player.state.moveTarget,{x:3835,y:2635});assert.ok(player.state.x>3300);
});
