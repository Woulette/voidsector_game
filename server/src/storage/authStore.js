import crypto from "node:crypto";
import fs from "node:fs";
import { dbEnabled, query } from "../db/client.js";

const DATA_DIR_URL = new URL("../../data/", import.meta.url);
const ACCOUNTS_URL = new URL("../../data/accounts.json", import.meta.url);
const SESSIONS_URL = new URL("../../data/sessions.json", import.meta.url);

function readJson(url, fallback){
  try{
    if(!fs.existsSync(url)) return fallback;
    return JSON.parse(fs.readFileSync(url, "utf8") || JSON.stringify(fallback));
  }catch(error){
    console.warn(`Unable to read ${url.pathname}:`, error?.message || error);
    return fallback;
  }
}

export function writeJsonAtomically(url, value, {dataDirUrl = DATA_DIR_URL, fileSystem = fs} = {}){
  const fileName = String(url?.pathname || "auth.json").split("/").pop() || "auth.json";
  const tempUrl = new URL(`${fileName}.${crypto.randomUUID()}.tmp`, dataDirUrl);
  let handle = null;
  try{
    fileSystem.mkdirSync(dataDirUrl, {recursive:true});
    handle = fileSystem.openSync(tempUrl, "wx");
    fileSystem.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fileSystem.fsyncSync?.(handle);
    fileSystem.closeSync(handle);
    handle = null;
    fileSystem.renameSync(tempUrl, url);
  }catch(error){
    if(handle !== null){
      try{ fileSystem.closeSync(handle); }catch(closeError){}
    }
    try{ fileSystem.rmSync?.(tempUrl, {force:true}); }catch(cleanupError){}
    throw error;
  }
}

function writeJson(url, value){
  writeJsonAtomically(url, value);
}

let accounts = readJson(ACCOUNTS_URL, {});
let sessions = readJson(SESSIONS_URL, {});

function accountFromRow(row){
  if(!row) return null;
  return {
    id:row.id,
    email:row.email,
    username:row.username,
    usernameKey:row.username_key,
    passwordHash:row.password_hash,
    role:row.role,
    createdAt:Number(row.created_at || 0),
    lastLoginAt:row.last_login_at === null ? null : Number(row.last_login_at || 0),
    bannedUntil:Number(row.banned_until || 0),
    banReason:row.ban_reason || "",
    mutedUntil:Number(row.muted_until || 0),
    muteReason:row.mute_reason || ""
  };
}

function sessionFromRow(row){
  if(!row) return null;
  return {
    id:row.id,
    accountId:row.account_id,
    tokenHash:row.token_hash,
    createdAt:Number(row.created_at || 0),
    expiresAt:Number(row.expires_at || 0)
  };
}

export async function listAccounts(){
  if(dbEnabled){
    const result = await query("SELECT * FROM accounts ORDER BY created_at ASC");
    return result.rows.map(accountFromRow);
  }
  return Object.values(accounts);
}

export async function findAccountById(accountId){
  if(dbEnabled){
    const result = await query("SELECT * FROM accounts WHERE id = $1", [String(accountId || "")]);
    return accountFromRow(result.rows[0]);
  }
  return accounts[String(accountId || "")] || null;
}

export async function findAccountByEmail(email){
  const clean = String(email || "").trim().toLowerCase();
  if(!clean) return null;
  if(dbEnabled){
    const result = await query("SELECT * FROM accounts WHERE email = $1", [clean]);
    return accountFromRow(result.rows[0]);
  }
  return Object.values(accounts).find(account=>account.email === clean) || null;
}

export async function findAccountByUsername(username){
  const clean = String(username || "").trim().toLowerCase();
  if(!clean) return null;
  if(dbEnabled){
    const result = await query("SELECT * FROM accounts WHERE username_key = $1", [clean]);
    return accountFromRow(result.rows[0]);
  }
  return Object.values(accounts).find(account=>account.usernameKey === clean) || null;
}

export async function saveAccount(account){
  if(dbEnabled){
    await query(`
      INSERT INTO accounts (
        id, email, username, username_key, password_hash, role, created_at, last_login_at,
        banned_until, ban_reason, muted_until, mute_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        username_key = EXCLUDED.username_key,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        last_login_at = EXCLUDED.last_login_at,
        banned_until = EXCLUDED.banned_until,
        ban_reason = EXCLUDED.ban_reason,
        muted_until = EXCLUDED.muted_until,
        mute_reason = EXCLUDED.mute_reason
    `, [
      account.id,
      account.email,
      account.username,
      account.usernameKey,
      account.passwordHash,
      account.role || "player",
      Number(account.createdAt || Date.now()),
      account.lastLoginAt ?? null,
      Number(account.bannedUntil || 0),
      String(account.banReason || "").slice(0, 240),
      Number(account.mutedUntil || 0),
      String(account.muteReason || "").slice(0, 240)
    ]);
    return account;
  }
  const nextAccounts = {
    ...accounts,
    [account.id]:account
  };
  writeJson(ACCOUNTS_URL, nextAccounts);
  accounts = nextAccounts;
  return account;
}

function cleanExternalAccountValue(value, fallback){
  const clean = String(value || "").trim();
  return clean || fallback;
}

function externalAccountFallbackKey(accountId){
  return String(accountId || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18) || crypto.randomUUID().replace(/-/g, "").slice(0, 18);
}

function externalAccountRecord(account, {useFallbackIdentity = false, now = Date.now()} = {}){
  const id = String(account?.id || "").trim();
  if(!id) return null;
  const fallbackKey = externalAccountFallbackKey(id);
  const username = useFallbackIdentity
    ? `Absyrion-${fallbackKey}`
    : cleanExternalAccountValue(account?.username, `Absyrion-${fallbackKey}`).slice(0, 24);
  const usernameKey = String(username || `absyrion-${fallbackKey}`).trim().toLowerCase();
  const email = useFallbackIdentity
    ? `external-${fallbackKey}@absyrion.local`
    : cleanExternalAccountValue(account?.email, `external-${fallbackKey}@absyrion.local`).toLowerCase();
  return {
    id,
    email,
    username,
    usernameKey,
    passwordHash:`external:absyrion:${id}`,
    role:account?.role || "player",
    createdAt:Number(account?.createdAt || now),
    lastLoginAt:Number(account?.lastLoginAt || now),
    bannedUntil:Number(account?.bannedUntil || 0),
    banReason:String(account?.banReason || ""),
    mutedUntil:Number(account?.mutedUntil || 0),
    muteReason:String(account?.muteReason || "")
  };
}

const ROLE_POWER = new Map([
  ["player", 0],
  ["moderator", 1],
  ["admin", 2],
  ["owner", 3]
]);

function strongestRole(...roles){
  return roles.reduce((selected, role)=>{
    const normalized = String(role || "player").trim().toLowerCase();
    const selectedPower = ROLE_POWER.get(selected) ?? 0;
    const rolePower = ROLE_POWER.get(normalized) ?? 0;
    return rolePower > selectedPower ? normalized : selected;
  }, "player");
}

async function preserveExistingElevatedRole(record){
  if(!record) return record;
  const existingById = await findAccountById(record.id);
  const existingByEmail = await findAccountByEmail(record.email);
  record.role = strongestRole(record.role, existingById?.role, existingByEmail?.role);
  return record;
}

async function linkExternalAccountByEmail(record){
  const existingByEmail = await findAccountByEmail(record?.email);
  if(!existingByEmail || String(existingByEmail.id) === String(record?.id || "")) return null;
  const linkedAccount = {
    ...existingByEmail,
    role:strongestRole(existingByEmail.role, record.role),
    lastLoginAt:record.lastLoginAt || Date.now(),
    bannedUntil:Math.max(Number(existingByEmail.bannedUntil || 0), Number(record.bannedUntil || 0)),
    banReason:existingByEmail.banReason || record.banReason || "",
    mutedUntil:Math.max(Number(existingByEmail.mutedUntil || 0), Number(record.mutedUntil || 0)),
    muteReason:existingByEmail.muteReason || record.muteReason || ""
  };
  await saveAccount(linkedAccount);
  return linkedAccount;
}

async function saveExternalAccountRecord(record){
  if(dbEnabled){
    await query(`
      INSERT INTO accounts (
        id, email, username, username_key, password_hash, role, created_at, last_login_at,
        banned_until, ban_reason, muted_until, mute_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        username_key = EXCLUDED.username_key,
        role = EXCLUDED.role,
        last_login_at = EXCLUDED.last_login_at,
        banned_until = EXCLUDED.banned_until,
        ban_reason = EXCLUDED.ban_reason,
        muted_until = EXCLUDED.muted_until,
        mute_reason = EXCLUDED.mute_reason
    `, [
      record.id,
      record.email,
      record.username,
      record.usernameKey,
      record.passwordHash,
      record.role,
      record.createdAt,
      record.lastLoginAt ?? null,
      record.bannedUntil,
      record.banReason.slice(0, 240),
      record.mutedUntil,
      record.muteReason.slice(0, 240)
    ]);
    return record;
  }
  const existing = accounts[record.id] || {};
  const nextRecord = {
    ...existing,
    ...record,
    passwordHash:existing.passwordHash || record.passwordHash,
    createdAt:existing.createdAt || record.createdAt
  };
  const nextAccounts = {
    ...accounts,
    [record.id]:nextRecord
  };
  writeJson(ACCOUNTS_URL, nextAccounts);
  accounts = nextAccounts;
  return nextRecord;
}

export async function ensureExternalAccountRecord(account, options = {}){
  const record = externalAccountRecord(account, options);
  if(!record) return null;
  await preserveExistingElevatedRole(record);
  const linkedAccount = await linkExternalAccountByEmail(record);
  if(linkedAccount) return linkedAccount;
  try{
    return await saveExternalAccountRecord(record);
  }catch(error){
    if(error?.code !== "23505") throw error;
    const conflictAccount = await linkExternalAccountByEmail(record);
    if(conflictAccount) return conflictAccount;
    const fallbackRecord = externalAccountRecord(account, {
      ...options,
      useFallbackIdentity:true
    });
    fallbackRecord.role = record.role;
    return saveExternalAccountRecord(fallbackRecord);
  }
}

export async function updateAccountModeration(accountId, patch = {}){
  const account = await findAccountById(accountId);
  if(!account) return null;
  if(Object.hasOwn(patch, "bannedUntil")) account.bannedUntil = Math.max(0, Number(patch.bannedUntil || 0));
  if(Object.hasOwn(patch, "banReason")) account.banReason = String(patch.banReason || "").slice(0, 240);
  if(Object.hasOwn(patch, "mutedUntil")) account.mutedUntil = Math.max(0, Number(patch.mutedUntil || 0));
  if(Object.hasOwn(patch, "muteReason")) account.muteReason = String(patch.muteReason || "").slice(0, 240);
  await saveAccount(account);
  return account;
}

export async function saveSession(session){
  if(dbEnabled){
    await query(`
      INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at
    `, [
      session.id,
      session.accountId,
      session.tokenHash,
      Number(session.createdAt || Date.now()),
      Number(session.expiresAt || Date.now())
    ]);
    return session;
  }
  const nextSessions = {
    ...sessions,
    [session.id]:session
  };
  writeJson(SESSIONS_URL, nextSessions);
  sessions = nextSessions;
  return session;
}

export async function findSessionByTokenHash(tokenHash){
  const clean = String(tokenHash || "");
  if(!clean) return null;
  if(dbEnabled){
    const result = await query("SELECT * FROM sessions WHERE token_hash = $1", [clean]);
    return sessionFromRow(result.rows[0]);
  }
  return Object.values(sessions).find(session=>session.tokenHash === clean) || null;
}

export async function deleteSession(sessionId){
  if(dbEnabled){
    await query("DELETE FROM sessions WHERE id = $1", [String(sessionId || "")]);
    return;
  }
  const cleanSessionId = String(sessionId || "");
  if(!Object.hasOwn(sessions, cleanSessionId)) return;
  const nextSessions = {...sessions};
  delete nextSessions[cleanSessionId];
  writeJson(SESSIONS_URL, nextSessions);
  sessions = nextSessions;
}

export async function deleteSessionsForAccount(accountId){
  const cleanAccountId = String(accountId || "");
  if(!cleanAccountId) return;
  if(dbEnabled){
    await query("DELETE FROM sessions WHERE account_id = $1", [cleanAccountId]);
    return;
  }
  let changed = false;
  const nextSessions = {...sessions};
  for(const [id, session] of Object.entries(sessions)){
    if(String(session?.accountId || "") !== cleanAccountId) continue;
    delete nextSessions[id];
    changed = true;
  }
  if(changed){
    writeJson(SESSIONS_URL, nextSessions);
    sessions = nextSessions;
  }
}

export async function deleteExpiredSessions(now = Date.now()){
  if(dbEnabled){
    await query("DELETE FROM sessions WHERE expires_at <= $1", [Number(now || Date.now())]);
    return;
  }
  let changed = false;
  const nextSessions = {...sessions};
  for(const [id, session] of Object.entries(sessions)){
    if(Number(session.expiresAt || 0) > now) continue;
    delete nextSessions[id];
    changed = true;
  }
  if(changed){
    writeJson(SESSIONS_URL, nextSessions);
    sessions = nextSessions;
  }
}
