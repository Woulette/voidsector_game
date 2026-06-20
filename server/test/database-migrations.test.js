import assert from "node:assert/strict";
import test from "node:test";
import { DATABASE_MIGRATIONS, runDatabaseMigrations } from "../src/db/migrations.js";

test("database migrations run pending versions in transactions under an advisory lock", async ()=>{
  const queries = [];
  const client = {
    async query(text, params = []){
      queries.push({text:String(text).trim(), params});
      if(String(text).includes("SELECT id FROM schema_migrations")){
        return {rows:[{id:DATABASE_MIGRATIONS[0].id}]};
      }
      return {rows:[]};
    },
    release(){
      queries.push({text:"RELEASE", params:[]});
    }
  };

  await runDatabaseMigrations({
    database:{connect:async ()=>client},
    now:()=>123
  });

  assert.equal(queries.some(entry=>entry.text.includes("pg_advisory_lock")), true);
  assert.equal(queries.some(entry=>entry.text === "BEGIN"), true);
  assert.equal(queries.some(entry=>entry.text.includes("CREATE TABLE IF NOT EXISTS pilot_identities")), true);
  assert.equal(queries.some(entry=>entry.text.includes("CREATE TABLE IF NOT EXISTS accounts")), false);
  assert.deepEqual(
    queries.find(entry=>entry.text.startsWith("INSERT INTO schema_migrations"))?.params,
    [DATABASE_MIGRATIONS[1].id, 123]
  );
  assert.equal(queries.at(-2).text.includes("pg_advisory_unlock"), true);
  assert.equal(queries.at(-1).text, "RELEASE");
});

test("a failed migration rolls back and still releases its advisory lock", async ()=>{
  const queries = [];
  const client = {
    async query(text){
      const clean = String(text).trim();
      queries.push(clean);
      if(clean.includes("SELECT id FROM schema_migrations")) return {rows:[]};
      if(clean === "BROKEN") throw new Error("migration failed");
      return {rows:[]};
    },
    release(){
      queries.push("RELEASE");
    }
  };

  await assert.rejects(
    runDatabaseMigrations({
      database:{connect:async ()=>client},
      migrations:[{id:"broken", sql:"BROKEN"}]
    }),
    /migration failed/
  );
  assert.equal(queries.includes("ROLLBACK"), true);
  assert.equal(queries.some(entry=>entry.includes?.("pg_advisory_unlock")), true);
  assert.equal(queries.at(-1), "RELEASE");
});
