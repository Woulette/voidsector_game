import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";

test("real Beta socket rejects an early or spoofed clock, unlocks at Paris 08:00 and confirms only after persistence", async t=>{
  t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-25T06:59:59.999Z")});
  const key = "account:beta-clock-socket";
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"completed"};
  profile.betaRewardState = {claimedDays:[1],lastClaimDate:"2026-10-24",lastClaimAt:Date.parse("2026-10-24T06:00:00Z")};
  const beforeNova = profile.player.premium;
  const profiles = new Map([[key,profile]]);
  let finishSave;
  let saves = 0;
  const actions = createProfileActions({
    profiles,
    getExistingProfile:()=>({key,profile:profiles.get(key)}),
    persist(){saves+=1;return new Promise(resolve=>{finishSave=resolve;});}
  });
  const http = createServer();
  const io = new Server(http);
  io.on("connection",socket=>{
    const player = {id:socket.id,accountId:"beta-clock-socket"};
    registerEconomyHandlers(socket,{
      guard:()=>true,players:new Map([[socket.id,player]]),profileManager:actions,
      emitProfileSync:(_player,saved)=>socket.emit("fixture:profile",saved)
    });
  });
  http.listen(0,"127.0.0.1");
  await once(http,"listening");
  const client = connect(`http://127.0.0.1:${http.address().port}`,{transports:["websocket"],reconnection:false});
  t.after(async ()=>{client.disconnect();await new Promise(resolve=>io.close(resolve));});
  await once(client,"connect");
  let confirmations = 0;
  client.on("beta:reward-claimed",()=>{confirmations+=1;});
  const early = once(client,"beta:reward-error");
  client.emit("beta:reward-claim",{at:Date.parse("2026-10-26T08:00:00Z"),day:25});
  await early;
  assert.equal(saves,0);
  assert.equal(profiles.get(key).player.premium,beforeNova);
  assert.deepEqual(profiles.get(key).betaRewardState.claimedDays,[1]);

  t.mock.timers.setTime(Date.parse("2026-10-25T07:00:00Z"));
  const confirmed = once(client,"beta:reward-claimed");
  const synced = once(client,"fixture:profile");
  client.emit("beta:reward-claim");
  // A second real request acts as an ordered round trip while the save is pending.
  const duplicate = once(client,"beta:reward-error");
  client.emit("beta:reward-claim");
  await duplicate;
  assert.equal(saves,1);
  assert.equal(confirmations,0,"success must not be sent before the save resolves");
  finishSave();
  const [payload] = await confirmed;
  const [saved] = await synced;
  assert.equal(payload.day,2);
  assert.equal(saved.player.premium,beforeNova+5000);
  assert.deepEqual(saved.betaRewardState.claimedDays,[1,2]);
  assert.equal(saved.betaRewardState.lastClaimDate,"2026-10-25");
  assert.equal(saved.betaRewardState.lastClaimAt,Date.now());
  assert.equal(confirmations,1);
});
