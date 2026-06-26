import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeRestoreTarget,
  buildBackupCommand,
  buildRestoreCommands,
  parseBackupArgs,
  parseRestoreArgs,
  runBackup,
  runRestoreTest,
  safeDatabaseLabel,
  samePostgresDatabase
} from "../tools/postgres-maintenance.js";

const SOURCE_URL = "postgresql://voidsector:secret@localhost:5432/voidsector";
const RESTORE_URL = "postgresql://voidsector:secret@localhost:5432/voidsector_restore_test";

test("postgres backup defaults to a dated custom dump under server backups", ()=>{
  const parsed = parseBackupArgs([], {DATABASE_URL:SOURCE_URL}, {now:new Date("2026-06-26T12:34:56Z")});
  assert.equal(parsed.databaseUrl, SOURCE_URL);
  assert.equal(parsed.outputFile.endsWith("server\\backups\\voidsector_20260626_123456Z.dump")
    || parsed.outputFile.endsWith("server/backups/voidsector_20260626_123456Z.dump"), true);

  const command = buildBackupCommand(parsed);
  assert.equal(command.command, "pg_dump");
  assert.deepEqual(command.args.slice(0, 6), [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    parsed.outputFile,
    SOURCE_URL
  ]);
});

test("postgres maintenance rejects non-PostgreSQL database URLs", ()=>{
  assert.throws(
    ()=>buildBackupCommand({
      databaseUrl:"mysql://voidsector:secret@localhost:3306/voidsector",
      outputFile:"backup.dump"
    }),
    /DATABASE_URL must be a valid postgres/
  );
  assert.throws(
    ()=>assertSafeRestoreTarget({
      sourceDatabaseUrl:SOURCE_URL,
      restoreDatabaseUrl:"postgresql://localhost"
    }),
    /Restore target must be a valid postgres/
  );
});

test("postgres restore test refuses the production database", ()=>{
  assert.equal(samePostgresDatabase(SOURCE_URL, SOURCE_URL), true);
  assert.throws(
    ()=>assertSafeRestoreTarget({sourceDatabaseUrl:SOURCE_URL, restoreDatabaseUrl:SOURCE_URL}),
    /same database/
  );
});

test("postgres restore test requires an explicit test-like target", ()=>{
  assert.throws(
    ()=>assertSafeRestoreTarget({
      sourceDatabaseUrl:SOURCE_URL,
      restoreDatabaseUrl:"postgresql://voidsector:secret@localhost:5432/voidsector_copy"
    }),
    /must contain test, restore, staging or sandbox/
  );
  assert.equal(assertSafeRestoreTarget({sourceDatabaseUrl:SOURCE_URL, restoreDatabaseUrl:RESTORE_URL}), true);
  assert.equal(safeDatabaseLabel(RESTORE_URL), "localhost:5432/voidsector_restore_test");
});

test("postgres restore test builds pg_restore then psql verification commands", ()=>{
  const parsed = parseRestoreArgs(["--file", "backup.dump"], {
    DATABASE_URL:SOURCE_URL,
    RESTORE_TEST_DATABASE_URL:RESTORE_URL
  });
  const commands = buildRestoreCommands(parsed);
  assert.equal(commands.length, 2);
  assert.equal(commands[0].command, "pg_restore");
  assert.deepEqual(commands[0].args.slice(0, 8), [
    "--dbname",
    RESTORE_URL,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "backup.dump"
  ]);
  assert.equal(commands[1].command, "psql");
  assert.equal(commands[1].args.includes("ON_ERROR_STOP=1"), true);
});

test("postgres backup and restore runners execute expected commands without leaking to production restore", async ()=>{
  const calls = [];
  const runner = async (command, args)=>{
    calls.push({command, args});
    return {code:0};
  };
  const logger = {log(){}};

  await runBackup({
    databaseUrl:SOURCE_URL,
    outputFile:"C:/tmp/voidsector.dump",
    pgDumpBin:"pg_dump"
  }, {runner, logger});
  await runRestoreTest({
    sourceDatabaseUrl:SOURCE_URL,
    restoreDatabaseUrl:RESTORE_URL,
    backupFile:"C:/tmp/voidsector.dump",
    pgRestoreBin:"pg_restore",
    psqlBin:"psql"
  }, {runner, logger});

  assert.deepEqual(calls.map(call=>call.command), ["pg_dump", "pg_restore", "psql"]);
});
