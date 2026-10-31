import assert from "node:assert/strict";
import test from "node:test";
import { registerFirmHandlers } from "../src/socket/firmHandlers.js";

test("firm sync uses the active game context and fans one complete snapshot to every account socket", ()=>{
  const handlers = new Map();
  const emitted = [];
  const socket = {
    id:"launcher-socket",
    on:(eventName, listener)=>handlers.set(eventName, listener),
    emit:(eventName, payload)=>emitted.push({socketId:"launcher-socket", eventName, payload})
  };
  const launcher = {
    id:"launcher-socket",
    accountId:"account-1",
    clientMode:"launcher",
    connected:true
  };
  const game = {
    id:"game-socket",
    accountId:"account-1",
    clientMode:"game",
    connected:true
  };
  const snapshotPlayers = [];
  registerFirmHandlers(socket, {
    guard:()=>true,
    players:new Map([[launcher.id, launcher], [game.id, game]]),
    profileManager:{
      profileKeyForPlayer:player=>`account:${player.accountId}`,
      getProfileForPlayer:()=>({player:{firmId:"astra"}}),
      getProfileEntry:()=>null,
      findProfileEntryByPilotName:()=>null
    },
    firmWarManager:{
      snapshot(context = {}){
        snapshotPlayers.push(context.player?.id || "");
        return {
          firms:[],
          individualRanking:[],
          dailyQuests:[],
          personal:{key:context.playerKey || ""}
        };
      }
    },
    io:{
      to(socketId){
        return {
          emit(eventName, payload){
            emitted.push({socketId, eventName, payload});
          }
        };
      }
    }
  });
  emitted.length = 0;
  snapshotPlayers.length = 0;

  handlers.get("firm:sync")?.({includeShop:true});

  assert.deepEqual(snapshotPlayers, ["game-socket"]);
  assert.deepEqual(
    [...new Set(emitted.map(entry=>entry.socketId))].sort(),
    ["game-socket", "launcher-socket"]
  );
  assert.equal(emitted.length, 4);
  assert.equal(emitted.every(entry=>entry.payload.snapshotComplete === true), true);
  assert.equal(emitted.every(entry=>entry.payload.includesShop === true), true);
});
