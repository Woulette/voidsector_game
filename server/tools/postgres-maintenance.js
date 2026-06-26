#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BACKUP_DIR = fileURLToPath(new URL("../backups", import.meta.url));
const RESTORE_TEST_NAME_PATTERN = /(test|restore|staging|sandbox)/i;

function readArg(argv, name){
  const prefix = `${name}=`;
  const direct = argv.find(arg=>String(arg || "").startsWith(prefix));
  if(direct) return direct.slice(prefix.length);
  const index = argv.indexOf(name);
  if(index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return "";
}

function hasFlag(argv, name){
  return argv.includes(name);
}

function backupTimestamp(now = new Date()){
  return now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "").replace("T", "_");
}

function required(value, message){
  const clean = String(value || "").trim();
  if(!clean) throw new Error(message);
  return clean;
}

function parseDatabaseUrl(urlString){
  try{
    const parsed = new URL(String(urlString || ""));
    const database = decodeURIComponent(parsed.pathname || "").replace(/^\/+/, "");
    return {
      protocol:parsed.protocol,
      hostname:parsed.hostname,
      port:parsed.port || "5432",
      database,
      username:decodeURIComponent(parsed.username || "")
    };
  }catch{
    return null;
  }
}

function isPostgresDatabaseUrl(urlString){
  const parsed = parseDatabaseUrl(urlString);
  return Boolean(parsed?.database && ["postgres:", "postgresql:"].includes(parsed.protocol) && parsed.hostname);
}

function assertPostgresDatabaseUrl(urlString, label){
  if(!isPostgresDatabaseUrl(urlString)){
    throw new Error(`${label} must be a valid postgres:// or postgresql:// URL with a database name.`);
  }
}

export function safeDatabaseLabel(urlString){
  const parsed = parseDatabaseUrl(urlString);
  if(!parsed) return "<invalid-postgres-url>";
  return `${parsed.hostname}:${parsed.port}/${parsed.database || "<missing-db>"}`;
}

export function samePostgresDatabase(leftUrl, rightUrl){
  const left = parseDatabaseUrl(leftUrl);
  const right = parseDatabaseUrl(rightUrl);
  if(!left || !right) return false;
  return left.protocol === right.protocol
    && left.hostname === right.hostname
    && left.port === right.port
    && left.database === right.database
    && left.username === right.username;
}

export function assertSafeRestoreTarget({sourceDatabaseUrl, restoreDatabaseUrl, allowNonTestDatabase = false} = {}){
  const restoreUrl = required(restoreDatabaseUrl, "RESTORE_TEST_DATABASE_URL or --restore-url is required.");
  assertPostgresDatabaseUrl(restoreUrl, "Restore target");
  const restore = parseDatabaseUrl(restoreUrl);
  if(sourceDatabaseUrl && samePostgresDatabase(sourceDatabaseUrl, restoreUrl)){
    throw new Error(`Restore target ${safeDatabaseLabel(restoreUrl)} is the same database as DATABASE_URL.`);
  }
  if(!allowNonTestDatabase && !RESTORE_TEST_NAME_PATTERN.test(restore.database)){
    throw new Error(`Restore target database "${restore.database}" must contain test, restore, staging or sandbox.`);
  }
  return true;
}

export function parseBackupArgs(argv = [], env = process.env, {now = new Date()} = {}){
  const outDir = readArg(argv, "--out-dir") || env.PG_BACKUP_DIR || DEFAULT_BACKUP_DIR;
  const outputFile = readArg(argv, "--output") || readArg(argv, "--file")
    || resolve(outDir, `voidsector_${backupTimestamp(now)}.dump`);
  return {
    databaseUrl:readArg(argv, "--database-url") || env.DATABASE_URL || "",
    outputFile:resolve(outputFile),
    pgDumpBin:readArg(argv, "--pg-dump-bin") || env.PG_DUMP_BIN || "pg_dump"
  };
}

export function parseRestoreArgs(argv = [], env = process.env){
  return {
    sourceDatabaseUrl:readArg(argv, "--database-url") || env.DATABASE_URL || "",
    restoreDatabaseUrl:readArg(argv, "--restore-url") || env.RESTORE_TEST_DATABASE_URL || env.BETA_RESTORE_TEST_DATABASE_URL || "",
    backupFile:readArg(argv, "--file") || readArg(argv, "--backup") || "",
    pgRestoreBin:readArg(argv, "--pg-restore-bin") || env.PG_RESTORE_BIN || "pg_restore",
    psqlBin:readArg(argv, "--psql-bin") || env.PSQL_BIN || "psql",
    allowNonTestDatabase:hasFlag(argv, "--allow-non-test-database")
  };
}

export function buildBackupCommand(config = {}){
  const databaseUrl = required(config.databaseUrl, "DATABASE_URL or --database-url is required.");
  assertPostgresDatabaseUrl(databaseUrl, "DATABASE_URL");
  const outputFile = required(config.outputFile, "--output is required.");
  return {
    command:config.pgDumpBin || "pg_dump",
    args:[
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      outputFile,
      databaseUrl
    ]
  };
}

export function buildRestoreCommands(config = {}){
  const backupFile = required(config.backupFile, "--file is required for restore-test.");
  assertSafeRestoreTarget(config);
  const restoreUrl = config.restoreDatabaseUrl;
  return [
    {
      command:config.pgRestoreBin || "pg_restore",
      args:[
        "--dbname",
        restoreUrl,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        backupFile
      ]
    },
    {
      command:config.psqlBin || "psql",
      args:[
        "--dbname",
        restoreUrl,
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
        "-c",
        "SELECT COUNT(*) FROM accounts; SELECT COUNT(*) FROM player_profiles; SELECT COUNT(*) FROM schema_migrations;"
      ]
    }
  ];
}

function spawnRunner(command, args){
  return new Promise((resolvePromise, reject)=>{
    const child = spawn(command, args, {stdio:"inherit"});
    child.once("error", reject);
    child.once("exit", code=>{
      if(code === 0) resolvePromise({code});
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

export async function runBackup(config = {}, {runner = spawnRunner, logger = console} = {}){
  const command = buildBackupCommand(config);
  await mkdir(dirname(config.outputFile), {recursive:true});
  await runner(command.command, command.args);
  logger?.log?.(`PostgreSQL backup OK: ${config.outputFile}`);
  return {ok:true, outputFile:config.outputFile};
}

export async function runRestoreTest(config = {}, {runner = spawnRunner, logger = console} = {}){
  const commands = buildRestoreCommands(config);
  for(const command of commands){
    await runner(command.command, command.args);
  }
  logger?.log?.(`PostgreSQL restore test OK: ${safeDatabaseLabel(config.restoreDatabaseUrl)}`);
  return {ok:true};
}

export async function main(argv = process.argv.slice(2), env = process.env, options = {}){
  const [action, ...rest] = argv;
  if(action === "backup"){
    await runBackup(parseBackupArgs(rest, env), options);
    return 0;
  }
  if(action === "restore-test"){
    await runRestoreTest(parseRestoreArgs(rest, env), options);
    return 0;
  }
  console.error("Usage: postgres-maintenance.js backup|restore-test [options]");
  return 1;
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  main().then(code=>process.exit(code)).catch(error=>{
    console.error(`PostgreSQL maintenance FAILED: ${error?.message || String(error)}`);
    process.exit(1);
  });
}
