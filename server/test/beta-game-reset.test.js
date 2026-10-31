import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  applyBetaGameReset,
  assertBetaGameResetExecutionSafety,
  buildBetaGameResetPlan,
  confirmationTokenForPlan,
  executeBetaGameReset,
  parseBetaGameResetArgs
} from "../tools/beta-game-reset.js";

const OWNER_ID = "owner-account";
const ADMIN_ID = "admin-account";

function makeSnapshot(){
  return {
    database:{name:"voidsector", serverAddress:"127.0.0.1", serverPort:5432},
    accounts:[
      {
        id:OWNER_ID,
        username:"Owner",
        role:"owner",
        password_hash:"scrypt:owner",
        profile_count:1,
        session_count:1,
        pilot_identity_count:1
      },
      {
        id:ADMIN_ID,
        username:"Admin",
        role:"admin",
        password_hash:"external:absyrion:admin",
        profile_count:1,
        session_count:0,
        pilot_identity_count:1
      },
      {
        id:"player-one",
        username:"PlayerOne",
        role:"player",
        password_hash:"external:absyrion:player-one",
        profile_count:1,
        session_count:2,
        pilot_identity_count:1
      },
      {
        id:"moderator-one",
        username:"ModeratorOne",
        role:"moderator",
        password_hash:"external:absyrion:moderator-one",
        profile_count:0,
        session_count:0,
        pilot_identity_count:0
      }
    ],
    unlinkedProfileKeys:["legacy-pilot"],
    firmWarRows:1,
    adminAuditRows:12,
    schemaMigrationRows:2
  };
}

test("beta reset dry-run preserves exactly owner/admin and reports every destructive count", ()=>{
  const plan = buildBetaGameResetPlan(makeSnapshot(), {
    externalAuthUrl:"http://127.0.0.1:3100"
  });

  assert.equal(plan.executable, true);
  assert.deepEqual(plan.protectedAccounts.map(account=>account.id), [ADMIN_ID, OWNER_ID]);
  assert.deepEqual(plan.accountMirrorsToDelete.map(account=>account.id), ["moderator-one", "player-one"]);
  assert.equal(plan.blockedNonMirrorAccounts.length, 0);
  assert.deepEqual(plan.changes, {
    accountsDeleted:2,
    accountsPreserved:2,
    existingProtectedProfilesDeleted:2,
    defaultProtectedProfilesInserted:2,
    otherLinkedProfilesDeleted:1,
    unlinkedProfilesDeleted:1,
    pilotIdentitiesDeleted:3,
    sessionsDeleted:2,
    protectedSessionsPreserved:1,
    firmWarRowsToReset:1,
    adminAuditRowsPreserved:12,
    schemaMigrationRowsPreserved:2
  });
  assert.equal(plan.externalAuth.contacted, false);
  assert.equal(plan.externalAuth.platformAccountsTouched, 0);
  assert.match(plan.confirmationToken, /^RESET-AVOSOMA-GAME-[A-F0-9]{16}$/);
  assert.equal(plan.confirmationToken, confirmationTokenForPlan(plan));
});

test("beta reset refuses any non-owner/admin account not proved to be an external mirror", ()=>{
  const snapshot = makeSnapshot();
  snapshot.accounts.push({
    id:"legacy-global-account",
    username:"Legacy",
    role:"player",
    password_hash:"scrypt:real-platform-password",
    profile_count:1
  });
  const plan = buildBetaGameResetPlan(snapshot, {
    externalAuthUrl:"http://127.0.0.1:3100"
  });

  assert.equal(plan.executable, false);
  assert.deepEqual(plan.blockedNonMirrorAccounts.map(account=>account.id), ["legacy-global-account"]);
  assert.match(plan.blockers.join(" "), /pas prouves comme miroirs Absyrion/);
});

test("beta reset requires exactly one OWNER and one ADMIN", ()=>{
  const snapshot = makeSnapshot();
  snapshot.accounts.push({
    id:"second-admin",
    username:"SecondAdmin",
    role:"admin",
    password_hash:"external:absyrion:second-admin"
  });

  const plan = buildBetaGameResetPlan(snapshot, {
    externalAuthUrl:"http://127.0.0.1:3100"
  });

  assert.equal(plan.executable, false);
  assert.match(plan.blockers.join(" "), /exactement 1 compte admin; 2 detecte/);
});

test("execution requires stopped server, exact database, exact protected ids and dry-run token", ()=>{
  const plan = buildBetaGameResetPlan(makeSnapshot(), {
    externalAuthUrl:"http://127.0.0.1:3100"
  });
  const base = {
    execute:true,
    serverStopped:true,
    deleteGameAccountMirrors:true,
    externalAuthUrl:"http://127.0.0.1:3100",
    expectedDatabase:"voidsector",
    protectedAccountIds:[OWNER_ID, ADMIN_ID],
    confirm:plan.confirmationToken,
    backupFile:"C:\\private-backups\\pre-reset.dump",
    backupFileExplicit:true
  };

  assert.equal(assertBetaGameResetExecutionSafety(base, plan), true);
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({...base, serverStopped:false}, plan),
    /--server-stopped/
  );
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({...base, protectedAccountIds:[OWNER_ID]}, plan),
    /doivent correspondre exactement/
  );
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({...base, confirm:"wrong"}, plan),
    /Confirmation invalide/
  );
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({...base, expectedDatabase:"absyrion_auth"}, plan),
    /nom exact de la base jeu/
  );
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({...base, backupFileExplicit:false}, plan),
    /--backup-file explicite/
  );
  assert.throws(
    ()=>assertBetaGameResetExecutionSafety({
      ...base,
      backupFile:path.resolve("backups", "unsafe.dump")
    }, plan),
    /hors de la racine projet\/web/
  );
});

test("locked execution refuses an empty PostgreSQL backup", async ()=>{
  const plan = buildBetaGameResetPlan(makeSnapshot(), {
    externalAuthUrl:"http://127.0.0.1:3100"
  });
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "voidsector-empty-backup-"));
  const backupFile = path.join(tempDir, "empty.dump");
  await writeFile(backupFile, "");
  try{
    assert.throws(
      ()=>assertBetaGameResetExecutionSafety({
        execute:true,
        serverStopped:true,
        deleteGameAccountMirrors:true,
        externalAuthUrl:"http://127.0.0.1:3100",
        expectedDatabase:"voidsector",
        protectedAccountIds:[OWNER_ID, ADMIN_ID],
        confirm:plan.confirmationToken,
        backupFile,
        backupFileExplicit:true
      }, plan, {backupAlreadyCreated:true}),
      /absente ou vide/
    );
  }finally{
    await rm(tempDir, {recursive:true, force:true});
  }
});

test("argument parsing keeps dry-run as default and accepts repeated protected account ids", ()=>{
  const parsed = parseBetaGameResetArgs([
    "--execute",
    "--server-stopped",
    "--delete-game-account-mirrors",
    "--expected-database=voidsector",
    "--protected-account-id", OWNER_ID,
    `--protected-account-id=${ADMIN_ID}`,
    "--confirm=token",
    "--backup-file=C:\\private\\reset.dump"
  ], {
    DATABASE_URL:"postgresql://game:secret@localhost:5432/voidsector",
    PLATFORM_AUTH_API_URL:"http://127.0.0.1:3100"
  });

  assert.equal(parsed.execute, true);
  assert.equal(parsed.serverStopped, true);
  assert.equal(parsed.deleteGameAccountMirrors, true);
  assert.deepEqual(parsed.protectedAccountIds, [ADMIN_ID, OWNER_ID]);
  assert.equal(parsed.expectedDatabase, "voidsector");
  assert.equal(parsed.externalAuthUrl, "http://127.0.0.1:3100");
  assert.equal(parsed.backupFileExplicit, true);
});

test("apply resets protected profiles to canonical defaults and only deletes proven mirror ids", async ()=>{
  const plan = buildBetaGameResetPlan(makeSnapshot(), {
    externalAuthUrl:"http://127.0.0.1:3100"
  });
  const calls = [];
  const database = {
    async query(sql, params = []){
      calls.push({sql:String(sql).replace(/\s+/g, " ").trim(), params});
      if(String(sql).includes("DELETE FROM accounts")){
        return {rows:plan.accountMirrorsToDelete.map(account=>({id:account.id}))};
      }
      if(String(sql).includes("DELETE FROM firm_war_state")){
        return {rows:[{id:"global"}]};
      }
      if(String(sql).includes("INSERT INTO firm_war_state")){
        return {rows:[{id:"global"}]};
      }
      return {rows:[]};
    }
  };

  const result = await applyBetaGameReset(database, plan, {now:123456});

  assert.deepEqual(result, {
    accountsDeleted:2,
    protectedAccountsPreserved:2,
    protectedProfilesReset:2,
    firmWarRowsReset:1,
    initialFirmWarRowWritten:true,
    platformAccountsTouched:0
  });
  const accountDelete = calls.find(call=>call.sql.includes("DELETE FROM accounts"));
  assert.deepEqual(accountDelete.params[0], ["moderator-one", "player-one"]);
  assert.match(accountDelete.sql, /password_hash LIKE 'external:absyrion:%'/);
  const inserts = calls.filter(call=>call.sql.includes("INSERT INTO player_profiles"));
  assert.equal(inserts.length, 2);
  for(const insert of inserts){
    const profile = JSON.parse(insert.params[2]);
    assert.equal(profile.player.level, 1);
    assert.equal(profile.player.firmSelected, false);
    assert.equal(profile.activeShip, "orion");
    assert.equal(profile.updatedAt, 123456);
  }
  const firmStateUpsert = calls.find(call=>call.sql.includes("INSERT INTO firm_war_state"));
  assert.ok(firmStateUpsert);
  const firmState = JSON.parse(firmStateUpsert.params[0]);
  assert.deepEqual(firmState.points, {
    astra:0,
    cyan:0,
    jaune:0,
    verte:0
  });
  assert.deepEqual(firmState.contributions, {});
  assert.equal(firmState.seasonStartedAt, 123456);
});

test("execute flow creates and verifies backup before reaching transactional commit", async ()=>{
  const snapshot = makeSnapshot();
  const plan = buildBetaGameResetPlan(snapshot, {
    externalAuthUrl:"http://127.0.0.1:3100"
  });
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "voidsector-reset-test-"));
  const backupFile = path.join(tempDir, "pre-reset.dump");
  const calls = [];
  const client = {
    async query(sql, params = []){
      const compact = String(sql).replace(/\s+/g, " ").trim();
      calls.push({sql:compact, params});
      if(compact.includes("current_database()")){
        return {rows:[{
          name:snapshot.database.name,
          server_address:snapshot.database.serverAddress,
          server_port:snapshot.database.serverPort
        }]};
      }
      if(compact.includes("FROM accounts a") && compact.includes("password_hash")){
        return {rows:snapshot.accounts};
      }
      if(compact.includes("FROM player_profiles") && compact.includes("account_id IS NULL") && compact.includes("SELECT profile_key")){
        return {rows:snapshot.unlinkedProfileKeys.map(profile_key=>({profile_key}))};
      }
      if(compact.includes("admin_audit_log")){
        return {rows:[{
          firm_war_rows:snapshot.firmWarRows,
          admin_audit_rows:snapshot.adminAuditRows,
          schema_migration_rows:snapshot.schemaMigrationRows
        }]};
      }
      if(compact.includes("DELETE FROM accounts")){
        return {rows:plan.accountMirrorsToDelete.map(account=>({id:account.id}))};
      }
      if(compact.includes("DELETE FROM firm_war_state")){
        return {rows:[{id:"global"}]};
      }
      if(compact.includes("INSERT INTO firm_war_state")){
        return {rows:[{id:"global"}]};
      }
      return {rows:[]};
    },
    release(){
      calls.push({sql:"RELEASE", params:[]});
    }
  };
  const pool = {
    async connect(){
      return client;
    }
  };
  const config = {
    execute:true,
    serverStopped:true,
    deleteGameAccountMirrors:true,
    externalAuthUrl:"http://127.0.0.1:3100",
    expectedDatabase:"voidsector",
    protectedAccountIds:[OWNER_ID, ADMIN_ID],
    confirm:plan.confirmationToken,
    backupFile,
    backupFileExplicit:true,
    databaseUrl:"postgresql://game:secret@localhost:5432/voidsector",
    pgDumpBin:"pg_dump"
  };
  try{
    const result = await executeBetaGameReset({
      pool,
      config,
      initialPlan:plan,
      backupRunner:async backupConfig=>{
        assert.equal(backupConfig.outputFile, backupFile);
        calls.push({sql:"BACKUP", params:[]});
        await writeFile(backupFile, "non-empty-dump");
      },
      now:()=>123456,
      logger:{log(){}, warn(){}}
    });

    assert.equal(result.ok, true);
    assert.equal(result.initialFirmWarRowWritten, true);
    assert.equal(calls.findIndex(call=>call.sql === "BACKUP") < calls.findIndex(call=>call.sql.startsWith("BEGIN")), true);
    assert.equal(calls.some(call=>call.sql === "COMMIT"), true);
    assert.equal(calls.some(call=>call.sql === "ROLLBACK"), false);
  }finally{
    await rm(tempDir, {recursive:true, force:true});
  }
});
