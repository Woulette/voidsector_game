import assert from "node:assert/strict";
import test from "node:test";
import { pilotNameKey, sanitizePilotName } from "../src/players/profileIdentity.js";
import { createProfileManager } from "../src/players/profiles.js";
import { reservePilotIdentity } from "../src/storage/pilotIdentityStore.js";

test("pilot identity keys normalize case and Unicode width", ()=>{
  assert.equal(pilotNameKey("  ÉTOILE-７  "), "étoile-7");
});

test("profile setup rejects a pilot name already configured by another account", async ()=>{
  const manager = createProfileManager({
    cleanName:value=>sanitizePilotName(value, "Pilote"),
    loadProfileEntries:async ()=>[],
    persistProfileEntries:async ()=>{},
    reservePilotIdentity:async ({pilotName})=>({ok:true, displayName:pilotName}),
    logger:{warn(){}}
  });
  await manager.load();

  const first = await manager.setupProfileForPlayer({
    player:{id:"socket-a", accountId:"account-a", account:{username:"Alpha"}},
    name:"Même Pilote",
    firmId:"astra"
  });
  const second = await manager.setupProfileForPlayer({
    player:{id:"socket-b", accountId:"account-b", account:{username:"Beta"}},
    name:"même pilote",
    firmId:"cyan"
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.match(second.reason, /deja utilise/i);
});

test("PostgreSQL pilot reservation refuses an identity owned by another account", async ()=>{
  const queries = [];
  const client = {
    async query(text, params = []){
      queries.push({text:String(text).trim(), params});
      if(String(text).includes("SELECT account_id FROM pilot_identities")){
        return {rows:[{account_id:"account-owner"}]};
      }
      return {rows:[]};
    },
    release(){
      queries.push({text:"RELEASE", params:[]});
    }
  };

  const result = await reservePilotIdentity({
    accountId:"account-other",
    pilotName:"Pilote Unique",
    database:{connect:async ()=>client},
    enabled:true
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /deja utilise/i);
  assert.equal(queries.some(entry=>entry.text === "ROLLBACK"), true);
  assert.equal(queries.some(entry=>entry.text.startsWith("DELETE FROM pilot_identities")), false);
});

test("PostgreSQL pilot reservation atomically replaces the account previous name", async ()=>{
  const queries = [];
  const client = {
    async query(text, params = []){
      queries.push({text:String(text).trim(), params});
      if(String(text).includes("SELECT account_id FROM pilot_identities")) return {rows:[]};
      if(String(text).includes("INSERT INTO pilot_identities")) return {rows:[{account_id:"account-1"}]};
      return {rows:[]};
    },
    release(){
      queries.push({text:"RELEASE", params:[]});
    }
  };

  const result = await reservePilotIdentity({
    accountId:"account-1",
    pilotName:"Étoile-7",
    database:{connect:async ()=>client},
    enabled:true,
    now:()=>456
  });

  assert.equal(result.ok, true);
  assert.equal(result.nameKey, "étoile-7");
  assert.deepEqual(
    queries.find(entry=>entry.text.startsWith("DELETE FROM pilot_identities"))?.params,
    ["account-1", "étoile-7"]
  );
  assert.deepEqual(
    queries.find(entry=>entry.text.startsWith("INSERT INTO pilot_identities"))?.params,
    ["étoile-7", "Étoile-7", "account-1", 456]
  );
  assert.equal(queries.some(entry=>entry.text === "COMMIT"), true);
});

test("PostgreSQL pilot reservation detects a concurrent conflicting insert", async ()=>{
  const client = {
    async query(text){
      if(String(text).includes("SELECT account_id FROM pilot_identities")) return {rows:[]};
      if(String(text).includes("INSERT INTO pilot_identities")) return {rows:[]};
      return {rows:[]};
    },
    release(){}
  };

  const result = await reservePilotIdentity({
    accountId:"account-loser",
    pilotName:"Concurrent",
    database:{connect:async ()=>client},
    enabled:true
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /deja utilise/i);
});
