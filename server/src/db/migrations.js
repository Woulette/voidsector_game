const MIGRATION_LOCK_ID = 148159137;

export const DATABASE_MIGRATIONS = [
  {
    id:"001_initial_schema",
    sql:`
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
    `
  },
  {
    id:"002_unique_pilot_identities",
    sql:`
      CREATE TABLE IF NOT EXISTS pilot_identities (
        name_key TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS pilot_identities_display_name_idx
      ON pilot_identities(display_name);

      DO $$
      BEGIN
        IF EXISTS (
          SELECT LOWER(TRIM(profile_json->'player'->>'name'))
          FROM player_profiles
          WHERE profile_key LIKE 'account:%'
            AND COALESCE(profile_json->'player'->>'firmSelected', 'false') = 'true'
            AND TRIM(COALESCE(profile_json->'player'->>'name', '')) <> ''
            AND LOWER(TRIM(profile_json->'player'->>'name')) <> 'nova-37'
          GROUP BY LOWER(TRIM(profile_json->'player'->>'name'))
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Duplicate configured pilot names must be resolved before migration 002.';
        END IF;
      END $$;

      INSERT INTO pilot_identities (name_key, display_name, account_id, created_at, updated_at)
      SELECT
        LOWER(TRIM(profile_json->'player'->>'name')),
        TRIM(profile_json->'player'->>'name'),
        account_id,
        updated_at,
        updated_at
      FROM player_profiles
      WHERE account_id IS NOT NULL
        AND COALESCE(profile_json->'player'->>'firmSelected', 'false') = 'true'
        AND TRIM(COALESCE(profile_json->'player'->>'name', '')) <> ''
        AND LOWER(TRIM(profile_json->'player'->>'name')) <> 'nova-37'
      ON CONFLICT (name_key) DO NOTHING;
    `
  }
];

export async function runDatabaseMigrations({
  database,
  migrations = DATABASE_MIGRATIONS,
  now = ()=>Date.now()
} = {}){
  if(!database?.connect) throw new Error("A PostgreSQL pool is required for migrations.");
  const client = await database.connect();
  let locked = false;
  try{
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    locked = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at BIGINT NOT NULL
      )
    `);
    const appliedResult = await client.query("SELECT id FROM schema_migrations");
    const applied = new Set((appliedResult.rows || []).map(row=>String(row.id)));

    for(const migration of migrations){
      if(applied.has(migration.id)) continue;
      await client.query("BEGIN");
      try{
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)",
          [migration.id, now()]
        );
        await client.query("COMMIT");
      }catch(error){
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return true;
  }finally{
    try{
      if(locked) await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    }finally{
      client.release();
    }
  }
}
