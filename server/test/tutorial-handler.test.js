import assert from "node:assert/strict";
import test from "node:test";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

function fixture({withGame = true, gameAccountId = "pilot"} = {}){
  const handlers = new Map();
  const emitted = [];
  const socket = {id:"launcher",on:(name,handler)=>handlers.set(name,handler),emit:(name,payload)=>emitted.push({name,payload})};
  const launcher = {id:socket.id,accountId:"pilot",clientMode:"launcher",connected:true};
  const game = {id:"game",accountId:gameAccountId,clientMode:"game",connected:true,state:{mapId:"21",hp:100,maxHp:100}};
  const players = new Map([[launcher.id,launcher]]);
  if(withGame) players.set(game.id,game);
  const profile = createDefaultProfile();
  profile.player.firmId = "cyan";
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_reach_map_2",revision:5};
  registerPlayerHandlers(socket, {
    players, guard:()=>true, emitProfileSync(){},
    profileManager:{
      getProfileSnapshotForPlayer:()=>profile,
      updateProfileForPlayer({update}){ return {...update(profile),profile}; }
    }
  });
  return {profile,emitted,handlers};
}

test("launcher tutorial requests use only a live game socket belonging to the same account", async ()=>{
  const current = fixture();
  await current.handlers.get("tutorial:update")({kind:"advance",currentStep:"game_reach_map_2",revision:5});
  assert.equal(current.profile.tutorial.step,"game_hunt_yellow");
  assert.equal(current.profile.tutorial.revision,6);
  assert.equal(current.emitted.at(-1).name,"tutorial:updated");
  for(const options of [{withGame:false},{gameAccountId:"someone-else"}]){
    const blocked = fixture(options);
    await blocked.handlers.get("tutorial:update")({kind:"advance",currentStep:"game_reach_map_2",revision:5});
    assert.equal(blocked.profile.tutorial.step,"game_reach_map_2");
    assert.equal(blocked.emitted.at(-1).name,"tutorial:error");
    assert.equal(blocked.emitted.at(-1).payload.code,"TUTORIAL_OBJECTIVE_PENDING");
  }
});

test("the tutorial socket forwards revisions and cannot advance from malformed or repeated requests", async ()=>{
  const current = fixture();
  const handle = current.handlers.get("tutorial:update");
  await handle({kind:"advance",currentStep:"game_reach_map_2"});
  assert.equal(current.profile.tutorial.revision,5);
  assert.equal(current.emitted.at(-1).payload.code,"TUTORIAL_SYNC_REQUIRED");
  const action = {kind:"advance",currentStep:"game_reach_map_2",revision:5};
  await handle(action);
  await handle(action);
  assert.equal(current.profile.tutorial.step,"game_hunt_yellow");
  assert.equal(current.profile.tutorial.revision,6);
  assert.equal(current.emitted.at(-1).payload.recovered,true);
});
