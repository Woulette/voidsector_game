import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io } from "socket.io-client";
import { createPlatformAuthClient } from "../src/auth/platformAuthClient.js";
import { registerAuthHandlers } from "../src/socket/authHandlers.js";
import { createGameplayAccountGuard } from "../src/security/gameplayAccountGuard.js";

function memoryStorage(){
  const values = new Map();
  return {
    getItem:key=>values.get(key) ?? null,
    setItem:(key, value)=>values.set(key, String(value)),
    removeItem:key=>values.delete(key)
  };
}

test("multiplayer connection fallback and session recovery keep authentication authoritative", async t=>{
  const keys = ["window", "document", "localStorage", "sessionStorage", "__voidsectorMultiplayerState"];
  const previous = new Map(keys.map(key=>[key, globalThis[key]]));
  const handlers = new Map();
  let connectionOptions;
  const socket = {
    id:"reliability-client",
    connected:false,
    on(event, callback){ handlers.set(event, callback); return this; },
    emit(){},
    disconnect(){
      if(!this.connected) return;
      this.connected = false;
      handlers.get("disconnect")?.("io client disconnect");
    }
  };
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
  globalThis.document = {cookie:"", querySelector:()=>null};
  globalThis.window = Object.assign(new EventTarget(), {
    location:{origin:"http://localhost:8765", hostname:"localhost", protocol:"http:", search:""},
    io(_url, options){ connectionOptions = options; return socket; }
  });
  delete globalThis.__voidsectorMultiplayerState;
  const client = await import("../../src/multiplayer/client.js");
  t.after(()=>{
    client.disconnectMultiplayer();
    for(const [key, value] of previous){
      if(value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  await client.connectMultiplayer();
  socket.connected = true;
  handlers.get("connect")();

  await t.test("the actual client options connect when only HTTP polling is available", async ()=>{
    const httpServer = http.createServer();
    const server = new Server(httpServer, {transports:["polling"], allowUpgrades:false});
    await new Promise(resolve=>httpServer.listen(0, "127.0.0.1", resolve));
    try{
      const transport = await new Promise((resolve, reject)=>{
        const live = io(`http://127.0.0.1:${httpServer.address().port}`, {
          ...connectionOptions, forceNew:true, reconnection:false, timeout:2000
        });
        live.once("connect", ()=>{
          const name = live.io.engine.transport.name;
          live.disconnect();
          resolve(name);
        });
        live.once("connect_error", error=>{ live.disconnect(); reject(error); });
      });
      assert.equal(transport, "polling");
    }finally{
      await new Promise(resolve=>server.close(resolve));
    }
  });

  const cases = [
    {name:"network outage", failure:new Error("fetch failed"), invalid:false},
    {name:"identity provider timeout", failure:new Error("Le service d'authentification met trop de temps a repondre."), invalid:false},
    {name:"upstream 503 with a misleading session message", status:503, message:"Session expiree.", invalid:false},
    {name:"malformed successful provider response", status:200, malformed:true, invalid:false},
    {name:"confirmed expired session", status:400, message:"Session expiree.", invalid:true},
    {name:"confirmed revoked token", status:401, message:"Unauthorized", invalid:true}
  ];
  for(const scenario of cases){
    await t.test(scenario.name, async ()=>{
      const serverHandlers = new Map();
      const emitted = [];
      const serverSocket = {
        id:"unverified-player",
        on:(event, callback)=>serverHandlers.set(event, callback),
        emit:(event, payload)=>emitted.push({event, payload})
      };
      const players = new Map([[serverSocket.id, {id:serverSocket.id, accountId:null}]]);
      let attachments = 0;
      const provider = createPlatformAuthClient({
        baseUrl:"https://identity.example.test",
        fetchImpl:async()=>{
          if(scenario.failure) throw scenario.failure;
          return {
            status:scenario.status,
            ok:scenario.status < 400,
            json:async()=>scenario.malformed ? {ok:true} : {ok:false, message:scenario.message}
          };
        }
      });
      registerAuthHandlers(serverSocket, {
        players, guard:()=>true, authProvider:provider,
        attachOrResumeAccountSocket:()=>{ attachments += 1; },
        logger:{error(){}, warn(){}}
      });
      const token = "test-session-token";
      localStorage.setItem("voidsector-auth-token", token);
      Object.assign(client.multiplayer.auth, {token, account:{id:"cached-account"}, profileReady:true});
      await serverHandlers.get("auth:session")({token});
      const failure = emitted.find(event=>event.event === "auth:error");
      assert.ok(failure);
      handlers.get("auth:error")(failure.payload);
      assert.equal(client.multiplayer.auth.profileReady, false);
      assert.equal(attachments, 0);
      assert.equal(createGameplayAccountGuard({players})(serverSocket, "combat:fire"), false);
      assert.equal(client.multiplayer.auth.token, scenario.invalid ? "" : token);
      assert.equal(localStorage.getItem("voidsector-auth-token"), scenario.invalid ? null : token);
      assert.equal(failure.payload.retryable, !scenario.invalid);
    });
  }

  await t.test("AFK disconnect keeps the remembered account token", ()=>{
    const token = "afk-session-token";
    localStorage.setItem("voidsector-auth-token", token);
    client.multiplayer.auth.token = token;
    handlers.get("session:afk-disconnect")({reason:"inactivity"});
    assert.equal(client.multiplayer.connected, false);
    assert.equal(client.getLatestAuthToken(), token);
    assert.equal(localStorage.getItem("voidsector-auth-token"), token);
  });
});
