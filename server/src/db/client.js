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
      last_login_at BIGINT
    );

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
  `);
  return true;
}

export async function closeDatabase(){
  if(pool) await pool.end();
}
