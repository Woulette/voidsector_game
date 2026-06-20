import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, open, readFile, readdir, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createProfileManager } from "../src/players/profiles.js";
import { createProfilePersistence } from "../src/storage/profileStore.js";

function delay(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

function cleanName(value){
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24) || "NOVA-37";
}

test("JSON profile writes are serialized and atomically replace the final file", async t=>{
  const directory = await mkdtemp(path.join(os.tmpdir(), "voidsector-profiles-"));
  t.after(()=>rm(directory, {recursive:true, force:true}));
  const dataDirUrl = pathToFileURL(`${directory}${path.sep}`);
  const profileStoreUrl = pathToFileURL(path.join(directory, "profiles.json"));
  let activeRenames = 0;
  let maxActiveRenames = 0;
  const persistence = createProfilePersistence({
    database:null,
    dataDirUrl,
    profileStoreUrl,
    fileSystem:fs,
    fileSystemPromises:{
      mkdir,
      open,
      rm,
      async rename(from, to){
        activeRenames += 1;
        maxActiveRenames = Math.max(maxActiveRenames, activeRenames);
        await delay(15);
        await rename(from, to);
        activeRenames -= 1;
      }
    }
  });

  const first = persistence.persistProfileEntries([
    ["account:1", {updatedAt:100, player:{credits:10}}],
    ["account:2", {updatedAt:50, player:{credits:5}}]
  ]);
  const second = persistence.persistProfileEntries([
    ["account:1", {updatedAt:101, player:{credits:20}}]
  ]);
  const stale = persistence.persistProfileEntries([
    ["account:1", {updatedAt:99, player:{credits:999}}]
  ]);
  await Promise.all([first, second, stale]);
  await persistence.flushProfilePersistence();

  const stored = JSON.parse(await readFile(profileStoreUrl, "utf8"));
  const files = await readdir(directory);
  assert.equal(maxActiveRenames, 1);
  assert.equal(stored["account:1"].updatedAt, 101);
  assert.equal(stored["account:1"].player.credits, 20);
  assert.equal(stored["account:2"].updatedAt, 50);
  assert.equal(stored["account:2"].player.credits, 5);
  assert.deepEqual(files, ["profiles.json"]);
});

test("PostgreSQL profile batches use a transaction and reject stale updates", async ()=>{
  const queries = [];
  let released = false;
  const client = {
    async query(text, params){
      queries.push({text:String(text), params});
      return {rows:[]};
    },
    release(){
      released = true;
    }
  };
  const persistence = createProfilePersistence({
    database:{
      async query(){ return {rows:[]}; },
      async connect(){ return client; }
    }
  });

  await persistence.persistProfileEntries([
    ["account:7", {updatedAt:700, player:{credits:70}}],
    ["legacy", {updatedAt:701, player:{credits:71}}]
  ]);

  assert.equal(queries[0].text, "BEGIN");
  assert.equal(queries.at(-1).text, "COMMIT");
  assert.equal(queries.filter(entry=>entry.text.includes("INSERT INTO player_profiles")).length, 2);
  assert.equal(queries.some(entry=>entry.text.includes("player_profiles.updated_at <= EXCLUDED.updated_at")), true);
  assert.equal(queries[1].params[1], "7");
  assert.equal(queries[2].params[1], null);
  assert.equal(released, true);
});

test("profile manager persists one account at a time with monotonic versions", async ()=>{
  const writes = [];
  let activeWrites = 0;
  let maxActiveWrites = 0;
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    async persistProfileEntries(entries){
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      await delay(10);
      writes.push(structuredClone(entries));
      activeWrites -= 1;
    }
  });
  const player = {
    id:"socket-9",
    accountId:"9",
    name:"Nova",
    account:{username:"Nova", firmId:"astra"}
  };

  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  writes.length = 0;

  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits = 10;
      return {ok:true};
    }
  });
  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.credits = 20;
      return {ok:true};
    }
  });
  await manager.flushPersistence();

  assert.equal(maxActiveWrites, 1);
  assert.equal(writes.length, 2);
  assert.equal(writes.every(entries=>entries.length === 1 && entries[0][0] === "account:9"), true);
  assert.equal(writes[1][0][1].updatedAt > writes[0][0][1].updatedAt, true);
  assert.equal(writes[1][0][1].player.credits, 20);
});
