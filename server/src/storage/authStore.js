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

function writeJson(url, value){
  try{
    fs.mkdirSync(DATA_DIR_URL, {recursive:true});
    fs.writeFileSync(url, JSON.stringify(value, null, 2));
  }catch(error){
    console.warn(`Unable to write ${url.pathname}:`, error?.message || error);
  }
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
  accounts[account.id] = account;
  writeJson(ACCOUNTS_URL, accounts);
  return account;
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
  sessions[session.id] = session;
  writeJson(SESSIONS_URL, sessions);
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
  delete sessions[String(sessionId || "")];
  writeJson(SESSIONS_URL, sessions);
}

export async function deleteExpiredSessions(now = Date.now()){
  if(dbEnabled){
    await query("DELETE FROM sessions WHERE expires_at <= $1", [Number(now || Date.now())]);
    return;
  }
  let changed = false;
  for(const [id, session] of Object.entries(sessions)){
    if(Number(session.expiresAt || 0) > now) continue;
    delete sessions[id];
    changed = true;
  }
  if(changed) writeJson(SESSIONS_URL, sessions);
}
