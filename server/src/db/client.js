import { Pool } from "pg";

const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();

export const dbEnabled = Boolean(DATABASE_URL);

export const pool = dbEnabled
  ? new Pool({
      connectionString:DATABASE_URL,
      ssl:process.env.DATABASE_SSL === "true" ? {rejectUnauthorized:false} : undefined
    })
  : null;

export async function query(text, params = []){
  if(!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text, params);
}

export async function initializeDatabase(){
  if(!pool) return false;
  await query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      username_key TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      created_at BIGINT NOT NULL,
      last_login_at BIGINT,
      banned_until BIGINT NOT NULL DEFAULT 0,
      ban_reason TEXT NOT NULL DEFAULT '',
      muted_until BIGINT NOT NULL DEFAULT 0,
      mute_reason TEXT NOT NULL DEFAULT ''
    );

    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banned_until BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT '';
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS muted_until BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS mute_reason TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS player_profiles (
      profile_key TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
      profile_json JSONB NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS player_profiles_account_id_idx ON player_profiles(account_id);

    CREATE TABLE IF NOT EXISTS firm_war_state (
      id TEXT PRIMARY KEY,
      state_json JSONB NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      created_at BIGINT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      actor_account_id TEXT,
      actor_player_id TEXT,
      actor_name TEXT,
      actor_role TEXT,
      target_key TEXT,
      target_player_id TEXT,
      target_name TEXT,
      payload_json JSONB NOT NULL
    );

    CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_log_target_key_idx ON admin_audit_log(target_key);
  `);
  return true;
}

export async function closeDatabase(){
  if(pool) await pool.end();
}
