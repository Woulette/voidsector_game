import "dotenv/config";
import fs from "node:fs";
import { initializeDatabase, query, dbEnabled, closeDatabase } from "./client.js";
import { sanitizeProfile } from "../players/profiles.js";

const DATA_DIR_URL = new URL("../../data/", import.meta.url);
const ACCOUNTS_URL = new URL("../../data/accounts.json", import.meta.url);
const SESSIONS_URL = new URL("../../data/sessions.json", import.meta.url);
const PROFILES_URL = new URL("../../data/profiles.json", import.meta.url);

function readJson(url, fallback){
  try{
    if(!fs.existsSync(url)) return fallback;
    return JSON.parse(fs.readFileSync(url, "utf8") || JSON.stringify(fallback));
  }catch(error){
    console.warn(`Unable to read ${url.pathname}:`, error?.message || error);
    return fallback;
  }
}

async function migrateAccounts(){
  const accounts = readJson(ACCOUNTS_URL, {});
  let count = 0;
  for(const account of Object.values(accounts || {})){
    if(!account?.id) continue;
    await query(`
      INSERT INTO accounts (id, email, username, username_key, password_hash, role, created_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        username_key = EXCLUDED.username_key,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        last_login_at = EXCLUDED.last_login_at
    `, [
      String(account.id),
      String(account.email || "").trim().toLowerCase(),
      String(account.username || "Pilote").trim().slice(0, 24),
      String(account.usernameKey || account.username || "pilote").trim().toLowerCase(),
      String(account.passwordHash || ""),
      String(account.role || "player"),
      Number(account.createdAt || Date.now()),
      account.lastLoginAt === undefined ? null : Number(account.lastLoginAt || 0)
    ]);
    count += 1;
  }
  return count;
}

async function migrateSessions(){
  const sessions = readJson(SESSIONS_URL, {});
  let count = 0;
  for(const session of Object.values(sessions || {})){
    if(!session?.id || !session?.accountId || !session?.tokenHash) continue;
    await query(`
      INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at
    `, [
      String(session.id),
      String(session.accountId),
      String(session.tokenHash),
      Number(session.createdAt || Date.now()),
      Number(session.expiresAt || Date.now())
    ]);
    count += 1;
  }
  return count;
}

async function migrateProfiles(){
  const profiles = readJson(PROFILES_URL, {});
  const accountRows = await query("SELECT id FROM accounts");
  const knownAccountIds = new Set(accountRows.rows.map(row=>String(row.id)));
  let count = 0;
  for(const [key, profile] of Object.entries(profiles || {})){
    const clean = sanitizeProfile(profile);
    const parsedAccountId = String(key || "").startsWith("account:") ? String(key).slice("account:".length) : null;
    const accountId = parsedAccountId && knownAccountIds.has(parsedAccountId) ? parsedAccountId : null;
    await query(`
      INSERT INTO player_profiles (profile_key, account_id, profile_json, updated_at)
      VALUES ($1, $2, $3::jsonb, $4)
      ON CONFLICT (profile_key) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        profile_json = EXCLUDED.profile_json,
        updated_at = EXCLUDED.updated_at
    `, [
      String(key),
      accountId,
      JSON.stringify(clean),
      Number(clean.updatedAt || Date.now())
    ]);
    count += 1;
  }
  return count;
}

async function main(){
  if(!dbEnabled) throw new Error("DATABASE_URL is not configured.");
  if(!fs.existsSync(DATA_DIR_URL)) console.warn("No server/data directory found.");
  await initializeDatabase();
  const accounts = await migrateAccounts();
  const sessions = await migrateSessions();
  const profiles = await migrateProfiles();
  console.log(JSON.stringify({accounts, sessions, profiles}, null, 2));
}

main()
  .catch(error=>{
    console.error(error);
    process.exitCode = 1;
  })
  .finally(()=>closeDatabase());
