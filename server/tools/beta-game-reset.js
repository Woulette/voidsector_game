#!/usr/bin/env node
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { buildInitialFirmState } from "../src/firms/firmState.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { runBackup } from "./postgres-maintenance.js";

const PLAN_VERSION = 1;
const RESET_ADVISORY_LOCK_ID = 148159138;
const EXTERNAL_MIRROR_HASH_PREFIX = "external:absyrion:";
const PROTECTED_ROLES = Object.freeze(["owner", "admin"]);
const FORBIDDEN_DATABASE_NAME_PATTERN = /(absyrion.*(?:auth|account)|(?:auth|account).*absyrion|platform.*(?:auth|account))/i;
const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));

function readArg(argv, name){
  const prefix = `${name}=`;
  const direct = argv.find(arg=>String(arg || "").startsWith(prefix));
  if(direct) return direct.slice(prefix.length);
  const index = argv.indexOf(name);
  if(index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return "";
}

function readArgs(argv, name){
  const values = [];
  const prefix = `${name}=`;
  for(let index = 0; index < argv.length; index++){
    const arg = String(argv[index] || "");
    if(arg.startsWith(prefix)){
      values.push(arg.slice(prefix.length));
      continue;
    }
    if(arg === name && index + 1 < argv.length){
      values.push(argv[index + 1]);
      index++;
    }
  }
  return values;
}

function hasFlag(argv, name){
  return argv.includes(name);
}

function clean(value){
  return String(value || "").trim();
}

function uniqueSorted(values = []){
  return [...new Set(values.map(clean).filter(Boolean))].sort();
}

function backupTimestamp(now = new Date()){
  return now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "").replace("T", "_");
}

function defaultBackupFile(now = new Date()){
  return path.resolve("backups", `pre_beta_game_reset_${backupTimestamp(now)}.dump`);
}

function pathIsInside(candidate, parent){
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeProviderLabel(value){
  try{
    const url = new URL(clean(value));
    return `${url.protocol}//${url.host}`;
  }catch{
    return "";
  }
}

function isValidExternalAuthUrl(value){
  try{
    const url = new URL(clean(value));
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  }catch{
    return false;
  }
}

function normalizeRole(value){
  return clean(value || "player").toLowerCase();
}

function numberValue(value){
  return Math.max(0, Number(value || 0));
}

function publicAccount(row = {}){
  return {
    id:clean(row.id),
    username:clean(row.username),
    role:normalizeRole(row.role),
    profiles:numberValue(row.profileCount ?? row.profile_count),
    sessions:numberValue(row.sessionCount ?? row.session_count),
    pilotIdentities:numberValue(row.pilotIdentityCount ?? row.pilot_identity_count)
  };
}

function isExternalMirrorAccount(row = {}){
  return clean(row.passwordHash ?? row.password_hash).startsWith(EXTERNAL_MIRROR_HASH_PREFIX);
}

function sortedAccounts(accounts = []){
  return [...accounts].sort((left, right)=>
    normalizeRole(left.role).localeCompare(normalizeRole(right.role))
      || clean(left.username).localeCompare(clean(right.username))
      || clean(left.id).localeCompare(clean(right.id))
  );
}

function confirmationPayload(plan){
  return {
    planVersion:plan.planVersion,
    database:plan.database,
    protectedAccountIds:plan.protectedAccounts.map(account=>account.id),
    accountMirrorIdsToDelete:plan.accountMirrorsToDelete.map(account=>account.id),
    blockedAccountIds:plan.blockedNonMirrorAccounts.map(account=>account.id),
    unlinkedProfileKeysToDelete:plan.unlinkedProfileKeysToDelete,
    firmWarRowsToReset:plan.changes.firmWarRowsToReset
  };
}

export function confirmationTokenForPlan(plan){
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(confirmationPayload(plan)))
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
  return `RESET-AVOSOMA-GAME-${digest}`;
}

export function parseBetaGameResetArgs(argv = [], env = process.env, {now = new Date()} = {}){
  const protectedIds = [
    ...readArgs(argv, "--protected-account-id"),
    ...clean(readArg(argv, "--protected-account-ids")).split(",")
  ];
  const explicitBackupFile = clean(readArg(argv, "--backup-file"));
  return {
    execute:hasFlag(argv, "--execute"),
    confirm:clean(readArg(argv, "--confirm")),
    expectedDatabase:clean(readArg(argv, "--expected-database")),
    protectedAccountIds:uniqueSorted(protectedIds),
    serverStopped:hasFlag(argv, "--server-stopped"),
    deleteGameAccountMirrors:hasFlag(argv, "--delete-game-account-mirrors"),
    databaseUrl:clean(readArg(argv, "--database-url") || env.DATABASE_URL),
    databaseSsl:String(env.DATABASE_SSL || "").toLowerCase() === "true",
    externalAuthUrl:clean(readArg(argv, "--external-auth-url") || env.PLATFORM_AUTH_API_URL),
    backupFile:path.resolve(explicitBackupFile || defaultBackupFile(now)),
    backupFileExplicit:Boolean(explicitBackupFile),
    pgDumpBin:clean(readArg(argv, "--pg-dump-bin") || env.PG_DUMP_BIN || "pg_dump")
  };
}

export function buildBetaGameResetPlan(snapshot = {}, {externalAuthUrl = ""} = {}){
  const accounts = sortedAccounts(snapshot.accounts || []);
  const protectedRows = accounts.filter(account=>PROTECTED_ROLES.includes(normalizeRole(account.role)));
  const unprotectedRows = accounts.filter(account=>!PROTECTED_ROLES.includes(normalizeRole(account.role)));
  const mirrorRows = unprotectedRows.filter(isExternalMirrorAccount);
  const blockedRows = unprotectedRows.filter(account=>!isExternalMirrorAccount(account));
  const protectedAccounts = sortedAccounts(protectedRows.map(publicAccount));
  const accountMirrorsToDelete = sortedAccounts(mirrorRows.map(publicAccount));
  const blockedNonMirrorAccounts = sortedAccounts(blockedRows.map(publicAccount));
  const unlinkedProfileKeysToDelete = uniqueSorted(snapshot.unlinkedProfileKeys || []);
  const deletedAccountProfiles = accountMirrorsToDelete.reduce((total, account)=>total + account.profiles, 0);
  const resetProtectedProfiles = protectedAccounts.reduce((total, account)=>total + account.profiles, 0);
  const deletedPilotIdentities = [...accountMirrorsToDelete, ...protectedAccounts]
    .reduce((total, account)=>total + account.pilotIdentities, 0);
  const deletedSessions = accountMirrorsToDelete.reduce((total, account)=>total + account.sessions, 0);
  const preservedSessions = protectedAccounts.reduce((total, account)=>total + account.sessions, 0);
  const ownerCount = protectedAccounts.filter(account=>account.role === "owner").length;
  const adminCount = protectedAccounts.filter(account=>account.role === "admin").length;
  const externalAuthConfigured = isValidExternalAuthUrl(externalAuthUrl);
  const executable = externalAuthConfigured
    && blockedNonMirrorAccounts.length === 0
    && ownerCount === 1
    && adminCount === 1;
  const plan = {
    planVersion:PLAN_VERSION,
    mode:"dry-run",
    database:{
      name:clean(snapshot.database?.name),
      serverAddress:clean(snapshot.database?.serverAddress || "local"),
      serverPort:numberValue(snapshot.database?.serverPort || 5432)
    },
    externalAuth:{
      configured:externalAuthConfigured,
      provider:safeProviderLabel(externalAuthUrl),
      contacted:false,
      platformAccountsTouched:0
    },
    protectedRoles:[...PROTECTED_ROLES],
    protectedAccounts,
    accountMirrorsToDelete,
    blockedNonMirrorAccounts,
    unlinkedProfileKeysToDelete,
    changes:{
      accountsDeleted:accountMirrorsToDelete.length,
      accountsPreserved:protectedAccounts.length,
      existingProtectedProfilesDeleted:resetProtectedProfiles,
      defaultProtectedProfilesInserted:protectedAccounts.length,
      otherLinkedProfilesDeleted:deletedAccountProfiles,
      unlinkedProfilesDeleted:unlinkedProfileKeysToDelete.length,
      pilotIdentitiesDeleted:deletedPilotIdentities,
      sessionsDeleted:deletedSessions,
      protectedSessionsPreserved:preservedSessions,
      firmWarRowsToReset:numberValue(snapshot.firmWarRows),
      adminAuditRowsPreserved:numberValue(snapshot.adminAuditRows),
      schemaMigrationRowsPreserved:numberValue(snapshot.schemaMigrationRows)
    },
    executable,
    blockers:[
      ...(!externalAuthConfigured ? ["PLATFORM_AUTH_API_URL externe absent ou invalide."] : []),
      ...(blockedNonMirrorAccounts.length ? [`${blockedNonMirrorAccounts.length} compte(s) joueur ne sont pas prouves comme miroirs Absyrion.`] : []),
      ...(ownerCount !== 1 ? [`Le reset exige exactement 1 compte owner; ${ownerCount} detecte(s).`] : []),
      ...(adminCount !== 1 ? [`Le reset exige exactement 1 compte admin; ${adminCount} detecte(s).`] : [])
    ]
  };
  plan.confirmationToken = confirmationTokenForPlan(plan);
  return plan;
}

export async function collectBetaGameResetSnapshot(database){
  const identityResult = await database.query(`
    SELECT
      current_database() AS name,
      COALESCE(inet_server_addr()::text, 'local') AS server_address,
      COALESCE(inet_server_port(), 5432) AS server_port
  `);
  const accountsResult = await database.query(`
    SELECT
      a.id,
      a.username,
      a.role,
      a.password_hash,
      (SELECT COUNT(*)::int FROM player_profiles p WHERE p.account_id = a.id) AS profile_count,
      (SELECT COUNT(*)::int FROM sessions s WHERE s.account_id = a.id) AS session_count,
      (SELECT COUNT(*)::int FROM pilot_identities i WHERE i.account_id = a.id) AS pilot_identity_count
    FROM accounts a
    ORDER BY LOWER(a.role), a.username, a.id
  `);
  const unlinkedProfilesResult = await database.query(`
    SELECT profile_key
    FROM player_profiles
    WHERE account_id IS NULL
    ORDER BY profile_key
  `);
  const retainedRowsResult = await database.query(`
    SELECT
      (SELECT COUNT(*)::int FROM firm_war_state) AS firm_war_rows,
      (SELECT COUNT(*)::int FROM admin_audit_log) AS admin_audit_rows,
      (SELECT COUNT(*)::int FROM schema_migrations) AS schema_migration_rows
  `);
  const identity = identityResult.rows?.[0] || {};
  const retainedRows = retainedRowsResult.rows?.[0] || {};
  return {
    database:{
      name:identity.name,
      serverAddress:identity.server_address,
      serverPort:identity.server_port
    },
    accounts:accountsResult.rows || [],
    unlinkedProfileKeys:(unlinkedProfilesResult.rows || []).map(row=>row.profile_key),
    firmWarRows:retainedRows.firm_war_rows,
    adminAuditRows:retainedRows.admin_audit_rows,
    schemaMigrationRows:retainedRows.schema_migration_rows
  };
}

function sameStringSet(left = [], right = []){
  const cleanLeft = uniqueSorted(left);
  const cleanRight = uniqueSorted(right);
  return cleanLeft.length === cleanRight.length
    && cleanLeft.every((value, index)=>value === cleanRight[index]);
}

export function assertBetaGameResetExecutionSafety(config = {}, plan = {}, {backupAlreadyCreated = false} = {}){
  if(!config.execute) throw new Error("Le reset reel demande --execute.");
  if(!plan.executable) throw new Error(`Plan non executable: ${(plan.blockers || []).join(" ")}`);
  if(!config.serverStopped){
    throw new Error("Arrete le serveur de jeu puis ajoute --server-stopped.");
  }
  if(!config.deleteGameAccountMirrors){
    throw new Error("Ajoute --delete-game-account-mirrors pour confirmer la suppression des seuls miroirs jeu.");
  }
  if(!isValidExternalAuthUrl(config.externalAuthUrl)){
    throw new Error("PLATFORM_AUTH_API_URL externe requis pour proteger les comptes plateforme.");
  }
  const actualDatabase = clean(plan.database?.name);
  if(!config.expectedDatabase || config.expectedDatabase !== actualDatabase){
    throw new Error(`Ajoute --expected-database=${actualDatabase || "<nom>"} avec le nom exact de la base jeu.`);
  }
  if(FORBIDDEN_DATABASE_NAME_PATTERN.test(actualDatabase)){
    throw new Error(`La base "${actualDatabase}" ressemble a une base d'authentification plateforme; reset refuse.`);
  }
  const actualProtectedIds = (plan.protectedAccounts || []).map(account=>account.id);
  if(!config.protectedAccountIds?.length || !sameStringSet(config.protectedAccountIds, actualProtectedIds)){
    throw new Error("Les --protected-account-id doivent correspondre exactement a tous les comptes owner/admin du dry-run.");
  }
  if(!config.confirm || config.confirm !== plan.confirmationToken){
    throw new Error(`Confirmation invalide. Utilise --confirm=${plan.confirmationToken}.`);
  }
  if(!path.isAbsolute(config.backupFile || "")){
    throw new Error("--backup-file doit etre un chemin absolu prive.");
  }
  if(!config.backupFileExplicit){
    throw new Error("L'execution demande un --backup-file explicite hors de la racine web.");
  }
  if(pathIsInside(config.backupFile, PROJECT_ROOT)){
    throw new Error(`Le backup doit rester hors de la racine projet/web: ${PROJECT_ROOT}`);
  }
  if(!backupAlreadyCreated && fs.existsSync(config.backupFile)){
    throw new Error(`Le fichier de sauvegarde existe deja: ${config.backupFile}`);
  }
  if(backupAlreadyCreated){
    const backupStat = fs.statSync(config.backupFile);
    if(!backupStat.isFile() || backupStat.size <= 0){
      throw new Error(`La sauvegarde PostgreSQL est absente ou vide: ${config.backupFile}`);
    }
    if(process.platform !== "win32" && (backupStat.mode & 0o077) !== 0){
      throw new Error(`La sauvegarde PostgreSQL doit etre privee (permissions 600): ${config.backupFile}`);
    }
  }
  return true;
}

function accountIds(accounts = []){
  return accounts.map(account=>clean(account.id)).filter(Boolean);
}

export async function applyBetaGameReset(database, plan, {now = Date.now()} = {}){
  const protectedIds = accountIds(plan.protectedAccounts);
  const deletedMirrorIds = accountIds(plan.accountMirrorsToDelete);
  await database.query("DELETE FROM player_profiles WHERE account_id IS NULL");
  await database.query(
    "DELETE FROM player_profiles WHERE account_id = ANY($1::text[]) OR profile_key = ANY($2::text[])",
    [protectedIds, protectedIds.map(id=>`account:${id}`)]
  );
  await database.query(
    "DELETE FROM pilot_identities WHERE account_id = ANY($1::text[])",
    [protectedIds]
  );
  const deletedAccountsResult = await database.query(`
    DELETE FROM accounts
    WHERE id = ANY($1::text[])
      AND LOWER(role) NOT IN ('owner', 'admin')
      AND password_hash LIKE 'external:absyrion:%'
    RETURNING id
  `, [deletedMirrorIds]);
  if((deletedAccountsResult.rows || []).length !== deletedMirrorIds.length){
    throw new Error("Le nombre de miroirs supprimes ne correspond plus au dry-run; transaction annulee.");
  }
  for(const account of plan.protectedAccounts){
    const profile = createDefaultProfile();
    profile.updatedAt = now;
    await database.query(`
      INSERT INTO player_profiles (profile_key, account_id, profile_json, updated_at)
      VALUES ($1, $2, $3::jsonb, $4)
    `, [
      `account:${account.id}`,
      account.id,
      JSON.stringify(profile),
      now
    ]);
  }
  const deletedFirmWarResult = await database.query("DELETE FROM firm_war_state RETURNING id");
  const initialFirmState = buildInitialFirmState(now);
  const firmWarResult = await database.query(`
    INSERT INTO firm_war_state (id, state_json, updated_at)
    VALUES ('global', $1::jsonb, $2)
    ON CONFLICT (id) DO UPDATE SET
      state_json = EXCLUDED.state_json,
      updated_at = EXCLUDED.updated_at
    RETURNING id
  `, [JSON.stringify(initialFirmState), now]);
  return {
    accountsDeleted:(deletedAccountsResult.rows || []).length,
    protectedAccountsPreserved:protectedIds.length,
    protectedProfilesReset:protectedIds.length,
    firmWarRowsReset:(deletedFirmWarResult.rows || []).length,
    initialFirmWarRowWritten:(firmWarResult.rows || []).some(row=>row.id === "global"),
    platformAccountsTouched:0
  };
}

export async function executeBetaGameReset({
  pool,
  config,
  initialPlan,
  backupRunner = runBackup,
  now = ()=>Date.now(),
  logger = console
} = {}){
  assertBetaGameResetExecutionSafety(config, initialPlan);
  await backupRunner({
    databaseUrl:config.databaseUrl,
    outputFile:config.backupFile,
    pgDumpBin:config.pgDumpBin
  }, {logger});
  try{
    await chmod(config.backupFile, 0o600);
  }catch(error){
    throw new Error(`Impossible de limiter les permissions du backup a 600: ${error?.message || String(error)}`);
  }

  const client = await pool.connect();
  try{
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SELECT pg_advisory_xact_lock($1)", [RESET_ADVISORY_LOCK_ID]);
    await client.query("LOCK TABLE accounts, sessions, player_profiles, pilot_identities, firm_war_state IN ACCESS EXCLUSIVE MODE");
    const lockedSnapshot = await collectBetaGameResetSnapshot(client);
    const lockedPlan = buildBetaGameResetPlan(lockedSnapshot, {externalAuthUrl:config.externalAuthUrl});
    assertBetaGameResetExecutionSafety(config, lockedPlan, {backupAlreadyCreated:true});
    const result = await applyBetaGameReset(client, lockedPlan, {now:now()});
    await client.query("COMMIT");
    return {
      ok:true,
      mode:"executed",
      backupFile:config.backupFile,
      confirmationToken:lockedPlan.confirmationToken,
      ...result
    };
  }catch(error){
    try{ await client.query("ROLLBACK"); }catch(rollbackError){}
    throw error;
  }finally{
    client.release();
  }
}

export async function main(argv = process.argv.slice(2), env = process.env, options = {}){
  const config = parseBetaGameResetArgs(argv, env);
  if(!config.databaseUrl) throw new Error("DATABASE_URL ou --database-url est requis.");
  const pool = options.pool || new Pool({
    connectionString:config.databaseUrl,
    ssl:config.databaseSsl ? {rejectUnauthorized:false} : undefined
  });
  try{
    const snapshot = await collectBetaGameResetSnapshot(pool);
    const plan = buildBetaGameResetPlan(snapshot, {externalAuthUrl:config.externalAuthUrl});
    if(!config.execute){
      (options.logger || console).log(JSON.stringify(plan, null, 2));
      return {code:0, plan};
    }
    const result = await executeBetaGameReset({
      pool,
      config,
      initialPlan:plan,
      backupRunner:options.backupRunner,
      now:options.now,
      logger:options.logger || console
    });
    (options.logger || console).log(JSON.stringify(result, null, 2));
    return {code:0, plan, result};
  }finally{
    if(!options.pool) await pool.end();
  }
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  main().then(({code})=>process.exit(code)).catch(error=>{
    console.error(`Beta game reset FAILED: ${error?.message || String(error)}`);
    process.exit(1);
  });
}
