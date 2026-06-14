import assert from "node:assert/strict";
import test from "node:test";
import { createPlayerLifecycleManager } from "../src/players/playerLifecycle.js";

function createFixture({state, profile, group = null} = {}){
  const events = [];
  const saves = [];
  const mapChanges = [];
  const player = {
    id:"player-1",
    name:"Pilote",
    mapId:String(state?.mapId || "0"),
    groupId:group?.id || null,
    state:{...state},
    connected:true
  };
  const players = new Map([[player.id, player]]);
  const groups = new Map(group ? [[group.id, group]] : []);
  let currentProfile = structuredClone(profile || {
    player:{firmId:"astra", premium:500}
  });
  const io = {
    sockets:{sockets:new Map([[player.id, {id:player.id}]])},
    to(id){
      return {
        emit(event, payload){
          events.push({id, event, payload});
        }
      };
    }
  };
  const manager = createPlayerLifecycleManager({
    io,
    players,
    groups,
    profileManager:{
      getProfileForPlayer(){
        return structuredClone(currentProfile);
      },
      updateProfileForPlayer({update}){
        const draft = structuredClone(currentProfile);
        const result = update(draft);
        if(!result?.ok) return result;
        currentProfile = draft;
        return {...result, profile:structuredClone(currentProfile)};
      },
      applyQuestAction(){
        return {ok:true, changed:false};
      },
      saveWorldSession(payload){
        saves.push(structuredClone(payload.state));
        return structuredClone(currentProfile);
      }
    },
    emitProfileSync(){},
    presence:{markCombat(){}},
    setPlayerMap(_socket, mapId){
      mapChanges.push(String(mapId));
    },
    logger:{warn(){}}
  });
  return {
    events,
    getProfile:()=>currentProfile,
    groups,
    manager,
    mapChanges,
    player,
    saves,
    socket:{id:player.id, emit:(event, payload)=>events.push({id:player.id, event, payload})}
  };
}

function worldState(overrides = {}){
  return {
    mapId:"0",
    x:0,
    y:0,
    hp:1000,
    maxHp:5000,
    shield:200,
    maxShield:500,
    shipId:"orion",
    ...overrides
  };
}

test("server radiation kills the player after 30 seconds outside the map", ()=>{
  const fixture = createFixture({state:worldState({x:5200})});

  fixture.manager.updatePlayerLifecycles(0.05, 1_000);
  assert.equal(fixture.player.state.hp, 1000);
  fixture.manager.updatePlayerLifecycles(0.05, 31_000);

  assert.equal(fixture.player.state.hp, 0);
  assert.equal(fixture.player.deathState.reason, "radiation");
  assert.equal(fixture.events.some(entry=>entry.event === "player:death"), true);
});

test("server rejects a forged respawn choice and charges NOVA for a portal respawn", ()=>{
  const fixture = createFixture({state:worldState({hp:0, x:1200, y:900})});
  fixture.manager.markPlayerDead(fixture.player);

  assert.equal(fixture.manager.respawnPlayer(fixture.socket, "forged-position"), false);
  assert.equal(fixture.player.state.hp, 0);

  assert.equal(fixture.manager.respawnPlayer(fixture.socket, "portal"), true);
  assert.equal(fixture.getProfile().player.premium, 400);
  assert.equal(fixture.player.state.x, 4300);
  assert.equal(fixture.player.state.y, -3300);
  assert.equal(fixture.player.state.hp, 1000);
  assert.equal(fixture.events.some(entry=>entry.event === "player:respawned"), true);
});

test("portal lives and forced abandonment are controlled by the server", ()=>{
  const group = {
    id:"group-1",
    members:["player-1"],
    instance:{
      type:"portal",
      portal:{id:"blue"},
      playerLives:{"player-1":3},
      abandonedMemberIds:[],
      enemies:[]
    }
  };
  const fixture = createFixture({
    group,
    state:worldState({mapId:"portal-blue", hp:0, x:100, y:200})
  });

  fixture.manager.markPlayerDead(fixture.player);
  assert.equal(group.instance.playerLives["player-1"], 2);
  fixture.manager.respawnPlayer(fixture.socket, "portal-resume");
  fixture.player.state.hp = 0;
  fixture.manager.markPlayerDead(fixture.player);
  fixture.manager.respawnPlayer(fixture.socket, "portal-resume");
  fixture.player.state.hp = 0;
  fixture.manager.markPlayerDead(fixture.player);

  assert.equal(group.instance.playerLives["player-1"], 0);
  assert.deepEqual(group.instance.abandonedMemberIds, ["player-1"]);
  assert.equal(fixture.player.state.mapId, "0");
  assert.equal(fixture.player.deathState, null);
  assert.equal(fixture.events.some(entry=>entry.event === "player:respawned" && entry.payload.portalAbandoned), true);
});
